/**
 * Core Domain Types
 *
 * This file defines shared interfaces used across the application.
 * These types ensure type safety between:
 * - Main Thread (Plugin, UI, Services)
 * - Worker Thread (Graph Engine, Search Engine)
 * - External Services (Cloudflare API)
 */

// ============================================================================
// Graph & Link Structures
// ============================================================================

export interface GraphNode {
	filePath: string;
	title: string;
	level: number; // For hierarchical sorting
	preview?: string; // First 100 chars of content
}

export interface GraphEdge {
	source: string; // source file path
	target: string; // target file path
	type: "backlink" | "tag" | "alias" | "mention";
	weight: number; // relevance score (0-1)
}

export interface GraphStructure {
	nodes: GraphNode[];
	edges: GraphEdge[];
	metadata: {
		generatedAt: number; // timestamp
		rootFile: string;
		hopCount: number;
	};
}

// ============================================================================
// Neighborhood Graph (MetadataCache-based)
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

export interface BacklinkResult {
	path: string;
	basename: string;
	linkCount: number;
}

// ============================================================================
// Search Results
// ============================================================================

export interface SearchMatch {
	filePath: string;
	score: number;
	positions: Array<{ start: number; end: number }>;
}

export interface SearchResults {
	matches: SearchMatch[];
	query: string;
	totalMatches: number;
}

// ============================================================================
// Context Payload (for AI Request)
// ============================================================================

export interface ContextPayload {
	activeFile: string;
	activeFileContent: string;
	activeFileStructure: string;
	graphContext: GraphStructure;
	relatedNotes: Array<{
		path: string;
		title: string;
		relevance: number;
		excerpt: string;
	}>;
	userQuery: string;
}

// ============================================================================
// Worker Message Protocol
// ============================================================================

export type WorkerMessageType =
	| "ANALYZE_GRAPH"
	| "ANALYZE_RESOLVED_GRAPH"
	| "SEARCH_CONTENT"
	| "UPDATE_METADATA"
	| "ANALYZE_CONTEXT"
	| "BUILD_GRAPH"
	| "COMPUTE_PAGERANK"
	| "SPREADING_ACTIVATION"
	| "WORKER_READY"
	| "ERROR"
	| "RESPONSE";

export interface WorkerMessage<T = unknown> {
	id: string; // UUID for request/response matching
	type: WorkerMessageType;
	payload: T;
	timestamp: number;
}

// Request payloads
export interface AnalyzeGraphPayload {
	rootFilePath: string;
	maxHops: number;
	allFiles: Array<{ path: string; content: string }>;
}

export interface SearchContentPayload {
	query: string;
	fileContents: Array<{ path: string; content: string }>;
	fuzzy?: boolean;
}

export interface BuildGraphPayload {
	nodes: Array<{ path: string; tags: string[] }>;
	edges: Array<{ source: string; target: string; weight?: number }>;
}

export interface ComputePageRankPayload {
	damping?: number;
	maxIterations?: number;
	tolerance?: number;
}

export interface SpreadingActivationPayload {
	startNode: string;
	decay?: number;
	initialEnergy?: number;
	threshold?: number;
}

export interface UpdateMetadataPayload {
	files: Array<{
		path: string;
		title: string;
		content: string;
	}>;
}

export interface AnalyzeContextPayload {
	activeFile: {
		path: string;
		content: string;
		structure: string;
	};
	query: string;
	graphContext: GraphStructure;
	maxRelatedNotes: number;
}

// ============================================================================
// Snapshot & Compute Pattern (Main Thread → Worker)
// ============================================================================

/**
 * Snapshot of resolvedLinks from MetadataCache
 * Format: { [sourcePath]: { [targetPath]: linkCount } }
 */
export type ResolvedLinksSnapshot = Record<string, Record<string, number>>;

/**
 * Payload for ANALYZE_RESOLVED_GRAPH message
 * Contains pre-captured snapshot from Main Thread
 */
export interface AnalyzeResolvedGraphPayload {
	/** Starting node for BFS traversal */
	startNode: string;
	/** Snapshot of app.metadataCache.resolvedLinks */
	links: ResolvedLinksSnapshot;
	/** List of all existing file paths (for validation) */
	allFiles: string[];
	/** Maximum BFS depth (default: 2) */
	maxDepth: number;
}

/**
 * Result from graph analysis in worker
 */
export interface GraphAnalysisResult {
	/** Files related to startNode, sorted by relevance */
	relatedFiles: string[];
	/** Node metadata with hop distance */
	nodeMap: Record<
		string,
		{
			hop: number;
			type: "focal" | "outgoing" | "incoming" | "bidirectional";
			linkCount: number;
		}
	>;
	/** Execution stats */
	stats: {
		totalNodes: number;
		executionMs: number;
	};
}

export interface PageRankResult {
	scores: Record<string, number>;
}

export interface SpreadingActivationResult {
	activatedNodes: Array<{ path: string; score: number }>;
}

// Response payloads
export interface WorkerResponse<T = unknown> {
	id: string;
	success: boolean;
	data?: T;
	error?: string;
}

// ============================================================================
// Plugin Settings
// ============================================================================

export interface CloudflareConfig {
	accessClientId: string;
	accessClientSecret: string;
	apiEndpoint: string; // e.g., "https://eragear.cloudflare.workers.dev"
}

export interface PluginSettings {
	cloudflare: CloudflareConfig;
	maxGraphHops: number; // default 2
	searchMaxResults: number; // default 20
	debounceDelay: number; // default 2000ms
	enableLogging: boolean;
}

// ============================================================================
// Streaming Response (for AI Chat)
// ============================================================================

export interface StreamChunk {
	id: string;
	chunk: string;
	timestamp: number;
	isDone: boolean;
}

export interface ChatMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: number;
	context?: ContextPayload; // only for user messages
}
