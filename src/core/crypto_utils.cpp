#include "crypto_utils.hpp"

#include <array>
#include <cstdint>
#include <iomanip>
#include <sstream>
#include <vector>
#include <string>

namespace chainsink {

namespace {

static inline std::uint32_t rotr(std::uint32_t x, std::uint32_t n) {
    return (x >> n) | (x << (32 - n));
}

static std::string toHex(std::uint32_t v) {
    std::ostringstream oss;
    oss << std::hex << std::setw(8) << std::setfill('0') << v;
    return oss.str();
}

static std::string toHexBytes(const std::vector<std::uint32_t>& hashWords) {
    std::ostringstream oss;
    for (std::size_t i = 0; i < 8; ++i) {
        for (int j = 3; j >= 0; --j) {
            std::uint32_t word = hashWords[i];
            std::uint32_t byte = (word >> (j * 8)) & 0xFF;
            oss << std::setw(2) << std::setfill('0') << std::hex << byte;
        }
    }
    return oss.str();
}

static void appendToWords(std::vector<std::uint32_t>& words,
                         const std::string& str,
                         std::size_t& index,
                         std::size_t& wordIndex) {
    for (std::size_t i = 0; i < str.size(); ++i) {
        const unsigned char ch = static_cast<unsigned char>(str[i]);
        words[wordIndex >> 2] |= (static_cast<std::uint32_t>(ch) << ((3 - (wordIndex % 4)) * 8));
        ++wordIndex;
    }
}

} // namespace

std::string sha256Hex(const std::string& input) {
    const std::array<std::uint32_t, 64> k = {
        0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
        0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
        0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
        0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
        0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
        0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
        0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
        0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    };

    std::vector<std::uint32_t> words(64, 0);
    std::size_t wordIndex = 0;
    for (std::size_t i = 0; i < input.size(); ++i) {
        const unsigned char ch = static_cast<unsigned char>(input[i]);
        words[wordIndex >> 2] |= static_cast<std::uint32_t>(ch) << ((3 - (wordIndex % 4)) * 8);
        ++wordIndex;
    }

    const std::size_t bitLength = input.size() * 8;
    words[(bitLength >> 5)] |= (1u << (24 - (bitLength % 32)));
    words[((bitLength + 64) >> 9) << 4 | 15] = static_cast<std::uint32_t>(bitLength);

    std::array<std::uint32_t, 8> hash = {
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    };

    for (std::size_t i = 0; i < words.size(); i += 16) {
        std::array<std::uint32_t, 64> w{};
        for (std::size_t j = 0; j < 16; ++j) {
            w[j] = words[i + j];
        }
        for (std::size_t j = 16; j < 64; ++j) {
            const auto gamma0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >> 3);
            const auto gamma1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >> 10);
            w[j] = (w[j - 16] + gamma0 + w[j - 7] + gamma1);
        }

        std::uint32_t a = hash[0];
        std::uint32_t b = hash[1];
        std::uint32_t c = hash[2];
        std::uint32_t d = hash[3];
        std::uint32_t e = hash[4];
        std::uint32_t f = hash[5];
        std::uint32_t g = hash[6];
        std::uint32_t h = hash[7];

        for (std::size_t j = 0; j < 64; ++j) {
            const std::uint32_t ch = (e & f) ^ (~e & g);
            const std::uint32_t maj = (a & b) ^ (a & c) ^ (b & c);
            const std::uint32_t sigma0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const std::uint32_t sigma1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const std::uint32_t t1 = h + sigma1 + ch + k[j] + w[j];
            const std::uint32_t t2 = sigma0 + maj;

            h = g;
            g = f;
            f = e;
            e = d + t1;
            d = c;
            c = b;
            b = a;
            a = t1 + t2;
        }

        hash[0] += a;
        hash[1] += b;
        hash[2] += c;
        hash[3] += d;
        hash[4] += e;
        hash[5] += f;
        hash[6] += g;
        hash[7] += h;
    }

    std::vector<std::uint32_t> finalHash(hash.begin(), hash.end());
    std::ostringstream oss;
    for (std::size_t i = 0; i < finalHash.size(); ++i) {
        oss << std::hex << std::setw(8) << std::setfill('0') << finalHash[i];
    }
    return "0x" + oss.str();
}

std::string hashString(const std::string& data) {
    return sha256Hex(data);
}

std::string hashEntityRecord(const std::string& entityId,
                            const std::string& riskCategory,
                            double proximityScore,
                            int hopDistance) {
    std::ostringstream oss;
    oss << "CHAIN_SINK_EAI:" << entityId << ":" << riskCategory << ":"
        << std::fixed << std::setprecision(2) << proximityScore << ":" << hopDistance;
    return sha256Hex(oss.str());
}

std::string hashPair(const std::string& left, const std::string& right) {
    return sha256Hex(left + right);
}

MerkleTreeData buildMerkleTree(const std::vector<std::string>& leaves) {
    MerkleTreeData result;
    if (leaves.empty()) {
        std::string emptyRoot = sha256Hex("EMPTY_TREE");
        result.root = emptyRoot;
        result.leaves = {};
        result.levels = {{emptyRoot}};
        return result;
    }

    result.leaves = leaves;
    result.levels.push_back(leaves);
    auto current = leaves;
    while (current.size() > 1) {
        std::vector<std::string> next;
        for (std::size_t i = 0; i < current.size(); i += 2) {
            std::string left = current[i];
            std::string right = (i + 1 < current.size()) ? current[i + 1] : left;
            next.push_back(hashPair(left, right));
        }
        result.levels.push_back(next);
        current = next;
    }
    result.root = current.back();
    return result;
}

std::vector<MerkleProofStep> generateMerkleProof(const MerkleTreeData& tree, std::size_t leafIndex) {
    std::vector<MerkleProofStep> proof;
    if (leafIndex >= tree.leaves.size()) {
        return proof;
    }

    std::size_t currentIndex = leafIndex;
    for (std::size_t level = 0; level + 1 < tree.levels.size(); ++level) {
        const auto& levelNodes = tree.levels[level];
        bool isRightChild = (currentIndex % 2 == 1);
        std::size_t siblingIndex = isRightChild ? (currentIndex - 1) : (currentIndex + 1);

        if (siblingIndex < levelNodes.size()) {
            proof.push_back({isRightChild ? "left" : "right", levelNodes[siblingIndex]});
        } else {
            proof.push_back({"right", levelNodes[currentIndex]});
        }
        currentIndex = currentIndex / 2;
    }
    return proof;
}

bool verifyProximityProof(const std::string& leafHash,
                         const std::vector<MerkleProofStep>& proof,
                         const std::string& expectedRoot) {
    std::string currentHash = leafHash;
    for (const auto& step : proof) {
        if (step.position == "left") {
            currentHash = hashPair(step.hash, currentHash);
        } else {
            currentHash = hashPair(currentHash, step.hash);
        }
    }
    return currentHash == expectedRoot;
}

} // namespace chainsink
