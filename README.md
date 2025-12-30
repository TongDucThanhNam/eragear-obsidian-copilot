# Eragear Obsidian Copilot

**An Agentic AI Assistant for Obsidian** that prioritizes deterministic graph context over vector embeddings.

## Key Features

- **Graph-Based Context**: Uses PageRank and Spreading Activation to find relevant notes based on your vault's structure.
- **Local First**: All processing happens locally on your machine using Web Workers.
- **deterministic**: No vector databases, no "hallucinated" connections. Connections are based on actual links.
- **Lexical Search**: Integrated full-text search using MiniSearch.

## Architecture

This plugin uses a **Web Worker** to offload heavy graph algorithms (Graphology) and search indexing (MiniSearch) from the main UI thread.
For more technical details, see [Architecture Documentation](docs/architecture.md).

## Installation

1. Clone this repo into your `.obsidian/plugins/` folder.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to build the plugin.
4. Enable the plugin in Obsidian settings.

## Development

- `npm run dev`: Start development watch mode.
- `npm run build`: Build for production.

## Status (Phase 1 Complete)

- [x] Graph Building & PageRank
- [x] Spreading Activation Context
- [x] Web Worker Offloading
- [ ] Phase 2: MCP Server Integration (Coming Soon)
