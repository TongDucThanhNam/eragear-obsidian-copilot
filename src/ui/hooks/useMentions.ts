import { useState, useCallback } from "react";
import { type App, prepareFuzzySearch } from "obsidian";
import type { SuggestionItem } from "../views/ChatPanel/components/SuggestionPopover";
import { detectMention } from "../../shared/mention-utils";

interface UseMentionsProps {
	app: App;
}

export interface UseMentionsReturn {
	isOpen: boolean;
	suggestions: SuggestionItem[];
	selectedIndex: number;
	navigate: (direction: "up" | "down") => void;
	select: () => SuggestionItem | null;
	updateSuggestions: (input: string, cursorIndex: number) => void;
	close: () => void;
	triggerIndex: number | null; // Position where @ started
	/** Current query text (for debugging/display) */
	currentQuery: string;
}

/**
 * Hook for handling @ mention autocomplete in chat input.
 * Uses Obsidian's prepareFuzzySearch for better matching.
 *
 * Features:
 * - Detects @query or @[[query]] patterns
 * - Fuzzy search on file names, paths, and aliases
 * - Shows recent files when query is empty
 * - Keyboard navigation support
 */
export const useMentions = ({ app }: UseMentionsProps): UseMentionsReturn => {
	const [isOpen, setIsOpen] = useState(false);
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [triggerIndex, setTriggerIndex] = useState<number | null>(null);
	const [currentQuery, setCurrentQuery] = useState("");

	const close = useCallback(() => {
		setIsOpen(false);
		setSelectedIndex(0);
		setTriggerIndex(null);
		setCurrentQuery("");
	}, []);

	const updateSuggestions = useCallback(
		(input: string, cursorIndex: number) => {
			// Use the shared utility to detect mention context
			const mentionContext = detectMention(input, cursorIndex);

			if (!mentionContext) {
				close();
				return;
			}

			setTriggerIndex(mentionContext.start);
			setCurrentQuery(mentionContext.query);

			const query = mentionContext.query;
			const allFiles = app.vault.getMarkdownFiles();

			// If query is empty, show recent files
			if (!query.trim()) {
				const recentFiles = allFiles
					.slice()
					.sort((a, b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0))
					.slice(0, 10);

				const items: SuggestionItem[] = recentFiles.map((f) => ({
					type: "file" as const,
					label: f.basename,
					id: f.path,
					desc: f.path,
					data: f,
				}));

				setSuggestions(items);
				setIsOpen(true);
				setSelectedIndex(0);
				return;
			}

			// Use Obsidian's fuzzy search for better matching
			const fuzzySearch = prepareFuzzySearch(query.trim());

			// Score each file based on multiple fields
			const scored: Array<{ file: typeof allFiles[0]; score: number }> =
				allFiles.map((file) => {
					const basename = file.basename;
					const path = file.path;

					// Get aliases from frontmatter
					const fileCache = app.metadataCache.getFileCache(file);
					const aliases = fileCache?.frontmatter?.aliases as
						| string[]
						| string
						| undefined;
					const aliasArray: string[] = Array.isArray(aliases)
						? aliases
						: aliases
							? [aliases]
							: [];

					// Search in basename, path, and aliases
					const searchFields = [basename, path, ...aliasArray];
					let bestScore = -Infinity;

					for (const field of searchFields) {
						const match = fuzzySearch(field);
						if (match && match.score > bestScore) {
							bestScore = match.score;
						}
					}

					return { file, score: bestScore };
				});

			// Filter and sort by score
			const filtered = scored
				.filter((item) => item.score > -Infinity)
				.sort((a, b) => b.score - a.score)
				.slice(0, 15)
				.map((item) => item.file);

			if (filtered.length > 0) {
				const items: SuggestionItem[] = filtered.map((f) => ({
					type: "file" as const,
					label: f.basename,
					id: f.path,
					desc: f.path,
					data: f,
				}));
				setSuggestions(items);
				setIsOpen(true);
				setSelectedIndex(0);
			} else {
				close();
			}
		},
		[app.vault, app.metadataCache, close],
	);

	const navigate = useCallback(
		(direction: "up" | "down") => {
			if (!isOpen) return;
			setSelectedIndex((prev) => {
				if (direction === "up") {
					return prev > 0 ? prev - 1 : suggestions.length - 1;
				}
				return prev < suggestions.length - 1 ? prev + 1 : 0;
			});
		},
		[isOpen, suggestions.length],
	);

	const select = useCallback(() => {
		if (!isOpen || suggestions.length === 0) return null;
		return suggestions[selectedIndex] || null;
	}, [isOpen, suggestions, selectedIndex]);

	return {
		isOpen,
		suggestions,
		selectedIndex,
		navigate,
		select,
		updateSuggestions,
		close,
		triggerIndex,
		currentQuery,
	};
};
