import type { TFile } from "obsidian";
import type React from "react";
import { useEffect, useRef } from "react";

interface SuggestionPopoverProps {
	suggestions: TFile[];
	selectedIndex: number;
	onSelect: (file: TFile) => void;
	position: { top: number | string; left: number | string };
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
	suggestions,
	selectedIndex,
	onSelect,
	position,
}) => {
	const listRef = useRef<HTMLUListElement>(null);

	useEffect(() => {
		if (listRef.current) {
			const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex]);

	if (suggestions.length === 0) return null;

	return (
		<div
			className="suggestion-popover"
			style={{
				position: "absolute",
				bottom: "100%", // Position above input
				width: "300px",
				maxHeight: "200px",
				overflowY: "auto",
				background: "var(--background-secondary)",
				border: "1px solid var(--background-modifier-border)",
				borderRadius: "4px",
				boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
				zIndex: 1000,
				...position,
			}}
		>
			<ul ref={listRef} style={{ listStyle: "none", margin: 0, padding: 0 }}>
				{suggestions.map((file, index) => (
					<li
						key={file.path}
						onClick={() => onSelect(file)}
						style={{
							padding: "8px 12px",
							cursor: "pointer",
							background:
								index === selectedIndex
									? "var(--background-modifier-hover)"
									: "transparent",
							display: "flex",
							alignItems: "center",
							gap: "8px",
							fontSize: "0.9em",
						}}
					>
						<span style={{ fontSize: "1.2em" }}>📄</span>
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
							}}
						>
							<span
								style={{
									fontWeight: 500,
									whiteSpace: "nowrap",
									textOverflow: "ellipsis",
									overflow: "hidden",
								}}
							>
								{file.basename}
							</span>
							<span
								style={{
									fontSize: "0.80em",
									color: "var(--text-muted)",
									whiteSpace: "nowrap",
									textOverflow: "ellipsis",
									overflow: "hidden",
								}}
							>
								{file.path}
							</span>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
};
