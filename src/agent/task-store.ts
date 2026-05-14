import { type App, normalizePath, TFile } from "obsidian";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import {
	getAgentTaskStatusRank,
	parseLearningAgentTaskSummary,
	type LearningAgentTaskSummary,
} from "@/agent/task-frontmatter";
import type { AgentTaskStatus } from "@/agent/agent-task";

const TASK_FOLDER = normalizePath(`${ARTIFACT_FOLDERS.commandCenter}/agent-tasks`);

export type { LearningAgentTaskSummary } from "@/agent/task-frontmatter";

export function scanLearningAgentTasks(app: App): LearningAgentTaskSummary[] {
	return app.vault
		.getMarkdownFiles()
		.filter((file) => file.path.startsWith(`${TASK_FOLDER}/`))
		.map((file) =>
			parseLearningAgentTaskSummary(
				file.path,
				file.basename,
				app.metadataCache.getFileCache(file)?.frontmatter as
					| Record<string, unknown>
					| undefined,
			),
		)
		.filter((task): task is LearningAgentTaskSummary => task !== null)
		.sort(compareAgentTasks);
}

export async function updateLearningAgentTaskStatus(
	app: App,
	taskPath: string,
	status: AgentTaskStatus,
): Promise<void> {
	const normalized = normalizePath(taskPath);
	const file = app.vault.getAbstractFileByPath(normalized);
	if (!(file instanceof TFile) || file.extension !== "md") {
		throw new Error(`Agent task not found: ${normalized}`);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.status = status;
	});
}

function compareAgentTasks(
	a: LearningAgentTaskSummary,
	b: LearningAgentTaskSummary,
): number {
	const statusDelta = statusRank(a.status) - statusRank(b.status);
	if (statusDelta !== 0) return statusDelta;
	return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
}

function statusRank(status: AgentTaskStatus): number {
	return getAgentTaskStatusRank(status);
}
