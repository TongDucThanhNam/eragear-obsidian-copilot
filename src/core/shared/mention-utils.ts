import type { TFile } from "obsidian";
import type { NoteMentionService } from "../mention-service";

// ============================================================================
// Types
// ============================================================================

export interface MentionContext {
	/** Start index of the @ symbol in the text */
	start: number;
	/** End index of the mention (after ]] or end of word) */
	end: number;
	/** The query text after @ (without brackets) */
	query: string;
	/** Whether the mention uses bracket format @[[...]] */
	hasBrackets: boolean;
}

export interface ExtractedMention {
	/** The note title from the mention */
	noteTitle: string;
	/** The resolved file, if found */
	file: TFile | undefined;
	/** The full matched text including @[[...]] */
	fullMatch: string;
}

// ============================================================================
// Constants
// ============================================================================

/** Maximum note content length to include in context blocks */
export const MAX_NOTE_LENGTH = 10000;

// ============================================================================
// Mention Detection
// ============================================================================

/**
 * Detect if cursor is currently within a mention context.
 * Used for showing autocomplete dropdown.
 *
 * @param text - The full input text
 * @param cursorPosition - Current cursor position (0-indexed)
 * @returns MentionContext if in a mention, null otherwise
 */
export function detectMention(
	text: string,
	cursorPosition: number,
): MentionContext | null {
	if (cursorPosition < 0 || cursorPosition > text.length) {
		return null;
	}

	// Get text up to cursor position
	const textUpToCursor = text.slice(0, cursorPosition);

	// Find the last @ symbol
	const atIndex = textUpToCursor.lastIndexOf("@");
	if (atIndex === -1) {
		return null;
	}

	// Check if @ is valid trigger (start of line, after space, or after newline)
	if (atIndex > 0) {
		const charBefore = textUpToCursor[atIndex - 1];
		if (charBefore !== " " && charBefore !== "\n" && charBefore !== "\t") {
			return null;
		}
	}

	// Get the token after @
	const afterAt = textUpToCursor.slice(atIndex + 1);

	let query = "";
	let endPos = cursorPosition;
	let hasBrackets = false;

	// If already in @[[...]] format, handle it (allow spaces inside brackets)
	if (afterAt.startsWith("[[")) {
		hasBrackets = true;
		const closingBrackets = afterAt.indexOf("]]");

		if (closingBrackets === -1) {
			// Still typing inside brackets
			query = afterAt.slice(2); // Remove opening [[
			endPos = cursorPosition;
		} else {
			// Found closing brackets - check if cursor is after them
			const closingBracketsPos = atIndex + 1 + closingBrackets + 2; // +2 for ]]
			if (cursorPosition > closingBracketsPos) {
				// Cursor is after ]], no longer a mention
				return null;
			}
			// Complete bracket format
			query = afterAt.slice(2, closingBrackets); // Between [[ and ]]
			endPos = closingBracketsPos;
		}
	} else {
		// Simple @query format - use everything after @
		// But end at whitespace (space, tab, newline)
		if (
			afterAt.includes(" ") ||
			afterAt.includes("\t") ||
			afterAt.includes("\n")
		) {
			// Mention ended by whitespace
			return null;
		}
		query = afterAt;
		endPos = cursorPosition;
	}

	return {
		start: atIndex,
		end: endPos,
		query: query,
		hasBrackets: hasBrackets,
	};
}

/**
 * Extract all mentioned notes from a message text.
 * Looks for pattern @[[note title]]
 *
 * @param text - The message text
 * @param mentionService - NoteMentionService for file resolution
 * @returns Array of extracted mentions with resolved files
 */
export function extractMentionedNotes(
	text: string,
	mentionService: NoteMentionService,
): ExtractedMention[] {
	const mentionRegex = /@\[\[([^\]]+)\]\]/g;
	const matches = Array.from(text.matchAll(mentionRegex));
	const result: ExtractedMention[] = [];
	const seen = new Set<string>(); // Avoid duplicates

	console.log("[MentionUtils] Extracting mentions from:", text);
	console.log("[MentionUtils] Found matches:", matches.length);

	for (const match of matches) {
		const noteTitle = match[1];
		const fullMatch = match[0];

		// Skip if noteTitle is undefined or already seen
		if (!noteTitle || seen.has(noteTitle)) {
			continue;
		}
		seen.add(noteTitle);

		console.log("[MentionUtils] Looking for note:", noteTitle);

		// Find the file using NoteMentionService
		// Strategy 1: Exact basename match
		let file = mentionService.getFileByBasename(noteTitle);
		
		// Strategy 2: Path match
		if (!file) {
			file = mentionService.getFileByPath(noteTitle);
		}
		
		// Strategy 3: Path with .md extension
		if (!file) {
			file = mentionService.getFileByPath(`${noteTitle}.md`);
		}
		
		// Strategy 4: Search for partial match
		if (!file) {
			const allFiles = mentionService.getAllFiles();
			// Path ends with the note title
			file = allFiles.find(
				(f: TFile) =>
					f.path.endsWith(`/${noteTitle}.md`) ||
					f.path.endsWith(`/${noteTitle}`),
			) || null;
		}
		
		// Strategy 5: Basename contains (for partial matches)
		if (!file) {
			const allFiles = mentionService.getAllFiles();
			file = allFiles.find((f: TFile) =>
				f.basename.toLowerCase().includes(noteTitle.toLowerCase()),
			) || null;
		}

		console.log("[MentionUtils] Found file:", file?.path || "NOT FOUND");

		result.push({ noteTitle, file: file || undefined, fullMatch });
	}

	console.log("[MentionUtils] Extracted mentions:", result);
	return result;
}

/**
 * Remove mention syntax from message text.
 * Converts @[[Note Title]] to just "Note Title" for cleaner display.
 *
 * @param text - The original message text
 * @returns Text with mention syntax removed
 */
export function cleanMentionSyntax(text: string): string {
	return text.replace(/@\[\[([^\]]+)\]\]/g, "[[$1]]");
}

/**
 * Check if a message contains any mentions.
 *
 * @param text - The message text
 * @returns True if message contains @[[...]] mentions
 */
export function hasMentions(text: string): boolean {
	return /@\[\[[^\]]+\]\]/.test(text);
}
