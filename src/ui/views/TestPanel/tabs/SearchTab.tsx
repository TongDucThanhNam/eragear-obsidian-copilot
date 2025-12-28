/**
 * Search Tab Renderer
 * Renders the search tab content
 */

import type React from "react";
import type { SearchState } from "ui/types/testPanel";
import { ActionCard, ActionCardGroup } from "../../../components";

interface SearchTabProps {
	searchState: SearchState;
	isLoading: boolean;
	onQuickSearchChange: (query: string) => void;
	onEnhancedSearchChange: (query: string) => void;
	onFuzzySearchChange: (query: string) => void;
	onQuickSearch: () => void;
	onEnhancedSearch: () => void;
	onFuzzySearch: () => void;
}

export const SearchTabRenderer: React.FC<SearchTabProps> = ({
	searchState,
	isLoading,
	onQuickSearchChange,
	onEnhancedSearchChange,
	onFuzzySearchChange,
	onQuickSearch,
	onEnhancedSearch,
	onFuzzySearch,
}) => {
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
						onChange={(e) => onQuickSearchChange(e.target.value)}
						onKeyPress={(e) => e.key === "Enter" && onQuickSearch()}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-primary"
						onClick={onQuickSearch}
						disabled={!searchState.quickSearchQuery.trim() || isLoading}
					>
						{isLoading ? "⏳" : "🔍"} Search
					</button>
				</div>

				{searchState.searchResults.length > 0 && (
					<div className="test-results">
						<h4>Found {searchState.searchResults.length} file(s):</h4>
						<ul className="test-result-list">
							{searchState.searchResults.map((result: any) => (
								<li key={result.path} className="test-result-item">
									<span className="result-basename">{result.baseName}</span>
									<span className="result-path">{result.path}</span>
								</li>
							))}
						</ul>
					</div>
				)}
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
							onChange={(e) => onEnhancedSearchChange(e.target.value)}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={onEnhancedSearch}
							disabled={!searchState.enhancedSearchQuery.trim() || isLoading}
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
							onChange={(e) => onFuzzySearchChange(e.target.value)}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={onFuzzySearch}
							disabled={!searchState.fuzzyQuery.trim() || isLoading}
						>
							Test
						</button>
					</div>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
