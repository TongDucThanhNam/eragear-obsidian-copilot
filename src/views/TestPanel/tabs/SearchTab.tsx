/**
 * Search Tab
 * Manages search functionality and internal state
 */

import type { App } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import { useSearch } from "../../../hooks";
import { SearchState } from "@/types";
import "./SearchTab.css";
import {
	MagnifyingGlass,
	ChartBar,
	Lightning,
	Funnel,
	FileText,
	Clock,
} from "@phosphor-icons/react";

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
		<div className="search-tab-container">
			<div className="search-tab-header">
				<h2 className="search-tab-title">Search Notes</h2>
				<p className="search-tab-description">
					Find what you need instantly with AI-enhanced search capabilities across your entire vault.
				</p>
			</div>

			<div className="">
				{/* Hero Search Section */}
				<div className="hero-search-wrapper">
					<MagnifyingGlass size={18} className="hero-search-icon" weight="bold" />
					<input
						type="text"
						className="hero-search-input"
						placeholder="Search for anything..."
						value={searchState.quickSearchQuery}
						onChange={(e) =>
							setSearchState((prev) => ({
								...prev,
								quickSearchQuery: e.target.value,
							}))
						}
						onKeyPress={(e) => e.key === "Enter" && handleQuickSearch()}
						disabled={isLoading}
						autoFocus
						aria-label="Quick search query"
					/>
					<button
						type="button"
						className="hero-search-btn"
						onClick={handleQuickSearch}
						disabled={!searchState.quickSearchQuery.trim() || isLoading}
						aria-label="Execute search"
					>
						{isLoading ? (
							<span className="search-spinner" />
						) : (
							<>
								<span>Search</span>
								<MagnifyingGlass size={14} weight="bold" />
							</>
						)}
					</button>
				</div>

				<ActionCardGroup title="Advanced Search Strategies">
					<div className="advanced-search-grid">
						<div className="premium-card-wrapper">
							<ActionCard
								title="Enhanced Search"
								description="Semantic search with relevance scoring"
								icon={<ChartBar size={24} weight="duotone" />}
							>
								<div className="search-input-wrapper compact">
									<div className="search-input-with-icon">
										<ChartBar size={16} className="search-input-icon" />
										<input
											type="text"
											className="search-input"
											placeholder="Concept search..."
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
									</div>
									<button
										type="button"
										className="search-btn search-btn-secondary"
										onClick={handleEnhancedSearch}
										disabled={
											!searchState.enhancedSearchQuery.trim() || isLoading
										}
										aria-label="Run output"
									>
										{isLoading ? (
											<span className="search-spinner small" />
										) : (
											"Run"
										)}
									</button>
								</div>
							</ActionCard>
						</div>

						<div className="premium-card-wrapper">
							<ActionCard
								title="Fuzzy Search"
								description="Quick Switcher style filename matching"
								icon={<Lightning size={24} weight="duotone" />}
							>
								<div className="search-input-wrapper compact">
									<div className="search-input-with-icon">
										<Lightning size={16} className="search-input-icon" />
										<input
											type="text"
											className="search-input"
											placeholder="Filename match..."
											value={searchState.fuzzyQuery}
											onChange={(e) =>
												setSearchState((prev) => ({
													...prev,
													fuzzyQuery: e.target.value,
												}))
											}
											disabled={isLoading}
											aria-label="Fuzzy query"
										/>
									</div>
									<button
										type="button"
										className="search-btn search-btn-secondary"
										onClick={handleFuzzySearch}
										disabled={!searchState.fuzzyQuery.trim() || isLoading}
										aria-label="Run fuzzy search"
									>
										{isLoading ? (
											<span className="search-spinner small" />
										) : (
											"Run"
										)}
									</button>
								</div>
							</ActionCard>
						</div>
					</div>
				</ActionCardGroup>

				{searchResults.length > 0 && (
					<div className="search-results-section">
						<div className="search-results-header">
							<Funnel size={16} weight="bold" />
							<span>
								{searchResults.length} {searchResults.length === 1 ? "Result" : "Results"} Found
							</span>
						</div>
						<div className="search-results-list">
							{searchResults.map((result, index) => (
								<div
									key={index}
									className="search-result-item"
									onClick={() => {
										const file = app.vault.getFileByPath(result.path);
										if (file) {
											app.workspace.getLeaf(true).openFile(file);
										}
									}}
								>
									<div className="search-result-icon">
										<FileText size={20} weight="duotone" />
									</div>
									<div className="search-result-content">
										<div className="search-result-name">
											{result.baseName}
										</div>
										<div className="search-result-path">
											<Clock size={12} />
											<span>{result.path}</span>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};
