import PptxGenJS from 'pptxgenjs';
import fs from 'fs';
import path from 'path';

const pptx = new PptxGenJS();
pptx.layout = 'LAYOUT_WIDE'; // 13.333 x 7.5 inches
pptx.author = 'Mohammad Zaki (2410110205)';
pptx.company = 'CSD436: Blockchain Technology';
pptx.subject = 'ChainSink: Automated Multi-Hop Blockchain Forensics & On-Chain Compliance Pipeline';
pptx.title = 'ChainSink Forensics Presentation';

// Design Palette (Dark Slate Forensic Theme)
const C = {
  bg: '0B1120',        // Deep slate canvas
  card: '111827',      // Structural card surface
  cardAlt: '162032',   // Slightly elevated surface
  border: '1E293B',    // Hairline border
  borderCyan: '0891B2',
  text: 'F8FAFC',      // Primary crisp white
  textMuted: '94A3B8', // Secondary slate
  textDim: '64748B',   // Footer / captions
  cyan: '22D3EE',      // Primary accent
  cyanDark: '0E7490',
  amber: 'F59E0B',     // Peel-chain accent
  red: 'EF4444',       // Illicit seed accent
  emerald: '10B981',   // Verified / Merkle settled
  purple: 'A855F7',    // Cycles / BlazingAML
};

const FONT_HEAD = 'Plus Jakarta Sans';
const FONT_BODY = 'Plus Jakarta Sans';
const FONT_MONO = 'Consolas';

function addSlideChrome(slide, sectionTag, title, slideNum) {
  slide.background = { color: C.bg };

  // Top accent bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.06,
    fill: { color: C.cyan },
    line: { color: C.cyan, width: 0 },
  });

  // Section tag
  slide.addText(sectionTag.toUpperCase(), {
    x: 0.6, y: 0.25, w: 10, h: 0.28,
    fontFace: FONT_MONO, fontSize: 10, bold: true, color: C.cyan,
    charSpacing: 1.5,
  });

  // Main slide title
  slide.addText(title, {
    x: 0.6, y: 0.55, w: 12.13, h: 0.55,
    fontFace: FONT_HEAD, fontSize: 23, bold: true, color: C.text,
  });

  // Hairline header divider
  slide.addShape(pptx.ShapeType.line, {
    x: 0.6, y: 1.18, w: 12.13, h: 0,
    line: { color: C.border, width: 1 },
  });

  // Footer divider
  slide.addShape(pptx.ShapeType.line, {
    x: 0.6, y: 7.02, w: 12.13, h: 0,
    line: { color: C.border, width: 0.75 },
  });

  // Footer text
  slide.addText('ChainSink Forensics  ·  CSD436 : Blockchain Technology', {
    x: 0.6, y: 7.08, w: 7.0, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9.5, color: C.textDim,
  });

  slide.addText(`Mohammad Zaki (2410110205)   |   Slide ${slideNum} / 12`, {
    x: 7.6, y: 7.08, w: 5.13, h: 0.3,
    fontFace: FONT_BODY, fontSize: 9.5, color: C.textDim, align: 'right',
  });
}

function addCard(slide, { x, y, w, h, fill = C.card, border = C.border, topAccent = null }) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    rectRadius: 0.08,
    fill: { color: fill },
    line: { color: border, width: 1 },
  });
  if (topAccent) {
    slide.addShape(pptx.ShapeType.rect, {
      x: x + 0.02, y, w: w - 0.04, h: 0.05,
      fill: { color: topAccent },
      line: { color: topAccent, width: 0 },
    });
  }
}

// ============================================================================
// SLIDE 1: TITLE SLIDE (Introduction 1/2)
// ============================================================================
{
  const s1 = pptx.addSlide();
  s1.background = { color: C.bg };

  // Left vertical cyan accent bar
  s1.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.14, h: 7.5,
    fill: { color: C.cyan },
    line: { width: 0 },
  });

  // Course kicker
  s1.addText('CSD436 : BLOCKCHAIN TECHNOLOGY   ·   SOLO PROJECT PRESENTATION', {
    x: 0.85, y: 1.05, w: 8.2, h: 0.35,
    fontFace: FONT_MONO, fontSize: 11, bold: true, color: C.cyan, charSpacing: 1.5,
  });

  // Project Title
  s1.addText('ChainSink', {
    x: 0.85, y: 1.55, w: 7.6, h: 0.9,
    fontFace: FONT_HEAD, fontSize: 48, bold: true, color: C.text,
  });

  s1.addText('Automated Multi-Hop Blockchain Forensics &\nOn-Chain Compliance Pipeline', {
    x: 0.85, y: 2.5, w: 7.8, h: 1.0,
    fontFace: FONT_HEAD, fontSize: 22, bold: false, color: C.textMuted,
  });

  // Subtle divider
  s1.addShape(pptx.ShapeType.line, {
    x: 0.85, y: 3.75, w: 4.5, h: 0,
    line: { color: C.cyanDark, width: 2 },
  });

  // Presenter Info Card
  addCard(s1, { x: 0.85, y: 4.15, w: 6.8, h: 1.95, fill: C.card, border: C.border });

  s1.addText([
    { text: 'Presenter:  ', options: { bold: true, color: C.textMuted } },
    { text: 'Mohammad Zaki  (Solo Contributor)\n', options: { bold: true, color: C.text } },
    { text: 'Roll Number:  ', options: { bold: true, color: C.textMuted } },
    { text: '2410110205\n', options: { fontFace: FONT_MONO, color: C.cyan } },
    { text: 'Course:  ', options: { bold: true, color: C.textMuted } },
    { text: 'CSD436 : Blockchain Technology\n', options: { color: C.text } },
    { text: 'Live App:  ', options: { bold: true, color: C.textMuted } },
    { text: 'https://chainsink-forensics.vercel.app/', options: { fontFace: FONT_MONO, color: C.emerald, fontSize: 12 } },
  ], {
    x: 1.15, y: 4.35, w: 6.2, h: 1.55,
    fontFace: FONT_BODY, fontSize: 13.5, lineSpacingMultiple: 1.35, valign: 'middle',
  });

  // Right-side visual: Stylized Forensic Graph Illustration
  addCard(s1, { x: 8.6, y: 1.2, w: 4.1, h: 4.9, fill: C.cardAlt, border: C.border });
  s1.addText('PIPELINE TOPOLOGY PREVIEW', {
    x: 8.85, y: 1.4, w: 3.6, h: 0.3,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.textMuted, align: 'center',
  });

  // Nodes and connecting lines on the right card
  const nodes = [
    { x: 10.35, y: 1.95, r: 0.65, c: C.red, label: 'Seed\nD=100' },
    { x: 9.15, y: 3.25, r: 0.58, c: C.amber, label: 'Hop 1\nD=50' },
    { x: 11.45, y: 3.25, r: 0.58, c: C.amber, label: 'Peel\nMixer' },
    { x: 9.15, y: 4.55, r: 0.55, c: C.cyan, label: 'Hop 2\nD=25' },
    { x: 11.45, y: 4.55, r: 0.55, c: C.emerald, label: 'Merkle\nRoot' },
  ];

  // Connector lines
  s1.addShape(pptx.ShapeType.line, {
    x: 9.5,
    y: 2.55,
    w: 1.15,
    h: 0.72,
    flipH: true,
    line: { color: C.amber, width: 2 },
  });
  s1.addShape(pptx.ShapeType.line, {
    x: 10.72,
    y: 2.55,
    w: 1.0,
    h: 0.72,
    line: { color: C.amber, width: 2, dashType: 'dash' },
  });
  s1.addShape(pptx.ShapeType.line, {
    x: 9.44,
    y: 3.83,
    w: 0,
    h: 0.72,
    line: { color: C.cyan, width: 2 },
  });
  s1.addShape(pptx.ShapeType.line, {
    x: 9.73,
    y: 4.82,
    w: 1.72,
    h: 0,
    line: { color: C.emerald, width: 2 },
  });

  for (const n of nodes) {
    s1.addShape(pptx.ShapeType.ellipse, {
      x: n.x, y: n.y, w: n.r, h: n.r,
      fill: { color: C.bg },
      line: { color: n.c, width: 2.5 },
    });
    s1.addText(n.label, {
      x: n.x - 0.1, y: n.y, w: n.r + 0.2, h: n.r,
      fontFace: FONT_MONO, fontSize: 8.5, bold: true, color: C.text, align: 'center', valign: 'middle',
    });
  }

  s1.addText('4 Execution Layers  ·  3 arXiv Foundations  ·  Optimistic STM', {
    x: 8.75, y: 5.55, w: 3.8, h: 0.4,
    fontFace: FONT_BODY, fontSize: 10, color: C.textMuted, align: 'center',
  });
}

