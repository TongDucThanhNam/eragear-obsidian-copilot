/**
 * ConsoleLog Component
 * Displays test outputs and results in a collapsible console panel
 */

import type React from "react";
import { useState } from "react";
import type { ConsoleLogProps, TestOutput } from "../../types";

export const ConsoleLog: React.FC<ConsoleLogProps> = ({
	testOutputs,
	onClear,
	isCollapsed,
	setIsCollapsed,
}) => {
	const [expandedId, setExpandedId] = useState<string | null>(null);

	const getStatusIcon = (status: string): string => {
		switch (status) {
			case "success":
				return "✅";
			case "error":
				return "❌";
			case "info":
				return "ℹ️";
			default:
				return "•";
		}
	};

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text).then(() => {
			// Visual feedback could be added here
		});
	};

	return (
		<div
			className={`console-log-panel Collapsible ${isCollapsed ? "is-collapsed" : ""}`}
		>
			{/* Console Header */}
			<div className="console-header">
				<button
					type="button"
					className="console-title Trigger"
					onClick={() => setIsCollapsed(!isCollapsed)}
					data-panel-open={!isCollapsed}
					title={isCollapsed ? "Expand" : "Collapse"}
					aria-label={isCollapsed ? "Expand console" : "Collapse console"}
					aria-expanded={!isCollapsed}
				>
					<span className="Icon">
						<svg
							viewBox="0 0 24 24"
							width="16"
							height="16"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="9 18 15 12 9 6" />
						</svg>
					</span>
					<span className="console-label">
						<span>📊</span>
						<span>Results</span>
						<span
							style={{ opacity: 0.6, fontSize: "0.9em", marginLeft: "2px" }}
						>
							({testOutputs.length})
						</span>
					</span>
				</button>

				<div className="console-controls">
					{testOutputs.length > 0 && (
						<button
							type="button"
							className="console-btn console-btn-clear"
							onClick={onClear}
							title="Clear all logs"
							aria-label="Clear all logs"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{/* Console Body */}
			<div className="Panel" hidden={isCollapsed}>
				<div className="Content console-body">
					{testOutputs.length === 0 ? (
						<div className="console-empty">
							No test results yet. Run a test above to see output here.
						</div>
					) : (
						// Console Logs - Output
						<div className="console-logs">
							{testOutputs.map((output: TestOutput) => (
								// Console Log Item
								<div
									key={output.id}
									className={`console-log-item Collapsible status-${output.status} ${expandedId === output.id ? "" : "is-collapsed"}`}
								>
									{/* Log Header */}
									<div className="log-header">
										<button
											type="button"
											className="log-header-main Trigger"
											onClick={() =>
												setExpandedId(
													expandedId === output.id ? null : output.id,
												)
											}
											data-panel-open={expandedId === output.id}
											aria-label={`${expandedId === output.id ? "Collapse" : "Expand"} ${output.title}`}
											aria-expanded={expandedId === output.id}
										>
											<span className="Icon">
												<svg
													viewBox="0 0 24 24"
													width="14"
													height="14"
													fill="none"
													stroke="currentColor"
													strokeWidth="2.5"
													strokeLinecap="round"
													strokeLinejoin="round"
													aria-hidden="true"
												>
													<polyline points="9 18 15 12 9 6" />
												</svg>
											</span>
											<span className="log-status-icon">
												{getStatusIcon(output.status)}
											</span>
											<span className="log-title">{output.title}</span>
											<span className="log-time">{output.timestamp}</span>
										</button>

										<div className="log-actions">
											<button
												type="button"
												className="log-copy-btn"
												onClick={() => copyToClipboard(output.content)}
												title="Copy to clipboard"
												aria-label={`Copy ${output.title} to clipboard`}
											>
												<svg
													viewBox="0 0 24 24"
													width="14"
													height="14"
													fill="none"
													stroke="currentColor"
													strokeWidth="2"
													strokeLinecap="round"
													strokeLinejoin="round"
													aria-hidden="true"
												>
													<rect
														x="9"
														y="9"
														width="13"
														height="13"
														rx="2"
														ry="2"
													/>
													<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
												</svg>
											</button>
										</div>
									</div>

									<div className="Panel" hidden={expandedId !== output.id}>
										<div className="Content log-content">
											<pre className="log-code">{output.content}</pre>
										</div>
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
