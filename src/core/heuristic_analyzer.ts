/**
 * Pillar 1: Heuristic Clustering Engine (heuristic_analyzer.ts)
 * Reference: Wu, J., et al. (2023). Towards Understanding Crypto Money Laundering in Web3:
 * Heuristic Transaction Tracing and Empirical Analysis. arXiv:2305.14748.
 *
 * Implements:
 * 1. Multi-Input Co-Spending (Common Input Ownership) Heuristic via Union-Find.
 * 2. Change Address Reuse & Ephemeral Change Output Detection.
 * 3. Unified Entity Cluster Construction.
 */

import { RawTransaction, EntityCluster, RiskCategory } from '../types/forensics';

export class DisjointSet {
  parent: Map<string, string>;
  rank: Map<string, number>;

  constructor() {
    this.parent = new Map();
    this.rank = new Map();
  }

  find(item: string): string {
    if (!this.parent.has(item)) {
      this.parent.set(item, item);
      this.rank.set(item, 0);
      return item;
    }
    const currentParent = this.parent.get(item)!;
    if (currentParent !== item) {
      const root = this.find(currentParent);
      this.parent.set(item, root); // Path compression
      return root;
    }
    return item;
  }

  union(a: string, b: string): void {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return;

    const rankA = this.rank.get(rootA) || 0;
    const rankB = this.rank.get(rootB) || 0;

    if (rankA < rankB) {
      this.parent.set(rootA, rootB);
    } else if (rankA > rankB) {
      this.parent.set(rootB, rootA);
    } else {
      this.parent.set(rootB, rootA);
      this.rank.set(rootA, rankA + 1);
    }
  }

  getGroups(): Map<string, string[]> {
    const groups = new Map<string, string[]>();
    for (const item of this.parent.keys()) {
      const root = this.find(item);
      if (!groups.has(root)) {
        groups.set(root, []);
      }
      groups.get(root)!.push(item);
    }
    return groups;
  }
}

export interface ClusteringResult {
  addressToEntityMap: Map<string, string>;
  entityClusters: Map<string, EntityCluster>;
  identifiedChangeAddresses: Set<string>;
  totalEntitiesCount: number;
  clusteredAddressesCount: number;
  multiInputGroupsCount: number;
}

