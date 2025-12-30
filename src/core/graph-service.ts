/**
 * Graph Service - Main Thread Graph Data Extraction
 *
 * This service wraps Obsidian's MetadataCache to extract graph data
 * and communicates with the Worker Thread to perform graph analysis
 * using Graphology (PageRank, Spreading Activation).
 */

import type { App, TFile } from "obsidian";
import { TFolder } from "obsidian";
import type {
	GraphAnalysisResult,
	NeighborhoodNode,
	NeighborhoodResult,
	BacklinkResult,
	BuildGraphPayload,
} from "./types";
import { getWorkerClient, type WorkerClient } from "./worker-client";

export class GraphService {
	private workerClient: WorkerClient;
	private initialized = false;

	constructor(private app: App) {
		this.workerClient = getWorkerClient();
	}

	/**
	 * Initialize the worker graph from current vault state
	 */
	public async initializeGraph(): Promise<void> {
		const payload = this.extractGraph();
		await this.workerClient.buildGraph(payload);

		// Compute initial PageRank
		await this.workerClient.computePageRank({
			damping: 0.85,
			tolerance: 1e-4,
			maxIterations: 100,
		});

		this.initialized = true;
		console.log("[GraphService] Graph initialized and PageRank computed.");
	}

	/**
	 * Extract full graph from MetadataCache
	 */
	private extractGraph(): BuildGraphPayload {
		const files = this.app.vault.getMarkdownFiles();
		const nodes = files.map((f) => {
			const cache = this.app.metadataCache.getFileCache(f);
			return {
				path: f.path,
				tags: cache?.tags?.map((t) => t.tag) || [],
			};
		});

		const edges: Array<{ source: string; target: string; weight?: number }> =
			[];
		const resolvedLinks = this.app.metadataCache.resolvedLinks;

		for (const [source, targets] of Object.entries(resolvedLinks)) {
			for (const [target] of Object.entries(targets)) {
				edges.push({
					source,
					target,
					weight: 1.0, // Simple weight for now
				});
			}
		}

		return { nodes, edges };
	}

	// ========================================================================
	// Smart Context (Worker-based Spreading Activation)
	// ========================================================================

	/**
	 * Get smart context using Spreading Activation
	 *
	 * Replaces the old BFS/Vector approach.
	 */
	public async getSmartContext(
		activeFile: TFile,
		maxDepth?: number,
	): Promise<GraphAnalysisResult> {
		if (!this.initialized) {
			await this.initializeGraph();
		}

		// Run Spreading Activation
		const activationResult = await this.workerClient.spreadingActivation({
			startNode: activeFile.path,
			decay: 0.5,
			initialEnergy: 1.0,
			threshold: 0.05,
		});

		// Map result to GraphAnalysisResult format for compatibility
		const relatedFiles = activationResult.activatedNodes.map((n) => n.path);
		const nodeMap: Record<
			string,
			{
				hop: number;
				type: "focal" | "outgoing" | "incoming" | "bidirectional";
				linkCount: number;
			}
		> = {};

		// Populate nodeMap partially
		activationResult.activatedNodes.forEach((node) => {
			nodeMap[node.path] = {
				hop: 1, // Unknown
				type: "outgoing", // Assumed
				linkCount: Math.round(node.score * 100),
			};
		});

		return {
			relatedFiles,
			nodeMap,
			stats: {
				totalNodes: relatedFiles.length,
				executionMs: 0,
			},
		};
	}

	// ========================================================================
	// Core API Methods (Direct Main Thread access)
	// ========================================================================

	/**
	 * Get 1-hop neighborhood of a file (focal + direct connections)
	 */
	public getNeighborhood(file: TFile): NeighborhoodResult {
		const nodes: NeighborhoodNode[] = [];

		// 1. Add focal node
		const focalNode: NeighborhoodNode = {
			path: file.path,
			basename: file.basename,
			type: "focal",
		};
		nodes.push(focalNode);

		// 2. Get outgoing links
		const outgoingNodes = this.getOutgoingNodes(file);
		nodes.push(...outgoingNodes);

		// 3. Get incoming links
		const incomingNodes = this.getIncomingNodes(file, outgoingNodes);
		nodes.push(...incomingNodes);

		return {
			nodes,
			focalNode,
			outgoingCount: outgoingNodes.length,
			incomingCount: incomingNodes.length,
		};
	}

	/**
	 * Calculate link density (connectivity) of a file
	 */
	public getLinkDensity(file: TFile): {
		outgoing: number;
		incoming: number;
		total: number;
		ratio: number;
	} {
		const outgoing = Object.keys(this.getResolvedForwardLinks(file)).length;
		const incoming = this.getBacklinks(file.path).length;
		const total = outgoing + incoming;
		const ratio = incoming > 0 ? outgoing / incoming : outgoing;

		return { outgoing, incoming, total, ratio };
	}

	/**
	 * Find bidirectional links (files that link to each other)
	 */
	public getBidirectionalLinks(file: TFile): string[] {
		const forwardLinks = new Set(
			Object.keys(this.getResolvedForwardLinks(file)),
		);
		const backlinks = new Set(this.getBacklinks(file.path).map((b) => b.path));

		// Intersection of forward and back links
		return [...forwardLinks].filter((path) => backlinks.has(path));
	}

	private getOutgoingNodes(file: TFile): NeighborhoodNode[] {
		const forwardLinks = this.getResolvedForwardLinks(file);
		const nodes: NeighborhoodNode[] = [];

		for (const [targetPath, linkCount] of Object.entries(forwardLinks)) {
			const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
			if (targetFile && !(targetFile instanceof TFolder)) {
				nodes.push({
					path: targetPath,
					basename: (targetFile as TFile).basename,
					type: "outgoing",
					linkCount,
				});
			}
		}
		return nodes;
	}

	private getIncomingNodes(
		file: TFile,
		existingOutgoing: NeighborhoodNode[],
	): NeighborhoodNode[] {
		const backlinks = this.getBacklinks(file.path);
		const outgoingPaths = new Set(existingOutgoing.map((n) => n.path));
		const nodes: NeighborhoodNode[] = [];

		for (const backlink of backlinks) {
			if (outgoingPaths.has(backlink.path)) continue;

			nodes.push({
				path: backlink.path,
				basename: backlink.basename,
				type: "incoming",
				linkCount: backlink.linkCount,
			});
		}
		return nodes;
	}

	public getResolvedForwardLinks(file: TFile): Record<string, number> {
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		return resolvedLinks[file.path] || {};
	}

	public getBacklinks(targetFilePath: string): BacklinkResult[] {
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		const backlinks: BacklinkResult[] = [];

		for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
			const linkCount = targets[targetFilePath];
			if (linkCount && linkCount > 0) {
				const sourceFile = this.app.vault.getAbstractFileByPath(sourcePath);
				if (sourceFile instanceof TFolder) continue;

				backlinks.push({
					path: sourcePath,
					basename:
						sourcePath.split("/").pop()?.replace(/\.md$/, "") || sourcePath,
					linkCount,
				});
			}
		}
		return backlinks;
	}
}

export function createGraphService(app: App): GraphService {
	return new GraphService(app);
}
