import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import { updateLearningAgentTaskStatus } from "@/agent/task-store";
import { validateAgentWritePlan } from "@/agent/task-guard";
import type { LearningAgentTaskSummary } from "@/agent/task-frontmatter";
import {
	parseAgentWriteProposal,
	type AgentWriteProposal,
	type AgentWriteProposalStatus,
	type AgentWriteProposalSummary,
} from "@/agent/write-proposal-format";

const PROPOSAL_FOLDER = normalizePath(
	`${ARTIFACT_FOLDERS.commandCenter}/agent-proposals`,
);

export type { AgentWriteProposalSummary } from "@/agent/write-proposal-format";

export async function scanAgentWriteProposals(
	app: App,
	tasks: LearningAgentTaskSummary[],
): Promise<AgentWriteProposalSummary[]> {
	const taskByPath = new Map(tasks.map((task) => [task.path, task]));
	const proposalFiles = app.vault
		.getFiles()
		.filter(
			(file) =>
				file.extension === "json" &&
				file.path.startsWith(`${PROPOSAL_FOLDER}/`),
		);
	const proposals: AgentWriteProposalSummary[] = [];

	for (const file of proposalFiles) {
		const content = await app.vault.cachedRead(file);
		const proposal = parseAgentWriteProposal(file.path, file.basename, content);
		if (!proposal) continue;

		const task = taskByPath.get(proposal.taskPath);
		const validation = task
			? validateAgentWritePlan(task, proposal.writes.map((write) => write.path))
			: { isValid: false, rejected: proposal.writes.map((write) => write.path) };

		proposals.push({
			...proposal,
			isValid: validation.isValid,
			rejectedPaths: validation.rejected,
		});
	}

	return proposals.sort((a, b) => a.path.localeCompare(b.path));
}

export async function applyAgentWriteProposal(
	app: App,
	proposal: AgentWriteProposal,
	task: LearningAgentTaskSummary,
): Promise<void> {
	const validation = validateAgentWritePlan(
		task,
		proposal.writes.map((write) => write.path),
	);
	if (!validation.isValid) {
		throw new Error(`Rejected write paths: ${validation.rejected.join(", ")}`);
	}

	for (const write of proposal.writes) {
		await writeVaultFile(app, write.path, write.content);
	}

	await updateProposalStatus(app, proposal.path, "applied");
	await updateLearningAgentTaskStatus(app, task.path, "done");
}

async function writeVaultFile(
	app: App,
	path: string,
	content: string,
): Promise<void> {
	const normalized = normalizePath(path);
	await ensureParentFolder(app, normalized);

	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFile) {
		await app.vault.process(existing, () => content);
		return;
	}
	if (existing) {
		throw new Error(`${normalized} exists but is not a file`);
	}

	await app.vault.create(normalized, content);
}

async function updateProposalStatus(
	app: App,
	path: string,
	status: AgentWriteProposalStatus,
): Promise<void> {
	const file = app.vault.getAbstractFileByPath(normalizePath(path));
	if (!(file instanceof TFile) || file.extension !== "json") {
		throw new Error(`Proposal not found: ${path}`);
	}

	const content = await app.vault.cachedRead(file);
	const proposal = parseAgentWriteProposal(file.path, file.basename, content);
	if (!proposal) {
		throw new Error(`Invalid proposal: ${path}`);
	}

	await app.vault.process(file, () =>
		`${JSON.stringify({ ...proposal, status }, null, 2)}\n`,
	);
}

async function ensureParentFolder(app: App, filePath: string): Promise<void> {
	const parts = normalizePath(filePath).split("/");
	parts.pop();
	if (parts.length === 0) return;

	let current = "";
	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing instanceof TFolder) continue;
		if (existing) {
			throw new Error(`${current} exists but is not a folder`);
		}
		await app.vault.createFolder(current);
	}
}
