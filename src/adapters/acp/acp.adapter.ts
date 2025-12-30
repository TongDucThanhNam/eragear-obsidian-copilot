import { spawn, type ChildProcess } from "child_process";
import * as acp from "@agentclientprotocol/sdk";
import type {
	IAgentClient,
	InitializeResult,
	NewSessionResult,
} from "../../domain/ports/agent-client.port";
import type { AgentConfig } from "../../domain/models/agent-config";
import type { AgentError } from "../../domain/models/agent-error";
import type {
	SessionUpdate,
	SlashCommand,
} from "../../domain/models/session-update";
import { AcpTypeConverter } from "./acp-type-converter";

export class AcpAdapter implements IAgentClient {
	private agentProcess: ChildProcess | null = null;
	private connection: acp.ClientSideConnection | null = null;
	private currentConfig: AgentConfig | null = null;
	private sessionUpdateCallbacks: ((update: SessionUpdate) => void)[] = [];
	private errorCallback: ((error: AgentError) => void) | null = null;
	private isInitializedFlag = false;
	private currentAgentId: string | null = null;

	// @ts-ignore - 'Client' implementation requires this but we proxy it
	async requestPermission(params: any): Promise<any> {
		// Minimum implementation for SDK interface
		return { decision: "deny" };
	}

	async initialize(config: AgentConfig): Promise<InitializeResult> {
		// ... (existing implementation details are fine, but ensure this block is preserved if I replace widely.
		// Actually, I should use replace_file_content carefully.)
		return this.initializeImplementation(config);
	}

	// Helper to avoid massive replacement in tool call
	private async initializeImplementation(
		config: AgentConfig,
	): Promise<InitializeResult> {
		console.log("[AcpAdapter] Starting initialization", config);

		if (this.agentProcess) {
			this.agentProcess.kill();
			this.agentProcess = null;
		}

		this.currentConfig = config;
		const args = config.args || [];

		try {
			// Spawn process
			this.agentProcess = spawn(config.command, args, {
				stdio: ["pipe", "pipe", "pipe"],
				cwd: config.workingDirectory,
				env: { ...process.env, ...config.env },
				shell: true, // Useful for some environments
			});

			if (!this.agentProcess.pid) {
				throw new Error("Failed to spawn agent process");
			}

			// Setup Connection
			const stdin = this.agentProcess.stdin;
			const stdout = this.agentProcess.stdout;
			const stderr = this.agentProcess.stderr;
			if (stderr) {
				stderr.on("data", (data) => {
					console.error(`[AcpAdapter] Agent stderr: ${data}`);
				});
			}

			// Handle spawn errors
			this.agentProcess.on("error", (err) => {
				console.error("[AcpAdapter] Process error:", err);
				const error = new Error(
					`Failed to start agent: ${err.message}`,
				) as AgentError;
				if (this.errorCallback) this.errorCallback(error);
			});

			this.agentProcess.on("exit", (code, signal) => {
				console.log(
					`[AcpAdapter] Agent exited with code ${code} signal ${signal}`,
				);
				if (code !== 0 && code !== null) {
					const error = new Error(
						`Agent exited unexpectedly with code ${code}`,
					) as AgentError;
					if (this.errorCallback) this.errorCallback(error);
				}
				// Cleanup
				this.agentProcess = null;
				this.connection = null;
			});

			if (!stdin || !stdout)
				throw new Error("Failed to open stdin/stdout for agent");

			// Handle stdin errors to prevent EPIPE
			stdin.on("error", (err) => {
				console.error("[AcpAdapter] stdin error:", err);
			});

			const input = new WritableStream<Uint8Array>({
				write(chunk) {
					stdin.write(chunk);
				},
				close() {
					stdin.end();
				},
			});

			const output = new ReadableStream<Uint8Array>({
				start(controller) {
					stdout.on("data", (chunk) => controller.enqueue(chunk));
					stdout.on("end", () => controller.close());
				},
			});

			const stream = acp.ndJsonStream(input, output);
			// SDK v0.12.0 constructor structure: (toClient: (agent: Agent) => Client, stream: Stream)
			// 'this' must confirm to 'Client' interface (which includes requestPermission etc)
			this.connection = new acp.ClientSideConnection(() => this as any, stream);

			// Handshake
			const initResult = await this.connection.initialize({
				protocolVersion: 1, // Use valid version number (max 65535)
				clientCapabilities: {
					fs: { readTextFile: true, writeTextFile: true }, // Enable if we implement FS later
					terminal: true,
				},
			});

			this.isInitializedFlag = true;
			this.currentAgentId = config.id;

			return {
				protocolVersion: String(initResult.protocolVersion),
				authMethods: [], // Simplify for now or map correctly
			};
		} catch (e: any) {
			console.error("[AcpAdapter] Init failed", e);
			const error = new Error(e.message) as AgentError; // quick cast
			if (this.errorCallback) this.errorCallback(error);
			throw error;
		}
	}

