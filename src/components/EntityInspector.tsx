/**
 * Entity Inspector Component (EntityInspector.tsx)
 * Displays deep forensic dossier for selected blockchain entity/address.
 * Includes hop-decay calculations, co-spending cluster details, and cryptographic Merkle proof verification.
 */

import React, { useState } from 'react';
import {
  GraphNode,
  GraphEdge,
  EntityCluster,
  RiskCategory,
} from '../types/forensics';
import { ComplianceRegistryContract } from '../core/compliance_registry';
import { reconstructShortestPath } from '../core/multihop_engine';
import { truncateAddress } from '../core/ingestion_wizard';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  Check,
  Link as LinkIcon,
  Layers,
  Activity,
  Key,
} from 'lucide-react';

interface EntityInspectorProps {
  selectedNodeId: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: Map<string, EntityCluster>;
  contract: ComplianceRegistryContract;
  currency?: string;
  onSelectNode: (nodeId: string) => void;
}

export const EntityInspector: React.FC<EntityInspectorProps> = ({
  selectedNodeId,
  nodes,
  edges,
  clusters,
  contract,
  currency = 'BTC',
  onSelectNode,
}) => {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    valid: boolean;
    timestamp: number;
  } | null>(null);

  const node = nodes.find((n) => n.id === selectedNodeId) || nodes[0];
  if (!node) {
    return (
      <div className="w-80 h-full border-l border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-center items-center text-center">
        <Activity className="w-8 h-8 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">No Entity Selected</h4>
        <p className="text-xs text-slate-500 mt-1">
          Select any node or transaction edge on the Forensics Canvas to inspect entity risk.
        </p>
      </div>
    );
  }

  const cluster = clusters.get(node.entityId);
  const pathInfo = reconstructShortestPath(node.id, nodes, edges);
  const complianceRecord = contract.getRecord(node.entityId);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1800);
  };

  const handleVerifyProof = () => {
    if (!complianceRecord) return;
    const result = contract.verify_proximity_proof(
      complianceRecord.leafHash,
      complianceRecord.merkleProof
    );
    setVerificationResult({
      tested: true,
      valid: result.isValid,
      timestamp: Date.now(),
    });
  };

  const incomingEdges = edges.filter((e) => e.target === node.id);
  const outgoingEdges = edges.filter((e) => e.source === node.id);

  return (
    <aside className="w-88 h-full border-l border-slate-800 bg-slate-950 overflow-y-auto flex flex-col p-5 divide-y divide-slate-800/80">
      {/* Entity Header */}
      <div className="pb-5">
        <div className="flex items-center justify-between text-xs text-slate-500 font-mono mb-1.5">
          <span>{node.entityId}</span>
          <span className="flex items-center gap-1">
            {node.isIllicitSeed ? (
              <span className="text-red-400 font-semibold">ILLICIT SEED</span>
            ) : isFinite(node.hopDistance) ? (
              <span>Hop {node.hopDistance} from Seed</span>
            ) : (
              <span>Isolated</span>
            )}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1">
          <h3 className="text-sm font-bold text-slate-100 font-mono break-all" title={node.id}>
            {truncateAddress(node.id)}
          </h3>
          <button
            onClick={() => handleCopy(node.id)}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors rounded hover:bg-slate-800 shrink-0"
            title="Copy Address"
          >
            {copiedText === node.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Risk Score Pill & Distance Decay */}
        <div className="mt-4 p-3 rounded-lg bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Proximity Decay Score D(v, E)</span>
            <span className="text-base font-bold font-mono tabular-nums text-slate-100">
              {node.proximityScore.toFixed(1)} / 100
            </span>
          </div>

          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                node.proximityScore >= 75
                  ? 'bg-red-500'
                  : node.proximityScore >= 40
                  ? 'bg-orange-500'
                  : node.proximityScore >= 15
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.max(4, node.proximityScore)}%` }}
            />
          </div>

          <div className="text-[11px] text-slate-500 mt-2 font-mono flex items-center justify-between">
            <span>Chen et al. (2025): D = 100 × 0.5^{isFinite(node.hopDistance) ? node.hopDistance : '∞'}</span>
            <span className="text-slate-400 font-semibold">{formatRiskCategory(node.riskCategory)}</span>
          </div>
        </div>
      </div>

      {/* Shortest Path to Seed */}
      <div className="py-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
          <LinkIcon className="w-3.5 h-3.5 text-cyan-400" />
          <span>Directed Path to Illicit Seed</span>
        </h4>

        {pathInfo.pathNodes.length > 1 ? (
          <div className="space-y-1.5">
            {pathInfo.pathNodes.map((addr, idx) => {
              const isSeed = idx === 0;
              const isTarget = idx === pathInfo.pathNodes.length - 1;
              const edgeToNext = pathInfo.pathEdges[idx];

              return (
                <div key={addr} className="flex flex-col">
                  <div
                    onClick={() => onSelectNode(addr)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded text-xs font-mono cursor-pointer transition-colors ${
                      addr === node.id
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        : isSeed
                        ? 'bg-red-500/10 text-red-300 border border-red-500/30'
                        : 'bg-slate-900 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="truncate max-w-[170px]">{truncateAddress(addr)}</span>
                    <span className="text-[10px] text-slate-500">
                      {isSeed ? 'Seed' : `Hop ${idx}`}
                    </span>
                  </div>

                  {edgeToNext && (
                    <div className="flex items-center justify-center my-0.5 text-slate-600">
                      <ArrowRight className="w-3 h-3 rotate-90" />
                      <span className="text-[10px] text-slate-500 font-mono ml-1">
                        {edgeToNext.amount} {currency}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            {node.isIllicitSeed
              ? 'This node is the origin illicit seed entity (Hop 0).'
              : 'No directed inflow path detected from illicit seeds.'}
          </p>
        )}
      </div>

      {/* Pillar 1: Clustered Addresses (Heuristic Engine) */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Co-Spending Cluster ({cluster?.addresses.length || 1})</span>
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">Wu et al. 2023</span>
        </div>

        {cluster && cluster.addresses.length > 1 ? (
          <div className="space-y-1 max-h-36 overflow-y-auto">
            {cluster.addresses.map((addr) => (
              <div
                key={addr}
                onClick={() => onSelectNode(addr)}
                className={`flex items-center justify-between px-2 py-1 rounded text-xs font-mono cursor-pointer ${
                  addr === node.id
                    ? 'bg-slate-800 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <span className="truncate max-w-[190px]">{truncateAddress(addr)}</span>
                {addr === cluster.primaryAddress && (
                  <span className="text-[10px] text-slate-500">Primary</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Single-address entity. No multi-input co-spending aggregation observed.
          </p>
        )}
      </div>

      {/* Transaction Activity Breakdown */}
      <div className="py-4">
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
          Ledger Activity
        </h4>
        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">TOTAL INFLOW</span>
            <span className="text-slate-200 font-bold tabular-nums">
              {node.totalInflow.toFixed(3)} {currency}
            </span>
            <span className="text-slate-500 block text-[10px] mt-1">{incomingEdges.length} txs</span>
          </div>

          <div className="p-2.5 rounded bg-slate-900 border border-slate-800">
            <span className="text-slate-500 block text-[10px]">TOTAL OUTFLOW</span>
            <span className="text-slate-200 font-bold tabular-nums">
              {node.totalOutflow.toFixed(3)} {currency}
            </span>
            <span className="text-slate-500 block text-[10px] mt-1">{outgoingEdges.length} txs</span>
          </div>
        </div>
      </div>

      {/* Cryptographic Merkle State Verification */}
      <div className="py-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-cyan-400" />
            <span>On-Chain Merkle Settlement</span>
          </h4>
        </div>

        {complianceRecord ? (
          <div className="space-y-2">
            <div className="p-2.5 rounded bg-slate-900 border border-slate-800 text-[11px] font-mono">
              <span className="text-slate-500 block text-[10px]">CANONICAL LEAF HASH</span>
              <span className="text-slate-300 break-all select-all">{complianceRecord.leafHash}</span>

              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-slate-500 text-[10px]">
                <span>Proof Siblings: {complianceRecord.merkleProof.length} levels</span>
                <span>STM Settled</span>
              </div>
            </div>

            <button
              onClick={handleVerifyProof}
              className="w-full py-2 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/50 text-xs font-medium text-slate-200 rounded-md transition-colors flex items-center justify-center gap-2"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
              <span>Verify On-Chain Merkle Proof</span>
            </button>

            {verificationResult && (
              <div
                className={`p-2 rounded text-xs flex items-center gap-2 ${
                  verificationResult.valid
                    ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/60 border border-red-500/40 text-red-300'
                }`}
              >
                {verificationResult.valid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Cryptographic Merkle Proof Validated against On-Chain Root.</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                    <span>Proof Verification Failed. Root mismatch.</span>
                  </>
                )}
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic">
            Entity pending on-chain Merkle root commitment.
          </p>
        )}
      </div>
    </aside>
  );
};

function formatRiskCategory(category: RiskCategory): string {
  switch (category) {
    case 'CRITICAL_ILLICIT_SEED':
      return 'Critical Seed';
    case 'HIGH_TAINT_PROXIMAL':
      return 'High Taint Proximal';
    case 'ELEVATED_RISK_TRANSIT':
      return 'Elevated Transit';
    case 'MONITORED_HOPS':
      return 'Monitored Hop';
    case 'LOW_PROXIMITY':
      return 'Low Proximity';
    default:
      return 'Clean Transit';
  }
}
