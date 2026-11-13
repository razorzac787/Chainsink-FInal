#include "heuristic_analyzer.hpp"

#include <cmath>
#include <utility>

namespace chainsink {

bool isRoundNumber(double num) {
    if (num <= 0.0) return false;
    const std::string s = std::to_string(num);
    if (s.find('.') == std::string::npos) return true;
    const std::string decimals = s.substr(s.find('.') + 1);
    return decimals.size() <= 2;
}

ClusteringResult runPillar1HeuristicClustering(const std::vector<RawTransaction>& transactions,
                                              const std::set<std::string>& knownSeedAddresses) {
    DisjointSet dsu;
    std::unordered_map<std::string, double> addressVolumeMap;
    std::unordered_map<std::string, int> addressTxCountMap;
    std::set<std::string> identifiedChangeAddresses;

    for (const auto& tx : transactions) {
        if (tx.fromAddresses.size() > 1) {
            const std::string firstInput = tx.fromAddresses.front();
            for (std::size_t i = 1; i < tx.fromAddresses.size(); ++i) {
                dsu.unite(firstInput, tx.fromAddresses[i]);
            }
        } else if (!tx.fromAddresses.empty()) {
            dsu.find(tx.fromAddresses.front());
        }

        for (const auto& toAddr : tx.toAddresses) {
            dsu.find(toAddr);
        }

        if (tx.toAddresses.size() == 2 && tx.amounts.size() == 2) {
            const double amt1 = tx.amounts[0];
            const double amt2 = tx.amounts[1];
            const bool isAmt1Round = isRoundNumber(amt1);
            const bool isAmt2Round = isRoundNumber(amt2);

            if (isAmt1Round && !isAmt2Round) {
                identifiedChangeAddresses.insert(tx.toAddresses[1]);
            } else if (!isAmt1Round && isAmt2Round) {
                identifiedChangeAddresses.insert(tx.toAddresses[0]);
            }
        }

        for (const auto& fromAddr : tx.fromAddresses) {
            addressVolumeMap[fromAddr] += tx.totalAmount;
            addressTxCountMap[fromAddr] += 1;
        }
        for (std::size_t i = 0; i < tx.toAddresses.size(); ++i) {
            addressVolumeMap[tx.toAddresses[i]] += tx.amounts.empty() ? 0.0 : tx.amounts[i];
            addressTxCountMap[tx.toAddresses[i]] += 1;
        }
    }

    const auto groups = dsu.getGroups();
    ClusteringResult result;
    int entityCounter = 1;
    int multiInputGroupsCount = 0;

    for (const auto& [_, addressList] : groups) {
        const std::string entityId = "ENT-" + std::to_string(entityCounter++);
        bool isIllicit = false;
        double totalClusterVol = 0.0;
        std::vector<std::string> heuristics;

        if (addressList.size() > 1) {
            heuristics.push_back("MULTI_INPUT_COSPENDING");
            multiInputGroupsCount++;
        }

        bool hasChange = false;
        for (const auto& addr : addressList) {
            if (identifiedChangeAddresses.count(addr)) {
                hasChange = true;
                break;
            }
        }
        if (hasChange) {
            heuristics.push_back("CHANGE_ADDRESS_REUSE");
        }

        std::string primaryAddress = addressList.front();
        double maxVolume = -1.0;
        for (const auto& addr : addressList) {
            result.addressToEntityMap[addr] = entityId;
            const double vol = addressVolumeMap.count(addr) ? addressVolumeMap[addr] : 0.0;
            totalClusterVol += vol;

            if (knownSeedAddresses.count(addr)) {
                isIllicit = true;
                primaryAddress = addr;
                if (std::find(heuristics.begin(), heuristics.end(), "DIRECT_SEED") == heuristics.end()) {
                    heuristics.push_back("DIRECT_SEED");
                }
            } else if (!isIllicit && vol > maxVolume) {
                maxVolume = vol;
                primaryAddress = addr;
            }
        }

        RiskCategory defaultRisk = isIllicit ? RiskCategory::CRITICAL_ILLICIT_SEED : RiskCategory::CLEAN_TRANSIT;
        double initialScore = isIllicit ? 100.0 : 0.0;
        double initialHops = isIllicit ? 0.0 : std::numeric_limits<double>::infinity();

        EntityCluster cluster{entityId, addressList, primaryAddress, heuristics, totalClusterVol, defaultRisk, initialScore, initialHops, isIllicit};
        result.entityClusters[entityId] = cluster;
    }

    result.identifiedChangeAddresses = identifiedChangeAddresses;
    result.totalEntitiesCount = static_cast<int>(result.entityClusters.size());
    result.clusteredAddressesCount = static_cast<int>(result.addressToEntityMap.size());
    result.multiInputGroupsCount = multiInputGroupsCount;
    return result;
}

} // namespace chainsink
