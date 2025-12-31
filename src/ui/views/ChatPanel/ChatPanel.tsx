import { PlusIcon } from "@phosphor-icons/react";
import { type App, MarkdownView, type TFile } from "obsidian";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AcpAdapter } from "../../../adapters/acp/acp.adapter";
import { NoteMentionService } from "../../../core/mention-service";
import type {
	OutputUpdate,
	PermissionRequest,
	PlanEntry,
	ToolCall,
} from "../../../domain/models/session-update";
import type EragearPlugin from "../../../main";
import { AIService } from "../../../services/ai-service";
import { AIProviderType, type ChatModelConfig } from "../../../settings";
import { AcpContextProvider } from "../../context/AcpContext";
import { EditorController } from "../../editor/editor-controller";
import { useAgentClient } from "../../hooks/useAgentClient";
import {
	hasMentions,
	cleanMentionSyntax,
} from "../../../shared/mention-utils";
import { prepareMessage } from "../../../shared/message-service";
import {
	ChatInput,
	ContextBadges,
	MessageList,
	PermissionDialog,
	type SuggestionItem,
} from "./components";
import {
	IconChevronDown,
	IconFileText,
	IconFolder,
	IconPlus,
} from "./components/Icons";

import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "./components/ui/dropdown-menu";
import { Badge } from "./components/ui/badge";
import type { Message } from "./types";

// Chat mode type
type ChatMode = "api" | "agent";

// Unique ID generator to avoid duplicate keys
let messageIdCounter = 0;
const generateMessageId = (prefix = "msg") => {
	messageIdCounter += 1;
	return `${prefix}-${Date.now()}-${messageIdCounter}`;
};

interface CurrentChatContext {
	mode: ChatMode;
	modelId?: string; // For API mode
	agentId?: string; // For ACP agent mode
	agentName?: string;
}

interface ChatPanelProps {
	app: App;
	plugin: EragearPlugin;
}

type PanelMode = "chat" | "playground";

