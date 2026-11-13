# README for the C++ desktop runtime

This repository now includes C++ core implementations alongside the existing TypeScript project.

- Core logic lives under `src/core/*.hpp` and `src/core/*.cpp`.
- Desktop app entry is under `native/ChainsinkDesktop/`.
- Build with:

  cmake -S . -B build
  cmake --build build

The app reproduces the same core ChainSink workflow: ingestion, heuristic clustering, topology mining, proximity scoring, Merkle settlement, and benchmark reporting.
