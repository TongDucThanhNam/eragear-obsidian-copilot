import { type App, MarkdownView, type TFile } from "obsidian";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { AIService } from "../../../services/ai-service";
import { AIProviderType } from "../../../settings";
import { EditorController } from "../../editor/editor-controller";
import {
	ChatInput,
	ContextBadges,
	MessageList,
	SlashCommandMenu,
	SuggestionPopover,
	type SuggestionItem,
} from "./components";
import {
	IconPlus,
	IconFileText,
	IconFolder,
	IconSearch,
} from "./components/Icons";
import type { Message } from "./types";

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
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [suggestionIndex, setSuggestionIndex] = useState(0);
	// Mode for context picker: null (root), 'notes', 'folders'
	const [contextPickerMode, setContextPickerMode] = useState<
		"root" | "notes" | "folders"
	>("root");

	const settings = getPluginSettings();

	const editorCtrl = useRef(new EditorController(app));

	useEffect(() => {
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
	}, [settings]);

	// Filter suggestions when query changes
	useEffect(() => {
		if (suggestionQuery !== null) {
			const lowerQuery = suggestionQuery.toLowerCase();

			// Check if we are in a special mode or just filtered
			if (suggestionQuery === "") {
				// ROOT MENU MODE
				if (contextPickerMode === "root") {
					const rootItems: SuggestionItem[] = [];

					// 1. Active Note
					const activeView = app.workspace.getActiveViewOfType(MarkdownView);
					const activeFile = activeView?.file;
					if (activeFile) {
						const isAlreadySelected = selectedFiles.some(
							(f) => f.path === activeFile.path,
						);
						if (!isAlreadySelected) {
							rootItems.push({
								type: "action",
								label: "Active Note",
								id: "action_active_note",
								icon: <IconFileText />, // We should import this or use emoji
								desc: activeFile.basename,
								data: activeFile,
							});
						}
					}

					// 2. Notes
					rootItems.push({
						type: "category",
						label: "Notes",
						id: "category_notes",
						icon: <IconFileText />,
						desc: "Select from all notes",
					});

					// 3. Folders
					rootItems.push({
						type: "category",
						label: "Folders",
						id: "category_folders",
						icon: <IconFolder />,
						desc: "Select a folder",
					});

					setSuggestions(rootItems);
				} else if (contextPickerMode === "notes") {
					// Show recent files (mocked or full list restricted)
					const files = app.vault.getMarkdownFiles().slice(0, 50); // Limit to top 50 for performance
					const fileItems: SuggestionItem[] = files.map((f) => ({
						type: "file",
						label: f.basename,
						id: f.path,
						data: f,
						desc: f.path,
					}));
					setSuggestions(fileItems);
				} else if (contextPickerMode === "folders") {
					// Show all folders
					const allFolders = app.vault
						.getAllLoadedFiles()
						.filter((f) => !("extension" in f)); // simplistic check for folder
					const folderItems: SuggestionItem[] = allFolders.map((f) => ({
						type: "folder",
						label: f.name,
						id: f.path,
						data: f,
						desc: f.path,
						icon: <IconFolder />,
					}));
					// Filter internal folders if needed, but for now show all
					setSuggestions(folderItems.slice(0, 50));
				}
			} else {
				// We have a query text
				// Default to searching FILES and FOLDERS mixed?
				// Or if we are in 'notes' mode, search notes.
				// Let's implement global search for simplicity as user types

				const files = app.vault.getMarkdownFiles();
				let filtered = files.filter(
					(f) =>
						f.basename.toLowerCase().includes(lowerQuery) ||
						f.path.toLowerCase().includes(lowerQuery),
				);

				// Get Active File for prioritization
				const activeView = app.workspace.getActiveViewOfType(MarkdownView);
				const activeFile = activeView?.file;

				if (
					activeFile &&
					activeFile.basename.toLowerCase().includes(lowerQuery)
				) {
					filtered = filtered.filter((f) => f.path !== activeFile.path);
					filtered.unshift(activeFile);
				}

				const items: SuggestionItem[] = filtered.slice(0, 15).map((f) => ({
					type: "file",
					label: f.basename,
					id: f.path,
					data: f,
					desc: f.path,
				}));
				setSuggestions(items);
			}

			setSuggestionIndex(0);
		} else {
			setSuggestions([]);
			setContextPickerMode("root"); // Reset mode when closed
		}
	}, [
		suggestionQuery,
		contextPickerMode,
		app.vault.getMarkdownFiles,
		app.workspace.getActiveViewOfType,
	]);

	const handleInputChange = (val: string) => {
		setInput(val);

		// Simple @ detection: Last word starts with @
		const match = val.match(/@(.*)$/); // Match until end to capture spaces if we want multi-word search?
		// Actually, existing regex was /@(\w*)$/. This implies SINGLE WORD.
		// If we want "Notes" -> sub menu, we need to handle state machine.
		// If user Backspaces, we might want to go back to root?
		// For now, let's keep simple trigger.

		const triggerMatch = val.match(/@([^@]*)$/); // capture everything after last @
		if (triggerMatch && triggerMatch[1] !== undefined) {
			setSuggestionQuery(triggerMatch[1]);
			setShowCommands(false);
		} else {
			setSuggestionQuery(null);
			setShowCommands(val.trim() === "/");
		}

		setShouldFocusInput(false);
	};

	const handleSelectSuggestion = (item: SuggestionItem) => {
		if (item.type === "action") {
			if (item.id === "action_active_note") {
				// Add active note
				const file = item.data as TFile;
				if (!selectedFiles.find((f) => f.path === file.path)) {
					setSelectedFiles((prev) => [...prev, file]);
				}
				closeIdsAndCleanInput();
			}
		} else if (item.type === "category") {
			if (item.id === "category_notes") {
				setContextPickerMode("notes");
				// Don't close, just update list. The query is still "".
				// We rely on the useEffect dependency on contextPickerMode to refresh suggestions.
			} else if (item.id === "category_folders") {
				setContextPickerMode("folders");
			}
		} else if (item.type === "file") {
			const file = item.data as TFile;
			if (!selectedFiles.find((f) => f.path === file.path)) {
				setSelectedFiles((prev) => [...prev, file]);
			}
			closeIdsAndCleanInput();
		} else if (item.type === "folder") {
			const path = item.id;
			if (!selectedFolders.includes(path)) {
				setSelectedFolders((prev) => [...prev, path]);
			}
			closeIdsAndCleanInput();
		}
	};

	const closeIdsAndCleanInput = () => {
		// Remove the Trigger from input
		const match = input.match(/@([^@]*)$/);
		if (match) {
			const prefix = input.substring(0, match.index);
			setInput(prefix);
		}

		setSuggestionQuery(null);
		setContextPickerMode("root");
		setShouldFocusInput(true);
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
		if (messages.length === 0) return;

		const newHistory = [...messages];
		const lastMsg = newHistory[newHistory.length - 1];

		if (lastMsg && lastMsg.role === "assistant") {
			newHistory.pop();
		}

		setMessages(newHistory);

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
			// Ensure we have a space before @ if not at start
			const prefix = prev.length > 0 && !prev.endsWith(" ") ? " " : "";
			const newVal = `${prev}${prefix}@`;

			// We set query to "" specifically to trigger Root Menu
			setSuggestionQuery("");
			setContextPickerMode("root");
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
		// Handle Suggestion Navigation
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
				// If in submenu, go back to root?
				if (contextPickerMode !== "root") {
					setContextPickerMode("root");
					return;
				}
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
			setSuggestionQuery(null);
		}
	};

	return (
		<div className="eragear-container">
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

				{/* Input Area */}
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
					// No contextMenu prop anymore!
				/>
			</div>
		</div>
	);
};
