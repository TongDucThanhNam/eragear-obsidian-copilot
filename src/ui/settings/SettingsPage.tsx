import React, { useState, useEffect } from "react";
import type EragearPlugin from "../../main";
import { MyPluginSettings, AIProviderType } from "../../settings";
import { GeneralSettings } from "./sections/GeneralSettings";
import { ModelSettings } from "./sections/ModelSettings";
import { AdvancedSettings } from "./sections/AdvancedSettings";

interface SettingsPageProps {
	plugin: EragearPlugin;
}

type TabType = "general" | "models" | "advanced";

export const SettingsPage: React.FC<SettingsPageProps> = ({ plugin }) => {
	const [activeTab, setActiveTab] = useState<TabType>("general");
	// Local state for settings to trigger re-renders
	const [settings, setSettings] = useState<MyPluginSettings>(plugin.settings);

	// Helper to update settings
	const updateSettings = async (newSettings: Partial<MyPluginSettings>) => {
		const updated = { ...settings, ...newSettings };
		setSettings(updated);
		plugin.settings = updated;
		await plugin.saveSettings();
	};

	return (
		<div className="eragear-settings">
			<div className="eragear-settings-header">
				<h1>Eragear Copilot</h1>
				<div className="eragear-settings-tabs">
					<button
						className={`eragear-tab-nav-item ${
							activeTab === "general" ? "is-active" : ""
						}`}
						onClick={() => setActiveTab("general")}
					>
						General
					</button>
					<button
						className={`eragear-tab-nav-item ${
							activeTab === "models" ? "is-active" : ""
						}`}
						onClick={() => setActiveTab("models")}
					>
						Models
					</button>
					<button
						className={`eragear-tab-nav-item ${
							activeTab === "advanced" ? "is-active" : ""
						}`}
						onClick={() => setActiveTab("advanced")}
					>
						Advanced
					</button>
				</div>
			</div>

			<div className="eragear-settings-content">
				{activeTab === "general" && (
					<GeneralSettings
						settings={settings}
						updateSettings={updateSettings}
					/>
				)}
				{activeTab === "models" && (
					<ModelSettings settings={settings} updateSettings={updateSettings} />
				)}
				{activeTab === "advanced" && (
					<AdvancedSettings
						settings={settings}
						updateSettings={updateSettings}
					/>
				)}
			</div>
		</div>
	);
};
