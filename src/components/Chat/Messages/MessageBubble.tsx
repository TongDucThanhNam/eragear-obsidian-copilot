import type React from "react";
import type { App } from "obsidian";
import type { Message } from "../../../types/types";
import { MarkdownTextRenderer } from "./MarkdownTextRenderer";
import { IconCopy, IconPen, IconRotate, IconTrash } from "../../ui/Icons";
import { OutputMessage } from "./OutputMessage";
import { ToolCallCard } from "../ToolCallCard";
import { ThinkingBlock } from "../ThinkingBlock";

interface MessageBubbleProps {
	message: Message;
	app: App;
	onDelete: () => void;
	onRegenerate?: () => void;
	onInsert: (content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
	message,
	app,
	onDelete,
	onRegenerate,
	onInsert,
}) => {
	const isUser = message.role === "user";
	const isSystem = message.role === "system" || message.role === "data";

	// Extract text content for copy/insert
	const textContent = message.parts
		.map((p) => {
			if (p.type === "text") return p.text;
			if (p.type === "thought") return `Reasoning:\n${p.text}\n`;
			return "";
		})
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
			<div style={{ width: "100%", overflow: "hidden" }}>
				<div className="">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							return <MarkdownTextRenderer key={index} text={part.text} app={app} />;
						}
						if (part.type === "thought") {
							return <ThinkingBlock key={index} content={part.text} app={app} />;
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

				{/* Messages Actions */}
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
		</div>
	);
};
