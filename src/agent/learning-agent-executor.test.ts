import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { TFile, TFolder, normalizePath } from "obsidian";
import {
	runLearningAgentTaskWithAcp,
	type LearningAgentExecutionEvent,
} from "@/agent/learning-agent-executor";
import type { LearningAgentTaskSummary } from "@/agent/task-frontmatter";
import type { MyPluginSettings } from "@/app/settings/plugin-settings";
import type { StopReason } from "@/core/models/session-update";
import type { AcpAdapterRuntimeEvent } from "@/infra/acp/acp.adapter";

describe("learning agent executor", () => {
	it("marks a task proposed when the agent creates a pending proposal", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});

		const result = await runLearningAgentTaskWithAcp(
			app,
			settings(),
			taskSummary(),
			{
				isDesktopApp: true,
				adapterFactory: () =>
					createAdapter(async () => {
						await app.vault.create(
							"00_Command_Center/agent-proposals/task.json",
							JSON.stringify({
								taskPath: "00_Command_Center/agent-tasks/task.md",
								writes: [
									{
										path: "_explainers/cache.html",
										content: "<!doctype html>",
									},
								],
							}),
						);
					}),
			},
		);

		expect(result.proposalCount).toBe(1);
		expect(app.hasFolder("00_Command_Center/agent-proposals")).toBe(true);
		expect(app.frontmatter("00_Command_Center/agent-tasks/task.md").status).toBe(
			"proposed",
		);
	});

	it("emits task, adapter, proposal, and final status events", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});
		const events: LearningAgentExecutionEvent[] = [];
		let runtimeSink: ((event: AcpAdapterRuntimeEvent) => void) | null = null;

		await runLearningAgentTaskWithAcp(app, settings(), taskSummary(), {
			isDesktopApp: true,
			onEvent: (event) => events.push(event),
			adapterFactory: () => ({
				...createAdapter(async () => {
					runtimeSink?.({
						kind: "file_write_created",
						message: "Created proposal file",
						severity: "success",
						path: "00_Command_Center/agent-proposals/task.json",
					});
					await app.vault.create(
						"00_Command_Center/agent-proposals/task.json",
						JSON.stringify({
							taskPath: "00_Command_Center/agent-tasks/task.md",
							writes: [
								{
									path: "_explainers/cache.html",
									content: "<!doctype html>",
								},
							],
						}),
					);
				}),
				setRuntimeEventSink: (sink) => {
					runtimeSink = sink;
				},
			}),
		});

		expect(events.map((event) => event.kind)).toContain("task_status");
		expect(events.map((event) => event.kind)).toContain("file_write_created");
		expect(events.map((event) => event.kind)).toContain("proposal_scan");
		expect(events.some((event) => event.status === "proposed")).toBe(true);
		expect(
			events.every(
				(event) =>
					event.taskPath === "00_Command_Center/agent-tasks/task.md" &&
					event.taskTitle === "task",
			),
		).toBe(true);
	});

	it("marks a task blocked when the agent creates no proposal", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});

		const result = await runLearningAgentTaskWithAcp(
			app,
			settings(),
			taskSummary(),
			{
				isDesktopApp: true,
				adapterFactory: () => createAdapter(async () => undefined),
			},
		);

		expect(result.proposalCount).toBe(0);
		expect(app.frontmatter("00_Command_Center/agent-tasks/task.md").status).toBe(
			"blocked",
		);
	});

	it("marks a task blocked when agent initialization times out", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});

		await expect(
			runLearningAgentTaskWithAcp(app, settings(), taskSummary(), {
				isDesktopApp: true,
				timeoutMs: 5,
				adapterFactory: () => ({
					...createAdapter(async () => undefined),
					initialize: async () => new Promise(() => undefined),
				}),
			}),
		).rejects.toThrow("Agent initialization timed out.");
		expect(app.frontmatter("00_Command_Center/agent-tasks/task.md").status).toBe(
			"blocked",
		);
	});

	it("uses the current vault path as the ACP working directory", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});
		let workingDirectory = "";

		await runLearningAgentTaskWithAcp(app, settings(), taskSummary(), {
			isDesktopApp: true,
			adapterFactory: () => ({
				...createAdapter(async () => undefined),
				initialize: async (config) => {
					workingDirectory = config.workingDirectory ?? "";
				},
			}),
		});

		expect(workingDirectory).toBe("/mock-vault");
	});

	it("switches bounded learning runs to haiku when available", async () => {
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: queued\n---\n# Task\n",
		});
		let selectedModel = "";

		await runLearningAgentTaskWithAcp(app, settings(), taskSummary(), {
			isDesktopApp: true,
			adapterFactory: () => ({
				...createAdapter(async () => undefined),
				newSession: async () => ({
					sessionId: "session",
					models: {
						currentModelId: "default",
						availableModels: [
							{ modelId: "default", name: "Default" },
							{ modelId: "haiku", name: "Haiku" },
						],
					},
				}),
				setSessionModel: async (_sessionId, modelId) => {
					selectedModel = modelId;
				},
			}),
		});

		expect(selectedModel).toBe("haiku");
	});

	it("sends a compact execution prompt and blocks source-note reads", async () => {
		const hugePrompt = "Huge source section. ".repeat(20000);
		const app = createApp({
			"00_Command_Center/agent-tasks/task.md": `---
type: agent-task
status: queued
---
# Task

## Prompt

\`\`\`text
${hugePrompt}
\`\`\`

## Completion checklist

- [ ] Create proposal JSON.
`,
		});
		let sentMessage = "";
		let readGuard:
			| ((
					path: string,
			  ) => { allowed: boolean; content?: string; message?: string })
			| undefined;

		await runLearningAgentTaskWithAcp(app, settings(), taskSummary(), {
			isDesktopApp: true,
			adapterFactory: () => ({
				...createAdapter(async () => undefined),
				setReadGuard: (guard) => {
					readGuard = guard;
				},
				sendMessage: async (_sessionId, message) => {
					sentMessage = message;
					return { stopReason: "end_turn" as StopReason };
				},
			}),
		});

		expect(sentMessage.length).toBeLessThan(26000);
		expect(sentMessage).toContain("Do not inspect the vault");
		expect(sentMessage).toContain("Task content truncated");
		expect(readGuard?.("Learning/cache.md")).toEqual({
			allowed: false,
			message:
				"Source note reads are disabled for this bounded Learning OS run. Use the task excerpt already provided in the prompt.",
		});
	});
});

