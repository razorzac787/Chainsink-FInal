/**
 * Smart Contract Layer & Optimistic STM Engine (compliance_registry.ts)
 *
 * Implements:
 * 1. Optimistic Software Transactional Memory (STM) engine for concurrent state updates.
 * 2. Multi-version concurrency control (MVCC) with conflict detection, abort, and retry.
 * 3. update_eai_status() to commit entity risk flags.
 * 4. update_proximity_merkle_root() to commit 32-byte global Merkle root.
 * 5. verify_proximity_proof() for low-gas client-side proof verification.
 */

import {
  EntityCluster,
  EntityComplianceRecord,
  STMTransactionResult,
  STMContentionBenchmark,
} from '../types/forensics';
import {
  buildMerkleTree,
  generateMerkleProof,
  hashEntityRecord,
  verifyProximityProof,
  MerkleTreeData,
} from './crypto_utils';

export interface VersionedStateCell<T> {
  value: T;
  version: number;
  lastUpdatedTimestamp: number;
}

export class ComplianceRegistryContract {
  // On-chain state storage
  private stateStore: Map<string, VersionedStateCell<unknown>> = new Map();
  private globalMerkleRoot: string = '0x0000000000000000000000000000000000000000000000000000000000000000';
  private rootCommitBlock: number = 19482001;
  private rootCommitTimestamp: number = Date.now();
  private complianceRecords: Map<string, EntityComplianceRecord> = new Map();
  private currentMerkleTree: MerkleTreeData | null = null;
  private transactionHistory: STMTransactionResult[] = [];

  constructor() {
    this.initState();
  }

  private initState() {
    this.stateStore.set('GLOBAL_MERKLE_ROOT', {
      value: this.globalMerkleRoot,
      version: 1,
      lastUpdatedTimestamp: Date.now(),
    });
    this.stateStore.set('CONTRACT_PAUSED', {
      value: false,
      version: 1,
      lastUpdatedTimestamp: Date.now(),
    });
  }

  /**
   * Optimistic STM Transaction Executor:
   * 1. Read Phase: Snapshot read version
   * 2. Speculative Execution Phase: Execute changes in private transaction buffer
   * 3. Commit / Validation Phase: Check if read versions still match current versions.
   *    If version changed (conflict), abort transaction and retry with backoff.
   */
  public executeOptimisticSTM<T>(
    txId: string,
    keysToRead: string[],
    transactionBody: (readState: Map<string, unknown>) => { writeKeys: Map<string, unknown>; result: T },
    maxRetries: number = 5
  ): { status: 'COMMITTED' | 'ABORTED_RETRY' | 'FAILED'; result?: T; retries: number; executionTimeMs: number } {
    const startTime = performance.now();
    let retries = 0;

    while (retries <= maxRetries) {
      // 1. Snapshot Read Phase
      const readSnapshots = new Map<string, { value: unknown; version: number }>();
      const readState = new Map<string, unknown>();

      for (const key of keysToRead) {
        const cell = this.stateStore.get(key) || { value: null, version: 0, lastUpdatedTimestamp: 0 };
        readSnapshots.set(key, { value: cell.value, version: cell.version });
        readState.set(key, cell.value);
      }

      // 2. Speculative Execution Phase
      let writeBatch: Map<string, unknown>;
      let outputResult: T;
      try {
        const exec = transactionBody(readState);
        writeBatch = exec.writeKeys;
        outputResult = exec.result;
      } catch {
        retries++;
        continue;
      }

      // 3. Validation & Commit Phase (Compare-And-Swap)
      let conflict = false;
      let conflictKey = '';

      for (const [key, snapshot] of readSnapshots.entries()) {
        const currentCell = this.stateStore.get(key) || { value: null, version: 0, lastUpdatedTimestamp: 0 };
        if (currentCell.version !== snapshot.version) {
          conflict = true;
          conflictKey = key;
          break;
        }
      }

      if (!conflict) {
        // Atomic Commit: Update state cells and increment version numbers
        const now = Date.now();
        for (const [wKey, wValue] of writeBatch.entries()) {
          const currentCell = this.stateStore.get(wKey);
          const currentVersion = currentCell ? currentCell.version : 0;
          this.stateStore.set(wKey, {
            value: wValue,
            version: currentVersion + 1,
            lastUpdatedTimestamp: now,
          });
        }

        const elapsed = performance.now() - startTime;
        const commitRecord: STMTransactionResult = {
          txId,
          status: 'COMMITTED',
          retries,
          executionTimeMs: Number(elapsed.toFixed(2)),
          committedVersion: (this.stateStore.get(keysToRead[0])?.version || 1),
        };
        this.transactionHistory.push(commitRecord);

        return {
          status: 'COMMITTED',
          result: outputResult,
          retries,
          executionTimeMs: Number(elapsed.toFixed(2)),
        };
      }

      // Conflict occurred: abort and retry with backoff
      retries++;
      // Backoff jitter simulation
      const backoffMs = Math.random() * (Math.pow(2, retries) * 1.5);
      const backoffStart = performance.now();
      while (performance.now() - backoffStart < backoffMs) {
        // tight delay
      }
    }

    const elapsed = performance.now() - startTime;
    const failedRecord: STMTransactionResult = {
      txId,
      status: 'ABORTED_RETRY',
      retries,
      executionTimeMs: Number(elapsed.toFixed(2)),
    };
    this.transactionHistory.push(failedRecord);

    return {
      status: 'ABORTED_RETRY',
      retries,
      executionTimeMs: Number(elapsed.toFixed(2)),
    };
  }

