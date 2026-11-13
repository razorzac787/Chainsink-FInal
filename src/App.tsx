/**
 * ChainSink: Automated Multi-Hop Blockchain Forensics & On-Chain Compliance Pipeline
 * Master Application Shell
 */

import React, { useState, useMemo } from 'react';
import { Header, ActiveNavTab } from './components/Header';
import { ForensicsCanvas } from './components/ForensicsCanvas';
import { EntityInspector } from './components/EntityInspector';
import { IngestionWizardModal } from './components/IngestionWizardModal';
import { ComplianceRegistryView } from './components/ComplianceRegistryView';
import { BenchmarkView } from './components/BenchmarkView';
import { AuditReportModal } from './components/AuditReportModal';
import { ChainSinkForensicEngine } from './core/forensic_orchestrator';
import {
  RawTransaction,
  GraphNode,
  GraphEdge,
} from './types/forensics';
import { ShieldAlert, AlertTriangle, Layers, GitFork, ArrowUpRight } from 'lucide-react';

export default function App() {
  // Master Forensic Engine
  const engine = useMemo(() => new ChainSinkForensicEngine(), []);

  // Initial Pipeline State
  const [forensicData, setForensicData] = useState(() => {
    return engine.loadPreset('VICTIM_SCAM_PEEL');
  });

  const [activeTab, setActiveTab] = useState<ActiveNavTab>('canvas');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    forensicData.nodes.find((n) => n.isIllicitSeed)?.id || forensicData.nodes[0]?.id || null
  );
  const [isAuditReportOpen, setIsAuditReportOpen] = useState(false);

  // Handle Ingest from Wizard
  const handleIngestDataset = (
    transactions: RawTransaction[],
    nodes: GraphNode[],
    edges: GraphEdge[],
    seedAddresses: Set<string>,
    caseMeta: { caseId: string; caseName: string; reportedAmount: number; reportedCurrency: string }
  ) => {
    const result = engine.runPipeline(
      transactions,
      nodes,
      edges,
      seedAddresses,
      caseMeta
    );
    setForensicData(result);
    setSelectedNodeId(
      result.nodes.find((n) => n.isIllicitSeed)?.id || result.nodes[0]?.id || null
    );
    setActiveTab('canvas');
  };

  // Re-commit Root
  const handleRefreshPipeline = () => {
    const result = engine.runPipeline(
      forensicData.transactions,
      forensicData.nodes,
      forensicData.edges,
      forensicData.seedAddresses,
      forensicData.metadata
    );
    setForensicData(result);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* 3-Zone Top Bar Contract */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenAuditReport={() => setIsAuditReportOpen(true)}
        caseMetadata={forensicData.metadata}
        merkleRoot={forensicData.merkleSettlement.root}
      />

      {/* Case Overview Sub-bar */}
      <div className="bg-slate-900/80 border-b border-slate-800/80 px-6 py-2 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
            <span>Active Case: {forensicData.metadata.caseName}</span>
          </div>
          <span className="text-slate-600">·</span>
          <span>
            Reported Stolen:{' '}
            <strong className="text-slate-200 font-mono">
              {forensicData.metadata.reportedAmount} {forensicData.metadata.reportedCurrency}
            </strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Entities Clustered:{' '}
            <strong className="text-slate-200 font-mono">
              {forensicData.clustering.totalEntitiesCount}
            </strong>
          </span>
          <span className="text-slate-600">·</span>
          <span>
            Peel Chains:{' '}
            <strong className="text-amber-400 font-mono">
              {forensicData.topology.peelChains.length}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-500">Block #{forensicData.merkleSettlement.blockNumber}</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <span>Merkle Settled</span>
          </span>
        </div>
      </div>

      {/* Main Viewport Content */}
      <main className="flex-1 flex overflow-hidden relative">
        {activeTab === 'canvas' && (
          <div className="flex-1 flex w-full h-full overflow-hidden">
            {/* 2D Interactive Forensics Canvas */}
            <div className="flex-1 h-full p-3">
              <ForensicsCanvas
                nodes={forensicData.nodes}
                edges={forensicData.edges}
                peelChains={forensicData.topology.peelChains}
                cycles={forensicData.topology.cycles}
                selectedNodeId={selectedNodeId}
                onSelectNode={setSelectedNodeId}
                currency={forensicData.metadata.reportedCurrency}
              />
            </div>

            {/* Right Side Entity Inspector Dossier */}
            <EntityInspector
              selectedNodeId={selectedNodeId}
              nodes={forensicData.nodes}
              edges={forensicData.edges}
              clusters={forensicData.clustering.entityClusters}
              contract={forensicData.contract}
              currency={forensicData.metadata.reportedCurrency}
              onSelectNode={setSelectedNodeId}
            />
          </div>
        )}

        {activeTab === 'ingestion' && (
          <IngestionWizardModal
            onIngestDataset={handleIngestDataset}
          />
        )}

        {activeTab === 'compliance' && (
          <ComplianceRegistryView
            contract={forensicData.contract}
            clusters={forensicData.clustering.entityClusters}
            onRefreshPipeline={handleRefreshPipeline}
          />
        )}

        {activeTab === 'benchmarks' && (
          <BenchmarkView
            topology={forensicData.topology}
            totalEdges={forensicData.edges.length}
            totalNodes={forensicData.nodes.length}
          />
        )}
      </main>

      {/* Defensible Audit Report Modal */}
      <AuditReportModal
        isOpen={isAuditReportOpen}
        onClose={() => setIsAuditReportOpen(false)}
        metadata={forensicData.metadata}
        merkleRoot={forensicData.merkleSettlement.root}
        blockNumber={forensicData.merkleSettlement.blockNumber}
        nodes={forensicData.nodes}
        clusters={forensicData.clustering.entityClusters}
        peelChains={forensicData.topology.peelChains}
        cycles={forensicData.topology.cycles}
        seedAddresses={forensicData.seedAddresses}
      />
    </div>
  );
}