export const ChatPanel: React.FC<ChatPanelProps> = ({ app, plugin }) => {
	// Retrieve plugin settings directly from prop
	const settings = plugin.settings;

	const [activeMode, setActiveMode] = useState<PanelMode>("chat");

	const [messages, setMessages] = useState<Message[]>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [showCommands, setShowCommands] = useState(false);
	const [shouldFocusInput, setShouldFocusInput] = useState(false);
	const [selectedModel, setSelectedModel] = useState<string>("");
	// Current chat context - determines if using API or ACP agent
	const [chatContext, setChatContext] = useState<CurrentChatContext>({
		mode: "api",
		modelId: "",
	});
	// Show new chat menu
	const [showNewChatMenu, setShowNewChatMenu] = useState(false);
	// Button ref for positioning dropdown
	const newChatButtonRef = useRef<HTMLButtonElement>(null);
	// Dropdown ref for click outside detection
	const dropdownRef = useRef<HTMLDivElement>(null);
	// Dropdown position state
	const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });

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

	// Slash Commands State
	const [activeSlashCommands, setActiveSlashCommands] = useState<
		SuggestionItem[]
	>([]);
	const [isAutoMentionEnabled, setIsAutoMentionEnabled] = useState(true);

	const editorCtrl = useRef(new EditorController(app));

	// NoteMentionService for file indexing and search
	const noteMentionService = useMemo(
		() => new NoteMentionService(app),
		[app],
	);

	// Cleanup NoteMentionService on unmount
	useEffect(() => {
		return () => {
			noteMentionService.destroy();
		};
	}, [noteMentionService]);

	// Agent Client Hook
	const {
		agentClient,
		isInitializing,
		error: agentError,
		modes,
		setModes,
		setMode,
		currentModeId,
		setCurrentModeId,
		// Agent models (experimental)
		agentModels,
		setAgentModels,
		setAgentModel,
	} = useAgentClient(
		settings || ({ provider: AIProviderType.BYOK_OPENAI } as any),
		app,
	);
	const [agentSessionId, setAgentSessionId] = useState<string | null>(null);
	// Agent plan state - stores the current execution plan from ACP agent
	const [planEntries, setPlanEntries] = useState<PlanEntry[]>([]);
	// Tool calls state - track active tool calls
	const [toolCalls, setToolCalls] = useState<Map<string, ToolCall>>(new Map());
	// Agent outputs state - store agent output messages
	const [agentOutputs, setAgentOutputs] = useState<OutputUpdate[]>([]);
	// Permission request state
	const [permissionRequest, setPermissionRequest] =
		useState<PermissionRequest | null>(null);
	// Last user message - for restoring after cancel
	const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);

	// Handler to switch API model (only for API models, not agents)
	const handleModelChange = async (modelId: string) => {
		if (!settings || chatContext.mode !== "api") return;

		const chatModels = settings.chatModels || [];
		const selectedConfig = chatModels.find(
			(m: ChatModelConfig) => m.id === modelId && m.type === "api",
		);

		if (!selectedConfig) {
			console.warn("[ChatPanel] API Model not found:", modelId);
			return;
		}

		// Update local state
		setSelectedModel(modelId);
		setChatContext((prev) => ({ ...prev, modelId }));

		// Update settings
		const providerMap: Record<string, AIProviderType> = {
			openai: AIProviderType.BYOK_OPENAI,
			gemini: AIProviderType.BYOK_GEMINI,
			deepseek: AIProviderType.BYOK_DEEPSEEK,
		};

		const newProvider =
			providerMap[selectedConfig.provider] || AIProviderType.BYOK_OPENAI;
		plugin.settings.provider = newProvider;
		plugin.settings.activeChatModelId = modelId;

		// Update legacy model fields for compatibility
		if (selectedConfig.provider === "openai" && selectedConfig.model) {
			plugin.settings.openaiModel = selectedConfig.model;
		} else if (selectedConfig.provider === "gemini" && selectedConfig.model) {
			plugin.settings.geminiModel = selectedConfig.model;
		} else if (selectedConfig.provider === "deepseek" && selectedConfig.model) {
			plugin.settings.deepseekModel = selectedConfig.model;
		}

		await plugin.saveSettings();
	};

	// Start a new chat with API models
	const handleNewAPIChat = () => {
		setShowNewChatMenu(false);
		setChatContext({ mode: "api", modelId: selectedModel });
		setMessages([]);
		setInput("");
		setSelectedFiles([]);
		setAgentSessionId(null);
		setPlanEntries([]); // Clear any existing plan
	};

	// Start a new chat with an ACP agent
	const handleNewAgentChat = async (agentConfig: ChatModelConfig) => {
		setShowNewChatMenu(false);

		// Update chat context
		setChatContext({
			mode: "agent",
			agentId: agentConfig.id,
			agentName: agentConfig.name,
		});

		// Update settings to use this agent
		plugin.settings.provider = AIProviderType.ACP_LOCAL;
		plugin.settings.activeChatModelId = agentConfig.id;
		await plugin.saveSettings();

		// Clear previous session - useAgentClient will create new one
		setAgentSessionId(null);
		setPlanEntries([]); // Clear any existing plan

		// Reset messages
		setMessages([]);
		setInput("");
		setSelectedFiles([]);
	};

	// Get available ACP agents from chatModels
	const getAvailableAgents = (): ChatModelConfig[] => {
		if (!settings) return [];
		return (settings.chatModels || []).filter(
			(m: ChatModelConfig) => m.type === "agent" && m.enabled,
		);
	};

	// Handle Agent Updates
	useEffect(() => {
		if (!agentClient) return;

		// Subscribe to session updates and store the subscription for cleanup
		const subscription = agentClient.onSessionUpdate((update) => {
			if (update.type === "user_message_chunk") {
				// Handle user message echo from agent (for session replay/loading)
				console.log("[ChatPanel] User message chunk:", update.text);
				// Optionally could append to user messages if needed for session loading
			} else if (update.type === "agent_message_chunk") {
				setMessages((prev) => {
					const lastMsg = prev[prev.length - 1];
					if (lastMsg && lastMsg.role === "assistant") {
						// Append to last message
						const newParts = [...lastMsg.parts];
						const lastPart = newParts[newParts.length - 1];
						if (lastPart && lastPart.type === "text") {
							// Check for accumulated text (fix for agents sending full history)
							const currentText = lastPart.text;
							const newChunk = update.text || "";
							const isAccumulated =
								currentText &&
								newChunk.length > currentText.length &&
								newChunk.startsWith(currentText);

							newParts[newParts.length - 1] = {
								...lastPart,
								text: isAccumulated ? newChunk : currentText + newChunk,
							};
						} else {
							newParts.push({ type: "text", text: update.text || "" });
						}
						return [...prev.slice(0, -1), { ...lastMsg, parts: newParts }];
					}
					// If no assistant message found (rare, maybe started with tool call?), create one?
					// Usually we create a placeholder before sending.
					return prev;
				});
			} else if (update.type === "agent_thought_chunk") {
				// Stream thoughts to UI - append to last assistant message as thought part
				setMessages((prev) => {
					const lastMsg = prev[prev.length - 1];
					if (lastMsg && lastMsg.role === "assistant") {
						const newParts = [...lastMsg.parts];
						const lastPart = newParts[newParts.length - 1];
						if (lastPart && lastPart.type === "thought") {
							// Check for accumulated text (fix for agents sending full history)
							const currentText = lastPart.text;
							const newChunk = update.text || "";
							const isAccumulated =
								currentText &&
								newChunk.length > currentText.length &&
								newChunk.startsWith(currentText);

							// Append thought text
							newParts[newParts.length - 1] = {
								...lastPart,
								text: isAccumulated ? newChunk : currentText + newChunk,
							};
						} else {
							// New thought part
							newParts.push({ type: "thought", text: update.text || "" });
						}
						return [...prev.slice(0, -1), { ...lastMsg, parts: newParts }];
					}
					// If no active assistant message, create one
					return [
						...prev,
						{
							id: generateMessageId(),
							role: "assistant",
							parts: [{ type: "thought", text: update.text || "" }],
						},
					];
				});
			} else if (update.type === "available_commands_update") {
				console.log(
					"[ChatPanel] Handling available_commands_update",
					update.commands,
				);
				if (update.commands) {
					const newCommands: SuggestionItem[] = update.commands.map((cmd) => {
						const hintPart = cmd.hint ? ` (${cmd.hint})` : "";
						return {
							type: "action" as const,
							label: `/${cmd.name}`,
							id: `cmd_${cmd.name}`,
							desc: `${cmd.description}${hintPart}`,
							data: { hint: cmd.hint },
						};
					});
					setActiveSlashCommands(newCommands);
				}
			} else if (update.type === "plan") {
				// Handle agent plan updates
				console.log("[ChatPanel] Handling plan update", update.entries);
				if (update.entries) {
					setPlanEntries(update.entries);
				}
			} else if (update.type === "tool_call") {
				// Handle new tool call - add as a message to the chat
				console.log(
					"[ChatPanel] Tool call:",
					update.toolCallId,
					update.title,
					update.status,
				);
				// Store in map for updates
				setToolCalls((prev) => {
					const newMap = new Map(prev);
					newMap.set(update.toolCallId, update);
					return newMap;
				});
				// Add as message
				const toolCallMsgId = `toolcall-${update.toolCallId}`;
				setMessages((prev) => {
					// Check if already exists
					if (prev.find((m) => m.id === toolCallMsgId)) return prev;
					return [
						...prev,
						{
							id: toolCallMsgId,
							role: "data" as const,
							parts: [{ type: "tool-call" as const, toolCall: update }],
						},
					];
				});
			} else if (update.type === "tool_call_update") {
				// Handle tool call status update - update existing entry
				console.log(
					"[ChatPanel] Tool call update:",
					update.toolCallId,
					update.status,
				);
				// Update in map
				setToolCalls((prev) => {
					const existing = prev.get(update.toolCallId);
					if (existing) {
						const newMap = new Map(prev);
						newMap.set(update.toolCallId, {
							...existing,
							...update,
							type: "tool_call", // Keep type as tool_call for UI
						});
						return newMap;
					}
					return prev;
				});
				// Update message in list
				const toolCallMsgId = `toolcall-${update.toolCallId}`;
				setMessages((prev) =>
					prev.map((msg) => {
						if (msg.id === toolCallMsgId) {
							const existingPart = msg.parts[0];
							if (existingPart?.type === "tool-call") {
								return {
									...msg,
									parts: [
										{
											type: "tool-call" as const,
											toolCall: {
												...existingPart.toolCall,
												...update,
												type: "tool_call" as const,
											},
										},
									],
								};
							}
						}
						return msg;
					}),
				);
			} else if (update.type === "current_mode_update") {
				// Handle mode change from agent
				console.log("[ChatPanel] Mode changed to:", update.currentModeId);
				setCurrentModeId(update.currentModeId);
			} else if (update.type === "permission_requested") {
				// Handle permission request - show dialog
				console.log("[ChatPanel] Permission requested:", update.title);
				setPermissionRequest(update);
			} else if (update.type === "session_end") {
				// Clear state when session ends
				setPlanEntries([]);
				setToolCalls(new Map());
				setAgentOutputs([]);
				setPermissionRequest(null);
				setIsLoading(false);
				setLastUserMessage(null); // Clear saved message on successful completion
			} else if (update.type === "output") {
				// Handle agent output - add as message in chat
				console.log(`[ChatPanel] Agent ${update.outputType}:`, update.text);
				// Keep in agentOutputs for reference
				setAgentOutputs((prev) => [...prev.slice(-19), update]);
				// Add as message
				const outputMsgId = `output-${Date.now()}`;
				setMessages((prev) => [
					...prev,
					{
						id: outputMsgId,
						role: "data" as const,
						parts: [{ type: "output" as const, output: update }],
					},
				]);
			}
		});

		// Cleanup: unsubscribe when effect re-runs or component unmounts
		return () => {
			subscription.unsubscribe();
		};
	}, [agentClient, setCurrentModeId]);

	// Handle click outside to close dropdown
	useEffect(() => {
		if (!showNewChatMenu) return;

		const handleClickOutside = (event: MouseEvent) => {
			const target = event.target as Node;
			const isOutsideDropdown =
				dropdownRef.current && !dropdownRef.current.contains(target);
			const isOutsideButton =
				newChatButtonRef.current && !newChatButtonRef.current.contains(target);

			if (isOutsideDropdown && isOutsideButton) {
				setShowNewChatMenu(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setShowNewChatMenu(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		document.addEventListener("keydown", handleEscape);

		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
			document.removeEventListener("keydown", handleEscape);
		};
	}, [showNewChatMenu]);

	// Auto-create session when agent is ready
	useEffect(() => {
		if (agentClient && !agentSessionId && !isInitializing) {
			const wd = settings?.agentWorkingDir || "";
			agentClient
				.newSession(wd)
				.then((res) => {
					setAgentSessionId(res.sessionId);
					// Set modes if available from agent
					if (res.availableModes && res.availableModes.length > 0) {
						setModes(res.availableModes);
						// Set current mode to the one marked as current, or first one
						const currentMode = res.availableModes.find((m) => m.isCurrent);
						if (currentMode) {
							setCurrentModeId(currentMode.id);
						} else if (res.availableModes[0]) {
							setCurrentModeId(res.availableModes[0].id);
						}
					}
					// Set models if available from agent (experimental)
					if (res.models) {
						setAgentModels(res.models);
						console.log(
							"[ChatPanel] Agent models loaded:",
							res.models.availableModels.map((m) => m.name).join(", "),
						);
					}
				})
				.catch((err) =>
					console.error("[ChatPanel] Failed to create session:", err),
				);
		}
	}, [
		agentClient,
		isInitializing,
		agentSessionId,
		settings?.agentWorkingDir,
		setModes,
		setCurrentModeId,
		setAgentModels,
	]);

	// Set default model when settings change
	useEffect(() => {
		if (settings) {
			console.log("[ChatPanel] Settings loaded:", settings);
			// Use activeChatModelId from the new unified system
			if (settings.activeChatModelId) {
				setSelectedModel(settings.activeChatModelId);
			} else {
				// Fallback to legacy provider-based model selection
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
		} else {
			console.log("[ChatPanel] Settings are missing or undefined");
		}
	}, [settings, settings?.activeChatModelId]);

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
		app.vault.getAllLoadedFiles,
		selectedFiles.some,
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
			// Save the user message before clearing (for restore on cancel)
			setLastUserMessage(input.trim());
			setInput("");

			// 1. Add User Message - show clean version to user (with [[links]] instead of @[[links]])
			const displayContent = hasMentions(userContent)
				? cleanMentionSyntax(userContent)
				: userContent;

			const userMsg: Message = {
				id: generateMessageId(),
				role: "user",
				parts: [{ type: "text", text: displayContent }],
			};
			setMessages((prev) => [...prev, userMsg]);

			// --- CONTEXT LOADING (Hybrid: selectedFiles + @mentions) ---
			let contextBlock = "";

			// 1a. Handle manually selected files from context picker
			if (selectedFiles.length > 0) {
				const contextPromises = selectedFiles.map(async (file) => {
					const content = await app.vault.read(file);
					return `<obsidian_mentioned_note ref="${file.path}">\n${content}\n</obsidian_mentioned_note>`;
				});
				const contexts = await Promise.all(contextPromises);
				contextBlock = contexts.join("\n\n");

				// Clear selection after consuming
				setSelectedFiles([]);
			}

			// 1b. Prepare message with @[[note]] mentions
			// This extracts mentioned notes and builds context blocks
			const activeView = app.workspace.getActiveViewOfType(MarkdownView);
			const activeFile = activeView?.file;

			const preparedMessage = await prepareMessage(
				{
					message: userContent,
					vaultBasePath: settings?.agentWorkingDir || "",
					includeActiveNote: isAutoMentionEnabled,
					activeNote: activeFile,
				},
				app,
				noteMentionService,
			);

			// Log any errors reading mentioned files
			if (preparedMessage.errors.length > 0) {
				console.warn(
					"[ChatPanel] Some mentioned files could not be read:",
					preparedMessage.errors,
				);
			}

			// Combine context from selected files and mentions
			const finalMessage =
				contextBlock.length > 0
					? contextBlock + "\n\n" + preparedMessage.agentMessage
					: preparedMessage.agentMessage;

			console.log("[ChatPanel] Final message to send:", {
				userContent,
				hasContext: contextBlock.length > 0,
				includedFiles: preparedMessage.includedFiles.map((f) => f.path),
				errors: preparedMessage.errors,
				finalMessagePreview: finalMessage.substring(0, 1000),
			});

			// Handle Slash Commands (only for new messages)
			if (userContent.startsWith("/edit")) {
				// ... slash command logic ...
				setTimeout(() => {
					const context = editorCtrl.current.getContext();
					if (context) {
						const success = editorCtrl.current.injectDiff({
							id: generateMessageId(),
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
							id: generateMessageId(),
							role: "assistant",
							parts: [{ type: "text", text: response }],
						};
						setMessages((prev) => [...prev, assistantMsg]);
					} else {
						const errorMsg: Message = {
							id: generateMessageId(),
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
						id: generateMessageId(),
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
			if (!settings) {
				const errorMsg: Message = {
					id: generateMessageId(),
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

			// --- ACP LOCAL HANDLING ---
			if (settings.provider === AIProviderType.ACP_LOCAL) {
				if (!agentClient) {
					const errorMsg: Message = {
						id: generateMessageId(),
						role: "assistant",
						parts: [
							{
								type: "text",
								text: "Agent is initializing or failed to start.",
							},
						],
					};
					setMessages((prev) => [...prev, errorMsg]);
					setIsLoading(false);
					return;
				}

				try {
					let sid = agentSessionId;
					if (!sid) {
						// Create new session
						const wd = settings.agentWorkingDir || "/";
						const res = await agentClient.newSession(wd);
						sid = res.sessionId;
						setAgentSessionId(sid);
					}

					// Append placeholder
					const assistantMsgId = generateMessageId();
					setMessages((prev) => [
						...prev,
						{
							id: assistantMsgId,
							role: "assistant",
							parts: [{ type: "text", text: "" }],
						},
					]);

					// Send message with context (mentions resolved)
					await agentClient.sendMessage(sid, finalMessage);

					// Response handling is via useEffect event listener
					// Clear last user message on successful completion
					setLastUserMessage(null);
				} catch (e: any) {
					console.error(e);
					const errorMsg: Message = {
						id: generateMessageId(),
						role: "assistant",
						parts: [{ type: "text", text: `Agent Error: ${e.message}` }],
					};
					setMessages((prev) => [...prev, errorMsg]);
				} finally {
					setIsLoading(false);
				}
				return;
			}
			// --- END ACP LOCAL HANDLING ---

			const aiService = new AIService(settings);

			try {
				const history = [...messages, userMsg];
				const lastMsgIndex = history.length - 1;

				// Build message history with context injected into the last user message
				const coreMessages = history.map((m, idx) => {
					let text = m.parts
						.map((p) => (p.type === "text" ? p.text : ""))
						.join("");
					// For the last message, use the finalMessage with resolved mentions
					if (idx === lastMsgIndex) {
						text = finalMessage;
					}
					return { role: m.role, content: text };
				});

				const result = await aiService.streamChat(coreMessages, selectedModel);

				// 3. Stream Response
				let fullResponse = "";
				const assistantMsgId = generateMessageId();
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
					id: generateMessageId(),
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
				setLastUserMessage(null);
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
				const assistantMsgId = generateMessageId();

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
				setLastUserMessage(null);
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
				const assistantMsgId = generateMessageId();

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
		// Calculate dropdown position relative to button
		if (newChatButtonRef.current) {
			const rect = newChatButtonRef.current.getBoundingClientRect();
			setDropdownPos({
				top: rect.bottom + 4,
				right: window.innerWidth - rect.right,
			});
		}
		// Toggle the new chat menu
		setShowNewChatMenu((prev) => !prev);
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

	/**
	 * Handle user response to a permission request.
	 * Calls the agent client to resolve the pending permission.
	 */
	const handlePermissionResponse = async (
		requestId: string,
		optionId: string,
	) => {
		if (!agentClient) {
			console.warn("[ChatPanel] No agent client for permission response");
			return;
		}

		try {
			await agentClient.respondToPermission(requestId, optionId);
			console.log("[ChatPanel] Permission response sent:", {
				requestId,
				optionId,
			});
		} catch (e) {
			console.error("[ChatPanel] Failed to respond to permission:", e);
		} finally {
			// Clear the permission request from UI
			setPermissionRequest(null);
		}
	};

	/**
	 * Handle stop generation request.
	 * Cancels the current agent operation and restores the last user message.
	 */
	const handleStopGeneration = useCallback(async () => {
		console.log("[ChatPanel] Cancelling current operation...");
		
		// Save last user message before cancel (to restore it)
		const savedMessage = lastUserMessage;
		
		if (agentClient && agentSessionId) {
			try {
				await agentClient.cancel(agentSessionId);
				console.log("[ChatPanel] Cancel request sent");
			} catch (e) {
				console.warn("[ChatPanel] Failed to cancel operation:", e);
			}
		}
		
		// Reset loading state
		setIsLoading(false);
		
		// Restore the last user message to input field
		if (savedMessage) {
			setInput(savedMessage);
			setLastUserMessage(null);
		}
	}, [agentClient, agentSessionId, lastUserMessage]);

	// Get only API models (not agents) for the model selector
	const getAvailableModels = () => {
		if (!settings) return [];
		const models = settings.chatModels || [];
		return models
			.filter((m: ChatModelConfig) => m.type === "api" && m.enabled)
			.map((m: ChatModelConfig) => ({
				id: m.id,
				name: m.name,
				provider: m.provider,
				type: "model" as const,
			}));
	};

	const availableModelsForInput = useMemo(
		() => getAvailableModels(),
		[settings?.chatModels],
	);

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

	const handleAutoMentionToggle = (disabled: boolean) => {
		setIsAutoMentionEnabled(!disabled);
	};

	return (
		<AcpContextProvider acpAdapter={agentClient as AcpAdapter | null}>
			<div className="eragear-container">
				{/* Chat Area - Header + Scrollable Messages */}
				<div className="eragear-chat-area">
					<div className="eragear-chat-header">
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
							}}
						>
							<span className="eragear-chat-title">
								{activeMode === "chat" ? "Chat" : "Playground"}
							</span>
							{settings && (
								<Badge
									variant={
										settings.provider === AIProviderType.ACP_LOCAL
											? agentError
												? "destructive"
												: isInitializing
													? "default"
													: agentClient
														? "secondary"
														: "default"
													: "default"
										}
								>
									{settings.provider === AIProviderType.ACP_LOCAL
										? agentError
											? "Agent Error"
											: isInitializing
												? "Connecting..."
												: agentClient
													? "Connected"
													: "Disconnected"
										: `Model: ${selectedModel || "Loading..."}`}
								</Badge>
							)}

							{/* Mode Selector for ACP - Shows current agent name and mode */}
							{chatContext.mode === "agent" && chatContext.agentName && (
								<span
									style={{
										fontSize: "0.75rem",
										color: "var(--text-muted)",
										marginLeft: "4px",
									}}
								>
									• {chatContext.agentName}
								</span>
							)}
						</div>

						{/* New Chat Button with Dropdown */}
						<DropdownMenu highlightItemOnHover={true}>
							<DropdownMenuTrigger title="New Chat" aria-label="Create new chat">
								<PlusIcon />
							</DropdownMenuTrigger>
							<DropdownMenuContent
								align="end"
								side="bottom"
								sideOffset={5}
								collisionPadding={8}
								className="new-chat-dropdown"
							>
								<DropdownMenuItem onClick={handleNewAPIChat}>
									New Chat (API Models)
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuGroup>
									<DropdownMenuLabel>External Agents</DropdownMenuLabel>
									{getAvailableAgents().map((agent) => (
										<DropdownMenuItem
											key={agent.id}
											onClick={() => handleNewAgentChat(agent)}
										>
											<span>🤖</span>
											<span>{agent.name}</span>
										</DropdownMenuItem>
									))}
									{getAvailableAgents().length === 0 && (
										<DropdownMenuItem disabled>
											No agents configured
										</DropdownMenuItem>
									)}
								</DropdownMenuGroup>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>

					{/* Scrollable Messages Area */}
					<div className="eragear-messages-wrapper">
						<MessageList
							app={app}
							messages={messages}
							isLoading={isLoading}
							onDelete={handleDelete}
							onRegenerate={handleRegenerate}
							onInsert={handleInsert}
						/>
					</div>
				</div>

				{/* Input Container - Sticky at bottom */}
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
						app={app}
						input={input}
						onInputChange={handleInputChange}
						onSend={() => handleSendMessage()}
						onModelChange={handleModelChange}
						onTriggerContext={handleTriggerContext}
						activeModelId={selectedModel}
						availableModels={availableModelsForInput}
						slashCommandsList={activeSlashCommands}
						onAutoMentionToggle={handleAutoMentionToggle}
						// Streaming/Stop props
						isSending={isLoading}
						onStopGeneration={handleStopGeneration}
						// Agent mode props - only show when in agent mode with active session
						agentModes={
							chatContext.mode === "agent" && agentSessionId ? modes : []
						}
						currentModeId={currentModeId}
						onModeChange={(modeId) => {
							if (agentSessionId) {
								setMode(modeId, agentSessionId);
							}
							setCurrentModeId(modeId);
						}}
						// Agent model props (experimental - only show when in ACP mode with active session)
						agentModels={
							chatContext.mode === "agent" && agentSessionId
								? agentModels
								: null
						}
						onAgentModelChange={(modelId) => {
							if (agentSessionId) {
								setAgentModel(modelId, agentSessionId);
							}
						}}
						// Agent plan props
						planEntries={planEntries}
						onDismissPlan={() => setPlanEntries([])}
					/>
				</div>

				{/* Permission Request Dialog - Modal overlay */}
				{permissionRequest && (
					<PermissionDialog
						request={permissionRequest}
						onRespond={(optionId) =>
							handlePermissionResponse(permissionRequest.requestId, optionId)
						}
						onDismiss={() =>
							handlePermissionResponse(permissionRequest.requestId, "cancelled")
						}
					/>
				)}
			</div>
		</AcpContextProvider>
	);
};
