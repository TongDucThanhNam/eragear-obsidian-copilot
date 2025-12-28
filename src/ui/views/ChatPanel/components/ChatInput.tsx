import type React from "react";
import { useEffect, useRef } from "react";
import { IconAt, IconChevronDown, IconSend } from "./Icons";

interface ChatInputProps {
	input: string;
	isLoading: boolean;
	onInputChange: (value: string) => void;
	onSendMessage: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	/* New props for UI Refinement */
	selectedModel?: string;
	onModelChange?: (model: string) => void;
	availableModels?: string[];
	onTriggerContext?: () => void;
	contextMenu?: React.ReactNode;
	shouldFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
	input,
	isLoading,
	onInputChange,
	onSendMessage,
	onKeyDown,
	shouldFocus,
	selectedModel,
	onModelChange,
	availableModels = [],
	onTriggerContext,
	contextMenu,
}) => {
	const inputRef = useRef<HTMLTextAreaElement>(null);

	useEffect(() => {
		if (shouldFocus && inputRef.current) {
			inputRef.current.focus();
		}
	}, [shouldFocus]);

	const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		const val = e.target.value;
		onInputChange(val);

		// Auto-resize
		e.target.style.height = "auto";
		e.target.style.height = `${e.target.scrollHeight}px`;
	};

	// Reset height when input is cleared externally (e.g. sent)
	useEffect(() => {
		if (input === "" && inputRef.current) {
			inputRef.current.style.height = "auto";
		}
	}, [input]);

	// Handle model select
	const handleModelSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
		if (onModelChange) {
			onModelChange(e.target.value);
		}
	};

	return (
		<div className="eragear-input-section">
			<div className="eragear-input-box">
				<textarea
					ref={inputRef}
					value={input}
					onChange={handleChange}
					onKeyDown={onKeyDown}
					placeholder="Ask AI or type @ for context..."
					className="eragear-input-textarea"
					rows={1}
				/>

				<div className="eragear-input-footer">
					<div className="eragear-model-selector">
						<div
							className="eragear-model-badge"
							style={{ position: "relative" }}
						>
							{/* Hacky select overlay for now, or just use native select styled */}
							<span>{selectedModel}</span>
							<IconChevronDown />
							{onModelChange && (
								<select
									value={selectedModel}
									onChange={handleModelSelect}
									style={{
										position: "absolute",
										top: 0,
										left: 0,
										width: "100%",
										height: "100%",
										opacity: 0,
										cursor: "pointer",
									}}
								>
									{availableModels.map((m) => (
										<option key={m} value={m}>
											{m}
										</option>
									))}
								</select>
							)}
						</div>

						{/* Context Menu Slot or Default Button */}
						{contextMenu ||
							(onTriggerContext && (
								<button
									type="button"
									className="eragear-context-btn-footer"
									onClick={onTriggerContext}
									title="Add Context"
								>
									<IconAt />
								</button>
							))}
					</div>

					<button
						type="button"
						onClick={onSendMessage}
						disabled={!input.trim() || isLoading}
						className={`eragear-footer-send-btn ${input.trim() ? "active" : ""}`}
						title="Send Message"
					>
						<IconSend />
					</button>
				</div>
			</div>
		</div>
	);
};
