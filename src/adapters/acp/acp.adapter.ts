/**
 * AcpAdapter - Adapter for Agent Client Protocol (ACP) SDK
 *
 * This adapter implements IAgentClient to communicate with ACP-compliant agents
 * via stdio (stdin/stdout). It handles:
 * - Process lifecycle management (spawn, kill, cleanup)
 * - Bidirectional streaming communication
 * - Session management and state tracking
 * - Event subscription with proper cleanup
 *
 * @see ../docs/acp/acp-overview.md
 */

import * as acp from "@agentclientprotocol/sdk";
import { type ChildProcess, spawn } from "child_process";
import type { App } from "obsidian";
import { TerminalManager } from "../../core/terminal-manager";
import { VaultManager } from "../../core/vault-manager";
import type { AgentConfig } from "../../domain/models/agent-config";
import { AgentError } from "../../domain/models/agent-error";
import type {
	SessionModelState,
	SessionUpdate,
	ToolCallLocation,
} from "../../domain/models/session-update";
import {
	ConnectionState,
	type IAgentClient,
	type InitializeResult,
	type NewSessionResult,
	type Subscription,
} from "../../domain/ports/agent-client.port";
import { AcpTypeConverter } from "./acp-type-converter";

// ============================================================================
// Internal Types - For type-safe parsing of ACP notifications
// ============================================================================

/**
 * Typed structure for ACP session update notifications.
 * This avoids `as any` casts throughout the code.
 */
interface AcpSessionUpdatePayload {
	sessionUpdate: string;
	content?: { type: string; text?: string };
	toolCallId?: string;
	title?: string;
	status?: string;
	kind?: string;
	locations?: ToolCallLocation[];
	entries?: Array<{
		id?: string;
		content?: string;
		priority?: string;
		status?: string;
	}>;
	modeId?: string;
	currentModeId?: string;
	availableCommands?: Array<{
		name: string;
		description?: string;
		input?: { hint?: string };
	}>;
	// Permission request fields
	requestId?: string;
	options?: Array<{ id: string; label: string; isDefault?: boolean }>;
	description?: string;
	// Session end fields
	reason?: string;
	message?: string;
	// Error fields
	code?: string | number;
	recoverable?: boolean;
	// Output fields
	outputType?: string;
	text?: string;
}

// ============================================================================
// AcpAdapter Implementation
// ============================================================================

export class AcpAdapter implements IAgentClient {
	// ========================================================================
	// Private State
	// ========================================================================

	/** Obsidian App instance for vault operations */
	private app: App | undefined;

	/** Vault manager for file operations */
	private vaultManager: VaultManager | null = null;

	/** The spawned agent process */
	private agentProcess: ChildProcess | null = null;

	/** ACP SDK connection instance */
	private connection: acp.ClientSideConnection | null = null;

	/** Current agent configuration */
	private currentConfig: AgentConfig | null = null;

	/** Current connection state - tracks lifecycle */
	private connectionState: ConnectionState = ConnectionState.DISCONNECTED;

	/** Currently connected agent's ID */
	private currentAgentId: string | null = null;

	/** Terminal manager for process execution */
	private terminalManager = new TerminalManager();

	// ========================================================================
	// Constructor
	// ========================================================================

	constructor(app?: App) {
		this.app = app;
		if (app) {
			this.vaultManager = new VaultManager(app);
		}
	}

	// ========================================================================
	// Subscription Management
	// Using Map for O(1) add/remove operations
	// ========================================================================

	/** Counter for generating unique subscription IDs */
	private subscriptionIdCounter = 0;

	/** Map of session update subscribers: subscriptionId -> callback */
	private sessionUpdateSubscribers = new Map<
		string,
		(update: SessionUpdate) => void
	>();

	/** Map of error subscribers: subscriptionId -> callback */
	private errorSubscribers = new Map<string, (error: AgentError) => void>();

	// ========================================================================
	// Resource Cleanup Tracking
	// Store cleanup functions to prevent memory leaks
	// ========================================================================

	/** Array of cleanup functions for event listeners */
	private cleanupFunctions: Array<() => void> = [];

	/**
	 * Pending permission requests awaiting user response.
	 * Maps requestId -> { resolve, reject } for Promise-based flow.
	 */
	private pendingPermissions = new Map<
		string,
		{
			resolve: (outcome: {
				outcome: "selected" | "cancelled";
				optionId?: string;
			}) => void;
			reject: (error: Error) => void;
		}
	>();

