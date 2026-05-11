/**
 * Session Manager
 *
 * Manages session persistence by saving/loading sessions as markdown files
 * in a designated folder in Obsidian vault.
 *
 * Sessions are stored as markdown files with YAML frontmatter containing metadata.
 */

import type { App, TFile } from "obsidian";
import type {
	ActiveSession,
	SessionData,
	SessionMessage,
	SessionMetadata,
	SessionToolCall,
	SessionToolCallContent,
} from "../models/session-persistence";
import type { SessionUpdate } from "../models/session-update";

export class SessionManager {
	private static readonly SESSION_FOLDER = "eragear-sessions";
	private static readonly SESSION_PREFIX = "session-";

	constructor(private app: App) {}

	/**
	 * Initialize session folder
	 */
	async initialize(): Promise<void> {
		const folder = this.app.vault.getAbstractFileByPath(
			SessionManager.SESSION_FOLDER,
		);
		if (!folder) {
			await this.app.vault.createFolder(SessionManager.SESSION_FOLDER);
			console.log("[SessionManager] Created session folder");
		}
	}

	/**
	 * Generate unique session ID
	 */
	generateSessionId(): string {
		return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
	}

	/**
	 * Get session file path
	 */
	private getSessionFilePath(sessionId: string): string {
		return `${SessionManager.SESSION_FOLDER}/${SessionManager.SESSION_PREFIX}${sessionId}.md`;
	}

	/**
	 * Save a complete session to markdown file
	 */
	async saveSession(activeSession: ActiveSession): Promise<void> {
		await this.initialize();

		const sessionData: SessionData = {
			metadata: {
				id: activeSession.id,
				createdAt: activeSession.createdAt.toISOString(),
				updatedAt: activeSession.updatedAt.toISOString(),
				title: activeSession.title,
				workingDirectory: activeSession.workingDirectory,
				agentId: activeSession.agentId,
				currentModeId: activeSession.currentModeId,
				modelId: activeSession.modelId,
				tags: activeSession.tags,
			},
			messages: this.updatesToMessages(activeSession.updates, activeSession.id),
		};

		const markdown = this.sessionDataToMarkdown(sessionData);
		const filePath = this.getSessionFilePath(sessionData.metadata.id);

		const existingFile = this.app.vault.getFileByPath(filePath) as TFile | null;

		if (existingFile) {
			await this.app.vault.modify(existingFile, markdown);
		} else {
			await this.app.vault.create(filePath, markdown);
		}

		console.log(`[SessionManager] Saved session: ${sessionData.metadata.id}`);
	}

	/**
	 * Load a session from markdown file
	 */
	async loadSession(sessionId: string): Promise<SessionData | null> {
		const filePath = this.getSessionFilePath(sessionId);
		const file = this.app.vault.getFileByPath(filePath) as TFile | null;

		if (!file) {
			console.warn(`[SessionManager] Session file not found: ${filePath}`);
			return null;
		}

		try {
			const content = await this.app.vault.cachedRead(file);
			return this.markdownToSessionData(content);
		} catch (error) {
			console.error(
				`[SessionManager] Failed to load session: ${sessionId}`,
				error,
			);
			return null;
		}
	}

	/**
	 * Delete a session file
	 */
	async deleteSession(sessionId: string): Promise<void> {
		const filePath = this.getSessionFilePath(sessionId);
		const file = this.app.vault.getFileByPath(filePath) as TFile | null;

		if (file) {
			await this.app.vault.delete(file);
			console.log(`[SessionManager] Deleted session: ${sessionId}`);
		}
	}

