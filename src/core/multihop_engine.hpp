#pragma once

#include "forensics_types.hpp"
#include <map>
#include <string>
#include <vector>
#include <unordered_map>
#include <cmath>
#include <limits>

namespace chainsink {

struct ProximityComputationResult {
    std::vector<GraphNode> nodes;
    std::vector<GraphEdge> edges;
    std::unordered_map<std::string, EntityCluster> updatedClusters;
    struct Summary {
        int criticalSeedCount = 0;
        int highTaintCount = 0;
        int elevatedTransitCount = 0;
        int monitoredHopsCount = 0;
        int lowProximityCount = 0;
        int cleanCount = 0;
        int maxHopsObserved = 0;
    } summary;
};

double computeDistanceDecay(double hops);
RiskCategory getRiskCategory(double hops, double score);
ProximityComputationResult runPillar3ProximityScoring(const std::vector<GraphNode>& nodes,
                                                    const std::vector<GraphEdge>& edges,
                                                    const std::unordered_map<std::string, EntityCluster>& entityClusters,
                                                    const std::set<std::string>& seedAddressSet);

struct ShortestPathResult {
    std::vector<std::string> pathNodes;
    std::vector<GraphEdge> pathEdges;
    int totalHops = 0;
};

ShortestPathResult reconstructShortestPath(const std::string& targetAddress,
                                          const std::vector<GraphNode>& nodes,
                                          const std::vector<GraphEdge>& edges);

} // namespace chainsink
