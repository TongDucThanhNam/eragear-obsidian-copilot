// Unused imports removed

export enum AIProviderType {
	BYOK_OPENAI = "openai",
	BYOK_GEMINI = "google",
	BYOK_DEEPSEEK = "deepseek",
	ACP_LOCAL = "acp_local", // New
	ERAGEAR_CLOUD = "eragear_cloud",
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

	// ACP Settings
	// ACP Settings
	agentCommand: string;
	agentArgs: string;
	agentWorkingDir: string;
	agentNodePath: string;

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

export const DEFAULT_SETTINGS: MyPluginSettings = {
	provider: AIProviderType.BYOK_OPENAI,
	openaiApiKey: "",
	openaiModel: "gpt-4o",
	geminiApiKey: "",
	geminiModel: "gemini-1.5-flash",
	deepseekApiKey: "",
	deepseekModel: "deepseek-chat",

	agentCommand: "python",
	agentArgs: "agent.py",
	agentWorkingDir: "",
	agentNodePath: "",

	relayUrl: "wss://relay.eragear.app",

	eragearApiKey: "",

	mySetting: "default",
	apiEndpoint: "https://eragear.app",
	enableDebugMode: false,
	maxGraphHops: 3,
	searchMaxResults: 50,
	debounceDelay: 300,
	cloudflareAccessId: "",
	cloudflareAccessSecret: "",
	cloudflareApiEndpoint: "https://api.eragear.app",
};
