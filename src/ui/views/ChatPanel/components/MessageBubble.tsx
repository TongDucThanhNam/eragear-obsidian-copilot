import type React from "react";
import type { Message } from "../types";

interface MessageBubbleProps {
	message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
	const renderContent = () => {
		return message.parts.map((part, index) => {
			if (part.type === "text") {
				return <span key={index}>{part.text}</span>;
			}
			return null;
		});
	};

	return (
		<div className={`message message-${message.role}`}>
			<div className="message-avatar">
				{message.role === "user" ? "👤" : "🤖"}
			</div>
			<div className="message-content">
				<div className="message-bubble">{renderContent()}</div>
				{/* Timestamp removed as it's not present on UIMessage */}
			</div>
		</div>
	);
};
