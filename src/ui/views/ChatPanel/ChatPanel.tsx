import type { App } from "obsidian";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { EditorController } from "../../editor/editor-controller";

interface Message {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

interface ChatPanelProps {
	app: App;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ app }) => {
	const [messages, setMessages] = useState<Message[]>([
		{
			id: "1",
			role: "assistant",
			content:
				"Hello! I'm Eragear Copilot.\n\nTry:\n• `/edit` to simulate an inline edit suggestion\n• `/notes` to search your vault context",
			timestamp: new Date(),
		},
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showCommands, setShowCommands] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	// Use Ref for controller to persist across renders
	const editorCtrl = useRef(new EditorController(app));

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		const userContent = input.trim();

		// Add user message
		const userMessage: Message = {
			id: Date.now().toString(),
			role: "user",
			content: userContent,
			timestamp: new Date(),
		};

		setMessages((prev) => [...prev, userMessage]);
		setInput("");
		setIsLoading(true);
		setShowCommands(false);

		// Reset textarea height
		if (inputRef.current) {
			inputRef.current.style.height = "auto";
		}

		// Handle Slash Commands Logic
		if (userContent.startsWith("/edit")) {
			// Simulate Edit Workflow
			setTimeout(() => {
				const context = editorCtrl.current.getContext();
				if (context) {
					// Simulate a diff response
					// For demo: insert a text at cursor
					const success = editorCtrl.current.injectDiff({
						id: Date.now().toString(),
						from: context.cursor, // Insert at current line (approx)
						to: context.cursor,
						originalText: "",
						suggestedText: " // AI: Suggested Edit via Inline Diff!",
						type: "insert",
					});

					const response = success
						? "I've proposed an edit in your active editor.\n\nCheck the **green highlight** and use the [✓] button to accept."
						: "Please open a Markdown file to use edit features.";

					addAssistantMessage(response);
				} else {
					addAssistantMessage(
						"No active markdown editor found. Please open a note first.",
					);
				}
				setIsLoading(false);
			}, 800);
			return;
		}

		if (userContent.startsWith("/notes")) {
			setTimeout(() => {
				addAssistantMessage(
					"Searching your vault context... (This is a placeholder for the /notes command)",
				);
				setIsLoading(false);
			}, 1000);
			return;
		}

		// Normal Chat Simulation (Echo)
		setTimeout(() => {
			addAssistantMessage(
				`I received: "${userContent}".\n(Echo response placeholder)`,
			);
			setIsLoading(false);
		}, 600);
	};

	const addAssistantMessage = (content: string) => {
		setMessages((prev) => [
			...prev,
			{
				id: Date.now().toString(),
				role: "assistant",
				content,
				timestamp: new Date(),
			},
		]);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		setInput(val);
		setShowCommands(val.trim() === "/");

		// Auto-resize textarea
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
		// Hide commands on Escape
		if (e.key === "Escape") {
			setShowCommands(false);
		}
	};

	const handleCommandClick = (cmd: string) => {
		setInput(cmd + " ");
		setShowCommands(false);
		inputRef.current?.focus();
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
							<div className="message-bubble">{message.content}</div>
							<span className="message-time">
								{message.timestamp.toLocaleTimeString([], {
									hour: "2-digit",
									minute: "2-digit",
								})}
							</span>
						</div>
					</div>
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

			{/* Slash Command Menu Overlay */}
			{showCommands && (
				<div className="eragear-slash-menu">
					<div className="slash-menu-header">Commands</div>
					<button
						type="button"
						className="slash-menu-item"
						onClick={() => handleCommandClick("/edit")}
					>
						<span className="slash-command-name">/edit</span>
						<span className="slash-command-desc">
							Insert code suggestion in editor
						</span>
					</button>
					<button
						type="button"
						className="slash-menu-item"
						onClick={() => handleCommandClick("/notes")}
					>
						<span className="slash-command-name">/notes</span>
						<span className="slash-command-desc">
							Search and reference notes
						</span>
					</button>
				</div>
			)}

			<div className="eragear-input-area">
				<textarea
					ref={inputRef}
					value={input}
					onChange={handleInputChange}
					onKeyDown={handleKeyPress}
					placeholder="Ask AI or type / for commands..."
					className="eragear-input"
					rows={1}
				/>
				<button
					type="button"
					onClick={handleSendMessage}
					disabled={!input.trim() || isLoading}
					className="eragear-send-btn"
					title="Send Message"
				>
					<svg className="eragear-send-icon" viewBox="0 0 24 24">
						<title>Send</title>
						<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
					</svg>
				</button>
			</div>
		</div>
	);
};
