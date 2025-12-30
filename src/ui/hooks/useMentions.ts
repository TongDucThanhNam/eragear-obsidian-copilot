import { useState, useCallback, useEffect } from "react";
import { type App, TFile } from "obsidian";
import type { SuggestionItem } from "../views/ChatPanel/components/SuggestionPopover";

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
}

export const useMentions = ({ app }: UseMentionsProps): UseMentionsReturn => {
	const [isOpen, setIsOpen] = useState(false);
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);
	const [triggerIndex, setTriggerIndex] = useState<number | null>(null);

	const close = useCallback(() => {
		setIsOpen(false);
		setSelectedIndex(0);
		setTriggerIndex(null);
	}, []);

	const updateSuggestions = useCallback(
		(input: string, cursorIndex: number) => {
			// Find the last @ before cursor
			const textBeforeCursor = input.slice(0, cursorIndex);
			const lastAtParams = textBeforeCursor.lastIndexOf("@");

			if (lastAtParams === -1) {
				close();
				return;
			}

			// Check if valid reference (start of line or preceded by space)
			// and no spaces after @ up to cursor (simple single-word or partial path matching)
			// But for Obsidian notes [[Note Name]], we might want to allow spaces if we were doing [[.
			// The user request says @[[tên_note]] or just @.
			// Let's assume standard @mention behavior: @query

			const charBefore =
				lastAtParams > 0 ? textBeforeCursor[lastAtParams - 1] : "";
			const isValidTrigger =
				lastAtParams === 0 || charBefore === " " || charBefore === "\n";

			if (!isValidTrigger) {
				close();
				return;
			}

			const query = textBeforeCursor.slice(lastAtParams + 1);
			// Optional: Stop if query has newlines
			if (query.includes("\n")) {
				close();
				return;
			}

			setTriggerIndex(lastAtParams);

			// Filter Logic
			const lowerQuery = query.toLowerCase();
			const allFiles = app.vault.getMarkdownFiles();

			// Simple fuzzy search by basename or path
			const filtered = allFiles
				.filter((f) => {
					// Check basename
					if (f.basename.toLowerCase().includes(lowerQuery)) return true;
					// Check path (for folder contexts)
					if (f.path.toLowerCase().includes(lowerQuery)) return true;
					// Check aliases (if implementation allows efficiently)
					const cache = app.metadataCache.getFileCache(f);
					if (cache?.frontmatter?.aliases) {
						const aliases = Array.isArray(cache.frontmatter.aliases)
							? cache.frontmatter.aliases
							: [cache.frontmatter.aliases];
						return aliases.some((a: string) =>
							a.toLowerCase().includes(lowerQuery),
						);
					}
					return false;
				})
				.slice(0, 15); // Limit results

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
				// If query is empty, show recent files or close?
				// User spec: "Hiển thị dropdown gợi ý khi gõ @"
				if (query === "") {
					// Show recent or top files
					const recent = allFiles.slice(0, 10).map((f) => ({
						type: "file" as const,
						label: f.basename,
						id: f.path,
						desc: f.path,
						data: f,
					}));
					setSuggestions(recent);
					setIsOpen(true);
				} else {
					close();
				}
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
	};
};
