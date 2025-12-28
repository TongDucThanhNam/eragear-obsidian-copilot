import type React from "react";
import { useEffect, useRef } from "react";

interface ChatInputProps {
	input: string;
	isLoading: boolean;
	onInputChange: (value: string) => void;
	onSendMessage: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
	shouldFocus?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
	input,
	isLoading,
	onInputChange,
	onSendMessage,
	onKeyDown,
	shouldFocus,
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
		<div className="eragear-input-area">
			<textarea
				ref={inputRef}
				value={input}
				onChange={handleChange}
				onKeyDown={onKeyDown}
				placeholder="Ask AI or type / for commands..."
				className="eragear-input"
				rows={1}
			/>
			<button
				type="button"
				onClick={onSendMessage}
				disabled={!input.trim() || isLoading}
				className="eragear-send-btn"
				title="Send Message"
			>
				<svg className="eragear-send-icon" viewBox="0 0 24 24">
					<title>Send</title>
					<path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
				</svg>
			</button>
		</div>
	);
};
