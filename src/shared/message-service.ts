import type { App, TFile } from "obsidian";
import type { NoteMentionService } from "../core/mention-service";
import {
	MAX_NOTE_LENGTH,
	extractMentionedNotes,
} from "./mention-utils";

// ============================================================================
// Types
// ============================================================================

export interface PrepareMessageInput {
	/** The user's message text */
	message: string;
	/** Optional vault base path for absolute paths in context blocks */
	vaultBasePath?: string;
	/** Whether to convert paths to WSL format (Windows Subsystem for Linux) */
	convertToWsl?: boolean;
	/** The currently active/opened note (for auto-mention feature) */
	activeNote?: TFile | null;
	/** Whether to include the active note in context */
	includeActiveNote?: boolean;
	/** Selected text from active note, if any */
	selectedText?: string;
	/** Line range of selected text */
	selectionRange?: { fromLine: number; toLine: number };
}

export interface PrepareMessageResult {
	/** The message to send to the agent (with context blocks prepended) */
	agentMessage: string;
	/** The original user message (for display purposes) */
	userMessage: string;
	/** List of files that were mentioned and included */
	includedFiles: TFile[];
	/** Any errors encountered while reading files */
	errors: { file: string; error: string }[];
}

// ============================================================================
// Path Utilities
// ============================================================================

/**
 * Convert Windows path to WSL path format.
 * Example: C:\Users\name\vault -> /mnt/c/Users/name/vault
 *
 * @param windowsPath - Windows-style path
 * @returns WSL-compatible path
 */
export function convertWindowsPathToWsl(windowsPath: string): string {
	// Match drive letter pattern: C:\ or c:\
	const driveMatch = windowsPath.match(/^([a-zA-Z]):\\/);
	if (!driveMatch) {
		// Not a Windows path, return as-is
		return windowsPath;
	}

	const driveLetter = driveMatch[1]?.toLowerCase() ?? "c";
	const restOfPath = windowsPath.slice(3).replace(/\\/g, "/");
	return `/mnt/${driveLetter}/${restOfPath}`;
}

// ============================================================================
// Context Block Builders
// ============================================================================

/**
 * Build context block for a mentioned note.
 * Wraps content in XML tags for agent parsing.
 *
 * @param content - The note content
 * @param filePath - Path to the note
 * @param absolutePath - Absolute path for the ref attribute
 * @returns Formatted context block string
 */
function buildMentionedNoteBlock(
	content: string,
	_filePath: string,
	absolutePath: string,
): string {
	let processedContent = content;
	let truncationNote = "";

	if (content.length > MAX_NOTE_LENGTH) {
		processedContent = content.substring(0, MAX_NOTE_LENGTH);
		truncationNote = `\n\n[Note: This note was truncated. Original length: ${content.length} characters, showing first ${MAX_NOTE_LENGTH} characters]`;
	}

	return `<obsidian_mentioned_note ref="${absolutePath}">
${processedContent}${truncationNote}
</obsidian_mentioned_note>`;
}

/**
 * Build context block for the currently opened/active note.
 * Uses different XML tag to distinguish from explicit mentions.
 *
 * @param filePath - Path to the active note
 * @param absolutePath - Absolute path for display
 * @param selectedText - Optional selected text
 * @param selectionRange - Optional line range of selection
 * @returns Formatted context block string
 */
function buildActiveNoteBlock(
	absolutePath: string,
	selectedText?: string,
	selectionRange?: { fromLine: number; toLine: number },
): string {
	if (selectedText && selectionRange) {
		let processedText = selectedText;
		let truncationNote = "";

		if (selectedText.length > MAX_NOTE_LENGTH) {
			processedText = selectedText.substring(0, MAX_NOTE_LENGTH);
			truncationNote = `\n\n[Note: Selection was truncated. Original length: ${selectedText.length} characters]`;
		}

		return `<obsidian_opened_note selection="lines ${selectionRange.fromLine}-${selectionRange.toLine}">
The user opened the note ${absolutePath} in Obsidian and selected the following text (lines ${selectionRange.fromLine}-${selectionRange.toLine}):

${processedText}${truncationNote}

This is what the user is currently focusing on.
</obsidian_opened_note>`;
	}

	return `<obsidian_opened_note>The user opened the note ${absolutePath} in Obsidian. This may or may not be related to the current conversation. If it seems relevant, consider using the Read tool to examine the content.</obsidian_opened_note>`;
}

