import { useState, useCallback, useEffect } from "react";
import type { SuggestionItem } from "../views/ChatPanel/components/SuggestionPopover";

export interface UseSlashCommandsReturn {
	isOpen: boolean;
	suggestions: SuggestionItem[];
	selectedIndex: number;
	navigate: (direction: "up" | "down") => void;
	select: () => SuggestionItem | null;
	updateSuggestions: (input: string, cursorIndex: number) => void;
	close: () => void;
}

export interface UseSlashCommandsProps {
	commands?: SuggestionItem[];
	onAutoMentionToggle?: (disabled: boolean) => void;
}

export const useSlashCommands = ({
	commands,
	onAutoMentionToggle,
}: UseSlashCommandsProps = {}): UseSlashCommandsReturn => {
	const [isOpen, setIsOpen] = useState(false);
	const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
	const [selectedIndex, setSelectedIndex] = useState(0);

	// Static list of commands for fallback
	const DEFAULT_COMMANDS: SuggestionItem[] = [
		{
			type: "action",
			label: "/clear",
			id: "cmd_clear",
			desc: "Clear chat history",
		},
		{
			type: "action",
			label: "/model",
			id: "cmd_model",
			desc: "Switch AI model",
		},
		{
			type: "action",
			label: "/notes",
			id: "cmd_notes",
			desc: "Search notes contexts",
		},
		{
			type: "action",
			label: "/edit",
			id: "cmd_edit",
			desc: "Edit active file",
		},
	];

	const [activeCommands, setActiveCommands] = useState<SuggestionItem[]>([
		// ...DEFAULT_COMMANDS,
		...(commands || []),
	]);

	useEffect(() => {
		console.log("useEffect commands:", commands);
		setActiveCommands([...DEFAULT_COMMANDS, ...(commands || [])]);
	}, [commands]);

	const close = useCallback(() => {
		setIsOpen(false);
		setSelectedIndex(0);
		onAutoMentionToggle?.(false);
	}, [onAutoMentionToggle]);

	const updateSuggestions = useCallback(
		(input: string, cursorIndex: number) => {
			// Slash command must be at the start of the line or input
			if (!input.startsWith("/")) {
				if (isOpen) close();
				return;
			}

			// Filter commands
			const query = input.slice(1).toLowerCase();
			if (input.includes(" ")) {
				if (isOpen) close();
				return;
			}

			const filtered = activeCommands.filter((cmd) =>
				cmd.label.toLowerCase().startsWith(`/${query}`),
			);

			if (filtered.length > 0) {
				setSuggestions(filtered);
				if (!isOpen) {
					setIsOpen(true);
					onAutoMentionToggle?.(true);
					setSelectedIndex(0);
				}
			} else {
				if (isOpen) close();
			}
		},
		[activeCommands, close, isOpen, onAutoMentionToggle],
	);

	const navigate = useCallback(
		(direction: "up" | "down") => {
			if (!isOpen) return;
			setSelectedIndex((prev) => {
				if (direction === "up") {
					return prev > 0 ? prev - 1 : suggestions.length - 1;
				}
				return prev < suggestions.length - 1 ? prev + 1 : 0;
			});
		},
		[isOpen, suggestions.length],
	);

	const select = useCallback(() => {
		if (!isOpen || suggestions.length === 0) return null;
		return suggestions[selectedIndex] || null;
	}, [isOpen, suggestions, selectedIndex]);

	return {
		isOpen,
		suggestions,
		selectedIndex,
		navigate,
		select,
		updateSuggestions,
		close,
	};
};
