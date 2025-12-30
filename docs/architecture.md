# Eragear Obsidian Copilot - Technical Architecture

## Overview
Eragear Obsidian Copilot is an advanced AI assistant plugin for Obsidian that emphasizes local, deterministic context engineering over probabilistic vector embeddings. It uses a Graph-based approach combined with Lexical Search to provide accurate, relevant context for AI interactions.

## Core Architecture

### Context Engine (Non-Vector)
The plugin replaces traditional RAG (Vector Databases) with a deterministic graph engine:
- **Graph Topology**: Represents the Obsidian Vault as a graph where Files are Nodes and Links/Backlinks are Edges.
- **Graphology**: Uses the `graphology` library for efficient in-memory graph manipulation.
- **PageRank**: Computes the global strict importance of notes based on connectivity.
- **Spreading Activation**: Computes local contextual relevance by propagating "energy" from the active note to its neighbors.
- **Lexical Search**: Uses `minisearch` (BM25) for full-text keyword search and fuzzy matching.

### Thread Model
To ensure the main Obsidian UI remains responsive, heavy computations are offloaded:
- **Main Thread**: Handles UI, Vault events, and lightweight coordination.
- **Web Worker**: Dedicated worker for Graph Building, PageRank, Spreading Activation, and Search Indexing.
- **Snapshot Pattern**: The Main Thread captures a "Snapshot" of the `MetadataCache` and sends it to the Worker, ensuring thread-safe data processing.

### Connectivity (Phase 2)
The plugin acts as a **Tool Provider** for external agents:
- **Model Context Protocol (MCP)**: Implements an MCP Server to expose vault reading and searching capabilities to external tools (e.g., Claude Desktop, Web Agents).
- **Embedded Server**: Runs a local HTTP server (Fastify/Express) inside the plugin to handle MCP requests.

## Key Components

### `GraphService` (`src/core/graph-service.ts`)
- Manages the interaction with the Graph Worker.
- Extracts graph data from Obsidian's `MetadataCache`.
- Provides methods for retrieving neighborhood context and smart context.

### `GraphWorker` (`src/workers/graph.worker.ts`)
- The entry point for the Web Worker.
- Instantiates logic handlers for Graph, Search, and future analysis tasks.

### `GraphBuilder` (`src/workers/graph-impl.ts`)
- Core logic for constructing the `graphology` graph.
- Implements `computePageRank` and `spreadingActivation` algorithms.

## Development Workflows
- **Building**: `npm run build` uses `esbuild` to bundle the main plugin and the worker (as a blob).
- **Linting**: `npm run lint` ensures code quality.

## Future Roadmap
- **Human-in-the-Loop (HITL)**: UI for approving/rejecting Agent tool usage.
- **Hybrid Search**: Combining Spreading Activation scores with BM25 scores for ranking.
