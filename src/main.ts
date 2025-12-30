/**
 * Eragear Obsidian Copilot - Main Entry Point
 *
 * This file handles plugin lifecycle and initialization.
 * Per Hexagonal Architecture principles, it only:
 * 1. Initializes Core services (WorkerClient, VaultManager, ContextAssembler)
 * 2. Initializes Infrastructure services (CloudflareService)
 * 3. Registers UI views and commands
 * 4. Handles cleanup on unload
 *
 * All business logic is delegated to Core and Services layers.
 */

import { Notice, Plugin } from "obsidian";
import {
	createContextAssembler,
	createVaultManager,
	createGraphService,
	getWorkerClient,
} from "./core";
import type { ContextAssembler } from "./core/context-assembler";
import type { VaultManager } from "./core/vault-manager";
import type { CloudflareService } from "./services";
import { createCloudflareService } from "./services";
import { DEFAULT_SETTINGS, type MyPluginSettings } from "./settings";
import { CopilotSettingTab } from "./ui/settings/CopilotSettingTab";
import { ERAGEAR_VIEW_TYPE, EragearView } from "./ui/eragear-view";
import { diffViewExtension } from "./ui/editor/diff-view-plugin";

/**
 * Main Plugin Class
 *
 * Minimal lifecycle handler that delegates to service layer.
 */
export default class EragearPlugin extends Plugin {
	settings: MyPluginSettings;

	// Core services
	vaultManager: VaultManager | null = null;
	contextAssembler: ContextAssembler | null = null;
	cloudflareService: CloudflareService | null = null;

	// UI state
	private statusBar: HTMLElement | null = null;

	async onload() {
		console.log("[Eragear] Loading plugin...");

		try {
			// 1. Load settings
			await this.loadSettings();

			// 2. Initialize core services
			await this.initializeServices();

			// 3. Register UI components
			this.registerUIComponents();

			// Register Editor Extensions
			this.registerEditorExtension(diffViewExtension);

			// 4. Register commands
			this.registerCommands();

			// 5. Listen for vault changes (keep Worker index updated)
			this.setupVaultListeners();

			// 6. Update status bar
			this.updateStatusBar("ready");

			console.log("[Eragear] Plugin loaded successfully");
		} catch (error) {
			console.error("[Eragear] Failed to load plugin:", error);
			this.updateStatusBar("error");
			new Notice("Eragear: Failed to initialize plugin");
		}
	}

	onunload() {
		console.log("[Eragear] Unloading plugin...");

		try {
			// Terminate worker gracefully
			const workerClient = getWorkerClient();
			workerClient.terminate();

			// Clean up listeners (if any)
			// Vue framework/React should handle component cleanup

			this.updateStatusBar("unloaded");
		} catch (error) {
			console.error("[Eragear] Error during cleanup:", error);
		}
	}

	/**
	 * Initialize all service layers
	 */
	private async initializeServices(): Promise<void> {
		// Create VaultManager (wraps Obsidian Vault API)
		this.vaultManager = createVaultManager(this.app);

		// Create GraphService (now required for ContextAssembler)
		const graphService = createGraphService(this.app);
		await graphService.initializeGraph();

		// Create ContextAssembler (orchestrates data flow)
		if (!this.vaultManager) throw new Error("VaultManager not initialized");
		this.contextAssembler = createContextAssembler(
			this.vaultManager,
			graphService,
			{
				maxGraphHops: this.settings.maxGraphHops,
				maxRelatedNotes: 5,
				searchMaxResults: this.settings.searchMaxResults,
				debounceDelay: this.settings.debounceDelay,
			},
		);

		// Create CloudflareService (handles AI API communication)
		this.cloudflareService = createCloudflareService(
			{
				accessClientId: this.settings.cloudflareAccessId,
				accessClientSecret: this.settings.cloudflareAccessSecret,
				apiEndpoint: this.settings.cloudflareApiEndpoint,
			},
			(message) => {
				// Optional: log to plugin console instead of console.log
				console.log("[CloudflareService]", message);
			},
		);

		// // Validate Cloudflare config
		// const validation = this.cloudflareService.validateConfig();
		// if (!validation.valid) {
		// 	console.warn(
		// 		"[Eragear] Cloudflare config incomplete:",
		// 		validation.errors,
		// 	);
		// 	new Notice(
		// 		"Eragear: Please configure Cloudflare credentials in settings",
		// 	);
		// }

		console.log("[Eragear] Services initialized");
	}