	/**
	 * List all saved sessions
	 */
	async listSessions(): Promise<SessionSummary[]> {
		await this.initialize();

		const folder = this.app.vault.getFolderByPath(
			SessionManager.SESSION_FOLDER,
		);
		if (!folder) {
			return [];
		}

		const summaries: SessionSummary[] = [];

		for (const file of Object.values(folder.children)) {
			if ("basename" in file && "extension" in file) {
				const tFile = file as TFile;
				try {
					const sessionData = await this.loadSessionFromTFile(tFile);
					if (sessionData) {
						summaries.push({
							id: sessionData.metadata.id,
							title: sessionData.metadata.title,
							createdAt: sessionData.metadata.createdAt,
							updatedAt: sessionData.metadata.updatedAt,
							workingDirectory: sessionData.metadata.workingDirectory,
							messageCount: sessionData.messages.length,
							tags: sessionData.metadata.tags,
						});
					}
				} catch (error) {
					console.error(
						`[SessionManager] Failed to load session ${tFile.path}:`,
						error,
					);
				}
			}
		}

		// Sort by updatedAt descending (newest first)
		return summaries.sort(
			(a, b) =>
				new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
		);
	}

	/**
	 * Convert session updates to messages for persistence
	 */
	private updatesToMessages(
		updates: SessionUpdate[],
		sessionId: string,
	): SessionMessage[] {
		const messages: SessionMessage[] = [];
		let currentMessage: Partial<SessionMessage> | null = null;

		for (const update of updates) {
			switch (update.type) {
				case "user_message_chunk": {
					if (!currentMessage || currentMessage.role !== "user") {
						if (currentMessage) {
							messages.push(currentMessage as SessionMessage);
						}
						currentMessage = {
							id: `msg_${messages.length}_${Date.now()}`,
							timestamp: new Date().toISOString(),
							role: "user" as const,
							content: update.text,
							contentType: "text" as const,
						};
					} else if (currentMessage) {
						currentMessage.content += update.text;
					}
					break;
				}
				case "agent_message_chunk": {
					if (!currentMessage || currentMessage.role !== "assistant") {
						if (currentMessage) {
							messages.push(currentMessage as SessionMessage);
						}
						currentMessage = {
							id: `msg_${messages.length}_${Date.now()}`,
							timestamp: new Date().toISOString(),
							role: "assistant" as const,
							content: update.text,
							contentType: "text" as const,
						};
					} else if (currentMessage) {
						currentMessage.content += update.text;
					}
					break;
				}
				case "tool_call": {
					if (currentMessage) {
						currentMessage.toolCalls = currentMessage.toolCalls || [];
						if (update.content) {
							const contentArray = this.serializeToolCallContent(
								update.content,
							);
							if (contentArray) {
								currentMessage.toolCalls.push({
									id: update.toolCallId,
									title: update.title,
									name: update.name,
									kind: update.kind,
									status: update.status,
									content: contentArray,
									rawInput: update.rawInput,
									rawOutput: update.rawOutput,
								});
							}
						}
					}
					break;
				}
				case "tool_call_update": {
					if (currentMessage?.toolCalls) {
						const existingCall = currentMessage.toolCalls.find(
							(tc) => tc.id === update.toolCallId,
						);
						if (existingCall && update.content) {
							existingCall.status = update.status;
							const contentArray = this.serializeToolCallContent(
								update.content,
							);
							if (contentArray) {
								existingCall.content = contentArray;
							}
							existingCall.rawOutput = update.rawOutput;
						}
					}
					break;
				}
			}
		}

		// Add last message if exists
		if (currentMessage) {
			messages.push(currentMessage as SessionMessage);
		}

		return messages;
	}

	/**
	 * Serialize ToolCallContent to persistence format
	 */
	private serializeToolCallContent(
		content:
			| Array<{
					type: string;
					text?: string;
					path?: string;
					oldText?: string;
					newText?: string;
					terminalId?: string;
					name?: string;
					arguments?: unknown;
					mimeType?: string;
					data?: string;
			  }>
			| undefined,
	): SessionToolCallContent[] | undefined {
		if (!content) return undefined;

		const result: SessionToolCallContent[] = [];
		for (const item of content) {
			result.push({
				type: item.type as
					| "text"
					| "diff"
					| "terminal"
					| "call"
					| "image"
					| "audio",
				text: item.text,
				path: item.path,
				oldText: item.oldText,
				newText: item.newText,
				terminalId: item.terminalId,
				name: item.name,
				arguments: item.arguments,
				mimeType: item.mimeType,
				data: item.data,
			});
		}
		return result.length > 0 ? result : undefined;
	}

