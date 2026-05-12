import type React from "react";
import type { OutputUpdate } from "@/core/models/session-update";
import {
	IconBug,
	IconInfo,
	IconNote,
	IconWarning,
} from "@/components/ui/Icons";

export interface OutputMessageProps {
	output: OutputUpdate;
}

const getOutputIcon = (type: OutputUpdate["outputType"]) => {
	switch (type) {
		case "error":
			return <IconBug />;
		case "warning":
			return <IconWarning />;
		case "info":
			return <IconInfo />;
		case "debug":
			return <IconBug />;
		default:
			return <IconNote />;
	}
};

export const OutputMessage: React.FC<OutputMessageProps> = ({ output }) => {
	const { outputType, text } = output;

	return (
		<div className={`output-message output-${outputType}`}>
			<span className="output-message-icon" aria-hidden="true">
				{getOutputIcon(outputType)}
			</span>
			<span className="output-message-text">{text}</span>
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
		<div className="output-list">
			{displayOutputs.map((output, idx) => (
				<OutputMessage key={idx} output={output} />
			))}
		</div>
	);
};

export default OutputMessage;
