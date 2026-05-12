import type React from "react";
import { useEffect, useState } from "react";
import type {
	ToolCall,
	ToolCallContent,
} from "@/core/models/session-update";
import { useAcpAdapter } from "@/features/chat/context/AcpContext";
import { TerminalRenderer } from "@/features/chat/components/TerminalRenderer";
import {
	IconArchive,
	IconBrain,
	IconChevronRight,
	IconCode,
	IconFileText,
	IconGlobe,
	IconPen,
	IconSearch,
	IconTerminal,
	IconTrash,
	IconWrench,
} from "@/components/ui/Icons";

function classNames(...classes: (string | undefined | null | false)[]): string {
	return classes.filter(Boolean).join(" ");
}

const StatusIcon: React.FC<{
	status: "pending" | "running" | "complete" | "failed";
}> = ({ status }) => {
	return (
		<span
			className="tool-call-status-dot"
			data-status={status}
			title={status}
			aria-label={status}
		/>
	);
};

const ToolKindIcon: React.FC<{ kind?: string }> = ({ kind }) => {
	switch (kind) {
		case "read":
			return <IconFileText />;
		case "edit":
		case "write":
			return <IconPen />;
		case "delete":
			return <IconTrash />;
		case "move":
			return <IconArchive />;
		case "search":
			return <IconSearch />;
		case "execute":
		case "bash":
		case "terminal":
			return <IconTerminal />;
		case "think":
			return <IconBrain />;
		case "fetch":
			return <IconCode />;
		case "browser":
		case "web":
			return <IconGlobe />;
		default:
			return <IconWrench />;
	}
};

// Content renderer - uses AcpAdapter for terminal polling
const ToolCallContentRenderer: React.FC<{ content: ToolCallContent[] }> = ({
	content,
}) => {
	const acpAdapter = useAcpAdapter();

	if (!content || content.length === 0) return null;

	return (
		<div className="tool-call-content">
			{content.map((item, idx) => {
				if (item.type === "text" && item.text) {
					return (
						<pre key={`text-${idx}`} className="tool-call-pre">
							{item.text}
						</pre>
					);
				}
				if (item.type === "diff") {
					return (
						<div key={`diff-${idx}`} className="tool-call-diff">
							<div className="tool-call-section-label">
								{item.path}
							</div>
							{item.oldText && (
								<pre className="tool-call-diff-line is-removed">
									- {item.oldText}
								</pre>
							)}
							{item.newText && (
								<pre className="tool-call-diff-line is-added">
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
				if (item.type === "call" && item.name) {
					return (
						<div key={`call-${idx}`} className="tool-call-section">
							<div className="tool-call-section-label">
								Parameters
							</div>
							<pre className="tool-call-pre">
								{item.arguments
									? JSON.stringify(item.arguments, null, 2)
									: "{}"}
							</pre>
						</div>
					);
				}
				return null;
			})}
		</div>
	);
};

const getToolCardTitle = (toolCall: ToolCall): string => {
	const { title, name, kind, toolCallId, content, rawInput } = toolCall;

	// 1. Prefer explicit title
	if (title) return title;

	// 2. Check rawInput for name (typical in MCP/ACP)
	if (rawInput && typeof rawInput === "object") {
		if (rawInput.name) return rawInput.name;
		if (rawInput.method) return rawInput.method;
	}

	// 3. Prefer explicit name
	if (name) return name;

	// 4. Try to derive from kind
	if (kind) {
		const kindMap: Record<string, string> = {
			read: "Read File",
			write: "Write File",
			edit: "Edit File",
			delete: "Delete File",
			move: "Move/Rename",
			search: "Search",
			execute: "Execute",
			bash: "Terminal",
			terminal: "Terminal",
			think: "Reasoning",
			fetch: "Fetch Data",
			browser: "Browser",
			web: "Web Search",
		};
		const normalizedKind = kind.toLowerCase();
		if (kindMap[normalizedKind]) {
			return kindMap[normalizedKind];
		}
		return `Tool (${kind})`;
	}

	// 3. Try to derive from content type
	if (content && content.length > 0) {
		// prioritized checks
		const callPart = content.find((c) => c.type === "call");
		if (callPart && callPart.name) return callPart.name;

		if (content.some((c) => c.type === "terminal")) return "Execute Command";
		if (content.some((c) => c.type === "diff")) return "Edit File";
		if (content.some((c) => c.type === "text")) return "Tool Output";
	}

	// 4. Fallback to ID
	return `Tool: ${toolCallId}`;
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
	const { status, kind, content, locations } = toolCall;

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
			className={classNames("tool-call-card", `tool-call-${status}`)}
			data-status={status}
			onClick={handleClick}
		>
			{/* Header */}
			<div className="tool-call-card-header">
				<StatusIcon status={status} />
				<span className="tool-call-kind" aria-hidden="true">
					<ToolKindIcon kind={kind} />
				</span>
				<span className="tool-call-title">
					{getToolCardTitle(toolCall)}
				</span>
				{locations && locations.length > 0 && (
					<span className="tool-call-location">
						{locations[0]?.uri?.split("/").pop() || "unknown"}
					</span>
				)}
				<span className="tool-call-chevron" data-open={isExpanded ? "" : undefined}>
					<IconChevronRight />
				</span>
			</div>

			{/* Content (expandable) */}
			{isExpanded && (
				<div className="tool-call-card-body">
					{toolCall.rawInput && (
						<div className="tool-call-section">
							<div className="tool-call-section-label">
								Parameters
							</div>
							<pre className="tool-call-pre">
								{JSON.stringify(toolCall.rawInput, null, 2)}
							</pre>
						</div>
					)}
					{content && content.length > 0 && (
						<ToolCallContentRenderer content={content} />
					)}
				</div>
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
		<div className="tool-call-list">
			{toolCallArray.map((tc) => (
				<ToolCallCard key={tc.toolCallId} toolCall={tc} />
			))}
		</div>
	);
};

export default ToolCallCard;
