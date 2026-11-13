#pragma once

#include "forensics_types.hpp"
#include <string>
#include <vector>
#include <unordered_map>
#include <set>
#include <map>
#include <any>
#include <cmath>
#include <cstdlib>
#include <chrono>

namespace chainsink {

struct VersionedStateCell {
    std::any value;
    int version = 0;
    long long lastUpdatedTimestamp = 0;
};

class ComplianceRegistryContract {
public:
    ComplianceRegistryContract();
    void initState();
    std::string executeOptimisticSTM(const std::string& txId,
                                    const std::vector<std::string>& keysToRead,
                                    const std::function<std::pair<std::map<std::string, std::any>, std::any>(const std::map<std::string, std::any>&)>& transactionBody,
                                    int maxRetries = 5);
    STMTransactionResult updateEaiStatus(const std::string& entityId,
                                        const std::string& riskCategory,
                                        double proximityScore,
                                        int hopDistance);
    std::pair<std::string, int> updateProximityMerkleRoot(const std::vector<EntityCluster>& entities);
    bool verifyProximityProof(const std::string& leafHash,
                             const std::vector<MerkleProofStep>& proof,
                             const std::string& rootToTest = "");
    STMContentionBenchmark runSTMContentionBenchmark(int workerCount = 4, int txCountPerWorker = 25);
    std::string getGlobalMerkleRoot() const;
    int getCommitBlock() const;
    long long getCommitTimestamp() const;
    std::unordered_map<std::string, EntityComplianceRecord> getComplianceRecords() const;
    std::vector<STMTransactionResult> getTransactionHistory() const;
    std::optional<EntityComplianceRecord> getRecord(const std::string& entityId) const;

private:
    std::unordered_map<std::string, VersionedStateCell> stateStore;
    std::string globalMerkleRoot = "0x0000000000000000000000000000000000000000000000000000000000000000";
    int rootCommitBlock = 19482001;
    long long rootCommitTimestamp = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
    std::unordered_map<std::string, EntityComplianceRecord> complianceRecords;
    std::vector<STMTransactionResult> transactionHistory;
};

} // namespace chainsink
