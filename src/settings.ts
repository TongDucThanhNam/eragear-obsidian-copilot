import { type App, PluginSettingTab, Setting } from "obsidian";
import type MyPlugin from "./main";

export interface MyPluginSettings {
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

export class SampleSettingTab extends PluginSettingTab {
	plugin: MyPlugin;

	constructor(app: App, plugin: MyPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName("Settings #1")
			.setDesc("It's a secret")
			.addText((text) =>
				text
					.setPlaceholder("Enter your secret")
					.setValue(this.plugin.settings.mySetting)
					.onChange(async (value) => {
						this.plugin.settings.mySetting = value;
						await this.plugin.saveSettings();
					}),
			);
	}
}
