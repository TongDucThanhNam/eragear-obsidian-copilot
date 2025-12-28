import type React from "react";
import { useEffect, useRef } from "react";

export interface SuggestionItem {
	type: "file" | "folder" | "action" | "category";
	label: string;
	icon?: React.ReactNode;
	id: string; // path or unique identifier
	desc?: string; // specific filtered path or extra info
	data?: any; // Original object (TFile, etc)
}

interface SuggestionPopoverProps {
	suggestions: SuggestionItem[];
	selectedIndex: number;
	onSelect: (item: SuggestionItem) => void;
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
				maxHeight: "250px",
				overflowY: "auto",
				background: "var(--background-secondary)",
				border: "1px solid var(--background-modifier-border)",
				borderRadius: "6px",
				boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
				zIndex: 1000,
				marginBottom: "8px",
				...position,
			}}
		>
			<ul ref={listRef} style={{ listStyle: "none", margin: 0, padding: 0 }}>
				{suggestions.map((item, index) => (
					<li
						key={item.id}
						onClick={() => onSelect(item)}
						style={{
							padding: "8px 12px",
							cursor: "pointer",
							background:
								index === selectedIndex
									? "var(--background-modifier-hover)"
									: "transparent",
							display: "flex",
							alignItems: "center",
							gap: "10px",
							fontSize: "0.9em",
							borderBottom:
								index < suggestions.length - 1
									? "1px solid var(--background-modifier-border-hover)" // lighter separator
									: "none", // Avoid for last
							// But cleaner look usually has no borders or very subtle ones for items.
							// Let's remove borderBottom actually, standard dropdown style.
						}}
					>
						{/* Icon Slot */}
						<span
							style={{
								display: "flex",
								alignItems: "center",
								color: "var(--text-muted)",
								width: "16px",
								justifyContent: "center",
							}}
						>
							{item.icon || (item.type === "file" ? "📄" : "•")}
						</span>

						{/* Content */}
						<div
							style={{
								display: "flex",
								flexDirection: "column",
								overflow: "hidden",
								flex: 1,
							}}
						>
							<span
								style={{
									fontWeight: 500,
									color: "var(--text-normal)",
									whiteSpace: "nowrap",
									textOverflow: "ellipsis",
									overflow: "hidden",
								}}
							>
								{item.label}
							</span>
							{item.desc && (
								<span
									style={{
										fontSize: "0.85em",
										color: "var(--text-muted)",
										whiteSpace: "nowrap",
										textOverflow: "ellipsis",
										overflow: "hidden",
									}}
								>
									{item.desc}
								</span>
							)}
						</div>
					</li>
				))}
			</ul>
		</div>
	);
};
