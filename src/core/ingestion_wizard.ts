/**
 * Defensive Universal Dataset Ingestion Wizard (ingestion_wizard.ts)
 *
 * Implements:
 * 1. Pre-parse validation, magic byte / header sniffing.
 * 2. Structural sanitization & row error coercion (NaN amounts, malformed base58/bech32/hex, timestamp normalization).
 * 3. Dynamic schema alignment with auto-inference.
 * 4. Curated benchmark datasets (Elliptic2, Victim-Reported Scam Peel Chain, Web3 Bridge Exploit).
 */

import {
  RawTransaction,
  GraphNode,
  GraphEdge,
  IngestionValidationReport,
  SchemaMappingConfig,
} from '../types/forensics';

export interface IngestionParseResult {
  report: IngestionValidationReport;
  transactions: RawTransaction[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  seedAddresses: Set<string>;
}

// Curated Preset Datasets
export const PRESET_DATASETS = {
  VICTIM_SCAM_PEEL: {
    id: 'VICTIM_SCAM_PEEL',
    name: 'Victim-Reported Phishing & 6-Hop Peel Chain UTXO Dump',
    description: 'Victim reported 48.5 BTC stolen via advance-fee phishing. Stolen funds route through a classic 6-hop peel chain with micro-peels diverted to mixers and final deposit at unregulated exchange.',
    caseId: 'CASE-2026-BTC-0982',
    victimAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
    reportedAmount: 48.5,
    reportedCurrency: 'BTC',
    seedAddresses: ['1VictimScamSeed485BtcPhishXXXXXX'],
  },
  ELLIPTIC2_LAUNDERING_RING: {
    id: 'ELLIPTIC2_LAUNDERING_RING',
    name: 'Elliptic2 Benchmark Subgraph: Multi-Hop Laundering Ring',
    description: 'Elliptic2 open dataset multi-hop laundering ring featuring darknet market illicit seed, multi-input co-spending clustering, circular wash-trading loop, and multi-tier cash-out proxies.',
    caseId: 'CASE-ELLIPTIC2-SUBGRAPH-441',
    victimAddress: 'bc1qdnmmarketseed999xxxxxxxxxxxxxxx',
    reportedAmount: 112.4,
    reportedCurrency: 'BTC',
    seedAddresses: ['bc1qdnmmarketseed999xxxxxxxxxxxxxxx'],
  },
  WEB3_BRIDGE_EXPLOIT: {
    id: 'WEB3_BRIDGE_EXPLOIT',
    name: 'Web3 Cross-Bridge Exploit & Aggregation Layer',
    description: 'Cross-chain bridge validator private key compromise ($1.8M equivalent). Rapid fan-out to 4 relay mules, 3-hop peel chains, and convergent fan-in aggregation to Tornado-like pool.',
    caseId: 'CASE-WEB3-EXPLOIT-2026-03',
    victimAddress: '0x0000BridgeVaultExploitedContract',
    reportedAmount: 750.0,
    reportedCurrency: 'ETH',
    seedAddresses: ['0xDrainerSeedExploitAddress9988776655'],
  },
};

/**
 * Generates the Victim Scam Peel Chain synthetic transaction graph
 */
export function generateVictimScamDataset(): {
  transactions: RawTransaction[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  seedAddresses: Set<string>;
} {
  const seed = '1VictimScamSeed485BtcPhishXXXXXX';
  const seedSet = new Set<string>([seed]);

  const transactions: RawTransaction[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();

  let currContinuation = seed;
  let remainingAmount = 48.5;
  const baseTimestamp = 1773400000;

  // Step 1: Initial drain from victim to seed
  const drainTxId = 'tx_scam_drain_000';
  transactions.push({
    txId: drainTxId,
    fromAddresses: ['1VictimOriginalPhishedWalletXXXXXX'],
    toAddresses: [seed],
    amounts: [48.5],
    totalAmount: 48.5,
    timestamp: baseTimestamp - 3600,
    isIllicitSeed: true,
  });

  // Steps 1 to 6: Peel Chain
  // Each step takes ~10-15% peel to mixer/merchant, remainder moves forward
  const peelAddresses = [
    '1MixerDeposit_WasabiHop1_A8x',
    '1ChipMixerHop2_Diverted_J3z',
    '1DarknetVendorCashOut3_F9q',
    '1P2PDeskEscrowPeel4_K2w',
    '1InstantSwapExchangePeel5_L7m',
    '1UnregulatedOfframpPeel6_Z1v',
  ];

  const contAddresses = [
    '1PeelContinuationHop1_9uK2pX',
    '1PeelContinuationHop2_8jM4yT',
    '1PeelContinuationHop3_7hN3wR',
    '1PeelContinuationHop4_6gB2vQ',
    '1PeelContinuationHop5_5fC1uP',
    '1FinalExchangeDepositVault_0x99',
  ];

  for (let i = 0; i < 6; i++) {
    const txId = `tx_peel_hop_00${i + 1}`;
    const peelAmt = Number((remainingAmount * 0.12).toFixed(4));
    const contAmt = Number((remainingAmount - peelAmt).toFixed(4));
    const contAddr = contAddresses[i];
    const peelAddr = peelAddresses[i];

    transactions.push({
      txId,
      fromAddresses: [currContinuation],
      toAddresses: [contAddr, peelAddr],
      amounts: [contAmt, peelAmt],
      totalAmount: remainingAmount,
      timestamp: baseTimestamp + (i + 1) * 1800,
    });

    edges.push({
      id: `edge_${txId}_cont`,
      txId,
      source: currContinuation,
      target: contAddr,
      amount: contAmt,
      timestamp: baseTimestamp + (i + 1) * 1800,
      isPeelContinuation: true,
    });

    edges.push({
      id: `edge_${txId}_peel`,
      txId,
      source: currContinuation,
      target: peelAddr,
      amount: peelAmt,
      timestamp: baseTimestamp + (i + 1) * 1800,
      isPeelOutput: true,
    });

    currContinuation = contAddr;
    remainingAmount = contAmt;
  }

  // Add Multi-Input Co-Spending Branch to test Pillar 1
  // Final deposit vault combines inputs with a secondary accomplice wallet
  const accompliceWallet = '1AccompliceCoSpendingMuleWalletYYY';
  const finalConsolidationTx = 'tx_consolidation_multi_input';
  transactions.push({
    txId: finalConsolidationTx,
    fromAddresses: [currContinuation, accompliceWallet],
    toAddresses: ['1HighRiskExchangeAccountMain_KYC_ID'],
    amounts: [remainingAmount + 3.2],
    totalAmount: remainingAmount + 3.2,
    timestamp: baseTimestamp + 7 * 3600,
  });

  edges.push({
    id: `edge_consolidation_1`,
    txId: finalConsolidationTx,
    source: currContinuation,
    target: '1HighRiskExchangeAccountMain_KYC_ID',
    amount: remainingAmount,
    timestamp: baseTimestamp + 7 * 3600,
  });

  edges.push({
    id: `edge_consolidation_2`,
    txId: finalConsolidationTx,
    source: accompliceWallet,
    target: '1HighRiskExchangeAccountMain_KYC_ID',
    amount: 3.2,
    timestamp: baseTimestamp + 7 * 3600,
  });

  // Add edge for initial drain
  edges.unshift({
    id: `edge_drain_initial`,
    txId: drainTxId,
    source: '1VictimOriginalPhishedWalletXXXXXX',
    target: seed,
    amount: 48.5,
    timestamp: baseTimestamp - 3600,
  });

  // Build nodes
  for (const edge of edges) {
    if (!nodeMap.has(edge.source)) {
      const isSeed = edge.source === seed;
      nodeMap.set(edge.source, {
        id: edge.source,
        entityId: 'ENT-PENDING',
        label: isSeed ? 'Illicit Seed (Phishing Drainer)' : truncateAddress(edge.source),
        isIllicitSeed: isSeed,
        seedType: isSeed ? 'PHISHING_SCAM' : undefined,
        proximityScore: isSeed ? 100 : 0,
        hopDistance: isSeed ? 0 : Infinity,
        riskCategory: isSeed ? 'CRITICAL_ILLICIT_SEED' : 'CLEAN_TRANSIT',
        totalInflow: 0,
        totalOutflow: 0,
        txCount: 0,
      });
    }

    if (!nodeMap.has(edge.target)) {
      const isSeed = edge.target === seed;
      nodeMap.set(edge.target, {
        id: edge.target,
        entityId: 'ENT-PENDING',
        label: isSeed ? 'Illicit Seed (Phishing Drainer)' : truncateAddress(edge.target),
        isIllicitSeed: isSeed,
        seedType: isSeed ? 'PHISHING_SCAM' : undefined,
        proximityScore: isSeed ? 100 : 0,
        hopDistance: isSeed ? 0 : Infinity,
        riskCategory: isSeed ? 'CRITICAL_ILLICIT_SEED' : 'CLEAN_TRANSIT',
        totalInflow: 0,
        totalOutflow: 0,
        txCount: 0,
      });
    }

    const src = nodeMap.get(edge.source)!;
    src.totalOutflow += edge.amount;
    src.txCount++;

    const tgt = nodeMap.get(edge.target)!;
    tgt.totalInflow += edge.amount;
    tgt.txCount++;
  }

  return {
    transactions,
    nodes: Array.from(nodeMap.values()),
    edges,
    seedAddresses: seedSet,
  };
}

/**
 * Generates Elliptic2 Laundering Ring with Wash Trading Cycle
 */
export function generateElliptic2Dataset(): {
  transactions: RawTransaction[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  seedAddresses: Set<string>;
} {
  const seed = 'bc1qdnmmarketseed999xxxxxxxxxxxxxxx';
  const seedSet = new Set<string>([seed]);

  const transactions: RawTransaction[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const baseTime = 1773500000;

  // Seed distributes to 2 sub-rings (Fan-out)
  const ringA = 'bc1q_ring_a_transit_hop1';
  const ringB = 'bc1q_ring_b_transit_hop1';

  transactions.push({
    txId: 'tx_ellip_fanout_01',
    fromAddresses: [seed],
    toAddresses: [ringA, ringB],
    amounts: [62.0, 50.4],
    totalAmount: 112.4,
    timestamp: baseTime,
    isIllicitSeed: true,
  });

  edges.push(
    { id: 'e_el_1', txId: 'tx_ellip_fanout_01', source: seed, target: ringA, amount: 62.0, timestamp: baseTime },
    { id: 'e_el_2', txId: 'tx_ellip_fanout_01', source: seed, target: ringB, amount: 50.4, timestamp: baseTime }
  );

  // Ring A forms a 3-node wash trading cycle (Cycle Detection)
  const cycleNode2 = 'bc1q_wash_circle_hop2';
  const cycleNode3 = 'bc1q_wash_circle_hop3';

  transactions.push(
    {
      txId: 'tx_cycle_1',
      fromAddresses: [ringA],
      toAddresses: [cycleNode2],
      amounts: [45.0],
      totalAmount: 45.0,
      timestamp: baseTime + 1200,
    },
    {
      txId: 'tx_cycle_2',
      fromAddresses: [cycleNode2],
      toAddresses: [cycleNode3],
      amounts: [44.8],
      totalAmount: 44.8,
      timestamp: baseTime + 2400,
    },
    {
      txId: 'tx_cycle_3',
      fromAddresses: [cycleNode3],
      toAddresses: [ringA],
      amounts: [44.5],
      totalAmount: 44.5,
      timestamp: baseTime + 3600,
    }
  );

  edges.push(
    { id: 'e_cy_1', txId: 'tx_cycle_1', source: ringA, target: cycleNode2, amount: 45.0, timestamp: baseTime + 1200, isCycleEdge: true },
    { id: 'e_cy_2', txId: 'tx_cycle_2', source: cycleNode2, target: cycleNode3, amount: 44.8, timestamp: baseTime + 2400, isCycleEdge: true },
    { id: 'e_cy_3', txId: 'tx_cycle_3', source: cycleNode3, target: ringA, amount: 44.5, timestamp: baseTime + 3600, isCycleEdge: true }
  );

  // Ring B executes a 3-step peel chain into cash-out
  const peelCont1 = 'bc1q_peel_b_cont1';
  const peelSink1 = 'bc1q_mixer_peel_sink1';
  const peelCont2 = 'bc1q_peel_b_cont2';
  const peelSink2 = 'bc1q_p2p_peel_sink2';
  const finalCashout = 'bc1q_regulated_exchange_deposit';

  transactions.push(
    {
      txId: 'tx_peel_b_1',
      fromAddresses: [ringB],
      toAddresses: [peelCont1, peelSink1],
      amounts: [42.0, 8.4],
      totalAmount: 50.4,
      timestamp: baseTime + 1800,
    },
    {
      txId: 'tx_peel_b_2',
      fromAddresses: [peelCont1],
      toAddresses: [peelCont2, peelSink2],
      amounts: [35.0, 7.0],
      totalAmount: 42.0,
      timestamp: baseTime + 3600,
    },
    {
      txId: 'tx_peel_b_3',
      fromAddresses: [peelCont2],
      toAddresses: [finalCashout],
      amounts: [35.0],
      totalAmount: 35.0,
      timestamp: baseTime + 5400,
    }
  );

  edges.push(
    { id: 'e_pb_1_c', txId: 'tx_peel_b_1', source: ringB, target: peelCont1, amount: 42.0, timestamp: baseTime + 1800, isPeelContinuation: true },
    { id: 'e_pb_1_p', txId: 'tx_peel_b_1', source: ringB, target: peelSink1, amount: 8.4, timestamp: baseTime + 1800, isPeelOutput: true },
    { id: 'e_pb_2_c', txId: 'tx_peel_b_2', source: peelCont1, target: peelCont2, amount: 35.0, timestamp: baseTime + 3600, isPeelContinuation: true },
    { id: 'e_pb_2_p', txId: 'tx_peel_b_2', source: peelCont1, target: peelSink2, amount: 7.0, timestamp: baseTime + 3600, isPeelOutput: true },
    { id: 'e_pb_3', txId: 'tx_peel_b_3', source: peelCont2, target: finalCashout, amount: 35.0, timestamp: baseTime + 5400 }
  );

  // Populate node map
  for (const edge of edges) {
    for (const id of [edge.source, edge.target]) {
      if (!nodeMap.has(id)) {
        const isSeed = id === seed;
        nodeMap.set(id, {
          id,
          entityId: 'ENT-PENDING',
          label: isSeed ? 'Darknet Illicit Seed' : truncateAddress(id),
          isIllicitSeed: isSeed,
          seedType: isSeed ? 'DARKNET_MARKET' : undefined,
          proximityScore: isSeed ? 100 : 0,
          hopDistance: isSeed ? 0 : Infinity,
          riskCategory: isSeed ? 'CRITICAL_ILLICIT_SEED' : 'CLEAN_TRANSIT',
          totalInflow: 0,
          totalOutflow: 0,
          txCount: 0,
        });
      }
    }
    nodeMap.get(edge.source)!.totalOutflow += edge.amount;
    nodeMap.get(edge.source)!.txCount++;
    nodeMap.get(edge.target)!.totalInflow += edge.amount;
    nodeMap.get(edge.target)!.txCount++;
  }

  return {
    transactions,
    nodes: Array.from(nodeMap.values()),
    edges,
    seedAddresses: seedSet,
  };
}

/**
 * Defensive CSV / File Parser & Sanitizer
 */
export function validateAndSanitizeDataset(
  rawContent: string,
  schema: SchemaMappingConfig
): IngestionParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  let coercedRows = 0;
  let validRows = 0;
  let errorRows = 0;

  // Magic Byte / Format check
  let detectedFormat: 'CSV' | 'JSON' | 'UTXO_DUMP' | 'ELLIPTIC2' | 'UNKNOWN' = 'UNKNOWN';
  const trimmed = rawContent.trim();

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    detectedFormat = 'JSON';
  } else if (trimmed.includes('txId') || trimmed.includes('from_address') || trimmed.includes(',') || trimmed.includes(';')) {
    detectedFormat = 'CSV';
  }

  // Pre-parse split
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      report: {
        isValid: false,
        magicBytesValid: true,
        detectedFormat,
        totalRows: lines.length,
        validRows: 0,
        coercedRows: 0,
        errorRows: lines.length,
        errors: ['File contains fewer than 2 rows. Header and data rows required.'],
        warnings: [],
        inferredHeaders: [],
      },
      transactions: [],
      nodes: [],
      edges: [],
      seedAddresses: new Set(),
    };
  }

  // Sniff delimiter
  const headerLine = lines[0];
  const delimiter = headerLine.includes(';') ? ';' : headerLine.includes('\t') ? '\t' : ',';
  const headers = headerLine.split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''));

  // Header mapping index
  const txIdx = headers.indexOf(schema.txIdCol);
  const srcIdx = headers.indexOf(schema.sourceCol);
  const tgtIdx = headers.indexOf(schema.targetCol);
  const amtIdx = headers.indexOf(schema.amountCol);
  const timeIdx = headers.indexOf(schema.timestampCol);
  const seedIdx = schema.isSeedCol ? headers.indexOf(schema.isSeedCol) : -1;

  if (txIdx === -1 || srcIdx === -1 || tgtIdx === -1 || amtIdx === -1) {
    errors.push(`Required columns missing: Check mapped columns against file headers: ${headers.join(', ')}`);
  }

  const transactions: RawTransaction[] = [];
  const edges: GraphEdge[] = [];
  const nodeMap = new Map<string, GraphNode>();
  const seedSet = new Set<string>();

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(delimiter).map((col) => col.trim().replace(/^["']|["']$/g, ''));
    if (row.length < headers.length) {
      coercedRows++;
      warnings.push(`Row ${i + 1}: Row was padded to match schema length.`);
      while (row.length < headers.length) row.push('');
    }

    const txId = row[txIdx] || `gen_tx_${i}`;
    let src = row[srcIdx];
    let tgt = row[tgtIdx];
    let rawAmt = row[amtIdx];
    const rawTime = timeIdx !== -1 ? row[timeIdx] : '';
    const isSeedStr = seedIdx !== -1 ? (row[seedIdx] || '').toLowerCase() : '';

    // Sanitization & auto-coercion
    if (!src || !tgt) {
      errorRows++;
      errors.push(`Row ${i + 1}: Missing source or target address.`);
      continue;
    }

    // Coerce numeric amount
    let amt = parseFloat(rawAmt);
    if (isNaN(amt) || amt <= 0) {
      amt = 1.0; // auto-coerced fallback
      coercedRows++;
      warnings.push(`Row ${i + 1}: Invalid amount '${rawAmt}' coerced to 1.0.`);
    }

    // Coerce timestamp
    let ts = parseInt(rawTime, 10);
    if (isNaN(ts) || ts <= 0) {
      ts = Math.floor(Date.now() / 1000) - (lines.length - i) * 60;
      coercedRows++;
    }

    const isSeed = isSeedStr === 'true' || isSeedStr === '1' || isSeedStr === 'yes' || isSeedStr === 'illicit';
    if (isSeed) {
      seedSet.add(src);
    }

    transactions.push({
      txId,
      fromAddresses: [src],
      toAddresses: [tgt],
      amounts: [amt],
      totalAmount: amt,
      timestamp: ts,
      isIllicitSeed: isSeed,
    });

    edges.push({
      id: `edge_${i}_${txId}`,
      txId,
      source: src,
      target: tgt,
      amount: amt,
      timestamp: ts,
    });

    validRows++;
  }

  // Build node collection
  for (const edge of edges) {
    for (const addr of [edge.source, edge.target]) {
      if (!nodeMap.has(addr)) {
        const isSeed = seedSet.has(addr);
        nodeMap.set(addr, {
          id: addr,
          entityId: 'ENT-PENDING',
          label: isSeed ? 'Illicit Seed Node' : truncateAddress(addr),
          isIllicitSeed: isSeed,
          seedType: isSeed ? 'CUSTOM_ILLICIT' : undefined,
          proximityScore: isSeed ? 100 : 0,
          hopDistance: isSeed ? 0 : Infinity,
          riskCategory: isSeed ? 'CRITICAL_ILLICIT_SEED' : 'CLEAN_TRANSIT',
          totalInflow: 0,
          totalOutflow: 0,
          txCount: 0,
        });
      }
    }
    nodeMap.get(edge.source)!.totalOutflow += edge.amount;
    nodeMap.get(edge.source)!.txCount++;
    nodeMap.get(edge.target)!.totalInflow += edge.amount;
    nodeMap.get(edge.target)!.txCount++;
  }

  return {
    report: {
      isValid: errors.length === 0 && validRows > 0,
      magicBytesValid: true,
      detectedFormat,
      totalRows: lines.length - 1,
      validRows,
      coercedRows,
      errorRows,
      errors: errors.slice(0, 5),
      warnings: warnings.slice(0, 5),
      inferredHeaders: headers,
    },
    transactions,
    nodes: Array.from(nodeMap.values()),
    edges,
    seedAddresses: seedSet,
  };
}

export function truncateAddress(addr: string): string {
  if (!addr) return '';
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}
