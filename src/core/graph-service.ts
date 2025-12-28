/**
 * Graph Service - Main Thread Graph Data Extraction
 *
 * This service wraps Obsidian's MetadataCache to extract graph data
 * for neighborhood analysis. Unlike the Web Worker GraphEngine which
 * processes content with regex, this service uses Obsidian's native
 * resolved links for accurate graph traversal.
 *
 * Key Concepts:
 * - Forward Links (Outgoing): Links FROM the current file TO other files
 * - Resolved Links: Cached mapping of source → targets (from MetadataCache)
 * - Backlinks (Incoming): Links TO the current file FROM other files
 *
 * Graph(File) = OutgoingLinks(File) + IncomingLinks(File)
 */

import type { App, TFile } from "obsidian";
import { TFolder } from "obsidian";
import type {
	AnalyzeResolvedGraphPayload,
	GraphAnalysisResult,
	ResolvedLinksSnapshot,
} from "./types";
import { getWorkerClient, type WorkerClient } from "./worker-client";

// ============================================================================
// Types
// ============================================================================

export type NeighborhoodNodeType = "focal" | "outgoing" | "incoming";

export interface NeighborhoodNode {
	path: string;
	basename: string;
	type: NeighborhoodNodeType;
	/** Link count (how many times this file is linked) */
	linkCount?: number;
}

export interface NeighborhoodResult {
	nodes: NeighborhoodNode[];
	focalNode: NeighborhoodNode;
	outgoingCount: number;
	incomingCount: number;
}

export interface RawLinkInfo {
	/** The raw link text (e.g., "Note B" from [[Note B]]) */
	link: string;
	/** Display text if aliased (e.g., "display" from [[Note B|display]]) */
	displayText?: string;
	/** Position in the source file */
	position: {
		start: { line: number; col: number; offset: number };
		end: { line: number; col: number; offset: number };
	};
}

export interface ResolvedLinkMap {
	/** sourcePath → { targetPath → linkCount } */
	[sourcePath: string]: Record<string, number>;
}

export interface BacklinkResult {
	path: string;
	basename: string;
	linkCount: number;
}

// ============================================================================
// Graph Service Implementation
// ============================================================================

export class GraphService {
	private workerClient: WorkerClient;

	constructor(private app: App) {
		this.workerClient = getWorkerClient();
	}

	// ========================================================================
	// Smart Context (Worker-based Analysis)
	// ========================================================================

	/**
	 * Get smart context using Worker for heavy computation
	 *
	 * This is the primary method for AI context building.
	 * Uses the "Snapshot & Compute" pattern:
	 * 1. Capture resolvedLinks snapshot from MetadataCache
	 * 2. Send to Worker for BFS/PageRank computation
	 * 3. Return ranked list of related files
	 *
	 * @param activeFile - The focal file to analyze
	 * @param maxDepth - Maximum BFS traversal depth (default: 2)
	 */
	public async getSmartContext(
		activeFile: TFile,
		maxDepth: number = 2,
	): Promise<GraphAnalysisResult> {
		// 1. Capture snapshot from MetadataCache
		const snapshot = this.captureLinksSnapshot();

		// 2. Prepare payload for worker
		const payload: AnalyzeResolvedGraphPayload = {
			startNode: activeFile.path,
			links: snapshot.links,
			allFiles: snapshot.allFiles,
			maxDepth,
		};

		// 3. Send to worker and await result
		return this.workerClient.analyzeResolvedGraph(payload);
	}

	/**
	 * Capture a snapshot of the current link graph
	 *
	 * Creates a serializable copy of MetadataCache data
	 * that can be sent to the Worker thread.
	 */
	public captureLinksSnapshot(): {
		links: ResolvedLinksSnapshot;
		allFiles: string[];
	} {
		// Get resolved links (already serializable: Record<string, Record<string, number>>)
		const links = this.app.metadataCache.resolvedLinks;

		// Get all markdown file paths
		const allFiles = this.app.vault.getMarkdownFiles().map((f) => f.path);

		return { links, allFiles };
	}

	// ========================================================================
	// Core API Methods
	// ========================================================================

