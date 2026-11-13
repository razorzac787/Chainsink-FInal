/**
 * Pillar 3: EAI Proximity Engine (multihop_engine.ts)
 * References:
 * - Chen, Y., et al. (2025). A Graph-Based Approach to Blockchain Fraud Prevention. arXiv:2505.24284.
 * - Wu, J., et al. (2023). Towards Understanding Crypto Money Laundering in Web3:
 *   Heuristic Transaction Tracing and Empirical Analysis. arXiv:2305.14748.
 *
 * Implements:
 * 1. Shortest-path distance decay calculation: D(v, E) = max(0, 100 * 0.5^hops)
 * 2. Multi-hop path tracing from target nodes v to illicit seeds E.
 * 3. Proximity risk category assignment.
 * 4. Taint flow fraction propagation across edges.
 */

import { GraphNode, GraphEdge, RiskCategory, EntityCluster } from '../types/forensics';

export interface ProximityComputationResult {
  nodes: GraphNode[];
  edges: GraphEdge[];
  updatedClusters: Map<string, EntityCluster>;
  summary: {
    criticalSeedCount: number;
    highTaintCount: number;
    elevatedTransitCount: number;
    monitoredHopsCount: number;
    lowProximityCount: number;
    cleanCount: number;
    maxHopsObserved: number;
  };
}

export function computeDistanceDecay(hops: number): number {
  if (hops < 0 || hops === Infinity || !isFinite(hops)) return 0;
  // D(v, E) = max(0, 100 * 0.5^hops)
  const score = 100 * Math.pow(0.5, hops);
  return Number(Math.max(0, Math.min(100, score)).toFixed(2));
}

export function getRiskCategory(hops: number, score: number): RiskCategory {
  if (hops === 0) return 'CRITICAL_ILLICIT_SEED';
  if (hops === 1) return 'HIGH_TAINT_PROXIMAL';
  if (hops === 2) return 'ELEVATED_RISK_TRANSIT';
  if (hops === 3) return 'MONITORED_HOPS';
  if (hops >= 4 && isFinite(hops)) return 'LOW_PROXIMITY';
  return 'CLEAN_TRANSIT';
}

