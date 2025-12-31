import type React from "react";
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
} from "@/components/ui/combobox";

interface AgentMode {
	id: string;
	name: string;
	description?: string;
	isCurrent?: boolean;
}

interface AgentModeSelectorProps {
	agentModes: AgentMode[];
	currentModeId: string;
	onModeChange: (modeId: string) => void;
	isSending?: boolean;
}

export const AgentModeSelector: React.FC<AgentModeSelectorProps> = ({
	agentModes,
	currentModeId,
	onModeChange,
	isSending = false,
}) => {
	// Only render if there are modes available
	if (agentModes.length === 0) {
		return null;
	}

	return (
		<Combobox
			value={currentModeId}
			onValueChange={(value: string | null) => {
				if (value) {
					onModeChange(value);
				}
			}}
			disabled={isSending}
		>
			<ComboboxInput placeholder="Select mode..." disabled={isSending} showClear />
			<ComboboxContent>
				<ComboboxList>
					{agentModes.map((mode) => (
						<ComboboxItem key={mode.id} value={mode.id}>
							<div className="flex flex-col gap-0.5">
								<div className="font-medium">{mode.name}</div>
								{mode.description && (
									<div className="text-xs opacity-60">{mode.description}</div>
								)}
							</div>
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
};
