/**
 * Graph Engine - Runs in Web Worker (Off-Main-Thread)
 *
 * Handles all graph traversal, link resolution, and hierarchical structuring.
 * This logic is computationally expensive and blocks UI when on Main Thread,
 * so it's isolated here to execute asynchronously.
 * 
 * Two modes of operation:
 * 1. Content-based (analyzeGraph): Parses file content with regex
 * 2. Snapshot-based (analyzeResolvedGraph): Uses pre-captured MetadataCache snapshot
 */

import type {
    AnalyzeGraphPayload,
    GraphAnalysisResult,
    GraphEdge,
    GraphNode,
    GraphStructure,
    ResolvedLinksSnapshot,
} from "../core/types";

// ============================================================================
// Resolved Links Engine (Snapshot-based)
// ============================================================================

/**
 * Engine for processing MetadataCache snapshots
 * 
 * This class handles pre-resolved links from Obsidian's MetadataCache,
 * avoiding the need for regex parsing. More accurate than content-based.
 */
export class ResolvedGraphEngine {
    private links: ResolvedLinksSnapshot;
    private allFiles: Set<string>;
    private backlinkCache: Map<string, string[]> | null = null;

    constructor(links: ResolvedLinksSnapshot, allFiles: string[]) {
        this.links = links;
        this.allFiles = new Set(allFiles);
    }

    /**
     * Build reverse index (backlinks) for efficient "who links to me?" queries
     * 
     * This runs in Worker so CPU time is acceptable.
     * Only built once per engine instance (lazy initialization).
     */
    private buildBacklinks(): void {
        if (this.backlinkCache) return;

        this.backlinkCache = new Map();

        for (const [source, targets] of Object.entries(this.links)) {
            for (const target of Object.keys(targets)) {
                const existing = this.backlinkCache.get(target);
                if (existing) {
                    existing.push(source);
                } else {
                    this.backlinkCache.set(target, [source]);
                }
            }
        }
    }

    /**
     * Get all neighbors of a node (both directions)
     */
    private getNeighbors(node: string): {
        outgoing: string[];
        incoming: string[];
    } {
        this.buildBacklinks();

        const outgoing = Object.keys(this.links[node] || {});
        const incoming = this.backlinkCache?.get(node) || [];

        return { outgoing, incoming };
    }

    /**
     * BFS traversal to find neighborhood within maxDepth hops
     * 
     * Returns nodes categorized by their relationship to startNode:
     * - focal: The starting node itself
     * - outgoing: Nodes that startNode links TO
     * - incoming: Nodes that link TO startNode
     * - bidirectional: Nodes with links in both directions
     */
    public analyzeNeighborhood(startNode: string, maxDepth: number): GraphAnalysisResult {
        const startTime = performance.now();

        this.buildBacklinks();

        type NodeInfo = {
            hop: number;
            type: 'focal' | 'outgoing' | 'incoming' | 'bidirectional';
            linkCount: number;
        };

        const nodeMap: Record<string, NodeInfo> = {};
        const visited = new Set<string>([startNode]);
        const queue: { node: string; depth: number }[] = [{ node: startNode, depth: 0 }];

        // Get direct neighbors for bidirectional detection
        const { outgoing: directOutgoing, incoming: directIncoming } = this.getNeighbors(startNode);
        const directOutgoingSet = new Set(directOutgoing);
        const directIncomingSet = new Set(directIncoming);

        // Add focal node
        nodeMap[startNode] = {
            hop: 0,
            type: 'focal',
            linkCount: directOutgoing.length + directIncoming.length,
        };

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) continue;

            const { node, depth } = current;

            if (depth >= maxDepth) continue;

            const { outgoing, incoming } = this.getNeighbors(node);

            // Process outgoing links
            for (const neighbor of outgoing) {
                if (!visited.has(neighbor) && this.allFiles.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ node: neighbor, depth: depth + 1 });

                    // Determine type based on relationship to startNode
                    const isOutgoing = directOutgoingSet.has(neighbor);
                    const isIncoming = directIncomingSet.has(neighbor);

                    nodeMap[neighbor] = {
                        hop: depth + 1,
                        type: isOutgoing && isIncoming ? 'bidirectional' :
                            isOutgoing ? 'outgoing' :
                                isIncoming ? 'incoming' : 'outgoing',
                        linkCount: this.getNeighbors(neighbor).outgoing.length +
                            this.getNeighbors(neighbor).incoming.length,
                    };
                }
            }

            // Process incoming links
            for (const neighbor of incoming) {
                if (!visited.has(neighbor) && this.allFiles.has(neighbor)) {
                    visited.add(neighbor);
                    queue.push({ node: neighbor, depth: depth + 1 });

                    const isOutgoing = directOutgoingSet.has(neighbor);
                    const isIncoming = directIncomingSet.has(neighbor);

                    nodeMap[neighbor] = {
                        hop: depth + 1,
                        type: isOutgoing && isIncoming ? 'bidirectional' :
                            isOutgoing ? 'outgoing' :
                                isIncoming ? 'incoming' : 'incoming',
                        linkCount: this.getNeighbors(neighbor).outgoing.length +
                            this.getNeighbors(neighbor).incoming.length,
                    };
                }
            }
        }

        // Sort by relevance: bidirectional > hop 1 > hop 2, then by linkCount
        const relatedFiles = Object.entries(nodeMap)
            .filter(([path]) => path !== startNode)
            .sort(([, a], [, b]) => {
                // Bidirectional links first
                if (a.type === 'bidirectional' && b.type !== 'bidirectional') return -1;
                if (b.type === 'bidirectional' && a.type !== 'bidirectional') return 1;
                // Then by hop distance
                if (a.hop !== b.hop) return a.hop - b.hop;
                // Then by link count (more connected = more important)
                return b.linkCount - a.linkCount;
            })
            .map(([path]) => path);

        const executionMs = performance.now() - startTime;

        return {
            relatedFiles,
            nodeMap,
            stats: {
                totalNodes: Object.keys(nodeMap).length,
                executionMs,
            },
        };
    }
}

