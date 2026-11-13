cmake_minimum_required(VERSION 3.16)
project(ChainsinkDesktop LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 REQUIRED COMPONENTS Widgets)

add_executable(ChainsinkDesktop
    native/ChainsinkDesktop/main.cpp
    src/core/crypto_utils.cpp
    src/core/heuristic_analyzer.cpp
    src/core/blazing_aml.cpp
    src/core/multihop_engine.cpp
    src/core/ingestion_wizard.cpp
    src/core/compliance_registry.cpp
    src/core/forensic_orchestrator.cpp
)

target_include_directories(ChainsinkDesktop PRIVATE ${CMAKE_SOURCE_DIR})
target_link_libraries(ChainsinkDesktop PRIVATE Qt6::Widgets)