function createAdapter(onSend: () => Promise<void>) {
	return {
		setTerminalAccess: (_enabled: boolean) => undefined,
		setAutoApproveSafeFilePermissions: (_enabled: boolean) => undefined,
		setWriteGuard: (
			_guard: (path: string) => { allowed: boolean; message?: string },
		) => undefined,
		initialize: async () => undefined,
		newSession: async () => ({ sessionId: "session" }),
		sendMessage: async () => {
			await onSend();
			return { stopReason: "end_turn" as StopReason };
		},
		disconnect: async () => undefined,
	};
}

interface MockApp extends App {
	frontmatter: (path: string) => Record<string, unknown>;
	hasFolder: (path: string) => boolean;
}

function createApp(initialFiles: Record<string, string>): MockApp {
	const files = new Map<string, TFile>();
	const contents = new Map<string, string>();
	const frontmatter = new Map<string, Record<string, unknown>>();
	const folders = new Set<string>();

	for (const [path, content] of Object.entries(initialFiles)) {
		const normalized = normalizePath(path);
		files.set(normalized, new TFile(normalized));
		contents.set(normalized, content);
		frontmatter.set(normalized, parseFrontmatter(content));
		registerParents(folders, normalized);
	}

	const app = {
		vault: {
			adapter: {
				basePath: "/mock-vault",
			},
			getAbstractFileByPath: (path: string) => {
				const normalized = normalizePath(path);
				return files.get(normalized) ?? (folders.has(normalized) ? new TFolder(normalized) : null);
			},
			getFiles: () => Array.from(files.values()),
			getMarkdownFiles: () =>
				Array.from(files.values()).filter((file) => file.extension === "md"),
			cachedRead: async (file: TFile) => contents.get(file.path) ?? "",
			process: async (
				file: TFile,
				callback: (content: string) => string,
			) => {
				const nextContent = callback(contents.get(file.path) ?? "");
				contents.set(file.path, nextContent);
				frontmatter.set(file.path, parseFrontmatter(nextContent));
			},
			create: async (path: string, content: string) => {
				const normalized = normalizePath(path);
				const file = new TFile(normalized);
				files.set(normalized, file);
				contents.set(normalized, content);
				frontmatter.set(normalized, parseFrontmatter(content));
				registerParents(folders, normalized);
				return file;
			},
			createFolder: async (path: string) => {
				folders.add(normalizePath(path));
			},
		},
		metadataCache: {
			getFileCache: (file: TFile) => ({
				frontmatter: frontmatter.get(file.path) ?? {},
			}),
			resolvedLinks: {},
		},
		fileManager: {
			processFrontMatter: async (
				file: TFile,
				callback: (data: Record<string, unknown>) => void,
			) => {
				const data = frontmatter.get(file.path) ?? {};
				callback(data);
				frontmatter.set(file.path, data);
			},
		},
		frontmatter: (path: string) => frontmatter.get(normalizePath(path)) ?? {},
		hasFolder: (path: string) => folders.has(normalizePath(path)),
	};

	return app as MockApp;
}

function taskSummary(): LearningAgentTaskSummary {
	return {
		id: "task",
		path: "00_Command_Center/agent-tasks/task.md",
		title: "task",
		status: "queued",
		notePath: "Learning/cache.md",
		action: "Generate HTML explorable explanation",
		suggestedAgent: "coding-agent",
		allowedWriteZones: ["_explainers"],
		createdAt: "2026-05-13",
	};
}

function settings(): MyPluginSettings {
	return {
		chatModels: [
			{
				id: "agent",
				name: "Agent",
				provider: "acp",
				type: "agent",
				command: "agent",
				args: "",
				workingDir: "",
				nodePath: "",
				enabled: true,
			},
		],
		activeChatModelId: "agent",
		agents: [],
		activeAgentId: "",
		agentCommand: "",
		agentArgs: "",
		agentWorkingDir: "",
		agentNodePath: "",
	} as MyPluginSettings;
}

function registerParents(folders: Set<string>, path: string): void {
	const parts = path.split("/");
	parts.pop();
	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		folders.add(current);
	}
}

function parseFrontmatter(content: string): Record<string, unknown> {
	if (!content.startsWith("---")) return {};
	const end = content.indexOf("\n---", 3);
	if (end === -1) return {};

	const data: Record<string, unknown> = {};
	for (const line of content.slice(3, end).split("\n")) {
		const separator = line.indexOf(":");
		if (separator === -1) continue;
		const key = line.slice(0, separator).trim();
		const value = line.slice(separator + 1).trim();
		if (key) data[key] = value;
	}
	return data;
}