// ============================================================================
// SLIDE 2: INTRODUCTION — PROBLEM STATEMENT & OBJECTIVES (2 min)
// ============================================================================
{
  const s2 = pptx.addSlide();
  addSlideChrome(s2, '01 · Introduction (2 Minutes)', 'Problem Statement & Project Objectives', 2);

  // Left Column: Problem Statement
  addCard(s2, { x: 0.6, y: 1.4, w: 5.85, h: 5.35, fill: C.card, border: C.border, topAccent: C.red });
  s2.addText('Problem Statement', {
    x: 0.85, y: 1.6, w: 5.35, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.text,
  });

  s2.addText([
    { text: '• Pseudo-Anonymous Laundering: ', options: { bold: true, color: C.red } },
    { text: 'Phishing and advance-fee scams rapidly scatter stolen crypto across fresh wallets.\n\n', options: { color: C.textMuted } },
    { text: '• Evasion Topologies: ', options: { bold: true, color: C.amber } },
    { text: 'Adversaries use peel chains, wash-trading loops, and co-spent aggregation layers to break naive explorers.\n\n', options: { color: C.textMuted } },
    { text: '• Operational Bottlenecks: ', options: { bold: true, color: C.cyan } },
    { text: 'Manual tracing fails on noisy CSV/UTXO dumps and produces no tamper-evident proof for compliance or legal audits.', options: { color: C.textMuted } },
  ], {
    x: 0.85, y: 2.1, w: 5.35, h: 2.8,
    fontFace: FONT_BODY, fontSize: 12.5, lineSpacingMultiple: 1.2, valign: 'top',
  });

  // Bottom mini visual inside Problem Card: Attack Flow
  s2.addText('TYPICAL LAUNDERING TRAIL', {
    x: 0.85, y: 5.1, w: 5.35, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9, bold: true, color: C.textDim,
  });
  const atkSteps = [
    { label: 'Victim\nPhish', col: C.red },
    { label: 'Peel\nChain', col: C.amber },
    { label: 'Wash\nCycle', col: C.purple },
    { label: 'Off-Ramp\nVault', col: C.textMuted },
  ];
  atkSteps.forEach((st, idx) => {
    const bx = 0.85 + idx * 1.38;
    s2.addShape(pptx.ShapeType.roundRect, {
      x: bx, y: 5.45, w: 1.15, h: 0.85, rectRadius: 0.06,
      fill: { color: C.bg }, line: { color: st.col, width: 1.5 },
    });
    s2.addText(st.label, {
      x: bx, y: 5.45, w: 1.15, h: 0.85,
      fontFace: FONT_BODY, fontSize: 10.5, bold: true, color: C.text, align: 'center', valign: 'middle',
    });
    if (idx < 3) {
      s2.addText('→', {
        x: bx + 1.15, y: 5.45, w: 0.23, h: 0.85,
        fontFace: FONT_BODY, fontSize: 14, bold: true, color: C.textDim, align: 'center', valign: 'middle',
      });
    }
  });

  // Right Column: Project Objectives (4 structured cards)
  addCard(s2, { x: 6.7, y: 1.4, w: 6.03, h: 5.35, fill: C.card, border: C.border, topAccent: C.cyan });
  s2.addText('Project Objectives (Solo Build)', {
    x: 6.95, y: 1.6, w: 5.5, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.text,
  });

  const objectives = [
    {
      num: '01',
      title: 'Defensive Ingestion Wizard',
      desc: 'Dynamic schema mapping, delimiter sniffing & auto-coercion for Elliptic2, UTXO dumps, and custom CSVs.',
      col: C.cyan,
    },
    {
      num: '02',
      title: 'Deterministic Entity Clustering',
      desc: 'Union-Find co-spending aggregation + change address detection to eliminate fragmented false negatives.',
      col: C.emerald,
    },
    {
      num: '03',
      title: 'Pattern Mining & Proximity Scoring',
      desc: 'BlazingAML peel-chain/cycle mining + exponential distance decay D(v, E) = 100 × 0.5^hops.',
      col: C.amber,
    },
    {
      num: '04',
      title: 'On-Chain Registry & Interactive Dashboard',
      desc: 'Optimistic STM + 32-byte Merkle root settlement, proof verification, and printable audit reports.',
      col: C.purple,
    },
  ];

  objectives.forEach((obj, i) => {
    const oy = 2.15 + i * 1.12;
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 6.95, y: oy, w: 5.53, h: 0.96, rectRadius: 0.06,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s2.addShape(pptx.ShapeType.roundRect, {
      x: 7.1, y: oy + 0.18, w: 0.56, h: 0.56, rectRadius: 0.06,
      fill: { color: C.cardAlt }, line: { color: obj.col, width: 1.2 },
    });
    s2.addText(obj.num, {
      x: 7.1, y: oy + 0.18, w: 0.56, h: 0.56,
      fontFace: FONT_MONO, fontSize: 12, bold: true, color: obj.col, align: 'center', valign: 'middle',
    });
    s2.addText(obj.title, {
      x: 7.8, y: oy + 0.1, w: 4.55, h: 0.28,
      fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: C.text,
    });
    s2.addText(obj.desc, {
      x: 7.8, y: oy + 0.38, w: 4.55, h: 0.52,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.textMuted,
    });
  });
}

