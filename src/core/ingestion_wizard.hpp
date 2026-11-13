#pragma once

#include "forensics_types.hpp"
#include <string>
#include <set>
#include <vector>
#include <map>
#include <unordered_map>
#include <sstream>
#include <cmath>

namespace chainsink {

struct DatasetBundle {
    std::vector<RawTransaction> transactions;
    std::vector<GraphNode> nodes;
    std::vector<GraphEdge> edges;
    std::set<std::string> seedAddresses;
};

std::string truncateAddress(const std::string& addr);
DatasetBundle generateVictimScamDataset();
DatasetBundle generateElliptic2Dataset();
IngestionValidationReport validateAndSanitizeDataset(const std::string& rawContent,
                                                   const SchemaMappingConfig& schema);

} // namespace chainsink
