import type { App } from "obsidian";
import type React from "react";
import { useCallback, useEffect, useRef } from "react";
import type {
	PlanEntry,
	SessionModelState,
} from "../../../../domain/models/session-update";
import { useMentions } from "../../../hooks/useMentions";
import { useSlashCommands } from "../../../hooks/useSlashCommands";
import { AgentPlan } from "./AgentPlan";
import { IconCornerDownLeft, IconPlus } from "./Icons";
import { type SuggestionItem, SuggestionPopover } from "./SuggestionPopover";
import {
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectTrigger,
	SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface ChatModelOption {
	id: string;
	name: string;
	provider: string;
	type: "model" | "agent";
}

interface AgentMode {
	id: string;
	name: string;
	description?: string;
	isCurrent?: boolean;
}

interface ChatInputProps {
	input: string;
	onInputChange: (input: string) => void;
	onSend: (message: string) => void;
	onTriggerContext?: () => void;
	activeModelId: string;
	onModelChange: (modelId: string) => void;
	availableModels?: ChatModelOption[];
	app: App;
	slashCommandsList?: SuggestionItem[];
	onAutoMentionToggle?: (disabled: boolean) => void;
	// Agent mode props
	agentModes?: AgentMode[];
	currentModeId?: string;
	onModeChange?: (modeId: string) => void;
	// Agent model props (experimental - for agents that support model selection)
	agentModels?: SessionModelState | null;
	onAgentModelChange?: (modelId: string) => void;
	// Agent plan props
	planEntries?: PlanEntry[];
	onDismissPlan?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
	input,
	onInputChange,
	onSend,
	onTriggerContext,
	activeModelId,
	onModelChange,
	availableModels = [],
	app,
	slashCommandsList,
	onAutoMentionToggle,
	// Agent mode props
	agentModes = [],
	currentModeId = "",
	onModeChange,
	// Agent model props (experimental)
	agentModels,
	onAgentModelChange,
	// Agent plan props
	planEntries = [],
	onDismissPlan,
}) => {
	// biome-ignore lint/style/noNonNullAssertion: Ref is always attached
	const textareaRef = useRef<HTMLTextAreaElement>(null!);

	const mentions = useMentions({ app });
	const slashCommands = useSlashCommands({
		commands: slashCommandsList,
		onAutoMentionToggle,
	});

	const adjustHeight = useCallback(() => {
		if (textareaRef.current) {
			textareaRef.current.style.height = "auto";
			textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
		}
	}, []);

	// Trigger height adjustment when input updates (e.g. from speech)
	useEffect(() => {
		adjustHeight();
	}, [adjustHeight]);

	const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value;
		const cursorPosition = e.target.selectionStart;
		onInputChange(newValue);

		mentions.updateSuggestions(newValue, cursorPosition);
		slashCommands.updateSuggestions(newValue, cursorPosition);
	};

	const handleSend = () => {
		if (input.trim()) {
			onSend(input);
			onInputChange("");
			mentions.close();
			slashCommands.close();
			// Reset height handled by useEffect
		}
	};

	const selectMention = (item: SuggestionItem) => {
		const triggerIdx = mentions.triggerIndex;
		if (triggerIdx === null) return;

		const before = input.slice(0, triggerIdx);
		// User format: @[[Note Name]]
		const insertion = `@[[${item.label}]] `;

		const afterAt = input.slice(triggerIdx + 1);
		const nextSpace = afterAt.search(/[\s\n]/);
		const endReplace =
			nextSpace === -1 ? input.length : triggerIdx + 1 + nextSpace;

		const after = input.slice(endReplace);
		const newValue = `${before}${insertion}${after}`;

		onInputChange(newValue);
		mentions.close();

		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus();
				const newCursor = before.length + insertion.length;
				textareaRef.current.setSelectionRange(newCursor, newCursor);
			}
		}, 0);
	};

	const handleSelectSlashCommand = (item: SuggestionItem) => {
		const newValue = `${item.label} `;
		onInputChange(newValue);
		slashCommands.close();

		setTimeout(() => {
			if (textareaRef.current) {
				textareaRef.current.focus();
				textareaRef.current.setSelectionRange(newValue.length, newValue.length);
			}
		}, 0);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		const isMentionActive = mentions.isOpen;
		const isSlashActive = slashCommands.isOpen;

		if (isMentionActive || isSlashActive) {
			if (e.key === "ArrowDown") {
				e.preventDefault();
				if (isSlashActive) slashCommands.navigate("down");
				else mentions.navigate("down");
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				if (isSlashActive) slashCommands.navigate("up");
				else mentions.navigate("up");
				return;
			}
			if (e.key === "Enter" || e.key === "Tab") {
				e.preventDefault();
				if (isSlashActive) {
					const item = slashCommands.select();
					if (item) handleSelectSlashCommand(item);
				} else {
					const item = mentions.select();
					if (item) selectMention(item);
				}
				return;
			}
			if (e.key === "Escape") {
				e.preventDefault();
				mentions.close();
				slashCommands.close();
				return;
			}
		}

		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	// Reset height when input is cleared externally (e.g. sent)
	useEffect(() => {
		if (input === "" && textareaRef.current) {
			adjustHeight();
		}
	}, [input, adjustHeight]);

	return (
		<div className="eragear-input-section" style={{ position: "relative" }}>
			{/* Agent Plan Display */}
			{planEntries.length > 0 && (
				<AgentPlan entries={planEntries} onDismiss={onDismissPlan} />
			)}

			{/* Popovers */}
			{mentions.isOpen && (
				<SuggestionPopover
					suggestions={mentions.suggestions}
					selectedIndex={mentions.selectedIndex}
					onSelect={selectMention}
					position={{ bottom: "100%", left: 0, marginBottom: "8px" }}
				/>
			)}
			{slashCommands.isOpen && (
				<SuggestionPopover
					suggestions={slashCommands.suggestions}
					selectedIndex={slashCommands.selectedIndex}
					onSelect={handleSelectSlashCommand}
					position={{ bottom: "100%", left: 0, marginBottom: "8px" }}
				/>
			)}

			<Card className={`eragear-chat-input-wrapper`}>
				<textarea
					ref={textareaRef}
					className="eragear-chat-input-textarea"
					placeholder={"Ask anything... (@ to mention, / for commands)"}
					value={input}
					onChange={handleInput}
					onKeyDown={handleKeyDown}
					rows={1}
				/>

				<div className="eragear-chat-input-footer">
					<div className="eragear-chat-input-left">
						{onTriggerContext && (
							<Button
								type="button"
								size="icon"
								variant="ghost"
								onClick={onTriggerContext}
								title="Add Context (+)"
							>
								<IconPlus />
							</Button>
						)}
					</div>

					<div className="eragear-chat-input-right">
						{/* Model Selector - Shows either Agent models OR API models, not both */}
						{agentModels &&
						agentModels.availableModels.length > 0 &&
						onAgentModelChange ? (
							// Agent Model Selector - When agent provides models
							<div
								className="eragear-model-selector-wrapper"
								title="Agent Model"
							>
								<Select
									value={agentModels.currentModelId}
									onValueChange={(val) => val && onAgentModelChange(val)}
								>
									<SelectTrigger className="w-full">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{agentModels.availableModels.map((model) => (
											<SelectItem key={model.modelId} value={model.modelId}>
												{model.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						) : (
							// API Model Selector - Default when no agent models
							<Select
								value={activeModelId}
								onValueChange={(val) => val && onModelChange(val)}
								disabled={availableModels.length === 0}
							>
								<SelectTrigger className="w-[180px]">
									<SelectValue>Select Model</SelectValue>
								</SelectTrigger>
								<SelectContent>
									{availableModels.length > 0 ? (
										<>
											{/* Group: API Models */}
											{availableModels.filter((m) => m.type === "model")
												.length > 0 && (
												<SelectGroup>
													<SelectLabel>API Models</SelectLabel>
													{availableModels
														.filter((m) => m.type === "model")
														.map((m) => (
															<SelectItem key={m.id} value={m.id}>
																{m.name}
															</SelectItem>
														))}
												</SelectGroup>
											)}
											{/* Group: Local Agents */}
											{availableModels.filter((m) => m.type === "agent")
												.length > 0 && (
												<SelectGroup>
													<SelectLabel>Local Agents</SelectLabel>
													{availableModels
														.filter((m) => m.type === "agent")
														.map((m) => (
															<SelectItem key={m.id} value={m.id}>
																{m.name}
															</SelectItem>
														))}
												</SelectGroup>
											)}
										</>
									) : (
										<SelectItem value="" disabled>
											No models configured
										</SelectItem>
									)}
								</SelectContent>
							</Select>
						)}

						{/* Agent Mode Selector - Only shown when agent has modes */}
						{agentModes.length > 0 && onModeChange && (
							<Select
								value={currentModeId}
								onValueChange={(val) => val && onModeChange(val)}
							>
								<SelectTrigger className="w-[140px]" title="Agent Mode">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{agentModes.map((mode) => (
										<SelectItem key={mode.id} value={mode.id}>
											{mode.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}

						<Button
							type="button"
							className={`eragear-btn-icon`}
							onClick={handleSend}
							disabled={!input.trim()}
							title="Send"
							size="icon"
							variant="default"
						>
							<IconCornerDownLeft />
						</Button>
					</div>
				</div>
			</Card>
		</div>
	);
};
