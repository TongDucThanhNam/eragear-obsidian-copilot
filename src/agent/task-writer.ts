import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { formatLearningAgentTaskFile } from "@/agent/task-format";
import { buildLearningAgentTask } from "@/agent/task-router";
import type { AgentTaskFileResult } from "@/agent/agent-task";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";
import type { NextActionCandidate } from "@/learning/types";

const TASK_FOLDER = normalizePath(`${ARTIFACT_FOLDERS.commandCenter}/agent-tasks`);

export async function createLearningAgentTaskFile(
	app: App,
	candidate: NextActionCandidate,
	source: string,
	relatedNotes: HtmlExplainerRelatedNote[],
	date = formatLearningDate(),
): Promise<AgentTaskFileResult> {
	await ensureFolder(app, ARTIFACT_FOLDERS.commandCenter);
	await ensureFolder(app, TASK_FOLDER);

	const task = buildLearningAgentTask(candidate, source, relatedNotes, date);
	const taskPath = normalizePath(`${TASK_FOLDER}/${task.id}.md`);
	const content = formatLearningAgentTaskFile(task);
	const existing = app.vault.getAbstractFileByPath(taskPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => content);
	} else {
		await app.vault.create(taskPath, content);
	}

	return { task, taskPath };
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFolder) return;
	if (existing) {
		throw new Error(`${normalized} exists but is not a folder`);
	}
	await app.vault.createFolder(normalized);
}
