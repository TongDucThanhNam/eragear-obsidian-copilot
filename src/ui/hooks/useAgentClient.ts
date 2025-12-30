import type { App } from "obsidian";
import { useCallback, useEffect, useRef, useState } from "react";
import { AcpAdapter } from "../../adapters/acp/acp.adapter";
import type { SessionModelState } from "../../domain/models/session-update";
import type {
	IAgentClient,
	Subscription,
} from "../../domain/ports/agent-client.port";
import type {
	AgentConfig,
	ChatModelConfig,
	MyPluginSettings,
} from "../../settings";
import { AIProviderType } from "../../settings";

// Mode interface for agent modes
interface AgentMode {
	id: string;
	name: string;
	description: string;
	isCurrent: boolean;
}

/**
 * Get the active agent configuration from settings.
 * Uses the new chatModels system, falls back to legacy settings.
 */
function getActiveAgentConfig(settings: MyPluginSettings): AgentConfig | null {
	// First, try to get from new chatModels system
	if (settings.chatModels && settings.chatModels.length > 0) {
		// Get enabled agents only
		const enabledAgents = settings.chatModels.filter(
			(m: ChatModelConfig) => m.type === "agent" && m.enabled,
		);

		if (enabledAgents.length > 0) {
			// Find active agent by activeChatModelId
			let activeAgent = enabledAgents.find(
				(a: ChatModelConfig) => a.id === settings.activeChatModelId,
			);

			// If activeChatModelId is not an agent, use first enabled agent
			if (!activeAgent) {
				activeAgent = enabledAgents[0];
			}

			if (activeAgent) {
				return {
					id: activeAgent.id,
					name: activeAgent.name,
					command: activeAgent.command || "",
					args: activeAgent.args || "",
					workingDir: activeAgent.workingDir || settings.agentWorkingDir || "",
					nodePath: activeAgent.nodePath || settings.agentNodePath || "",
				};
			}
		}
	}

	// Fallback: Try legacy agents array
	if (settings.agents && settings.agents.length > 0) {
		const activeAgent = settings.agents.find(
			(a) => a.id === settings.activeAgentId,
		);
		if (activeAgent) return activeAgent;
		return settings.agents[0] ?? null;
	}

	// Fallback: Legacy single agent settings
	if (settings.agentCommand) {
		return {
			id: "legacy-agent",
			name: "Local Agent",
			command: settings.agentCommand,
			args: settings.agentArgs || "",
			workingDir: settings.agentWorkingDir || "",
			nodePath: settings.agentNodePath || "",
		};
	}

	return null;
}

/**
 * Get list of available agents from chatModels
 */
function getAvailableAgentsFromChatModels(
	settings: MyPluginSettings,
): { id: string; name: string }[] {
	if (settings.chatModels && settings.chatModels.length > 0) {
		return settings.chatModels
			.filter((m: ChatModelConfig) => m.type === "agent" && m.enabled)
			.map((m: ChatModelConfig) => ({ id: m.id, name: m.name }));
	}

	// Fallback to legacy agents
	if (settings.agents && settings.agents.length > 0) {
		return settings.agents.map((a) => ({ id: a.id, name: a.name }));
	}

	return [];
}

