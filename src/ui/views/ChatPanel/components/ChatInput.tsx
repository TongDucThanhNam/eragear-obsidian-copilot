import type React from "react";
import { useEffect, useRef } from "react";

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

	return (
		<div
			className="eragear-input-container"
			style={{
				borderTop: "1px solid var(--background-modifier-border)",
				padding: "12px",
				background: "var(--background-primary)",
				display: "flex",
				flexDirection: "column",
				gap: "8px",
			}}
		>
			{/* Input Area */}
			<div
				className="eragear-input-wrapper"
				style={{
					position: "relative",
					background: "var(--background-primary-alt)",
					border: "1px solid var(--background-modifier-border)",
					borderRadius: "8px",
					padding: "8px 8px 40px 8px", // Extra padding bottom for footer items if absolute, or just normal padding
					// Actually, let's keep input clean and put controls BELOW distinctively or inside?
					// Obsidian Copilot style: Input is a box. Footer controls are inside or right below.
					// Let's try: Input box contains the text.
					// A separate "toolbar" line below it? Or inside the box at the bottom?
					// Let's put text on top, and a toolbar row at the bottom INSIDE the border for a unified look,
					// or just standard "Input on top", "Toolbar below" logic.
					// Let's go with: Container > Textarea (auto grow) > Toolbar Row
				}}
			>
				<textarea
					ref={inputRef}
					value={input}
					onChange={handleChange}
					onKeyDown={onKeyDown}
					placeholder="Ask AI or type @ for context..."
					className="eragear-input"
					rows={1}
					style={{
						width: "100%",
						background: "transparent",
						border: "none",
						resize: "none",
						outline: "none",
						minHeight: "24px",
						maxHeight: "300px",
						lineHeight: "1.5",
					}}
				/>
			</div>

			{/* Footer / Toolbar */}
			<div
				className="eragear-input-footer"
				style={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					marginTop: "-4px", // Pull it up a bit if separate, or keep separate
				}}
			>
				<div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
					{/* Model Selector */}
					{onModelChange && (
						<select
							value={selectedModel}
							onChange={(e) => onModelChange(e.target.value)}
							style={{
								background: "var(--background-modifier-form-field)",
								border: "1px solid var(--background-modifier-border)",
								borderRadius: "4px",
								fontSize: "0.8em",
								padding: "2px 8px",
								maxWidth: "120px",
								textOverflow: "ellipsis",
							}}
						>
							{availableModels.length > 0 ? (
								availableModels.map((m) => (
									<option key={m} value={m}>
										{m}
									</option>
								))
							) : (
								<option value={selectedModel}>{selectedModel}</option>
							)}
						</select>
					)}

					{/* Context Button */}
					<button
						type="button"
						onClick={onTriggerContext}
						className="eragear-icon-btn"
						title="Add Context (@)"
						style={{
							background: "none",
							border: "none",
							cursor: "pointer",
							fontSize: "1.2em",
							padding: "4px",
							opacity: 0.7,
						}}
					>
						＠
					</button>
				</div>

				{/* Send Button */}
				<button
					type="button"
					onClick={onSendMessage}
					disabled={!input.trim() || isLoading}
					className="eragear-send-btn"
					title="Send Message"
					style={{
						background: input.trim()
							? "var(--interactive-accent)"
							: "var(--background-modifier-border)",
						color: "var(--text-on-accent)",
						border: "none",
						borderRadius: "4px",
						padding: "4px 12px",
						cursor: input.trim() ? "pointer" : "not-allowed",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}
				>
					<svg
						style={{ width: "16px", height: "16px", fill: "currentColor" }}
						viewBox="0 0 24 24"
					>
						<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
					</svg>
				</button>
			</div>
		</div>
	);
};
