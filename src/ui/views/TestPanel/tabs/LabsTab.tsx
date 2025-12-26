/**
 * Labs Tab Renderer
 * Renders the advanced features tab content
 */

import type { TFile } from "obsidian";
import type React from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import type { LabsState } from "../../../types";

interface LabsTabProps {
	labsState: LabsState;
	isLoading: boolean;
	selectedFile: TFile | null;
	onReadSectionPathChange: (path: string) => void;
	onSubpathChange: (path: string) => void;
	onReadCanvasPathChange: (path: string) => void;
	onGetRelatedFiles: () => void;
	onReadSpecificSection: () => void;
	onReadCanvas: () => void;
}

export const LabsTabRenderer: React.FC<LabsTabProps> = ({
	labsState,
	isLoading,
	selectedFile,
	onReadSectionPathChange,
	onSubpathChange,
	onReadCanvasPathChange,
	onGetRelatedFiles,
	onReadSpecificSection,
	onReadCanvas,
}) => {
	return (
		<div className="test-section">
			<h3>⚡ Advanced Features</h3>

			<ActionCardGroup title="Graph Intelligence">
				<ActionCard
					title="Related Files"
					description="Backlinks & outlinks"
					icon="🔗"
					variant="safe"
				>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onGetRelatedFiles}
						disabled={isLoading}
					>
						Get Links
					</button>
				</ActionCard>
			</ActionCardGroup>

			<ActionCardGroup title="Precision Reading">
				<ActionCard
					title="Read Section"
					description="Specific heading/block"
					icon="🎯"
					variant="safe"
				>
					<input
						type="text"
						className="test-input"
						placeholder="File path (or use context)"
						value={labsState.readSectionPath}
						onChange={(e) => onReadSectionPathChange(e.target.value)}
						disabled={isLoading}
					/>
					<input
						type="text"
						className="test-input"
						placeholder="Subpath (e.g., '#Intro' or '#^blockid')"
						value={labsState.subpath}
						onChange={(e) => onSubpathChange(e.target.value)}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onReadSpecificSection}
						disabled={
							isLoading ||
							(!labsState.readSectionPath.trim() && !selectedFile) ||
							!labsState.subpath.trim()
						}
					>
						Read Section
					</button>
				</ActionCard>

				<ActionCard
					title="Read Canvas"
					description="Parse .canvas files"
					icon="🎨"
				>
					<input
						type="text"
						className="test-input"
						placeholder="Canvas path (or use context)"
						value={labsState.readCanvasPath}
						onChange={(e) => onReadCanvasPathChange(e.target.value)}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onReadCanvas}
						disabled={
							isLoading || (!labsState.readCanvasPath.trim() && !selectedFile)
						}
					>
						Read Canvas
					</button>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
