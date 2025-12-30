/**
 * Context Assembler
 *
 * Orchestrator that coordinates data from multiple sources:
 * - VaultManager (reads from Obsidian)
 * - GraphService (manages graph context)
 * - CloudflareService (external AI API)
 */

import type {
	ContextPayload,
	GraphStructure,
	SearchContentPayload,
} from "./types";
import type { VaultManager } from "./vault-manager";
import type { GraphService } from "./graph-service";
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

	constructor(
		private vaultManager: VaultManager,
		private graphService: GraphService,
		private config: AssemblerConfig = DEFAULT_ASSEMBLER_CONFIG,
	) {}

	/**
	 * Assemble complete context for AI processing
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

			// 2. Get smart context (Graph + Spreading Activation)
			const graphAnalysis = await this.graphService.getSmartContext(activeFile);

			// 3. Get related notes content
			const relatedNotes = await this.enrichRelatedNotes(
				graphAnalysis.relatedFiles,
				this.config.maxRelatedNotes,
			);

			// 4. Assemble payload
			const payload: ContextPayload = {
				activeFile: activeFilePath,
				activeFileContent: activeContent,
				activeFileStructure: activeStructure,
				graphContext: {
					nodes: [],
					edges: [],
					metadata: {
						generatedAt: Date.now(),
						rootFile: activeFilePath,
						hopCount: 0,
					},
				}, // Mock for now
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
	 * Enrich related files with content and metadata
	 */
	private async enrichRelatedNotes(
		filePaths: string[],
		limit: number,
	): Promise<ContextPayload["relatedNotes"]> {
		const topPaths = filePaths.slice(0, limit);

		const relatedNotes = await Promise.all(
			topPaths.map(async (path) => {
				const file = this.vaultManager.getFileByPath(path);
				if (!file) return null;

				const content = await this.vaultManager.getFileContent(file);
				const excerpt = content.substring(0, 200).replace(/\n/g, " ");

				// TODO: Propagate relevance score from GraphService
				return {
					path,
					title: file.basename,
					relevance: 1.0,
					excerpt,
				};
			}),
		);

		return relatedNotes.filter((n): n is Exclude<typeof n, null> => n !== null);
	}

	/**
	 * Debounced graph rebuild
	 * NOTE: GraphService now handles graph state, but we facilitate UI triggers.
	 */
	async rebuildGraphDebounced(
		rootFilePath: string,
		delay: number = this.config.debounceDelay,
	): Promise<void> {
		// Since GraphService manages the graph, maybe we just re-init?
		// Or we assume it's always up-to-date.
		// Kept for API compatibility.
		return;
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
	graphService: GraphService,
	config?: Partial<AssemblerConfig>,
): ContextAssembler {
	const finalConfig = { ...DEFAULT_ASSEMBLER_CONFIG, ...config };
	return new ContextAssembler(vaultManager, graphService, finalConfig);
}
