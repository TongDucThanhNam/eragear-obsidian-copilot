import type React from "react";
import { useEffect, useRef, useState } from "react";
import { Popover } from "@base-ui/react/popover";

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
	anchorEl?: HTMLElement | null;
}

export const SuggestionPopover: React.FC<SuggestionPopoverProps> = ({
	suggestions,
	selectedIndex,
	onSelect,
	anchorEl,
}) => {
	const listRef = useRef<HTMLUListElement>(null);
	const [open, setOpen] = useState(true);

	useEffect(() => {
		if (listRef.current) {
			const selectedEl = listRef.current.children[selectedIndex] as HTMLElement;
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex]);

	if (suggestions.length === 0) {
		setOpen(false);
		return null;
	}

	const handleSelect = (item: SuggestionItem) => {
		onSelect(item);
		setOpen(false);
	};

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Portal>
				<Popover.Positioner
					anchor={anchorEl}
					side="top"
					sideOffset={8}
					style={{
						zIndex: 1000,
					}}
				>
					<Popover.Popup
						style={{
							background: "var(--background-secondary)",
							border: "1px solid var(--background-modifier-border)",
							borderRadius: "6px",
							boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
							marginBottom: "8px",
							padding: 0,
							outline: "none",
						}}
					>
						<Popover.Viewport
							style={{
								width: "300px",
								maxHeight: "250px",
								overflowY: "auto",
							}}
						>
							<ul
								ref={listRef}
								style={{
									listStyle: "none",
									margin: 0,
									padding: 0,
								}}
							>
								{suggestions.map((item, index) => (
									<li
										key={item.id}
										onClick={() => handleSelect(item)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												handleSelect(item);
												e.preventDefault();
											}
										}}
										role="button"
										tabIndex={0}
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
											transition: "background-color 0.2s ease",
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
												flexShrink: 0,
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
						</Popover.Viewport>
					</Popover.Popup>
				</Popover.Positioner>
			</Popover.Portal>
		</Popover.Root>
	);
};
