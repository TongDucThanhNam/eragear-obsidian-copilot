/**
 * Context Assembler
 *
 * Orchestrator that coordinates data from multiple sources:
 * - VaultManager (reads from Obsidian)
 * - WorkerClient (computes graph, search)
 * - CloudflareService (external AI API)
 *
 * This is the Core Domain Logic / Business Logic layer.
 * It ensures proper separation between Infrastructure and Domain layers.
 *
 * Flow:
 * 1. Receive user query + active file
 * 2. Use VaultManager to read file content and metadata
 * 3. Send to WorkerClient for graph analysis
 * 4. Assemble ContextPayload with results
 * 5. Return to caller (UI or Service)
 */

import type {
    AnalyzeGraphPayload,
    ContextPayload,
    GraphStructure,
    SearchContentPayload,
} from "./types";
import type { VaultManager } from "./vault-manager";
import { getWorkerClient } from "./worker-client";

export interface AssemblerConfig {
    maxGraphHops: number;
    maxRelatedNotes: number;
    searchMaxResults: number;
    debounceDelay: number;
}

export const DEFAULT_ASSEMBLER_CONFIG: AssemblerConfig = {
    maxGraphHops: 2,
    maxRelatedNotes: 5,
    searchMaxResults: 20,
    debounceDelay: 500,
};

export class ContextAssembler {
    private debounceTimers: Map<string, NodeJS.Timeout> = new Map();
    private lastGraphCache: Map<string, GraphStructure> = new Map();
    private cacheExpiry: number = 30000; // 30 seconds

    constructor(
        private vaultManager: VaultManager,
        private config: AssemblerConfig = DEFAULT_ASSEMBLER_CONFIG,
    ) { }

    /**
     * Assemble complete context for AI processing
     *
     * This is the main public API method called from UI/Services
     */
    async assembleContext(
        activeFilePath: string,
        userQuery: string,
    ): Promise<ContextPayload | null> {
        try {
            // Validate input
            const activeFile = this.vaultManager.getFileByPath(activeFilePath);
            if (!activeFile) {
                console.error(`[ContextAssembler] File not found: ${activeFilePath}`);
                return null;
            }

            // 1. Get active file metadata
            const activeContent = await this.vaultManager.getFileContent(activeFile);
            const activeStructure = this.vaultManager.getFileStructure(activeFile);

            // 2. Build graph context (with caching)
            const graphContext = await this.buildGraphContext(activeFilePath);
            if (!graphContext) {
                throw new Error("Failed to build graph context");
            }

            // 3. Get related notes
            const relatedNotes = await this.getRelatedNotes(
                graphContext,
                this.config.maxRelatedNotes,
            );

            // 4. Assemble payload
            const payload: ContextPayload = {
                activeFile: activeFilePath,
                activeFileContent: activeContent,
                activeFileStructure: activeStructure,
                graphContext,
                relatedNotes,
                userQuery,
            };

            return payload;
        } catch (error) {
            console.error("[ContextAssembler] Error assembling context:", error);
            return null;
        }
    }

    /**
     * Build graph context with caching
     */
    private async buildGraphContext(
        rootFilePath: string,
    ): Promise<GraphStructure | null> {
        // Check cache first
        const cached = this.lastGraphCache.get(rootFilePath);
        if (cached && Date.now() - cached.metadata.generatedAt < this.cacheExpiry) {
            return cached;
        }

        try {
            const workerClient = getWorkerClient();

            // Collect all files for graph building
            const allFiles = this.vaultManager.getAllFiles();
            const fileDataList = await Promise.all(
                allFiles.map(async (file) => ({
                    path: file.path,
                    content: await this.vaultManager.getFileContent(file),
                })),
            );

            // Send to worker for graph analysis
            const graphPayload: AnalyzeGraphPayload = {
                rootFilePath,
                maxHops: this.config.maxGraphHops,
                allFiles: fileDataList,
            };

            const result = await workerClient.analyzeGraph(graphPayload);

            // Cache the result
            this.lastGraphCache.set(rootFilePath, result);

            // Clear old cache entries
            this.clearExpiredCache();

            return result;
        } catch (error) {
            console.error("[ContextAssembler] Failed to build graph:", error);
            return null;
        }
    }

