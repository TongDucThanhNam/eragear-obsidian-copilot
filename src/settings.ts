import { type App, PluginSettingTab, Setting } from "obsidian";
import type MyPlugin from "./main";

export interface MyPluginSettings {
	mySetting: string;
	apiEndpoint: string;
	enableDebugMode: boolean;
}

export const DEFAULT_SETTINGS: MyPluginSettings = {
	mySetting: "default",
	apiEndpoint: "https://eragear.app",
	enableDebugMode: false,
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
