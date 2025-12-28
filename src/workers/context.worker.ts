/**
 * Web Worker Entry Point
 *
 * This file runs in a separate thread and handles all heavy computations.
 * It communicates with the Main Thread via postMessage/onmessage.
 *
 * Architecture:
 * - Main Thread sends JSON messages with { id, type, payload }
 * - Worker processes and responds with { id, success, data/error }
 * - Main Thread maintains promise mapping (id -> resolve/reject)
 *
 * Supported Message Types:
 * - ANALYZE_GRAPH: Content-based graph analysis (legacy)
 * - ANALYZE_RESOLVED_GRAPH: Snapshot-based analysis using MetadataCache data
 * - SEARCH_CONTENT: Full-text search across files
 * - UPDATE_METADATA: Update file index
 */

import type {
    AnalyzeGraphPayload,
    AnalyzeResolvedGraphPayload,
    SearchContentPayload,
    UpdateMetadataPayload,
    WorkerMessage,
    WorkerResponse,
} from "../core/types";
import { createResolvedGraphEngine, graphEngine } from "./graph-engine";
import { searchEngine } from "./search-algo";

// Worker message handler
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { id, type, payload } = event.data;

    try {
        let response: WorkerResponse;

        switch (type) {
            case "ANALYZE_GRAPH": {
                const graphPayload = payload as AnalyzeGraphPayload;
                const graphResult = graphEngine.analyzeGraph(graphPayload);
                response = {
                    id,
                    success: true,
                    data: graphResult,
                };
                break;
            }

            case "ANALYZE_RESOLVED_GRAPH": {
                // Snapshot-based analysis using pre-captured MetadataCache data
                const resolvedPayload = payload as AnalyzeResolvedGraphPayload;
                const { startNode, links, allFiles, maxDepth } = resolvedPayload;

                // Create engine instance with snapshot data
                const engine = createResolvedGraphEngine(links, allFiles);

                // Run BFS analysis
                const analysisResult = engine.analyzeNeighborhood(startNode, maxDepth);

                response = {
                    id,
                    success: true,
                    data: analysisResult,
                };
                break;
            }

            case "SEARCH_CONTENT": {
                const searchPayload = payload as SearchContentPayload;
                const searchResults = searchEngine.search(searchPayload);
                response = {
                    id,
                    success: true,
                    data: searchResults,
                };
                break;
            }

            case "UPDATE_METADATA": {
                const metadataPayload = payload as UpdateMetadataPayload;
                const files = metadataPayload.files.map((f) => ({
                    path: f.path,
                    content: f.content,
                    title: f.title,
                }));
                graphEngine.initializeIndex(files);
                response = {
                    id,
                    success: true,
                    data: { indexed: files.length },
                };
                break;
            }

            case "WORKER_READY": {
                // Handshake to verify worker is alive
                response = {
                    id,
                    success: true,
                    data: { status: "ready" },
                };
                break;
            }

            default: {
                response = {
                    id,
                    success: false,
                    error: `Unknown message type: ${type}`,
                };
            }
        }

        self.postMessage(response);
    } catch (error) {
        const response: WorkerResponse = {
            id,
            success: false,
            error: error instanceof Error ? error.message : "Unknown error",
        };
        self.postMessage(response);
    }
};

// Notify main thread that worker is ready
self.postMessage({
    id: "__INIT__",
    success: true,
    data: { status: "Worker initialized and ready" },
} as WorkerResponse);

// NOTE: This default export is only to satisfy TypeScript when the main thread
// imports this file to obtain the bundled worker Blob via esbuild.
// The webWorkerPlugin replaces this module at build-time with `export default Blob`.
export default null as unknown as Blob;
