// Unused imports removed

export enum AIProviderType {
	BYOK_OPENAI = "openai",
	BYOK_GEMINI = "google",
	BYOK_DEEPSEEK = "deepseek",
	ACP_LOCAL = "acp_local", // New
	ERAGEAR_CLOUD = "eragear_cloud",
}

// Provider types for the unified model/agent system
export type ProviderType =
	| "openai"
	| "gemini"
	| "deepseek"
	| "openrouter"
	| "anthropic"
	| "acp";

// Unified configuration for both API models and ACP agents
export interface ChatModelConfig {
	id: string;
	name: string;
	provider: ProviderType;
	type: "api" | "agent";

	// For API models
	model?: string;
	apiKey?: string;
	baseUrl?: string;

	// For ACP agents
	command?: string;
	args?: string;
	workingDir?: string;
	nodePath?: string;

	enabled: boolean;
	isBuiltIn?: boolean;
	useCORS?: boolean;
	capabilities?: {
		streaming?: boolean;
		vision?: boolean;
		functionCalling?: boolean;
	};
}

// Agent configuration for ACP (legacy, kept for backwards compatibility)
export interface AgentConfig {
	id: string;
	name: string;
	command: string;
	args: string;
	workingDir: string;
	nodePath: string;
}

export interface MyPluginSettings {
	// AI Settings
	provider: AIProviderType;
	openaiApiKey: string;
	openaiModel: string; // New
	geminiApiKey: string;
	geminiModel: string; // New
	deepseekApiKey: string; // New
	deepseekModel: string;

	// ACP Settings - Legacy (kept for backwards compatibility)
	agentCommand: string;
	agentArgs: string;
	agentWorkingDir: string;
	agentNodePath: string;

	// ACP Settings - Multi-agent support
	agents: AgentConfig[];
	activeAgentId: string;

	// Unified Chat Models & Agents
	chatModels: ChatModelConfig[];
	activeChatModelId: string;

	// Relay Settings
	relayUrl: string;

	eragearApiKey: string;

	// ... other settings ...
	mySetting: string;
	apiEndpoint: string;
	enableDebugMode: boolean;
	maxGraphHops: number;
	searchMaxResults: number;
	debounceDelay: number;
	cloudflareAccessId: string;
	cloudflareAccessSecret: string;
	cloudflareApiEndpoint: string;
}

// Default agent configurations
export const DEFAULT_AGENTS: AgentConfig[] = [
	{
		id: "gemini",
		name: "Gemini CLI",
		command: "gemini",
		args: "--experimental-acp",
		workingDir: "",
		nodePath: "",
	},
];

// Built-in chat models and agents
export const BUILTIN_CHAT_MODELS: ChatModelConfig[] = [
	// OpenAI Models
	{
		id: "openai-gpt-5-nano",
		name: "GPT-5 Nano",
		provider: "openai",
		type: "api",
		model: "gpt-5-nano",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, vision: true, functionCalling: true },
	},
	{
		id: "openai-gpt-5-mini",
		name: "GPT-5 Mini",
		provider: "openai",
		type: "api",
		model: "gpt-5-mini",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, vision: true, functionCalling: true },
	},
	// Gemini Models
	{
		id: "gemini-2.5-flash-lite",
		name: "Gemini 2.5 Flash Lite",
		provider: "gemini",
		type: "api",
		model: "gemini-2.5-flash-lite",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, vision: true, functionCalling: true },
	},
	{
		id: "gemini-3-flash",
		name: "Gemini 3 Flash",
		provider: "gemini",
		type: "api",
		model: "gemini-3-flash",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, vision: true, functionCalling: true },
	},
	{
		id: "gemini-3-pro",
		name: "Gemini 3 Pro",
		provider: "gemini",
		type: "api",
		model: "gemini-3-pro",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, vision: true, functionCalling: true },
	},
	// DeepSeek Models
	{
		id: "deepseek-chat",
		name: "DeepSeek V3.2",
		provider: "deepseek",
		type: "api",
		model: "deepseek-chat",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true, functionCalling: true },
	},
	{
		id: "deepseek-reasoner",
		name: "DeepSeek V3 Thinking",
		provider: "deepseek",
		type: "api",
		model: "deepseek-reasoner",
		enabled: true,
		isBuiltIn: true,
		capabilities: { streaming: true },
	},
	// ACP CLI Agent
	{
		id: "acp-gemini-cli",
		name: "Gemini CLI",
		provider: "acp",
		type: "agent",
		command: "gemini",
		args: "--experimental-acp",
		enabled: true,
		isBuiltIn: true,
	},
	{
		id: "claude-code-acp",
		name: "Claude Code",
		provider: "acp",
		type: "agent",
		command: "claude-code-acp",
		args: "",
		enabled: true,
		isBuiltIn: true,
	},
	{
		id: "acp-opencode",
		name: "OpenCode",
		provider: "acp",
		type: "agent",
		command: "opencode",
		args: "acp",
		enabled: false, // Disabled - opencode command not installed
		isBuiltIn: true,
	},
];

export const DEFAULT_SETTINGS: MyPluginSettings = {
	provider: AIProviderType.BYOK_OPENAI,
	openaiApiKey: "",
	openaiModel: "gpt-5-nano",
	geminiApiKey: "",
	geminiModel: "gemini-2.5-flash-lite",
	deepseekApiKey: "",
	deepseekModel: "deepseek-chat",

	agentCommand: "python",
	agentArgs: "agent.py",
	agentWorkingDir: "",
	agentNodePath: "",

	agents: DEFAULT_AGENTS,
	activeAgentId: "gemini",

	chatModels: [...BUILTIN_CHAT_MODELS],
	activeChatModelId: "openai-gpt-4o",

	relayUrl: "wss://relay.eragear.app",

	eragearApiKey: "",

	mySetting: "default",
	apiEndpoint: "https://api.eragear.app",
	enableDebugMode: false,
	maxGraphHops: 3,
	searchMaxResults: 50,
	debounceDelay: 300,
	cloudflareAccessId: "",
	cloudflareAccessSecret: "",
	cloudflareApiEndpoint: "https://api.eragear.app",
};

/**
 * Initialize settings with vault directory path
 * Called during plugin load to set default workingDir for agents
 */
export function initializeSettingsWithVaultPath(
	settings: MyPluginSettings,
	vaultPath: string,
): MyPluginSettings {
	// Set default working directory to vault if not already set
	if (!settings.agentWorkingDir) {
		settings.agentWorkingDir = vaultPath;
	}

	// Update agents with vault path if their workingDir is empty
	settings.agents = settings.agents.map((agent) => ({
		...agent,
		workingDir: agent.workingDir || vaultPath,
	}));

	// Update chat models (ACP agents) with vault path if their workingDir is not set
	settings.chatModels = settings.chatModels.map((model) => {
		if (model.type === "agent" && !model.workingDir) {
			return {
				...model,
				workingDir: vaultPath,
			};
		}
		return model;
	});

	return settings;
}
