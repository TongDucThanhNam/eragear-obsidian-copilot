import type React from "react";
import Markdown from "react-markdown";
import type { Message } from "../types";
import { IconCopy, IconRotate, IconTrash, IconPen } from "./Icons";

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

	// Extract text content for copy/insert
	const textContent = message.parts
		.map((p) => (p.type === "text" ? p.text : ""))
		.join("\n");

	const handleCopy = () => {
		navigator.clipboard.writeText(textContent);
		// Optional: toast notification
	};

	return (
		<div className={`eragear-message-group ${isUser ? "user" : "assistant"}`}>
			{!isUser && <div className="eragear-avatar">🤖</div>}

			<div style={{ width: "100%", overflow: "hidden" }}>
				<div className="eragear-bubble">
					{message.parts.map((part, index) => {
						if (part.type === "text") {
							return <Markdown key={index}>{part.text}</Markdown>;
						}
						return null;
					})}
				</div>

				{!isUser && (
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
