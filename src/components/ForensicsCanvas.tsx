/**
 * Interactive Forensics Network Canvas (ForensicsCanvas.tsx)
 * High-performance 2D force-directed physics graph visualizer for blockchain forensics.
 * Renders nodes, entity clusters, peel chains, cycle loops, and proximity gradients.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GraphNode,
  GraphEdge,
  PeelChain,
  TransactionCycle,
  RiskCategory,
} from '../types/forensics';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Compass, Zap } from 'lucide-react';
import { truncateAddress } from '../core/ingestion_wizard';

interface ForensicsCanvasProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  peelChains: PeelChain[];
  cycles: TransactionCycle[];
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  currency?: string;
}

interface SimNode extends GraphNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export const ForensicsCanvas: React.FC<ForensicsCanvasProps> = ({
  nodes,
  edges,
  peelChains,
  cycles,
  selectedNodeId,
  onSelectNode,
  currency = 'BTC',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Viewport Transform (Pan & Zoom)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);

  // Visualization Overlays
  const [showPeelChains, setShowPeelChains] = useState(true);
  const [showCycles, setShowCycles] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [groupByEntity, setGroupByEntity] = useState(false);

  // Hovered Node
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);

  // Simulation State
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Initialize simulation positions
  useEffect(() => {
    const width = 1000;
    const height = 650;

    // Preserve existing positions if available, otherwise lay out in hierarchical or circular fashion
    const newSimNodes: SimNode[] = nodes.map((n, i) => {
      const existing = simNodesRef.current.find((s) => s.id === n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: 0, vy: 0, radius: getNodeRadius(n) };
      }

      // Initial layout guided by hop distance
      const hops = isFinite(n.hopDistance) ? n.hopDistance : 4;
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const radiusDist = 80 + hops * 85;

      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radiusDist + (Math.random() - 0.5) * 40,
        y: height / 2 + Math.sin(angle) * radiusDist + (Math.random() - 0.5) * 40,
        vx: 0,
        vy: 0,
        radius: getNodeRadius(n),
      };
    });

    simNodesRef.current = newSimNodes;
  }, [nodes]);

  function getNodeRadius(node: GraphNode): number {
    if (node.isIllicitSeed) return 22;
    const vol = Math.max(0.1, node.totalInflow + node.totalOutflow);
    return Math.min(20, Math.max(12, 10 + Math.log10(vol + 1) * 3));
  }

  // Physics Simulation Step
  useEffect(() => {
    let iteration = 0;
    const maxIterations = 200;

    const runPhysics = () => {
      const simNodes = simNodesRef.current;
      if (simNodes.length === 0) return;

      const kAttract = 0.04;
      const kRepel = 1800;
      const centerPull = 0.008;
      const damping = 0.82;
      const width = 1000;
      const height = 650;

      // 1. Node Repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 350) {
            const force = kRepel / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (a !== draggedNodeRef.current) {
              a.vx -= fx;
              a.vy -= fy;
            }
            if (b !== draggedNodeRef.current) {
              b.vx += fx;
              b.vy += fy;
            }
          }
        }
      }

      // 2. Edge Spring Attraction
      const nodeIndexMap = new Map<string, SimNode>();
      for (const sn of simNodes) nodeIndexMap.set(sn.id, sn);

      for (const edge of edges) {
        const src = nodeIndexMap.get(edge.source);
        const tgt = nodeIndexMap.get(edge.target);
        if (src && tgt) {
          const dx = tgt.x - src.x;
          const dy = tgt.y - src.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const desiredDist = 110;
          const force = (dist - desiredDist) * kAttract;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          if (src !== draggedNodeRef.current) {
            src.vx += fx;
            src.vy += fy;
          }
          if (tgt !== draggedNodeRef.current) {
            tgt.vx -= fx;
            tgt.vy -= fy;
          }
        }
      }

      // 3. Center Gravity & Damping
      for (const node of simNodes) {
        if (node === draggedNodeRef.current) continue;
        node.vx += (width / 2 - node.x) * centerPull;
        node.vy += (height / 2 - node.y) * centerPull;

        node.vx *= damping;
        node.vy *= damping;

        node.x += node.vx;
        node.y += node.vy;
      }

      renderCanvas();

      iteration++;
      if (iteration < maxIterations || draggedNodeRef.current) {
        animFrameRef.current = requestAnimationFrame(runPhysics);
      }
    };

    animFrameRef.current = requestAnimationFrame(runPhysics);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [nodes, edges, transform, showPeelChains, showCycles, showHeatmap, groupByEntity, selectedNodeId, hoveredNode]);

  // Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    ctx.clearRect(0, 0, width, height);

    // Apply viewport transform (pan & zoom)
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);

    // Draw Subtle Grid
    drawGrid(ctx, width, height, transform);

    const nodeMap = new Map<string, SimNode>();
    for (const sn of simNodesRef.current) nodeMap.set(sn.id, sn);

    // Draw Entity Clusters Hull if toggled
    if (groupByEntity) {
      drawEntityHulls(ctx, simNodesRef.current);
    }

    // Draw Edges
    for (const edge of edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const isPeelCont = showPeelChains && edge.isPeelContinuation;
      const isPeelDiv = showPeelChains && edge.isPeelOutput;
      const isCycle = showCycles && edge.isCycleEdge;
      const isShortestPath = edge.isShortestPathToSeed;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (isPeelDiv) {
        // Diverted peel: amber dashed line
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
      } else if (isPeelCont) {
        // Continuation peel: solid bright amber
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else if (isCycle) {
        // Cycle: vibrant violet dashed
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
      } else if (isShortestPath) {
        // Shortest path: cyan
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.45)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Arrow Head
      drawArrowHead(ctx, src.x, src.y, tgt.x, tgt.y, tgt.radius, ctx.strokeStyle as string);

      // Draw Edge Label (Amount) if selected or hovered
      const isConnectedToSelected = selectedNodeId && (src.id === selectedNodeId || tgt.id === selectedNodeId);
      if (isConnectedToSelected || isPeelDiv || isPeelCont) {
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;

        ctx.fillStyle = isPeelDiv ? '#fef3c7' : '#94a3b8';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${edge.amount} ${currency}`, midX, midY - 6);

        if (isPeelDiv) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('PEEL', midX, midY + 10);
        }
      }
    }

    // Draw Nodes
    for (const node of simNodesRef.current) {
      const isSelected = selectedNodeId === node.id;
      const isHovered = hoveredNode?.id === node.id;

      // Outer glow for illicit seed or selected node
      if (node.isIllicitSeed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      } else if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.25)';
        ctx.fill();
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      const color = getNodeColor(node, showHeatmap);
      ctx.fillStyle = color.bg;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#38bdf8' : color.border;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.stroke();

      // Node Label
      ctx.font = node.isIllicitSeed
        ? 'bold 11px "Plus Jakarta Sans", sans-serif'
        : '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#38bdf8' : '#e2e8f0';

      const displayLabel = node.isIllicitSeed ? 'ILLICIT SEED' : truncateAddress(node.id);
      ctx.fillText(displayLabel, node.x, node.y + node.radius + 14);

      // Score or Hop tag below
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      const meta = node.isIllicitSeed ? 'Hop 0 · D=100' : isFinite(node.hopDistance) ? `Hop ${node.hopDistance} · D=${node.proximityScore}` : 'Clean';
      ctx.fillText(meta, node.x, node.y + node.radius + 26);
    }

    ctx.restore();
  }, [transform, showPeelChains, showCycles, showHeatmap, groupByEntity, selectedNodeId, hoveredNode, edges, currency]);

  function getNodeColor(node: GraphNode, heatmap: boolean): { bg: string; border: string } {
    if (node.isIllicitSeed) {
      return { bg: '#450a0a', border: '#ef4444' };
    }

    if (heatmap) {
      const score = node.proximityScore;
      if (score >= 50) return { bg: '#7c2d12', border: '#f97316' };
      if (score >= 25) return { bg: '#78350f', border: '#f59e0b' };
      if (score >= 12.5) return { bg: '#713f12', border: '#eab308' };
      if (score > 0) return { bg: '#0c4a6e', border: '#38bdf8' };
      return { bg: '#064e3b', border: '#10b981' };
    }

    switch (node.riskCategory) {
      case 'CRITICAL_ILLICIT_SEED':
        return { bg: '#450a0a', border: '#ef4444' };
      case 'HIGH_TAINT_PROXIMAL':
        return { bg: '#7c2d12', border: '#ea580c' };
      case 'ELEVATED_RISK_TRANSIT':
        return { bg: '#78350f', border: '#f59e0b' };
      case 'MONITORED_HOPS':
        return { bg: '#713f12', border: '#eab308' };
      case 'LOW_PROXIMITY':
        return { bg: '#0c4a6e', border: '#38bdf8' };
      default:
        return { bg: '#0f172a', border: '#475569' };
    }
  }

  function drawGrid(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    tf: { x: number; y: number; k: number }
  ) {
    const gridSize = 40;
    ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
    ctx.lineWidth = 1;

    const startX = -tf.x / tf.k;
    const startY = -tf.y / tf.k;
    const endX = (w - tf.x) / tf.k;
    const endY = (h - tf.y) / tf.k;

    ctx.beginPath();
    for (let x = Math.floor(startX / gridSize) * gridSize; x < endX; x += gridSize) {
      ctx.moveTo(x, startY);
      ctx.lineTo(x, endY);
    }
    for (let y = Math.floor(startY / gridSize) * gridSize; y < endY; y += gridSize) {
      ctx.moveTo(startX, y);
      ctx.lineTo(endX, y);
    }
    ctx.stroke();
  }

  function drawArrowHead(
    ctx: CanvasRenderingContext2D,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    targetRadius: number,
    color: string
  ) {
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const arrowLength = 9;
    const arrowWidth = 5;

    // Offset arrow head to touch outer perimeter of target node
    const endX = x2 - Math.cos(angle) * (targetRadius + 3);
    const endY = y2 - Math.sin(angle) * (targetRadius + 3);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle - Math.PI / 7),
      endY - arrowLength * Math.sin(angle - Math.PI / 7)
    );
    ctx.lineTo(
      endX - arrowLength * Math.cos(angle + Math.PI / 7),
      endY - arrowLength * Math.sin(angle + Math.PI / 7)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawEntityHulls(ctx: CanvasRenderingContext2D, simNodes: SimNode[]) {
    const clusterMap = new Map<string, SimNode[]>();
    for (const n of simNodes) {
      if (!clusterMap.has(n.entityId)) clusterMap.set(n.entityId, []);
      clusterMap.get(n.entityId)!.push(n);
    }

    ctx.save();
    for (const [entityId, group] of clusterMap.entries()) {
      if (group.length > 1) {
        // Calculate bounding center & radius
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const n of group) {
          if (n.x < minX) minX = n.x;
          if (n.x > maxX) maxX = n.x;
          if (n.y < minY) minY = n.y;
          if (n.y > maxY) maxY = n.y;
        }

        const padding = 28;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.06)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        const rw = maxX - minX + padding * 2;
        const rh = maxY - minY + padding * 2;
        ctx.beginPath();
        ctx.roundRect(minX - padding, minY - padding, rw, rh, 12);
        ctx.fill();
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
        ctx.fillText(`Cluster: ${entityId}`, minX - padding + 8, minY - padding + 14);
      }
    }
    ctx.restore();
  }

  // Mouse Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.k;

    // Check if clicked on a node
    const clickedNode = simNodesRef.current.find((n) => {
      const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
      return dist <= n.radius + 4;
    });

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      onSelectNode(clickedNode.id);
    } else {
      isDraggingRef.current = true;
      dragStartRef.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
      onSelectNode(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - transform.x) / transform.k;
    const mouseY = (e.clientY - rect.top - transform.y) / transform.k;

    if (draggedNodeRef.current) {
      draggedNodeRef.current.x = mouseX;
      draggedNodeRef.current.y = mouseY;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      renderCanvas();
      return;
    }

    if (isDraggingRef.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y,
      }));
      return;
    }

    // Hover detection
    const hovered = simNodesRef.current.find((n) => {
      const dist = Math.hypot(n.x - mouseX, n.y - mouseY);
      return dist <= n.radius + 4;
    });
    setHoveredNode(hovered || null);
  };

  const handleMouseUp = () => {
    draggedNodeRef.current = null;
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
    const newK = Math.max(0.3, Math.min(3.5, transform.k * zoomFactor));

    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    setTransform((prev) => ({
      k: newK,
      x: mouseX - (mouseX - prev.x) * (newK / prev.k),
      y: mouseY - (mouseY - prev.y) * (newK / prev.k),
    }));
  };

  const resetView = () => {
    setTransform({ x: 0, y: 0, k: 1 });
  };

  const zoomIn = () => {
    setTransform((prev) => ({ ...prev, k: Math.min(3.5, prev.k * 1.2) }));
  };

  const zoomOut = () => {
    setTransform((prev) => ({ ...prev, k: Math.max(0.3, prev.k * 0.83) }));
  };

  return (
    <div className="relative w-full h-full bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-lg flex flex-col">
      {/* Top Overlay Toolbar */}
      <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between gap-3 pointer-events-none">
        {/* Toggle Overlays */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 pointer-events-auto">
          <button
            onClick={() => setShowPeelChains(!showPeelChains)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              showPeelChains
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Highlight detected multi-hop peel chains"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Peel Chains ({peelChains.length})</span>
          </button>

          <button
            onClick={() => setShowCycles(!showCycles)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              showCycles
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Highlight circular wash-trading loops"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Cycles ({cycles.length})</span>
          </button>

          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              showHeatmap
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle EAI Proximity D(v, E) distance-decay heatmap"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Proximity Heatmap</span>
          </button>

          <button
            onClick={() => setGroupByEntity(!groupByEntity)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              groupByEntity
                ? 'bg-slate-700 text-slate-100 border border-slate-600'
                : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Show Pillar 1 multi-input co-spending clusters"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Co-Spending Hulls</span>
          </button>
        </div>

        {/* Zoom & Viewport Controls */}
        <div className="flex items-center gap-1 p-1 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 pointer-events-auto">
          <button
            onClick={zoomIn}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={zoomOut}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={resetView}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Reset View"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Viewport */}
      <canvas
        ref={canvasRef}
        width={1100}
        height={650}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing block"
      />

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          <span className="text-slate-300">Illicit Seed (Hop 0)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
          <span className="text-slate-300">High Taint (Hop 1)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          <span className="text-slate-300">Peel Chain Transit</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
          <span className="text-slate-300">Monitored / Path</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
          <span className="text-slate-300">Clean / Unexposed</span>
        </div>
      </div>
    </div>
  );
};
