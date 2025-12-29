/**
 * Worker Client - Main Thread Bridge
 *
 * This module manages the lifecycle of the Web Worker and provides
 * async-friendly methods to communicate with it via postMessage.
 *
 * Design Pattern: Singleton with Promise-based API
 *
 * Usage:
 * ```typescript
 * const client = WorkerClient.getInstance();
 * const graphResult = await client.analyzeGraph({ ... });
 * ```
 */

import type {
    AnalyzeGraphPayload,
    AnalyzeResolvedGraphPayload,
    GraphAnalysisResult,
    GraphStructure,
    SearchContentPayload,
    SearchResults,
    UpdateMetadataPayload,
    WorkerMessage,
    WorkerMessageType,
    WorkerResponse,
} from "../core/types";

// Bundled worker blob (handled by esbuild webWorkerPlugin)
import contextWorkerBlob from "../workers/context.worker";

type PendingRequest = {
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
    timeout: NodeJS.Timeout;
};

export class WorkerClient {
    private static instance: WorkerClient | null = null;
    private worker: Worker | null = null;
    private workerUrl: string | null = null;
    private pendingRequests: Map<string, PendingRequest> = new Map();
    private isReady = false;
    private messageQueue: WorkerMessage[] = [];
    private readonly REQUEST_TIMEOUT = 30000; // 30 seconds
    private readonly HEARTBEAT_INTERVAL = 10000; // 10 seconds
    private heartbeatFailures = 0;

    private constructor() {
        this.initializeWorkerAsync();
        this.startHeartbeat();
    }

    /**
     * Initialize worker asynchronously
     */
    private async initializeWorkerAsync(): Promise<void> {
        await this.initializeWorker();
    }

    /**
     * Get singleton instance
     */
    public static getInstance(): WorkerClient {
        if (!WorkerClient.instance) {
            WorkerClient.instance = new WorkerClient();
        }
        return WorkerClient.instance;
    }