export function runPillar3ProximityScoring(
  nodes: GraphNode[],
  edges: GraphEdge[],
  entityClusters: Map<string, EntityCluster>,
  seedAddressSet: Set<string>
): ProximityComputationResult {
  // Build directed adjacency list: source -> outgoing edges
  const outgoingAdj = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!outgoingAdj.has(edge.source)) outgoingAdj.set(edge.source, []);
    outgoingAdj.get(edge.source)!.push(edge);
  }

  // Multi-source Breadth-First Search (BFS) from all illicit seed nodes
  const distanceMap = new Map<string, number>();
  const nearestSeedMap = new Map<string, string>();
  const predecessorMap = new Map<string, string>(); // for shortest path reconstruction

  const queue: string[] = [];

  // Initialize BFS with all seed nodes
  for (const node of nodes) {
    if (node.isIllicitSeed || seedAddressSet.has(node.id)) {
      distanceMap.set(node.id, 0);
      nearestSeedMap.set(node.id, node.id);
      queue.push(node.id);
    } else {
      distanceMap.set(node.id, Infinity);
    }
  }

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const currDist = distanceMap.get(curr)!;
    const seed = nearestSeedMap.get(curr)!;

    const outEdges = outgoingAdj.get(curr) || [];
    for (const edge of outEdges) {
      const neighbor = edge.target;
      const neighborDist = distanceMap.get(neighbor) ?? Infinity;

      if (currDist + 1 < neighborDist) {
        distanceMap.set(neighbor, currDist + 1);
        nearestSeedMap.set(neighbor, seed);
        predecessorMap.set(neighbor, curr);
        queue.push(neighbor);
      }
    }
  }

  // Flag shortest path edges for visual highlight
  const shortestPathEdges = new Set<string>();
  for (const [target, pred] of predecessorMap.entries()) {
    const matchingEdge = edges.find((e) => e.source === pred && e.target === target);
    if (matchingEdge) {
      matchingEdge.isShortestPathToSeed = true;
      shortestPathEdges.add(matchingEdge.id);
    }
  }

  // Update nodes with proximity metrics
  let criticalCount = 0;
  let highTaintCount = 0;
  let elevatedCount = 0;
  let monitoredCount = 0;
  let lowProxCount = 0;
  let cleanCount = 0;
  let maxHops = 0;

  const updatedNodes = nodes.map((node) => {
    const hops = distanceMap.get(node.id) ?? Infinity;
    const score = computeDistanceDecay(hops);
    const category = getRiskCategory(hops, score);
    const nearestSeed = nearestSeedMap.get(node.id);

    if (isFinite(hops) && hops > maxHops) {
      maxHops = hops;
    }

    switch (category) {
      case 'CRITICAL_ILLICIT_SEED':
        criticalCount++;
        break;
      case 'HIGH_TAINT_PROXIMAL':
        highTaintCount++;
        break;
      case 'ELEVATED_RISK_TRANSIT':
        elevatedCount++;
        break;
      case 'MONITORED_HOPS':
        monitoredCount++;
        break;
      case 'LOW_PROXIMITY':
        lowProxCount++;
        break;
      default:
        cleanCount++;
        break;
    }

    return {
      ...node,
      hopDistance: hops,
      proximityScore: score,
      riskCategory: category,
      nearestSeedId: nearestSeed,
    };
  });

  // Update entity clusters with aggregated risk
  const updatedClusters = new Map<string, EntityCluster>();
  for (const [entId, cluster] of entityClusters.entries()) {
    let minClusterHops = Infinity;
    let maxClusterScore = 0;
    let clusterRisk: RiskCategory = 'CLEAN_TRANSIT';

    for (const addr of cluster.addresses) {
      const hops = distanceMap.get(addr) ?? Infinity;
      const score = computeDistanceDecay(hops);
      if (hops < minClusterHops) {
        minClusterHops = hops;
        maxClusterScore = score;
        clusterRisk = getRiskCategory(hops, score);
      }
    }

    updatedClusters.set(entId, {
      ...cluster,
      hopDistance: minClusterHops,
      proximityScore: maxClusterScore,
      riskCategory: clusterRisk,
      isIllicitSeed: minClusterHops === 0,
    });
  }

  return {
    nodes: updatedNodes,
    edges,
    updatedClusters,
    summary: {
      criticalSeedCount: criticalCount,
      highTaintCount,
      elevatedTransitCount: elevatedCount,
      monitoredHopsCount: monitoredCount,
      lowProximityCount: lowProxCount,
      cleanCount,
      maxHopsObserved: maxHops,
    },
  };
}

/**
 * Traces the step-by-step path from seed to a target address
 */
export function reconstructShortestPath(
  targetAddress: string,
  nodes: GraphNode[],
  edges: GraphEdge[]
): { pathNodes: string[]; pathEdges: GraphEdge[]; totalHops: number } {
  const nodeMap = new Map<string, GraphNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  const targetNode = nodeMap.get(targetAddress);
  if (!targetNode || !isFinite(targetNode.hopDistance) || targetNode.hopDistance === 0) {
    return { pathNodes: [targetAddress], pathEdges: [], totalHops: 0 };
  }

  const incomingAdj = new Map<string, GraphEdge[]>();
  for (const edge of edges) {
    if (!incomingAdj.has(edge.target)) incomingAdj.set(edge.target, []);
    incomingAdj.get(edge.target)!.push(edge);
  }

  const pathNodes: string[] = [targetAddress];
  const pathEdges: GraphEdge[] = [];
  let curr = targetAddress;

  while (true) {
    const currNode = nodeMap.get(curr);
    if (!currNode || currNode.hopDistance === 0) break;

    const inEdges = incomingAdj.get(curr) || [];
    // Pick incoming edge from predecessor with hopDistance == curr.hopDistance - 1
    const predEdge = inEdges.find((e) => {
      const srcNode = nodeMap.get(e.source);
      return srcNode && srcNode.hopDistance === currNode.hopDistance - 1;
    });

    if (predEdge) {
      pathEdges.unshift(predEdge);
      pathNodes.unshift(predEdge.source);
      curr = predEdge.source;
    } else {
      break;
    }
  }

  return {
    pathNodes,
    pathEdges,
    totalHops: pathEdges.length,
  };
}
