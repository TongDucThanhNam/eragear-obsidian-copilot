import {
	type App,
	Editor,
	MarkdownView,
	Modal,
	Notice,
	Plugin,
	WorkspaceLeaf,
} from "obsidian";
import { VaultHandler } from "./core/vault-handler";
import {
	DEFAULT_SETTINGS,
	type MyPluginSettings,
	SampleSettingTab,
} from "./settings";
import { ERAGEAR_VIEW_TYPE, EragearView } from "./ui/eragear-view";

// Remember to rename these classes and interfaces!

export default class MyPlugin extends Plugin {
	settings: MyPluginSettings;
	vaultHandler: VaultHandler;

	async onload() {
		await this.loadSettings();
		this.vaultHandler = new VaultHandler(this.app);

		// 1. Register the custom view for Eragear Copilot sidebar
		this.registerView(ERAGEAR_VIEW_TYPE, (leaf) => new EragearView(leaf));

		// 2. Update ribbon icon to open Eragear Copilot sidebar
		this.addRibbonIcon("bot", "Open Eragear Copilot", () => {
			this.activateView();
		});

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText("Eragear: Ready");

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SampleSettingTab(this.app, this));

		// 3. Add command to open Eragear Copilot
		this.addCommand({
			id: "open-eragear-copilot",
			name: "Open Copilot Sidebar",
			callback: () => {
				this.activateView();
			},
		});
	}

	onunload() {
		// Cleanup logic if needed
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	/**
	 * Activates (opens) the Eragear Copilot view in the right sidebar.
	 * Uses singleton pattern to prevent multiple instances.
	 */
	async activateView() {
		const { workspace } = this.app;

		// Check if view already exists
		const leaves = workspace.getLeavesOfType(ERAGEAR_VIEW_TYPE);

		if (leaves.length > 0) {
			// If view is already open, just reveal it (focus on it)
			const leaf = leaves[0];
			if (leaf) {
				workspace.revealLeaf(leaf);
			}
		} else {
			// If view is not open, create a new leaf in the right sidebar
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: ERAGEAR_VIEW_TYPE, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}
}
