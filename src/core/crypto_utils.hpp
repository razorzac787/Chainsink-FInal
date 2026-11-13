#pragma once

#include <string>
#include <vector>
#include <stdexcept>
#include <sstream>

namespace chainsink {

std::string sha256Hex(const std::string& input);
std::string hashString(const std::string& data);
std::string hashEntityRecord(const std::string& entityId,
                            const std::string& riskCategory,
                            double proximityScore,
                            int hopDistance);
std::string hashPair(const std::string& left, const std::string& right);

struct MerkleTreeData {
    std::vector<std::string> leaves;
    std::vector<std::vector<std::string>> levels;
    std::string root;
};

MerkleTreeData buildMerkleTree(const std::vector<std::string>& leaves);
std::vector<MerkleProofStep> generateMerkleProof(const MerkleTreeData& tree, std::size_t leafIndex);
bool verifyProximityProof(const std::string& leafHash,
                         const std::vector<MerkleProofStep>& proof,
                         const std::string& expectedRoot);

} // namespace chainsink
