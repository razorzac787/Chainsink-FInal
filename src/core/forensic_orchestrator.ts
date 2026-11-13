/**
 * Master Forensic Pipeline Orchestrator (forensic_orchestrator.ts)
 * Coordinates the 4 execution layers of ChainSink:
 * - Layer 1: Ingestion Wizard & Sanitization
 * - Layer 2: Pillar 1 Heuristic Clustering
 * - Layer 3: Pillar 2 BlazingAML Topology Core
 * - Layer 4: Pillar 3 EAI Proximity Engine
 * - Layer 5: Compliance Registry & Merkle Settlement
 */

import {
  RawTransaction,
  GraphNode,
  GraphEdge,
  EntityCluster,
  TopologyMiningResult,
  ForensicCaseMetadata,
} from '../types/forensics';
import { runPillar1HeuristicClustering, ClusteringResult } from './heuristic_analyzer';
import { runBlazingAMLTopologyMining, TopologyMiningOptions } from './blazing_aml';
import { runPillar3ProximityScoring, ProximityComputationResult } from './multihop_engine';
import { ComplianceRegistryContract } from './compliance_registry';
import {
  generateVictimScamDataset,
  generateElliptic2Dataset,
  PRESET_DATASETS,
} from './ingestion_wizard';

export interface ForensicPipelineRunResult {
  metadata: ForensicCaseMetadata;
  transactions: RawTransaction[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  clustering: ClusteringResult;
  topology: TopologyMiningResult;
  proximity: ProximityComputationResult;
  contract: ComplianceRegistryContract;
  merkleSettlement: {
    root: string;
    blockNumber: number;
    leavesCount: number;
  };
  seedAddresses: Set<string>;
}

export class ChainSinkForensicEngine {
  private contract: ComplianceRegistryContract;

  constructor() {
    this.contract = new ComplianceRegistryContract();
  }

  public getContract(): ComplianceRegistryContract {
    return this.contract;
  }

  public runPipeline(
    initialTransactions: RawTransaction[],
    initialNodes: GraphNode[],
    initialEdges: GraphEdge[],
    seedAddresses: Set<string>,
    caseMetadata?: Partial<ForensicCaseMetadata>,
    options?: TopologyMiningOptions
  ): ForensicPipelineRunResult {
    // 1. Pillar 1: Heuristic Clustering
    const clustering = runPillar1HeuristicClustering(initialTransactions, seedAddresses);

    // Map nodes to entity clusters
    const clusteredNodes: GraphNode[] = initialNodes.map((node) => {
      const entityId = clustering.addressToEntityMap.get(node.id) || 'ENT-000';
      const cluster = clustering.entityClusters.get(entityId);
      const isSeed = node.isIllicitSeed || (cluster ? cluster.isIllicitSeed : false);

      return {
        ...node,
        entityId,
        isIllicitSeed: isSeed,
        riskCategory: isSeed ? 'CRITICAL_ILLICIT_SEED' : node.riskCategory,
        proximityScore: isSeed ? 100 : node.proximityScore,
        hopDistance: isSeed ? 0 : node.hopDistance,
      };
    });

    // 2. Pillar 2: BlazingAML Topology Mining
    const topology = runBlazingAMLTopologyMining(initialTransactions, initialEdges, options);

    // 3. Pillar 3: EAI Proximity Engine
    const proximity = runPillar3ProximityScoring(
      clusteredNodes,
      initialEdges,
      clustering.entityClusters,
      seedAddresses
    );

    // 4. Smart Contract Registry & Merkle Settlement
    const entitiesList = Array.from(proximity.updatedClusters.values());
    const merkleSettlement = this.contract.update_proximity_merkle_root(entitiesList);

    // Build Case Metadata
    const metadata: ForensicCaseMetadata = {
      caseId: caseMetadata?.caseId || 'CASE-CS-FORENSIC-001',
      caseName: caseMetadata?.caseName || 'Multi-Hop Illicit Asset Tracing',
      victimAddress: caseMetadata?.victimAddress,
      reportedAmount: caseMetadata?.reportedAmount || 48.5,
      reportedCurrency: caseMetadata?.reportedCurrency || 'BTC',
      investigator: caseMetadata?.investigator || 'ChainSink Certified Forensics Agent',
      dateCreated: new Date().toISOString(),
      status: 'MERKLE_SETTLED',
    };

    return {
      metadata,
      transactions: initialTransactions,
      nodes: proximity.nodes,
      edges: proximity.edges,
      clustering,
      topology,
      proximity,
      contract: this.contract,
      merkleSettlement: {
        root: merkleSettlement.root,
        blockNumber: merkleSettlement.blockNumber,
        leavesCount: merkleSettlement.leavesCount,
      },
      seedAddresses,
    };
  }

  public loadPreset(presetKey: keyof typeof PRESET_DATASETS): ForensicPipelineRunResult {
    let dataset;
    let metadata: Partial<ForensicCaseMetadata>;

    if (presetKey === 'ELLIPTIC2_LAUNDERING_RING') {
      dataset = generateElliptic2Dataset();
      metadata = {
        caseId: PRESET_DATASETS.ELLIPTIC2_LAUNDERING_RING.caseId,
        caseName: PRESET_DATASETS.ELLIPTIC2_LAUNDERING_RING.name,
        victimAddress: PRESET_DATASETS.ELLIPTIC2_LAUNDERING_RING.victimAddress,
        reportedAmount: PRESET_DATASETS.ELLIPTIC2_LAUNDERING_RING.reportedAmount,
        reportedCurrency: PRESET_DATASETS.ELLIPTIC2_LAUNDERING_RING.reportedCurrency,
      };
    } else {
      dataset = generateVictimScamDataset();
      metadata = {
        caseId: PRESET_DATASETS.VICTIM_SCAM_PEEL.caseId,
        caseName: PRESET_DATASETS.VICTIM_SCAM_PEEL.name,
        victimAddress: PRESET_DATASETS.VICTIM_SCAM_PEEL.victimAddress,
        reportedAmount: PRESET_DATASETS.VICTIM_SCAM_PEEL.reportedAmount,
        reportedCurrency: PRESET_DATASETS.VICTIM_SCAM_PEEL.reportedCurrency,
      };
    }

    return this.runPipeline(
      dataset.transactions,
      dataset.nodes,
      dataset.edges,
      dataset.seedAddresses,
      metadata
    );
  }
}
