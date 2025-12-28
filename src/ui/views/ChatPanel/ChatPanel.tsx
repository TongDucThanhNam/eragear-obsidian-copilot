import { type TFile, MarkdownView, type App } from "obsidian";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { EditorController } from "../../editor/editor-controller";
import {
	ChatInput,
	MessageList,
	SlashCommandMenu,
	SuggestionPopover,
	ContextBadges,
	ChatContextMenu,
} from "./components";
import {
	IconLink,
	IconBranch,
	IconArchive,
	IconList,
	IconTag,
	IconMinus,
	IconSquare,
	IconX,
	IconMessage,
	IconWrench,
	IconPlus,
	IconPen,
} from "./components/Icons";
import type { Message } from "./types";
import { AIService } from "../../../services/ai-service";
import { AIProviderType } from "../../../settings";

interface ChatPanelProps {
	app: App;
}

type PanelMode = "chat" | "playground";

export const ChatPanel: React.FC<ChatPanelProps> = ({ app }) => {
	// Retrieve plugin settings
	const getPluginSettings = () => {
		// @ts-ignore
		const plugin = app.plugins.getPlugin("eragear-obsidian-copilot");
		return plugin?.settings;
	};

	const [activeMode, setActiveMode] = useState<PanelMode>("chat");

	const [messages, setMessages] = useState<Message[]>([
		{
			id: "welcome-msg",
			role: "assistant",
			parts: [
				{
					type: "text",
					text: "Hello! I'm Eragear Copilot.\n\nTry:\n• `@` to add context from notes\n• `/edit` for inline editing",
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
	const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
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

			// Get Active File
			const activeView = app.workspace.getActiveViewOfType(MarkdownView);
			const activeFile = activeView?.file;

			// Filter
			let filtered = files.filter(
				(f) =>
					f.basename.toLowerCase().includes(lowerQuery) ||
					f.path.toLowerCase().includes(lowerQuery),
			);

			// If query is empty or matches active file, ensure it's at top
			if (
				activeFile &&
				(activeFile.basename.toLowerCase().includes(lowerQuery) ||
					activeFile.path.toLowerCase().includes(lowerQuery))
			) {
				// Remove from generic list to avoid duplicate
				filtered = filtered.filter((f) => f.path !== activeFile.path);
				// Prepend
				filtered.unshift(activeFile);
			}

			setSuggestions(filtered.slice(0, 10));
			setSuggestionIndex(0);
		} else {
			setSuggestions([]);
		}
	}, [
		suggestionQuery,
		app.vault.getMarkdownFiles,
		app.workspace.getActiveViewOfType,
	]);

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

		const isNewMessage = !text;
		const userContent = isNewMessage ? input.trim() : "";

		if (isNewMessage) {
			setShowCommands(false);
			setShouldFocusInput(true);
			setInput("");

			// 1. Add User Message
			const displayContent = userContent;

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
				const history = [...messages, userMsg];
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

		if (messages.length === 0) return;

		const newHistory = [...messages];
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

	const handleDelete = (id: string) => {
		setMessages((prev) => prev.filter((m) => m.id !== id));
	};

	const handleRegenerate = async () => {
		// Just reuse handleSendMessage with empty text but ensuring state is logically correct beforehand?
		// Actually, let's just trigger the retry logic manually:
		if (messages.length === 0) return;

		const newHistory = [...messages];
		const lastMsg = newHistory[newHistory.length - 1];

		if (lastMsg && lastMsg.role === "assistant") {
			newHistory.pop();
		}

		// This effectively resets verification of last user msg
		setMessages(newHistory);
		// Then call send with empty? No, handleSendMessage logic is complex with contexts.
		// It's better to just replicate the stream call on existing history.
		// For brevity in this fix, I am leaving the duplicate logic for now or simple re-call if refactored.
		// Simulating a re-send of the last user message seems easier but we don't want to duplicate user message.
		// The block above (lines 380+) handles exactly this case (regenerating response for last user message).
		// So we just need to confirm we update state 'messages' to remove the bad assistant response, then trigger the effect?
		// But handleSendMessage is an async function, not an effect.
		// So we call handleSendMessage() with no args?
		// But handleSendMessage logic splits: if isNewMessage (which is true if !text)...
		// wait, isNewMessage = !text. So handleSendMessage() -> isNewMessage=true.
		// Then it tries to add 'input' as user message. That's WRONG for regeneration.

		// Correct fix: Separate 'sendMessage' from 'regenerate'.
		// For now, I'll copy the regeneration logic I saw in the previous file content (lines 428+).

		const lastUserMsg =
			newHistory.length > 0 ? newHistory[newHistory.length - 1] : undefined;
		if (lastUserMsg && lastUserMsg.role === "user") {
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
	};

	const handleNewChat = () => {
		setMessages([
			{
				id: "welcome-msg",
				role: "assistant",
				parts: [
					{
						type: "text",
						text: "Hello! I'm Eragear Copilot.\n\nTry:\n• `@` to add context from notes\n• `/edit` for inline editing",
					},
				],
			},
		]);
		setInput("");
		setSelectedFiles([]);
		setSuggestionQuery(null);
	};

	const handleTriggerContext = () => {
		setInput((prev) => {
			const newVal =
				prev.endsWith(" ") || prev === "" ? `${prev}@` : `${prev} @`;
			setSuggestionQuery("");
			setShouldFocusInput(true);
			return newVal;
		});
	};

	const getAvailableModels = () => {
		const settings = getPluginSettings();
		if (!settings) return [];
		switch (settings.provider) {
			case AIProviderType.BYOK_OPENAI:
				return ["gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"];
			case AIProviderType.BYOK_GEMINI:
				return ["gemini-1.5-flash", "gemini-1.5-pro"];
			case AIProviderType.BYOK_DEEPSEEK:
				return ["deepseek-chat", "deepseek-reasoner"];
			default:
				return [];
		}
	};

	const handleCommandClick = (cmd: string) => {
		const newValue = cmd + " ";
		setInput(newValue);
		setShowCommands(false);
		setShouldFocusInput(true);
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

	// --- New Handlers for Context Menu ---
	const handleAddActiveNote = () => {
		const activeFile = app.workspace.getActiveFile();
		if (activeFile && activeFile.extension === "md") {
			if (!selectedFiles.some((f) => f.path === activeFile.path)) {
				setSelectedFiles((prev) => [...prev, activeFile]);
			}
		}
	};

	const handleAddFile = (file: TFile) => {
		if (!selectedFiles.some((f) => f.path === file.path)) {
			setSelectedFiles((prev) => [...prev, file]);
		}
	};

	const handleAddFolder = (path: string) => {
		if (!selectedFolders.includes(path)) {
			setSelectedFolders((prev) => [...prev, path]);
		}
	};

	return (
		<div className="eragear-container">
			{/* Header Toolbar */}
			<div className="eragear-header-toolbar">
				<div className="eragear-tool-icons">
					<button type="button" className="icon-btn" title="Link">
						<IconLink />
					</button>
					<button type="button" className="icon-btn" title="Branch">
						<IconBranch />
					</button>
					<button type="button" className="icon-btn" title="Archive">
						<IconArchive />
					</button>
					<button type="button" className="icon-btn" title="List">
						<IconList />
					</button>
					<button type="button" className="icon-btn" title="Tags">
						<IconTag />
					</button>
				</div>
				<div className="eragear-tool-icons">
					<button type="button" className="icon-btn" title="Minimize">
						<IconMinus />
					</button>
					<button type="button" className="icon-btn" title="Maximize">
						<IconSquare />
					</button>
					<button type="button" className="icon-btn" title="Close">
						<IconX />
					</button>
				</div>
			</div>

			{/* Toggle Tabs */}
			<div className="eragear-mode-toggle">
				<button
					type="button"
					className={`eragear-toggle-btn ${activeMode === "chat" ? "active" : "inactive"}`}
					onClick={() => setActiveMode("chat")}
				>
					<IconMessage /> Chat
				</button>
				<button
					type="button"
					className={`eragear-toggle-btn ${activeMode === "playground" ? "active" : "inactive"}`}
					onClick={() => setActiveMode("playground")}
				>
					<IconWrench /> Playground
				</button>
			</div>

			{/* Chat History */}
			<div className="eragear-chat-area">
				<div className="eragear-chat-header">
					<span className="eragear-chat-title">
						{activeMode === "chat" ? "Chat" : "Playground"}
					</span>
					<button
						type="button"
						className="eragear-add-btn"
						onClick={handleNewChat}
						title="New Chat"
					>
						<IconPlus />
					</button>
				</div>

				<MessageList
					messages={messages}
					isLoading={isLoading}
					onDelete={handleDelete}
					onRegenerate={handleRegenerate}
					onInsert={handleInsert}
				/>
			</div>

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

			<div className="eragear-input-container">
				{/* Context Badges */}
				<ContextBadges
					selectedFiles={selectedFiles}
					selectedFolders={selectedFolders}
					onRemoveFile={(path) =>
						setSelectedFiles((prev) => prev.filter((f) => f.path !== path))
					}
					onRemoveFolder={(path) =>
						setSelectedFolders((prev) => prev.filter((f) => f !== path))
					}
				/>

				{/* Input Area with Context Menu */}
				<ChatInput
					input={input}
					isLoading={isLoading}
					onInputChange={handleInputChange}
					onSendMessage={() => handleSendMessage()}
					onKeyDown={handleKeyPress}
					shouldFocus={shouldFocusInput}
					selectedModel={selectedModel}
					onModelChange={setSelectedModel}
					availableModels={getAvailableModels()}
					onTriggerContext={handleTriggerContext}
					contextMenu={
						<ChatContextMenu
							app={app}
							onAddActiveNote={handleAddActiveNote}
							onAddFile={handleAddFile}
							onAddFolder={handleAddFolder}
						/>
					}
				/>
			</div>

			{/* Footer Status */}
			<div className="eragear-status-bar">
				<span>0 linked references</span>
				<div className="eragear-status-pill">
					<IconPen />
					<span style={{ marginLeft: "4px" }}>Eragear: Ready</span>
				</div>
			</div>
		</div>
	);
};
