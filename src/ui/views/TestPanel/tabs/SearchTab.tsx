/**
 * Search Tab
 * Manages search functionality and internal state
 */

import type { App } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import { useSearch } from "../../../hooks";
import type { SearchState } from "../../../types";

interface SearchTabProps {
	app: App;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export const SearchTab: React.FC<SearchTabProps> = ({ app, onAddOutput }) => {
	const [searchState, setSearchState] = useState<SearchState>({
		quickSearchQuery: "",
		enhancedSearchQuery: "",
		fuzzyQuery: "",
		searchResults: [],
	});

	const [isLoading, setIsLoading] = useState(false);

	const { searchResults, ...searchHooks } = useSearch({
		app,
		onAddOutput,
	});

	// Handler wrappers to update local loading state
	const handleQuickSearch = async () => {
		setIsLoading(true);
		try {
			await searchHooks.handleQuickSearch(searchState.quickSearchQuery);
			// Update local results from hook (if hook returned them, but hook updates its own state usually.
			// Wait, the hook 'useSearch' returns 'searchResults'.
			// We need to sync hook results to our local display or just use hook results directly.
			// actually useSearch returns searchResults. We can just use that.
		} finally {
			setIsLoading(false);
		}
	};

	const handleEnhancedSearch = async () => {
		setIsLoading(true);
		try {
			await searchHooks.handleEnhancedSearch(searchState.enhancedSearchQuery);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFuzzySearch = async () => {
		setIsLoading(true);
		try {
			await searchHooks.handleFuzzySearch(searchState.fuzzyQuery);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="test-section">
			<h3>🔍 Search Notes</h3>

			<ActionCard title="Quick Search" icon="🔍" variant="safe">
				<div className="test-input-group">
					<input
						type="text"
						className="test-input"
						placeholder="Enter keyword..."
						value={searchState.quickSearchQuery}
						onChange={(e) =>
							setSearchState((prev) => ({
								...prev,
								quickSearchQuery: e.target.value,
							}))
						}
						onKeyPress={(e) => e.key === "Enter" && handleQuickSearch()}
						disabled={isLoading}
						aria-label="Quick search query"
					/>
					<button
						type="button"
						className="test-btn test-btn-primary"
						onClick={handleQuickSearch}
						disabled={!searchState.quickSearchQuery.trim() || isLoading}
						aria-label="Execute quick search"
					>
						{isLoading ? "⏳" : "🔍"} Search
					</button>
				</div>
			</ActionCard>

			<ActionCardGroup title="Advanced Search">
				<ActionCard
					title="Enhanced Search"
					description="With scoring"
					icon="📊"
				>
					<div className="test-input-group">
						<input
							type="text"
							className="test-input"
							placeholder="Search query..."
							value={searchState.enhancedSearchQuery}
							onChange={(e) =>
								setSearchState((prev) => ({
									...prev,
									enhancedSearchQuery: e.target.value,
								}))
							}
							disabled={isLoading}
							aria-label="Enhanced search query"
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={handleEnhancedSearch}
							disabled={!searchState.enhancedSearchQuery.trim() || isLoading}
							aria-label="Execute enhanced search"
						>
							Test
						</button>
					</div>
				</ActionCard>

				<ActionCard
					title="Fuzzy Search"
					description="Quick Switcher style"
					icon="⚡"
				>
					<div className="test-input-group">
						<input
							type="text"
							className="test-input"
							placeholder="Try 'era' or 'obsapi'..."
							value={searchState.fuzzyQuery}
							onChange={(e) =>
								setSearchState((prev) => ({
									...prev,
									fuzzyQuery: e.target.value,
								}))
							}
							disabled={isLoading}
							aria-label="Fuzzy search query"
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={handleFuzzySearch}
							disabled={!searchState.fuzzyQuery.trim() || isLoading}
							aria-label="Execute fuzzy search"
						>
							Test
						</button>
					</div>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
