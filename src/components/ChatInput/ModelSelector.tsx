import type React from "react";
import { useState } from "react";
import {
	Combobox,
	ComboboxInput,
	ComboboxContent,
	ComboboxList,
	ComboboxItem,
	ComboboxGroup,
	ComboboxLabel,
	ComboboxEmpty,
	ComboboxSeparator,
} from "../ui/combobox";
import { SessionModelState } from "@agentclientprotocol/sdk";

interface ChatModelOption {
	id: string;
	name: string;
	provider: string;
	type: "model" | "agent";
}

interface ModelSelectorProps {
	activeModelId: string;
	onModelChange: (modelId: string) => void;
	availableModels?: ChatModelOption[];
	agentModels?: SessionModelState | null;
	onAgentModelChange?: (modelId: string) => void;
	isSending?: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
	activeModelId,
	onModelChange,
	availableModels = [],
	agentModels,
	onAgentModelChange,
	isSending = false,
}) => {
	const [query, setQuery] = useState("");

	// Show Agent Model Selector if agentModels is provided and has available models
	if (agentModels && agentModels.availableModels.length > 0 && onAgentModelChange) {
		const filteredAgentModels = agentModels.availableModels.filter((m) =>
			m.name.toLowerCase().includes(query.toLowerCase())
		);

		return (
			<Combobox
				value={agentModels.currentModelId}
				onValueChange={(value: string | null) => {
					if (value) {
						onAgentModelChange(value);
						setQuery(""); // Clear query on selection if desired
					}
				}}
				onInputValueChange={setQuery}
				disabled={isSending}
			>
				<ComboboxInput placeholder="Select model..." disabled={isSending} showClear={false} />
				<ComboboxContent>
					<ComboboxList>
						{filteredAgentModels.length > 0 ? (
							filteredAgentModels.map((model) => (
								<ComboboxItem key={model.modelId} value={model.modelId}>
									{model.name}
								</ComboboxItem>
							))
						) : (
							<ComboboxEmpty>No models found</ComboboxEmpty>
						)}
					</ComboboxList>
				</ComboboxContent>
			</Combobox>
		);
	}

	// Show API Model Selector by default
	const allModels = availableModels.filter((m) =>
		m.name.toLowerCase().includes(query.toLowerCase())
	);
	const apiModels = allModels.filter((m) => m.type === "model");
	const localAgents = allModels.filter((m) => m.type === "agent");

	return (
		<Combobox
			value={activeModelId}
			onValueChange={(value: string | null) => {
				if (value) {
					onModelChange(value);
					setQuery("");
				}
			}}
			onInputValueChange={setQuery}
			disabled={availableModels.length === 0 || isSending}
		>
			<ComboboxInput
				placeholder="Select model..."
				disabled={availableModels.length === 0 || isSending}
				showClear
			/>
			<ComboboxContent>
				{allModels.length > 0 ? (
					<ComboboxList>
						{apiModels.length > 0 && (
							<>
								<ComboboxGroup>
									<ComboboxLabel>API Models</ComboboxLabel>
									{apiModels.map((m) => (
										<ComboboxItem key={m.id} value={m.id}>
											{m.name}
										</ComboboxItem>
									))}
								</ComboboxGroup>
								{localAgents.length > 0 && <ComboboxSeparator />}
							</>
						)}
						{localAgents.length > 0 && (
							<ComboboxGroup>
								<ComboboxLabel>Local Agents</ComboboxLabel>
								{localAgents.map((m) => (
									<ComboboxItem key={m.id} value={m.id}>
										{m.name}
									</ComboboxItem>
								))}
							</ComboboxGroup>
						)}
					</ComboboxList>
				) : (
					<ComboboxEmpty>
						{availableModels.length === 0 ? "No models available" : "No results found"}
					</ComboboxEmpty>
				)}
			</ComboboxContent>
		</Combobox>
	);
};
