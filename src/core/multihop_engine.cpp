#include "multihop_engine.hpp"

#include <algorithm>
#include <queue>
#include <unordered_map>
#include <set>

namespace chainsink {

double computeDistanceDecay(double hops) {
    if (hops < 0.0 || !std::isfinite(hops)) return 0.0;
    const double score = 100.0 * std::pow(0.5, hops);
    return std::max(0.0, std::min(100.0, score));
}

RiskCategory getRiskCategory(double hops, double score) {
    if (hops == 0.0) return RiskCategory::CRITICAL_ILLICIT_SEED;
    if (hops == 1.0) return RiskCategory::HIGH_TAINT_PROXIMAL;
    if (hops == 2.0) return RiskCategory::ELEVATED_RISK_TRANSIT;
    if (hops == 3.0) return RiskCategory::MONITORED_HOPS;
    if (hops >= 4.0 && std::isfinite(hops)) return RiskCategory::LOW_PROXIMITY;
    return RiskCategory::CLEAN_TRANSIT;
}

ProximityComputationResult runPillar3ProximityScoring(const std::vector<GraphNode>& nodes,
                                                    const std::vector<GraphEdge>& edges,
                                                    const std::unordered_map<std::string, EntityCluster>& entityClusters,
                                                    const std::set<std::string>& seedAddressSet) {
    std::unordered_map<std::string, std::vector<GraphEdge>> outgoingAdj;
    for (const auto& edge : edges) {
        outgoingAdj[edge.source].push_back(edge);
    }

    std::unordered_map<std::string, double> distanceMap;
    std::unordered_map<std::string, std::string> nearestSeedMap;
    std::unordered_map<std::string, std::string> predecessorMap;
    std::queue<std::string> queue;

    for (const auto& node : nodes) {
        if (node.isIllicitSeed || seedAddressSet.count(node.id)) {
            distanceMap[node.id] = 0.0;
            nearestSeedMap[node.id] = node.id;
            queue.push(node.id);
        } else {
            distanceMap[node.id] = std::numeric_limits<double>::infinity();
        }
    }

    while (!queue.empty()) {
        const std::string curr = queue.front(); queue.pop();
        const double currDist = distanceMap[curr];
        const std::string seed = nearestSeedMap[curr];
        for (const auto& edge : outgoingAdj[curr]) {
            const std::string neighbor = edge.target;
            const double neighborDist = distanceMap.count(neighbor) ? distanceMap[neighbor] : std::numeric_limits<double>::infinity();
            if (currDist + 1.0 < neighborDist) {
                distanceMap[neighbor] = currDist + 1.0;
                nearestSeedMap[neighbor] = seed;
                predecessorMap[neighbor] = curr;
                queue.push(neighbor);
            }
        }
    }

    std::vector<GraphNode> updatedNodes;
    updatedNodes.reserve(nodes.size());
    int criticalCount = 0, highTaintCount = 0, elevatedCount = 0, monitoredCount = 0, lowProxCount = 0, cleanCount = 0, maxHops = 0;
    for (const auto& node : nodes) {
        const double hops = distanceMap.count(node.id) ? distanceMap[node.id] : std::numeric_limits<double>::infinity();
        const double score = computeDistanceDecay(hops);
        const RiskCategory category = getRiskCategory(hops, score);
        const std::string nearestSeed = nearestSeedMap.count(node.id) ? nearestSeedMap[node.id] : "";
        if (std::isfinite(hops) && hops > maxHops) maxHops = static_cast<int>(hops);

        switch (category) {
            case RiskCategory::CRITICAL_ILLICIT_SEED: criticalCount++; break;
            case RiskCategory::HIGH_TAINT_PROXIMAL: highTaintCount++; break;
            case RiskCategory::ELEVATED_RISK_TRANSIT: elevatedCount++; break;
            case RiskCategory::MONITORED_HOPS: monitoredCount++; break;
            case RiskCategory::LOW_PROXIMITY: lowProxCount++; break;
            default: cleanCount++; break;
        }

        GraphNode n = node;
        n.hopDistance = hops;
        n.proximityScore = score;
        n.riskCategory = category;
        n.nearestSeedId = nearestSeed;
        updatedNodes.push_back(n);
    }

    std::unordered_map<std::string, EntityCluster> updatedClusters;
    for (const auto& [entId, cluster] : entityClusters) {
        double minClusterHops = std::numeric_limits<double>::infinity();
        double maxClusterScore = 0.0;
        RiskCategory clusterRisk = RiskCategory::CLEAN_TRANSIT;
        for (const auto& addr : cluster.addresses) {
            const double hops = distanceMap.count(addr) ? distanceMap[addr] : std::numeric_limits<double>::infinity();
            const double score = computeDistanceDecay(hops);
            if (hops < minClusterHops) {
                minClusterHops = hops;
                maxClusterScore = score;
                clusterRisk = getRiskCategory(hops, score);
            }
        }

        EntityCluster c = cluster;
        c.hopDistance = minClusterHops;
        c.proximityScore = maxClusterScore;
        c.riskCategory = clusterRisk;
        c.isIllicitSeed = minClusterHops == 0.0;
        updatedClusters[entId] = c;
    }

    return {updatedNodes, edges, updatedClusters, {criticalCount, highTaintCount, elevatedCount, monitoredCount, lowProxCount, cleanCount, maxHops}};
}

ShortestPathResult reconstructShortestPath(const std::string& targetAddress,
                                          const std::vector<GraphNode>& nodes,
                                          const std::vector<GraphEdge>& edges) {
    std::unordered_map<std::string, GraphNode> nodeMap;
    for (const auto& n : nodes) nodeMap[n.id] = n;

    const auto it = nodeMap.find(targetAddress);
    if (it == nodeMap.end()) {
        return {{targetAddress}, {}, 0};
    }
    if (!std::isfinite(it->second.hopDistance) || it->second.hopDistance == 0.0) {
        return {{targetAddress}, {}, 0};
    }

    std::unordered_map<std::string, std::vector<GraphEdge>> incomingAdj;
    for (const auto& edge : edges) {
        incomingAdj[edge.target].push_back(edge);
    }

    std::vector<std::string> pathNodes = {targetAddress};
    std::vector<GraphEdge> pathEdges;
    std::string curr = targetAddress;
    while (true) {
        const auto currIt = nodeMap.find(curr);
        if (currIt == nodeMap.end() || currIt->second.hopDistance == 0.0) break;
        const auto& inEdges = incomingAdj[curr];
        GraphEdge predEdge{};
        bool found = false;
        for (const auto& e : inEdges) {
            const auto srcIt = nodeMap.find(e.source);
            if (srcIt != nodeMap.end() && srcIt->second.hopDistance == currIt->second.hopDistance - 1.0) {
                predEdge = e;
                found = true;
                break;
            }
        }
        if (!found) break;
        pathEdges.insert(pathEdges.begin(), predEdge);
        pathNodes.insert(pathNodes.begin(), predEdge.source);
        curr = predEdge.source;
    }
    return {pathNodes, pathEdges, static_cast<int>(pathEdges.size())};
}

} // namespace chainsink
