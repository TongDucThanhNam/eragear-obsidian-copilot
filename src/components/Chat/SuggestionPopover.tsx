import {
	Command,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverPopup,
	PopoverPortal,
	PopoverPositioner,
} from "@/components/ui/popover";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import "./SuggestionPopover.css";

export interface SuggestionItem {
	type: "file" | "folder" | "action" | "category";
	label: string;
	icon?: React.ReactNode;
	id: string; // path or unique identifier
	desc?: string; // specific filtered path or extra info
	data?: any; // Original object (TFile, etc)
}

const TYPE_LABELS: Record<SuggestionItem["type"], string> = {
	file: "File",
	folder: "Folder",
	action: "Action",
	category: "Category",
};

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
	const listRef = useRef<HTMLDivElement>(null);
	const [open, setOpen] = useState(true);

	useEffect(() => {
		if (listRef.current && selectedIndex >= 0) {
			const selectedEl = listRef.current.querySelector(
				'[cmdk-item][data-selected="true"]'
			) as HTMLElement | null;
			if (selectedEl) {
				selectedEl.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex]);

	useEffect(() => {
		setOpen(suggestions.length > 0);
	}, [suggestions.length]);

	if (suggestions.length === 0) {
		return null;
	}

	const selectedValue = suggestions[selectedIndex]?.id;

	return (
		<Popover open={open} onOpenChange={setOpen} modal={false}>
			<PopoverPortal>
				<PopoverPositioner
					anchor={anchorEl}
					side="top"
					sideOffset={8}
					className="suggestion-popover-positioner"
				>
					<PopoverPopup
						className="suggestion-popover"
						initialFocus={false}
						finalFocus={false}
					>
						<Command
							className="suggestion-command"
							value={selectedValue}
							shouldFilter={false}
							disablePointerSelection
						>
							<CommandList
								ref={listRef}
								className="suggestion-command-list"
								role="listbox"
								aria-label="Suggestions"
							>
								{suggestions.map((item, index) => {
									const itemId = `suggestion-${index}`;
									return (
										<CommandItem
											key={item.id}
											id={itemId}
											value={item.id}
											onSelect={() => {
												onSelect(item);
												setOpen(false);
											}}
											className="suggestion-command-item"
											data-type={item.type}
											aria-label={`${item.label} ${TYPE_LABELS[item.type]} suggestion`}
										>
											<span
												className="suggestion-popover-icon"
												aria-hidden="true"
											>
												{item.icon || (item.type === "file" ? "📄" : "•")}
											</span>
											<div className="suggestion-popover-content">
												<div className="suggestion-popover-content-row">
													<span className="suggestion-popover-label">
														{item.label}
													</span>
													<span
														className="suggestion-popover-type"
														aria-hidden="true"
													>
														{TYPE_LABELS[item.type]}
													</span>
												</div>
												{item.desc && (
													<span className="suggestion-popover-desc">
														{item.desc}
													</span>
												)}
											</div>
										</CommandItem>
									);
								})}
							</CommandList>
						</Command>
					</PopoverPopup>
				</PopoverPositioner>
			</PopoverPortal>
		</Popover>
	);
};
