import type { PlanEntry } from "@/domain/models/session-update";
import "./AgentPlan.css"


interface AgentPlanProps {
	entries: PlanEntry[];
	onDismiss?: () => void;
}

const Loader = ({
	size = 14, // Match default icon size roughly 0.8rem ~ 12.8px, maybe 14 is good
	className = "",
}: {
	size?: number;
	className?: string;
}) => (
	<div
		className={`agent-plan-loader ${className}`}
		style={{ width: size, height: size }}
	>
		<svg
			height={size}
			strokeLinejoin="round"
			style={{ color: "currentColor" }}
			viewBox="0 0 16 16"
			width={size}
		>
			<title>Loader</title>
			<g clipPath="url(#loader-clip)">
				<path d="M8 0V4" stroke="currentColor" strokeWidth="1.5" />
				<path
					d="M8 16V12"
					opacity="0.5"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M3.29773 1.52783L5.64887 4.7639"
					opacity="0.9"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M12.7023 1.52783L10.3511 4.7639"
					opacity="0.1"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M12.7023 14.472L10.3511 11.236"
					opacity="0.4"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M3.29773 14.472L5.64887 11.236"
					opacity="0.6"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M15.6085 5.52783L11.8043 6.7639"
					opacity="0.2"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M0.391602 10.472L4.19583 9.23598"
					opacity="0.7"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M15.6085 10.4722L11.8043 9.2361"
					opacity="0.3"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
				<path
					d="M0.391602 5.52783L4.19583 6.7639"
					opacity="0.8"
					stroke="currentColor"
					strokeWidth="1.5"
				/>
			</g>
			<defs>
				<clipPath id="loader-clip">
					<rect fill="white" height="16" width="16" />
				</clipPath>
			</defs>
		</svg>
	</div>
);

const ExpandIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="agent-plan-expand-icon"
	>
		<path d="M15 3h6v6" />
		<path d="M9 21H3v-6" />
		<path d="M21 3l-7 7" />
		<path d="M3 21l7-7" />
	</svg>
);

const PlanEntryItem = ({ entry, index }: { entry: PlanEntry; index: number }) => {
	const getIcon = (
		status: PlanEntry["status"],
	): { icon: React.ReactNode; className: string } => {
		switch (status) {
			case "complete":
				return {
					icon: (
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
							<polyline points="20 6 9 17 4 12" />
						</svg>
					),
					className: "agent-plan-status-complete"
				};
			case "running":
				return {
					icon: <Loader size={14} />,
					className: "agent-plan-status-running",
				};
			case "failed":
				return {
					icon: (
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<line x1="18" y1="6" x2="6" y2="18" />
							<line x1="6" y1="6" x2="18" y2="18" />
						</svg>
					),
					className: "agent-plan-status-failed"
				};
			case "blocked":
				return {
					icon: (
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<rect x="6" y="4" width="4" height="16" />
							<rect x="14" y="4" width="4" height="16" />
						</svg>
					),
					className: "agent-plan-status-blocked"
				};
			case "pending":
			default:
				return {
					icon: (
						<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
							<circle cx="12" cy="12" r="10" />
						</svg>
					),
					className: "agent-plan-status-pending"
				};
		}
	};

	const { icon, className } = getIcon(entry.status);

	return (
		<div className={`agent-plan-entry ${className}`}>
			<div className="agent-plan-entry-icon-wrapper">{icon}</div>
			<div className="agent-plan-entry-content">
				<span className="agent-plan-entry-title">
					{/* {index + 1}.  */}{entry.title}
				</span>
				{entry.description && (
					<span className="agent-plan-entry-desc">{entry.description}</span>
				)}
			</div>
		</div>
	);
};

/**
 * AgentPlan - Displays the agent's execution plan with status indicators
 */
export const AgentPlan = ({ entries, onDismiss }: AgentPlanProps) => {
	if (entries.length === 0) return null;

	const completedCount = entries.filter((e) => e.status === "complete").length;
	const totalCount = entries.length;

	// Mock file stats for now as they are not available in PlanEntry
	const fileStats = "5 files changed +110 -3";

	return (
		<div className="agent-plan-container">
			<div className="agent-plan-header">
				<div className="agent-plan-progress-info">
					<span className="agent-plan-progress-text">
						{completedCount}/{totalCount} Completed tasks
					</span>
				</div>
				<div className="agent-plan-actions">
					{onDismiss && (
						<button
							type="button"
							onClick={onDismiss}
							className="agent-plan-action-btn"
							aria-label="Fullscreen"
						>
							<ExpandIcon />
						</button>
					)}
				</div>
			</div>

			<div className="agent-plan-entries">
				{entries.map((entry, idx) => (
					<PlanEntryItem key={entry.id || idx} entry={entry} index={idx} />
				))}
			</div>

			<div className="agent-plan-footer">
				<button type="button" className="agent-plan-review-btn">
					Review ↗
				</button>
				<span className="agent-plan-file-stats">
					{fileStats}
				</span>
			</div>
		</div>
	);
};
