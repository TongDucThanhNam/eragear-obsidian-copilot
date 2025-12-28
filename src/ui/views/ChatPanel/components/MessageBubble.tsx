import type React from "react";
import type { Message } from "../types";

interface MessageBubbleProps {
	message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
	return (
		<div className={`message message-${message.role}`}>
			<div className="message-avatar">
				{message.role === "user" ? "👤" : "🤖"}
			</div>
			<div className="message-content">
				<div className="message-bubble">{message.content}</div>
				<span className="message-time">
					{message.timestamp.toLocaleTimeString([], {
						hour: "2-digit",
						minute: "2-digit",
					})}
				</span>
			</div>
		</div>
	);
};