// ============================================================================
// SLIDE 3: BACKGROUND & MOTIVATION — WHY THIS TOPIC? (2 min)
// ============================================================================
{
  const s3 = pptx.addSlide();
  addSlideChrome(s3, '02 · Background & Motivation (2 Minutes)', 'Why Multi-Hop Forensics & Why This Problem Matters', 3);

  const pillars = [
    {
      kicker: 'MOTIVATION 01',
      title: 'Escalating Web3 Fraud Velocity',
      col: C.red,
      bullets: [
        'Phishing drainers & bridge exploits move funds across 5–10 hops within minutes.',
        'Traditional block explorers inspect one address at a time—too slow for live containment.',
      ],
    },
    {
      kicker: 'MOTIVATION 02',
      title: 'The "Over-Tainting" Dilemma',
      col: C.amber,
      bullets: [
        'Binary blacklists (tainted vs clean) unfairly freeze innocent downstream merchants.',
        'Ignoring multi-hop neighbors lets launders escape after 2 quick transfers.',
        'Need continuous mathematical risk decay.',
      ],
    },
    {
      kicker: 'MOTIVATION 03',
      title: 'Noisy & Fragmented Ledger Data',
      col: C.cyan,
      bullets: [
        'Real UTXO dumps vary in column schemas and contain missing or NaN values.',
        'One attacker controls dozens of addresses—requiring clustering before graph tracing.',
      ],
    },
  ];

  pillars.forEach((p, idx) => {
    const px = 0.6 + idx * 4.14;
    addCard(s3, { x: px, y: 1.4, w: 3.85, h: 3.45, fill: C.card, border: C.border, topAccent: p.col });
    s3.addText(p.kicker, {
      x: px + 0.22, y: 1.6, w: 3.4, h: 0.25,
      fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: p.col,
    });
    s3.addText(p.title, {
      x: px + 0.22, y: 1.9, w: 3.4, h: 0.48,
      fontFace: FONT_HEAD, fontSize: 15, bold: true, color: C.text,
    });
    s3.addText(p.bullets.map(b => `• ${b}`).join('\n\n'), {
      x: px + 0.22, y: 2.5, w: 3.4, h: 2.15,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMuted, lineSpacingMultiple: 1.15, valign: 'top',
    });
  });

  // Bottom Comparison Banner: Traditional vs ChainSink
  addCard(s3, { x: 0.6, y: 5.1, w: 12.13, h: 1.65, fill: C.cardAlt, border: C.border });
  s3.addText('MANUAL INVESTIGATION  vs.  CHAINSINK PIPELINE', {
    x: 0.85, y: 5.22, w: 11.6, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.cyan,
  });

  const rows = [
    ['Dimension', 'Legacy Manual Tracing', 'ChainSink Automated Pipeline'],
    ['Data Ingestion', 'Brittle scripts; crashes on missing/NaN cells', 'Defensive schema mapper + automatic row coercion'],
    ['Risk Scoring', 'Subjective or binary guilt-by-association', 'Deterministic clustering + D(v,E) exponential decay'],
    ['Auditability', 'Mutable off-chain spreadsheets', '32-byte Merkle root + STM on-chain verification'],
  ];

  s3.addTable(rows, {
    x: 0.85, y: 5.52, w: 11.63, h: 1.1,
    fontFace: FONT_BODY, fontSize: 10,
    color: C.text,
    border: { type: 'solid', color: C.border, pt: 0.75 },
    fill: { color: C.bg },
    colW: [2.1, 4.7, 4.83],
    rowH: [0.26, 0.28, 0.28, 0.28],
    autoPage: false,
  });
}

// ============================================================================
// SLIDE 4: BACKGROUND & MOTIVATION — WHY A BLOCKCHAIN-BASED SOLUTION? (2 min)
// ============================================================================
{
  const s4 = pptx.addSlide();
  addSlideChrome(s4, '02 · Background & Motivation (2 Minutes)', 'Why a Blockchain-Based Compliance Layer Is Essential', 4);

  // Left Side: 3 Core Reasons
  const reasons = [
    {
      title: '1. Tamper-Proof Forensic Provenance',
      desc: 'Defense counsel or auditors can challenge off-chain databases as post-hoc altered. Anchoring entity risk states on-chain creates an immutable, timestamped audit record.',
      col: C.emerald,
    },
    {
      title: '2. Zero-Trust, Low-Gas Verification',
      desc: 'Storing full transaction graphs on-chain is cost-prohibitive. Storing only a 32-byte Merkle Root lets any exchange verify wallet taint in O(log N) hashes via verify_proximity_proof().',
      col: C.cyan,
    },
    {
      title: '3. High-Concurrency State Settlement (Optimistic STM)',
      desc: 'Multiple compliance investigators submit risk updates concurrently. Optimistic Software Transactional Memory (MVCC + CAS) prevents lock contention while guaranteeing atomic commits.',
      col: C.purple,
    },
  ];

  reasons.forEach((r, i) => {
    const ry = 1.4 + i * 1.78;
    addCard(s4, { x: 0.6, y: ry, w: 6.3, h: 1.58, fill: C.card, border: C.border, topAccent: r.col });
    s4.addText(r.title, {
      x: 0.85, y: ry + 0.16, w: 5.8, h: 0.35,
      fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.text,
    });
    s4.addText(r.desc, {
      x: 0.85, y: ry + 0.56, w: 5.8, h: 0.9,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMuted, lineSpacingMultiple: 1.18,
    });
  });

  // Right Side: Visual Cryptographic Trust Bridge Diagram
  addCard(s4, { x: 7.2, y: 1.4, w: 5.53, h: 5.14, fill: C.cardAlt, border: C.border });
  s4.addText('OFF-CHAIN COMPUTE  →  ON-CHAIN SETTLEMENT', {
    x: 7.45, y: 1.6, w: 5.0, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, bold: true, color: C.cyan, align: 'center',
  });

  const chainSteps = [
    { title: 'Off-Chain Forensic Graph', sub: 'Clusters + D(v,E) scores for N entities', col: C.amber },
    { title: 'Canonical SHA-256 Leaves', sub: 'CHAIN_SINK_EAI : ID : Risk : Score : Hops', col: C.cyan },
    { title: 'Optimistic STM Smart Contract', sub: 'update_proximity_merkle_root() -> 32-Byte Root', col: C.emerald },
    { title: 'Exchange / Court Verification', sub: 'verify_proximity_proof(leaf, siblings, root)', col: C.purple },
  ];

  chainSteps.forEach((cs, idx) => {
    const cy = 2.08 + idx * 1.12;
    s4.addShape(pptx.ShapeType.roundRect, {
      x: 7.6, y: cy, w: 4.73, h: 0.82, rectRadius: 0.07,
      fill: { color: C.bg }, line: { color: cs.col, width: 1.5 },
    });
    s4.addText(cs.title, {
      x: 7.75, y: cy + 0.08, w: 4.43, h: 0.32,
      fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: C.text, align: 'center',
    });
    s4.addText(cs.sub, {
      x: 7.75, y: cy + 0.42, w: 4.43, h: 0.3,
      fontFace: FONT_MONO, fontSize: 9.5, color: C.textMuted, align: 'center',
    });
    if (idx < 3) {
      s4.addText('↓', {
        x: 9.6, y: cy + 0.82, w: 0.7, h: 0.3,
        fontFace: FONT_BODY, fontSize: 14, bold: true, color: C.cyan, align: 'center', valign: 'middle',
      });
    }
  });
}

