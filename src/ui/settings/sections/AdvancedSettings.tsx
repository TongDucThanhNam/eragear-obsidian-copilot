import React from "react";
import { SettingItem } from "../components/SettingItem";
import { MyPluginSettings } from "../../../settings";

interface AdvancedSettingsProps {
	settings: MyPluginSettings;
	updateSettings: (settings: Partial<MyPluginSettings>) => Promise<void>;
}

export const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({
	settings,
	updateSettings,
}) => {
	return (
		<div className="eragear-settings-section">
			<h3>Advanced Configuration</h3>

			<SettingItem
				name="Max Graph Hops"
				description="Maximum number of links to follow when building context (1-5)."
			>
				<input
					type="range"
					min="1"
					max="5"
					step="1"
					value={settings.maxGraphHops}
					onChange={(e) =>
						updateSettings({ maxGraphHops: parseInt(e.target.value) })
					}
				/>
				<span style={{ marginLeft: "10px" }}>{settings.maxGraphHops}</span>
			</SettingItem>

			<SettingItem
				name="Search Max Results"
				description="Maximum number of results to retrieve from search."
			>
				<input
					type="number"
					value={settings.searchMaxResults}
					onChange={(e) =>
						updateSettings({ searchMaxResults: parseInt(e.target.value) })
					}
				/>
			</SettingItem>

			<SettingItem
				name="Debounce Delay (ms)"
				description="Delay before processing changes (prevents rapid API calls)."
			>
				<input
					type="number"
					value={settings.debounceDelay}
					onChange={(e) =>
						updateSettings({ debounceDelay: parseInt(e.target.value) })
					}
				/>
			</SettingItem>

			<div
				style={{
					marginTop: "20px",
					borderTop: "1px solid var(--background-modifier-border)",
					paddingTop: "20px",
				}}
			>
				<h4>Cloudflare Configuration (Legacy)</h4>
				<SettingItem name="Access Client ID">
					<input
						type="text"
						value={settings.cloudflareAccessId}
						onChange={(e) =>
							updateSettings({ cloudflareAccessId: e.target.value })
						}
					/>
				</SettingItem>
				<SettingItem name="Access Client Secret">
					<input
						type="password"
						value={settings.cloudflareAccessSecret}
						onChange={(e) =>
							updateSettings({ cloudflareAccessSecret: e.target.value })
						}
					/>
				</SettingItem>
				<SettingItem name="Cloudflare API Endpoint">
					<input
						type="text"
						value={settings.cloudflareApiEndpoint}
						onChange={(e) =>
							updateSettings({ cloudflareApiEndpoint: e.target.value })
						}
					/>
				</SettingItem>
			</div>
		</div>
	);
};