	/**
	 * Convert session data to markdown format
	 */
	private sessionDataToMarkdown(sessionData: SessionData): string {
		const { metadata, messages } = sessionData;

		// YAML frontmatter
		const frontmatter = this.metadataToYaml(metadata);

		// Messages section
		let markdown = `${frontmatter}\n\n`;

		for (const message of messages) {
			markdown += this.messageToMarkdown(message);
			markdown += "\n\n";
		}

		return markdown;
	}

	/**
	 * Convert metadata to YAML frontmatter
	 */
	private metadataToYaml(metadata: SessionMetadata): string {
		const lines: string[] = ["---"];

		lines.push(`id: ${metadata.id}`);
		lines.push(`createdAt: ${metadata.createdAt}`);
		lines.push(`updatedAt: ${metadata.updatedAt}`);
		lines.push(`title: ${this.escapeYaml(metadata.title)}`);
		lines.push(
			`workingDirectory: ${this.escapeYaml(metadata.workingDirectory)}`,
		);
		lines.push(`agentId: ${this.escapeYaml(metadata.agentId)}`);

		if (metadata.currentModeId) {
			lines.push(`currentModeId: ${metadata.currentModeId}`);
		}
		if (metadata.modelId) {
			lines.push(`modelId: ${metadata.modelId}`);
		}
		if (metadata.tags && metadata.tags.length > 0) {
			lines.push(
				`tags:\n${metadata.tags.map((tag: string) => `  - ${tag}`).join("\n")}`,
			);
		}

		lines.push("---");

		return lines.join("\n");
	}

	/**
	 * Convert message to markdown
	 */
	private messageToMarkdown(message: SessionMessage): string {
		const header = `### ${message.role.toUpperCase()} - ${new Date(message.timestamp).toLocaleString()}`;

		let content = "";

		if (message.contentType === "image" && message.data) {
			content = `![Image](${message.mimeType || "image/png"}:data:image/${message.mimeType || "png"};base64,${message.data})\n\n${message.content}`;
		} else if (message.contentType === "audio" && message.data) {
			content = `[Audio attachment (${message.mimeType || "audio/wav"})]\n\n${message.content}`;
		} else if (message.contentType === "diff" && message.path) {
			content = `**Modified:** ${message.path}\n\n\`\`\`diff\n${message.content}\n\`\`\``;
		} else {
			// Text content
			content = message.content;
		}

		// Tool calls
		if (message.toolCalls && message.toolCalls.length > 0) {
			content += "\n\n**Tool Calls:**\n\n";
			for (const toolCall of message.toolCalls) {
				content += `- **${toolCall.name || toolCall.title || "Unknown"}** (${toolCall.status})\n`;
				if (toolCall.kind) {
					content += `  - Kind: ${toolCall.kind}\n`;
				}
				if (toolCall.rawInput) {
					content += `  - Input: \`${JSON.stringify(toolCall.rawInput)}\`\n`;
				}
			}
		}

		return `${header}\n\n${content}`;
	}

	/**
	 * Escape YAML values properly
	 */
	private escapeYaml(value: string): string {
		// Simple escaping - wrap in quotes if contains special chars
		if (
			value.includes(":") ||
			value.includes("#") ||
			value.includes("\n") ||
			value.includes('"')
		) {
			return `"${value.replace(/"/g, '\\"')}"`;
		}
		return value;
	}

	/**
	 * Load session data from a TFile
	 */
	private async loadSessionFromTFile(file: TFile): Promise<SessionData | null> {
		try {
			const content = await this.app.vault.cachedRead(file);
			return this.markdownToSessionData(content);
		} catch (error) {
			console.error(
				`[SessionManager] Failed to load session ${file.path}:`,
				error,
			);
			return null;
		}
	}

	/**
	 * Parse markdown to session data
	 */
	private markdownToSessionData(markdown: string): SessionData | null {
		try {
			// Extract frontmatter
			const frontmatterMatch = markdown.match(/^---\n([\s\S]*?)\n---/);
			if (!frontmatterMatch) {
				console.warn("[SessionManager] No frontmatter found");
				return null;
			}

			const frontmatterYaml = frontmatterMatch[1];
			const content = markdown.slice(frontmatterMatch[0].length).trim();

			// Parse metadata (simple YAML parser for our needs)
			const metadata = this.parseYamlMetadata(frontmatterYaml);
			if (!metadata) {
				return null;
			}

			// Parse messages
			const messages = this.parseMessages(content);

			return {
				metadata,
				messages,
			};
		} catch (error) {
			console.error("[SessionManager] Failed to parse markdown:", error);
			return null;
		}
	}