    /**
     * Initialize worker from bundled code
     *
     * For Obsidian plugins, we need to handle worker creation carefully
     * to work in both desktop (Electron) and mobile contexts.
     *
     * The esbuild config bundles src/workers/context.worker.ts into
     * a blob that can be instantiated as a Worker.
     */
    private async initializeWorker(): Promise<void> {
        try {
            // Create worker from bundled blob
            this.workerUrl = URL.createObjectURL(contextWorkerBlob);
            this.worker = new Worker(this.workerUrl);

            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);

            console.log("[WorkerClient] Worker initialized successfully");
        } catch (error) {
            console.error("[WorkerClient] Failed to initialize worker:", error);
            // Fallback: try to create an inline worker
            this.createInlineWorker();
        }
    }

    /**
     * Create inline worker as fallback (for development/debugging)
     *
     * This allows the plugin to work even if worker bundling fails,
     * though it won't have the performance benefits of off-main-thread processing.
     */
    private createInlineWorker(): void {
        try {
            // Inline worker code (same as context.worker.ts)
            const workerCode = `
                // Inline worker placeholder
                // In production, this is bundled by esbuild
                self.onmessage = function(event) {
                    self.postMessage({
                        id: event.data.id,
                        success: false,
                        error: 'Worker not properly initialized'
                    });
                };
                self.postMessage({ id: '__INIT__', success: true });
            `;

            const blob = new Blob([workerCode], { type: "application/javascript" });
            this.workerUrl = URL.createObjectURL(blob);

            this.worker = new Worker(this.workerUrl);
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);

            console.warn("[WorkerClient] Using fallback inline worker");
        } catch (error) {
            console.error("[WorkerClient] Failed to create fallback worker:", error);
        }
    }

    /**
     * Get worker code as string (legacy, no longer used)
     * Kept for reference
     */
    private getWorkerCode(): string {
        // This is replaced by dynamic import in initializeWorker()
        return `// Worker code is now imported dynamically`;
    }

    /**
     * Handle messages from worker
     */
    private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
        const { id, success, data, error } = event.data;

        // Mark worker as ready on init message
        if (id === "__INIT__") {
            this.isReady = true;
            this.flushMessageQueue();
            return;
        }

        // Find corresponding pending request
        const pending = this.pendingRequests.get(id);
        if (!pending) {
            console.warn(
                `[WorkerClient] Received response for unknown request: ${id}`,
            );
            return;
        }

        this.pendingRequests.delete(id);
        clearTimeout(pending.timeout);

        if (success) {
            pending.resolve(data);
        } else {
            pending.reject(new Error(error || "Unknown worker error"));
        }
    }

    /**
     * Handle worker errors
     */
    private handleWorkerError(error: ErrorEvent): void {
        console.error("[WorkerClient] Worker error:", error.message);
        // TODO: Notify UI about critical worker failure
        // For now, queue message and hope worker recovers
    }

    /**
     * Generate UUID v4
     */
    private generateUUID(): string {
        return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === "x" ? r : (r & 0x3) | 0x8;
            return v.toString(16);
        });
    }

    /**
     * Send message to worker and wait for response
     */
    private async sendMessage<T>(
        type: WorkerMessageType,
        payload: unknown,
    ): Promise<T> {
        if (!this.worker) {
            throw new Error("Worker not initialized");
        }

        const message: WorkerMessage = {
            id: this.generateUUID(),
            type,
            payload,
            timestamp: Date.now(),
        };

        // Queue if not ready
        if (!this.isReady) {
            this.messageQueue.push(message);
        }

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(message.id);
                reject(new Error(`Worker request timeout: ${type}`));
            }, this.REQUEST_TIMEOUT);

            this.pendingRequests.set(message.id, { resolve, reject, timeout });

            // Send message if worker is ready
            if (this.isReady && this.worker) {
                this.worker.postMessage(message);
            }
        });
    }

    /**
     * Flush queued messages once worker is ready
     */
    private flushMessageQueue(): void {
        while (this.messageQueue.length > 0) {
            const message = this.messageQueue.shift();
            if (message) {
                this.worker?.postMessage(message);
            }
        }
    }

    /**
     * Start heartbeat to detect worker failure
     */
    private startHeartbeat(): void {
        setInterval(() => {
            if (this.isReady && this.worker) {
                this.sendMessage("WORKER_READY", {}).catch((error) => {
                    console.warn("[WorkerClient] Heartbeat failed:", error);
                    this.isReady = false;
                    this.heartbeatFailures += 1;
                    // Best-effort recovery if worker becomes unresponsive
                    if (this.heartbeatFailures >= 2) {
                        this.heartbeatFailures = 0;
                        this.restart();
                    }
                });
            }
        }, this.HEARTBEAT_INTERVAL);
    }

    // ========================================================================
    // Public API
    // ========================================================================

    /**
     * Analyze graph structure starting from a root file
     */
    public async analyzeGraph(
        payload: AnalyzeGraphPayload,
    ): Promise<GraphStructure> {
        return this.sendMessage<GraphStructure>("ANALYZE_GRAPH", payload);
    }

    /**
     * Analyze graph using pre-captured MetadataCache snapshot
     * 
     * This is the preferred method for graph analysis as it uses
     * Obsidian's resolved links for accuracy. The Main Thread captures
     * the snapshot and sends it here for off-main-thread processing.
     * 
     * @param payload - Contains startNode, links snapshot, allFiles list, maxDepth
     * @returns GraphAnalysisResult with ranked related files
     */
    public async analyzeResolvedGraph(
        payload: AnalyzeResolvedGraphPayload,
    ): Promise<GraphAnalysisResult> {
        return this.sendMessage<GraphAnalysisResult>("ANALYZE_RESOLVED_GRAPH", payload);
    }

    /**
     * Search for content across files
     */
    public async searchContent(
        payload: SearchContentPayload,
    ): Promise<SearchResults> {
        return this.sendMessage<SearchResults>("SEARCH_CONTENT", payload);
    }

    /**
     * Update file metadata index in worker
     */
    public async updateMetadata(
        payload: UpdateMetadataPayload,
    ): Promise<{ indexed: number }> {
        return this.sendMessage<{ indexed: number }>("UPDATE_METADATA", payload);
    }

    /**
     * Check if worker is ready
     */
    public getIsReady(): boolean {
        return this.isReady;
    }

    /**
     * Gracefully terminate worker
     */
    public terminate(): void {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
            this.isReady = false;
            this.pendingRequests.clear();
            if (this.workerUrl) {
                URL.revokeObjectURL(this.workerUrl);
                this.workerUrl = null;
            }
            console.log("[WorkerClient] Worker terminated");
        }
    }

    /**
     * Restart worker (for recovery from failures)
     */
    public restart(): void {
        this.terminate();
        this.messageQueue = [];
        this.pendingRequests.clear();
        this.initializeWorker();
    }
}

// Export singleton accessor
export function getWorkerClient(): WorkerClient {
    return WorkerClient.getInstance();
}
