import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { TFile, TFolder, normalizePath } from "obsidian";
import {
	applyAgentWriteProposal,
	scanAgentWriteProposals,
} from "@/agent/write-proposal";
import type { LearningAgentTaskSummary } from "@/agent/task-frontmatter";

describe("agent write proposal apply flow", () => {
	it("applies a valid proposal and marks proposal and task done", async () => {
		const app = createApp({
			"00_Command_Center/agent-proposals/task.json": JSON.stringify({
				taskPath: "00_Command_Center/agent-tasks/task.md",
				writes: [
					{
						path: "_explainers/cache.html",
						content: "<!doctype html>",
					},
				],
			}),
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: proposed\n---\n",
		});
		const task = taskSummary();
		const proposals = await scanAgentWriteProposals(app, [task]);

		expect(proposals[0]?.isValid).toBe(true);
		await applyAgentWriteProposal(app, proposals[0]!, task);

		expect(app.read("_explainers/cache.html")).toBe("<!doctype html>");
		expect(app.frontmatter("00_Command_Center/agent-tasks/task.md").status).toBe(
			"done",
		);
		expect(
			JSON.parse(app.read("00_Command_Center/agent-proposals/task.json"))
				.status,
		).toBe("applied");
	});

	it("rejects writes outside the task allowed zones", async () => {
		const app = createApp({
			"00_Command_Center/agent-proposals/task.json": JSON.stringify({
				taskPath: "00_Command_Center/agent-tasks/task.md",
				writes: [
					{
						path: "Resources/cache.html",
						content: "<!doctype html>",
					},
				],
			}),
			"00_Command_Center/agent-tasks/task.md": "---\ntype: agent-task\nstatus: proposed\n---\n",
		});
		const task = taskSummary();
		const proposals = await scanAgentWriteProposals(app, [task]);

		expect(proposals[0]?.isValid).toBe(false);
		await expect(applyAgentWriteProposal(app, proposals[0]!, task)).rejects.toThrow(
			"Rejected write paths",
		);
		expect(app.has("Resources/cache.html")).toBe(false);
	});
});

interface MockApp extends App {
	read: (path: string) => string;
	has: (path: string) => boolean;
	frontmatter: (path: string) => Record<string, unknown>;
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
		read: (path: string) => contents.get(normalizePath(path)) ?? "",
		has: (path: string) => files.has(normalizePath(path)),
		frontmatter: (path: string) => frontmatter.get(normalizePath(path)) ?? {},
	};

	return app as MockApp;
}

function taskSummary(): LearningAgentTaskSummary {
	return {
		id: "task",
		path: "00_Command_Center/agent-tasks/task.md",
		title: "task",
		status: "proposed",
		notePath: "Learning/cache.md",
		action: "Generate HTML explorable explanation",
		suggestedAgent: "coding-agent",
		allowedWriteZones: ["_explainers"],
		createdAt: "2026-05-13",
	};
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
