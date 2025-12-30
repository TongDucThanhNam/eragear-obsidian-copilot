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

export interface ToolCallLocation {
	uri: string;
	range?: {
		start: { line: number; character: number };
		end: { line: number; character: number };
	};
}

export interface ToolCall {
	type: "tool_call";
	toolCallId: string;
	title?: string;
	status: "pending" | "running" | "complete" | "failed";
	kind?: string;
	content?: ToolCallContent[];
	locations?: ToolCallLocation[];
}

export interface ToolCallUpdate {
	type: "tool_call_update";
	toolCallId: string;
	title?: string;
	status?: "pending" | "running" | "complete" | "failed";
	kind?: string;
	content?: ToolCallContent[];
	locations?: ToolCallLocation[];
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

// ============================================================================
// Permission Request - Agent requests user permission for an action
// ============================================================================
export interface PermissionOption {
	id: string;
	label: string;
	isDefault?: boolean;
}

export interface PermissionRequest {
	type: "permission_requested";
	requestId: string;
	title: string;
	description?: string;
	options: PermissionOption[];
}

// ============================================================================
// Session End - Agent signals session has ended
// ============================================================================
export interface SessionEnd {
	type: "session_end";
	reason: "completed" | "cancelled" | "error";
	message?: string;
}

// ============================================================================
// Session Error - Non-fatal error during session
// ============================================================================
export interface SessionError {
	type: "session_error";
	code?: string | number;
	message: string;
	recoverable: boolean;
}

// ============================================================================
// Output Update - General output from agent (logs, status, etc.)
// ============================================================================
export interface OutputUpdate {
	type: "output";
	outputType: "info" | "warning" | "error" | "debug";
	text: string;
}

export type SessionUpdate =
	| AgentMessageChunk
	| AgentThoughtChunk
	| ToolCall
	| ToolCallUpdate
	| Plan
	| AvailableCommandsUpdate
	| CurrentModeUpdate
	| PermissionRequest
	| SessionEnd
	| SessionError
	| OutputUpdate;
