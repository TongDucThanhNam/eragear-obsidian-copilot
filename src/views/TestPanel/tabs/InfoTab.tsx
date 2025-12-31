/**
 * Info Tab
 * Manages metadata and information operations
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard } from "@/components";
import { useFileOperations } from "@/hooks";
import type { InfoState } from "@/types/testPanel";

interface InfoTabProps {
	app: App;
	selectedFile: TFile | null;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export const InfoTab: React.FC<InfoTabProps> = ({
	app,
	selectedFile,
	onAddOutput,
}) => {
	const [infoState, setInfoState] = useState<InfoState>({
		updateFrontmatterPath: "",
	});
	const [isLoading, setIsLoading] = useState(false);

	const fileOps = useFileOperations({ app, onAddOutput });

	const handleGetMetadata = async () => {
		setIsLoading(true);
		try {
			await fileOps.getMetadata();
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdateFrontmatter = async () => {
		setIsLoading(true);
		try {
			const path = infoState.updateFrontmatterPath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ updateFrontmatter()", "Select a file first", "info");
				return;
			}
			await fileOps.updateFrontmatter(path);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetActiveFile = async () => {
		await fileOps.getActiveFile();
	};

	return (
		<div className="test-section">
			<h3>ℹ️ Metadata & Information</h3>

			<ActionCard
				title="Get Metadata"
				description="Active file info"
				icon="🏷️"
				variant="safe"
			>
				<button
					type="button"
					className="test-btn test-btn-primary"
					onClick={handleGetMetadata}
					disabled={isLoading}
					aria-label="Get metadata for active file"
				>
					{isLoading ? "⏳" : "📊"} Get Metadata
				</button>
			</ActionCard>

			<ActionCard
				title="Update Frontmatter"
				description="Safe YAML update"
				icon="✏️"
			>
				<input
					type="text"
					className="test-input"
					placeholder="File path (or use context)"
					value={infoState.updateFrontmatterPath}
					onChange={(e) =>
						setInfoState((prev) => ({
							...prev,
							updateFrontmatterPath: e.target.value,
						}))
					}
					disabled={isLoading}
					aria-label="File path for frontmatter update"
				/>
				<button
					type="button"
					className="test-btn test-btn-warning"
					onClick={handleUpdateFrontmatter}
					disabled={
						isLoading ||
						(!infoState.updateFrontmatterPath.trim() && !selectedFile)
					}
					aria-label="Update frontmatter (writes to file)"
				>
					⚠️ Update Frontmatter (Writes!)
				</button>
			</ActionCard>

			<ActionCard
				title="Active File"
				description="Current focus"
				icon="📌"
				variant="safe"
			>
				<button
					type="button"
					className="test-btn test-btn-secondary"
					onClick={handleGetActiveFile}
					disabled={isLoading}
					aria-label="Get currently active file"
				>
					Get Active File
				</button>
			</ActionCard>
		</div>
	);
};
