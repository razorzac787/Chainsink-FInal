#include "ingestion_wizard.hpp"

#include <algorithm>
#include <cctype>
#include <sstream>
#include <unordered_map>

namespace chainsink {

std::string truncateAddress(const std::string& addr) {
    if (addr.empty()) return "";
    if (addr.size() <= 14) return addr;
    return addr.substr(0, 6) + "..." + addr.substr(addr.size() - 4);
}

DatasetBundle generateVictimScamDataset() {
    DatasetBundle result;
    const std::string seed = "1VictimScamSeed485BtcPhishXXXXXX";
    result.seedAddresses.insert(seed);

    std::vector<RawTransaction> txs;
    std::vector<GraphEdge> edges;
    std::unordered_map<std::string, GraphNode> nodeMap;

    long long baseTimestamp = 1773400000;
    std::string currContinuation = seed;
    double remainingAmount = 48.5;

    const std::string drainTxId = "tx_scam_drain_000";
    txs.push_back({drainTxId, {"1VictimOriginalPhishedWalletXXXXXX"}, {seed}, {48.5}, 48.5, baseTimestamp - 3600, 0, true});
    edges.push_back({"edge_drain_initial", drainTxId, "1VictimOriginalPhishedWalletXXXXXX", seed, 48.5, baseTimestamp - 3600});

    std::vector<std::string> peelAddresses = {
        "1MixerDeposit_WasabiHop1_A8x",
        "1ChipMixerHop2_Diverted_J3z",
        "1DarknetVendorCashOut3_F9q",
        "1P2PDeskEscrowPeel4_K2w",
        "1InstantSwapExchangePeel5_L7m",
        "1UnregulatedOfframpPeel6_Z1v"
    };

    std::vector<std::string> contAddresses = {
        "1PeelContinuationHop1_9uK2pX",
        "1PeelContinuationHop2_8jM4yT",
        "1PeelContinuationHop3_7hN3wR",
        "1PeelContinuationHop4_6gB2vQ",
        "1PeelContinuationHop5_5fC1uP",
        "1FinalExchangeDepositVault_0x99"
    };

    for (int i = 0; i < 6; ++i) {
        const std::string txId = "tx_peel_hop_00" + std::to_string(i + 1);
        const double peelAmt = std::round((remainingAmount * 0.12) * 10000.0) / 10000.0;
        const double contAmt = std::round((remainingAmount - peelAmt) * 10000.0) / 10000.0;
        const std::string contAddr = contAddresses[i];
        const std::string peelAddr = peelAddresses[i];

        txs.push_back({txId, {currContinuation}, {contAddr, peelAddr}, {contAmt, peelAmt}, remainingAmount, baseTimestamp + (i + 1) * 1800, 0, false});
        edges.push_back({"edge_" + txId + "_cont", txId, currContinuation, contAddr, contAmt, baseTimestamp + (i + 1) * 1800, false, true, false, false});
        edges.push_back({"edge_" + txId + "_peel", txId, currContinuation, peelAddr, peelAmt, baseTimestamp + (i + 1) * 1800, true, false, false, false});
        currContinuation = contAddr;
        remainingAmount = contAmt;
    }

    const std::string accompliceWallet = "1AccompliceCoSpendingMuleWalletYYY";
    const std::string finalTxId = "tx_consolidation_multi_input";
    txs.push_back({finalTxId, {currContinuation, accompliceWallet}, {"1HighRiskExchangeAccountMain_KYC_ID"}, {remainingAmount + 3.2}, remainingAmount + 3.2, baseTimestamp + 7 * 3600, 0, false});
    edges.push_back({"edge_consolidation_1", finalTxId, currContinuation, "1HighRiskExchangeAccountMain_KYC_ID", remainingAmount, baseTimestamp + 7 * 3600});
    edges.push_back({"edge_consolidation_2", finalTxId, accompliceWallet, "1HighRiskExchangeAccountMain_KYC_ID", 3.2, baseTimestamp + 7 * 3600});

    for (const auto& e : edges) {
        if (!nodeMap.count(e.source)) {
            GraphNode n;
            n.id = e.source;
            n.entityId = "ENT-PENDING";
            n.label = e.source == seed ? "Illicit Seed (Phishing Drainer)" : truncateAddress(e.source);
            n.isIllicitSeed = e.source == seed;
            n.proximityScore = e.source == seed ? 100.0 : 0.0;
            n.hopDistance = e.source == seed ? 0.0 : std::numeric_limits<double>::infinity();
            n.riskCategory = e.source == seed ? RiskCategory::CRITICAL_ILLICIT_SEED : RiskCategory::CLEAN_TRANSIT;
            nodeMap[e.source] = n;
        }
        if (!nodeMap.count(e.target)) {
            GraphNode n;
            n.id = e.target;
            n.entityId = "ENT-PENDING";
            n.label = e.target == seed ? "Illicit Seed (Phishing Drainer)" : truncateAddress(e.target);
            n.isIllicitSeed = e.target == seed;
            n.proximityScore = e.target == seed ? 100.0 : 0.0;
            n.hopDistance = e.target == seed ? 0.0 : std::numeric_limits<double>::infinity();
            n.riskCategory = e.target == seed ? RiskCategory::CRITICAL_ILLICIT_SEED : RiskCategory::CLEAN_TRANSIT;
            nodeMap[e.target] = n;
        }
        nodeMap[e.source].totalOutflow += e.amount; nodeMap[e.source].txCount++;
        nodeMap[e.target].totalInflow += e.amount; nodeMap[e.target].txCount++;
    }

    result.transactions = txs;
    result.nodes = std::vector<GraphNode>(nodeMap.begin()->second != nodeMap.begin()->second ? std::vector<GraphNode>() : std::vector<GraphNode>());
    for (auto& kv : nodeMap) result.nodes.push_back(kv.second);
    result.edges = edges;
    return result;
}

DatasetBundle generateElliptic2Dataset() {
    DatasetBundle result;
    const std::string seed = "bc1qdnmmarketseed999xxxxxxxxxxxxxxx";
    result.seedAddresses.insert(seed);

    std::vector<RawTransaction> txs;
    std::vector<GraphEdge> edges;
    const long long baseTime = 1773500000;
    const std::string ringA = "bc1q_ring_a_transit_hop1";
    const std::string ringB = "bc1q_ring_b_transit_hop1";
    txs.push_back({"tx_ellip_fanout_01", {seed}, {ringA, ringB}, {62.0, 50.4}, 112.4, baseTime, 0, true});
    edges.push_back({"e_el_1", "tx_ellip_fanout_01", seed, ringA, 62.0, baseTime});
    edges.push_back({"e_el_2", "tx_ellip_fanout_01", seed, ringB, 50.4, baseTime});

    const std::string cycleNode2 = "bc1q_wash_circle_hop2";
    const std::string cycleNode3 = "bc1q_wash_circle_hop3";
    txs.push_back({"tx_cycle_1", {ringA}, {cycleNode2}, {45.0}, 45.0, baseTime + 1200, 0, false});
    txs.push_back({"tx_cycle_2", {cycleNode2}, {cycleNode3}, {44.8}, 44.8, baseTime + 2400, 0, false});
    txs.push_back({"tx_cycle_3", {cycleNode3}, {ringA}, {44.5}, 44.5, baseTime + 3600, 0, false});
    edges.push_back({"e_cy_1", "tx_cycle_1", ringA, cycleNode2, 45.0, baseTime + 1200, false, false, true, false});
    edges.push_back({"e_cy_2", "tx_cycle_2", cycleNode2, cycleNode3, 44.8, baseTime + 2400, false, false, true, false});
    edges.push_back({"e_cy_3", "tx_cycle_3", cycleNode3, ringA, 44.5, baseTime + 3600, false, false, true, false});

    const std::string peelCont1 = "bc1q_peel_b_cont1";
    const std::string peelSink1 = "bc1q_mixer_peel_sink1";
    const std::string peelCont2 = "bc1q_peel_b_cont2";
    const std::string peelSink2 = "bc1q_p2p_peel_sink2";
    const std::string finalCashout = "bc1q_regulated_exchange_deposit";
    txs.push_back({"tx_peel_b_1", {ringB}, {peelCont1, peelSink1}, {42.0, 8.4}, 50.4, baseTime + 1800, 0, false});
    txs.push_back({"tx_peel_b_2", {peelCont1}, {peelCont2, peelSink2}, {35.0, 7.0}, 42.0, baseTime + 3600, 0, false});
    txs.push_back({"tx_peel_b_3", {peelCont2}, {finalCashout}, {35.0}, 35.0, baseTime + 5400, 0, false});
    edges.push_back({"e_pb_1_c", "tx_peel_b_1", ringB, peelCont1, 42.0, baseTime + 1800, false, true, false, false});
    edges.push_back({"e_pb_1_p", "tx_peel_b_1", ringB, peelSink1, 8.4, baseTime + 1800, true, false, false, false});
    edges.push_back({"e_pb_2_c", "tx_peel_b_2", peelCont1, peelCont2, 35.0, baseTime + 3600, false, true, false, false});
    edges.push_back({"e_pb_2_p", "tx_peel_b_2", peelCont1, peelSink2, 7.0, baseTime + 3600, true, false, false, false});
    edges.push_back({"e_pb_3", "tx_peel_b_3", peelCont2, finalCashout, 35.0, baseTime + 5400});

    std::unordered_map<std::string, GraphNode> nodeMap;
    for (const auto& e : edges) {
        if (!nodeMap.count(e.source)) {
            GraphNode n; n.id = e.source; n.entityId = "ENT-PENDING"; n.label = e.source == seed ? "Darknet Illicit Seed" : truncateAddress(e.source); n.isIllicitSeed = e.source == seed; n.proximityScore = e.source == seed ? 100.0 : 0.0; n.hopDistance = e.source == seed ? 0.0 : std::numeric_limits<double>::infinity(); n.riskCategory = e.source == seed ? RiskCategory::CRITICAL_ILLICIT_SEED : RiskCategory::CLEAN_TRANSIT; nodeMap[e.source] = n;
        }
        if (!nodeMap.count(e.target)) {
            GraphNode n; n.id = e.target; n.entityId = "ENT-PENDING"; n.label = e.target == seed ? "Darknet Illicit Seed" : truncateAddress(e.target); n.isIllicitSeed = e.target == seed; n.proximityScore = e.target == seed ? 100.0 : 0.0; n.hopDistance = e.target == seed ? 0.0 : std::numeric_limits<double>::infinity(); n.riskCategory = e.target == seed ? RiskCategory::CRITICAL_ILLICIT_SEED : RiskCategory::CLEAN_TRANSIT; nodeMap[e.target] = n;
        }
        nodeMap[e.source].totalOutflow += e.amount; nodeMap[e.source].txCount++;
        nodeMap[e.target].totalInflow += e.amount; nodeMap[e.target].txCount++;
    }

    result.transactions = txs;
    for (auto& kv : nodeMap) result.nodes.push_back(kv.second);
    result.edges = edges;
    return result;
}

IngestionValidationReport validateAndSanitizeDataset(const std::string& rawContent, const SchemaMappingConfig& schema) {
    IngestionValidationReport report;
    std::vector<std::string> lines;
    std::stringstream ss(rawContent);
    std::string line;
    while (std::getline(ss, line)) {
        if (!line.empty()) lines.push_back(line);
    }
    if (lines.size() < 2) {
        report.isValid = false;
        report.totalRows = static_cast<int>(lines.size());
        report.errorRows = static_cast<int>(lines.size());
        report.errors.push_back("File contains fewer than 2 rows.");
        return report;
    }
    std::string delimiter = ",";
    if (lines[0].find(';') != std::string::npos) delimiter = ";";
    else if (lines[0].find('\t') != std::string::npos) delimiter = "\t";

    std::vector<std::string> headerTokens;
    std::stringstream hs(lines[0]);
    std::string tok;
    while (std::getline(hs, tok, delimiter[0])) headerTokens.push_back(tok);
    report.inferredHeaders = headerTokens;

    int validRows = 0;
    int errorRows = 0;
    int coercedRows = 0;
    for (std::size_t i = 1; i < lines.size(); ++i) {
        std::vector<std::string> rowTokens;
        std::stringstream rs(lines[i]);
        while (std::getline(rs, tok, delimiter[0])) rowTokens.push_back(tok);
        if (rowTokens.size() < headerTokens.size()) {
            coercedRows++;
            while (rowTokens.size() < headerTokens.size()) rowTokens.push_back("");
        }
        validRows++;
    }

    report.isValid = true;
    report.magicBytesValid = true;
    report.detectedFormat = "CSV";
    report.totalRows = static_cast<int>(lines.size() - 1);
    report.validRows = validRows;
    report.coercedRows = coercedRows;
    report.errorRows = errorRows;
    return report;
}

} // namespace chainsink
