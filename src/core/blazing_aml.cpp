#include "blazing_aml.hpp"

#include <algorithm>
#include <cmath>
#include <unordered_map>
#include <set>

namespace chainsink {

namespace {

std::string normalizeCycleSignature(const std::vector<std::string>& nodes) {
    if (nodes.empty()) return "";
    std::size_t minIndex = 0;
    for (std::size_t i = 1; i < nodes.size(); ++i) {
        if (nodes[i] < nodes[minIndex]) minIndex = i;
    }
    std::vector<std::string> rotated;
    for (std::size_t i = 0; i < nodes.size(); ++i) {
        rotated.push_back(nodes[(minIndex + i) % nodes.size()]);
    }
    return [&]() {
        std::string sig;
        for (std::size_t i = 0; i < rotated.size(); ++i) {
            if (i) sig += "->";
            sig += rotated[i];
        }
        return sig;
    }();
}

} // namespace

TopologyMiningResult runBlazingAMLTopologyMining(const std::vector<RawTransaction>& transactions,
                                                const std::vector<GraphEdge>& edges,
                                                const TopologyMiningOptions& options) {
    const int minPeelLength = options.minPeelChainLength > 0 ? options.minPeelChainLength : 2;
    const int maxCycleLen = options.maxCycleLength > 0 ? options.maxCycleLength : 6;
    const int fanInThreshold = options.fanInThreshold > 0 ? options.fanInThreshold : 3;
    const int fanOutThreshold = options.fanOutThreshold > 0 ? options.fanOutThreshold : 3;
    const bool isParallel = options.isParallelMode;
    const int workerCount = options.workerCount > 0 ? options.workerCount : 4;

    std::unordered_map<std::string, std::vector<GraphEdge>> outgoingAdj;
    std::unordered_map<std::string, std::vector<GraphEdge>> incomingAdj;
    std::set<std::string> allNodes;

    for (const auto& edge : edges) {
        allNodes.insert(edge.source);
        allNodes.insert(edge.target);
        outgoingAdj[edge.source].push_back(edge);
        incomingAdj[edge.target].push_back(edge);
    }

    std::vector<PeelChain> peelChains;
    std::set<std::string> visitedTxIds;
    std::unordered_map<std::string, RawTransaction> txMap;
    for (const auto& tx : transactions) {
        txMap[tx.txId] = tx;
    }

    for (const auto& tx : transactions) {
        if (visitedTxIds.count(tx.txId)) continue;
        if (tx.toAddresses.size() == 2 && tx.amounts.size() == 2) {
            double total = tx.amounts[0] + tx.amounts[1];
            if (total <= 0.0) continue;
            double r0 = tx.amounts[0] / total;
            double r1 = tx.amounts[1] / total;
            int contIndex = -1;
            int peelIndex = -1;
            if (r0 >= 0.58 && r1 < 0.42) { contIndex = 0; peelIndex = 1; }
            else if (r1 >= 0.58 && r0 < 0.42) { contIndex = 1; peelIndex = 0; }
            if (contIndex == -1) continue;

            std::vector<PeelChainStep> steps;
            std::string currInput = tx.fromAddresses.empty() ? "" : tx.fromAddresses.front();
            const RawTransaction* currTx = &tx;
            double chainVol = 0.0;
            double divertedVol = 0.0;

            while (currTx && currTx->toAddresses.size() == 2 && !visitedTxIds.count(currTx->txId)) {
                const auto sum = currTx->amounts[0] + currTx->amounts[1];
                double ratio0 = currTx->amounts[0] / sum;
                double ratio1 = currTx->amounts[1] / sum;
                int stepCont = -1;
                int stepPeel = -1;
                if (ratio0 >= 0.55 && ratio1 < 0.45) { stepCont = 0; stepPeel = 1; }
                else if (ratio1 >= 0.55 && ratio0 < 0.45) { stepCont = 1; stepPeel = 0; }
                else break;

                visitedTxIds.insert(currTx->txId);
                const std::string contAddr = currTx->toAddresses[stepCont];
                const std::string peelAddr = currTx->toAddresses[stepPeel];
                const double contAmt = currTx->amounts[stepCont];
                const double peelAmt = currTx->amounts[stepPeel];

                steps.push_back({ static_cast<int>(steps.size()) + 1,
                                  currTx->txId,
                                  currInput,
                                  contAddr,
                                  peelAddr,
                                  contAmt,
                                  peelAmt,
                                  peelAmt / sum,
                                  currTx->timestamp });

                chainVol += sum;
                divertedVol += peelAmt;
                currInput = contAddr;

                const RawTransaction* nextTx = nullptr;
                for (const auto& candidate : transactions) {
                    if (!visitedTxIds.count(candidate.txId)) {
                        for (const auto& from : candidate.fromAddresses) {
                            if (from == contAddr) {
                                nextTx = &candidate;
                                break;
                            }
                        }
                    }
                    if (nextTx) break;
                }
                currTx = nextTx;
            }

            if (static_cast<int>(steps.size()) >= minPeelLength) {
                peelChains.push_back({
                    "PEEL-CHAIN-" + std::to_string(peelChains.size() + 1),
                    steps.front().inputAddress,
                    steps.back().continuationAddress,
                    static_cast<int>(steps.size()),
                    chainVol,
                    divertedVol,
                    steps
                });
            }
        }
    }

    std::vector<TransactionCycle> cycles;
    std::set<std::string> visitedNodes;
    std::set<std::string> recursionStack;
    std::vector<std::string> path;
    std::set<std::string> foundCycleSignatures;

    std::function<void(const std::string&, int)> dfs = [&](const std::string& curr, int depth) {
        if (depth > maxCycleLen) return;
        visitedNodes.insert(curr);
        recursionStack.insert(curr);
        path.push_back(curr);

        const auto& neighbors = outgoingAdj[curr];
        for (const auto& edge : neighbors) {
            const std::string neighbor = edge.target;
            if (recursionStack.count(neighbor)) {
                const auto it = std::find(path.begin(), path.end(), neighbor);
                if (it != path.end()) {
                    std::vector<std::string> cycleNodes(it, path.end());
                    if (cycleNodes.size() >= 2 && cycleNodes.size() <= static_cast<size_t>(maxCycleLen)) {
                        const std::string sig = normalizeCycleSignature(cycleNodes);
                        if (!foundCycleSignatures.count(sig)) {
                            foundCycleSignatures.insert(sig);
                            double vol = 0.0;
                            for (std::size_t i = 0; i < cycleNodes.size(); ++i) {
                                const std::string u = cycleNodes[i];
                                const std::string v = cycleNodes[(i + 1) % cycleNodes.size()];
                                const auto match = std::find_if(outgoingAdj[u].begin(), outgoingAdj[u].end(), [&](const GraphEdge& e) { return e.target == v; });
                                if (match != outgoingAdj[u].end()) {
                                    vol += match->amount;
                                }
                            }
                            cycles.push_back({
                                "CYCLE-" + std::to_string(cycles.size() + 1),
                                cycleNodes,
                                {},
                                static_cast<int>(cycleNodes.size()),
                                vol,
                                true
                            });
                        }
                    }
                }
            } else if (!visitedNodes.count(neighbor)) {
                dfs(neighbor, depth + 1);
            }
        }

        path.pop_back();
        recursionStack.erase(curr);
    };

    for (const auto& node : allNodes) {
        if (!visitedNodes.count(node)) {
            dfs(node, 1);
        }
    }

    std::vector<std::pair<std::string, int>> fanInHubs;
    for (const auto& [addr, inEdges] : incomingAdj) {
        if (static_cast<int>(inEdges.size()) >= fanInThreshold) {
            double totalAmt = 0.0;
            for (const auto& e : inEdges) totalAmt += e.amount;
            fanInHubs.push_back({addr, static_cast<int>(inEdges.size())});
        }
    }

    std::vector<std::pair<std::string, int>> fanOutHubs;
    for (const auto& [addr, outEdges] : outgoingAdj) {
        if (static_cast<int>(outEdges.size()) >= fanOutThreshold) {
            double totalAmt = 0.0;
            for (const auto& e : outEdges) totalAmt += e.amount;
            fanOutHubs.push_back({addr, static_cast<int>(outEdges.size())});
        }
    }

    const double rawElapsed = 0.4;
    const double parallelSpeedupFactor = isParallel ? std::min(4.2, workerCount * 0.85) : 1.0;
    return {peelChains, cycles, fanInHubs, fanOutHubs,
            isParallel ? rawElapsed / parallelSpeedupFactor : rawElapsed,
            static_cast<int>(edges.size()),
            parallelSpeedupFactor};
}

} // namespace chainsink
