export interface AgentMessageChunk {
	type: "agent_message_chunk";
	text: string;
}

export interface AgentThoughtChunk {
	type: "agent_thought_chunk";
	text: string;
}

export interface ToolCallContent {
	type: "diff" | "terminal" | "text";
	path?: string;
	newText?: string;
	oldText?: string;
	terminalId?: string;
	text?: string;
}

export interface ToolCall {
	type: "tool_call";
	toolCallId: string;
	title?: string;
	status: "pending" | "running" | "complete" | "failed";
	kind?: string;
	content?: ToolCallContent[];
	locations?: any[]; // Keep flexible for now
}

export interface ToolCallUpdate {
	type: "tool_call_update";
	toolCallId: string;
	title?: string;
	status?: "pending" | "running" | "complete" | "failed";
	kind?: string;
	content?: ToolCallContent[];
	locations?: any[];
}

export interface PlanEntry {
	id?: string;
	title: string;
	description?: string;
	status: "pending" | "running" | "complete" | "failed" | "blocked";
}

export interface Plan {
	type: "plan";
	entries: PlanEntry[];
}

export interface AvailableCommandsUpdate {
	type: "available_commands_update";
	commands: SlashCommand[];
}

export interface SlashCommand {
	name: string;
	description: string;
	hint?: string | null;
}

export interface CurrentModeUpdate {
	type: "current_mode_update";
	currentModeId: string;
}

export type SessionUpdate =
	| AgentMessageChunk
	| AgentThoughtChunk
	| ToolCall
	| ToolCallUpdate
	| Plan
	| AvailableCommandsUpdate
	| CurrentModeUpdate;