	/**
	 * Parse YAML frontmatter to metadata
	 */
	private parseYamlMetadata(yaml: string): SessionMetadata | null {
		try {
			const metadata: Partial<SessionMetadata> = {};

			const lines = yaml.split("\n");

			for (const line of lines) {
				const trimmed = line.trim();
				if (!trimmed || trimmed.startsWith("#")) continue;

				const [key, ...valueParts] = trimmed.split(":");
				if (!key || valueParts.length === 0) continue;

				const value = valueParts.join(":").trim();

				switch (key.trim()) {
					case "id":
						metadata.id = value;
						break;
					case "createdAt":
						metadata.createdAt = value;
						break;
					case "updatedAt":
						metadata.updatedAt = value;
						break;
					case "title":
						metadata.title = this.unescapeYaml(value);
						break;
					case "workingDirectory":
						metadata.workingDirectory = this.unescapeYaml(value);
						break;
					case "agentId":
						metadata.agentId = value;
						break;
					case "currentModeId":
						metadata.currentModeId = value;
						break;
					case "modelId":
						metadata.modelId = value;
						break;
					case "tags": {
						// Parse YAML array
						const tags: string[] = [];
						let inArray = false;
						for (const tagLine of lines) {
							if (tagLine.trim().startsWith("-")) {
								tags.push(tagLine.split("-")[1].trim());
								inArray = true;
							} else if (inArray) {
								break;
							}
						}
						metadata.tags = tags;
						break;
					}
				}
			}

			if (
				!metadata.id ||
				!metadata.createdAt ||
				!metadata.updatedAt ||
				!metadata.title ||
				!metadata.workingDirectory ||
				!metadata.agentId
			) {
				console.warn("[SessionManager] Incomplete metadata", metadata);
				return null;
			}

			return metadata as SessionMetadata;
		} catch (error) {
			console.error("[SessionManager] Failed to parse metadata:", error);
			return null;
		}
	}

