import type React from "react";
import { useEffect, useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
	messages: Message[];
	isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
	messages,
	isLoading,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	return (
		<div className="eragear-messages">
			{messages.map((message) => (
				<MessageBubble key={message.id} message={message} />
			))}
			{isLoading && (
				<div className="message message-assistant">
					<div className="message-avatar">🤖</div>
					<div className="message-content">
						<div className="message-bubble">
							<div className="typing-indicator">
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					</div>
				</div>
			)}
			<div ref={messagesEndRef} />
		</div>
	);
};
