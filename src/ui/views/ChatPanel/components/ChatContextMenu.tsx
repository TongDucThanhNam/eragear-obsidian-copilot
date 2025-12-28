import type React from "react";
import { useState, useRef, useEffect } from "react";
import type { App, TFile } from "obsidian";
import { IconPlus, IconFileText, IconFolder, IconChevronRight } from "./Icons";

interface ChatContextMenuProps {
	app: App;
	onAddActiveNote: () => void;
	onAddFile: (file: TFile) => void;
	onAddFolder: (path: string) => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
	app,
	onAddActiveNote,
	onAddFile,
	onAddFolder,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [activeSubmenu, setActiveSubmenu] = useState<
		"notes" | "folders" | null
	>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
				setIsOpen(false);
				setActiveSubmenu(null);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	// Mock data for demo purposes, in real app this would search/filter vault
	// Ideally this should use a fuzzy search modal or a quick pick list
	// reusing SuggestionPopover logic or similar if possible.
	// For now, we'll keep it simple as a placeholder for the "Picker" UI or just trigger the add immediately.
	// Since we don't have a full file picker UI component ready here,
	// we might want to trigger the standard Obsidian file selector or just show a small list.

	// To properly implement "Notes >", we'd need a searchable list.
	// Given the constraints, let's implement the menu structure.

	return (
		<div className="eragear-context-menu-container" ref={menuRef}>
			<button
				type="button"
				className="eragear-context-trigger-btn"
				onClick={() => setIsOpen(!isOpen)}
				title="Add Context"
			>
				<span className="eragear-icon-at">@</span>
				<span className="eragear-btn-label">Add context</span>
			</button>

			{isOpen && (
				<div className="eragear-context-popover">
					<div
						className="eragear-menu-item"
						onClick={() => {
							onAddActiveNote();
							setIsOpen(false);
						}}
						role="button"
						tabIndex={0}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								onAddActiveNote();
								setIsOpen(false);
							}
						}}
					>
						<IconFileText />
						<span>Active Note</span>
					</div>

					<div
						className="eragear-menu-item has-submenu"
						onMouseEnter={() => setActiveSubmenu("notes")}
						// In a full implementation, clicking might toggle or open a modal
					>
						<div className="eragear-menu-item-content">
							<IconFileText />
							<span>Notes</span>
						</div>
						<IconChevronRight />

						{/* Submenu placeholder - in reality needs a robust picker */}
						{activeSubmenu === "notes" && (
							<div className="eragear-submenu">
								<div className="eragear-submenu-header">
									Recent Notes (Demo)
								</div>
								{/* We would map recent files here */}
								<div className="eragear-menu-item disabled">
									<span>(File picker implementation pending)</span>
								</div>
							</div>
						)}
					</div>

					<div
						className="eragear-menu-item has-submenu"
						onMouseEnter={() => setActiveSubmenu("folders")}
					>
						<div className="eragear-menu-item-content">
							<IconFolder />
							<span>Folders</span>
						</div>
						<IconChevronRight />
						{activeSubmenu === "folders" && (
							<div className="eragear-submenu">
								<div className="eragear-menu-item disabled">
									<span>(Folder picker implementation pending)</span>
								</div>
							</div>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
