import type { NextActionCandidate } from "@/learning/types";

export type AgentTaskStatus =
	| "queued"
	| "running"
	| "proposed"
	| "blocked"
	| "done";

export interface LearningAgentTask {
	id: string;
	status: AgentTaskStatus;
	title: string;
	notePath: string;
	action: string;
	suggestedAgent: NextActionCandidate["suggestedAgent"];
	expectedOutput?: string;
	allowedWriteZones: string[];
	prompt: string;
	createdAt: string;
}

export interface AgentTaskFileResult {
	task: LearningAgentTask;
	taskPath: string;
}
