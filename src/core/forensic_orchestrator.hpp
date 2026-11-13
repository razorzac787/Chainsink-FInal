#pragma once

#include "forensics_types.hpp"
#include "heuristic_analyzer.hpp"
#include "blazing_aml.hpp"
#include "multihop_engine.hpp"
#include "compliance_registry.hpp"
#include "ingestion_wizard.hpp"

#include <string>
#include <vector>
#include <unordered_map>
#include <set>

namespace chainsink {

struct ForensicPipelineRunResult {
    ForensicCaseMetadata metadata;
    std::vector<RawTransaction> transactions;
    std::vector<GraphNode> nodes;
    std::vector<GraphEdge> edges;
    ClusteringResult clustering;
    TopologyMiningResult topology;
    ProximityComputationResult proximity;
    ComplianceRegistryContract contract;
    std::pair<std::string, int> merkleSettlement;
    std::set<std::string> seedAddresses;
};

class ChainSinkForensicEngine {
public:
    ChainSinkForensicEngine();
    ForensicPipelineRunResult runPipeline(const std::vector<RawTransaction>& initialTransactions,
                                         const std::vector<GraphNode>& initialNodes,
                                         const std::vector<GraphEdge>& initialEdges,
                                         const std::set<std::string>& seedAddresses,
                                         const ForensicCaseMetadata& caseMetadata = {},
                                         const TopologyMiningOptions& options = {});
    ForensicPipelineRunResult loadPreset(const std::string& presetKey);
    ComplianceRegistryContract& getContract();

private:
    ComplianceRegistryContract contract;
};

} // namespace chainsink
