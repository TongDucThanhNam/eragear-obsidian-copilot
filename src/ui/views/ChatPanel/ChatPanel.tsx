import type { App } from "obsidian";
import type React from "react";
import { useRef, useState } from "react";
import { EditorController } from "../../editor/editor-controller";
import { ChatInput, MessageList, SlashCommandMenu } from "./components";
import type { Message } from "./types";
import { AIService } from "../../../services/ai-service";

interface ChatPanelProps {
	app: App;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ app }) => {
	// Retrieve plugin instance and settings safely
	const getPluginSettings = () => {
		// @ts-ignore
		const plugin = app.plugins.getPlugin("eragear-obsidian-copilot");
		return plugin?.settings;
	};

	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome-msg",
			role: "assistant",
			parts: [
				{
					type: "text",
					text: "Hello! I'm Eragear Copilot.\n\nTry:\n• `/edit` to simulate an inline edit suggestion\n• `/notes` to search your vault context",
				},
			],
		},
	]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showCommands, setShowCommands] = useState(false);
	const [shouldFocusInput, setShouldFocusInput] = useState(false);

	const editorCtrl = useRef(new EditorController(app));

	const handleInputChange = (val: string) => {
		setInput(val);
		setShowCommands(val.trim() === "/");
		setShouldFocusInput(false);
	};

	const handleSendMessage = async () => {
		if (!input.trim()) return;

		const userContent = input.trim();
		setShowCommands(false);
		setShouldFocusInput(true);
		setInput("");

		// 1. Add User Message
		const userMsg: Message = {
			id: Date.now().toString(),
			role: "user",
			parts: [{ type: "text", text: userContent }],
		};
		setMessages((prev) => [...prev, userMsg]);

		// Handle Slash Commands Interception
		if (userContent.startsWith("/edit")) {
			setTimeout(() => {
				const context = editorCtrl.current.getContext();
				if (context) {
					const success = editorCtrl.current.injectDiff({
						id: Date.now().toString(),
						from: context.cursor,
						to: context.cursor,
						originalText: "",
						suggestedText: " // AI: Suggested Edit via Inline Diff!",
						type: "insert",
					});
					const response = success
						? "I've proposed an edit in your active editor.\n\nCheck the **green highlight** and use the [✓] button to accept."
						: "Please open a Markdown file to use edit features.";
					const assistantMsg: Message = {
						id: Date.now().toString(),
						role: "assistant",
						parts: [{ type: "text", text: response }],
					};
					setMessages((prev) => [...prev, assistantMsg]);
				} else {
					const errorMsg: Message = {
						id: Date.now().toString(),
						role: "assistant",
						parts: [
							{
								type: "text",
								text: "No active markdown editor found. Please open a note first.",
							},
						],
					};
					setMessages((prev) => [...prev, errorMsg]);
				}
			}, 800);
			return;
		}

		if (userContent.startsWith("/notes")) {
			setTimeout(() => {
				const assistantMsg: Message = {
					id: Date.now().toString(),
					role: "assistant",
					parts: [
						{
							type: "text",
							text: "Searching your vault context... (This is a placeholder for the /notes command)",
						},
					],
				};
				setMessages((prev) => [...prev, assistantMsg]);
			}, 1000);
			return;
		}

		// 2. Call AI Service (Hybrid Strategy)
		setIsLoading(true);
		const settings = getPluginSettings();
		if (!settings) {
			const errorMsg: Message = {
				id: Date.now().toString(),
				role: "assistant",
				parts: [
					{
						type: "text",
						text: "Error: Could not load settings. Please make sure the plugin is enabled.",
					},
				],
			};
			setMessages((prev) => [...prev, errorMsg]);
			setIsLoading(false);
			return;
		}

		const aiService = new AIService(settings);

		try {
			// Prepare messages for AI SDK
			const coreMessages = messages.concat(userMsg).map((m) => ({
				role: m.role,
				content: m.parts.map((p) => (p.type === "text" ? p.text : "")).join(""),
			}));

			const result = await aiService.streamChat(coreMessages);

			// 3. Stream Response
			let fullResponse = "";
			const assistantMsgId = Date.now().toString();
			setMessages((prev) => [
				...prev,
				{
					id: assistantMsgId,
					role: "assistant",
					parts: [{ type: "text", text: "" }],
				},
			]);

			for await (const textPart of result.textStream) {
				fullResponse += textPart;
				setMessages((prev) =>
					prev.map((msg) =>
						msg.id === assistantMsgId
							? { ...msg, parts: [{ type: "text", text: fullResponse }] }
							: msg,
					),
				);
			}
		} catch (e: any) {
			const errorMsg: Message = {
				id: Date.now().toString(),
				role: "assistant",
				parts: [
					{
						type: "text",
						text: `Error: ${e.message || "Unknown error occurred"}`,
					},
				],
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsLoading(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
		if (e.key === "Escape") {
			setShowCommands(false);
		}
	};

	const handleCommandClick = (cmd: string) => {
		const newValue = cmd + " ";
		setInput(newValue);
		setShowCommands(false);
		setShouldFocusInput(true);
	};

	return (
		<div className="eragear-container">
			<MessageList messages={messages} isLoading={isLoading} />

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