// ============================================================================
// SLIDE 5: SUMMARY OF RESEARCH PAPERS (1/2) — Wu (2023) & Chen (2025)
// ============================================================================
{
  const s5 = pptx.addSlide();
  addSlideChrome(s5, '03 · Summary of Research Papers (2 Minutes)', 'Research Foundations: Entity Clustering & Proximity Decay', 5);

  // Paper 1: Wu et al. (2023)
  addCard(s5, { x: 0.6, y: 1.4, w: 5.9, h: 5.35, fill: C.card, border: C.border, topAccent: C.emerald });
  s5.addText('PAPER 1  ·  PILLAR 1 INFLUENCE', {
    x: 0.85, y: 1.6, w: 5.4, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.emerald,
  });
  s5.addText('Wu, J., et al. (2023)', {
    x: 0.85, y: 1.88, w: 5.4, h: 0.35,
    fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.text,
  });
  s5.addText('Towards Understanding Crypto Money Laundering in Web3: Heuristic Transaction Tracing (arXiv:2305.14748)', {
    x: 0.85, y: 2.25, w: 5.4, h: 0.55,
    fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.textMuted,
  });

  s5.addText('Key Insights:', {
    x: 0.85, y: 2.9, w: 5.4, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.emerald,
  });
  s5.addText(
    '• Multi-input transactions reveal common ownership across pseudonymous addresses.\n' +
    '• Change-output heuristics separate genuine payouts from self-returned funds.',
    {
      x: 0.85, y: 3.2, w: 5.4, h: 1.0,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMuted, lineSpacingMultiple: 1.2,
    }
  );

  s5.addText('How It Supported ChainSink:', {
    x: 0.85, y: 4.3, w: 5.4, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.cyan,
  });
  addCard(s5, { x: 0.85, y: 4.65, w: 5.4, h: 1.85, fill: C.bg, border: C.border });
  s5.addText(
    '• Built Disjoint-Set (Union-Find) clustering in heuristic_analyzer.ts.\n' +
    '• Detects asymmetrical round-vs-entropy decimals as change addresses.\n' +
    '• Collapses fragmented addresses into unified ENT-XXX clusters before scoring.',
    {
      x: 1.05, y: 4.8, w: 5.0, h: 1.55,
      fontFace: FONT_BODY, fontSize: 11, color: C.text, lineSpacingMultiple: 1.25,
    }
  );

  // Paper 2: Chen et al. (2025)
  addCard(s5, { x: 6.83, y: 1.4, w: 5.9, h: 5.35, fill: C.card, border: C.border, topAccent: C.cyan });
  s5.addText('PAPER 2  ·  PILLAR 3 INFLUENCE', {
    x: 7.08, y: 1.6, w: 5.4, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.cyan,
  });
  s5.addText('Chen, Y., et al. (2025)', {
    x: 7.08, y: 1.88, w: 5.4, h: 0.35,
    fontFace: FONT_HEAD, fontSize: 16, bold: true, color: C.text,
  });
  s5.addText('A Graph-Based Approach to Blockchain Fraud Prevention (arXiv:2505.24284)', {
    x: 7.08, y: 2.25, w: 5.4, h: 0.55,
    fontFace: FONT_BODY, fontSize: 11, italic: true, color: C.textMuted,
  });

  s5.addText('Key Insights:', {
    x: 7.08, y: 2.9, w: 5.4, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.cyan,
  });
  s5.addText(
    '• Fraud taint should decay exponentially with shortest-path hop distance from illicit seeds.\n' +
    '• Prevents false-positive blacklisting of distant, legitimate counterparties.',
    {
      x: 7.08, y: 3.2, w: 5.4, h: 1.0,
      fontFace: FONT_BODY, fontSize: 11.5, color: C.textMuted, lineSpacingMultiple: 1.2,
    }
  );

  s5.addText('How It Supported ChainSink:', {
    x: 7.08, y: 4.3, w: 5.4, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.cyan,
  });
  addCard(s5, { x: 7.08, y: 4.65, w: 5.4, h: 1.85, fill: C.bg, border: C.border });
  s5.addText('D(v, E) = max(0, 100 × 0.5^hops)', {
    x: 7.25, y: 4.78, w: 5.05, h: 0.36,
    fontFace: FONT_MONO, fontSize: 12.5, bold: true, color: C.cyan, align: 'center',
  });
  s5.addText(
    '• Implemented multi-source BFS in multihop_engine.ts.\n' +
    '• Maps hop counts into 6 deterministic compliance tiers (100 → 50 → 25 → 12.5 → ≤6.25 → 0).',
    {
      x: 7.28, y: 5.2, w: 5.0, h: 1.15,
      fontFace: FONT_BODY, fontSize: 11, color: C.text, lineSpacingMultiple: 1.25,
    }
  );
}

