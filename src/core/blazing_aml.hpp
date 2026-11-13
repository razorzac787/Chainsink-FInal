#pragma once

#include "forensics_types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <set>
#include <optional>

namespace chainsink {

struct TopologyMiningOptions {
    int minPeelChainLength = 2;
    int maxCycleLength = 6;
    int fanInThreshold = 3;
    int fanOutThreshold = 3;
    bool isParallelMode = true;
    int workerCount = 4;
};

TopologyMiningResult runBlazingAMLTopologyMining(const std::vector<RawTransaction>& transactions,
                                                const std::vector<GraphEdge>& edges,
                                                const TopologyMiningOptions& options = {});

} // namespace chainsink
