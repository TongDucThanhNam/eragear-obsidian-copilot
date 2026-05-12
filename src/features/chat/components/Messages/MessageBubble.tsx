import type React from "react";
import type { App } from "obsidian";
import type { Message } from "@/features/chat/types";
import { MarkdownTextRenderer } from "./MarkdownTextRenderer";
import {
	IconCheckCircle,
	IconCopy,
	IconMagic,
	IconPen,
	IconRotate,
	IconTrash,
	IconUser,
} from "@/components/ui/Icons";
import { OutputMessage } from "./OutputMessage";
import { ToolCallCard } from "../ToolCallCard";
import { ThinkingBlock } from "../ThinkingBlock";
import {
	getMessageTextContent,
	hasRenderableMessageContent,
} from "./message-rendering";

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
	const hasContent = hasRenderableMessageContent(message);

	if (!hasContent) return null;

	// Extract text content for copy/insert
	const textContent = getMessageTextContent(message);
	const messageLabel = isUser ? "You" : isSystem ? "System" : "Assistant";

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
			<div
				className="eragear-message-group system"
				data-message-role={message.role}
			>
				<div className="eragear-message-content">
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
			data-message-role={message.role}
		>
			{!isUser && !isSystem && (
				<div className="eragear-message-avatar assistant" aria-hidden="true">
					<IconMagic />
				</div>
			)}
			<div className="eragear-message-content">
				<div className="eragear-message-meta">
					<span>{messageLabel}</span>
					{!isUser && !isSystem && (
						<span className="eragear-message-verified" aria-hidden="true">
							<IconCheckCircle />
						</span>
					)}
				</div>
				<div className="eragear-message-body">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							if (part.text.trim().length === 0) return null;
							return (
								<MarkdownTextRenderer key={index} text={part.text} app={app} />
							);
						}
						if (part.type === "thought") {
							if (part.text.trim().length === 0) return null;
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
							aria-label="Copy"
							onClick={handleCopy}
						>
							<IconCopy />
						</button>
						{onRegenerate && (
							<button
								type="button"
								className="eragear-action-icon"
								title="Regenerate"
								aria-label="Regenerate"
								onClick={onRegenerate}
							>
								<IconRotate />
							</button>
						)}
						<button
							type="button"
							className="eragear-action-icon"
							title="Insert to editor"
							aria-label="Insert to editor"
							onClick={() => onInsert(textContent)}
						>
							<IconPen />
						</button>
						<button
							type="button"
							className="eragear-action-icon"
							title="Delete"
							aria-label="Delete"
							onClick={onDelete}
						>
							<IconTrash />
						</button>
					</div>
				)}
			</div>
			{isUser && (
				<div className="eragear-message-avatar user" aria-hidden="true">
					<IconUser />
				</div>
			)}
		</div>
	);
};
