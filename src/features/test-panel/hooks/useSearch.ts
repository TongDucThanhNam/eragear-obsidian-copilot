/**
 * useSearch Hook
 * Manages search functionality across different search types
 */

import { Notice } from "obsidian";
import { useState } from "react";
import type { SearchResult as VaultSearchResult } from "@/infra/obsidian/vault-handler";
import { VaultHandler } from "@/infra/obsidian/vault-handler";

interface UseSearchOptions {
	app: any;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export function useSearch({ app, onAddOutput }: UseSearchOptions) {
	const vaultHandler = new VaultHandler(app);
	const [searchResults, setSearchResults] = useState<VaultSearchResult[]>([]);
	const [isSearching, setIsSearching] = useState(false);

	const handleQuickSearch = (query: string) => {
		if (!query.trim()) return;
		setIsSearching(true);
		try {
			const results = vaultHandler.searchNotes(query, 10);
			const searchResultsData = vaultHandler.searchNotesEnhanced(query, 10);
			setSearchResults(searchResultsData);
			const formatted = results
				.map((f) => `📄 ${f.basename}\n   Path: ${f.path}`)
				.join("\n\n");
			onAddOutput(
				`✓ Search for "${query}"`,
				`Found ${results.length} files:\n\n${formatted}`,
				"success",
			);
			new Notice(`Found ${results.length} results`, 2000);
		} catch (error) {
			onAddOutput("✗ Search", `Error: ${error}`, "error");
			new Notice(`Search failed: ${error}`, 2000);
		} finally {
			setIsSearching(false);
		}
	};

	const handleEnhancedSearch = (query: string) => {
		if (!query.trim()) {
			onAddOutput(
				"✗ searchNotesEnhanced()",
				"Please enter a search query",
				"info",
			);
			return;
		}
		try {
			const results = vaultHandler.searchNotesEnhanced(query, 10);
			const formatted = results
				.map((r) => `📄 ${r.baseName}\n   Score: ${r.score.toFixed(2)}`)
				.join("\n\n");
			onAddOutput(
				`✓ searchNotesEnhanced("${query}")`,
				`Found ${results.length} results:\n\n${formatted}`,
				"success",
			);
			new Notice(`Found ${results.length} enhanced results`, 2000);
		} catch (error) {
			onAddOutput("✗ searchNotesEnhanced()", `Error: ${error}`, "error");
			new Notice(`Search failed: ${error}`, 2000);
		}
	};

	const handleFuzzySearch = (query: string) => {
		if (!query.trim()) {
			onAddOutput(
				"✗ fuzzySearchFiles()",
				"Please enter a search query",
				"info",
			);
			return;
		}
		try {
			const results = vaultHandler.fuzzySearchFiles(query, 10);
			const formatted = results
				.map((r) => `📄 ${r.baseName} (Score: ${r.score.toFixed(2)})`)
				.join("\n");
			onAddOutput(
				`✓ fuzzySearchFiles("${query}")`,
				`Found ${results.length} results:\n\n${formatted}`,
				"success",
			);
			new Notice(`Found ${results.length} fuzzy matches`, 2000);
		} catch (error) {
			onAddOutput("✗ fuzzySearchFiles()", `Error: ${error}`, "error");
			new Notice(`Fuzzy search failed: ${error}`, 2000);
		}
	};

	return {
		searchResults,
		isSearching,
		setSearchResults,
		handleQuickSearch,
		handleEnhancedSearch,
		handleFuzzySearch,
	};
}
