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
import { IconCornerDownLeft, IconPlus, IconSquare } from "./Icons";
import { type SuggestionItem, SuggestionPopover } from "./SuggestionPopover";
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputFooter,
	PromptInputTools,
	PromptInputButton,
	PromptInputSubmit,
	type PromptInputMessage,
} from "./PromptInput";
import { ModelSelector } from "./ChatInput/ModelSelector";
import { AgentModeSelector } from "./ChatInput/AgentModeSelector";

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
	// Streaming/Stop props
	isSending?: boolean;
	onStopGeneration?: () => Promise<void>;
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
	// Streaming/Stop props
	isSending = false,
	onStopGeneration,
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

	const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const newValue = e.target.value;
		const cursorPosition = e.target.selectionStart;
		onInputChange(newValue);

		mentions.updateSuggestions(newValue, cursorPosition);
		slashCommands.updateSuggestions(newValue, cursorPosition);
	};

	const handleSendOrStop = useCallback(async () => {
		if (isSending) {
			await onStopGeneration?.();
			return;
		}

		if (input.trim()) {
			onSend(input);
			onInputChange("");
			mentions.close();
			slashCommands.close();
		}
	}, [isSending, input, onSend, onInputChange, onStopGeneration, mentions, slashCommands]);

	const handleSubmit = useCallback(
		(_message: PromptInputMessage) => {
			void handleSendOrStop();
		},
		[handleSendOrStop]
	);

	const selectMention = (item: SuggestionItem) => {
		const triggerIdx = mentions.triggerIndex;
		if (triggerIdx === null) return;

		const before = input.slice(0, triggerIdx);
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

		// Enter to send is handled by PromptInput form submit
	};

	// Reset height when input is cleared externally (e.g. sent)
	useEffect(() => {
		if (input === "" && textareaRef.current) {
			adjustHeight();
		}
	}, [input, adjustHeight]);

	// Determine chat status for submit button
	const chatStatus = isSending ? "streaming" : "idle";

	return (
		<div className="eragear-input-section" style={{ position: "relative" }}>
			{/* Agent Plan Display */}
			{planEntries.length > 0 && (
				<AgentPlan entries={planEntries} onDismiss={onDismissPlan} />
			)}

			{/* Mention Popover */}
			{mentions.isOpen && (
				<SuggestionPopover
					suggestions={mentions.suggestions}
					selectedIndex={mentions.selectedIndex}
					onSelect={selectMention}
					anchorEl={textareaRef.current}
				/>
			)}

			{/* Slash Commands Popover */}
			{slashCommands.isOpen && (
				<SuggestionPopover
					suggestions={slashCommands.suggestions}
					selectedIndex={slashCommands.selectedIndex}
					onSelect={handleSelectSlashCommand}
					anchorEl={textareaRef.current}
				/>
			)}

			<PromptInput
				onSubmit={handleSubmit}
				className=""
			>
				{/* Textarea */}
				<PromptInputTextarea
					ref={textareaRef}
					value={input}
					onChange={handleTextareaChange}
					onKeyDown={handleKeyDown}
					placeholder="Ask anything... (@ to mention, / for commands)"
				/>

				{/* Footer */}
				<PromptInputFooter>
					{/* Left Tools */}
					<PromptInputTools>
						{onTriggerContext && (
							<PromptInputButton
								onClick={onTriggerContext}
								aria-label="Add Context (+)"
							>
								<IconPlus />
							</PromptInputButton>
						)}
					</PromptInputTools>

					{/* Right Tools */}
					<PromptInputTools>
						{/* Model Selector - Shows either Agent models OR API models */}
					<ModelSelector
						activeModelId={activeModelId}
						onModelChange={onModelChange}
						availableModels={availableModels}
						agentModels={agentModels}
						onAgentModelChange={onAgentModelChange}
						isSending={isSending}
					/>
						{/* Agent Mode Selector */}
					<AgentModeSelector
						agentModes={agentModes}
						currentModeId={currentModeId}
						onModeChange={onModeChange!}
						isSending={isSending}
					/>
						{/* Submit/Stop Button */}
						{isSending ? (
							<PromptInputButton
								onClick={() => void handleSendOrStop()}
								aria-label="Stop generation"
								className="eragear-send-button sending"
							>
								<IconSquare />
							</PromptInputButton>
						) : (
							<PromptInputSubmit
								status={chatStatus}
								disabled={!input.trim()}
								aria-label="Send message"
							>
								<IconCornerDownLeft />
							</PromptInputSubmit>
						)}
					</PromptInputTools>
				</PromptInputFooter>
			</PromptInput>
		</div>
	);
};