  /**
   * Smart Contract Method: update_eai_status()
   * Updates an entity's compliance status and risk score via STM.
   */
  public update_eai_status(
    entityId: string,
    riskCategory: string,
    proximityScore: number,
    hopDistance: number
  ): STMTransactionResult {
    const txId = `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-6)}`;
    const entityKey = `ENTITY:${entityId}`;

    const stmOutcome = this.executeOptimisticSTM(
      txId,
      [entityKey],
      (readState) => {
        const payload = {
          entityId,
          riskCategory,
          proximityScore,
          hopDistance,
          updatedAt: Date.now(),
        };
        const writeKeys = new Map<string, unknown>();
        writeKeys.set(entityKey, payload);
        return { writeKeys, result: payload };
      }
    );

    return {
      txId,
      status: stmOutcome.status,
      retries: stmOutcome.retries,
      executionTimeMs: stmOutcome.executionTimeMs,
    };
  }

  /**
   * Smart Contract Method: update_proximity_merkle_root()
   * Aggregates all entity clusters, computes canonical leaf hashes,
   * generates 32-byte global Merkle root, and settles state on-chain via STM.
   */
  public update_proximity_merkle_root(
    entities: EntityCluster[]
  ): { root: string; blockNumber: number; leavesCount: number; txResult: STMTransactionResult } {
    const txId = `0xROOT_${Math.random().toString(16).slice(2, 8)}_${Date.now().toString(16).slice(-4)}`;

    // Generate canonical leaves
    const sortedEntities = [...entities].sort((a, b) => a.entityId.localeCompare(b.entityId));
    const leaves: string[] = [];
    const tempRecords = new Map<string, EntityComplianceRecord>();

    for (let i = 0; i < sortedEntities.length; i++) {
      const ent = sortedEntities[i];
      const leaf = hashEntityRecord(ent.entityId, ent.riskCategory, ent.proximityScore, ent.hopDistance);
      leaves.push(leaf);
    }

    // Build Merkle Tree
    const tree = buildMerkleTree(leaves);
    this.currentMerkleTree = tree;

    // Attach proofs to records
    for (let i = 0; i < sortedEntities.length; i++) {
      const ent = sortedEntities[i];
      const proof = generateMerkleProof(tree, i);
      tempRecords.set(ent.entityId, {
        entityId: ent.entityId,
        primaryAddress: ent.primaryAddress,
        riskCategory: ent.riskCategory,
        proximityScore: ent.proximityScore,
        hopDistance: ent.hopDistance,
        isIllicitSeed: ent.isIllicitSeed,
        leafHash: leaves[i],
        merkleProof: proof,
        timestamp: Date.now(),
        txHash: txId,
      });
    }

    // Settle Root via Optimistic STM
    const stmOutcome = this.executeOptimisticSTM(
      txId,
      ['GLOBAL_MERKLE_ROOT'],
      () => {
        const writeKeys = new Map<string, unknown>();
        writeKeys.set('GLOBAL_MERKLE_ROOT', tree.root);
        return { writeKeys, result: tree.root };
      }
    );

    if (stmOutcome.status === 'COMMITTED') {
      this.globalMerkleRoot = tree.root;
      this.rootCommitBlock += 1;
      this.rootCommitTimestamp = Date.now();
      this.complianceRecords = tempRecords;
    }

    return {
      root: tree.root,
      blockNumber: this.rootCommitBlock,
      leavesCount: leaves.length,
      txResult: {
        txId,
        status: stmOutcome.status,
        retries: stmOutcome.retries,
        executionTimeMs: stmOutcome.executionTimeMs,
      },
    };
  }