export function runPillar1HeuristicClustering(
  transactions: RawTransaction[],
  knownSeedAddresses: Set<string> = new Set()
): ClusteringResult {
  const dsu = new DisjointSet();
  const addressVolumeMap = new Map<string, number>();
  const addressTxCountMap = new Map<string, number>();
  const identifiedChangeAddresses = new Set<string>();

  // Track address appearances
  for (const tx of transactions) {
    // 1. Multi-Input Co-Spending Heuristic (Common Input Ownership)
    // If a transaction spends inputs from addresses [A, B, C], they are owned by the same entity.
    if (tx.fromAddresses.length > 1) {
      const firstInput = tx.fromAddresses[0];
      for (let i = 1; i < tx.fromAddresses.length; i++) {
        dsu.union(firstInput, tx.fromAddresses[i]);
      }
    } else if (tx.fromAddresses.length === 1) {
      dsu.find(tx.fromAddresses[0]);
    }

    // Register output addresses in DSU
    for (const toAddr of tx.toAddresses) {
      dsu.find(toAddr);
    }

    // 2. Change Address Detection Heuristic
    // If a transaction has 2 outputs: one is a round decimal amount (e.g. 1.0, 5.0, 0.25)
    // and the other has high-entropy decimal fraction (e.g. 3.784192 BTC),
    // or if one output address is observed for the first time with single spend.
    if (tx.toAddresses.length === 2 && tx.amounts.length === 2) {
      const amt1 = tx.amounts[0];
      const amt2 = tx.amounts[1];
      const isAmt1Round = isRoundNumber(amt1);
      const isAmt2Round = isRoundNumber(amt2);

      if (isAmt1Round && !isAmt2Round) {
        // Output 2 is likely the change address returning remaining UTXO to sender
        identifiedChangeAddresses.add(tx.toAddresses[1]);
      } else if (!isAmt1Round && isAmt2Round) {
        // Output 1 is likely the change address
        identifiedChangeAddresses.add(tx.toAddresses[0]);
      }
    }

    // Accumulate transaction volumes
    for (const fromAddr of tx.fromAddresses) {
      addressVolumeMap.set(fromAddr, (addressVolumeMap.get(fromAddr) || 0) + tx.totalAmount);
      addressTxCountMap.set(fromAddr, (addressTxCountMap.get(fromAddr) || 0) + 1);
    }
    for (let i = 0; i < tx.toAddresses.length; i++) {
      const toAddr = tx.toAddresses[i];
      const amt = tx.amounts[i] || 0;
      addressVolumeMap.set(toAddr, (addressVolumeMap.get(toAddr) || 0) + amt);
      addressTxCountMap.set(toAddr, (addressTxCountMap.get(toAddr) || 0) + 1);
    }
  }

  // Extract raw DSU groups
  const groups = dsu.getGroups();
  const addressToEntityMap = new Map<string, string>();
  const entityClusters = new Map<string, EntityCluster>();

  let entityCounter = 1;
  let multiInputGroupsCount = 0;

  for (const [, addressList] of groups.entries()) {
    const entityId = `ENT-${String(entityCounter).padStart(3, '0')}`;
    entityCounter++;

    let isIllicit = false;
    let totalClusterVol = 0;
    const heuristics: Array<'MULTI_INPUT_COSPENDING' | 'CHANGE_ADDRESS_REUSE' | 'DIRECT_SEED'> = [];

    if (addressList.length > 1) {
      heuristics.push('MULTI_INPUT_COSPENDING');
      multiInputGroupsCount++;
    }

    // Check for change address presence
    const hasChangeAddr = addressList.some((addr) => identifiedChangeAddresses.has(addr));
    if (hasChangeAddr) {
      heuristics.push('CHANGE_ADDRESS_REUSE');
    }

    // Pick primary address: illicit seed if present, or highest volume address
    let primaryAddress = addressList[0];
    let maxVolume = -1;

    for (const addr of addressList) {
      addressToEntityMap.set(addr, entityId);
      const vol = addressVolumeMap.get(addr) || 0;
      totalClusterVol += vol;

      if (knownSeedAddresses.has(addr)) {
        isIllicit = true;
        primaryAddress = addr;
        if (!heuristics.includes('DIRECT_SEED')) heuristics.push('DIRECT_SEED');
      } else if (!isIllicit && vol > maxVolume) {
        maxVolume = vol;
        primaryAddress = addr;
      }
    }

    const defaultRisk: RiskCategory = isIllicit ? 'CRITICAL_ILLICIT_SEED' : 'CLEAN_TRANSIT';
    const initialScore = isIllicit ? 100 : 0;
    const initialHops = isIllicit ? 0 : Infinity;

    entityClusters.set(entityId, {
      entityId,
      addresses: addressList,
      primaryAddress,
      heuristicsTriggered: heuristics,
      totalVolume: totalClusterVol,
      riskCategory: defaultRisk,
      proximityScore: initialScore,
      hopDistance: initialHops,
      isIllicitSeed: isIllicit,
    });
  }

  return {
    addressToEntityMap,
    entityClusters,
    identifiedChangeAddresses,
    totalEntitiesCount: entityClusters.size,
    clusteredAddressesCount: addressToEntityMap.size,
    multiInputGroupsCount,
  };
}

function isRoundNumber(num: number): boolean {
  if (num <= 0) return false;
  // Round number in crypto: multiples of 0.1, 0.5, 1, 5, 10, etc.
  const str = num.toString();
  if (!str.includes('.')) return true;
  const decimals = str.split('.')[1];
  return decimals.length <= 2;
}
