import type React from "react";
import { useRef } from "react";
import type { Message } from "../types";
import { MessageBubble } from "./MessageBubble";

interface MessageListProps {
	messages: Message[];
	isLoading: boolean;
	onDelete: (id: string) => void;
	onRegenerate: () => void;
	onInsert: (content: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
	messages,
	isLoading,
	onDelete,
	onRegenerate,
	onInsert,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);

	return (
		<div className="eragear-messages">
			{/* Empty state */}
			{messages.length === 0 && (
				<div>
					<p>No messages yet</p>
				</div>
			)}

			{messages.map((message, index) => (
				<MessageBubble
					key={message.id}
					message={message}
					onDelete={() => onDelete(message.id)}
					onRegenerate={
						index === messages.length - 1 && message.role === "assistant"
							? onRegenerate
							: undefined
					}
					onInsert={onInsert}
				/>
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