	// ========================================================================
	// ACP Client Interface Implementation
	// Required by SDK: ClientSideConnection expects a Client-like object
	// ========================================================================

	/**
	 * Handle permission requests from the agent.
	 * Called by ACP SDK when agent needs user permission.
	 *
	 * This method:
	 * 1. Generates a unique request ID
	 * 2. Emits a permission_requested session update
	 * 3. Waits for UI to call respondToPermission()
	 * 4. Returns the user's decision to the SDK
	 */
	async requestPermission(
		params: unknown,
	): Promise<{ outcome: { outcome: string; optionId?: string } }> {
		const p = params as {
			sessionId?: string;
			toolCall?: { toolCallId?: string; title?: string };
			options?: Array<{ optionId: string; name: string; kind?: string }>;
			title?: string;
			description?: string;
		};

		// Generate a unique request ID
		const requestId = `perm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

		console.log("[AcpAdapter] Permission requested:", {
			requestId,
			title: p.title || p.toolCall?.title,
			optionsCount: p.options?.length || 0,
			optionsRaw: p.options,
		});

		// Create a promise that will be resolved when user responds
		const responsePromise = new Promise<{
			outcome: "selected" | "cancelled";
			optionId?: string;
		}>((resolve, reject) => {
			this.pendingPermissions.set(requestId, { resolve, reject });
		});

		// Emit permission request as a session update for UI to display
		const permissionUpdate: SessionUpdate = {
			type: "permission_requested",
			requestId,
			title: p.title || p.toolCall?.title || "Permission Required",
			description: p.description,
			options: (p.options || []).map((o) => ({
				id: o.optionId,
				label: o.name,
				isDefault: o.kind === "allow_once" || o.kind === "allow_session",
			})),
		};

		this.notifySessionUpdate(permissionUpdate);

		// Wait for user response (from respondToPermission)
		const outcome = await responsePromise;

		console.log("[AcpAdapter] Permission response:", outcome);

		return { outcome };
	}

	// ========================================================================
	// IAgentClient: Lifecycle Methods
	// ========================================================================

	/**
	 * Initialize connection to an ACP agent.
	 *
	 * This method:
	 * 1. Spawns the agent process
	 * 2. Sets up stdio streams with proper backpressure handling
	 * 3. Performs ACP handshake (protocol negotiation)
	 * 4. Returns agent capabilities
	 *
	 * @param config - Agent configuration (command, args, working directory)
	 * @returns Protocol version and available auth methods
	 * @throws AgentError if spawn or handshake fails
	 */
	async initialize(config: AgentConfig): Promise<InitializeResult> {
		console.log("[AcpAdapter] Starting initialization", {
			command: config.command,
			id: config.id,
		});

		// Clean up any existing connection first
		if (this.agentProcess) {
			console.log("[AcpAdapter] Cleaning up existing process before reinit");
			await this.disconnect();
		}

		// Update state to initializing
		this.connectionState = ConnectionState.INITIALIZING;
		this.currentConfig = config;

		const args = config.args || [];

		try {
			// ================================================================
			// Step 1: Spawn the agent process
			// ================================================================
			this.agentProcess = spawn(config.command, args, {
				stdio: ["pipe", "pipe", "pipe"],
				cwd: config.workingDirectory,
				env: { ...process.env, ...config.env },
				shell: true, // Required for some environments (e.g., npx commands)
			});

			if (!this.agentProcess.pid) {
				throw new AgentError(
					"Failed to spawn agent process - no PID",
					"SPAWN_FAILED",
				);
			}

			console.log(
				"[AcpAdapter] Process spawned with PID:",
				this.agentProcess.pid,
			);

			// ================================================================
			// Step 2: Validate stdio streams exist
			// IMPORTANT: Check BEFORE attaching listeners
			// ================================================================
			const { stdin, stdout, stderr } = this.agentProcess;

			if (!stdin || !stdout) {
				throw new AgentError(
					"Failed to open stdin/stdout for agent",
					"STDIO_FAILED",
				);
			}

			// ================================================================
			// Step 3: Setup stderr logging (non-critical, for debugging)
			// ================================================================
			if (stderr) {
				const stderrListener = (data: Buffer) => {
					console.error(`[AcpAdapter] Agent stderr: ${data.toString()}`);
				};
				stderr.on("data", stderrListener);
				// Track for cleanup
				this.cleanupFunctions.push(() => {
					stderr.removeListener("data", stderrListener);
				});
			}

			// ================================================================
			// Step 4: Setup process error and exit handlers
			// ================================================================
			const errorListener = (err: Error) => {
				console.error("[AcpAdapter] Process error:", err);
				this.connectionState = ConnectionState.ERROR;
				this.notifyError(
					new AgentError(
						`Agent process error: ${err.message}`,
						"PROCESS_ERROR",
					),
				);
			};
			this.agentProcess.on("error", errorListener);
			this.cleanupFunctions.push(() => {
				this.agentProcess?.removeListener("error", errorListener);
			});

			const exitListener = (code: number | null, signal: string | null) => {
				console.log(
					`[AcpAdapter] Agent exited with code=${code} signal=${signal}`,
				);

				// Only notify error for unexpected exits (not during intentional disconnect)
				if (
					this.connectionState !== ConnectionState.CLOSING &&
					code !== 0 &&
					code !== null
				) {
					this.connectionState = ConnectionState.ERROR;
					this.notifyError(
						new AgentError(
							`Agent exited unexpectedly with code ${code}`,
							"UNEXPECTED_EXIT",
						),
					);
				}

				// Cleanup references
				this.agentProcess = null;
				this.connection = null;
			};
			this.agentProcess.on("exit", exitListener);
			this.cleanupFunctions.push(() => {
				this.agentProcess?.removeListener("exit", exitListener);
			});

			// ================================================================
			// Step 5: Setup stdin error handler (prevents EPIPE crashes)
			// ================================================================
			const stdinErrorListener = (err: Error) => {
				console.error("[AcpAdapter] stdin error:", err);
				// Don't crash, just log - connection may still work
			};
			stdin.on("error", stdinErrorListener);
			this.cleanupFunctions.push(() => {
				stdin.removeListener("error", stdinErrorListener);
			});

			// ================================================================
			// Step 6: Create streams with proper backpressure handling
			// ================================================================
			const input = new WritableStream<Uint8Array>({
				write(chunk) {
					// Return a promise that resolves when write completes
					// This properly handles backpressure
					return new Promise<void>((resolve, reject) => {
						const canContinue = stdin.write(chunk, (err) => {
							if (err) {
								reject(err);
							} else if (canContinue) {
								resolve();
							}
							// If !canContinue, wait for drain event
						});

						if (!canContinue) {
							stdin.once("drain", () => resolve());
						}
					});
				},
				close() {
					stdin.end();
				},
				abort(reason) {
					console.error("[AcpAdapter] Input stream aborted:", reason);
					stdin.destroy();
				},
			});

			const output = new ReadableStream<Uint8Array>({
				start(controller) {
					const dataListener = (chunk: Buffer) => {
						controller.enqueue(new Uint8Array(chunk));
					};
					const endListener = () => {
						controller.close();
					};
					const errorListener = (err: Error) => {
						controller.error(err);
					};

					stdout.on("data", dataListener);
					stdout.on("end", endListener);
					stdout.on("error", errorListener);

					// Note: We don't need to track these for cleanup because
					// the stream will be garbage collected when connection closes
				},
				cancel() {
					stdout.destroy();
				},
			});

			// ================================================================
			// Step 7: Create ACP connection
			// ================================================================
			const stream = acp.ndJsonStream(input, output);

			// SDK constructor: (toClient: (agent) => Client, stream)
			// 'this' provides the Client interface (requestPermission, sessionUpdate, etc.)
			this.connection = new acp.ClientSideConnection(() => {
				console.log(
					"[AcpAdapter] toClient callback invoked, returning this with methods:",
					{
						hasCreateTerminal: typeof this.createTerminal === "function",
						hasTerminalOutput: typeof this.terminalOutput === "function",
						hasReleaseTerminal: typeof this.releaseTerminal === "function",
					},
				);
				return this as unknown as acp.Client;
			}, stream);

			// ================================================================
			// Step 8: Perform ACP handshake
			// ================================================================
			const initResult = await this.connection.initialize({
				protocolVersion: 1, // Protocol version (uint16, max 65535)
				clientCapabilities: {
					// Declare capabilities we support
					fs: { readTextFile: true, writeTextFile: true },
					// terminal: false - Disabled to force agent to use MCP tools
					// Agent will use mcp__acp__BashOutput instead
				},
			});

			// Success! Update state
			this.connectionState = ConnectionState.READY;
			this.currentAgentId = config.id;

			console.log("[AcpAdapter] Initialization complete", {
				protocolVersion: initResult.protocolVersion,
			});

			return {
				protocolVersion: String(initResult.protocolVersion),
				authMethods: [], // TODO: Map from initResult.authMethods if available
			};
		} catch (e) {
			// Initialization failed - cleanup and report
			console.error("[AcpAdapter] Initialization failed:", e);
			this.connectionState = ConnectionState.ERROR;

			// Ensure cleanup on failure
			await this.cleanup();

			const error =
				e instanceof AgentError
					? e
					: new AgentError(
							e instanceof Error ? e.message : String(e),
							"INIT_FAILED",
						);

			this.notifyError(error);
			throw error;
		}
	}

	/**
	 * Gracefully disconnect from the agent.
	 *
	 * This method:
	 * 1. Signals connection is closing (prevents error notifications)
	 * 2. Waits for connection to close (with timeout)
	 * 3. Terminates process if still running
	 * 4. Cleans up all resources
	 */
	async disconnect(): Promise<void> {
		console.log("[AcpAdapter] Disconnecting...");

		// Signal that we're intentionally closing
		this.connectionState = ConnectionState.CLOSING;

		try {
			// Wait for connection to close gracefully (5s timeout)
			if (this.connection) {
				await Promise.race([
					this.connection.closed,
					new Promise((resolve) => setTimeout(resolve, 5000)),
				]);
			}
		} catch (e) {
			console.error("[AcpAdapter] Error waiting for connection close:", e);
		}

		// Terminate process if still running
		if (this.agentProcess && !this.agentProcess.killed) {
			console.log("[AcpAdapter] Terminating agent process...");

			// Try graceful shutdown first
			this.agentProcess.kill("SIGTERM");

			// Wait briefly for graceful shutdown
			await new Promise((resolve) => setTimeout(resolve, 1000));

			// Force kill if still running
			if (this.agentProcess && !this.agentProcess.killed) {
				console.log("[AcpAdapter] Force killing agent process...");
				this.agentProcess.kill("SIGKILL");
			}
		}

		// Final cleanup
		await this.cleanup();
	}

	// ========================================================================
	// IAgentClient: Session Management
	// ========================================================================

	/**
	 * Create a new conversation session with the agent.
	 *
	 * @param workingDirectory - The working directory for the session
	 * @returns Session ID and available modes
	 * @throws If not initialized or session creation fails
	 */
	async newSession(workingDirectory: string): Promise<NewSessionResult> {
		const connection = this.ensureReady();

		try {
			const result = await connection.newSession({
				cwd: workingDirectory,
				mcpServers: [], // TODO: Support MCP servers in future
			});

			const modes = result.modes?.availableModes || [];

			// Extract models from ACP session result (experimental)
			let models: SessionModelState | undefined;
			if (result.models) {
				models = {
					availableModels: result.models.availableModels.map((m) => ({
						modelId: m.modelId,
						name: m.name,
						description: m.description ?? undefined,
					})),
					currentModelId: result.models.currentModelId,
				};
				console.log(
					`[AcpAdapter] Session models: ${models.availableModels.map((m) => m.modelId).join(", ")} (current: ${models.currentModelId})`,
				);
			}

			return {
				sessionId: result.sessionId,
				availableModes: modes.map((m) => ({
					id: m.id,
					name: m.name,
					description: m.description || "",
					isCurrent: m.id === result.modes?.currentModeId,
				})),
				models,
			};
		} catch (e) {
			console.error("[AcpAdapter] Failed to create new session:", e);
			throw e instanceof AgentError
				? e
				: new AgentError(
						e instanceof Error ? e.message : "Session creation failed",
						"SESSION_FAILED",
					);
		}
	}

	/**
	 * Authenticate with the agent using a specific method.
	 *
	 * TODO: Implement proper authentication flow.
	 * Currently returns true as a placeholder.
	 */
	async authenticate(methodId: string): Promise<boolean> {
		console.warn(
			"[AcpAdapter] authenticate() not fully implemented, methodId:",
			methodId,
		);
		// TODO: Call this.connection.authenticate() when implementing
		return true;
	}

	// ========================================================================
	// IAgentClient: Messaging
	// ========================================================================

	/**
	 * Send a prompt/message to the agent within a session.
	 *
	 * Note: In ACP terminology, this is a "prompt" not a "message".
	 * The interface uses "sendMessage" for broader compatibility.
	 *
	 * @param sessionId - The session to send the prompt to
	 * @param message - The text content of the prompt
	 */
	async sendMessage(sessionId: string, message: string): Promise<void> {
		const connection = this.ensureReady();

		try {
			await connection.prompt({
				sessionId: sessionId,
				prompt: [{ type: "text", text: message }],
			});
		} catch (e) {
			console.error("[AcpAdapter] Prompt error:", e);
			throw e instanceof AgentError
				? e
				: new AgentError(
						e instanceof Error ? e.message : "Prompt failed",
						"PROMPT_FAILED",
					);
		}
	}

	/**
	 * Cancel any ongoing operation in the session.
	 *
	 * This sends a cancellation notification to the agent.
	 * The agent should stop processing and respond with StopReason::Cancelled.
	 */
	async cancel(sessionId: string): Promise<void> {
		const connection = this.ensureReady();

		try {
			await connection.cancel({ sessionId });
			console.log("[AcpAdapter] Cancel sent for session:", sessionId);
		} catch (e) {
			console.error("[AcpAdapter] Cancel error:", e);
			// Don't throw - cancellation is best-effort
		}
	}

	/**
	 * Respond to a permission request from the agent.
	 *
	 * Resolves the pending promise created by requestPermission(),
	 * which in turn completes the SDK's permission request flow.
	 *
	 * @param requestId - The ID from the permission_requested update
	 * @param optionId - The ID of the selected option, or "cancelled" to cancel
	 */
	async respondToPermission(
		requestId: string,
		optionId: string,
	): Promise<void> {
		const pending = this.pendingPermissions.get(requestId);

		if (!pending) {
			console.warn(
				"[AcpAdapter] No pending permission request for:",
				requestId,
			);
			return;
		}

		// Remove from pending map
		this.pendingPermissions.delete(requestId);

		// Resolve with appropriate outcome
		if (optionId === "cancelled") {
			pending.resolve({ outcome: "cancelled" });
		} else {
			pending.resolve({ outcome: "selected", optionId });
		}

		console.log("[AcpAdapter] Permission resolved:", { requestId, optionId });
	}

	// ========================================================================
	// IAgentClient: Session Configuration
	// ========================================================================

	/**
	 * Set the operational mode for a session.
	 *
	 * Modes affect agent behavior (e.g., "ask", "code", "architect").
	 */
	async setSessionMode(sessionId: string, modeId: string): Promise<void> {
		const connection = this.ensureReady();

		try {
			await connection.setSessionMode({ sessionId, modeId });
			console.log("[AcpAdapter] Session mode set:", modeId);
		} catch (e) {
			console.error("[AcpAdapter] Failed to set session mode:", e);
			throw e;
		}
	}

	/**
	 * Set the AI model for a session.
	 *
	 * Note: This uses an unstable SDK method.
	 */
	async setSessionModel(sessionId: string, modelId: string): Promise<void> {
		const connection = this.ensureReady();

		try {
			// Use unstable method from SDK
			await connection.unstable_setSessionModel({ sessionId, modelId });
			console.log("[AcpAdapter] Session model set:", modelId);
		} catch (e) {
			console.error("[AcpAdapter] Failed to set session model:", e);
			throw e;
		}
	}

	// ========================================================================
	// IAgentClient: Event Subscriptions
	// ========================================================================

	/**
	 * Subscribe to session updates.
	 *
	 * IMPORTANT: Always call unsubscribe() when done to prevent memory leaks.
	 *
	 * @param callback - Function to call when updates arrive
	 * @returns Subscription object with unsubscribe method
	 */
	onSessionUpdate(callback: (update: SessionUpdate) => void): Subscription {
		const id = this.generateSubscriptionId("session");
		this.sessionUpdateSubscribers.set(id, callback);

		return {
			id,
			unsubscribe: () => {
				this.sessionUpdateSubscribers.delete(id);
			},
		};
	}

	/**
	 * Subscribe to connection errors.
	 *
	 * @param callback - Function to call when errors occur
	 * @returns Subscription object with unsubscribe method
	 */
	onError(callback: (error: AgentError) => void): Subscription {
		const id = this.generateSubscriptionId("error");
		this.errorSubscribers.set(id, callback);

		return {
			id,
			unsubscribe: () => {
				this.errorSubscribers.delete(id);
			},
		};
	}

	// ========================================================================
	// IAgentClient: State Queries
	// ========================================================================

	/**
	 * Check if connection is ready for use.
	 */
	isInitialized(): boolean {
		return this.connectionState === ConnectionState.READY;
	}

	/**
	 * Get the current connection state.
	 */
	getConnectionState(): ConnectionState {
		return this.connectionState;
	}

	/**
	 * Get the ID of the currently connected agent.
	 */
	getCurrentAgentId(): string | null {
		return this.currentAgentId;
	}

	// ========================================================================
	// ACP SDK Callback: Session Update Handler
	// Called by SDK when agent sends session/update notifications
	// ========================================================================

	/**
	 * Handle session update notifications from the agent.
	 *
	 * This is called by the ACP SDK when the agent sends updates.
	 * We parse the update and notify all subscribers.
	 */
	async sessionUpdate(params: acp.SessionNotification): Promise<void> {
		const update = params.update as AcpSessionUpdatePayload;
		// console.log(
		// 	"[AcpAdapter] Session update received:",
		// 	update.sessionUpdate,
		// 	update,
		// );

		// Skip if no subscribers
		if (this.sessionUpdateSubscribers.size === 0) {
			return;
		}

		const parsedUpdate = this.parseSessionUpdate(update);

		if (parsedUpdate) {
			// console.log("[AcpAdapter] Parsed update:", parsedUpdate);
			this.notifySessionUpdate(parsedUpdate);
		} else {
			console.warn("[AcpAdapter] Failed to parse update:", update);
		}
	}

	// ========================================================================
	// Private Helper Methods
	// ========================================================================

	/**
	 * Parse ACP session update payload into our domain SessionUpdate type.
	 *
	 * @param update - Raw ACP update payload
	 * @returns Parsed SessionUpdate or null if unrecognized
	 */
	private parseSessionUpdate(
		update: AcpSessionUpdatePayload,
	): SessionUpdate | null {
		switch (update.sessionUpdate) {
			// ================================================================
			// Text Content Updates
			// ================================================================
			case "user_message_chunk":
				if (
					update.content?.type === "text" &&
					update.content.text !== undefined
				) {
					return {
						type: "user_message_chunk",
						text: update.content.text,
					};
				}
				break;

			case "agent_message_chunk":
				if (
					update.content?.type === "text" &&
					update.content.text !== undefined
				) {
					return {
						type: "agent_message_chunk",
						text: update.content.text,
					};
				}
				break;

			case "agent_thought_chunk":
				if (
					update.content?.type === "text" &&
					update.content.text !== undefined
				) {
					return {
						type: "agent_thought_chunk",
						text: update.content.text,
					};
				}
				break;

			// ================================================================
			// Tool Call Updates
			// ================================================================
			case "tool_call":
				console.log("[AcpAdapter] Processing tool_call:", {
					toolCallId: update.toolCallId,
					title: update.title,
					status: update.status,
					contentRaw: update.content,
				});
				return {
					type: "tool_call",
					toolCallId: update.toolCallId || "unknown",
					title: update.title,
					status:
						(update.status as "pending" | "running" | "complete" | "failed") ||
						"pending",
					kind: update.kind,
					content: AcpTypeConverter.toToolCallContent(
						update.content as unknown as acp.ToolCallContent[],
					),
					locations: update.locations,
				};

			case "tool_call_update":
				return {
					type: "tool_call_update",
					toolCallId: update.toolCallId || "unknown",
					title: update.title,
					status: update.status as
						| "pending"
						| "running"
						| "complete"
						| "failed",
					kind: update.kind,
					content: AcpTypeConverter.toToolCallContent(
						update.content as unknown as acp.ToolCallContent[],
					),
					locations: update.locations,
				};

			// ================================================================
			// Plan Updates
			// ================================================================
			case "plan":
				return {
					type: "plan",
					entries: (update.entries || []).map((e) => ({
						id: e.id || `step-${Math.random().toString(36).substr(2, 9)}`,
						title: e.content || "Step",
						description: e.priority || "",
						status: this.mapPlanStatus(e.status),
					})),
				};

			// ================================================================
			// Mode Updates
			// ================================================================
			case "current_mode_update":
				return {
					type: "current_mode_update",
					currentModeId: update.currentModeId || update.modeId || "default",
				};

			// ================================================================
			// Command Updates
			// ================================================================
			case "available_commands_update":
				return {
					type: "available_commands_update",
					commands: (update.availableCommands || []).map((cmd) => ({
						name: cmd.name,
						description: cmd.description || "",
						hint: cmd.input?.hint ?? null,
					})),
				};

			// ================================================================
			// Permission Requests
			// ================================================================
			case "permission_requested":
				return {
					type: "permission_requested",
					requestId: update.requestId || "unknown",
					title: update.title || "Permission Required",
					description: update.description,
					options: (update.options || []).map((opt) => ({
						id: opt.id,
						label: opt.label,
						isDefault: opt.isDefault,
					})),
				};

			// ================================================================
			// Session End
			// ================================================================
			case "session_end":
				return {
					type: "session_end",
					reason:
						(update.reason as "completed" | "cancelled" | "error") ||
						"completed",
					message: update.message,
				};

			// ================================================================
			// Output Updates
			// ================================================================
			case "output":
				return {
					type: "output",
					outputType:
						(update.outputType as "info" | "warning" | "error" | "debug") ||
						"info",
					text: update.text || "",
				};

			default:
				console.warn(
					"[AcpAdapter] Unhandled session update type:",
					update.sessionUpdate,
				);
				return null;
		}

		return null;
	}

	/**
	 * Map ACP plan status to our domain status.
	 */
	private mapPlanStatus(
		status: string | undefined,
	): "pending" | "running" | "complete" | "failed" | "blocked" {
		switch (status) {
			case "in_progress":
				return "running";
			case "completed":
				return "complete";
			case "failed":
				return "failed";
			case "blocked":
				return "blocked";
			default:
				return "pending";
		}
	}

	/**
	 * Generate a unique subscription ID.
	 */
	private generateSubscriptionId(prefix: string): string {
		return `${prefix}-${++this.subscriptionIdCounter}`;
	}

	/**
	 * Notify all session update subscribers.
	 */
	private notifySessionUpdate(update: SessionUpdate): void {
		for (const callback of this.sessionUpdateSubscribers.values()) {
			try {
				callback(update);
			} catch (e) {
				console.error("[AcpAdapter] Error in session update callback:", e);
			}
		}
	}

	/**
	 * Notify all error subscribers.
	 */
	private notifyError(error: AgentError): void {
		for (const callback of this.errorSubscribers.values()) {
			try {
				callback(error);
			} catch (e) {
				console.error("[AcpAdapter] Error in error callback:", e);
			}
		}
	}

	/**
	 * Ensure connection is ready before operations.
	 * @returns The active connection
	 * @throws AgentError if not ready
	 */
	private ensureReady(): acp.ClientSideConnection {
		if (this.connectionState !== ConnectionState.READY || !this.connection) {
			throw new AgentError(
				`Connection not ready. State: ${this.connectionState}`,
				"NOT_READY",
			);
		}
		return this.connection;
	}

	/**
	 * Cleanup all resources.
	 *
	 * This is called on disconnect or initialization failure.
	 */
	private async cleanup(): Promise<void> {
		console.log("[AcpAdapter] Cleaning up resources...");

		// Run all cleanup functions (remove listeners)
		for (const cleanup of this.cleanupFunctions) {
			try {
				cleanup();
			} catch (e) {
				console.error("[AcpAdapter] Cleanup function error:", e);
			}
		}
		this.cleanupFunctions = [];

		// Cancel all pending permission requests
		for (const [requestId, pending] of this.pendingPermissions) {
			pending.resolve({ outcome: "cancelled" });
			console.log("[AcpAdapter] Cancelled pending permission:", requestId);
		}
		this.pendingPermissions.clear();

		// Clear subscriptions
		this.sessionUpdateSubscribers.clear();
		this.errorSubscribers.clear();

		// Clear references
		this.agentProcess = null;
		this.connection = null;
		this.currentConfig = null;
		this.currentAgentId = null;

		// Update state
		this.connectionState = ConnectionState.DISCONNECTED;

		// Kill all running terminals
		this.terminalManager.killAllTerminals();

		console.log("[AcpAdapter] Cleanup complete");
	}

	// ========================================================================
	// Terminal Operations (ACP Client interface)
	// These methods are called by the ACP SDK when agent requests terminal ops
	// ========================================================================

	/**
	 * Create a new terminal and execute a command.
	 * Called by ACP SDK when agent wants to run a command.
	 */
	createTerminal(
		params: acp.CreateTerminalRequest,
	): Promise<acp.CreateTerminalResponse> {
		console.log("[AcpAdapter] createTerminal called with params:", params);

		// Use current config's working directory if cwd is not provided
		const modifiedParams = {
			...params,
			cwd: params.cwd || this.currentConfig?.workingDirectory || "",
		};
		console.log("[AcpAdapter] Using modified params:", modifiedParams);

		const terminalId = this.terminalManager.createTerminal(modifiedParams);
		return Promise.resolve({ terminalId });
	}

	/**
	 * Get terminal output.
	 * Called by UI components to poll for output.
	 */
	terminalOutput(
		params: acp.TerminalOutputRequest,
	): Promise<acp.TerminalOutputResponse> {
		const result = this.terminalManager.getOutput(params.terminalId);
		if (!result) {
			throw new Error(`Terminal ${params.terminalId} not found`);
		}
		return Promise.resolve(result);
	}

	/**
	 * Wait for terminal to exit.
	 */
	async waitForTerminalExit(
		params: acp.WaitForTerminalExitRequest,
	): Promise<acp.WaitForTerminalExitResponse> {
		return await this.terminalManager.waitForExit(params.terminalId);
	}

	/**
	 * Kill a running terminal.
	 */
	killTerminal(
		params: acp.KillTerminalCommandRequest,
	): Promise<acp.KillTerminalCommandResponse> {
		const success = this.terminalManager.killTerminal(params.terminalId);
		if (!success) {
			throw new Error(`Terminal ${params.terminalId} not found`);
		}
		return Promise.resolve({});
	}

	/**
	 * Release terminal resources.
	 */
	releaseTerminal(
		params: acp.ReleaseTerminalRequest,
	): Promise<acp.ReleaseTerminalResponse> {
		const success = this.terminalManager.releaseTerminal(params.terminalId);
		if (!success) {
			console.log(
				`[AcpAdapter] releaseTerminal: Terminal ${params.terminalId} not found (may have been already cleaned up)`,
			);
		}
		return Promise.resolve({});
	}

	/**
	 * Read text file from Obsidian vault.
	 * Called by ACP SDK when agent wants to read a file.
	 */
	async readTextFile(
		params: acp.ReadTextFileRequest,
	): Promise<acp.ReadTextFileResponse> {
		console.log("[AcpAdapter] readTextFile called:", params.path);

		if (!this.vaultManager) {
			console.warn("[AcpAdapter] VaultManager not available");
			return { content: "" };
		}

		try {
			// Normalize path - remove leading slash if present
			const normalizedPath = params.path.startsWith("/")
				? params.path.slice(1)
				: params.path;

			const file = this.vaultManager.getFileByPath(normalizedPath);
			if (!file) {
				console.log("[AcpAdapter] File not found:", normalizedPath);
				return { content: "" };
			}

			const content = await this.vaultManager.getFileContent(file);
			console.log(
				"[AcpAdapter] Read file successfully:",
				normalizedPath,
				`(${content.length} chars)`,
			);
			return { content };
		} catch (error) {
			console.error("[AcpAdapter] Error reading file:", error);
			return { content: "" };
		}
	}

	/**
	 * Write text file to Obsidian vault.
	 * Called by ACP SDK when agent wants to write a file.
	 */
	async writeTextFile(
		params: acp.WriteTextFileRequest,
	): Promise<acp.WriteTextFileResponse> {
		console.log("[AcpAdapter] writeTextFile called:", params.path);

		if (!this.vaultManager) {
			console.warn("[AcpAdapter] VaultManager not available");
			return {};
		}

		try {
			// Normalize path - remove leading slash if present
			const normalizedPath = params.path.startsWith("/")
				? params.path.slice(1)
				: params.path;

			const existingFile = this.vaultManager.getFileByPath(normalizedPath);

			if (existingFile) {
				// Modify existing file
				await this.vaultManager.modifyFile(existingFile, params.content);
				console.log("[AcpAdapter] Modified file:", normalizedPath);
			} else {
				// Create new file
				await this.vaultManager.createFile(normalizedPath, params.content);
				console.log("[AcpAdapter] Created file:", normalizedPath);
			}

			return {};
		} catch (error) {
			console.error("[AcpAdapter] Error writing file:", error);
			throw error;
		}
	}
}