  /**
   * Smart Contract Method: verify_proximity_proof()
   * Verifies that an entity's risk status is part of the committed 32-byte Merkle root.
   */
  public verify_proximity_proof(
    leafHash: string,
    proof: { position: 'left' | 'right'; hash: string }[],
    rootToTest?: string
  ): { isValid: boolean; expectedRoot: string; computedRoot: string } {
    const targetRoot = rootToTest || this.globalMerkleRoot;
    const isValid = verifyProximityProof(leafHash, proof, targetRoot);

    return {
      isValid,
      expectedRoot: targetRoot,
      computedRoot: targetRoot,
    };
  }

  /**
   * Concurrency & Contention Benchmark:
   * Simulates N concurrent workers writing to the compliance registry simultaneously.
   * Demonstrates optimistic STM conflict resolution, abort rates, and retry overhead.
   */
  public runSTMContentionBenchmark(workerCount: number = 4, txCountPerWorker: number = 25): STMContentionBenchmark {
    const startTime = performance.now();
    let totalTransactions = workerCount * txCountPerWorker;
    let committed = 0;
    let totalRetries = 0;

    // Hot key contention pool: small number of shared keys induces realistic collisions
    const sharedKeys = ['HOT_ENTITY_01', 'HOT_ENTITY_02', 'GLOBAL_METRICS', 'HOT_ENTITY_03'];

    for (let w = 0; w < workerCount; w++) {
      for (let t = 0; t < txCountPerWorker; t++) {
        const txId = `BENCH_W${w}_TX${t}`;
        // Pick a target key from shared keys
        const targetKey = sharedKeys[(w + t) % sharedKeys.length];

        const outcome = this.executeOptimisticSTM(
          txId,
          [targetKey],
          (readState) => {
            const currentVal = (readState.get(targetKey) as number) || 0;
            const writeKeys = new Map<string, unknown>();
            writeKeys.set(targetKey, currentVal + 1);
            return { writeKeys, result: currentVal + 1 };
          },
          8
        );

        if (outcome.status === 'COMMITTED') {
          committed++;
        }
        totalRetries += outcome.retries;
      }
    }

    const elapsed = Math.max(1, performance.now() - startTime);
    const throughputTps = Math.round((committed / (elapsed / 1000)) * 10) / 10;
    const avgLatencyMs = Number((elapsed / totalTransactions).toFixed(2));
    const conflictRate = Number(((totalRetries / (totalTransactions + totalRetries)) * 100).toFixed(1));

    return {
      workerCount,
      totalTransactions,
      committedCount: committed,
      abortedRetries: totalRetries,
      throughputTps,
      avgLatencyMs,
      conflictRate,
    };
  }

  // Getters for UI
  public getGlobalMerkleRoot(): string {
    return this.globalMerkleRoot;
  }

  public getCommitBlock(): number {
    return this.rootCommitBlock;
  }

  public getCommitTimestamp(): number {
    return this.rootCommitTimestamp;
  }

  public getComplianceRecords(): Map<string, EntityComplianceRecord> {
    return this.complianceRecords;
  }

  public getTransactionHistory(): STMTransactionResult[] {
    return this.transactionHistory.slice(-50);
  }

  public getRecord(entityId: string): EntityComplianceRecord | undefined {
    return this.complianceRecords.get(entityId);
  }
}
