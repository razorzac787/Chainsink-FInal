#include "forensic_orchestrator.hpp"

namespace chainsink {

ChainSinkForensicEngine::ChainSinkForensicEngine() = default;

ComplianceRegistryContract& ChainSinkForensicEngine::getContract() { return contract; }

ForensicPipelineRunResult ChainSinkForensicEngine::runPipeline(const std::vector<RawTransaction>& initialTransactions,
                                                             const std::vector<GraphNode>& initialNodes,
                                                             const std::vector<GraphEdge>& initialEdges,
                                                             const std::set<std::string>& seedAddresses,
                                                             const ForensicCaseMetadata& caseMetadata,
                                                             const TopologyMiningOptions& options) {
    auto clustering = runPillar1HeuristicClustering(initialTransactions, seedAddresses);

    std::vector<GraphNode> clusteredNodes = initialNodes;
    for (auto& node : clusteredNodes) {
        const std::string entityId = clustering.addressToEntityMap.count(node.id) ? clustering.addressToEntityMap.at(node.id) : "ENT-000";
        const auto clusterIt = clustering.entityClusters.find(entityId);
        const bool isSeed = node.isIllicitSeed || (clusterIt != clustering.entityClusters.end() && clusterIt->second.isIllicitSeed);
        node.entityId = entityId;
        node.isIllicitSeed = isSeed;
        node.riskCategory = isSeed ? RiskCategory::CRITICAL_ILLICIT_SEED : node.riskCategory;
        node.proximityScore = isSeed ? 100.0 : node.proximityScore;
        node.hopDistance = isSeed ? 0.0 : node.hopDistance;
    }

    const auto topology = runBlazingAMLTopologyMining(initialTransactions, initialEdges, options);
    const auto proximity = runPillar3ProximityScoring(clusteredNodes, initialEdges, clustering.entityClusters, seedAddresses);

    std::vector<EntityCluster> entitiesList;
    for (const auto& [_, cluster] : proximity.updatedClusters) {
        entitiesList.push_back(cluster);
    }
    const auto merkleSettlement = contract.updateProximityMerkleRoot(entitiesList);

    ForensicCaseMetadata metadata = caseMetadata;
    if (metadata.caseId.empty()) metadata.caseId = "CASE-CS-FORENSIC-001";
    if (metadata.caseName.empty()) metadata.caseName = "Multi-Hop Illicit Asset Tracing";
    if (metadata.reportedCurrency.empty()) metadata.reportedCurrency = "BTC";
    if (metadata.dateCreated.empty()) metadata.dateCreated = "2026-11-13T00:00:00Z";
    if (metadata.status.empty()) metadata.status = "MERKLE_SETTLED";

    return {metadata, initialTransactions, proximity.nodes, proximity.edges, clustering, topology, proximity, contract, merkleSettlement, seedAddresses};
}

ForensicPipelineRunResult ChainSinkForensicEngine::loadPreset(const std::string& presetKey) {
    DatasetBundle dataset;
    ForensicCaseMetadata metadata;
    if (presetKey == "ELLIPTIC2_LAUNDERING_RING") {
        dataset = generateElliptic2Dataset();
        metadata.caseId = "CASE-ELLIPTIC2-SUBGRAPH-441";
        metadata.caseName = "Elliptic2 Benchmark Subgraph: Multi-Hop Laundering Ring";
        metadata.victimAddress = "bc1qdnmmarketseed999xxxxxxxxxxxxxxx";
        metadata.reportedAmount = 112.4;
        metadata.reportedCurrency = "BTC";
    } else {
        dataset = generateVictimScamDataset();
        metadata.caseId = "CASE-2026-BTC-0982";
        metadata.caseName = "Victim-Reported Phishing & 6-Hop Peel Chain UTXO Dump";
        metadata.victimAddress = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa";
        metadata.reportedAmount = 48.5;
        metadata.reportedCurrency = "BTC";
    }

    return runPipeline(dataset.transactions, dataset.nodes, dataset.edges, dataset.seedAddresses, metadata);
}

} // namespace chainsink