	/**
	 * Get 1-hop neighborhood of a file (focal + direct connections)
	 *
	 * This is the primary method for context-aware features.
	 * Returns all directly connected files in both directions.
	 */
	public getNeighborhood(file: TFile): NeighborhoodResult {
		const nodes: NeighborhoodNode[] = [];

		// 1. Add focal node (the file itself)
		const focalNode: NeighborhoodNode = {
			path: file.path,
			basename: file.basename,
			type: "focal",
		};
		nodes.push(focalNode);

		// 2. Get outgoing links (file → others)
		const outgoingNodes = this.getOutgoingNodes(file);
		nodes.push(...outgoingNodes);

		// 3. Get incoming links (others → file)
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
	 * Get raw (unresolved) links from file content
	 *
	 * Returns the raw text of links as written in the file.
	 * Useful for understanding link structure before resolution.
	 */
	public getRawLinks(file: TFile): RawLinkInfo[] {
		const cache = this.app.metadataCache.getFileCache(file);
		if (!cache?.links) return [];

		return cache.links.map((link) => ({
			link: link.link,
			displayText: link.displayText,
			position: link.position,
		}));
	}

	/**
	 * Get resolved outgoing links from file
	 *
	 * Uses Obsidian's resolvedLinks cache for accurate path resolution.
	 * This accounts for aliases, folder structure, and renamed files.
	 */
	public getResolvedForwardLinks(file: TFile): Record<string, number> {
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		return resolvedLinks[file.path] || {};
	}

	/**
	 * Get all backlinks to a file
	 *
	 * Note: Obsidian doesn't expose backlinks directly.
	 * We compute them by scanning resolvedLinks in reverse.
	 */
	public getBacklinks(targetFilePath: string): BacklinkResult[] {
		const resolvedLinks = this.app.metadataCache.resolvedLinks;
		const backlinks: BacklinkResult[] = [];

		// Iterate through all source files
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

	/**
	 * Get all resolved links in the vault
	 *
	 * Returns the complete link graph as maintained by Obsidian.
	 * Format: { [sourcePath]: { [targetPath]: linkCount } }
	 */
	public getAllResolvedLinks(): ResolvedLinkMap {
		return this.app.metadataCache.resolvedLinks;
	}

	/**
	 * Get unresolved links (links pointing to non-existent files)
	 */
	public getUnresolvedLinks(): Record<string, Record<string, number>> {
		return this.app.metadataCache.unresolvedLinks;
	}

	// ========================================================================
	// Extended Graph Traversal
	// ========================================================================

	/**
	 * Get n-hop neighborhood using BFS
	 *
	 * Traverses the graph up to maxHops levels deep.
	 * Useful for building extended context windows.
	 *
	 * @param file - Starting file
	 * @param maxHops - Maximum traversal depth (default: 2)
	 */
	public getNHopNeighborhood(
		file: TFile,
		maxHops: number = 2,
	): Map<string, { node: NeighborhoodNode; hop: number }> {
		const visited = new Map<string, { node: NeighborhoodNode; hop: number }>();
		const queue: Array<{ file: TFile; hop: number }> = [{ file, hop: 0 }];

		while (queue.length > 0) {
			const current = queue.shift();
			if (!current) continue;

			const { file: currentFile, hop } = current;

			// Skip if already visited
			if (visited.has(currentFile.path)) continue;

			visited.set(currentFile.path, {
				node: {
					path: currentFile.path,
					basename: currentFile.basename,
					type: hop === 0 ? "focal" : "outgoing",
				},
				hop,
			});

			// Stop traversing deeper if we've reached max hops
			if (hop >= maxHops) continue;

			// Get connected files and add to queue
			const forwardLinks = this.getResolvedForwardLinks(currentFile);
			for (const targetPath of Object.keys(forwardLinks)) {
				if (!visited.has(targetPath)) {
					const targetFile = this.app.vault.getAbstractFileByPath(targetPath);
					if (targetFile && !(targetFile instanceof TFolder)) {
						queue.push({ file: targetFile as TFile, hop: hop + 1 });
					}
				}
			}
		}

		return visited;
	}

	/**
	 * Calculate link density (connectivity) of a file
	 *
	 * Higher density = more connected = potentially more important
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

	// ========================================================================
	// Internal Helpers
	// ========================================================================

	/**
	 * Convert resolved forward links to NeighborhoodNodes
	 */
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

	/**
	 * Get incoming nodes, avoiding duplicates with outgoing
	 */
	private getIncomingNodes(
		file: TFile,
		existingOutgoing: NeighborhoodNode[],
	): NeighborhoodNode[] {
		const backlinks = this.getBacklinks(file.path);
		const outgoingPaths = new Set(existingOutgoing.map((n) => n.path));
		const nodes: NeighborhoodNode[] = [];

		for (const backlink of backlinks) {
			// Skip if already counted as outgoing (bidirectional link)
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
}

// ============================================================================
// Factory Function
// ============================================================================

export function createGraphService(app: App): GraphService {
	return new GraphService(app);
}
