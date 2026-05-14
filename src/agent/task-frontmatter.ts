import type { AgentTaskStatus, LearningAgentTask } from "@/agent/agent-task";

const AGENT_TASK_STATUSES: readonly AgentTaskStatus[] = [
	"queued",
	"running",
	"proposed",
	"blocked",
	"done",
];

export interface LearningAgentTaskSummary {
	id: string;
	path: string;
	title: string;
	status: AgentTaskStatus;
	notePath: string;
	action: string;
	suggestedAgent: LearningAgentTask["suggestedAgent"];
	allowedWriteZones: string[];
	createdAt?: string;
}

export function parseLearningAgentTaskSummary(
	path: string,
	basename: string,
	frontmatter: Record<string, unknown> | undefined,
): LearningAgentTaskSummary | null {
	if (!frontmatter || frontmatter.type !== "agent-task") return null;

	return {
		id: basename,
		path,
		title: basename,
		status: parseStatus(frontmatter.status),
		notePath: parseString(frontmatter.source_note) ?? "",
		action: parseString(frontmatter.action) ?? "",
		suggestedAgent: parseSuggestedAgent(frontmatter.suggested_agent),
		allowedWriteZones: parseStringList(frontmatter.allowed_write_zones),
		createdAt: parseString(frontmatter.created),
	};
}

export function getAgentTaskStatusRank(status: AgentTaskStatus): number {
	return AGENT_TASK_STATUSES.indexOf(status);
}

function parseStatus(value: unknown): AgentTaskStatus {
	return AGENT_TASK_STATUSES.includes(value as AgentTaskStatus)
		? (value as AgentTaskStatus)
		: "queued";
}

function parseSuggestedAgent(
	value: unknown,
): LearningAgentTask["suggestedAgent"] {
	if (
		value === "deterministic" ||
		value === "reasoning-model" ||
		value === "coding-agent"
	) {
		return value;
	}
	return "deterministic";
}

function parseString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseStringList(value: unknown): string[] {
	if (Array.isArray(value)) {
		return value
			.map((item) => parseString(item))
			.filter((item): item is string => item !== undefined);
	}

	const single = parseString(value);
	return single ? [single] : [];
}
