import React, { useState } from "react";
import type EragearPlugin from "@/main";
import { MyPluginSettings } from "@/settings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GeneralSettings } from "../../components/Settings/sections/GeneralSettings";
import { ModelSettings } from "../../components/Settings/sections/ModelSettings";
import { AdvancedSettings } from "../../components/Settings/sections/AdvancedSettings";
import { PairingView } from "./PairingView";
import {  RobotIcon, CodeIcon, NetworkIcon, ToolboxIcon } from "@phosphor-icons/react";

interface SettingsPageProps {
	plugin: EragearPlugin;
}

type TabType = "general" | "models" | "advanced" | "remote";

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
				{/* Setting Tabs */}
				<Tabs defaultValue="general" value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)}>
					<TabsList variant="line">
						<TabsTrigger value="general">
							<ToolboxIcon aria-hidden />
							<span>General</span>
						</TabsTrigger>
						<TabsTrigger value="models">
							<RobotIcon aria-hidden />
							<span>Models</span>
						</TabsTrigger>
						<TabsTrigger value="advanced">
							<CodeIcon aria-hidden />
							<span>Advanced</span>
						</TabsTrigger>
						<TabsTrigger value="remote">
							<NetworkIcon aria-hidden />
							<span>Remote</span>
						</TabsTrigger>
					</TabsList>
					<TabsContent value={"general"}>
						<GeneralSettings
							settings={settings}
							updateSettings={updateSettings}
						/>

					</TabsContent>
					<TabsContent value={"models"}>
						<ModelSettings settings={settings} updateSettings={updateSettings} />
					</TabsContent>
					<TabsContent value={"advanced"}>
						<AdvancedSettings
							settings={settings}
							updateSettings={updateSettings}
						/>
					</TabsContent>
					<TabsContent value={"remote"}>
						<PairingView app={plugin.app} relayUrl={settings.relayUrl} />
					</TabsContent>
				</Tabs>
			</div>
		</div>
	);
};
