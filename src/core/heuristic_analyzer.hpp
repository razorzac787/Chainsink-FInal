#pragma once

#include "forensics_types.hpp"
#include <string>
#include <vector>
#include <map>
#include <unordered_map>
#include <set>
#include <stdexcept>

namespace chainsink {

class DisjointSet {
public:
    std::unordered_map<std::string, std::string> parent;
    std::unordered_map<std::string, int> rank;

    std::string find(const std::string& item) {
        if (!parent.count(item)) {
            parent[item] = item;
            rank[item] = 0;
            return item;
        }
        const std::string current = parent[item];
        if (current != item) {
            const std::string root = find(current);
            parent[item] = root;
            return root;
        }
        return item;
    }

    void unite(const std::string& a, const std::string& b) {
        const std::string rootA = find(a);
        const std::string rootB = find(b);
        if (rootA == rootB) return;

        const int rankA = rank[rootA];
        const int rankB = rank[rootB];

        if (rankA < rankB) {
            parent[rootA] = rootB;
        } else if (rankA > rankB) {
            parent[rootB] = rootA;
        } else {
            parent[rootB] = rootA;
            rank[rootA] = rankA + 1;
        }
    }

    std::map<std::string, std::vector<std::string>> getGroups() {
        std::map<std::string, std::vector<std::string>> groups;
        for (const auto& [item, _] : parent) {
            const std::string root = find(item);
            groups[root].push_back(item);
        }
        return groups;
    }
};

struct ClusteringResult {
    std::unordered_map<std::string, std::string> addressToEntityMap;
    std::unordered_map<std::string, EntityCluster> entityClusters;
    std::set<std::string> identifiedChangeAddresses;
    int totalEntitiesCount = 0;
    int clusteredAddressesCount = 0;
    int multiInputGroupsCount = 0;
};

bool isRoundNumber(double num); 
ClusteringResult runPillar1HeuristicClustering(const std::vector<RawTransaction>& transactions,
                                              const std::set<std::string>& knownSeedAddresses = {});

} // namespace chainsink
