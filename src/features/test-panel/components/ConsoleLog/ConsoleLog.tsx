/**
 * ConsoleLog Component
 * Displays test outputs and results in a collapsible console panel
 */

import type React from "react";
import { useState, useCallback } from "react";
import {
	ArrowsInSimpleIcon,
	ArrowsOutSimpleIcon,
	MagnifyingGlassIcon,
	TerminalWindowIcon,
	TrashIcon,
} from "@phosphor-icons/react";
import { ConsoleLogItem } from "./ConsoleLogItem";
import type { ConsoleLogProps } from "@/features/test-panel/types";
import "./console-log.css";

export const ConsoleLog: React.FC<ConsoleLogProps> = ({
	testOutputs,
	onClear,
	isCollapsed,
	setIsCollapsed,
}) => {
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [allExpanded, setAllExpanded] = useState(false);

	// Copy to clipboard with visual feedback
	const copyToClipboard = useCallback(async (text: string, id: string) => {
		try {
			await navigator.clipboard.writeText(text);
			setCopiedId(id);
			setTimeout(() => setCopiedId(null), 1500);
		} catch {
			// Silent fail - clipboard API may not be available
		}
	}, []);

	// Toggle all items
	const toggleAll = useCallback(() => {
		setAllExpanded((prev) => !prev);
	}, []);

	return (
		<div
			className={`console-log-panel ${isCollapsed ? "is-collapsed" : ""}`}
			role="region"
			aria-label="Test results console"
		>
			{/* Console Header */}
			<div className="console-header">
				<button
					type="button"
					onClick={() => setIsCollapsed(!isCollapsed)}
					aria-expanded={!isCollapsed}
					aria-label={isCollapsed ? "Expand results panel" : "Collapse results panel"}
				>
					<span className="console-icon" aria-hidden="true">
						<TerminalWindowIcon size={16} />
					</span>
					<span className="console-label">Results</span>
				</button>

				<div className="console-controls">
					{testOutputs.length > 0 && (
						<>
							<button
								type="button"
								className="console-btn console-btn-expand"
								onClick={toggleAll}
								aria-label={allExpanded ? "Collapse all results" : "Expand all results"}
								title={allExpanded ? "Collapse all" : "Expand all"}
							>
								{allExpanded ? (
									<ArrowsInSimpleIcon size={12} />
								) : (
									<ArrowsOutSimpleIcon size={12} />
								)}
							</button>
							<button
								type="button"
								className="console-btn console-btn-clear"
								onClick={onClear}
								aria-label="Clear all results"
								title="Clear all"
							>
								<TrashIcon size={12} />
								<span className="console-btn-text">Clear</span>
							</button>
						</>
					)}
				</div>
			</div>

			{/* Console Body */}
			<div className="console-body" hidden={isCollapsed}>
				{testOutputs.length === 0 ? (
					// Empty State
					<div className="console-empty" role="status">
						<span className="console-empty-icon" aria-hidden="true">
							<MagnifyingGlassIcon size={48} />
						</span>
						<p className="console-empty-title">No results yet</p>
						<p className="console-empty-description">
							Run a test above to see output here
						</p>
					</div>
				) : (
					<div className="" aria-label="Test result logs">
						{testOutputs.map((output) => (
							<ConsoleLogItem
								key={output.id}
								output={output}
								allExpanded={allExpanded}
								onCopy={copyToClipboard}
								copiedId={copiedId}
							/>
						))}
					</div>
				)}
			</div>
		</div>
	);
};
