/**
 * Cloudflare API Service
 *
 * Secure communication with Eragear Core via Cloudflare Workers.
 *
 * Security Model:
 * - All requests include CF-Access-Client-Id and CF-Access-Client-Secret headers
 * - Tokens stored in plugin settings, never exposed in console/logs
 * - Request/response validation to prevent injection
 * - Streaming responses handled via EventSource or fetch-with-ReadableStream
 *
 * Architecture:
 * This is part of the Infrastructure/Services Layer (External Comms)
 * and should be decoupled from business logic (Core) and UI.
 */

import type {
    CloudflareConfig,
    ContextPayload,
    StreamChunk,
} from "../core/types";

export interface CloudflareServiceConfig {
    config: CloudflareConfig;
    onLog?: (message: string) => void; // For secure logging
}

export class CloudflareService {
    private config: CloudflareConfig;
    private onLog: (message: string) => void;
    private activeStreams: Map<string, AbortController> = new Map();

    constructor({ config, onLog }: CloudflareServiceConfig) {
        this.config = config;
        this.onLog = onLog || (() => { }); // Silent mode if no logger
    }

    /**
     * Send chat request with context to AI backend
     * Returns streaming response via callback
     */
    public async streamChat(
        message: string,
        context: ContextPayload,
        onChunk: (chunk: StreamChunk) => void,
        onError: (error: Error) => void,
    ): Promise<void> {
        const requestId = this.generateRequestId();
        const controller = new AbortController();
        this.activeStreams.set(requestId, controller);

        try {
            const headers = this.buildHeaders();
            const body = JSON.stringify({
                message,
                context,
                requestId,
            });

            this.onLog(`[CF] Sending chat request: ${requestId}`);

            const response = await fetch(`${this.config.apiEndpoint}/chat`, {
                method: "POST",
                headers,
                body,
                signal: controller.signal,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Cloudflare API error ${response.status}: ${errorText}`,
                );
            }

            // Handle streaming response
            if (!response.body) {
                throw new Error("No response body");
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                // Process complete lines (SSE format: "data: {...}\n\n")
                const lines = buffer.split("\n");
                buffer = lines[lines.length - 1] ?? ""; // Keep incomplete line

                for (let i = 0; i < lines.length - 1; i++) {
                    const line = (lines[i] ?? "").trim();
                    if (line.startsWith("data: ")) {
                        try {
                            const jsonStr = line.substring(6);
                            const data = JSON.parse(jsonStr);
                            onChunk({
                                id: requestId,
                                chunk: data.chunk || "",
                                timestamp: Date.now(),
                                isDone: data.isDone || false,
                            });

                            if (data.isDone) {
                                this.onLog(`[CF] Stream completed: ${requestId}`);
                                this.activeStreams.delete(requestId);
                                return;
                            }
                        } catch (e) {
                            console.error("[CF] Failed to parse SSE chunk:", e);
                        }
                    }
                }
            }

            this.activeStreams.delete(requestId);
        } catch (error) {
            this.activeStreams.delete(requestId);
            const err = error instanceof Error ? error : new Error(String(error));
            this.onLog(`[CF] Stream error: ${err.message}`);
            onError(err);
        }
    }

    /**
     * Send simple (non-streaming) request to backend
     */
    public async sendRequest<T = Record<string, unknown>>(
        endpoint: string,
        method: "GET" | "POST" | "PUT" | "DELETE" = "POST",
        body?: Record<string, unknown>,
    ): Promise<T> {
        try {
            const headers = this.buildHeaders();

            const response = await fetch(`${this.config.apiEndpoint}${endpoint}`, {
                method,
                headers,
                body: body ? JSON.stringify(body) : undefined,
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `Cloudflare API error ${response.status}: ${errorText}`,
                );
            }

            const data = await response.json();
            return data as T;
        } catch (error) {
            const err = error instanceof Error ? error : new Error(String(error));
            this.onLog(`[CF] Request error: ${err.message}`);
            throw err;
        }
    }

    /**
     * Test connectivity to Cloudflare endpoint
     */
    public async testConnection(): Promise<boolean> {
        try {
            const result = await this.sendRequest<{ status: string }>("/health");
            return result.status === "ok";
        } catch {
            return false;
        }
    }

    /**
     * Cancel ongoing stream
     */
    public cancelStream(requestId: string): void {
        const controller = this.activeStreams.get(requestId);
        if (controller) {
            controller.abort();
            this.activeStreams.delete(requestId);
            this.onLog(`[CF] Stream cancelled: ${requestId}`);
        }
    }

    /**
     * Build secure headers for Cloudflare authentication
     */
    private buildHeaders(): HeadersInit {
        return {
            "Content-Type": "application/json",
            "CF-Access-Client-Id": this.config.accessClientId,
            "CF-Access-Client-Secret": this.config.accessClientSecret,
            // Additional headers for security
            "User-Agent": "eragear-obsidian-plugin/1.0",
        };
    }

    /**
     * Generate unique request ID for tracking
     */
    private generateRequestId(): string {
        return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    }

    /**
     * Update configuration (e.g., after settings change)
     */
    public updateConfig(newConfig: Partial<CloudflareConfig>): void {
        this.config = { ...this.config, ...newConfig };
        this.onLog("[CF] Configuration updated");
    }

    /**
     * Validate configuration completeness
     */
    public validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.accessClientId) {
            errors.push("Missing CF-Access-Client-Id");
        }
        if (!this.config.accessClientSecret) {
            errors.push("Missing CF-Access-Client-Secret");
        }
        if (!this.config.apiEndpoint) {
            errors.push("Missing API endpoint");
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}

// Export factory function for easy initialization
export function createCloudflareService(
    config: CloudflareConfig,
    onLog?: (message: string) => void,
): CloudflareService {
    return new CloudflareService({ config, onLog });
}
