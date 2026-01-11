import type {
	OutputUpdate,
	ToolCall,
} from "@/domain/models/session-update";

// Extended message parts to support tool calls and outputs
export type ExtendedMessagePart =
	| { type: "text"; text: string }
	| { type: "tool-call"; toolCall: ToolCall }
	| { type: "tool-calls"; toolCalls: ToolCall[] }
	| { type: "output"; output: OutputUpdate }
	| { type: "thought"; text: string };

// Extended message type that supports tool calls
export interface ExtendedMessage {
	id: string;
	role: "user" | "assistant" | "system" | "data";
	parts: ExtendedMessagePart[];
}

// Use extended message for our chat
export type Message = ExtendedMessage;
