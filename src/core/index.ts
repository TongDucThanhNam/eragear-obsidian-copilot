/**
 * Core Module Exports
 *
 * This module contains the Domain Logic / Business Logic layer.
 * It includes:
 * - Type definitions (types.ts)
 * - Vault API wrapper (vault-manager.ts)
 * - Worker communication (worker-client.ts)
 * - Context orchestration (context-assembler.ts)
 *
 * These modules are responsible for the core business logic
 * and should be independent of UI framework or external services.
 */

export type { AssemblerConfig } from "./context-assembler";
export { ContextAssembler, createContextAssembler } from "./context-assembler";
export { createGraphService, GraphService } from "./graph-service";
export * from "./types";
export type { FileData, FileReference } from "./vault-manager";
export { createVaultManager, VaultManager } from "./vault-manager";
export { getWorkerClient, WorkerClient } from "./worker-client";
