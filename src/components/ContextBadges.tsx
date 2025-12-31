import type React from "react";
import type { TFile } from "obsidian";
import { IconX, IconFileText, IconFolder } from "./Icons";

interface ContextBadgesProps {
	selectedFiles: TFile[];
	selectedFolders: string[];
	onRemoveFile: (path: string) => void;
	onRemoveFolder: (path: string) => void;
}

export const ContextBadges: React.FC<ContextBadgesProps> = ({
	selectedFiles,
	selectedFolders,
	onRemoveFile,
	onRemoveFolder,
}) => {
	if (selectedFiles.length === 0 && selectedFolders.length === 0) return null;

	return (
		<div className="eragear-context-badges">
			{selectedFiles.map((file) => (
				<div key={file.path} className="eragear-context-badge">
					<span className="eragear-badge-icon">
						<IconFileText />
					</span>
					<span className="eragear-badge-text">{file.basename}</span>
					<button
						type="button"
						className="eragear-badge-remove"
						onClick={() => onRemoveFile(file.path)}
						title="Remove file"
					>
						<IconX />
					</button>
				</div>
			))}
			{selectedFolders.map((folder) => (
				<div key={folder} className="eragear-context-badge">
					<span className="eragear-badge-icon">
						<IconFolder />
					</span>
					<span className="eragear-badge-text">{folder}</span>
					<button
						type="button"
						className="eragear-badge-remove"
						onClick={() => onRemoveFolder(folder)}
						title="Remove folder"
					>
						<IconX />
					</button>
				</div>
			))}
		</div>
	);
};
