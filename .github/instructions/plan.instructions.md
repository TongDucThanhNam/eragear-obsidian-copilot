---
applyTo: '**'
---
# Roadmap

## Phase 1: Foundation (Current)
- [x] Initial plugin structure
- [x] Basic command registration
- [x] Settings tab

## Phase 2: Core Features
- [ ] Context awareness (reading active file, search keywords, reading graph, read notes, ...)
- [ ] AI integration (connecting to Eragear: `https://eragear.app`)
- [ ] Basic prompt templates

## Phase 3: Advanced Features
- [ ] Test functionality in sidebar
- [ ] Chat interface in sidebar

## Phase 4: Polish & Release
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Community plugin submission

# AI Guidelines for EraGear Obsidian Copilot

This document outlines the guidelines for AI agents working on the EraGear Obsidian Copilot plugin.

## Project Overview

- **Plugin ID**: eragear-obsidian-copilot
- **Goal**: A copilot plugin for Obsidian.
- **Tech Stack**: TypeScript, Obsidian API.

## File Structure

```
src/
  ├── main.ts                   # Entry point (Lifecycle: onload, onunload)
  ├── settings.ts               # Plugin Settings Tab
  ├── api/                      # Cloudflare Bridge
  │   ├── eragear-client.ts     # Wrapper for fetch/streaming from CF Worker
  │   └── types.ts              # API Request/Response Interfaces
  ├── core/                     # Business Logic (Runs on Main Thread)
  │   ├── context-engine.ts     # Orchestrator for context assembly
  │   ├── graph-service.ts      # Obsidian Cache wrapper
  │   └── worker-host.ts        # Manager for Web Worker communication
  ├── workers/                  # Heavy computation (Runs on Background Thread)
  │   ├── search.worker.ts      # Aho-Corasick & Fuzzy Search Implementation
  │   └── graph.worker.ts       # Graph Traversal Algorithms
  ├── ui/                       # React Views (Diff View, Chat Interface)
  │   ├── components/
  │   ├── views/
  │   └── hooks/
  ├── utils/
  │   ├── markdown-sanitizer.ts # Clean AI output before inserting
  │   └── constants.ts
  └── types/
      └── obsidian.d.ts         # Custom type augmentations
```

## Development Guidelines

- **Do not commit build artifacts**: Never commit `node_modules/`, `main.js`, or other generated files.
- **Keep it small**: Avoid large dependencies.
- **Output**: `main.js`, `manifest.json`, `styles.css` go to root.

## Manifest Rules

- Keep `manifest.json` updated.
- `id` must be stable.
- `minAppVersion` should be accurate.


## Coding Conventions

- **TypeScript**: Strict mode.
- **main.ts**: Minimal, lifecycle only.
- **Modularity**: Split large files (>200 lines).
- **Async/Await**: Prefer over promise chains.

## Security & Privacy

- **Local First**: Default to offline.
- **No Hidden Telemetry**.
- **User Consent**: Explicit opt-in for external services.