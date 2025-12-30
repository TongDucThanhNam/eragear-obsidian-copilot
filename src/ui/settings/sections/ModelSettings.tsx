import React from "react";
import { SettingItem } from "../components/SettingItem";
import { MyPluginSettings, AIProviderType } from "../../../settings";

interface ModelSettingsProps {
	settings: MyPluginSettings;
	updateSettings: (settings: Partial<MyPluginSettings>) => Promise<void>;
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({
	settings,
	updateSettings,
}) => {
	const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
		updateSettings({ provider: e.target.value as AIProviderType });
	};

	return (
		<div className="eragear-settings-section">
			<h3>AI Provider & Models</h3>

			<SettingItem
				name="AI Provider"
				description="Choose how you want to connect to AI."
			>
				<select
					className="dropdown"
					value={settings.provider}
					onChange={handleProviderChange}
				>
					<option value={AIProviderType.BYOK_OPENAI}>
						OpenAI (Bring Your Own Key)
					</option>
					<option value={AIProviderType.BYOK_GEMINI}>
						Google Gemini (Bring Your Own Key)
					</option>
					<option value={AIProviderType.BYOK_DEEPSEEK}>
						DeepSeek (OpenAI Compatible)
					</option>
					<option value={AIProviderType.ERAGEAR_CLOUD}>
						Eragear Cloud (Managed)
					</option>
					<option value={AIProviderType.ACP_LOCAL}>
						ACP Local Agent (Experimental)
					</option>
				</select>
			</SettingItem>

			{settings.provider === AIProviderType.BYOK_OPENAI && (
				<div className="eragear-provider-card active">
					<div className="eragear-provider-header">
						<span className="eragear-provider-title">OpenAI Configuration</span>
					</div>
					<SettingItem
						name="API Key"
						description="Enter your OpenAI API key (sk-...)"
					>
						<input
							type="password"
							placeholder="sk-..."
							value={settings.openaiApiKey}
							onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
						/>
					</SettingItem>
					<SettingItem name="Model" description="e.g., gpt-4o, gpt-3.5-turbo">
						<input
							type="text"
							placeholder="gpt-4o"
							value={settings.openaiModel}
							onChange={(e) => updateSettings({ openaiModel: e.target.value })}
						/>
					</SettingItem>
				</div>
			)}

			{settings.provider === AIProviderType.BYOK_GEMINI && (
				<div className="eragear-provider-card active">
					<div className="eragear-provider-header">
						<span className="eragear-provider-title">Gemini Configuration</span>
					</div>
					<SettingItem
						name="API Key"
						description="Enter your Google Gemini API key"
					>
						<input
							type="password"
							placeholder="AIzaSy..."
							value={settings.geminiApiKey}
							onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
						/>
					</SettingItem>
					<SettingItem
						name="Model"
						description="e.g., gemini-1.5-flash, gemini-1.5-pro"
					>
						<input
							type="text"
							placeholder="gemini-1.5-flash"
							value={settings.geminiModel}
							onChange={(e) => updateSettings({ geminiModel: e.target.value })}
						/>
					</SettingItem>
				</div>
			)}

			{settings.provider === AIProviderType.BYOK_DEEPSEEK && (
				<div className="eragear-provider-card active">
					<div className="eragear-provider-header">
						<span className="eragear-provider-title">
							DeepSeek Configuration
						</span>
					</div>
					<SettingItem name="API Key" description="Enter your DeepSeek API key">
						<input
							type="password"
							placeholder="sk-..."
							value={settings.deepseekApiKey}
							onChange={(e) =>
								updateSettings({ deepseekApiKey: e.target.value })
							}
						/>
					</SettingItem>
					<SettingItem
						name="Model"
						description="Use 'deepseek-chat' or 'deepseek-reasoner'"
					>
						<input
							type="text"
							placeholder="deepseek-chat"
							value={settings.deepseekModel}
							onChange={(e) =>
								updateSettings({ deepseekModel: e.target.value })
							}
						/>
					</SettingItem>
					<div className="eragear-info-box">
						ℹ️ DeepSeek-V3 is now available via 'deepseek-chat'. Use
						'deepseek-reasoner' for reasoning tasks.
					</div>
				</div>
			)}

			{settings.provider === AIProviderType.ERAGEAR_CLOUD && (
				<div className="eragear-provider-card active">
					<div className="eragear-provider-header">
						<span className="eragear-provider-title">Eragear Cloud</span>
					</div>
					<SettingItem
						name="Access Token"
						description="Unlock premium features with Eragear Cloud."
					>
						<input
							type="password"
							placeholder="eg-..."
							value={settings.eragearApiKey}
							onChange={(e) =>
								updateSettings({ eragearApiKey: e.target.value })
							}
						/>
					</SettingItem>
					<div className="eragear-info-box">
						ℹ️ Eragear Cloud provides advanced RAG and syncing across devices.
						(Coming Soon)
					</div>
				</div>
			)}

			{settings.provider === AIProviderType.ACP_LOCAL && (
				<div className="eragear-provider-card active">
					<div className="eragear-provider-header">
						<span className="eragear-provider-title">
							Local Agent Configuration
						</span>
					</div>

					<SettingItem
						name="Active agent"
						description="Choose which agent handles new chat sessions."
					>
						<select
							className="dropdown"
							value={
								settings.agentCommand === "gemini"
									? "gemini"
									: settings.agentCommand === "claude-code-acp"
										? "claude-code-acp"
										: settings.agentCommand === "opencode"
											? "opencode"
											: "custom"
							}
							onChange={(e) => {
								const val = e.target.value;
								if (val === "gemini") {
									updateSettings({
										agentCommand: "gemini",
										agentArgs: "--experimental-acp",
									});
								} else if (val === "claude") {
									updateSettings({
										agentCommand: "claude-code-acp",
										agentArgs: "",
									});
								} else if (val === "opencode") {
									updateSettings({
										agentCommand: "opencode",
										agentArgs: "acp",
									});
								} else {
									// Switch to custom mode by clearing the preset command
									// or setting it to a default placeholder if emptiness causes issues.
									// Setting to empty string allows the user to type fresh.
									updateSettings({
										agentCommand: "",
										agentArgs: "",
									});
								}
							}}
						>
							<option value="custom">Custom Agent</option>
							<option value="gemini">Gemini CLI (gemini-cli)</option>
							<option value="claude">Claude Code (claude)</option>
							<option value="opencode">OpenCode</option>
						</select>
					</SettingItem>

					<SettingItem
						name="Node.js path"
						description="Absolute path to Node.js executable. Useful if 'node' is not in PATH."
					>
						<input
							type="text"
							placeholder="/usr/local/bin/node"
							value={settings.agentNodePath || ""}
							onChange={(e) =>
								updateSettings({ agentNodePath: e.target.value })
							}
						/>
					</SettingItem>

					{/* Only show raw command details if Custom is selected OR user wants to override */}
					<details>
						<summary style={{ cursor: "pointer", marginBottom: "10px" }}>
							Advanced Configuration
						</summary>
						<SettingItem
							name="Command"
							description="Command to spawn the agent"
						>
							<input
								type="text"
								placeholder="python"
								value={settings.agentCommand}
								onChange={(e) =>
									updateSettings({ agentCommand: e.target.value })
								}
							/>
						</SettingItem>
						<SettingItem
							name="Arguments"
							description="Arguments for the command"
						>
							<input
								type="text"
								placeholder="-m my_agent"
								value={settings.agentArgs}
								onChange={(e) => updateSettings({ agentArgs: e.target.value })}
							/>
						</SettingItem>
					</details>

					<SettingItem
						name="Working Directory"
						description="Absolute path to the agent's working directory"
					>
						<input
							type="text"
							placeholder="/path/to/project"
							value={settings.agentWorkingDir}
							onChange={(e) =>
								updateSettings({ agentWorkingDir: e.target.value })
							}
						/>
					</SettingItem>

					<SettingItem
						name="Auto-allow permissions"
						description="Automatically allow all permission requests from agents. ⚠️ Use with caution."
					>
						<div className="checkbox-container">
							<input type="checkbox" checked={true} disabled />
							<span>(Coming soon)</span>
						</div>
					</SettingItem>

					<div className="eragear-info-box">
						ℹ️ This will spawn a local process using the Agent Communication
						Protocol.
					</div>
				</div>
			)}
		</div>
	);
};
