import type React from "react";

interface SlashCommandMenuProps {
	onCommandSelect: (command: string) => void;
}

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
	onCommandSelect,
}) => {
	return (
		<div className="eragear-slash-menu">
			<div className="slash-menu-header">Commands</div>
			<button
				type="button"
				className="slash-menu-item"
				onClick={() => onCommandSelect("/edit")}
			>
				<span className="slash-command-name">/edit</span>
				<span className="slash-command-desc">
					Insert code suggestion in editor
				</span>
			</button>
			<button
				type="button"
				className="slash-menu-item"
				onClick={() => onCommandSelect("/notes")}
			>
				<span className="slash-command-name">/notes</span>
				<span className="slash-command-desc">Search and reference notes</span>
			</button>
		</div>
	);
};
