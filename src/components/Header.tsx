/**
 * Header Component (Top Bar Contract)
 * Adheres strictly to the 3-zone contract:
 * Zone 1: Single text element wordmark
 * Zone 2: 4 single-line nav tabs
 * Zone 3: 1 primary action button
 */

import React from 'react';
import { ShieldAlert, FileText, Database, GitFork, Cpu } from 'lucide-react';
import { ForensicCaseMetadata } from '../types/forensics';

export type ActiveNavTab = 'canvas' | 'ingestion' | 'compliance' | 'benchmarks';

interface HeaderProps {
  activeTab: ActiveNavTab;
  onSelectTab: (tab: ActiveNavTab) => void;
  onOpenAuditReport: () => void;
  caseMetadata: ForensicCaseMetadata;
  merkleRoot: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenAuditReport,
  caseMetadata,
  merkleRoot,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between gap-8">
      {/* Zone 1: Brand Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
          <ShieldAlert className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-base font-bold tracking-tight text-slate-100 whitespace-nowrap">
            ChainSink Forensics
          </span>
          <span className="text-xs text-slate-500 font-mono">
            {caseMetadata.caseId} · Merkle: {merkleRoot.slice(0, 10)}...
          </span>
        </div>
      </div>

      {/* Zone 2: Navigation Links (Single-line tabs) */}
      <nav className="hidden md:flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
        <button
          onClick={() => onSelectTab('canvas')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'canvas'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Forensics Canvas</span>
        </button>

        <button
          onClick={() => onSelectTab('ingestion')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'ingestion'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Ingestion Wizard</span>
        </button>

        <button
          onClick={() => onSelectTab('compliance')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'compliance'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Compliance Registry</span>
        </button>

        <button
          onClick={() => onSelectTab('benchmarks')}
          className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
            activeTab === 'benchmarks'
              ? 'bg-slate-800 text-cyan-300 shadow-sm'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>Benchmark & Research</span>
        </button>
      </nav>

      {/* Zone 3: Primary Action */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenAuditReport}
          className="flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-md transition-colors shadow-sm whitespace-nowrap shrink-0 font-sans"
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Export Audit Report</span>
        </button>
      </div>
    </header>
  );
};
