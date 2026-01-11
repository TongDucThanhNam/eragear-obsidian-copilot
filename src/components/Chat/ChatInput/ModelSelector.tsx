import type React from "react";
import { useEffect, useState } from "react";
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
} from "../../ui/combobox";
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
	const [isOpen, setIsOpen] = useState(false);
	const hasAgentSelector = Boolean(
		agentModels && agentModels.availableModels.length > 0 && onAgentModelChange
	);
	const selectedAgentName = hasAgentSelector
		? agentModels?.availableModels.find((model) => model.modelId === agentModels.currentModelId)?.name
		: undefined;
	const selectedModelName = !hasAgentSelector
		? availableModels.find((model) => model.id === activeModelId)?.name
		: undefined;

	useEffect(() => {
		if (!isOpen) {
			setQuery(selectedAgentName ?? selectedModelName ?? "");
		}
	}, [isOpen, selectedAgentName, selectedModelName]);

	// Show Agent Model Selector if agentModels is provided and has available models
	if (hasAgentSelector && agentModels) {
		const normalizedQuery = query.trim().toLowerCase();
		const effectiveQuery =
			selectedAgentName && normalizedQuery === selectedAgentName.toLowerCase()
				? ""
				: normalizedQuery;
		const filteredAgentModels = agentModels.availableModels.filter((m) =>
			m.name.toLowerCase().includes(effectiveQuery)
		);

		return (
			<div className="model-selector">
				<Combobox
					value={agentModels.currentModelId}
					inputValue={query}
					onValueChange={(value: string | null) => {
						if (value) {
							onAgentModelChange?.(value);
							const selectedName = agentModels.availableModels.find(
								(model) => model.modelId === value
							)?.name;
							setQuery(selectedName ?? "");
						}
					}}
					onOpenChange={(open: boolean) => {
						setIsOpen(open);
						if (open) {
							setQuery("");
						} else {
							setQuery(selectedAgentName ?? "");
						}
					}}
					onInputValueChange={setQuery}
					disabled={isSending}
				>
					<ComboboxInput
						className="model-selector-input"
						placeholder="Select model..."
						disabled={isSending}
						showClear={false}
					/>
					<ComboboxContent className="model-selector-content">
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
			</div>
		);
	}

	// Show API Model Selector by default
	const normalizedQuery = query.trim().toLowerCase();
	const effectiveQuery =
		selectedModelName && normalizedQuery === selectedModelName.toLowerCase()
			? ""
			: normalizedQuery;
	const allModels = availableModels.filter((m) => m.name.toLowerCase().includes(effectiveQuery));
	const apiModels = allModels.filter((m) => m.type === "model");
	const localAgents = allModels.filter((m) => m.type === "agent");

	return (
		<div className="model-selector">
			<Combobox
				value={activeModelId}
				inputValue={query}
				onValueChange={(value: string | null) => {
					if (value) {
						onModelChange(value);
						const selectedName = availableModels.find((model) => model.id === value)?.name;
						setQuery(selectedName ?? "");
					}
				}}
				onOpenChange={(open: boolean) => {
					setIsOpen(open);
					if (open) {
						setQuery("");
					} else {
						setQuery(selectedModelName ?? "");
					}
				}}
				onInputValueChange={setQuery}
				disabled={availableModels.length === 0 || isSending}
			>
				<ComboboxInput
					className="model-selector-input"
					placeholder="Select model..."
					disabled={availableModels.length === 0 || isSending}
					showClear
				/>
				<ComboboxContent className="model-selector-content">
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
		</div>
	);
};
