import React from "react";
import { MyPluginSettings } from "@/app/settings/plugin-settings";
import { SettingItem } from "@/features/settings/components/SettingItem";

interface GeneralSettingsProps {
	settings: MyPluginSettings;
	updateSettings: (settings: Partial<MyPluginSettings>) => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
	settings,
	updateSettings,
}) => {
	return (
		<div className="eragear-settings-section">
			<h3>Runtime configuration</h3>

			<SettingItem
				name="Enable debug mode"
				description="Enable verbose logging to the console."
			>
				<div className="checkbox-container">
					<input
						type="checkbox"
						checked={settings.enableDebugMode}
						onChange={(e) =>
							updateSettings({ enableDebugMode: e.target.checked })
						}
					/>
				</div>
			</SettingItem>

			<SettingItem
				name="API endpoint"
				description="The custom API endpoint for Eragear services."
			>
				<input
					type="text"
					value={settings.apiEndpoint}
					onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
					placeholder="https://eragear.app"
				/>
			</SettingItem>

			<SettingItem
				name="Active learning sprint"
				description="Prioritize notes that belong to this sprint."
			>
				<input
					type="text"
					value={settings.activeLearningSprint}
					onChange={(e) =>
						updateSettings({ activeLearningSprint: e.target.value })
					}
					placeholder="systems-bridge"
				/>
			</SettingItem>
		</div>
	);
};
