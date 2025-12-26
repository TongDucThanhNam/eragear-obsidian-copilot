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
}) => {
	const [isCollapsed, setIsCollapsed] = useState(false);
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
		<div className={`console-log-panel ${isCollapsed ? "collapsed" : ""}`}>
			<div className="console-header">
				<div className="console-title">
					<button
						type="button"
						className="console-toggle"
						onClick={() => setIsCollapsed(!isCollapsed)}
						title={isCollapsed ? "Expand" : "Collapse"}
					>
						{isCollapsed ? "▶" : "▼"}
					</button>
					<span className="console-label">
						📊 Results ({testOutputs.length})
					</span>
				</div>

				<div className="console-controls">
					{testOutputs.length > 0 && (
						<button
							type="button"
							className="console-btn console-btn-clear"
							onClick={onClear}
							title="Clear all logs"
						>
							Clear
						</button>
					)}
				</div>
			</div>

			{!isCollapsed && (
				<div className="console-body">
					{testOutputs.length === 0 ? (
						<div className="console-empty">
							No test results yet. Run a test above to see output here.
						</div>
					) : (
						<div className="console-logs">
							{testOutputs.map((output: TestOutput) => (
								<div
									key={output.id}
									className={`console-log-item status-${output.status}`}
								>
									<div className="log-header">
										<span className="log-status-icon">
											{getStatusIcon(output.status)}
										</span>
										<span className="log-title">{output.title}</span>
										<span className="log-time">{output.timestamp}</span>

										<button
											type="button"
											className="log-copy-btn"
											onClick={() => copyToClipboard(output.content)}
											title="Copy to clipboard"
										>
											📋
										</button>

										<button
											type="button"
											className="log-expand-btn"
											onClick={() =>
												setExpandedId(
													expandedId === output.id ? null : output.id,
												)
											}
											title="Expand/collapse"
										>
											{expandedId === output.id ? "▼" : "▶"}
										</button>
									</div>

									{expandedId === output.id && (
										<div className="log-content">
											<pre className="log-code">{output.content}</pre>
										</div>
									)}
								</div>
							))}
						</div>
					)}
				</div>
			)}
		</div>
	);
};