	/**
	 * Register UI components with Obsidian
	 */
	private registerUIComponents(): void {
		// Register custom view
		this.registerView(ERAGEAR_VIEW_TYPE, (leaf) => {
			if (
				!this.vaultManager ||
				!this.contextAssembler ||
				!this.cloudflareService
			) {
				throw new Error("Services not initialized");
			}
			return new EragearView(leaf, this);
		});

		// Add ribbon icon
		this.addRibbonIcon("bot", "Open Eragear Copilot", () => {
			this.activateView();
		});

		// Add status bar
		this.statusBar = this.addStatusBarItem();
		this.updateStatusBar("ready");

		// Add settings tab
		this.addSettingTab(new CopilotSettingTab(this.app, this));
	}

	/**
	 * Register commands
	 */
	private registerCommands(): void {
		this.addCommand({
			id: "open-eragear-copilot",
			name: "Open Copilot Sidebar",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "eragear-search",
			name: "Search Vault with Eragear",
			callback: async () => {
				if (!this.contextAssembler) return;
				new Notice("Eragear search feature coming soon");
			},
		});
	}

	/**
	 * Setup listeners for vault changes
	 * Keeps Worker index up-to-date
	 */
	private setupVaultListeners(): void {
		if (!this.vaultManager) return;

		// Listen for metadata changes
		const unsubscribe = this.vaultManager.onMetadataChanged((file) => {
			// Debounce and update Worker index
			// TODO: Implement in ContextAssembler or separate sync service
			console.debug(`[Eragear] Metadata changed: ${file.path}`);
		});

		// Register cleanup
		this.register(() => unsubscribe());
	}

	/**
	 * Update status bar text
	 */
	private updateStatusBar(
		status: "ready" | "processing" | "error" | "unloaded",
	): void {
		if (!this.statusBar) return;

		const messages: Record<string, string> = {
			ready: "Eragear: Ready",
			processing: "Eragear: Processing...",
			error: "Eragear: Error",
			unloaded: "Eragear: Unloaded",
		};

		const message = messages[status];
		if (message) {
			this.statusBar.setText(message);
		}
	}

	/**
	 * Load plugin settings
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<MyPluginSettings>,
		);
	}

	/**
	 * Save plugin settings
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);

		// Update service configs if they exist
		if (this.contextAssembler) {
			this.contextAssembler.updateConfig({
				maxGraphHops: this.settings.maxGraphHops,
				searchMaxResults: this.settings.searchMaxResults,
				debounceDelay: this.settings.debounceDelay,
			});
		}

		if (this.cloudflareService) {
			this.cloudflareService.updateConfig({
				accessClientId: this.settings.cloudflareAccessId,
				accessClientSecret: this.settings.cloudflareAccessSecret,
				apiEndpoint: this.settings.cloudflareApiEndpoint,
			});
		}
	}

	/**
	 * Activate/open the Eragear Copilot view in sidebar
	 */
	async activateView(): Promise<void> {
		const { workspace } = this.app;
		const leaves = workspace.getLeavesOfType(ERAGEAR_VIEW_TYPE);

		if (leaves.length > 0 && leaves[0]) {
			// View already exists, just reveal it
			workspace.revealLeaf(leaves[0]);
		} else {
			// Create new view in right sidebar
			const leaf = workspace.getRightLeaf(false);
			if (leaf) {
				await leaf.setViewState({ type: ERAGEAR_VIEW_TYPE, active: true });
				workspace.revealLeaf(leaf);
			}
		}
	}

	/**
	 * Getter for services (used by UI components)
	 */
	getServices() {
		return {
			vaultManager: this.vaultManager,
			contextAssembler: this.contextAssembler,
			cloudflareService: this.cloudflareService,
		};
	}
}
