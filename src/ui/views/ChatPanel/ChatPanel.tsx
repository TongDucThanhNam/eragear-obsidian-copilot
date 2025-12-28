import type { App } from "obsidian";
import type React from "react";
import { useRef, useState } from "react";
import { EditorController } from "../../editor/editor-controller";
import { ChatInput, MessageList, SlashCommandMenu } from "./components";
import type { Message } from "./types";

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
	const [shouldFocusInput, setShouldFocusInput] = useState(false);

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
		setShouldFocusInput(true); // Keep focus on input

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

	const handleInputChange = (val: string) => {
		setInput(val);
		setShowCommands(val.trim() === "/");
		setShouldFocusInput(false);
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
		setShouldFocusInput(true);
	};

	return (
		<div className="eragear-container">
			<MessageList messages={messages} isLoading={isLoading} />

			{/* Slash Command Menu Overlay */}
			{showCommands && (
				<SlashCommandMenu onCommandSelect={handleCommandClick} />
			)}

			<ChatInput
				input={input}
				isLoading={isLoading}
				onInputChange={handleInputChange}
				onSendMessage={handleSendMessage}
				onKeyDown={handleKeyPress}
				shouldFocus={shouldFocusInput}
			/>
		</div>
	);
};
