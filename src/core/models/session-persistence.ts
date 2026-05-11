/**
 * Session Persistence Models
 *
 * Defines types for serializing/deserializing sessions to/from markdown.
 */

import type { SessionUpdate } from "./session-update";

/** Session metadata stored in markdown frontmatter */
export interface SessionMetadata {
	id: string;
	createdAt: string;
	updatedAt: string;
	title: string;
	workingDirectory: string;
	agentId: string;
	currentModeId?: string;
	modelId?: string;
	tags?: string[];
}

/** Complete serializable session data */
export interface SessionData {
	metadata: SessionMetadata;
	messages: SessionMessage[];
}

/** A single message in session history */
export interface SessionMessage {
	id: string;
	timestamp: string;
	role: "user" | "assistant" | "system";
	content: string;
	contentType?: "text" | "image" | "audio" | "diff";
	mimeType?: string; // For image/audio
	toolCalls?: SessionToolCall[];
}

/** Tool call stored in session history */
export interface SessionToolCall {
	id: string;
	title?: string;
	name?: string;
	kind?: string;
	status: "pending" | "running" | "complete" | "failed";
	content?: SessionToolCallContent[];
	rawInput?: unknown;
	rawOutput?: unknown;
}

/** Tool call content stored in session */
export interface SessionToolCallContent {
	type: "text" | "diff" | "terminal" | "call" | "image" | "audio";
	text?: string;
	path?: string;
	oldText?: string;
	newText?: string;
	terminalId?: string;
	name?: string;
	arguments?: unknown;
	mimeType?: string;
	data?: string; // Base64 for image/audio
}

/** Session summary for list view */
export interface SessionSummary {
	id: string;
	title: string;
	createdAt: string;
	updatedAt: string;
	workingDirectory: string;
	messageCount: number;
	tags?: string[];
}

/** Session data collected during active session */
export interface ActiveSession {
	id: string;
	createdAt: Date;
	updatedAt: Date;
	title: string;
	workingDirectory: string;
	agentId: string;
	currentModeId?: string;
	modelId?: string;
	tags: string[];
	updates: SessionUpdate[];
}