// ============================================================================
// Main Message Preparation
// ============================================================================

/**
 * Prepare a message for sending to an AI agent or API.
 * Reads mentioned notes and builds context blocks to prepend.
 *
 * @param input - The input parameters
 * @param app - Obsidian App instance for vault access
 * @param mentionService - NoteMentionService for file resolution
 * @returns Promise with the prepared message result
 */
export async function prepareMessage(
	input: PrepareMessageInput,
	app: App,
	mentionService: NoteMentionService,
): Promise<PrepareMessageResult> {
	const contextBlocks: string[] = [];
	const includedFiles: TFile[] = [];
	const errors: { file: string; error: string }[] = [];

	console.log("[MessageService] prepareMessage called with:", input.message);

	// Step 1: Extract all mentioned notes from the message
	const mentionedNotes = extractMentionedNotes(input.message, mentionService);
	console.log("[MessageService] Mentioned notes found:", mentionedNotes.length);

	// Step 2: Build context blocks for each mentioned note
	for (const mention of mentionedNotes) {
		console.log("[MessageService] Processing mention:", mention.noteTitle, "file:", mention.file?.path);
		
		if (!mention.file) {
			errors.push({
				file: mention.noteTitle,
				error: `Note not found: ${mention.noteTitle}`,
			});
			continue;
		}

		try {
			const content = await app.vault.cachedRead(mention.file);
			console.log("[MessageService] Read content length:", content.length);

			let absolutePath = input.vaultBasePath
				? `${input.vaultBasePath}/${mention.file.path}`
				: mention.file.path;

			if (input.convertToWsl) {
				absolutePath = convertWindowsPathToWsl(absolutePath);
			}

			const contextBlock = buildMentionedNoteBlock(
				content,
				mention.file.path,
				absolutePath,
			);
			contextBlocks.push(contextBlock);
			includedFiles.push(mention.file);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			console.error(`Failed to read note ${mention.file.path}:`, error);
			errors.push({
				file: mention.file.path,
				error: errorMessage,
			});
		}
	}

	// Step 3: Add active note context if requested
	if (input.includeActiveNote && input.activeNote) {
		// Check if active note is not already mentioned
		const alreadyMentioned = includedFiles.some(
			(f) => f.path === input.activeNote?.path,
		);

		if (!alreadyMentioned) {
			let absolutePath = input.vaultBasePath
				? `${input.vaultBasePath}/${input.activeNote.path}`
				: input.activeNote.path;

			if (input.convertToWsl) {
				absolutePath = convertWindowsPathToWsl(absolutePath);
			}

			const activeNoteBlock = buildActiveNoteBlock(
				absolutePath,
				input.selectedText,
				input.selectionRange,
			);
			contextBlocks.push(activeNoteBlock);
		}
	}

	// Step 4: Combine context blocks with user message
	const agentMessage =
		contextBlocks.length > 0
			? contextBlocks.join("\n\n") + "\n\n" + input.message
			: input.message;

	console.log("[MessageService] Final result:", {
		contextBlocksCount: contextBlocks.length,
		includedFilesCount: includedFiles.length,
		errorsCount: errors.length,
		agentMessagePreview: agentMessage.substring(0, 500),
	});

	return {
		agentMessage,
		userMessage: input.message,
		includedFiles,
		errors,
	};
}

/**
 * Prepare message specifically for API-based AI services.
 * Similar to prepareMessage but returns format suitable for chat APIs.
 *
 * @param input - The input parameters
 * @param app - Obsidian App instance
 * @param mentionService - NoteMentionService for file resolution
 * @returns Promise with prepared message and context
 */
export async function prepareMessageForAPI(
	input: PrepareMessageInput,
	app: App,
	mentionService: NoteMentionService,
): Promise<{
	messageWithContext: string;
	contextSummary: string;
	errors: { file: string; error: string }[];
}> {
	const result = await prepareMessage(input, app, mentionService);

	// Create a summary for display purposes
	const contextSummary =
		result.includedFiles.length > 0
			? `Context from: ${result.includedFiles.map((f) => f.basename).join(", ")}`
			: "";

	return {
		messageWithContext: result.agentMessage,
		contextSummary,
		errors: result.errors,
	};
}
