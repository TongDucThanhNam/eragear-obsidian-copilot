import type React from "react";
import { useEffect, useState } from "react";
import type {
	ToolCall,
	ToolCallContent,
} from "../../../../domain/models/session-update";
import { useAcpAdapter } from "../../../context/AcpContext";
import { TerminalRenderer } from "./TerminalRenderer";

// Status icons
const StatusIcon: React.FC<{
	status: "pending" | "running" | "complete" | "failed";
}> = ({ status }) => {
	switch (status) {
		case "pending":
			return (
				<span style={{ color: "var(--text-muted)" }} title="Pending">
					○
				</span>
			);
		case "running":
			return (
				<span
					style={{
						color: "var(--color-yellow)",
						animation: "pulse 1s infinite",
					}}
					title="Running"
				>
					◉
				</span>
			);
		case "complete":
			return (
				<span style={{ color: "var(--color-green)" }} title="Complete">
					✓
				</span>
			);
		case "failed":
			return (
				<span style={{ color: "var(--color-red)" }} title="Failed">
					✗
				</span>
			);
	}
};

// Tool kind icons
const ToolKindIcon: React.FC<{ kind?: string }> = ({ kind }) => {
	switch (kind) {
		case "read":
			return <span title="Read">📄</span>;
		case "write":
		case "edit":
			return <span title="Write">✏️</span>;
		case "bash":
		case "terminal":
			return <span title="Terminal">💻</span>;
		case "browser":
		case "web":
			return <span title="Browser">🌐</span>;
		default:
			return <span title="Tool">🔧</span>;
	}
};

// Content renderer - uses AcpAdapter for terminal polling
const ToolCallContentRenderer: React.FC<{ content: ToolCallContent[] }> = ({
	content,
}) => {
	const acpAdapter = useAcpAdapter();

	if (!content || content.length === 0) return null;

	return (
		<div
			className="tool-call-content"
			style={{
				marginTop: "8px",
				fontSize: "0.8rem",
				fontFamily: "var(--font-monospace)",
			}}
		>
			{content.map((item, idx) => {
				if (item.type === "text" && item.text) {
					return (
						<pre
							key={`text-${idx}`}
							style={{
								margin: 0,
								padding: "8px",
								backgroundColor: "var(--background-primary)",
								borderRadius: "4px",
								overflow: "auto",
								maxHeight: "200px",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
							}}
						>
							{item.text}
						</pre>
					);
				}
				if (item.type === "diff") {
					return (
						<div
							key={`diff-${idx}`}
							style={{
								padding: "8px",
								backgroundColor: "var(--background-primary)",
								borderRadius: "4px",
							}}
						>
							<div
								style={{
									fontSize: "0.75rem",
									color: "var(--text-muted)",
									marginBottom: "4px",
								}}
							>
								{item.path}
							</div>
							{item.oldText && (
								<pre
									style={{
										margin: 0,
										color: "var(--color-red)",
										backgroundColor: "rgba(255,0,0,0.1)",
										padding: "2px 4px",
										borderRadius: "2px",
									}}
								>
									- {item.oldText}
								</pre>
							)}
							{item.newText && (
								<pre
									style={{
										margin: 0,
										color: "var(--color-green)",
										backgroundColor: "rgba(0,255,0,0.1)",
										padding: "2px 4px",
										borderRadius: "2px",
									}}
								>
									+ {item.newText}
								</pre>
							)}
						</div>
					);
				}
				if (item.type === "terminal" && item.terminalId) {
					return (
						<TerminalRenderer
							key={`terminal-${item.terminalId}`}
							terminalId={item.terminalId}
							acpAdapter={acpAdapter}
						/>
					);
				}
				return null;
			})}
		</div>
	);
};

export interface ToolCallCardProps {
	toolCall: ToolCall;
	isExpanded?: boolean;
	onToggle?: () => void;
}

export const ToolCallCard: React.FC<ToolCallCardProps> = ({
	toolCall,
	isExpanded: controlledExpanded,
	onToggle,
}) => {
	// Check if there's terminal content
	const hasTerminalContent = toolCall.content?.some(
		(item) => item.type === "terminal",
	);
	const [internalExpanded, setInternalExpanded] = useState(hasTerminalContent);
	const isExpanded = controlledExpanded ?? internalExpanded;
	const { toolCallId, title, status, kind, content, locations } = toolCall;

	// Auto-expand when terminal content is added
	useEffect(() => {
		if (hasTerminalContent && !internalExpanded) {
			setInternalExpanded(true);
		}
	}, [hasTerminalContent, internalExpanded]);

	const handleClick = () => {
		if (onToggle) {
			onToggle();
		} else {
			setInternalExpanded(!internalExpanded);
		}
	};

	return (
		<div
			className={`tool-call-card tool-call-${status}`}
			onClick={handleClick}
			style={{
				display: "flex",
				flexDirection: "column",
				padding: "8px 12px",
				borderRadius: "6px",
				backgroundColor: "var(--background-secondary)",
				border: `1px solid ${
					status === "running"
						? "var(--color-yellow)"
						: status === "failed"
							? "var(--color-red)"
							: "var(--background-modifier-border)"
				}`,
				cursor: "pointer",
				marginBottom: "4px",
				transition: "border-color 0.2s",
			}}
		>
			{/* Header */}
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: "8px",
				}}
			>
				<StatusIcon status={status} />
				<ToolKindIcon kind={kind} />
				<span
					style={{
						flex: 1,
						fontSize: "0.85rem",
						fontWeight: 500,
						color: "var(--text-normal)",
						overflow: "hidden",
						textOverflow: "ellipsis",
						whiteSpace: "nowrap",
					}}
				>
					{title || `Tool: ${toolCallId}`}
				</span>
				{locations && locations.length > 0 && (
					<span
						style={{
							fontSize: "0.7rem",
							color: "var(--text-muted)",
							maxWidth: "150px",
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap",
						}}
					>
						{locations[0]?.uri?.split("/").pop() || "unknown"}
					</span>
				)}
				<span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>
					{isExpanded ? "▼" : "▶"}
				</span>
			</div>

			{/* Content (expandable) */}
			{isExpanded && content && content.length > 0 && (
				<ToolCallContentRenderer content={content} />
			)}
		</div>
	);
};

// Container for multiple tool calls
export interface ToolCallListProps {
	toolCalls: Map<string, ToolCall>;
}

export const ToolCallList: React.FC<ToolCallListProps> = ({ toolCalls }) => {
	if (toolCalls.size === 0) return null;

	const toolCallArray = Array.from(toolCalls.values());

	return (
		<div
			className="tool-call-list"
			style={{
				display: "flex",
				flexDirection: "column",
				gap: "4px",
				padding: "8px 0",
			}}
		>
			{toolCallArray.map((tc) => (
				<ToolCallCard key={tc.toolCallId} toolCall={tc} />
			))}
		</div>
	);
};

export default ToolCallCard;
