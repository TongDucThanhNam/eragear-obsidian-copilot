import { describe, expect, it } from "vitest";
import { getActiveAgentConfig, toAcpAgentConfig } from "@/agent/acp-agent-config";
import type {
	AgentConfig,
	ChatModelConfig,
	MyPluginSettings,
} from "@/app/settings/plugin-settings";

describe("ACP agent config", () => {
	it("normalizes deprecated Gemini ACP args", () => {
		const config = toAcpAgentConfig({
			id: "gemini",
			name: "Gemini",
			command: "gemini",
			args: "--experimental-acp",
			workingDir: "/vault",
			nodePath: "",
		} satisfies AgentConfig);

		expect(config.args).toEqual(["--acp"]);
	});

	it("uses activeAgentId when the active chat model is not an agent", () => {
		const config = getActiveAgentConfig({
			chatModels: [
				apiModel("openai"),
				agentModel("gemini"),
				agentModel("claude"),
			],
			activeChatModelId: "openai",
			activeAgentId: "claude",
			agents: [],
			agentCommand: "",
			agentArgs: "",
			agentWorkingDir: "",
			agentNodePath: "",
		} as MyPluginSettings);

		expect(config?.id).toBe("claude");
	});
});

function apiModel(id: string): ChatModelConfig {
	return {
		id,
		name: id,
		provider: "openai",
		type: "api",
		model: id,
		enabled: true,
	};
}

function agentModel(id: string): ChatModelConfig {
	return {
		id,
		name: id,
		provider: "acp",
		type: "agent",
		command: id,
		args: "",
		enabled: true,
	};
}
