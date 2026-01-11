/**
 * ConsoleLog Component
 * Displays test outputs and results in a collapsible console panel
 * Enhanced with improved UX/UI: status badges, copy feedback, keyboard navigation
 */

import type React from "react";
import { useState, useCallback } from "react";
import type { ConsoleLogProps, TestOutput } from "../../types";
import "./console-log.css";

type CopiedState = string | null;

export const ConsoleLog: React.FC<ConsoleLogProps> = ({
	testOutputs,
	onClear,
	isCollapsed,
	setIsCollapsed,
}) => {
	const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
	const [copiedId, setCopiedId] = useState<CopiedState>(null);
	const [allExpanded, setAllExpanded] = useState(false);

	// Format timestamp for better readability
	const formatTimestamp = useCallback((timestamp: string): string => {
		try {
			const date = new Date(timestamp);
			const now = new Date();
			const isToday = date.toDateString() === now.toDateString();

			if (isToday) {
				return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
			}

			return date.toLocaleDateString([], {
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return timestamp;
		}
	}, []);

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

	// Toggle single log item
	const toggleItem = useCallback((id: string) => {
		setExpandedIds((prev) => {
			const next = new Set(prev);
			if (next.has(id)) {
				next.delete(id);
			} else {
				next.add(id);
			}
			return next;
		});
	}, []);

	// Toggle all items
	const toggleAll = useCallback(() => {
		const newExpandedState = !allExpanded;
		setAllExpanded(newExpandedState);
		if (newExpandedState) {
			setExpandedIds(new Set(testOutputs.map((o) => o.id)));
		} else {
			setExpandedIds(new Set());
		}
	}, [allExpanded, testOutputs]);

	// Keyboard navigation for log items
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent, id: string) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				toggleItem(id);
			}
		},
		[toggleItem]
	);

	// Status badge configuration
	const getStatusConfig = (status: string) => {
		switch (status) {
			case "success":
				return {
					icon: "check-circle",
					label: "Success",
					iconColor: "var(--text-success, #4ade80)",
					badgeBg: "rgba(74, 222, 128, 0.1)",
				};
			case "error":
				return {
					icon: "x-circle",
					label: "Error",
					iconColor: "var(--text-error)",
					badgeBg: "rgba(239, 68, 68, 0.1)",
				};
			case "info":
			default:
				return {
					icon: "info",
					label: "Info",
					iconColor: "var(--interactive-accent)",
					badgeBg: "rgba(99, 102, 241, 0.1)",
				};
		}
	};

	// SVG icons as components for cleaner code
	const Icons = {
		checkCircle: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="14"
				height="14"
			>
				<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
				<polyline points="22 4 12 14.01 9 11.01" />
			</svg>
		),
		xCircle: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="14"
				height="14"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="15" y1="9" x2="9" y2="15" />
				<line x1="9" y1="9" x2="15" y2="15" />
			</svg>
		),
		info: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="14"
				height="14"
			>
				<circle cx="12" cy="12" r="10" />
				<line x1="12" y1="16" x2="12" y2="12" />
				<line x1="12" y1="8" x2="12.01" y2="8" />
			</svg>
		),
		clipboard: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="14"
				height="14"
			>
				<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
				<rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
			</svg>
		),
		check: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="14"
				height="14"
			>
				<polyline points="20 6 9 17 4 12" />
			</svg>
		),
		chevronRight: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="16"
				height="16"
			>
				<polyline points="9 18 15 12 9 6" />
			</svg>
		),
		expand: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="12"
				height="12"
			>
				<polyline points="15 3 21 3 21 9" />
				<polyline points="9 21 3 21 3 15" />
				<line x1="21" y1="3" x2="14" y2="10" />
				<line x1="3" y1="21" x2="10" y2="14" />
			</svg>
		),
		collapse: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="12"
				height="12"
			>
				<polyline points="4 14 10 14 10 20" />
				<polyline points="20 10 14 10 14 4" />
				<line x1="14" y1="10" x2="21" y2="3" />
				<line x1="3" y1="21" x2="10" y2="14" />
			</svg>
		),
		trash: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="12"
				height="12"
			>
				<polyline points="3 6 5 6 21 6" />
				<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
			</svg>
		),
		terminal: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="16"
				height="16"
			>
				<polyline points="4 17 10 11 4 5" />
				<line x1="12" y1="19" x2="20" y2="19" />
			</svg>
		),
		search: () => (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
				width="48"
				height="48"
			>
				<circle cx="11" cy="11" r="8" />
				<line x1="21" y1="21" x2="16.65" y2="16.65" />
			</svg>
		),
	};

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
					className="console-title"
					onClick={() => setIsCollapsed(!isCollapsed)}
					aria-expanded={!isCollapsed}
					aria-label={isCollapsed ? "Expand results panel" : "Collapse results panel"}
				>
					<span className={`console-chevron ${isCollapsed ? "" : "is-expanded"}`}>
						<Icons.chevronRight />
					</span>
					<span className="console-icon" aria-hidden="true">
						<Icons.terminal />
					</span>
					<span className="console-label">Results</span>
					{testOutputs.length > 0 && (
						<span className="console-count" aria-label={`${testOutputs.length} results`}>
							{testOutputs.length}
						</span>
					)}
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
								{allExpanded ? <Icons.collapse /> : <Icons.expand />}
							</button>
							<button
								type="button"
								className="console-btn console-btn-clear"
								onClick={onClear}
								aria-label="Clear all results"
								title="Clear all"
							>
								<Icons.trash />
								<span className="console-btn-text">Clear</span>
							</button>
						</>
					)}
				</div>
			</div>

			{/* Console Body */}
			<div className="console-body" hidden={isCollapsed}>
				{testOutputs.length === 0 ? (
					<div className="console-empty" role="status">
						<span className="console-empty-icon" aria-hidden="true">
							<Icons.search />
						</span>
						<p className="console-empty-title">No results yet</p>
						<p className="console-empty-description">
							Run a test above to see output here
						</p>
					</div>
				) : (
					<div className="console-logs" role="log" aria-label="Test result logs">
						{testOutputs.map((output: TestOutput) => {
							const status = getStatusConfig(output.status);
							const isExpanded = expandedIds.has(output.id) || allExpanded;
							const isCopied = copiedId === output.id;

							return (
								<div
									key={output.id}
									className={`console-log-item status-${output.status} ${
										isExpanded ? "is-expanded" : ""
									}`}
								>
									{/* Log Header */}
									<button
										type="button"
										className="log-header"
										onClick={() => toggleItem(output.id)}
										onKeyDown={(e) => handleKeyDown(e, output.id)}
										aria-expanded={isExpanded}
										aria-label={`${output.title}, ${status.label} result${
											isExpanded ? ", expanded" : ", collapsed"
										}`}
									>
										<span
											className="log-chevron"
											aria-hidden="true"
										>
											<Icons.chevronRight />
										</span>
										<span
											className="log-status-badge"
											style={{
												backgroundColor: status.badgeBg,
												color: status.iconColor,
											}}
											aria-hidden="true"
										>
											{status.icon === "check-circle" && <Icons.checkCircle />}
											{status.icon === "x-circle" && <Icons.xCircle />}
											{status.icon === "info" && <Icons.info />}
										</span>
										<span className="log-title">{output.title}</span>
										<span className="log-time">
											{formatTimestamp(output.timestamp)}
										</span>
									</button>

									{/* Log Actions */}
									<div className="log-actions">
										<button
											type="button"
											className={`log-copy-btn ${isCopied ? "is-copied" : ""}`}
											onClick={() =>
												copyToClipboard(output.content, output.id)
											}
											aria-label={
												isCopied
													? "Copied to clipboard"
													: `Copy ${output.title} to clipboard`
											}
											title={isCopied ? "Copied!" : "Copy to clipboard"}
										>
											{isCopied ? <Icons.check /> : <Icons.clipboard />}
										</button>
									</div>

									{/* Log Content */}
									<div className="log-content" hidden={!isExpanded}>
										<pre
											className="log-code"
											aria-label={`Output for ${output.title}`}
										>
											{output.content}
										</pre>
									</div>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
};
