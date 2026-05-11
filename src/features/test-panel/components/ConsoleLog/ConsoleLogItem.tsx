/**
 * ConsoleLogItem Component
 * Individual collapsible test output item with status badge and content
 */

import type React from "react";
import {
	CaretRightIcon,
	CheckCircleIcon,
	CheckIcon,
	ClipboardIcon,
	InfoIcon,
	XCircleIcon,
} from "@phosphor-icons/react";
import {
	CollapsibleRoot,
	CollapsibleTrigger,
	CollapsiblePanel,
} from "@/components/ui/collapsible";
import type { TestOutput } from "@/features/test-panel/types";
import "./console-log.css";
import { Badge } from "@/components/ui/badge";

interface ConsoleLogItemProps {
	output: TestOutput;
	allExpanded?: boolean;
	onCopy: (text: string, id: string) => void;
	copiedId: string | null;
}

type ContentType = { label: string; kind: "json" | "html" | "error" | "text" };
type StatusConfig = { label: string; Icon: React.ComponentType<{ size?: number }> };

const getStatusConfig = (status: TestOutput["status"]): StatusConfig => {
	switch (status) {
		case "success":
			return { label: "Success", Icon: CheckCircleIcon };
		case "error":
			return { label: "Error", Icon: XCircleIcon };
		case "info":
		default:
			return { label: "Info", Icon: InfoIcon };
	}
};

const getContentType = (content: string): ContentType => {
	const trimmed = content.trim();
	if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
		return { label: "JSON", kind: "json" };
	}
	if (trimmed.startsWith("<")) {
		return { label: "HTML", kind: "html" };
	}
	if (trimmed.startsWith("Error") || trimmed.startsWith("TypeError") || trimmed.startsWith("ReferenceError")) {
		return { label: "Error", kind: "error" };
	}
	return { label: "Text", kind: "text" };
};

export const ConsoleLogItem: React.FC<ConsoleLogItemProps> = ({
	output,
	allExpanded = false,
	onCopy,
	copiedId,
}) => {
	const status = getStatusConfig(output.status);
	const contentType = getContentType(output.content);
	const isCopied = copiedId === output.id;
	const StatusIcon = status.Icon;

	return (
		<CollapsibleRoot
			key={output.id}
			className={`console-log-item status-${output.status}`}
			defaultOpen={allExpanded}
		>
			{/* Log Item Header */}
			<CollapsibleTrigger>
				<div className="log-header" aria-label={`${output.title}, ${status.label} result`}>
					<span className="collapsible-icon">
						<CaretRightIcon size={16} />
					</span>
                        <span className="log-title">{output.title}</span>

					<Badge className="">
						<StatusIcon size={12} />
						<span>{status.label}</span>
					</Badge>
				</div>
			</CollapsibleTrigger>

			{/* Log Item Content */}
			<CollapsiblePanel>
				<div className="log-content-header ">
					<span className="log-content-label">Output</span>
					<div className="log-code-header">
						<button
							type="button"
							className={`log-copy-btn ${isCopied ? "is-copied" : ""}`}
							onClick={() => onCopy(output.content, output.id)}
							aria-label={isCopied ? "Copied to clipboard" : `Copy ${output.title} to clipboard`}
							title={isCopied ? "Copied!" : "Copy to clipboard"}
						>
							{isCopied ? <CheckIcon size={14} /> : <ClipboardIcon size={14} />}
						</button>
					</div>
				</div>
				<pre
					className="log-code"
					data-type={contentType.kind}
					aria-label={`Output for ${output.title}`}
				>
					{output.content}
				</pre>
			</CollapsiblePanel>
		</CollapsibleRoot>
	);
};
