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

import { Notice, Plugin, TFile } from "obsidian";
import { createContextAssembler } from "@/core/context-assembler";
import {
	scanLearningAgentTasks,
	updateLearningAgentTaskStatus,
	type LearningAgentTaskSummary,
} from "@/agent/task-store";
import {
	runLearningAgentTaskWithAcp,
	type LearningAgentExecutionEvent,
} from "@/agent/learning-agent-executor";
import { createLearningAgentTaskFile } from "@/agent/task-writer";
import {
	applyAgentWriteProposal,
	rejectAgentWriteProposal,
	scanAgentWriteProposals,
	type AgentWriteProposalSummary,
} from "@/agent/write-proposal";
import { createGraphService } from "@/infra/obsidian/graph-service";
import { createVaultManager } from "@/infra/obsidian/vault-manager";
import { getWorkerClient } from "@/infra/workers/worker-client";
import type { ContextAssembler } from "@/core/context-assembler";
import {
	type CloudflareService,
	createCloudflareService,
} from "@/infra/ai/cloudflare-api";
import type { VaultManager } from "@/infra/obsidian/vault-manager";
import { diffViewExtension } from "@/app/editor/diff-view-plugin";
import {
	DEFAULT_SETTINGS,
	initializeSettingsWithVaultPath,
	type MyPluginSettings,
} from "@/app/settings/plugin-settings";
import { ERAGEAR_VIEW_TYPE, EragearView } from "@/app/views/eragear-view";
import { CopilotSettingTab } from "@/app/views/settings/CopilotSettingTab";
import { runLearningAction } from "@/learning/action-runner";
import { appendLearningActionLog } from "@/learning/action-log";
import {
	generateHtmlExplainerForNote,
	type HtmlExplainerRelatedNote,
} from "@/learning/artifact-manager";
import { generateBridgeNoteForNote } from "@/learning/bridge-note-manager";
import { generateCaseStudyForNote } from "@/learning/case-study-manager";
import { generateExaminerForNote } from "@/learning/examiner-manager";
import {
	patchLearningFrontmatter,
	type LearningFrontmatterPatch,
} from "@/learning/frontmatter-writer";
import { formatLearningDate } from "@/learning/frontmatter";
import { generateNextActionQueue } from "@/learning/next-action-engine";
import { scanLearningNote, scanVaultLearningNotes } from "@/learning/note-scanner";
import type { AgentTaskFileResult } from "@/agent/agent-task";
import type { AgentTaskStatus } from "@/agent/agent-task";
import type {
	GeneratedArtifact,
	LearningNote,
	LearningScanResult,
	NextActionCandidate,
} from "@/learning/types";

const MAX_LEARNING_ACP_RUN_EVENTS = 40;

