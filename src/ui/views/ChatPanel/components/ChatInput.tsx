import React, { useEffect, useRef, useCallback, useState } from "react";
import type { App } from "obsidian";
import { useMentions } from "../../../hooks/useMentions";
import { useSlashCommands } from "../../../hooks/useSlashCommands";
import { SuggestionPopover, type SuggestionItem } from "./SuggestionPopover";
import {
	IconSend,
	IconPlus,
	IconSearch,
	IconMic,
	IconCornerDownLeft,
	IconSquare,
} from "./Icons";

// Speech Recognition Type Definition
interface SpeechRecognition extends EventTarget {
	continuous: boolean;
	interimResults: boolean;
	lang: string;
	start(): void;
	stop(): void;
	onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
	onend: ((this: SpeechRecognition, ev: Event) => void) | null;
	onresult:
		| ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void)
		| null;
	onerror:
		| ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void)
		| null;
}

interface SpeechRecognitionEvent extends Event {
	results: SpeechRecognitionResultList;
	resultIndex: number;
}

interface SpeechRecognitionResultList {
	readonly length: number;
	item(index: number): SpeechRecognitionResult;
	[index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
	readonly length: number;
	item(index: number): SpeechRecognitionAlternative;
	[index: number]: SpeechRecognitionAlternative;
	isFinal: boolean;
}

interface SpeechRecognitionAlternative {
	transcript: string;
	confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
	error: string;
}

interface ChatInputProps {
	input: string;
	onInputChange: (input: string) => void;
	onSend: (message: string) => void;
	onTriggerContext?: () => void;
	activeModelId: string;
	onModelChange: (modelId: string) => void;
	app: App;
	slashCommandsList?: SuggestionItem[];
	onAutoMentionToggle?: (disabled: boolean) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
	input,
	onInputChange,
	onSend,
	onTriggerContext,
	activeModelId,
	onModelChange,
	app,
	slashCommandsList,
	onAutoMentionToggle,
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

			<div className={`eragear-chat-input-wrapper`}>
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
							<button
								type="button"
								className="eragear-btn-icon eragear-btn-ghost"
								onClick={onTriggerContext}
								title="Add Context (+)"
							>
								<IconPlus />
							</button>
						)}
					</div>

					<div className="eragear-chat-input-right">
						<select
							className="eragear-model-selector"
							value={activeModelId}
							onChange={(e) => onModelChange(e.target.value)}
						>
							<option value="gemini-1.5-pro">Claude 3.5 Sonnet</option>
							<option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
						</select>

						<button
							type="button"
							className={`eragear-btn-icon`}
							onClick={handleSend}
							disabled={!input.trim()}
							title="Send"
						>
							<IconCornerDownLeft />
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};