// Factory function for ResolvedGraphEngine
export function createResolvedGraphEngine(
    links: ResolvedLinksSnapshot,
    allFiles: string[]
): ResolvedGraphEngine {
    return new ResolvedGraphEngine(links, allFiles);
}

// ============================================================================
// Content-based Graph Engine (Legacy/Fallback)
// ============================================================================

export class GraphEngine {
    private fileIndex: Map<string, { content: string; title: string }> =
        new Map();

    /**
     * Initialize graph engine with file metadata
     */
    public initializeIndex(
        files: Array<{ path: string; content: string; title?: string }>,
    ): void {
        this.fileIndex.clear();
        for (const file of files) {
            const title = file.title || file.path.split("/").pop() || "Unknown";
            this.fileIndex.set(file.path, {
                content: file.content,
                title,
            });
        }
    }

    /**
     * Build graph context using BFS (Breadth-First Search)
     * from a given root file to discover related notes
     */
    public analyzeGraph(payload: AnalyzeGraphPayload): GraphStructure {
        const { rootFilePath, maxHops, allFiles } = payload;

        // Initialize index with all files
        this.initializeIndex(allFiles);

        const nodes: GraphNode[] = [];
        const edges: GraphEdge[] = [];
        const visited = new Set<string>();
        const queue: Array<{ path: string; hop: number }> = [
            { path: rootFilePath, hop: 0 },
        ];

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current || visited.has(current.path)) continue;

            visited.add(current.path);

            // Get file info from index
            const fileInfo = this.fileIndex.get(current.path);
            if (!fileInfo) continue;

            // Create node
            nodes.push({
                filePath: current.path,
                title: fileInfo.title,
                level: current.hop,
                preview: fileInfo.content.substring(0, 150),
            });

            // Stop if max hops reached
            if (current.hop >= maxHops) continue;

            // Find linked files
            const linkedFiles = this.extractLinks(current.path, fileInfo.content);

            for (const linked of linkedFiles) {
                if (!visited.has(linked.path)) {
                    queue.push({ path: linked.path, hop: current.hop + 1 });
                }

                // Create edge
                edges.push({
                    source: current.path,
                    target: linked.path,
                    type: linked.type,
                    weight: linked.weight,
                });
            }
        }

        return {
            nodes,
            edges,
            metadata: {
                generatedAt: Date.now(),
                rootFile: rootFilePath,
                hopCount: maxHops,
            },
        };
    }

    /**
     * Extract all links from markdown content
     * Supports: [[internal-links]], #tags, [[alias|display]]
     */
    private extractLinks(
        sourcePath: string,
        content: string,
    ): Array<{
        path: string;
        type: "backlink" | "tag" | "alias";
        weight: number;
    }> {
        const links: Array<{
            path: string;
            type: "backlink" | "tag" | "alias";
            weight: number;
        }> = [];

        // Internal links: [[path/to/note]] or [[path/to/note|display]]
        const internalLinkRegex = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
        let match: RegExpExecArray | null = internalLinkRegex.exec(content);
        while (match !== null) {
            const linkedPath = match[1]?.trim();
            if (linkedPath && this.fileIndex.has(linkedPath)) {
                links.push({
                    path: linkedPath,
                    type: "backlink",
                    weight: 1.0,
                });
            }
            match = internalLinkRegex.exec(content);
        }

        // Hashtags: #tag-name
        const tagRegex = /#([\w-]+)/g;
        match = tagRegex.exec(content);
        while (match !== null) {
            const tag = match[1];
            // Find files with matching tags in frontmatter (simplified)
            // In real implementation, parse YAML frontmatter
            for (const [filePath, fileInfo] of this.fileIndex) {
                if (filePath !== sourcePath && fileInfo.content.includes(`#${tag}`)) {
                    links.push({
                        path: filePath,
                        type: "tag",
                        weight: 0.7,
                    });
                }
            }
            match = tagRegex.exec(content);
        }

        // Remove duplicates by path + type
        const unique = Array.from(
            new Map(links.map((l) => [`${l.path}:${l.type}`, l])).values(),
        );

        return unique;
    }

    /**
     * Score relatedness of nodes based on graph distance and link types
     */
    public scoreRelatedness(graph: GraphStructure, targetPath: string): number {
        const node = graph.nodes.find((n) => n.filePath === targetPath);
        if (!node) return 0;

        // Simple scoring: closer nodes (lower level) get higher score
        // level 0 = root (not scored), level 1 = 1.0, level 2 = 0.7, etc.
        const hopDistance = node.level;
        const baseScore = Math.max(0, 1 - (hopDistance - 1) * 0.3);

        // Weight by edge types
        const incomingEdges = graph.edges.filter((e) => e.target === targetPath);
        const weightBoost = incomingEdges.reduce((sum, e) => sum + e.weight, 0);

        return baseScore * (1 + weightBoost * 0.1);
    }

    /**
     * Get k nearest neighbors by graph distance
     */
    public getTopRelatedNotes(
        graph: GraphStructure,
        limit: number = 5,
    ): string[] {
        const scoredPaths = graph.nodes
            .filter((n) => n.level > 0) // Exclude root node
            .map((n) => ({
                path: n.filePath,
                score: this.scoreRelatedness(graph, n.filePath),
            }))
            .sort((a, b) => b.score - a.score);

        return scoredPaths.slice(0, limit).map((s) => s.path);
    }
}

// Export singleton instance for worker
export const graphEngine = new GraphEngine();
