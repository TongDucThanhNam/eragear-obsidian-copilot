import { useState, useEffect, useRef, useCallback } from "react";
import { type IAgentClient } from "../../domain/ports/agent-client.port";
import { AcpAdapter } from "../../adapters/acp/acp.adapter";
import type { MyPluginSettings } from "../../settings";
import { AIProviderType } from "../../settings";

export function useAgentClient(settings: MyPluginSettings) {
	const [modes, setModes] = useState<any[]>([]);
	const [currentModeId, setCurrentModeId] = useState<string>("");

	const [agentClient, setAgentClient] = useState<IAgentClient | null>(null);
	const [isInitializing, setIsInitializing] = useState(false);
	const [error, setError] = useState<Error | null>(null);

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

	useEffect(() => {
		let active = true;

		async function init() {
			if (settings.provider === AIProviderType.ACP_LOCAL) {
				setIsInitializing(true);
				setError(null);
				try {
					const adapter = new AcpAdapter();
					// Parse args from string to array
					const args = settings.agentArgs
						? settings.agentArgs.split(" ").filter((a) => a.length > 0)
						: [];

					const env: Record<string, string> = {};
					for (const key in process.env) {
						const val = process.env[key];
						if (val !== undefined) {
							env[key] = val;
						}
					}

					if (settings.agentNodePath) {
						const nodeDir = settings.agentNodePath.substring(
							0,
							settings.agentNodePath.lastIndexOf("/"),
						);
						// Prepend to PATH
						const pathKey =
							Object.keys(env).find((k) => k.toLowerCase() === "path") ||
							"PATH";
						env[pathKey] = `${nodeDir}:${env[pathKey] || ""}`;
					}

					await adapter.initialize({
						id: "local-agent",
						displayName: "Local Agent",
						command: settings.agentCommand,
						args: args,
						workingDirectory: settings.agentWorkingDir || process.cwd(),
						env: env,
					});

					// Listen for updates (including mode updates)
					adapter.onSessionUpdate((update) => {
						if (update.type === "current_mode_update") {
							setCurrentModeId(update.currentModeId);
						}
					});

					if (active) {
						setAgentClient(adapter);
					}
				} catch (e: any) {
					if (active) setError(e);
					console.error("Failed to init agent", e);
				} finally {
					if (active) setIsInitializing(false);
				}
			} else {
				// Other providers don't use IAgentClient yet
				setAgentClient(null);
				setModes([]);
				setCurrentModeId("");
			}
		}

		// Cleanup previous
		if (agentClient) {
			console.log("Disconnecting previous agent");
			agentClient.disconnect().catch(console.error);
			setAgentClient(null);
			setModes([]);
			setCurrentModeId("");
		}

		init();

		return () => {
			active = false;
			if (agentClient) {
				agentClient.disconnect().catch(console.error);
			}
		};
	}, [
		settings.provider,
		settings.agentCommand,
		settings.agentArgs,
		settings.agentWorkingDir,
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
	};
}