	async newSession(workingDirectory: string): Promise<NewSessionResult> {
		if (!this.connection) throw new Error("Not initialized");

		try {
			const result = await this.connection.newSession({
				cwd: workingDirectory,
				mcpServers: [], // No MCP servers for now
			});

			const modes = result.modes?.availableModes || [];

			return {
				sessionId: result.sessionId,
				availableModes: modes.map((m: any) => ({
					id: m.id,
					name: m.name,
					description: m.description,
					isCurrent: m.id === result.modes?.currentModeId,
				})),
			};
		} catch (e: any) {
			console.error("[AcpAdapter] Failed to create new session", e);
			throw e;
		}
	}

	async authenticate(methodId: string): Promise<boolean> {
		// Implement later
		return true;
	}

	async sendMessage(sessionId: string, message: string): Promise<void> {
		if (!this.connection) throw new Error("Not initialized");

		try {
			await this.connection.prompt({
				sessionId: sessionId,
				prompt: [{ type: "text", text: message }],
			});
		} catch (e) {
			console.error("Prompt error", JSON.stringify(e, null, 2));
			throw e;
		}
	}

	async cancel(sessionId: string): Promise<void> {
		// Implement cancel logic if SDK supports it (e.g. abort controller on prompt?)
	}

	async disconnect(): Promise<void> {
		if (this.agentProcess) {
			this.agentProcess.kill();
			this.agentProcess = null;
		}
		this.connection = null;
		this.isInitializedFlag = false;
		this.sessionUpdateCallbacks = []; // Clear callbacks
	}

	onSessionUpdate(callback: (update: SessionUpdate) => void): void {
		this.sessionUpdateCallbacks.push(callback);
	}

	onError(callback: (error: AgentError) => void): void {
		this.errorCallback = callback;
	}

	async respondToPermission(
		requestId: string,
		optionId: string,
	): Promise<void> {
		// TODO: Implement permission response
	}

	isInitialized(): boolean {
		return this.isInitializedFlag;
	}

	getCurrentAgentId(): string | null {
		return this.currentAgentId;
	}

	async setSessionMode(sessionId: string, modeId: string): Promise<void> {
		if (!this.connection) throw new Error("Not initialized");
		try {
			// According to user docs: Client sends `session/set_mode` as request
			await (this.connection as any).request(
				"session/set_mode", // SDK might not have typed method, use generic request
				{
					sessionId,
					modeId,
				},
			);
		} catch (e: any) {
			console.error("[AcpAdapter] Failed to set session mode", e);
			throw e;
		}
	}

	async setSessionModel(sessionId: string, modelId: string): Promise<void> {
		// TODO
	}

	// --- internal ACP callbacks ---

	// This method is called by the SDK when a notification arrives
	// We need to match the signature required by `acp.ClientSideConnectionCallback` (if it exists or is implied)
	// Based on citation: `sessionUpdate(params: acp.SessionNotification): Promise<void>`

	async sessionUpdate(params: acp.SessionNotification): Promise<void> {
		const update = params.update as any; // Cast to any to access new fields
		console.log("[AcpAdapter] update", update);

		if (this.sessionUpdateCallbacks.length === 0) return;

		let parsedUpdate: SessionUpdate | null = null;

		switch (update.sessionUpdate) {
			case "agent_message_chunk":
				if (update.content.type === "text") {
					parsedUpdate = {
						type: "agent_message_chunk",
						text: update.content.text,
					};
				}
				break;
			case "agent_thought_chunk":
				if (update.content.type === "text") {
					parsedUpdate = {
						type: "agent_thought_chunk",
						text: update.content.text,
					};
				}
				break;
			case "tool_call":
			case "tool_call_update":
				parsedUpdate = {
					type: update.sessionUpdate,
					toolCallId: update.toolCallId,
					title: update.title ?? undefined,
					status: (update.status as any) || "pending",
					kind: update.kind ?? undefined,
					content: AcpTypeConverter.toToolCallContent(update.content),
					locations: update.locations ?? undefined,
				};
				break;
			case "plan":
				parsedUpdate = {
					type: "plan",
					entries: (update.entries || []).map((e: any) => ({
						id: e.id || "step-" + Math.random().toString(36).substr(2, 9),
						title: e.title || "Step",
						description: e.description || "",
						status:
							e.status === "in_progress" ? "running" : e.status || "pending",
					})),
				};
				break;
			case "current_mode_update":
				parsedUpdate = {
					type: "current_mode_update",
					currentModeId: update.modeId,
				};
				break;
			case "available_commands_update":
				parsedUpdate = {
					type: "available_commands_update",
					commands: (update.availableCommands || []).map((cmd: any) => ({
						name: cmd.name,
						description: cmd.description,
						hint: cmd.input?.hint ?? null,
					})),
				};
				break;
			// Add other cases
		}

		if (parsedUpdate) {
			for (const cb of this.sessionUpdateCallbacks) {
				cb(parsedUpdate);
			}
		}
	}

	// Other callbacks required by SDK?
	// The citation showed `this.connection = new acp.ClientSideConnection(() => this, stream);`
	// This implies `this` (AcpAdapter) implements the callback interface.
}
