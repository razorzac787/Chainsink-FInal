/**
 * ChainSink Forensics Types & Data Models
 * References:
 * - Chen, Y., et al. (2025). A Graph-Based Approach to Blockchain Fraud Prevention. arXiv:2505.24284.
 * - Wu, J., et al. (2023). Towards Understanding Crypto Money Laundering in Web3: Heuristic Transaction Tracing. arXiv:2305.14748.
 * - Lin, H., et al. (2026). BlazingAML: High-Throughput Anti-Money Laundering System via Graph Pattern Mining. arXiv:2604.12241.
 */

export type RiskCategory =
  | 'CRITICAL_ILLICIT_SEED'
  | 'HIGH_TAINT_PROXIMAL'
  | 'ELEVATED_RISK_TRANSIT'
  | 'MONITORED_HOPS'
  | 'LOW_PROXIMITY'
  | 'CLEAN_TRANSIT';

export interface RawTransaction {
  txId: string;
  fromAddresses: string[];
  toAddresses: string[];
  amounts: number[]; // parallel to toAddresses
  totalAmount: number;
  timestamp: number; // Unix timestamp
  blockNumber?: number;
  isIllicitSeed?: boolean;
}

export interface GraphEdge {
  id: string;
  txId: string;
  source: string; // address or entity ID
  target: string;
  amount: number;
  timestamp: number;
  isPeelOutput?: boolean;
  isPeelContinuation?: boolean;
  isCycleEdge?: boolean;
  isShortestPathToSeed?: boolean;
}

export interface GraphNode {
  id: string; // address
  entityId: string;
  label: string;
  isIllicitSeed: boolean;
  seedType?: 'PHISHING_SCAM' | 'RANSOMWARE' | 'DARKNET_MARKET' | 'EXPLOIT_DRAINER' | 'CUSTOM_ILLICIT';
  proximityScore: number; // D(v, E) = max(0, 100 * 0.5^hops)
  hopDistance: number; // 0 for seed, Infinity for disconnected
  riskCategory: RiskCategory;
  nearestSeedId?: string;
  totalInflow: number;
  totalOutflow: number;
  txCount: number;
  isChangeAddress?: boolean;
  // Canvas physics
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface EntityCluster {
  entityId: string;
  addresses: string[];
  primaryAddress: string;
  heuristicsTriggered: Array<'MULTI_INPUT_COSPENDING' | 'CHANGE_ADDRESS_REUSE' | 'DIRECT_SEED'>;
  totalVolume: number;
  riskCategory: RiskCategory;
  proximityScore: number;
  hopDistance: number;
  isIllicitSeed: boolean;
}

export interface PeelChainStep {
  stepIndex: number;
  txId: string;
  inputAddress: string;
  continuationAddress: string;
  peelAddress: string;
  continuationAmount: number;
  peelAmount: number;
  peelRatio: number; // peel / total
  timestamp: number;
}

export interface PeelChain {
  id: string;
  startNode: string;
  endNode: string;
  totalHops: number;
  totalVolume: number;
  divertedVolume: number;
  steps: PeelChainStep[];
}

export interface TransactionCycle {
  id: string;
  nodes: string[];
  edges: string[];
  cycleLength: number;
  totalVolume: number;
  isWashTradingCandidate: boolean;
}

export interface TopologyMiningResult {
  peelChains: PeelChain[];
  cycles: TransactionCycle[];
  fanInHubs: { address: string; incomingCount: number; totalAmount: number }[];
  fanOutHubs: { address: string; outgoingCount: number; totalAmount: number }[];
  executionTimeMs: number;
  edgesProcessed: number;
  parallelSpeedupFactor: number;
}

export interface MerkleProofStep {
  position: 'left' | 'right';
  hash: string;
}

export interface EntityComplianceRecord {
  entityId: string;
  primaryAddress: string;
  riskCategory: RiskCategory;
  proximityScore: number;
  hopDistance: number;
  isIllicitSeed: boolean;
  leafHash: string;
  merkleProof: MerkleProofStep[];
  timestamp: number;
  txHash: string;
}

export interface STMTransactionResult {
  txId: string;
  status: 'COMMITTED' | 'ABORTED_RETRY' | 'FAILED';
  retries: number;
  executionTimeMs: number;
  conflictKey?: string;
  readVersion?: number;
  committedVersion?: number;
}

export interface STMContentionBenchmark {
  workerCount: number;
  totalTransactions: number;
  committedCount: number;
  abortedRetries: number;
  throughputTps: number;
  avgLatencyMs: number;
  conflictRate: number;
}

export interface IngestionValidationReport {
  isValid: boolean;
  magicBytesValid: boolean;
  detectedFormat: 'CSV' | 'JSON' | 'UTXO_DUMP' | 'ELLIPTIC2' | 'UNKNOWN';
  totalRows: number;
  validRows: number;
  coercedRows: number;
  errorRows: number;
  errors: string[];
  warnings: string[];
  inferredHeaders: string[];
}

export interface SchemaMappingConfig {
  txIdCol: string;
  sourceCol: string;
  targetCol: string;
  amountCol: string;
  timestampCol: string;
  isSeedCol?: string;
  seedTypeCol?: string;
}

export interface ForensicCaseMetadata {
  caseId: string;
  caseName: string;
  victimAddress?: string;
  reportedAmount?: number;
  reportedCurrency: string;
  investigator: string;
  dateCreated: string;
  status: 'OPEN_INVESTIGATION' | 'SUBMITTED_COMPLIANCE' | 'MERKLE_SETTLED';
}
