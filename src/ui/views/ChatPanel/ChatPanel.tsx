import { type TFile, MarkdownView, type App } from "obsidian";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { EditorController } from "../../editor/editor-controller";
import {
	ChatInput,
	MessageList,
	SlashCommandMenu,
	SuggestionPopover,
} from "./components";
import type { Message } from "./types";
import { AIService } from "../../../services/ai-service";
import { AIProviderType } from "../../../settings";

interface ChatPanelProps {
	app: App;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ app }) => {
	// Retrieve plugin settings
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
	const [selectedModel, setSelectedModel] = useState<string>("");

	// Context & Suggestion State
	const [selectedFiles, setSelectedFiles] = useState<TFile[]>([]);
	const [suggestionQuery, setSuggestionQuery] = useState<string | null>(null);
	const [suggestions, setSuggestions] = useState<TFile[]>([]);
	const [suggestionIndex, setSuggestionIndex] = useState(0);

	const editorCtrl = useRef(new EditorController(app));

	useEffect(() => {
		const settings = getPluginSettings();
		if (settings) {
			const defaultModel =
				settings.provider === AIProviderType.BYOK_OPENAI
					? settings.openaiModel || "gpt-4o"
					: settings.provider === AIProviderType.BYOK_GEMINI
						? settings.geminiModel || "gemini-1.5-flash"
						: settings.provider === AIProviderType.BYOK_DEEPSEEK
							? settings.deepseekModel || "deepseek-chat"
							: "";
			setSelectedModel(defaultModel);
		}
	}, []);

	// Filter suggestions when query changes
	useEffect(() => {
		if (suggestionQuery !== null) {
			const files = app.vault.getMarkdownFiles();
			const lowerQuery = suggestionQuery.toLowerCase();
			const filtered = files
				.filter(
					(f) =>
						f.basename.toLowerCase().includes(lowerQuery) ||
						f.path.toLowerCase().includes(lowerQuery),
				)
				.slice(0, 10); // Limit to 10
			setSuggestions(filtered);
			setSuggestionIndex(0);
		} else {
			setSuggestions([]);
		}
	}, [suggestionQuery]);

	const handleInputChange = (val: string) => {
		setInput(val);

		// Simple @ detection: Last word starts with @
		const match = val.match(/@(\w*)$/);
		if (match && match[1] !== undefined) {
			setSuggestionQuery(match[1]);
			setShowCommands(false);
		} else {
			setSuggestionQuery(null);
			setShowCommands(val.trim() === "/");
		}

		setShouldFocusInput(false);
	};

	const handleSelectSuggestion = (file: TFile) => {
		// Add to selected files if not already there
		if (!selectedFiles.find((f) => f.path === file.path)) {
			setSelectedFiles((prev) => [...prev, file]);
		}

		// Remove the Trigger from input
		// We need to replace the last @... pattern
		const match = input.match(/@(\w*)$/);
		if (match) {
			const prefix = input.substring(0, match.index);
			setInput(prefix);
		}

		setSuggestionQuery(null);
		setShouldFocusInput(true);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (suggestionQuery !== null && suggestions.length > 0) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				setSuggestionIndex((prev) => (prev + 1) % suggestions.length);
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				setSuggestionIndex(
					(prev) => (prev - 1 + suggestions.length) % suggestions.length,
				);
				return;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				const selected = suggestions[suggestionIndex];
				if (selected) {
					handleSelectSuggestion(selected);
				}
				return;
			}
			if (e.key === "Escape") {
				setSuggestionQuery(null);
				return;
			}
		}

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSendMessage();
		}
		if (e.key === "Escape") {
			setShowCommands(false);
		}
	};

	const handleSendMessage = async (text?: string) => {
		const contentToSend = text || input;
		if (!contentToSend.trim() && selectedFiles.length === 0) return;

		// If distinct from input (regeneration), don't add user msg again if logic differs,
		// but here we just reuse generic flow.
		// If text passed explicitly (regeneration), we usually assume user message is ALREADY in history?
		// Wait, if regeneration, we pass everything UP TO the last user message.

		// Let's split this:
		// Normal send: Add User Msg -> Call AI
		// Regenerate: Call AI with existing history

		// If called via Enter/Button with Input:
		const isNewMessage = !text;
		const userContent = isNewMessage ? input.trim() : "";

		if (isNewMessage) {
			setShowCommands(false);
			setShouldFocusInput(true);
			setInput("");

			// 1. Add User Message
			let displayContent = userContent;
			// We stick to standard text for now, no injected chips in history text

			const userMsg: Message = {
				id: Date.now().toString(),
				role: "user",
				parts: [{ type: "text", text: displayContent }],
			};
			setMessages((prev) => [...prev, userMsg]);

			// --- CONTEXT LOADING ---
			let contextBlock = "";
			if (selectedFiles.length > 0) {
				const contextPromises = selectedFiles.map(async (file) => {
					const content = await app.vault.read(file);
					return `=== Context from ${file.basename} ===\n${content}\n`;
				});
				const contexts = await Promise.all(contextPromises);
				contextBlock = contexts.join("\n");

				// Clear selection after consuming
				setSelectedFiles([]);
			}

			// Handle Slash Commands (only for new messages)
			if (userContent.startsWith("/edit")) {
				// ... slash command logic ...
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
				let history = [...messages, userMsg];
				const lastMsgIndex = history.length - 1;

				const coreMessages = history.map((m, idx) => {
					let text = m.parts
						.map((p) => (p.type === "text" ? p.text : ""))
						.join("");
					if (idx === lastMsgIndex && contextBlock) {
						text = `${contextBlock}\n\n${text}`;
					}
					return { role: m.role, content: text };
				});

				const result = await aiService.streamChat(coreMessages, selectedModel);

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
			return;
		}

		// Handle Regeneration logic
		if (messages.length === 0) return;

		let newHistory = [...messages];
		const lastMsg = newHistory[newHistory.length - 1];

		// If last was assistant, remove it
		if (lastMsg && lastMsg.role === "assistant") {
			newHistory.pop();
		}

		// Check if there is a user message to respond to
		const lastUserMsg =
			newHistory.length > 0 ? newHistory[newHistory.length - 1] : undefined;
		if (lastUserMsg && lastUserMsg.role === "user") {
			setMessages(newHistory); // Update state to removed version

			setIsLoading(true);
			const settings = getPluginSettings();
			const aiService = new AIService(settings);

			try {
				const coreMessages = newHistory.map((m) => ({
					role: m.role,
					content: m.parts
						.map((p) => (p.type === "text" ? p.text : ""))
						.join(""),
				}));

				const result = await aiService.streamChat(coreMessages, selectedModel);

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
				console.error(e);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleDelete = (id: string) => {
		setMessages((prev) => prev.filter((m) => m.id !== id));
	};

	const handleRegenerate = async () => {
		// Just delegate to main handler but passing undefined text so it hits regeneration logic?
		// Wait, my handleSendMessage logic for regeneration is guarded by !isNewMessage.
		// If I call with no args, text is undefined, isNewMessage is true (text || input).
		// Wait, if input is empty, contentToSend will be empty -> return.
		// If input has text, it sends new message.
		// So handleSendMessage is NOT handling regeneration correctly with current logic block.

		// I'll keep the separate logic I wrote inside `handleRegenerate` (pasted above)
		// But I need to invoke it.

		// Re-pasting the logic from previous step into handleSendMessage or keep it separate?
		// I kept it inside handleSendMessage 'block' but unreachable?
		// Ah, I see. I duplicated logic in my head.
		// Let's just fix handleRegenerate to be standalone as it was.
		if (messages.length === 0) return;

		let newHistory = [...messages];
		const lastMsg = newHistory[newHistory.length - 1];

		if (lastMsg && lastMsg.role === "assistant") {
			newHistory.pop();
		}

		const lastUserMsg =
			newHistory.length > 0 ? newHistory[newHistory.length - 1] : undefined;
		if (lastUserMsg && lastUserMsg.role === "user") {
			setMessages(newHistory);
			setIsLoading(true);
			const settings = getPluginSettings();
			const aiService = new AIService(settings);

			try {
				const coreMessages = newHistory.map((m) => ({
					role: m.role,
					content: m.parts
						.map((p) => (p.type === "text" ? p.text : ""))
						.join(""),
				}));

				const result = await aiService.streamChat(coreMessages, selectedModel);

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
				console.error(e);
			} finally {
				setIsLoading(false);
			}
		}
	};

	const handleInsert = (content: string) => {
		const success = editorCtrl.current.insertText(content);
		if (!success) {
			// Maybe show toast?
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
			<div
				className="eragear-header"
				style={{
					padding: "8px 12px",
					borderBottom: "1px solid var(--background-modifier-border)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					fontSize: "0.85em",
				}}
			>
				<span style={{ fontWeight: 600 }}>Chat</span>
				<select
					value={selectedModel}
					onChange={(e) => setSelectedModel(e.target.value)}
					style={{
						background: "transparent",
						border: "none",
						color: "var(--text-muted)",
						fontSize: "inherit",
						textAlign: "right",
						cursor: "pointer",
					}}
				>
					{getPluginSettings()?.provider === AIProviderType.BYOK_OPENAI && (
						<>
							<option value="gpt-4o">gpt-4o</option>
							<option value="gpt-4-turbo">gpt-4-turbo</option>
							<option value="gpt-3.5-turbo">gpt-3.5-turbo</option>
						</>
					)}
					{getPluginSettings()?.provider === AIProviderType.BYOK_GEMINI && (
						<>
							<option value="gemini-1.5-flash">gemini-1.5-flash</option>
							<option value="gemini-1.5-pro">gemini-1.5-pro</option>
						</>
					)}
					{getPluginSettings()?.provider === AIProviderType.BYOK_DEEPSEEK && (
						<>
							<option value="deepseek-chat">deepseek-chat</option>
							<option value="deepseek-reasoner">deepseek-reasoner</option>
						</>
					)}
					<option value={selectedModel || "custom"}>
						{selectedModel} (Custom)
					</option>
				</select>
			</div>

			<MessageList
				messages={messages}
				isLoading={isLoading}
				onDelete={handleDelete}
				onRegenerate={handleRegenerate}
				onInsert={handleInsert}
			/>

			{showCommands && (
				<SlashCommandMenu onCommandSelect={handleCommandClick} />
			)}

			{/* Suggestion Popover */}
			{suggestionQuery !== null && (
				<div style={{ position: "relative" }}>
					<SuggestionPopover
						suggestions={suggestions}
						selectedIndex={suggestionIndex}
						onSelect={handleSelectSuggestion}
						position={{ top: "auto", left: 0 }}
					/>
				</div>
			)}

			{/* Selected Files Chips */}
			{selectedFiles.length > 0 && (
				<div
					className="eragear-context-chips"
					style={{
						display: "flex",
						flexWrap: "wrap",
						gap: "4px",
						padding: "8px 12px 0 12px",
						fontSize: "0.85em",
					}}
				>
					{selectedFiles.map((file) => (
						<div
							key={file.path}
							style={{
								background: "var(--background-modifier-form-field)",
								border: "1px solid var(--background-modifier-border)",
								borderRadius: "12px",
								padding: "2px 8px",
								display: "flex",
								alignItems: "center",
								gap: "4px",
							}}
						>
							<span>📄 {file.basename}</span>
							<button
								type="button"
								onClick={() =>
									setSelectedFiles((prev) =>
										prev.filter((f) => f.path !== file.path),
									)
								}
								style={{
									background: "none",
									border: "none",
									cursor: "pointer",
									padding: 0,
									marginLeft: "4px",
									opacity: 0.6,
								}}
							>
								✕
							</button>
						</div>
					))}
				</div>
			)}

			<ChatInput
				input={input}
				isLoading={isLoading}
				onInputChange={handleInputChange}
				onSendMessage={() => handleSendMessage()}
				onKeyDown={handleKeyDown}
				shouldFocus={shouldFocusInput}
			/>
		</div>
	);
};