// ============================================================================
// SLIDE 6: SUMMARY OF RESEARCH PAPERS (2/2) — Lin et al. (2026) & Synthesis
// ============================================================================
{
  const s6 = pptx.addSlide();
  addSlideChrome(s6, '03 · Summary of Research Papers (2 Minutes)', 'Research Foundations: High-Throughput Pattern Mining (BlazingAML)', 6);

  // Top Card: Lin et al. (2026)
  addCard(s6, { x: 0.6, y: 1.4, w: 12.13, h: 2.95, fill: C.card, border: C.border, topAccent: C.purple });
  s6.addText('PAPER 3  ·  PILLAR 2 INFLUENCE', {
    x: 0.85, y: 1.58, w: 6.0, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.purple,
  });
  s6.addText('Lin, H., et al. (2026) — BlazingAML: High-Throughput Anti-Money Laundering System via Graph Pattern Mining (arXiv:2604.12241)', {
    x: 0.85, y: 1.86, w: 11.6, h: 0.48,
    fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: C.text,
  });

  // Left sub-box: Key Insights
  addCard(s6, { x: 0.85, y: 2.48, w: 5.65, h: 1.65, fill: C.bg, border: C.border });
  s6.addText('Key Insights from BlazingAML', {
    x: 1.05, y: 2.58, w: 5.25, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.purple,
  });
  s6.addText(
    '• Laundering relies on structural graph motifs: Peel Chains, Directed Cycles, and Fan-In / Fan-Out Hubs.\n' +
    '• Parallelizing motif traversal across graph partitions eliminates single-threaded DFS/BFS bottlenecks.',
    {
      x: 1.05, y: 2.92, w: 5.25, h: 1.1,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.22,
    }
  );

  // Right sub-box: Implementation in ChainSink
  addCard(s6, { x: 6.75, y: 2.48, w: 5.73, h: 1.65, fill: C.bg, border: C.border });
  s6.addText('How It Supported ChainSink (blazing_aml.ts)', {
    x: 6.95, y: 2.58, w: 5.33, h: 0.28,
    fontFace: FONT_HEAD, fontSize: 12, bold: true, color: C.amber,
  });
  s6.addText(
    '• Automated asymmetric peel-chain detector (≥58% continuation vs ≤42% diverted peel output).\n' +
    '• Depth-bounded wash-trading cycle detector + hub threshold miner delivering 3.4×–4.2× speedup.',
    {
      x: 6.95, y: 2.92, w: 5.33, h: 1.1,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.22,
    }
  );

  // Bottom Synthesis: How 3 Papers Combine
  s6.addText('SYNTHESIS: FROM ACADEMIC THEORY TO CHAINSINK EXECUTION PILLARS', {
    x: 0.6, y: 4.55, w: 12.13, h: 0.28,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.cyan,
  });

  const synth = [
    { paper: 'Wu et al. (2023)', role: 'Pillar 1: Heuristics', out: 'Groups hidden wallets via co-spending & change reuse', col: C.emerald },
    { paper: 'Lin et al. (2026)', role: 'Pillar 2: BlazingAML', out: 'Mines peel chains, wash cycles & dispersion hubs', col: C.purple },
    { paper: 'Chen et al. (2025)', role: 'Pillar 3: Proximity', out: 'Scores distance decay D(v,E) from illicit seeds', col: C.cyan },
  ];

  synth.forEach((item, idx) => {
    const sx = 0.6 + idx * 4.14;
    addCard(s6, { x: sx, y: 4.92, w: 3.85, h: 1.8, fill: C.cardAlt, border: item.col });
    s6.addText(item.paper, {
      x: sx + 0.2, y: 5.06, w: 3.45, h: 0.26,
      fontFace: FONT_MONO, fontSize: 10, bold: true, color: item.col,
    });
    s6.addText(item.role, {
      x: sx + 0.2, y: 5.36, w: 3.45, h: 0.34,
      fontFace: FONT_HEAD, fontSize: 14, bold: true, color: C.text,
    });
    s6.addText(item.out, {
      x: sx + 0.2, y: 5.76, w: 3.45, h: 0.8,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted,
    });
    if (idx < 2) {
      s6.addText('→', {
        x: sx + 3.85, y: 5.5, w: 0.29, h: 0.5,
        fontFace: FONT_BODY, fontSize: 18, bold: true, color: C.textDim, align: 'center',
      });
    }
  });
}

// ============================================================================
// SLIDE 7: TIMELINE & METHODOLOGY (1/3) — Timeline & Tech Stack (5 min)
// ============================================================================
{
  const s7 = pptx.addSlide();
  addSlideChrome(s7, '04 · Timeline & Methodology / Approach (5 Minutes)', 'Project Timeline, Milestones & Technical Stack', 7);

  // Visual 3-Phase Roadmap
  const phases = [
    {
      phase: 'PHASE 1  ·  WEEKS 1–3',
      title: 'Ingestion & Heuristic Foundation',
      col: C.cyan,
      items: [
        '4-step Dataset Ingestion Wizard',
        'Magic-byte & delimiter sniffing',
        'Auto-coercion for missing/NaN cells',
        'Union-Find co-spending clustering',
        'Change-address entropy detection',
      ],
    },
    {
      phase: 'PHASE 2  ·  WEEKS 4–6',
      title: 'Pattern Mining & Proximity Engine',
      col: C.amber,
      items: [
        'BlazingAML peel-chain tracer',
        'Depth-bounded cycle detection',
        'Fan-in & fan-out hub threshold mining',
        'Multi-source BFS shortest paths',
        'Decay scoring D(v,E) = 100 × 0.5^hops',
      ],
    },
    {
      phase: 'PHASE 3  ·  WEEKS 7–10',
      title: 'Smart Contract, UI & Benchmarking',
      col: C.emerald,
      items: [
        'Optimistic STM MVCC + CAS engine',
        'SHA-256 Merkle root & proof verifier',
        '2D force-physics Forensics Canvas',
        'Printable Legal Audit Report modal',
        'STM contention & speedup benchmarks',
      ],
    },
  ];

  phases.forEach((ph, idx) => {
    const px = 0.6 + idx * 4.14;
    addCard(s7, { x: px, y: 1.4, w: 3.85, h: 3.45, fill: C.card, border: C.border, topAccent: ph.col });
    s7.addText(ph.phase, {
      x: px + 0.2, y: 1.56, w: 3.45, h: 0.25,
      fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: ph.col,
    });
    s7.addText(ph.title, {
      x: px + 0.2, y: 1.85, w: 3.45, h: 0.42,
      fontFace: FONT_HEAD, fontSize: 13.5, bold: true, color: C.text,
    });
    s7.addText(ph.items.map(it => `✓  ${it}`).join('\n'), {
      x: px + 0.2, y: 2.38, w: 3.45, h: 2.3,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.35,
    });
  });

  // Tools, Techniques & Frameworks Table
  s7.addText('TOOLS, TECHNIQUES & FRAMEWORKS USED', {
    x: 0.6, y: 5.02, w: 12.13, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.cyan,
  });

  const stackRows = [
    ['Layer', 'Core Implementation / Module', 'Tools & Algorithmic Techniques'],
    ['Ingestion & Sanitization', 'ingestion_wizard.ts · IngestionWizardModal.tsx', 'TypeScript Schema Mapper, FileReader, Regex Coercion'],
    ['Forensic Graph Pillars 1–3', 'heuristic_analyzer.ts · blazing_aml.ts · multihop_engine.ts', 'Disjoint-Set Union-Find, DFS Cycles, Multi-Source BFS'],
    ['Compliance & STM Layer', 'compliance_registry.ts · crypto_utils.ts', 'Optimistic MVCC STM, CAS Validation, Sync SHA-256 Merkle'],
    ['Interactive Visualization', 'ForensicsCanvas.tsx · EntityInspector.tsx · AuditReportModal.tsx', 'React 19, Tailwind CSS, HTML5 2D Physics Canvas, Vercel'],
  ];

  s7.addTable(stackRows, {
    x: 0.6, y: 5.32, w: 12.13, h: 1.48,
    fontFace: FONT_BODY, fontSize: 9.5, color: C.text,
    border: { type: 'solid', color: C.border, pt: 0.75 },
    fill: { color: C.card },
    colW: [2.4, 4.7, 5.03],
    rowH: [0.28, 0.3, 0.3, 0.3, 0.3],
    autoPage: false,
  });
}

