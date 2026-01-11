import React from "react";
import { MyPluginSettings } from "@/settings";
import { SettingItem } from "@/components/Settings/SettingItem";

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
			<h3>General Configuration</h3>

			<SettingItem
				name="Enable Debug Mode"
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
				name="API Endpoint"
				description="The custom API endpoint for Eragear services."
			>
				<input
					type="text"
					value={settings.apiEndpoint}
					onChange={(e) => updateSettings({ apiEndpoint: e.target.value })}
					placeholder="https://eragear.app"
				/>
			</SettingItem>
		</div>
	);
};
