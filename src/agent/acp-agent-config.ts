import type {
	AgentConfig as SettingsAgentConfig,
	ChatModelConfig,
	MyPluginSettings,
} from "@/app/settings/plugin-settings";
import type { AgentConfig as AcpAgentConfig } from "@/core/models/agent-config";

export function getActiveAgentConfig(
	settings: MyPluginSettings,
): SettingsAgentConfig | null {
	if (settings.chatModels.length > 0) {
		const enabledAgents = settings.chatModels.filter(
			(model): model is ChatModelConfig & { type: "agent" } =>
				model.type === "agent" && model.enabled,
		);
		const activeAgent =
			enabledAgents.find((agent) => agent.id === settings.activeChatModelId) ??
			enabledAgents.find((agent) => agent.id === settings.activeAgentId) ??
			enabledAgents[0];

		if (activeAgent) {
			return {
				id: activeAgent.id,
				name: activeAgent.name,
				command: activeAgent.command ?? "",
				args: activeAgent.args ?? "",
				workingDir: activeAgent.workingDir ?? settings.agentWorkingDir,
				nodePath: activeAgent.nodePath ?? settings.agentNodePath,
			};
		}
	}

	if (settings.agents.length > 0) {
		return (
			settings.agents.find((agent) => agent.id === settings.activeAgentId) ??
			settings.agents[0] ??
			null
		);
	}

	if (!settings.agentCommand) return null;

	return {
		id: "legacy-agent",
		name: "Local agent",
		command: settings.agentCommand,
		args: settings.agentArgs,
		workingDir: settings.agentWorkingDir,
		nodePath: settings.agentNodePath,
	};
}

export function getAvailableAgentsFromChatModels(
	settings: MyPluginSettings,
): { id: string; name: string }[] {
	if (settings.chatModels.length > 0) {
		return settings.chatModels
			.filter((model) => model.type === "agent" && model.enabled)
			.map((model) => ({ id: model.id, name: model.name }));
	}

	if (settings.agents.length > 0) {
		return settings.agents.map((agent) => ({
			id: agent.id,
			name: agent.name,
		}));
	}

	return [];
}

export function toAcpAgentConfig(
	agentConfig: SettingsAgentConfig,
): AcpAgentConfig {
	return {
		id: agentConfig.id,
		displayName: agentConfig.name,
		command: agentConfig.command,
		args: splitAgentArgs(agentConfig.args),
		workingDirectory: agentConfig.workingDir || process.cwd(),
		env: buildAgentEnv(agentConfig.nodePath),
	};
}

function splitAgentArgs(args: string): string[] {
	return args
		.split(/\s+/)
		.map((arg) => arg.trim())
		.map((arg) => (arg === "--experimental-acp" ? "--acp" : arg))
		.filter(Boolean);
}

function buildAgentEnv(nodePath: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const key in process.env) {
		const value = process.env[key];
		if (value !== undefined) {
			env[key] = value;
		}
	}

	if (!nodePath) return env;

	const nodeDir = nodePath.substring(0, nodePath.lastIndexOf("/"));
	const pathKey =
		Object.keys(env).find((key) => key.toLowerCase() === "path") ?? "PATH";
	env[pathKey] = `${nodeDir}:${env[pathKey] ?? ""}`;
	return env;
}