    /**
     * Get related notes from graph
     */
    private async getRelatedNotes(
        graphContext: GraphStructure,
        limit: number,
    ): Promise<ContextPayload["relatedNotes"]> {
        const relatedPaths = this.getTopRelatedPaths(graphContext, limit);

        const relatedNotes = await Promise.all(
            relatedPaths.map(async (path) => {
                const file = this.vaultManager.getFileByPath(path);
                if (!file) return null;

                const content = await this.vaultManager.getFileContent(file);
                const relevance = this.getNodeRelevance(graphContext, path);
                const excerpt = content.substring(0, 200).replace(/\n/g, " ");

                return {
                    path,
                    title: file.basename,
                    relevance,
                    excerpt,
                };
            }),
        );

        return relatedNotes.filter((n): n is Exclude<typeof n, null> => n !== null);
    }

    /**
     * Get top K related file paths from graph
     */
    private getTopRelatedPaths(graph: GraphStructure, limit: number): string[] {
        // Score nodes by relevance (based on graph distance and link types)
        const scored = graph.nodes
            .filter((n) => n.level > 0) // Exclude root
            .map((n) => ({
                path: n.filePath,
                score: this.scoreNodeRelevance(graph, n.filePath),
            }))
            .sort((a, b) => b.score - a.score);

        return scored.slice(0, limit).map((s) => s.path);
    }

    /**
     * Score relevance of a node in graph
     */
    private scoreNodeRelevance(graph: GraphStructure, filePath: string): number {
        const node = graph.nodes.find((n) => n.filePath === filePath);
        if (!node) return 0;

        // Base score: closer nodes have higher score
        const hopDistance = node.level;
        const baseScore = Math.max(0, 1 - (hopDistance - 1) * 0.3);

        // Boost by incoming edges
        const incomingEdges = graph.edges.filter((e) => e.target === filePath);
        const weightBoost = incomingEdges.reduce((sum, e) => sum + e.weight, 0);

        return baseScore * (1 + weightBoost * 0.1);
    }

    /**
     * Get relevance of node (0-1)
     */
    private getNodeRelevance(graph: GraphStructure, filePath: string): number {
        return Math.min(1, this.scoreNodeRelevance(graph, filePath));
    }

    /**
     * Clear expired cache entries
     */
    private clearExpiredCache(): void {
        const now = Date.now();
        for (const [key, value] of this.lastGraphCache.entries()) {
            if (now - value.metadata.generatedAt > this.cacheExpiry) {
                this.lastGraphCache.delete(key);
            }
        }
    }

    /**
     * Debounced graph rebuild
     * Useful for UI that triggers on every keystroke
     */
    async rebuildGraphDebounced(
        rootFilePath: string,
        delay: number = this.config.debounceDelay,
    ): Promise<void> {
        const key = `rebuild_${rootFilePath}`;

        // Clear existing timer
        const existing = this.debounceTimers.get(key);
        if (existing) clearTimeout(existing);

        // Set new timer
        return new Promise((resolve) => {
            const timer = setTimeout(async () => {
                this.debounceTimers.delete(key);
                await this.buildGraphContext(rootFilePath);
                resolve();
            }, delay);

            this.debounceTimers.set(key, timer);
        });
    }

    /**
     * Search across vault
     */
    async searchVault(
        query: string,
        maxResults: number = this.config.searchMaxResults,
    ): Promise<Array<{ path: string; title: string; excerpt: string }>> {
        try {
            const workerClient = getWorkerClient();

            // Get all file contents
            const allFiles = this.vaultManager.getAllFiles();
            const fileDataList = await Promise.all(
                allFiles.map(async (file) => ({
                    path: file.path,
                    content: await this.vaultManager.getFileContent(file),
                })),
            );

            // Search via worker
            const searchPayload: SearchContentPayload = {
                query,
                fileContents: fileDataList,
                fuzzy: true,
            };

            const results = await workerClient.searchContent(searchPayload);

            // Convert to rich results
            return results.matches.slice(0, maxResults).map((match) => {
                const file = this.vaultManager.getFileByPath(match.filePath);
                const content =
                    fileDataList.find((f) => f.path === match.filePath)?.content || "";
                const excerpt = content.substring(0, 200).replace(/\n/g, " ");

                return {
                    path: match.filePath,
                    title: file?.basename ?? match.filePath,
                    excerpt,
                };
            });
        } catch (error) {
            console.error("[ContextAssembler] Search failed:", error);
            return [];
        }
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AssemblerConfig>): void {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * Get current configuration
     */
    getConfig(): AssemblerConfig {
        return { ...this.config };
    }
}

// Export factory function
export function createContextAssembler(
    vaultManager: VaultManager,
    config?: Partial<AssemblerConfig>,
): ContextAssembler {
    const finalConfig = { ...DEFAULT_ASSEMBLER_CONFIG, ...config };
    return new ContextAssembler(vaultManager, finalConfig);
}
