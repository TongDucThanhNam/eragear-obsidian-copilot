export type AgentWriteProposalStatus = "pending" | "applied" | "rejected";

export interface AgentProposedWrite {
	path: string;
	content: string;
}

export interface AgentWriteProposal {
	id: string;
	path: string;
	taskPath: string;
	status: AgentWriteProposalStatus;
	writes: AgentProposedWrite[];
}

export interface AgentWriteProposalSummary extends AgentWriteProposal {
	isValid: boolean;
	rejectedPaths: string[];
}

export function parseAgentWriteProposal(
	path: string,
	basename: string,
	content: string,
): AgentWriteProposal | null {
	let raw: unknown;
	try {
		raw = JSON.parse(content);
	} catch {
		return null;
	}

	if (!isRecord(raw)) return null;
	const taskPath = parseString(raw.taskPath);
	const writes = parseWrites(raw.writes);
	if (!taskPath || writes.length === 0) return null;

	return {
		id: parseString(raw.id) ?? basename,
		path,
		taskPath: normalizeVaultPath(taskPath),
		status: parseStatus(raw.status),
		writes,
	};
}

function parseWrites(value: unknown): AgentProposedWrite[] {
	if (!Array.isArray(value)) return [];

	return value
		.map((item) => {
			if (!isRecord(item)) return null;
			const path = parseString(item.path);
			const content =
				typeof item.content === "string" ? item.content : undefined;
			return path && content !== undefined
				? { path: normalizeVaultPath(path), content }
				: null;
		})
		.filter((write): write is AgentProposedWrite => write !== null);
}

function parseStatus(value: unknown): AgentWriteProposalStatus {
	if (value === "applied" || value === "rejected") return value;
	return "pending";
}

function parseString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function normalizeVaultPath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");
}