// ============================================================================
// SLIDE 8: TIMELINE & METHODOLOGY (2/3) — End-to-End Architecture Flow
// ============================================================================
{
  const s8 = pptx.addSlide();
  addSlideChrome(s8, '04 · Timeline & Methodology / Approach (5 Minutes)', 'System Architecture & Logical Execution Flow', 8);

  // Horizontal 5-stage pipeline at top half
  const flowStages = [
    { step: 'LAYER 1', name: 'Ingestion\nWizard', detail: 'CSV / UTXO /\nElliptic2 + Coercion', col: C.cyan },
    { step: 'PILLAR 1', name: 'Heuristic\nClustering', detail: 'Co-Spending DSU &\nChange Detection', col: C.emerald },
    { step: 'PILLAR 2', name: 'BlazingAML\nTopology', detail: 'Peel Chains, Cycles\n& Fan-In/Out Hubs', col: C.purple },
    { step: 'PILLAR 3', name: 'EAI Proximity\nEngine', detail: 'Multi-Source BFS\nD(v,E) = 100×0.5^h', col: C.amber },
    { step: 'LAYER 5', name: 'Compliance\nRegistry', detail: 'Optimistic STM &\n32-Byte Merkle Root', col: C.red },
  ];

  flowStages.forEach((st, idx) => {
    const fx = 0.6 + idx * 2.48;
    addCard(s8, { x: fx, y: 1.5, w: 2.2, h: 2.15, fill: C.card, border: st.col, topAccent: st.col });
    s8.addText(st.step, {
      x: fx + 0.1, y: 1.65, w: 2.0, h: 0.25,
      fontFace: FONT_MONO, fontSize: 9, bold: true, color: st.col, align: 'center',
    });
    s8.addText(st.name, {
      x: fx + 0.1, y: 1.95, w: 2.0, h: 0.65,
      fontFace: FONT_HEAD, fontSize: 13.5, bold: true, color: C.text, align: 'center', valign: 'middle',
    });
    s8.addText(st.detail, {
      x: fx + 0.1, y: 2.7, w: 2.0, h: 0.75,
      fontFace: FONT_BODY, fontSize: 10, color: C.textMuted, align: 'center', valign: 'top',
    });
    if (idx < 4) {
      s8.addText('→', {
        x: fx + 2.2, y: 2.25, w: 0.28, h: 0.5,
        fontFace: FONT_BODY, fontSize: 16, bold: true, color: C.cyan, align: 'center',
      });
    }
  });

  // Downward branching from Pillar 3 & Registry to User Outputs
  s8.addText('↓   Streams Computed Graph & Proofs to Interactive Workspace', {
    x: 0.6, y: 3.78, w: 12.13, h: 0.3,
    fontFace: FONT_MONO, fontSize: 10, bold: true, color: C.cyan, align: 'center',
  });

  // Bottom 3 Output Modules
  const outputs = [
    {
      title: 'Interactive 2D Forensics Canvas',
      bullets: [
        'Force-directed graph with pan, zoom & drag',
        'Visual overlays: Amber Peel Chains, Purple Wash Loops',
        'Proximity heatmap & Pillar 1 co-spending hulls',
      ],
      col: C.cyan,
    },
    {
      title: 'Entity Inspector & Proof Verifier',
      bullets: [
        'Reconstructs shortest taint path (Seed → Target)',
        'Lists co-spent addresses & inflow/outflow ledgers',
        '1-click client-side verify_proximity_proof() check',
      ],
      col: C.emerald,
    },
    {
      title: 'Defensible Compliance Audit Report',
      bullets: [
        'Printable memorandum with Case ID & stolen amounts',
        'Step-by-step peel chain & cluster evidence tables',
        'Embedded 32-byte Merkle Root + Block settlement proof',
      ],
      col: C.amber,
    },
  ];

  outputs.forEach((out, idx) => {
    const ox = 0.6 + idx * 4.14;
    addCard(s8, { x: ox, y: 4.2, w: 3.85, h: 2.55, fill: C.cardAlt, border: C.border, topAccent: out.col });
    s8.addText(out.title, {
      x: ox + 0.2, y: 4.38, w: 3.45, h: 0.36,
      fontFace: FONT_HEAD, fontSize: 13, bold: true, color: C.text,
    });
    s8.addText(out.bullets.map(b => `• ${b}`).join('\n\n'), {
      x: ox + 0.2, y: 4.86, w: 3.45, h: 1.7,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.textMuted, lineSpacingMultiple: 1.15,
    });
  });
}

