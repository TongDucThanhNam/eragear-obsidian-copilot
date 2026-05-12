import type React from "react";
import { useRef } from "react";
import type { App } from "obsidian";
import type { Message } from "@/features/chat/types";
import { MessageBubble } from "./MessageBubble";
import { IconMagic, IconMessage } from "@/components/ui/Icons";
import { hasRenderableMessageContent } from "./message-rendering";

interface MessageListProps {
	app: App;
	messages: Message[];
	isLoading: boolean;
	onDelete: (id: string) => void;
	onRegenerate: () => void;
	onInsert: (content: string) => void;
}

export const MessageList: React.FC<MessageListProps> = ({
	app,
	messages,
	isLoading,
	onDelete,
	onRegenerate,
	onInsert,
}) => {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const visibleMessages = messages.filter(hasRenderableMessageContent);
	const lastVisibleMessage = visibleMessages[visibleMessages.length - 1];
	const regenerableAssistantMessageId =
		lastVisibleMessage?.role === "assistant"
			? lastVisibleMessage.id
			: undefined;
	const showEmptyState = visibleMessages.length === 0 && !isLoading;
	const showTypingIndicator =
		isLoading && lastVisibleMessage?.role !== "assistant";

	return (
		<div className="eragear-messages">
			{/* Empty state */}
			{showEmptyState && (
				<div className="eragear-empty-state">
					<span className="eragear-empty-state-icon" aria-hidden="true">
						<IconMessage />
					</span>
					<p>No messages yet</p>
				</div>
			)}

			{visibleMessages.map((message) => (
				<MessageBubble
					key={message.id}
					message={message}
					app={app}
					onDelete={() => onDelete(message.id)}
					onRegenerate={
						message.id === regenerableAssistantMessageId
							? onRegenerate
							: undefined
					}
					onInsert={onInsert}
				/>
				))}
			{showTypingIndicator && (
				<div
					className="eragear-message-group assistant typing-indicator"
					data-message-role="assistant"
					role="status"
					aria-live="polite"
				>
					<div className="eragear-message-avatar assistant" aria-hidden="true">
						<IconMagic />
					</div>
					<div className="eragear-message-content typing-indicator-content">
						<span className="typing-dot" />
						<span className="typing-dot" />
						<span className="typing-dot" />
					</div>
				</div>
			)}
			<div ref={messagesEndRef} />
		</div>
	);
};
