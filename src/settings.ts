import { type App, PluginSettingTab, Setting } from "obsidian";
import type MyPlugin from "./main";

export enum AIProviderType {
	BYOK_OPENAI = "openai",
	BYOK_GEMINI = "google",
	ERAGEAR_CLOUD = "eragear_cloud",
}

export interface MyPluginSettings {
	// AI Settings
	provider: AIProviderType;
	openaiApiKey: string;
	geminiApiKey: string;
	eragearApiKey: string;

	// Legacy/Other settings
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
	provider: AIProviderType.BYOK_OPENAI,
	openaiApiKey: "",
	geminiApiKey: "",
	eragearApiKey: "",

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

		containerEl.createEl("h2", { text: "Eragear Copilot Settings" });

		// AI Provider Selection
		new Setting(containerEl)
			.setName("AI Provider")
			.setDesc("Choose how you want to connect to AI.")
			.addDropdown((dropdown) =>
				dropdown
					.addOption(AIProviderType.BYOK_OPENAI, "OpenAI (Bring Your Own Key)")
					.addOption(
						AIProviderType.BYOK_GEMINI,
						"Google Gemini (Bring Your Own Key)",
					)
					.addOption(
						AIProviderType.ERAGEAR_CLOUD,
						"Eragear Cloud (Managed - Coming Soon)",
					)
					.setValue(this.plugin.settings.provider)
					.onChange(async (value) => {
						this.plugin.settings.provider = value as AIProviderType;
						await this.plugin.saveSettings();
						this.display(); // Re-render to show correct fields
					}),
			);

		// Provider-specific settings
		if (this.plugin.settings.provider === AIProviderType.BYOK_OPENAI) {
			new Setting(containerEl)
				.setName("OpenAI API Key")
				.setDesc("Enter your OpenAI API key (sk-...)")
				.addText((text) =>
					text
						.setPlaceholder("sk-...")
						.setValue(this.plugin.settings.openaiApiKey)
						.onChange(async (value) => {
							this.plugin.settings.openaiApiKey = value;
							await this.plugin.saveSettings();
						}),
				);
		} else if (this.plugin.settings.provider === AIProviderType.BYOK_GEMINI) {
			new Setting(containerEl)
				.setName("Gemini API Key")
				.setDesc("Enter your Google Gemini API key")
				.addText((text) =>
					text
						.setPlaceholder("AIzaSy...")
						.setValue(this.plugin.settings.geminiApiKey)
						.onChange(async (value) => {
							this.plugin.settings.geminiApiKey = value;
							await this.plugin.saveSettings();
						}),
				);
		} else if (this.plugin.settings.provider === AIProviderType.ERAGEAR_CLOUD) {
			new Setting(containerEl)
				.setName("Eragear Access Token")
				.setDesc("Unlock premium features with Eragear Cloud.")
				.addText((text) =>
					text
						.setPlaceholder("eg-...")
						.setValue(this.plugin.settings.eragearApiKey)
						.onChange(async (value) => {
							this.plugin.settings.eragearApiKey = value;
							await this.plugin.saveSettings();
						}),
				);

			const infoDiv = containerEl.createDiv();
			infoDiv.addClass("eragear-info-box");
			infoDiv.setText(
				"ℹ️ Eragear Cloud provides advanced RAG and syncing across devices. (Coming Soon)",
			);
			infoDiv.style.padding = "10px";
			infoDiv.style.backgroundColor = "var(--background-secondary)";
			infoDiv.style.borderRadius = "4px";
			infoDiv.style.marginTop = "10px";
		}

		containerEl.createEl("h3", { text: "Advanced / Legacy Settings" });

		new Setting(containerEl)
			.setName("Settings #1 (Legacy)")
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