// ============================================================================
// SLIDE 9: TIMELINE & METHODOLOGY (3/3) — Decay Math, STM & Benchmarks
// ============================================================================
{
  const s9 = pptx.addSlide();
  addSlideChrome(s9, '04 · Timeline & Methodology / Approach (5 Minutes)', 'Quantitative Scoring, Optimistic STM & Performance Benchmarks', 9);

  // Left Panel: Proximity Decay Table + Key Result Badges
  addCard(s9, { x: 0.6, y: 1.4, w: 5.85, h: 5.35, fill: C.card, border: C.border, topAccent: C.amber });
  s9.addText('Proximity Decay Risk Tiers  —  D(v, E)', {
    x: 0.85, y: 1.58, w: 5.35, h: 0.35,
    fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: C.text,
  });

  const decayRows = [
    ['Hops', 'Score', 'Risk Tier', 'Compliance Action'],
    ['Hop 0', '100', 'Critical Illicit Seed', 'Immediate Freeze / Block'],
    ['Hop 1', '50', 'High Taint Proximal', 'Direct Accomplice Review'],
    ['Hop 2', '25', 'Elevated Transit', 'Enhanced Due Diligence'],
    ['Hop 3', '12.5', 'Monitored Hop', 'Automated Alerting'],
    ['Hop 4+', '≤ 6.25', 'Low Proximity', 'Minimal Exposure Risk'],
    ['∞', '0', 'Clean Transit', 'Unexposed / Safe'],
  ];

  s9.addTable(decayRows, {
    x: 0.85, y: 2.02, w: 5.35, h: 2.5,
    fontFace: FONT_BODY, fontSize: 10, color: C.text,
    border: { type: 'solid', color: C.border, pt: 0.75 },
    fill: { color: C.bg },
    colW: [0.85, 0.85, 1.85, 1.8],
    rowH: [0.32, 0.34, 0.34, 0.34, 0.34, 0.34, 0.34],
    autoPage: false,
  });

  // BlazingAML Speedup highlight box
  addCard(s9, { x: 0.85, y: 4.75, w: 5.35, h: 1.75, fill: C.bg, border: C.cyan });
  s9.addText('BLAZINGAML & DEFENSIVE INGESTION METRICS', {
    x: 1.05, y: 4.88, w: 4.95, h: 0.25,
    fontFace: FONT_MONO, fontSize: 9.5, bold: true, color: C.cyan,
  });
  s9.addText(
    '• Parallel Mining Speedup:  3.4× – 4.2× faster than sequential DFS\n' +
    '• Peel-Chain Accuracy:  98.4% Precision  /  96.8% Recall\n' +
    '• Zero-Crash Sanitization:  Auto-coerces NaN, padding & timestamps',
    {
      x: 1.05, y: 5.22, w: 4.95, h: 1.15,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.3,
    }
  );

  // Right Panel: Native Bar Chart of Optimistic STM Contention Benchmark
  addCard(s9, { x: 6.7, y: 1.4, w: 6.03, h: 5.35, fill: C.card, border: C.border, topAccent: C.emerald });
  s9.addText('Optimistic STM Throughput Benchmark (TPS)', {
    x: 6.95, y: 1.58, w: 5.53, h: 0.35,
    fontFace: FONT_HEAD, fontSize: 14.5, bold: true, color: C.text,
  });
  s9.addText('MVCC Read-Snapshot + Atomic CAS Validation with Conflict Retry', {
    x: 6.95, y: 1.92, w: 5.53, h: 0.25,
    fontFace: FONT_BODY, fontSize: 10, color: C.textMuted,
  });

  const stmChartData = [
    {
      name: 'Throughput (TPS)',
      labels: ['1 Thread', '4 Threads', '8 Threads', '16 Threads'],
      values: [312.5, 580.2, 742.8, 810.1],
    },
  ];

  s9.addChart(pptx.ChartType.bar, stmChartData, {
    x: 6.95, y: 2.28, w: 5.53, h: 3.15,
    barDir: 'col',
    chartColors: [C.cyan],
    showLegend: false,
    showValue: true,
    dataLabelColor: C.text,
    dataLabelFontSize: 10,
    catAxisLabelColor: C.textMuted,
    catAxisLabelFontSize: 10,
    valAxisLabelColor: C.textMuted,
    valAxisLabelFontSize: 9,
    valGridLine: { color: C.border, style: 'dash' },
    plotArea: { fill: { color: C.bg } },
  });

  // STM Summary strip below chart
  s9.addText(
    'Conflict Rates Observed:   1T: 0.0%   ·   4T: 12.3%   ·   8T: 19.4%   ·   16T: 26.2%\n' +
    'All conflicting transactions resolved deterministically via exponential backoff retries.',
    {
      x: 6.95, y: 5.6, w: 5.53, h: 0.9,
      fontFace: FONT_MONO, fontSize: 9.8, color: C.emerald, lineSpacingMultiple: 1.35,
    }
  );
}