	/**
	 * Unescape YAML value
	 */
	private unescapeYaml(value: string): string {
		if (value.startsWith('"') && value.endsWith('"')) {
			return value.slice(1, -1).replace(/\\"/g, '"').replace(/\\n/g, "\n");
		}
		return value;
	}

	/**
	 * Parse messages from markdown content
	 */
	private parseMessages(content: string): SessionMessage[] {
		const messages: SessionMessage[] = [];

		// Split by message headers (### ROLE - timestamp)
		const sections = content.split(/\n###\s+/);

		for (const section of sections) {
			const trimmed = section.trim();
			if (!trimmed) continue;

			// Parse header
			const headerMatch = trimmed.match(/^([A-Z]+)\s*-\s*(.+)$/);
			if (!headerMatch) continue;

			const role = headerMatch[1].toLowerCase() as
				| "user"
				| "assistant"
				| "system";
			const timestampStr = headerMatch[2].trim();

			// Try to parse timestamp
			let timestamp = new Date().toISOString();
			try {
				const parsedDate = new Date(timestampStr);
				if (!isNaN(parsedDate.getTime())) {
					timestamp = parsedDate.toISOString();
				}
			} catch {
				// Use current time
			}

			// Parse content (everything after header until next section)
			const messageContent = trimmed.replace(/^[A-Z]+\s*-\s*.+$/, "").trim();

			// Detect content type
			let contentType: "text" | "image" | "audio" | "diff" = "text";
			const actualContent = messageContent;

			// Check for image
			if (messageContent.includes("![Image](")) {
				contentType = "image";
			}
			// Check for audio
			else if (messageContent.includes("[Audio attachment")) {
				contentType = "audio";
			}
			// Check for diff
			else if (
				messageContent.includes("```diff") ||
				messageContent.includes("**Modified:**")
			) {
				contentType = "diff";
			}

			// Parse tool calls
			const toolCalls: SessionToolCall[] = [];
			const toolCallMatch = messageContent.match(
				/\*\*Tool Calls:\*\*\s*\n([\s\S]*?)/,
			);
			if (toolCallMatch && toolCallMatch[1]) {
				const toolCallsText = toolCallMatch[1];
				const toolCallLines = toolCallsText
					.split("\n")
					.filter((l: string) => l.trim().startsWith("-"));

				let currentToolCall: Partial<SessionToolCall> | null = null;

				for (const line of toolCallLines) {
					const trimmedLine = line.trim();

					// Tool call header
					const toolHeaderMatch = trimmedLine.match(
						/^-\s*\*\*(.+?)\*\*\s*\((.+?)\)$/,
					);
					if (toolHeaderMatch) {
						if (currentToolCall) {
							toolCalls.push(currentToolCall as SessionToolCall);
						}
						currentToolCall = {
							id: `tool_${toolCalls.length}`,
							name: toolHeaderMatch[1].trim(),
							status: toolHeaderMatch[2].trim() as
								| "pending"
								| "running"
								| "complete"
								| "failed",
						};
					}
					// Tool call properties
					else if (currentToolCall && trimmedLine.startsWith("  -")) {
						const [key, ...valueParts] = trimmedLine.slice(2).split(":");
						if (!key || valueParts.length === 0) continue;

						const value = valueParts.join(":").trim();

						switch (key.trim()) {
							case "Kind":
								currentToolCall.kind = value;
								break;
							case "Input": {
								// Parse JSON from backticks
								const jsonMatch = value.match(/`([^`]+)`/);
								if (jsonMatch && jsonMatch[1]) {
									try {
										currentToolCall.rawInput = JSON.parse(jsonMatch[1]);
									} catch {
										// Invalid JSON, keep as string
										currentToolCall.rawInput = jsonMatch[1];
									}
								}
								break;
							}
						}
					}
				}

				if (currentToolCall) {
					toolCalls.push(currentToolCall as SessionToolCall);
				}
			}

			messages.push({
				id: `msg_${messages.length}_${Date.now()}`,
				timestamp,
				role,
				content: actualContent,
				contentType,
				toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
			});
		}

		return messages;
	}

	/**
	 * Rebuild session updates from saved messages
	 * This is used when loading a session to replay conversation
	 */
	messagesToUpdates(messages: SessionMessage[]): SessionUpdate[] {
		const updates: SessionUpdate[] = [];

		for (const message of messages) {
			// Add message chunk
			if (message.role === "user") {
				updates.push({
					type: "user_message_chunk",
					text: message.content,
				});
			} else if (message.role === "assistant") {
				updates.push({
					type: "agent_message_chunk",
					text: message.content,
				});
			}

			// Add tool calls
			if (message.toolCalls) {
				for (const toolCall of message.toolCalls) {
					if (toolCall.content) {
						updates.push({
							type: "tool_call",
							toolCallId: toolCall.id,
							title: toolCall.title,
							name: toolCall.name,
							kind: toolCall.kind,
							status: toolCall.status,
							content: this.deserializeToolCallContent(toolCall.content),
							rawInput: toolCall.rawInput,
							rawOutput: toolCall.rawOutput,
						});
					}
				}
			}
		}

		return updates;
	}

	/**
	 * Deserialize tool call content from persistence format
	 */
	private deserializeToolCallContent(content: SessionToolCallContent[]): Array<{
		type: string;
		text?: string;
		path?: string;
		oldText?: string;
		newText?: string;
		terminalId?: string;
		name?: string;
		arguments?: unknown;
		mimeType?: string;
		data?: string;
	}> {
		return content.map((item) => ({
			type: item.type,
			text: item.text,
			path: item.path,
			oldText: item.oldText,
			newText: item.newText,
			terminalId: item.terminalId,
			name: item.name,
			arguments: item.arguments,
			mimeType: item.mimeType,
			data: item.data,
		}));
	}
}

/**
 * Factory function to create SessionManager
 */
export function createSessionManager(app: App): SessionManager {
	return new SessionManager(app);
}
