/**
 * Files Tab
 * Manages file organization and navigation
 */

import type { App } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "@/components";
import { useFileOperations } from "@/hooks";
import type { FilesState } from "@/types/testPanel";

interface FilesTabProps {
	app: App;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export const FilesTab: React.FC<FilesTabProps> = ({ app, onAddOutput }) => {
	const [filesState, setFilesState] = useState<FilesState>({
		dirPath: "",
	});
	const [isLoading, setIsLoading] = useState(false);
	const fileOps = useFileOperations({ app, onAddOutput });

	const handleListFilesInVault = async () => {
		setIsLoading(true);
		try {
			await fileOps.listFilesInVault();
		} finally {
			setIsLoading(false);
		}
	};

	const handleListFilesInDir = async () => {
		setIsLoading(true);
		try {
			if (!filesState.dirPath.trim()) {
				onAddOutput("✗ listFilesInDir()", "Enter directory path", "info");
				return;
			}
			await fileOps.listFilesInDir(filesState.dirPath);
		} finally {
			setIsLoading(false);
		}
	};

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
						onClick={handleListFilesInVault}
						disabled={isLoading}
						aria-label="List all files in vault root"
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
							onChange={(e) =>
								setFilesState((prev) => ({ ...prev, dirPath: e.target.value }))
							}
							disabled={isLoading}
							aria-label="Directory path to list"
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={handleListFilesInDir}
							disabled={!filesState.dirPath.trim() || isLoading}
							aria-label="List files in specified directory"
						>
							List
						</button>
					</div>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
