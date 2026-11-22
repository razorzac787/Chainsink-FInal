/**
 * Interactive Forensics Network Canvas (ForensicsCanvas.tsx)
 * High-performance 2D force-directed physics graph visualizer for blockchain forensics.
 * Supports smooth 60fps pan/zoom, High-DPI responsive sizing, pointer-accurate node selection,
 * node dragging, peel-chain/cycle overlays, and EAI proximity heatmaps.
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  GraphNode,
  GraphEdge,
  PeelChain,
  TransactionCycle,
} from '../types/forensics';
import { ZoomIn, ZoomOut, RotateCcw, Eye, Layers, Compass, Zap, Maximize2 } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Canvas logical CSS dimensions
  const sizeRef = useRef({ width: 900, height: 600 });

  // Imperative viewport transform for zero-lag 60fps pan & zoom
  const transformRef = useRef({ x: 0, y: 0, k: 1 });
  const [zoomPercent, setZoomPercent] = useState(100);

  // Pointer interaction refs
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const pointerDownPosRef = useRef({ x: 0, y: 0 });
  const draggedNodeRef = useRef<SimNode | null>(null);
  const hoveredNodeIdRef = useRef<string | null>(null);
  const [hoveredNodeInfo, setHoveredNodeInfo] = useState<GraphNode | null>(null);
  const [cursorStyle, setCursorStyle] = useState<'grab' | 'grabbing' | 'pointer'>('grab');

  // Visualization Overlays
  const [showPeelChains, setShowPeelChains] = useState(true);
  const [showCycles, setShowCycles] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [groupByEntity, setGroupByEntity] = useState(false);

  // Simulation State
  const simNodesRef = useRef<SimNode[]>([]);
  const animFrameRef = useRef<number | null>(null);

  // Latest render options ref so physics/render callbacks never go stale or restart physics
  const renderConfigRef = useRef({
    edges,
    selectedNodeId,
    showPeelChains,
    showCycles,
    showHeatmap,
    groupByEntity,
    currency,
  });

  renderConfigRef.current = {
    edges,
    selectedNodeId,
    showPeelChains,
    showCycles,
    showHeatmap,
    groupByEntity,
    currency,
  };

  function getNodeRadius(node: GraphNode): number {
    if (node.isIllicitSeed) return 22;
    const vol = Math.max(0.1, node.totalInflow + node.totalOutflow);
    return Math.min(20, Math.max(13, 11 + Math.log10(vol + 1) * 3));
  }

  // Pure render function (does NOT mutate physics or restart simulation)
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = sizeRef.current;
    const dpr = window.devicePixelRatio || 1;
    const tf = transformRef.current;
    const cfg = renderConfigRef.current;

    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Draw background grid in screen/world space
    ctx.save();
    ctx.translate(tf.x, tf.y);
    ctx.scale(tf.k, tf.k);

    drawGrid(ctx, width, height, tf);

    const nodeMap = new Map<string, SimNode>();
    for (const sn of simNodesRef.current) nodeMap.set(sn.id, sn);

    // Draw Entity Clusters Hull if toggled
    if (cfg.groupByEntity) {
      drawEntityHulls(ctx, simNodesRef.current);
    }

    // Draw Edges
    for (const edge of cfg.edges) {
      const src = nodeMap.get(edge.source);
      const tgt = nodeMap.get(edge.target);
      if (!src || !tgt) continue;

      const isPeelCont = cfg.showPeelChains && edge.isPeelContinuation;
      const isPeelDiv = cfg.showPeelChains && edge.isPeelOutput;
      const isCycle = cfg.showCycles && edge.isCycleEdge;
      const isShortestPath = edge.isShortestPathToSeed;

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (isPeelDiv) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
      } else if (isPeelCont) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
      } else if (isCycle) {
        ctx.strokeStyle = '#c084fc';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
      } else if (isShortestPath) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([]);
      } else {
        ctx.strokeStyle = 'rgba(71, 85, 105, 0.55)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([]);
      }

      ctx.stroke();
      ctx.setLineDash([]);

      // Draw Arrow Head
      drawArrowHead(ctx, src.x, src.y, tgt.x, tgt.y, tgt.radius, ctx.strokeStyle as string);

      // Draw Edge Label (Amount)
      const isConnectedToSelected =
        cfg.selectedNodeId && (src.id === cfg.selectedNodeId || tgt.id === cfg.selectedNodeId);
      if (isConnectedToSelected || isPeelDiv || isPeelCont) {
        const midX = (src.x + tgt.x) / 2;
        const midY = (src.y + tgt.y) / 2;

        ctx.fillStyle = isPeelDiv ? '#fef3c7' : '#cbd5e1';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${edge.amount} ${cfg.currency}`, midX, midY - 6);

        if (isPeelDiv) {
          ctx.fillStyle = '#f59e0b';
          ctx.font = 'bold 9px "Plus Jakarta Sans", sans-serif';
          ctx.fillText('PEEL', midX, midY + 10);
        }
      }
    }

    // Draw Nodes
    for (const node of simNodesRef.current) {
      const isSelected = cfg.selectedNodeId === node.id;
      const isHovered = hoveredNodeIdRef.current === node.id;

      // Outer selection / seed / hover halo
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 9, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(34, 211, 238, 0.24)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.7)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isHovered) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 7, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.18)';
        ctx.fill();
      } else if (node.isIllicitSeed) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
        ctx.fill();
      }

      // Node Body Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);

      const color = getNodeColor(node, cfg.showHeatmap);
      ctx.fillStyle = color.bg;
      ctx.fill();

      ctx.strokeStyle = isSelected ? '#22d3ee' : isHovered ? '#e2e8f0' : color.border;
      ctx.lineWidth = isSelected ? 3 : isHovered ? 2.5 : 2;
      ctx.stroke();

      // Node Label
      ctx.font = node.isIllicitSeed
        ? 'bold 11px "Plus Jakarta Sans", sans-serif'
        : '11px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = isSelected ? '#22d3ee' : isHovered ? '#ffffff' : '#e2e8f0';

      const displayLabel = node.isIllicitSeed ? 'ILLICIT SEED' : truncateAddress(node.id);
      ctx.fillText(displayLabel, node.x, node.y + node.radius + 14);

      // Score or Hop tag below
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.fillStyle = isSelected ? '#67e8f9' : '#94a3b8';
      const meta = node.isIllicitSeed
        ? 'Hop 0 · D=100'
        : isFinite(node.hopDistance)
        ? `Hop ${node.hopDistance} · D=${node.proximityScore}`
        : 'Clean';
      ctx.fillText(meta, node.x, node.y + node.radius + 26);
    }

    ctx.restore();
    ctx.restore();
  }, []);

  // Keep canvas crisp and matched to actual container size via ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const updateCanvasSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;

      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width: rect.width, height: rect.height };
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      renderCanvas();
    };

    updateCanvasSize();
    const observer = new ResizeObserver(updateCanvasSize);
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderCanvas]);

  // Fit graph nicely inside viewport
  const fitGraphToView = useCallback(() => {
    const simNodes = simNodesRef.current;
    const { width, height } = sizeRef.current;
    if (simNodes.length === 0 || width <= 0 || height <= 0) {
      transformRef.current = { x: 0, y: 0, k: 1 };
      setZoomPercent(100);
      renderCanvas();
      return;
    }

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of simNodes) {
      if (n.x < minX) minX = n.x;
      if (n.x > maxX) maxX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.y > maxY) maxY = n.y;
    }

    const padding = 90;
    const graphW = Math.max(200, maxX - minX + padding * 2);
    const graphH = Math.max(200, maxY - minY + padding * 2);
    const scale = Math.max(0.45, Math.min(1.25, Math.min(width / graphW, height / graphH)));

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    transformRef.current = {
      k: scale,
      x: width / 2 - centerX * scale,
      y: height / 2 - centerY * scale,
    };
    setZoomPercent(Math.round(scale * 100));
    renderCanvas();
  }, [renderCanvas]);

  // Initialize simulation positions ONLY when nodes change
  useEffect(() => {
    const { width, height } = sizeRef.current;

    const newSimNodes: SimNode[] = nodes.map((n, i) => {
      const existing = simNodesRef.current.find((s) => s.id === n.id);
      if (existing) {
        return { ...n, x: existing.x, y: existing.y, vx: 0, vy: 0, radius: getNodeRadius(n) };
      }

      const hops = isFinite(n.hopDistance) ? n.hopDistance : 4;
      const angle = (i / Math.max(1, nodes.length)) * Math.PI * 2;
      const radiusDist = 75 + hops * 75;

      return {
        ...n,
        x: width / 2 + Math.cos(angle) * radiusDist + (Math.random() - 0.5) * 35,
        y: height / 2 + Math.sin(angle) * radiusDist + (Math.random() - 0.5) * 35,
        vx: 0,
        vy: 0,
        radius: getNodeRadius(n),
      };
    });

    simNodesRef.current = newSimNodes;
    transformRef.current = { x: 0, y: 0, k: 1 };
    setZoomPercent(100);
  }, [nodes]);

  // Physics Simulation Loop — ONLY runs when nodes or edges change (never restarts on pan/zoom/click!)
  useEffect(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);

    let iteration = 0;
    const maxIterations = 180;

    const runPhysics = () => {
      const simNodes = simNodesRef.current;
      if (simNodes.length === 0) return;

      const kAttract = 0.045;
      const kRepel = 2200;
      const centerPull = 0.008;
      const damping = 0.82;
      const { width, height } = sizeRef.current;

      // 1. Node Repulsion
      for (let i = 0; i < simNodes.length; i++) {
        for (let j = i + 1; j < simNodes.length; j++) {
          const a = simNodes[i];
          const b = simNodes[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const distSq = dx * dx + dy * dy + 1;
          const dist = Math.sqrt(distSq);

          if (dist < 380) {
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
          const desiredDist = 120;
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
      if (iteration < maxIterations) {
        animFrameRef.current = requestAnimationFrame(runPhysics);
      } else {
        animFrameRef.current = null;
      }
    };

    animFrameRef.current = requestAnimationFrame(runPhysics);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [nodes, edges, renderCanvas]);

  // Re-render immediately whenever visual overlay toggles or selected node changes
  useEffect(() => {
    renderCanvas();
  }, [selectedNodeId, showPeelChains, showCycles, showHeatmap, groupByEntity, renderCanvas]);

  // Attach native non-passive wheel listener for smooth zoom toward cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const tf = transformRef.current;

      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89;
      const newK = Math.max(0.25, Math.min(4.0, tf.k * zoomFactor));

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      transformRef.current = {
        k: newK,
        x: mouseX - (mouseX - tf.x) * (newK / tf.k),
        y: mouseY - (mouseY - tf.y) * (newK / tf.k),
      };
      setZoomPercent(Math.round(newK * 100));
      renderCanvas();
    };

    canvas.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleNativeWheel);
  }, [renderCanvas]);

  // Helper: Convert pointer event coordinates to world coordinates
  const getWorldCoords = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const tf = transformRef.current;
    return {
      x: (clientX - rect.left - tf.x) / tf.k,
      y: (clientY - rect.top - tf.y) / tf.k,
    };
  };

  // Hit-test nodes in reverse order (top-most drawn node wins)
  const findNodeAt = (worldX: number, worldY: number): SimNode | undefined => {
    const simNodes = simNodesRef.current;
    const hitPadding = Math.max(8, 10 / transformRef.current.k);
    for (let i = simNodes.length - 1; i >= 0; i--) {
      const n = simNodes[i];
      const dist = Math.hypot(n.x - worldX, n.y - worldY);
      if (dist <= n.radius + hitPadding) {
        return n;
      }
    }
    return undefined;
  };

  // Pointer Interaction Handlers (PointerCapture ensures dragging never gets stuck)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);

    pointerDownPosRef.current = { x: e.clientX, y: e.clientY };
    const world = getWorldCoords(e.clientX, e.clientY);
    const clickedNode = findNodeAt(world.x, world.y);

    if (clickedNode) {
      draggedNodeRef.current = clickedNode;
      hoveredNodeIdRef.current = clickedNode.id;
      setHoveredNodeInfo(clickedNode);
      setCursorStyle('grabbing');
      onSelectNode(clickedNode.id);
      renderCanvas();
    } else {
      isPanningRef.current = true;
      panStartRef.current = {
        x: e.clientX - transformRef.current.x,
        y: e.clientY - transformRef.current.y,
      };
      setCursorStyle('grabbing');
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const world = getWorldCoords(e.clientX, e.clientY);
      draggedNodeRef.current.x = world.x;
      draggedNodeRef.current.y = world.y;
      draggedNodeRef.current.vx = 0;
      draggedNodeRef.current.vy = 0;
      renderCanvas();
      return;
    }

    if (isPanningRef.current) {
      transformRef.current = {
        ...transformRef.current,
        x: e.clientX - panStartRef.current.x,
        y: e.clientY - panStartRef.current.y,
      };
      renderCanvas();
      return;
    }

    // Hover detection
    const world = getWorldCoords(e.clientX, e.clientY);
    const hovered = findNodeAt(world.x, world.y);
    const nextHoverId = hovered ? hovered.id : null;

    if (hoveredNodeIdRef.current !== nextHoverId) {
      hoveredNodeIdRef.current = nextHoverId;
      setHoveredNodeInfo(hovered || null);
      setCursorStyle(hovered ? 'pointer' : 'grab');
      renderCanvas();
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (canvas && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    const wasPanning = isPanningRef.current;
    const movedDist = Math.hypot(
      e.clientX - pointerDownPosRef.current.x,
      e.clientY - pointerDownPosRef.current.y
    );

    draggedNodeRef.current = null;
    isPanningRef.current = false;

    // Only clear selection on an explicit stationary click on empty canvas (not after panning)
    if (wasPanning && movedDist < 4) {
      const world = getWorldCoords(e.clientX, e.clientY);
      const hit = findNodeAt(world.x, world.y);
      if (hit) {
        onSelectNode(hit.id);
      }
    }

    const world = getWorldCoords(e.clientX, e.clientY);
    const overNode = findNodeAt(world.x, world.y);
    setCursorStyle(overNode ? 'pointer' : 'grab');
    renderCanvas();
  };

  const zoomAtCenter = (factor: number) => {
    const { width, height } = sizeRef.current;
    const tf = transformRef.current;
    const newK = Math.max(0.25, Math.min(4.0, tf.k * factor));
    const cx = width / 2;
    const cy = height / 2;

    transformRef.current = {
      k: newK,
      x: cx - (cx - tf.x) * (newK / tf.k),
      y: cy - (cy - tf.y) * (newK / tf.k),
    };
    setZoomPercent(Math.round(newK * 100));
    renderCanvas();
  };

  const resetView = () => {
    transformRef.current = { x: 0, y: 0, k: 1 };
    setZoomPercent(100);
    renderCanvas();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-slate-950 overflow-hidden select-none border border-slate-800 rounded-lg flex flex-col"
    >
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
            onClick={() => zoomAtCenter(1.2)}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1.5 min-w-[44px] text-center tabular-nums">
            {zoomPercent}%
          </span>
          <button
            onClick={() => zoomAtCenter(0.83)}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={fitGraphToView}
            className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800 transition-colors"
            title="Fit Graph to Screen"
          >
            <Maximize2 className="w-4 h-4" />
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
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: cursorStyle, touchAction: 'none' }}
        className="w-full h-full block"
      />

      {/* Hovered Node Quick Pill */}
      {hoveredNodeInfo && (
        <div className="absolute bottom-3 right-3 z-10 px-3 py-2 bg-slate-900/95 backdrop-blur-md rounded-lg border border-slate-700 text-xs font-mono text-slate-200 pointer-events-none shadow-lg">
          <div className="text-[10px] text-cyan-400 font-semibold">
            {hoveredNodeInfo.entityId} · Click to inspect
          </div>
          <div className="mt-0.5 text-slate-100">{truncateAddress(hoveredNodeInfo.id)}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">
            {isFinite(hoveredNodeInfo.hopDistance)
              ? `Hop ${hoveredNodeInfo.hopDistance} · D(v,E) = ${hoveredNodeInfo.proximityScore}`
              : 'Unexposed'}
          </div>
        </div>
      )}

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 z-10 flex items-center gap-4 px-3 py-1.5 bg-slate-900/90 backdrop-blur-md rounded-lg border border-slate-800 text-xs text-slate-400 pointer-events-none">
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
  ctx.lineWidth = 1 / tf.k;

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