export function useAgentClient(settings: MyPluginSettings, app?: App) {
	const [modes, setModes] = useState<AgentMode[]>([]);
	const [currentModeId, setCurrentModeId] = useState<string>("");

	// Agent models state (experimental - for agents that support model selection)
	const [agentModels, setAgentModels] = useState<SessionModelState | null>(
		null,
	);

	const [agentClient, setAgentClient] = useState<IAgentClient | null>(null);
	const [isInitializing, setIsInitializing] = useState(false);
	const [error, setError] = useState<Error | null>(null);

	// Available agents from chatModels (new system)
	const availableAgents = getAvailableAgentsFromChatModels(settings);
	const activeAgentId = settings.activeChatModelId || "";

	// Track subscriptions for cleanup
	const subscriptionsRef = useRef<Subscription[]>([]);
	// Use ref to access agentClient in cleanup without adding to deps
	const agentClientRef = useRef<IAgentClient | null>(null);

	// Keep ref in sync with state
	useEffect(() => {
		agentClientRef.current = agentClient;
	}, [agentClient]);

	// Helper to set mode
	const setMode = useCallback(
		async (modeId: string, sessionId: string) => {
			if (!agentClient) return;
			await agentClient.setSessionMode(sessionId, modeId);
			// Optimistic update? Or wait for confirmation/notification?
			// The agent should send a notification back confirming the switch usually,
			// or we can rely on spec saying it returns response.
			// Ideally we wait for 'current_mode_update' notification but let's see.
		},
		[agentClient],
	);

	// Helper to set model (experimental)
	const setAgentModel = useCallback(
		async (modelId: string, sessionId: string) => {
			if (!agentClient || !agentModels) return;

			// Store previous model for rollback on error
			const previousModelId = agentModels.currentModelId;

			// Optimistic update - update UI immediately
			setAgentModels((prev) => {
				if (!prev) return prev;
				return {
					...prev,
					currentModelId: modelId,
				};
			});

			try {
				await agentClient.setSessionModel(sessionId, modelId);
				console.log("[useAgentClient] Agent model set:", modelId);
			} catch (err) {
				console.error("[useAgentClient] Failed to set agent model:", err);
				// Rollback on error
				setAgentModels((prev) => {
					if (!prev) return prev;
					return {
						...prev,
						currentModelId: previousModelId,
					};
				});
			}
		},
		[agentClient, agentModels],
	);

	useEffect(() => {
		let active = true;

		// Helper to cleanup subscriptions and agent
		const cleanupPrevious = () => {
			// Cleanup subscriptions
			for (const sub of subscriptionsRef.current) {
				sub.unsubscribe();
			}
			subscriptionsRef.current = [];

			// Cleanup agent using ref (avoids dependency issue)
			const currentClient = agentClientRef.current;
			if (currentClient) {
				console.log("Disconnecting previous agent");
				currentClient.disconnect().catch(console.error);
			}
		};

		async function init() {
			if (settings.provider === AIProviderType.ACP_LOCAL) {
				const agentConfig = getActiveAgentConfig(settings);

				if (!agentConfig) {
					setError(new Error("No agent configured"));
					return;
				}

				setIsInitializing(true);
				setError(null);
				try {
					const adapter = new AcpAdapter(app);
					// Parse args from string to array
					const args = agentConfig.args
						? agentConfig.args.split(" ").filter((a) => a.length > 0)
						: [];

					const env: Record<string, string> = {};
					for (const key in process.env) {
						const val = process.env[key];
						if (val !== undefined) {
							env[key] = val;
						}
					}

					const nodePath = agentConfig.nodePath;
					if (nodePath) {
						const nodeDir = nodePath.substring(0, nodePath.lastIndexOf("/"));
						// Prepend to PATH
						const pathKey =
							Object.keys(env).find((k) => k.toLowerCase() === "path") ||
							"PATH";
						env[pathKey] = `${nodeDir}:${env[pathKey] || ""}`;
					}

					await adapter.initialize({
						id: agentConfig.id,
						displayName: agentConfig.name,
						command: agentConfig.command,
						args: args,
						workingDirectory: agentConfig.workingDir || process.cwd(),
						env: env,
					});

					// Listen for updates (including mode updates)
					// Store subscription for proper cleanup
					const subscription = adapter.onSessionUpdate((update) => {
						if (update.type === "current_mode_update") {
							setCurrentModeId(update.currentModeId);
						}
					});
					subscriptionsRef.current.push(subscription);

					if (active) {
						setAgentClient(adapter);
					}
				} catch (e: unknown) {
					if (active) setError(e instanceof Error ? e : new Error(String(e)));
					console.error("Failed to init agent", e);
				} finally {
					if (active) setIsInitializing(false);
				}
			} else {
				// Other providers don't use IAgentClient yet
				setAgentClient(null);
				setModes([]);
				setCurrentModeId("");
				setAgentModels(null);
			}
		}

		// Cleanup before reinit
		cleanupPrevious();
		setAgentClient(null);
		setModes([]);
		setCurrentModeId("");
		setAgentModels(null);

		init();

		return () => {
			active = false;
			cleanupPrevious();
		};
	}, [
		settings.provider,
		settings.activeChatModelId,
		// React to chatModels changes (new system)
		JSON.stringify(settings.chatModels),
		// Legacy settings fallback
		settings.agentWorkingDir,
		settings.agentNodePath,
	]);

	return {
		agentClient,
		isInitializing,
		error,
		modes,
		setModes,
		currentModeId,
		setCurrentModeId,
		setMode,
		// Agent models (experimental)
		agentModels,
		setAgentModels,
		setAgentModel,
		// Expose agent management
		availableAgents,
		activeAgentId,
	};
}
