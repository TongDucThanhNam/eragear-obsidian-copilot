import { useState } from "react";
import type { PlanEntry } from "../../../../domain/models/session-update";

interface AgentPlanProps {
	entries: PlanEntry[];
	onDismiss?: () => void;
}

type PlanStatusGroup = {
	label: string;
	entries: PlanEntry[];
	statusType: "running" | "pending" | "completed" | "issue";
};

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

const ChevronIcon = () => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		className="agent-plan-chevron" // controlled by CSS class
		aria-hidden="true"
	>
		<path d="m6 9 6 6 6-6" />
	</svg>
);

const PlanGroup = ({
	group,
	defaultOpen = false,
}: {
	group: PlanStatusGroup;
	defaultOpen?: boolean;
}) => {
	const [isOpen, setIsOpen] = useState(defaultOpen);

	if (group.entries.length === 0) return null;

	const toggle = () => setIsOpen(!isOpen);

	return (
		<div className="agent-plan-group" data-state={isOpen ? "open" : "closed"}>
			<button
				type="button"
				className="agent-plan-trigger"
				onClick={toggle}
				aria-expanded={isOpen}
			>
				<span className="agent-plan-trigger-left">
					<ChevronIcon />
					<span>
						{group.entries.length} {group.label}
					</span>
				</span>
			</button>
			<div className="agent-plan-content" hidden={!isOpen}>
				{group.entries.map((entry, idx) => (
					<PlanEntryItem key={entry.id || idx} entry={entry} />
				))}
			</div>
		</div>
	);
};

const PlanEntryItem = ({ entry }: { entry: PlanEntry }) => {
	const getIcon = (
		status: PlanEntry["status"],
	): { icon: React.ReactNode; className: string } => {
		switch (status) {
			case "complete":
				return { icon: "✓", className: "agent-plan-status-complete" };
			case "running":
				return {
					icon: <Loader size={14} />,
					className: "agent-plan-status-running",
				};
			case "failed":
				return { icon: "✗", className: "agent-plan-status-failed" };
			case "blocked":
				return { icon: "⏸", className: "agent-plan-status-blocked" };
			case "pending":
			default:
				return { icon: "○", className: "agent-plan-status-pending" };
		}
	};

	const { icon, className } = getIcon(entry.status);

	return (
		<div className={`agent-plan-entry ${className}`}>
			<span className="agent-plan-entry-icon">{icon}</span>
			<div className="agent-plan-entry-content">
				<span className="agent-plan-entry-title">{entry.title}</span>
				{entry.description && (
					<span className="agent-plan-entry-desc">{entry.description}</span>
				)}
			</div>
		</div>
	);
};

/**
 * AgentPlan - Displays the agent's execution plan with status indicators
 * Now uses collapsible groups.
 */
export const AgentPlan = ({ entries, onDismiss }: AgentPlanProps) => {
	if (entries.length === 0) return null;

	// Group entries
	const running = entries.filter((e) => e.status === "running");
	const pending = entries.filter((e) => e.status === "pending");
	const completed = entries.filter((e) => e.status === "complete");
	const issues = entries.filter((e) =>
		["failed", "blocked"].includes(e.status),
	);

	const groups: PlanStatusGroup[] = [
		{ label: "Running", entries: running, statusType: "running" as const },
		{ label: "Todo", entries: pending, statusType: "pending" as const }, // "Todo" matches "Queued/Todo" concept
		{
			label: "Completed",
			entries: completed,
			statusType: "completed" as const,
		},
		{ label: "Issues", entries: issues, statusType: "issue" as const },
	].filter((g) => g.entries.length > 0);

	return (
		<div className="agent-plan-container" style={{ position: "relative" }}>
			{onDismiss && (
				<button
					type="button"
					onClick={onDismiss}
					className="agent-plan-dismiss-btn"
					style={{
						position: "absolute",
						top: "0.5rem",
						right: "0.5rem",
						background: "transparent",
						border: "none",
						cursor: "pointer",
						color: "var(--text-muted)",
						zIndex: 10,
					}}
					aria-label="Dismiss plan"
				>
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
						aria-hidden="true"
					>
						<line x1="18" y1="6" x2="6" y2="18" />
						<line x1="6" y1="6" x2="18" y2="18" />
					</svg>
				</button>
			)}
			{groups.map((group) => (
				<PlanGroup
					key={group.label}
					group={group}
					defaultOpen={
						group.statusType === "running" ||
						group.statusType === "issue" ||
						group.statusType === "pending"
					}
				/>
			))}
		</div>
	);
};
