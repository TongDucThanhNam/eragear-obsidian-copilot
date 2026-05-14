import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { formatLearningActionLogEntry } from "@/learning/action-log-format";
import type { LearningActionRunResult } from "@/learning/action-runner";
import type { NextActionCandidate } from "@/learning/types";

const ACTION_LOG_PATH = normalizePath(
	`${ARTIFACT_FOLDERS.commandCenter}/learning-action-log.md`,
);

export async function appendLearningActionLog(
	app: App,
	candidate: NextActionCandidate,
	result: LearningActionRunResult,
	date = formatLearningDate(),
): Promise<void> {
	await ensureFolder(app, ARTIFACT_FOLDERS.commandCenter);
	const entry = formatLearningActionLogEntry(candidate, result, date);
	const existing = app.vault.getAbstractFileByPath(ACTION_LOG_PATH);

	if (existing instanceof TFile) {
		await app.vault.process(existing, (content) => `${content.trimEnd()}\n\n${entry}`);
		return;
	}

	await app.vault.create(ACTION_LOG_PATH, `# Learning action log\n\n${entry}`);
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
