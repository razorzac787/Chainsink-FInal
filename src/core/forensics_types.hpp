#pragma once

#include <string>
#include <vector>
#include <unordered_map>
#include <set>
#include <map>
#include <optional>

namespace chainsink {

enum class RiskCategory {
    CRITICAL_ILLICIT_SEED,
    HIGH_TAINT_PROXIMAL,
    ELEVATED_RISK_TRANSIT,
    MONITORED_HOPS,
    LOW_PROXIMITY,
    CLEAN_TRANSIT
};

struct RawTransaction {
    std::string txId;
    std::vector<std::string> fromAddresses;
    std::vector<std::string> toAddresses;
    std::vector<double> amounts;
    double totalAmount = 0.0;
    long long timestamp = 0;
    int blockNumber = 0;
    bool isIllicitSeed = false;
};

struct GraphEdge {
    std::string id;
    std::string txId;
    std::string source;
    std::string target;
    double amount = 0.0;
    long long timestamp = 0;
    bool isPeelOutput = false;
    bool isPeelContinuation = false;
    bool isCycleEdge = false;
    bool isShortestPathToSeed = false;
};

struct GraphNode {
    std::string id;
    std::string entityId;
    std::string label;
    bool isIllicitSeed = false;
    std::string seedType;
    double proximityScore = 0.0;
    double hopDistance = std::numeric_limits<double>::infinity();
    RiskCategory riskCategory = RiskCategory::CLEAN_TRANSIT;
    std::string nearestSeedId;
    double totalInflow = 0.0;
    double totalOutflow = 0.0;
    int txCount = 0;
    bool isChangeAddress = false;
};

struct EntityCluster {
    std::string entityId;
    std::vector<std::string> addresses;
    std::string primaryAddress;
    std::vector<std::string> heuristicsTriggered;
    double totalVolume = 0.0;
    RiskCategory riskCategory = RiskCategory::CLEAN_TRANSIT;
    double proximityScore = 0.0;
    double hopDistance = std::numeric_limits<double>::infinity();
    bool isIllicitSeed = false;
};

struct PeelChainStep {
    int stepIndex = 0;
    std::string txId;
    std::string inputAddress;
    std::string continuationAddress;
    std::string peelAddress;
    double continuationAmount = 0.0;
    double peelAmount = 0.0;
    double peelRatio = 0.0;
    long long timestamp = 0;
};

struct PeelChain {
    std::string id;
    std::string startNode;
    std::string endNode;
    int totalHops = 0;
    double totalVolume = 0.0;
    double divertedVolume = 0.0;
    std::vector<PeelChainStep> steps;
};

struct TransactionCycle {
    std::string id;
    std::vector<std::string> nodes;
    std::vector<std::string> edges;
    int cycleLength = 0;
    double totalVolume = 0.0;
    bool isWashTradingCandidate = false;
};

struct TopologyMiningResult {
    std::vector<PeelChain> peelChains;
    std::vector<TransactionCycle> cycles;
    std::vector<std::pair<std::string, int>> fanInHubs;
    std::vector<std::pair<std::string, int>> fanOutHubs;
    double executionTimeMs = 0.0;
    int edgesProcessed = 0;
    double parallelSpeedupFactor = 1.0;
};

struct MerkleProofStep {
    std::string position; // left / right
    std::string hash;
};

struct EntityComplianceRecord {
    std::string entityId;
    std::string primaryAddress;
    RiskCategory riskCategory = RiskCategory::CLEAN_TRANSIT;
    double proximityScore = 0.0;
    double hopDistance = 0.0;
    bool isIllicitSeed = false;
    std::string leafHash;
    std::vector<MerkleProofStep> merkleProof;
    long long timestamp = 0;
    std::string txHash;
};

struct STMTransactionResult {
    std::string txId;
    std::string status; // COMMITTED, ABORTED_RETRY, FAILED
    int retries = 0;
    double executionTimeMs = 0.0;
    std::string conflictKey;
    int readVersion = -1;
    int committedVersion = -1;
};

struct STMContentionBenchmark {
    int workerCount = 0;
    int totalTransactions = 0;
    int committedCount = 0;
    int abortedRetries = 0;
    double throughputTps = 0.0;
    double avgLatencyMs = 0.0;
    double conflictRate = 0.0;
};

struct IngestionValidationReport {
    bool isValid = false;
    bool magicBytesValid = true;
    std::string detectedFormat = "CSV";
    int totalRows = 0;
    int validRows = 0;
    int coercedRows = 0;
    int errorRows = 0;
    std::vector<std::string> errors;
    std::vector<std::string> warnings;
    std::vector<std::string> inferredHeaders;
};

struct SchemaMappingConfig {
    std::string txIdCol;
    std::string sourceCol;
    std::string targetCol;
    std::string amountCol;
    std::string timestampCol;
    std::string isSeedCol;
    std::string seedTypeCol;
};

struct ForensicCaseMetadata {
    std::string caseId;
    std::string caseName;
    std::string victimAddress;
    double reportedAmount = 0.0;
    std::string reportedCurrency = "BTC";
    std::string investigator = "ChainSink Certified Forensics Agent";
    std::string dateCreated;
    std::string status = "MERKLE_SETTLED";
};

} // namespace chainsink
