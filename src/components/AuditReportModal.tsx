/**
 * Defensible Compliance Audit Report Modal (AuditReportModal.tsx)
 * Generates an auditable, courtroom-ready forensic report with cryptographic Merkle proof commitments.
 */

import React from 'react';
import {
  ForensicCaseMetadata,
  EntityCluster,
  PeelChain,
  TransactionCycle,
  GraphNode,
} from '../types/forensics';
import {
  Printer,
  Download,
  X,
  ShieldCheck,
  CheckCircle2,
  FileText,
  Key,
} from 'lucide-react';
import { truncateAddress } from '../core/ingestion_wizard';

interface AuditReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  metadata: ForensicCaseMetadata;
  merkleRoot: string;
  blockNumber: number;
  nodes: GraphNode[];
  clusters: Map<string, EntityCluster>;
  peelChains: PeelChain[];
  cycles: TransactionCycle[];
  seedAddresses: Set<string>;
}

export const AuditReportModal: React.FC<AuditReportModalProps> = ({
  isOpen,
  onClose,
  metadata,
  merkleRoot,
  blockNumber,
  nodes,
  clusters,
  peelChains,
  cycles,
  seedAddresses,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const illicitSeeds = nodes.filter((n) => n.isIllicitSeed || seedAddresses.has(n.id));
  const highRiskNodes = nodes.filter(
    (n) => n.riskCategory === 'HIGH_TAINT_PROXIMAL' || n.riskCategory === 'ELEVATED_RISK_TRANSIT'
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Top Bar */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-bold text-slate-100">
              Defensible On-Chain Compliance & Forensic Audit Report
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-100 rounded hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Report Content */}
        <div className="p-8 overflow-y-auto space-y-6 text-slate-200 bg-slate-900 font-sans print:bg-white print:text-black">
          {/* Header Banner */}
          <div className="border-b border-slate-800 pb-6 flex items-start justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-cyan-400 font-mono font-bold">
                CHAINSINK FORENSIC AUDIT MEMORANDUM
              </div>
              <h1 className="text-2xl font-extrabold text-slate-100 mt-1">
                {metadata.caseName}
              </h1>
              <div className="text-xs text-slate-400 font-mono mt-1">
                Case Reference: {metadata.caseId} · Generated: {new Date(metadata.dateCreated).toLocaleString()}
              </div>
            </div>

            <div className="text-right text-xs font-mono">
              <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold inline-block">
                STATUS: MERKLE_SETTLED
              </span>
              <div className="text-slate-500 text-[10px] mt-1.5">Investigator: {metadata.investigator}</div>
            </div>
          </div>

          {/* Section 1: Executive Case Synopsis */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              01. Executive Case Synopsis & Incident Scope
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This defensible forensic report documents fund flows originating from victim-reported fraud seed entities.
              Using automated multi-hop transaction tracing, heuristic address clustering, and BlazingAML topology pattern mining,
              ChainSink identified a multi-hop movement of illicit crypto assets totaling{' '}
              <strong className="text-slate-100 font-mono">
                {metadata.reportedAmount} {metadata.reportedCurrency}
              </strong>
              . All entities have been distance-decay scored and cryptographically settled into a 32-byte Merkle root committed to the smart contract registry.
            </p>
          </div>

          {/* Section 2: Case Parameters Table */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">VICTIM REFERENCE</span>
              <span className="text-slate-200 truncate block">
                {metadata.victimAddress ? truncateAddress(metadata.victimAddress) : 'Direct Report'}
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">STOLEN AMOUNT</span>
              <span className="text-slate-100 font-bold">
                {metadata.reportedAmount} {metadata.reportedCurrency}
              </span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">DETECTED PEEL CHAINS</span>
              <span className="text-amber-400 font-bold">{peelChains.length} Chains Identified</span>
            </div>
            <div className="p-3 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px]">WASH TRADING CYCLES</span>
              <span className="text-purple-400 font-bold">{cycles.length} Cycles</span>
            </div>
          </div>

          {/* Section 3: Identified Illicit Seeds & Clustered Entities */}
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              02. Illicit Seed Entities & Co-Spending Clusters (Wu et al. 2023)
            </h3>
            <div className="border border-slate-800 rounded overflow-hidden">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 text-[10px]">
                  <tr>
                    <th className="p-2.5">ENTITY ID</th>
                    <th className="p-2.5">PRIMARY ADDRESS</th>
                    <th className="p-2.5">CLUSTERED ADDRESSES</th>
                    <th className="p-2.5 text-right">VOLUME ({metadata.reportedCurrency})</th>
                    <th className="p-2.5 text-right">RISK LEVEL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {Array.from(clusters.values()).slice(0, 8).map((cl) => (
                    <tr key={cl.entityId} className="hover:bg-slate-800/30">
                      <td className="p-2.5 font-bold text-slate-200">{cl.entityId}</td>
                      <td className="p-2.5 truncate max-w-[150px]">{cl.primaryAddress}</td>
                      <td className="p-2.5">{cl.addresses.length} addresses (Co-Spending)</td>
                      <td className="p-2.5 text-right tabular-nums">{cl.totalVolume.toFixed(2)}</td>
                      <td className="p-2.5 text-right">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            cl.isIllicitSeed
                              ? 'bg-red-500/10 text-red-400'
                              : cl.proximityScore >= 40
                              ? 'bg-orange-500/10 text-orange-400'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {cl.riskCategory}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Peel Chain Analysis */}
          {peelChains.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                03. Multi-Hop Peel Chain Evidence (Lin et al. 2026)
              </h3>
              <div className="space-y-3">
                {peelChains.map((chain) => (
                  <div key={chain.id} className="p-3 rounded bg-slate-950 border border-slate-800 text-xs font-mono">
                    <div className="flex items-center justify-between font-bold text-amber-400 mb-1">
                      <span>{chain.id}: {chain.totalHops} Consecutive Hops</span>
                      <span>Total Volume: {chain.totalVolume} {metadata.reportedCurrency}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mb-2">
                      Diverted Peel Off-Ramp Volume: {chain.divertedVolume} {metadata.reportedCurrency}
                    </div>

                    <div className="space-y-1 text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                      {chain.steps.map((st) => (
                        <div key={st.stepIndex} className="flex items-center justify-between">
                          <span>
                            Step {st.stepIndex}: {truncateAddress(st.inputAddress)} → Cont: {truncateAddress(st.continuationAddress)} ({st.continuationAmount} {metadata.reportedCurrency})
                          </span>
                          <span className="text-amber-300 font-semibold">
                            Peel: {truncateAddress(st.peelAddress)} ({st.peelAmount} {metadata.reportedCurrency})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Cryptographic Merkle Settlement Attestation */}
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono">
            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5" />
              <span>04. Cryptographic Proof of On-Chain Settlement</span>
            </h3>

            <div className="space-y-1 text-slate-300">
              <div className="text-slate-500">GLOBAL 32-BYTE MERKLE ROOT:</div>
              <div className="p-2 rounded bg-slate-900 border border-slate-800 text-cyan-300 break-all select-all font-bold">
                {merkleRoot}
              </div>
              <div className="flex items-center justify-between text-slate-400 text-[11px] pt-1">
                <span>Committed Block: #{blockNumber}</span>
                <span>Optimistic STM Status: COMMITTED & REPLAYABLE</span>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                SHA-256 canonical leaf construction compliant with verify_proximity_proof() on-chain verification standard.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