// ============================================================================
// SLIDE 10: CONCLUSIONS & FUTURE DIRECTIONS (1 min)
// ============================================================================
{
  const s10 = pptx.addSlide();
  addSlideChrome(s10, '05 · Conclusions (1 Minute)', 'Key Contributions & Future Directions', 10);

  // Left Column: Main Outcomes & Contributions
  addCard(s10, { x: 0.6, y: 1.4, w: 5.9, h: 5.35, fill: C.card, border: C.border, topAccent: C.emerald });
  s10.addText('Main Outcomes & Contributions', {
    x: 0.85, y: 1.6, w: 5.4, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.text,
  });

  const outcomes = [
    {
      h: 'End-to-End Automated Forensics',
      d: 'Eliminates manual bottlenecks from messy CSV/UTXO ingestion to visual graph inspection and printable audit memorandums.',
    },
    {
      h: 'Research-Backed Tri-Pillar Engine',
      d: 'Combines Union-Find co-spending (Wu et al.), BlazingAML peel/cycle mining (Lin et al.), and distance decay (Chen et al.).',
    },
    {
      h: 'Cryptographic Compliance Settlement',
      d: 'Commits 32-byte Merkle roots via Optimistic STM (810+ TPS) with O(log N) client-side verify_proximity_proof().',
    },
  ];

  outcomes.forEach((o, i) => {
    const oy = 2.15 + i * 1.45;
    s10.addShape(pptx.ShapeType.roundRect, {
      x: 0.85, y: oy, w: 5.4, h: 1.25, rectRadius: 0.06,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s10.addText(`✓  ${o.h}`, {
      x: 1.05, y: oy + 0.14, w: 5.0, h: 0.3,
      fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: C.emerald,
    });
    s10.addText(o.d, {
      x: 1.05, y: oy + 0.48, w: 5.0, h: 0.68,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.18,
    });
  });

  // Right Column: Scope for Improvement / Future Work
  addCard(s10, { x: 6.83, y: 1.4, w: 5.9, h: 5.35, fill: C.card, border: C.border, topAccent: C.cyan });
  s10.addText('Scope for Improvement & Future Work', {
    x: 7.08, y: 1.6, w: 5.4, h: 0.4,
    fontFace: FONT_HEAD, fontSize: 17, bold: true, color: C.text,
  });

  const future = [
    {
      h: 'Live L2 Mainnet / Testnet Deployment',
      d: 'Compile ComplianceRegistry to Solidity / Move and integrate live RPC event indexing for real-time exchange screening.',
    },
    {
      h: 'Cross-Chain Bridge Forensics',
      d: 'Extend multi-hop tracing across heterogeneous chains (Bitcoin UTXO → Ethereum / Solana cross-bridge swaps).',
    },
    {
      h: 'Graph Neural Network (GNN) Fusion',
      d: 'Augment deterministic heuristics with temporal GNN anomaly classifiers to catch zero-day mixing protocols.',
    },
  ];

  future.forEach((f, i) => {
    const fy = 2.15 + i * 1.45;
    s10.addShape(pptx.ShapeType.roundRect, {
      x: 7.08, y: fy, w: 5.4, h: 1.25, rectRadius: 0.06,
      fill: { color: C.bg }, line: { color: C.border, width: 1 },
    });
    s10.addText(`→  ${f.h}`, {
      x: 7.28, y: fy + 0.14, w: 5.0, h: 0.3,
      fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: C.cyan,
    });
    s10.addText(f.d, {
      x: 7.28, y: fy + 0.48, w: 5.0, h: 0.68,
      fontFace: FONT_BODY, fontSize: 11, color: C.textMuted, lineSpacingMultiple: 1.18,
    });
  });
}

// ============================================================================
// SLIDE 11: REFERENCES
// ============================================================================
{
  const s11 = pptx.addSlide();
  addSlideChrome(s11, '06 · References', 'Academic References & Benchmark Datasets', 11);

  const refs = [
    {
      id: '[1]',
      title: 'Chen, Y., et al. (2025). A Graph-Based Approach to Blockchain Fraud Prevention.',
      meta: 'arXiv preprint arXiv:2505.24284  ·  https://arxiv.org/pdf/2505.24284',
      role: 'Basis for Pillar 3 exponential distance-decay scoring D(v, E) = max(0, 100 × 0.5^hops).',
      col: C.cyan,
    },
    {
      id: '[2]',
      title: 'Wu, J., et al. (2023). Towards Understanding Crypto Money Laundering in Web3: Heuristic Transaction Tracing and Empirical Analysis.',
      meta: 'arXiv preprint arXiv:2305.14748  ·  https://arxiv.org/pdf/2305.14748.pdf',
      role: 'Basis for Pillar 1 multi-input co-spending aggregation and change address heuristics.',
      col: C.emerald,
    },
    {
      id: '[3]',
      title: 'Lin, H., et al. (2026). BlazingAML: High-Throughput Anti-Money Laundering System via Graph Pattern Mining.',
      meta: 'arXiv preprint arXiv:2604.12241  ·  https://arxiv.org/pdf/2604.12241',
      role: 'Basis for Pillar 2 parallel peel-chain, directed cycle, and fan-in/fan-out hub mining.',
      col: C.purple,
    },
    {
      id: '[4]',
      title: 'Elliptic2 Open Dataset & UTXO Benchmark Traces',
      meta: 'Subgraph laundering topologies, peel chains, and darknet market seed benchmarks.',
      role: 'Used for validation, backtesting recall/precision, and pipeline ingestion testing.',
      col: C.amber,
    },
  ];

  refs.forEach((r, idx) => {
    const ry = 1.42 + idx * 1.32;
    addCard(s11, { x: 0.6, y: ry, w: 12.13, h: 1.15, fill: C.card, border: C.border });
    s11.addShape(pptx.ShapeType.roundRect, {
      x: 0.8, y: ry + 0.22, w: 0.62, h: 0.62, rectRadius: 0.06,
      fill: { color: C.bg }, line: { color: r.col, width: 1.5 },
    });
    s11.addText(r.id, {
      x: 0.8, y: ry + 0.22, w: 0.62, h: 0.62,
      fontFace: FONT_MONO, fontSize: 13, bold: true, color: r.col, align: 'center', valign: 'middle',
    });
    s11.addText(r.title, {
      x: 1.6, y: ry + 0.12, w: 10.9, h: 0.34,
      fontFace: FONT_HEAD, fontSize: 12.5, bold: true, color: C.text,
    });
    s11.addText(r.meta, {
      x: 1.6, y: ry + 0.46, w: 10.9, h: 0.28,
      fontFace: FONT_MONO, fontSize: 10, color: r.col,
    });
    s11.addText(r.role, {
      x: 1.6, y: ry + 0.76, w: 10.9, h: 0.28,
      fontFace: FONT_BODY, fontSize: 10.5, color: C.textMuted,
    });
  });
}

// ============================================================================
// SLIDE 12: EXTRA DEMO SLIDE (Only says Demo + Vercel App Link)
// ============================================================================
{
  const s12 = pptx.addSlide();
  s12.background = { color: C.bg };

  // Subtle decorative top & bottom cyan bars
  s12.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 13.333, h: 0.08,
    fill: { color: C.cyan }, line: { width: 0 },
  });
  s12.addShape(pptx.ShapeType.rect, {
    x: 0, y: 7.42, w: 13.333, h: 0.08,
    fill: { color: C.cyan }, line: { width: 0 },
  });

  // Centered Demo Card
  addCard(s12, { x: 2.16, y: 1.95, w: 9.0, h: 3.6, fill: C.card, border: C.cyan });

  s12.addText('Demo', {
    x: 2.16, y: 2.45, w: 9.0, h: 1.1,
    fontFace: FONT_HEAD, fontSize: 54, bold: true, color: C.text, align: 'center', valign: 'middle',
  });

  s12.addText('https://chainsink-forensics.vercel.app/', {
    x: 2.16, y: 3.85, w: 9.0, h: 0.8,
    fontFace: FONT_MONO, fontSize: 21, bold: true, color: C.cyan, align: 'center', valign: 'middle',
    hyperlink: { url: 'https://chainsink-forensics.vercel.app/' },
  });
}

// Write output files
const outPublicDir = path.resolve('public');
if (!fs.existsSync(outPublicDir)) {
  fs.mkdirSync(outPublicDir, { recursive: true });
}

const fileName = 'ChainSink_CSD436_Mohammad_Zaki.pptx';
const publicPath = path.join(outPublicDir, fileName);
const rootPath = path.resolve(fileName);
const artifactDir = '/.aistudio/artifacts/brain/15acbf96-c105-428f-a9a7-5d83f980f39d';

await pptx.writeFile({ fileName: publicPath });
fs.copyFileSync(publicPath, rootPath);

if (fs.existsSync(artifactDir)) {
  const artifactPath = path.join(artifactDir, fileName);
  fs.copyFileSync(publicPath, artifactPath);
  console.log(`- ${artifactPath}`);
}

console.log(`Generated PPTX successfully:\n- ${publicPath}\n- ${rootPath}`);
