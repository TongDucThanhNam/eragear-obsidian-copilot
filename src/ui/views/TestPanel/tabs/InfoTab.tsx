/**
 * Info Tab Renderer
 * Renders the metadata and information tab content
 */

import type { TFile } from "obsidian";
import type React from "react";
import { ActionCard } from "../../../components";

interface InfoTabProps {
	infoState: {
		updateFrontmatterPath: string;
	};
	isLoading: boolean;
	selectedFile: TFile | null;
	onUpdateFrontmatterPathChange: (path: string) => void;
	onGetMetadata: () => void;
	onUpdateFrontmatter: () => void;
	onGetActiveFile: () => void;
}

export const InfoTabRenderer: React.FC<InfoTabProps> = ({
	updateFrontmatterPath,
	isLoading,
	selectedFile,
	onUpdateFrontmatterPathChange,
	onGetMetadata,
	onUpdateFrontmatter,
	onGetActiveFile,
}) => {
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
					onClick={onGetMetadata}
					disabled={isLoading}
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
					value={updateFrontmatterPath}
					onChange={(e) => onUpdateFrontmatterPathChange(e.target.value)}
					disabled={isLoading}
				/>
				<button
					type="button"
					className="test-btn test-btn-warning"
					onClick={onUpdateFrontmatter}
					disabled={
						isLoading || (!updateFrontmatterPath.trim() && !selectedFile)
					}
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
					onClick={onGetActiveFile}
					disabled={isLoading}
				>
					Get Active File
				</button>
			</ActionCard>
		</div>
	);
};
