import type React from "react";
import type { PlanEntry } from "../../../../domain/models/session-update";

interface AgentPlanProps {
	entries: PlanEntry[];
	onDismiss?: () => void;
}

/**
 * AgentPlan - Displays the agent's execution plan with status indicators
 *
 * Shows a collapsible list of plan steps with their current status.
 * Appears above the ChatInput when an agent reports a plan.
 */
export const AgentPlan: React.FC<AgentPlanProps> = ({ entries, onDismiss }) => {
	if (entries.length === 0) return null;

	// Calculate progress
	const completedCount = entries.filter((e) => e.status === "complete").length;
	const totalCount = entries.length;
	const progressPercent = Math.round((completedCount / totalCount) * 100);

	// Get status icon and color
	const getStatusIndicator = (
		status: PlanEntry["status"],
	): { icon: string; className: string } => {
		switch (status) {
			case "complete":
				return { icon: "✓", className: "agent-plan-status-complete" };
			case "running":
				return { icon: "⟳", className: "agent-plan-status-running" };
			case "failed":
				return { icon: "✗", className: "agent-plan-status-failed" };
			case "blocked":
				return { icon: "⏸", className: "agent-plan-status-blocked" };
			case "pending":
			default:
				return { icon: "○", className: "agent-plan-status-pending" };
		}
	};

	return (
		<div className="agent-plan-container">
			{/* Header with progress */}
			<div className="agent-plan-header">
				<div className="agent-plan-title">
					<span className="agent-plan-icon">📋</span>
					<span>Agent Plan</span>
					<span className="agent-plan-progress">
						{completedCount}/{totalCount} ({progressPercent}%)
					</span>
				</div>
				{onDismiss && (
					<button
						type="button"
						className="agent-plan-dismiss"
						onClick={onDismiss}
						title="Dismiss plan"
					>
						×
					</button>
				)}
			</div>

			{/* Progress bar */}
			<div className="agent-plan-progress-bar">
				<div
					className="agent-plan-progress-fill"
					style={{ width: `${progressPercent}%` }}
				/>
			</div>

			{/* Plan entries */}
			<div className="agent-plan-entries">
				{entries.map((entry, idx) => {
					const { icon, className } = getStatusIndicator(entry.status);
					return (
						<div
							key={entry.id || `plan-entry-${idx}`}
							className={`agent-plan-entry ${className}`}
						>
							<span className="agent-plan-entry-icon">{icon}</span>
							<div className="agent-plan-entry-content">
								<span className="agent-plan-entry-title">{entry.title}</span>
								{entry.description && (
									<span className="agent-plan-entry-desc">
										{entry.description}
									</span>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
};
