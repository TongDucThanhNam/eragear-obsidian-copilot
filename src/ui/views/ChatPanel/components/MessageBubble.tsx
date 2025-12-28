import type React from "react";
import type { Message } from "../types";

interface MessageBubbleProps {
	message: Message;
	onDelete?: () => void;
	onRegenerate?: () => void;
	onInsert?: (content: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
	message,
	onDelete,
	onRegenerate,
	onInsert,
}) => {
	const renderContent = () => {
		return message.parts.map((part, index) => {
			if (part.type === "text") {
				return <span key={index}>{part.text}</span>;
			}
			return null;
		});
	};

	const copyToClipboard = () => {
		const text = message.parts
			.map((p) => (p.type === "text" ? p.text : ""))
			.join("");
		navigator.clipboard.writeText(text);
		// TODO: Show toast
	};

	return (
		<div
			className={`message message-${message.role}`}
			style={{ position: "relative" }}
		>
			<div className="message-avatar">
				{message.role === "user" ? "👤" : "🤖"}
			</div>
			<div className="message-content">
				<div className="message-bubble">{renderContent()}</div>

				<div
					className="message-actions"
					style={{
						display: "flex",
						gap: "4px",
						marginTop: "4px",
						opacity: 0,
						transition: "opacity 0.2s",
						position: "absolute",
						top: "2px",
						right: "2px",
						background: "rgba(0,0,0,0.5)",
						borderRadius: "4px",
						padding: "2px",
					}}
				>
					{/* Show actions on hover (handled by CSS ideally, but here distinct layout) */}
					{/* Actually, let's just make them visible or put them below */}
				</div>
				<div
					className="message-footer"
					style={{
						display: "flex",
						gap: "8px",
						marginTop: "4px",
						fontSize: "0.8em",
						color: "var(--text-muted)",
					}}
				>
					{message.role === "assistant" && (
						<button
							type="button"
							onClick={() => {
								const text = message.parts
									.map((p) => (p.type === "text" ? p.text : ""))
									.join("");
								if (onInsert) onInsert(text);
								else copyToClipboard();
							}}
							title="Insert to Editor"
						>
							📋
						</button>
					)}
					{onRegenerate && (
						<button type="button" onClick={onRegenerate} title="Regenerate">
							🔄
						</button>
					)}
					{onDelete && (
						<button type="button" onClick={onDelete} title="Delete">
							🗑️
						</button>
					)}
				</div>
			</div>
			<style>{`
				.message:hover .message-actions { opacity: 1; }
				.message-footer button {
					background: none;
					border: none;
					cursor: pointer;
					opacity: 0.5;
					padding: 2px;
				}
				.message-footer button:hover {
					opacity: 1;
				}
			`}</style>
		</div>
	);
};
