import type React from "react";
import Markdown from "react-markdown";
import type { Message } from "../types";
import { IconCopy, IconPen, IconRotate, IconTrash } from "./Icons";
import { OutputMessage } from "./OutputMessage";
import { ToolCallCard } from "./ToolCallCard";

interface MessageBubbleProps {
	message: Message;
	onDelete: () => void;
	onRegenerate?: () => void;
	onInsert: (content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
	message,
	onDelete,
	onRegenerate,
	onInsert,
}) => {
	const isUser = message.role === "user";
	const isSystem = message.role === "system" || message.role === "data";

	// Extract text content for copy/insert
	const textContent = message.parts
		.map((p) => (p.type === "text" ? p.text : ""))
		.join("\n");

	// Check if this is a tool-call only message
	const hasOnlyToolCalls = message.parts.every(
		(p) => p.type === "tool-call" || p.type === "tool-calls",
	);

	// Check if this is an output only message
	const hasOnlyOutputs = message.parts.every((p) => p.type === "output");

	const handleCopy = () => {
		navigator.clipboard.writeText(textContent);
	};

	// Render tool-call or output messages without bubble wrapper
	if (hasOnlyToolCalls || hasOnlyOutputs) {
		return (
			<div className="eragear-message-group system">
				<div style={{ width: "100%" }}>
					{message.parts.map((part, index) => {
						if (part.type === "tool-call") {
							return <ToolCallCard key={index} toolCall={part.toolCall} />;
						}
						if (part.type === "tool-calls") {
							return part.toolCalls.map((tc, i) => (
								<ToolCallCard key={`${index}-${i}`} toolCall={tc} />
							));
						}
						if (part.type === "output") {
							return <OutputMessage key={index} output={part.output} />;
						}
						return null;
					})}
				</div>
			</div>
		);
	}

	return (
		<div
			className={`eragear-message-group ${isUser ? "user" : isSystem ? "system" : "assistant"}`}
		>
			{!isUser && !isSystem && <div className="eragear-avatar">🤖</div>}

			<div style={{ width: "100%", overflow: "hidden" }}>
				<div className="eragear-bubble">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							return <Markdown key={index}>{part.text}</Markdown>;
						}
						if (part.type === "tool-call") {
							return <ToolCallCard key={index} toolCall={part.toolCall} />;
						}
						if (part.type === "tool-calls") {
							return part.toolCalls.map((tc, i) => (
								<ToolCallCard key={`${index}-${i}`} toolCall={tc} />
							));
						}
						if (part.type === "output") {
							return <OutputMessage key={index} output={part.output} />;
						}
						return null;
					})}
				</div>

				{!isUser && !isSystem && (
					<div className="eragear-msg-actions">
						<button
							type="button"
							className="eragear-action-icon"
							title="Copy"
							onClick={handleCopy}
						>
							<IconCopy />
						</button>
						{onRegenerate && (
							<button
								type="button"
								className="eragear-action-icon"
								title="Regenerate"
								onClick={onRegenerate}
							>
								<IconRotate />
							</button>
						)}
						<button
							type="button"
							className="eragear-action-icon"
							title="Insert to Editor"
							onClick={() => onInsert(textContent)}
						>
							<IconPen />
						</button>
						<button
							type="button"
							className="eragear-action-icon"
							title="Delete"
							onClick={onDelete}
						>
							<IconTrash />
						</button>
					</div>
				)}
			</div>

			{isUser && <div className="eragear-avatar">👤</div>}
		</div>
	);
};
