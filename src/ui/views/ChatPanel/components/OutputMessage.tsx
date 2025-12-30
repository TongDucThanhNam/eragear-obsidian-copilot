import type React from "react";
import type { OutputUpdate } from "../../../../domain/models/session-update";

export interface OutputMessageProps {
	output: OutputUpdate;
}

const getOutputStyle = (type: OutputUpdate["outputType"]) => {
	switch (type) {
		case "error":
			return {
				bg: "rgba(255, 0, 0, 0.1)",
				color: "var(--color-red)",
				icon: "❌",
			};
		case "warning":
			return {
				bg: "rgba(255, 200, 0, 0.1)",
				color: "var(--color-yellow)",
				icon: "⚠️",
			};
		case "info":
			return {
				bg: "rgba(0, 100, 255, 0.1)",
				color: "var(--color-blue)",
				icon: "ℹ️",
			};
		case "debug":
			return {
				bg: "rgba(128, 128, 128, 0.1)",
				color: "var(--text-muted)",
				icon: "🔍",
			};
		default:
			return {
				bg: "var(--background-secondary)",
				color: "var(--text-normal)",
				icon: "📝",
			};
	}
};

export const OutputMessage: React.FC<OutputMessageProps> = ({ output }) => {
	const { outputType, text } = output;
	const style = getOutputStyle(outputType);

	return (
		<div
			className={`output-message output-${outputType}`}
			style={{
				display: "flex",
				alignItems: "flex-start",
				gap: "8px",
				padding: "8px 12px",
				borderRadius: "6px",
				backgroundColor: style.bg,
				marginBottom: "4px",
				fontSize: "0.85rem",
			}}
		>
			<span>{style.icon}</span>
			<span style={{ color: style.color, flex: 1, wordBreak: "break-word" }}>
				{text}
			</span>
		</div>
	);
};

export interface OutputListProps {
	outputs: OutputUpdate[];
	maxItems?: number;
}

export const OutputList: React.FC<OutputListProps> = ({
	outputs,
	maxItems = 10,
}) => {
	if (outputs.length === 0) return null;

	const displayOutputs = outputs.slice(-maxItems);

	return (
		<div
			className="output-list"
			style={{ display: "flex", flexDirection: "column", gap: "4px" }}
		>
			{displayOutputs.map((output, idx) => (
				<OutputMessage key={idx} output={output} />
			))}
		</div>
	);
};

export default OutputMessage;
