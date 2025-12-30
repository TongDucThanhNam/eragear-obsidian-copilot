import type { ChatModelConfig, MyPluginSettings } from "../../../settings";
import { ChatModelsTable } from "../components/ChatModelsTable";
import { SettingItem } from "../components/SettingItem";

interface ModelSettingsProps {
	settings: MyPluginSettings;
	updateSettings: (settings: Partial<MyPluginSettings>) => Promise<void>;
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({
	settings,
	updateSettings,
}) => {
	const handleUpdateChatModels = async (models: ChatModelConfig[]) => {
		await updateSettings({ chatModels: models });
	};

	return (
		<div className="eragear-settings-section">
			<h3>AI Provider & Models</h3>

			{/* Chat Models & Agents Table */}
			<ChatModelsTable
				chatModels={settings.chatModels || []}
				onUpdate={handleUpdateChatModels}
			/>

			{/* Global API Keys Section */}
			<div style={{ marginTop: "32px" }}>
				<h3>Global API Keys</h3>
				<p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
					These keys are used for built-in models. You can also set per-model
					keys in the table above.
				</p>

				<SettingItem
					name="OpenAI API Key"
					description="Used for GPT-4o, GPT-4o Mini, etc."
				>
					<input
						type="password"
						placeholder="sk-..."
						value={settings.openaiApiKey}
						onChange={(e) => updateSettings({ openaiApiKey: e.target.value })}
					/>
				</SettingItem>

				<SettingItem
					name="Google Gemini API Key"
					description="Used for Gemini models"
				>
					<input
						type="password"
						placeholder="AIzaSy..."
						value={settings.geminiApiKey}
						onChange={(e) => updateSettings({ geminiApiKey: e.target.value })}
					/>
				</SettingItem>

				<SettingItem
					name="DeepSeek API Key"
					description="Used for DeepSeek V3, R1"
				>
					<input
						type="password"
						placeholder="sk-..."
						value={settings.deepseekApiKey}
						onChange={(e) => updateSettings({ deepseekApiKey: e.target.value })}
					/>
				</SettingItem>

				<SettingItem
					name="Eragear Cloud Token"
					description="For premium cloud features (coming soon)"
				>
					<input
						type="password"
						placeholder="eg-..."
						value={settings.eragearApiKey}
						onChange={(e) => updateSettings({ eragearApiKey: e.target.value })}
					/>
				</SettingItem>
			</div>

			{/* ACP Global Settings */}
			<div style={{ marginTop: "32px" }}>
				<h3>ACP Agent Settings</h3>
				<p style={{ color: "var(--text-muted)", marginBottom: "16px" }}>
					Global settings for local ACP agents.
				</p>

				<SettingItem
					name="Default Working Directory"
					description="Used when agent-specific directory is not set"
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
					name="Node.js Path"
					description="Absolute path to Node.js (if not in PATH)"
				>
					<input
						type="text"
						placeholder="/usr/local/bin/node"
						value={settings.agentNodePath || ""}
						onChange={(e) => updateSettings({ agentNodePath: e.target.value })}
					/>
				</SettingItem>
			</div>
		</div>
	);
};
