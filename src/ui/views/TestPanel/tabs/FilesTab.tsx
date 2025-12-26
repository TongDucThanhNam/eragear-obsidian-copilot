/**
 * Files Tab Renderer
 * Renders the file organization and navigation tab
 */

import type React from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import type { FilesState } from "../../../types";

interface FilesTabProps {
	filesState: FilesState;
	isLoading: boolean;
	onDirPathChange: (path: string) => void;
	onListFilesInVault: () => void;
	onListFilesInDir: () => void;
}

export const FilesTabRenderer: React.FC<FilesTabProps> = ({
	filesState,
	isLoading,
	onDirPathChange,
	onListFilesInVault,
	onListFilesInDir,
}) => {
	return (
		<div className="test-section">
			<h3>🗂️ Files & Organization</h3>

			<ActionCardGroup title="Vault Navigation">
				<ActionCard
					title="List Vault Root"
					description="All files & folders"
					icon="📂"
					variant="safe"
				>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onListFilesInVault}
						disabled={isLoading}
					>
						List Vault
					</button>
				</ActionCard>

				<ActionCard
					title="List Directory"
					description="Files in folder"
					icon="📁"
					variant="safe"
				>
					<div className="test-input-group">
						<input
							type="text"
							className="test-input"
							placeholder="e.g., 'folder/subfolder'"
							value={filesState.dirPath}
							onChange={(e) => onDirPathChange(e.target.value)}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={onListFilesInDir}
							disabled={!filesState.dirPath.trim() || isLoading}
						>
							List
						</button>
					</div>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