export interface LearningAcpRunEvent extends LearningAgentExecutionEvent {
	id: string;
	sequence: number;
}

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
	private lastLearningScan: LearningScanResult | null = null;
	private learningStateListeners = new Set<() => void>();
	private learningAcpRunEvents: LearningAcpRunEvent[] = [];
	private learningAcpRunEventSequence = 0;

	async onload() {
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
		} catch {
			this.updateStatusBar("error");
			new Notice("Eragear: Failed to initialize plugin");
		}
	}

	onunload() {
		try {
			// Terminate worker gracefully
			const workerClient = getWorkerClient();
			workerClient.terminate();

			// Clean up listeners (if any)
			// Vue framework/React should handle component cleanup

			this.updateStatusBar("unloaded");
		} catch {
			// Silent cleanup failure
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
			(message: any) => {
				if (this.settings.enableDebugMode) {
					console.log("[CloudflareService]", message);
				}
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

		if (this.settings.enableDebugMode) {
			console.log("[Eragear] Services initialized");
		}
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
		this.addRibbonIcon("bot", "Open Eragear copilot", () => {
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
			id: "open-copilot",
			name: "Open copilot sidebar",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "search-vault",
			name: "Search vault",
			callback: async () => {
				if (!this.contextAssembler) return;
				new Notice("Eragear search feature coming soon");
			},
		});

		this.addCommand({
			id: "open-learning-center",
			name: "Open learning center",
			callback: () => {
				this.activateView();
			},
		});

		this.addCommand({
			id: "diagnose-current-note",
			name: "Diagnose current note",
			callback: () => {
				const active = this.getActiveLearningNote();
				if (!active) {
					new Notice("Open a note first.");
					return;
				}
				const blockers = active.blockers?.[0] ?? active.missingFields[0];
				new Notice(
					blockers
						? `Current blocker: ${blockers}`
						: `Current status: ${active.status ?? "missing status"}.`,
				);
				this.activateView();
			},
		});

		this.addCommand({
			id: "generate-next-action-queue",
			name: "Generate next action queue",
			callback: () => {
				const queue = this.getLearningActionQueue();
				new Notice(
					queue[0]
						? `Today focus: ${queue[0].action} for ${queue[0].note.title}`
						: "No learning action found.",
				);
				this.activateView();
			},
		});

		this.addCommand({
			id: "start-learning-session",
			name: "Start learning session",
			callback: () => {
				this.activateView();
				const next = this.getNextLearningAction();
				new Notice(
					next
						? `Start with: ${next.action} for ${next.note.title}`
						: "No learning action found.",
				);
			},
		});

		this.addCommand({
			id: "run-examiner",
			name: "Run examiner",
			callback: async () => {
				await this.generateExaminerForActiveNote();
			},
		});

		this.addCommand({
			id: "scan-learning-notes",
			name: "Scan learning notes",
			callback: () => {
				const scan = this.scanLearningNotes();
				new Notice(
					`Learning scan: ${scan.summary.totalNotes} notes, ${scan.summary.weakNotes} weak, ${scan.summary.missingArtifacts} missing artifacts, ${scan.summary.dueReviews} due reviews.`,
				);
			},
		});

		this.addCommand({
			id: "show-weak-notes",
			name: "Show weak notes",
			callback: () => {
				const scan = this.scanLearningNotes();
				const firstWeakNote = scan.weakNotes[0];
				if (!firstWeakNote) {
					new Notice("No weak notes found.");
					return;
				}

				new Notice(
					`Weak notes: ${scan.summary.weakNotes}. First: ${firstWeakNote.title}`,
				);
			},
		});

		this.addCommand({
			id: "what-should-i-do-next",
			name: "What should I do next?",
			callback: () => {
				const next = this.getNextLearningAction();
				if (!next) {
					new Notice("No learning action found.");
					return;
				}

				new Notice(`Next: ${next.action} for ${next.note.title}`);
			},
		});

		this.addCommand({
			id: "generate-html-explainer",
			name: "Generate HTML explainer",
			callback: async () => {
				const artifact = await this.generateHtmlExplainerForActiveNote();
				if (artifact) {
					new Notice(`HTML explainer created: ${artifact.artifactPath}`);
				}
			},
		});

		this.addCommand({
			id: "generate-bridge-note",
			name: "Generate bridge note",
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice("Open a note first.");
					return;
				}
				const artifact = await generateBridgeNoteForNote(this.app, activeFile, {
					relatedNotes: await this.getLearningRelatedNotes({
						note: scanLearningNote(this.app, activeFile),
						action: "Generate bridge note",
					}),
				});
				new Notice(`Bridge note created: ${artifact.artifactPath}`);
				this.notifyLearningStateChanged();
			},
		});

		this.addCommand({
			id: "generate-case-study",
			name: "Generate case study",
			callback: async () => {
				const activeFile = this.app.workspace.getActiveFile();
				if (!activeFile) {
					new Notice("Open a note first.");
					return;
				}
				const artifact = await generateCaseStudyForNote(this.app, activeFile, {
					relatedNotes: await this.getLearningRelatedNotes({
						note: scanLearningNote(this.app, activeFile),
						action: "Generate case study",
					}),
				});
				new Notice(`Case study created: ${artifact.artifactPath}`);
				this.notifyLearningStateChanged();
			},
		});

		this.addCommand({
			id: "review-agent-proposals",
			name: "Review agent proposals",
			callback: () => {
				this.activateView();
				new Notice("Open Artifact Review in the Learning Command Center.");
			},
		});

		this.addCommand({
			id: "run-next-learning-action",
			name: "Run next learning action",
			callback: async () => {
				await this.runNextLearningAction();
			},
		});

		this.addCommand({
			id: "create-next-learning-agent-task",
			name: "Create next learning agent task",
			callback: async () => {
				const next = this.getNextLearningAction();
				if (!next) {
					new Notice("No learning action found.");
					return;
				}
				if (next.suggestedAgent === "deterministic") {
					new Notice("Run suggested action for this learning action.");
					return;
				}
				await this.createLearningAgentTask(next);
			},
		});

		this.addCommand({
			id: "run-next-learning-agent-task",
			name: "Run next learning agent task",
			callback: async () => {
				const task = this.getLearningAgentTasks().find(
					(candidate) =>
						(candidate.status === "queued" ||
							candidate.status === "blocked") &&
						candidate.suggestedAgent !== "deterministic",
				);
				if (!task) {
					new Notice("No queued agent task found.");
					return;
				}
				await this.runLearningAgentTask(task.path);
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
			if (this.settings.enableDebugMode) {
				console.debug(`[Eragear] Metadata changed: ${file.path}`);
			}
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
			ready: "Eragear: ready",
			processing: "Eragear: processing...",
			error: "Eragear: error",
			unloaded: "Eragear: unloaded",
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

		// Initialize settings with vault path (set workingDir to vault directory)
		const adapter = this.app.vault.adapter as { basePath?: string };
		const vaultPath = adapter.basePath || "";
		if (vaultPath) {
			this.settings = initializeSettingsWithVaultPath(this.settings, vaultPath);
		}
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

	scanLearningNotes(): LearningScanResult {
		const scan = scanVaultLearningNotes(this.app);
		this.lastLearningScan = scan;
		return scan;
	}

	getLearningScan(): LearningScanResult {
		return this.lastLearningScan ?? this.scanLearningNotes();
	}

	getNextLearningAction(): NextActionCandidate | null {
		const scan = this.getLearningScan();
		return generateNextActionQueue(
			scan,
			this.settings.activeLearningSprint || undefined,
		)[0] ?? null;
	}

	getLearningActionQueue(): NextActionCandidate[] {
		return generateNextActionQueue(
			this.getLearningScan(),
			this.settings.activeLearningSprint || undefined,
		);
	}

	subscribeLearningState(listener: () => void): () => void {
		this.learningStateListeners.add(listener);
		return () => {
			this.learningStateListeners.delete(listener);
		};
	}

	getLearningAcpRunEvents(): LearningAcpRunEvent[] {
		return [...this.learningAcpRunEvents];
	}

	clearLearningAcpRunEvents(): void {
		this.learningAcpRunEvents = [];
		this.notifyLearningStateChanged();
	}

	private clearLearningAcpRunEventsForTask(taskPath: string): void {
		this.learningAcpRunEvents = this.learningAcpRunEvents.filter(
			(event) => event.taskPath !== taskPath,
		);
	}

	private recordLearningAcpRunEvent(
		event: LearningAgentExecutionEvent,
	): LearningAcpRunEvent {
		this.learningAcpRunEventSequence += 1;
		const nextEvent = {
			...event,
			id: `acp-run-${this.learningAcpRunEventSequence}`,
			sequence: this.learningAcpRunEventSequence,
		};
		this.learningAcpRunEvents = [
			...this.learningAcpRunEvents,
			nextEvent,
		].slice(-MAX_LEARNING_ACP_RUN_EVENTS);
		return nextEvent;
	}

	getLearningAgentTasks(): LearningAgentTaskSummary[] {
		return scanLearningAgentTasks(this.app);
	}

	async getAgentWriteProposals(): Promise<AgentWriteProposalSummary[]> {
		return scanAgentWriteProposals(this.app, this.getLearningAgentTasks());
	}

	getActiveLearningNote(): LearningNote | null {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) return null;
		return scanLearningNote(this.app, activeFile);
	}

	async runNextLearningAction(): Promise<void> {
		const next = this.getNextLearningAction();

		if (!next) {
			new Notice("No learning action found.");
			return;
		}

		await this.runLearningActionCandidate(next);
	}

	async runLearningActionCandidate(
		candidate: NextActionCandidate,
	): Promise<void> {
		const relatedNotes = await this.getLearningRelatedNotes(candidate);
		const result = await runLearningAction(this.app, candidate, {
			relatedNotes,
			defaultArea: this.settings.activeLearningSprint || undefined,
		});
		await appendLearningActionLog(this.app, candidate, result);
		await this.completeMatchingAgentTasks(candidate);
		this.lastLearningScan = scanVaultLearningNotes(this.app);
		this.notifyLearningStateChanged();

		if (result.type === "artifact") {
			new Notice(`Created: ${result.artifact.artifactPath}`);
			return;
		}

		if (result.type === "transition") {
			new Notice(result.message);
			return;
		}

		new Notice(result.message);
	}

	async createLearningAgentTask(
		candidate: NextActionCandidate,
	): Promise<AgentTaskFileResult | null> {
		if (candidate.suggestedAgent === "deterministic") {
			new Notice("Run suggested action for this learning action.");
			return null;
		}

		const file = this.app.vault.getAbstractFileByPath(candidate.note.path);
		if (!(file instanceof TFile) || file.extension !== "md") {
			new Notice("Learning note not found.");
			return null;
		}

		const relatedNotes = await this.getLearningRelatedNotes(candidate);
		const source = await this.app.vault.cachedRead(file);
		const result = await createLearningAgentTaskFile(
			this.app,
			candidate,
			source,
			relatedNotes,
		);
		new Notice(`Created agent task: ${result.taskPath}`);
		this.notifyLearningStateChanged();
		return result;
	}

	async updateLearningAgentTaskStatus(
		taskPath: string,
		status: AgentTaskStatus,
	): Promise<void> {
		await updateLearningAgentTaskStatus(this.app, taskPath, status);
		this.notifyLearningStateChanged();
		new Notice(`Agent task marked ${status}.`);
	}

	async runLearningAgentTask(taskPath: string): Promise<void> {
		const task = this.getLearningAgentTasks().find(
			(candidate) => candidate.path === taskPath,
		);
		if (!task) {
			new Notice("Agent task not found.");
			return;
		}
		if (task.suggestedAgent === "deterministic") {
			new Notice("Run suggested action for this learning action.");
			return;
		}

		this.updateStatusBar("processing");
		this.clearLearningAcpRunEventsForTask(task.path);
		this.recordLearningAcpRunEvent({
			kind: "task_status",
			taskPath: task.path,
			taskTitle: task.title,
			message: "ACP agent started",
			createdAt: new Date().toISOString(),
			severity: "info",
			status: "running",
		});
		this.notifyLearningStateChanged();
		new Notice("ACP agent started. Watch the Learning OS ACP lane.");

		try {
			const result = await runLearningAgentTaskWithAcp(
				this.app,
				this.settings,
				task,
				{
					onEvent: (event) => {
						this.recordLearningAcpRunEvent(event);
						this.notifyLearningStateChanged();
					},
				},
			);
			if (result.proposalCount > 0) {
				this.notifyLearningStateChanged();
				new Notice(`Agent proposal created: ${result.proposalCount}`);
				return;
			}
			this.notifyLearningStateChanged();
			new Notice("Agent task blocked. No proposal created.");
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const latestEvent =
				this.learningAcpRunEvents[this.learningAcpRunEvents.length - 1];
			if (
				latestEvent?.kind !== "agent_error" ||
				latestEvent.message !== message
			) {
				this.recordLearningAcpRunEvent({
					kind: "agent_error",
					taskPath: task.path,
					taskTitle: task.title,
					message,
					createdAt: new Date().toISOString(),
					severity: "error",
				});
			}
			this.notifyLearningStateChanged();
			new Notice(`Agent task failed: ${message}`);
		} finally {
			this.updateStatusBar("ready");
		}
	}

	async applyAgentWriteProposal(
		proposal: AgentWriteProposalSummary,
	): Promise<void> {
		const task = this.getLearningAgentTasks().find(
			(candidate) => candidate.path === proposal.taskPath,
		);
		if (!task) {
			new Notice("Agent task not found for proposal.");
			return;
		}

		await applyAgentWriteProposal(this.app, proposal, task);
		this.lastLearningScan = scanVaultLearningNotes(this.app);
		this.notifyLearningStateChanged();
		new Notice("Agent proposal applied.");
	}

	async rejectAgentWriteProposal(
		proposal: AgentWriteProposalSummary,
	): Promise<void> {
		const task = this.getLearningAgentTasks().find(
			(candidate) => candidate.path === proposal.taskPath,
		);
		await rejectAgentWriteProposal(this.app, proposal, task);
		this.notifyLearningStateChanged();
		new Notice("Agent proposal rejected.");
	}

	async patchLearningMetadataForNote(
		notePath: string,
		patch: LearningFrontmatterPatch,
	): Promise<void> {
		const file = this.app.vault.getAbstractFileByPath(notePath);
		if (!(file instanceof TFile) || file.extension !== "md") {
			throw new Error(`Learning note not found: ${notePath}`);
		}

		await patchLearningFrontmatter(this.app, file, {
			...patch,
			lastTouched: patch.lastTouched ?? formatLearningDate(),
		});
		this.lastLearningScan = scanVaultLearningNotes(this.app);
		this.notifyLearningStateChanged();
		new Notice("Learning metadata updated.");
	}

	async patchLearningMetadataForActiveNote(
		patch: LearningFrontmatterPatch,
	): Promise<void> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("Open a note first.");
			return;
		}

		await this.patchLearningMetadataForNote(activeFile.path, patch);
	}

	async generateHtmlExplainerForActiveNote(): Promise<GeneratedArtifact | null> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("Open a note first.");
			return null;
		}

		const relatedNotes = await this.getLearningRelatedNotes({
			note: scanLearningNote(this.app, activeFile),
			action: "Generate HTML explorable explanation",
			reason: [],
			suggestedAgent: "coding-agent",
			score: 0,
		});
		const artifact = await generateHtmlExplainerForNote(this.app, activeFile, {
			relatedNotes,
		});
		this.lastLearningScan = scanVaultLearningNotes(this.app);
		this.notifyLearningStateChanged();
		return artifact;
	}

	async generateExaminerForActiveNote(): Promise<GeneratedArtifact | null> {
		const activeFile = this.app.workspace.getActiveFile();
		if (!activeFile) {
			new Notice("Open a note first.");
			return null;
		}

		const artifact = await generateExaminerForNote(this.app, activeFile);
		this.lastLearningScan = scanVaultLearningNotes(this.app);
		this.notifyLearningStateChanged();
		new Notice(`Examiner created: ${artifact.artifactPath}`);
		return artifact;
	}

	private async getLearningRelatedNotes(
		candidate: Pick<NextActionCandidate, "note" | "action">,
	): Promise<HtmlExplainerRelatedNote[]> {
		if (!this.contextAssembler) return [];

		const context = await this.contextAssembler.assembleContext(
			candidate.note.path,
			candidate.action,
		);
		if (!context) return [];

		return context.relatedNotes.map((note) => ({
			title: note.title,
			path: note.path,
			excerpt: note.excerpt,
		}));
	}

	private async completeMatchingAgentTasks(
		candidate: NextActionCandidate,
	): Promise<void> {
		const matchingTasks = this.getLearningAgentTasks().filter(
			(task) =>
				task.notePath === candidate.note.path &&
				task.action === candidate.action &&
				task.status !== "done",
		);

		for (const task of matchingTasks) {
			await updateLearningAgentTaskStatus(this.app, task.path, "done");
		}
	}

	private notifyLearningStateChanged(): void {
		for (const listener of this.learningStateListeners) {
			listener();
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
