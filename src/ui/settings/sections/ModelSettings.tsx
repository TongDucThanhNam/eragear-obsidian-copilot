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
		</div>
	);
};
