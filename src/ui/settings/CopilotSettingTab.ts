import { App, PluginSettingTab } from "obsidian";
import { createRoot, Root } from "react-dom/client";
import { createElement } from "react";
import type EragearPlugin from "../../main";
import { SettingsPage } from "./SettingsPage";

export class CopilotSettingTab extends PluginSettingTab {
	plugin: EragearPlugin;
	root: Root | null = null;

	constructor(app: App, plugin: EragearPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();
		containerEl.addClass("eragear-settings-container");

		// Create a root div for React
		const reactRoot = containerEl.createDiv();

		this.root = createRoot(reactRoot);
		this.root.render(createElement(SettingsPage, { plugin: this.plugin }));
	}

	hide(): void {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
