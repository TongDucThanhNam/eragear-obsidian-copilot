import type React from "react";
import { useEffect, useRef, useState } from "react";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export const ChatPanel: React.FC = () => {
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Hello! I'm Eragear Copilot. How can I help you with your notes?",
			timestamp: new Date(),
		},
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		// Add user message
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: input,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);

		// Simulate AI response (replace with actual API call later)
		setTimeout(() => {
			const assistantMessage: Message = {
				id: (Date.now() + 1).toString(),
				role: "assistant",
				content: `I received your message: "${input}". This is a placeholder response. Integration with Eragear API coming soon!`,
				timestamp: new Date(),
			};
			setMessages((prev) => [...prev, assistantMessage]);
			setIsLoading(false);
		}, 500);
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
	};

	return (
		<div className="eragear-container">
			<div className="eragear-messages">
				{messages.map((message) => (
					<div key={message.id} className={`message message-${message.role}`}>
						<div className="message-avatar">
							{message.role === "user" ? "👤" : "🤖"}
						</div>
						<div className="message-content">
							<p>{message.content}</p>
							<span className="message-time">
								{message.timestamp.toLocaleTimeString()}
							</span>
						</div>
					</div>
				))}
				{isLoading && (
					<div className="message message-assistant">
						<div className="message-avatar">🤖</div>
						<div className="message-content">
							<div className="typing-indicator">
								<span></span>
								<span></span>
								<span></span>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			<div className="eragear-input-area">
				<textarea
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyPress={handleKeyPress}
					placeholder="Ask something... (Shift+Enter for newline)"
					className="eragear-input"
				/>
				<button
					type="button"
					onClick={handleSendMessage}
					disabled={!input.trim() || isLoading}
					className="eragear-send-btn"
				>
					Send
				</button>
			</div>
		</div>
	);
};
