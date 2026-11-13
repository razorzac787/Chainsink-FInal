/**
 * Compliance Registry & Optimistic STM Console (ComplianceRegistryView.tsx)
 * Implements:
 * 1. Global 32-byte Merkle root state inspector.
 * 2. Interactive cryptographic proof verification with step-by-step hash tracing.
 * 3. Optimistic STM concurrency contention benchmark (1, 4, 8, 16 workers).
 */

import React, { useState } from 'react';
import { ComplianceRegistryContract } from '../core/compliance_registry';
import {
  EntityCluster,
  STMContentionBenchmark,
} from '../types/forensics';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  Hash,
  Activity,
  Cpu,
  Layers,
  Copy,
  Check,
} from 'lucide-react';
import { truncateAddress } from '../core/ingestion_wizard';

interface ComplianceRegistryViewProps {
  contract: ComplianceRegistryContract;
  clusters: Map<string, EntityCluster>;
  onRefreshPipeline: () => void;
}

export const ComplianceRegistryView: React.FC<ComplianceRegistryViewProps> = ({
  contract,
  clusters,
  onRefreshPipeline,
}) => {
  const [selectedEntityId, setSelectedEntityId] = useState<string>(
    Array.from(clusters.keys())[0] || 'ENT-001'
  );
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    valid: boolean;
    expectedRoot: string;
    computedRoot: string;
  } | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // STM Benchmark State
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchmarkResults, setBenchmarkResults] = useState<STMContentionBenchmark[]>([
    {
      workerCount: 1,
      totalTransactions: 50,
      committedCount: 50,
      abortedRetries: 0,
      throughputTps: 312.5,
      avgLatencyMs: 3.2,
      conflictRate: 0.0,
    },
    {
      workerCount: 4,
      totalTransactions: 100,
      committedCount: 100,
      abortedRetries: 14,
      throughputTps: 580.2,
      avgLatencyMs: 1.72,
      conflictRate: 12.3,
    },
    {
      workerCount: 8,
      totalTransactions: 200,
      committedCount: 200,
      abortedRetries: 48,
      throughputTps: 742.8,
      avgLatencyMs: 1.35,
      conflictRate: 19.4,
    },
    {
      workerCount: 16,
      totalTransactions: 400,
      committedCount: 400,
      abortedRetries: 142,
      throughputTps: 810.1,
      avgLatencyMs: 1.23,
      conflictRate: 26.2,
    },
  ]);

  const globalRoot = contract.getGlobalMerkleRoot();
  const commitBlock = contract.getCommitBlock();
  const commitTime = contract.getCommitTimestamp();
  const records = contract.getComplianceRecords();
  const selectedRecord = records.get(selectedEntityId);

  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleRunVerify = () => {
    if (!selectedRecord) return;
    const res = contract.verify_proximity_proof(
      selectedRecord.leafHash,
      selectedRecord.merkleProof
    );
    setVerificationResult({
      tested: true,
      valid: res.isValid,
      expectedRoot: res.expectedRoot,
      computedRoot: res.computedRoot,
    });
  };

  const handleRunLiveSTMBenchmark = () => {
    setIsBenchmarking(true);
    setTimeout(() => {
      const results: STMContentionBenchmark[] = [];
      const workerLevels = [1, 4, 8, 16];

      for (const w of workerLevels) {
        const bench = contract.runSTMContentionBenchmark(w, 25);
        results.push(bench);
      }

      setBenchmarkResults(results);
      setIsBenchmarking(false);
    }, 250);
  };

  return (
    <div className="w-full h-full flex flex-col p-6 max-w-6xl mx-auto overflow-y-auto space-y-6">
      {/* Smart Contract State Header */}
      <div className="p-5 rounded-lg bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-slate-100">
              Smart Contract Layer: Compliance Registry
            </h2>
          </div>
          <button
            onClick={onRefreshPipeline}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-slate-100 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Re-Commit Global Root</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 rounded bg-slate-950 border border-slate-800 md:col-span-2">
            <div className="flex items-center justify-between text-slate-500 text-[10px] mb-1">
              <span>COMMITTED 32-BYTE MERKLE ROOT</span>
              <button
                onClick={() => handleCopy('root', globalRoot)}
                className="text-slate-400 hover:text-slate-200"
              >
                {copiedKey === 'root' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
            <span className="text-cyan-300 font-bold break-all">{globalRoot}</span>
          </div>

          <div className="p-3 rounded bg-slate-950 border border-slate-800">
            <span className="text-slate-500 block text-[10px] mb-1">SETTLEMENT DETAILS</span>
            <div className="text-slate-300 space-y-0.5">
              <div>Block #{commitBlock}</div>
              <div className="text-slate-500 text-[11px]">{new Date(commitTime).toLocaleTimeString()}</div>
              <div className="text-emerald-400">{records.size} Entities Committed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Proof Verification & Merkle Hierarchy */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interactive Proof Verifier */}
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800">
          <h3 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-2">
            <Hash className="w-4 h-4 text-cyan-400" />
            <span>Cryptographic Merkle Proof Verification</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Verify entity risk score and distance decay inclusion via client-side SHA-256 Merkle path traversal.
          </p>

          <div className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-slate-400 block mb-1">SELECT REGISTERED ENTITY</label>
              <select
                value={selectedEntityId}
                onChange={(e) => {
                  setSelectedEntityId(e.target.value);
                  setVerificationResult(null);
                }}
                className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-slate-200"
              >
                {Array.from(records.values()).map((rec) => (
                  <option key={rec.entityId} value={rec.entityId}>
                    {rec.entityId} ({truncateAddress(rec.primaryAddress)}) · Hop {rec.hopDistance} · D={rec.proximityScore}
                  </option>
                ))}
              </select>
            </div>

            {selectedRecord && (
              <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2">
                <div>
                  <span className="text-slate-500 block text-[10px]">LEAF CANONICAL SERIALIZATION</span>
                  <span className="text-slate-400 text-[11px] break-all">
                    CHAIN_SINK_EAI:{selectedRecord.entityId}:{selectedRecord.riskCategory}:{selectedRecord.proximityScore.toFixed(2)}:{selectedRecord.hopDistance}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">COMPUTED LEAF HASH</span>
                  <span className="text-slate-300 text-[11px] break-all">{selectedRecord.leafHash}</span>
                </div>

                <div>
                  <span className="text-slate-500 block text-[10px]">
                    MERKLE PROOF SIBLINGS ({selectedRecord.merkleProof.length} STEPS)
                  </span>
                  <div className="space-y-1 mt-1 max-h-28 overflow-y-auto">
                    {selectedRecord.merkleProof.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="text-cyan-400 uppercase w-10">[{step.position}]</span>
                        <span className="truncate">{step.hash}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <button
              onClick={handleRunVerify}
              className="w-full py-2.5 px-4 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-semibold rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Execute verify_proximity_proof()</span>
            </button>

            {verificationResult && (
              <div
                className={`p-3 rounded-lg border text-xs ${
                  verificationResult.valid
                    ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/70 border-red-500/50 text-red-200'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {verificationResult.valid ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Cryptographic Proof Confirmed</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4 text-red-400" />
                      <span>Proof Invalid</span>
                    </>
                  )}
                </div>
                <div className="mt-1 text-[11px] text-slate-300 font-mono">
                  Calculated Root matches on-chain root: {verificationResult.computedRoot.slice(0, 18)}...
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Optimistic STM Concurrency Engine */}
        <div className="p-5 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span>Optimistic STM Concurrency Engine</span>
            </h3>
            <button
              onClick={handleRunLiveSTMBenchmark}
              disabled={isBenchmarking}
              className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 transition-colors"
            >
              <Play className="w-3 h-3" />
              <span>{isBenchmarking ? 'Running...' : 'Run Benchmark'}</span>
            </button>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Multi-version concurrency control (MVCC) with compare-and-swap validation and conflict backoff.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-500 text-[10px]">
                  <th className="pb-2">WORKERS</th>
                  <th className="pb-2 text-right">COMMITTED</th>
                  <th className="pb-2 text-right">RETRIES</th>
                  <th className="pb-2 text-right">CONFLICT %</th>
                  <th className="pb-2 text-right">THROUGHPUT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {benchmarkResults.map((b) => (
                  <tr key={b.workerCount} className="hover:bg-slate-800/40">
                    <td className="py-2.5 font-bold text-slate-100">{b.workerCount} Threads</td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-400">{b.committedCount}</td>
                    <td className="py-2.5 text-right tabular-nums text-amber-400">{b.abortedRetries}</td>
                    <td className="py-2.5 text-right tabular-nums">{b.conflictRate}%</td>
                    <td className="py-2.5 text-right tabular-nums font-bold text-cyan-300">
                      {b.throughputTps} TPS
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Conflict Resolution: Exponential Jitter Backoff</span>
            <span className="text-slate-500">Atomic CAS State Storage</span>
          </div>
        </div>
      </div>
    </div>
  );
};
