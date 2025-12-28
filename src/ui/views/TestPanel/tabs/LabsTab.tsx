/**
 * Labs Tab Renderer
 * Renders the advanced features tab content
 */

import type { TFile } from "obsidian";
import type React from "react";
import type { LabsState } from "ui/types/testPanel";
import { ActionCard, ActionCardGroup } from "../../../components";

interface LabsTabProps {
	labsState: LabsState;
	isLoading: boolean;
	selectedFile: TFile | null;
	onReadSectionPathChange: (path: string) => void;
	onSubpathChange: (path: string) => void;
	onReadCanvasPathChange: (path: string) => void;
	onGetRelatedFiles: () => void;
	onGetSmartContext?: () => void;
	onSmartContextDepthChange?: (depth: number) => void;
	onReadSpecificSection: () => void;
	onReadCanvas: () => void;
	onGetGraphNeighborhood?: () => void;
	onGetLinkDensity?: () => void;
}

export const LabsTabRenderer: React.FC<LabsTabProps> = ({
	labsState,
	isLoading,
	selectedFile,
	onReadSectionPathChange,
	onSubpathChange,
	onReadCanvasPathChange,
	onGetRelatedFiles,
	onGetSmartContext,
	onSmartContextDepthChange,
	onReadSpecificSection,
	onReadCanvas,
	onGetGraphNeighborhood,
	onGetLinkDensity,
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

				<ActionCard
					title="Smart Context (Worker)"
					description="Snapshot & compute (BFS)"
					icon="🧠"
					variant="safe"
				>
					<div className="test-input-group">
						<input
							type="number"
							className="test-input"
							min={0}
							max={10}
							step={1}
							placeholder="Max depth (0-10)"
							value={labsState.smartContextDepth}
							onChange={(e) =>
								onSmartContextDepthChange?.(Number(e.target.value))
							}
							disabled={isLoading || !onSmartContextDepthChange}
						/>
						<button
							type="button"
							className="test-btn test-btn-primary"
							onClick={onGetSmartContext}
							disabled={isLoading || !onGetSmartContext}
						>
							{isLoading ? "⏳" : "🧠"} Analyze
						</button>
					</div>
				</ActionCard>

				<ActionCard
					title="Neighborhood"
					description="1-hop graph context"
					icon="🕸️"
					variant="safe"
				>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onGetGraphNeighborhood}
						disabled={isLoading || !onGetGraphNeighborhood}
					>
						Get Neighborhood
					</button>
				</ActionCard>

				<ActionCard
					title="Link Density"
					description="Connectivity analysis"
					icon="📊"
					variant="safe"
				>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={onGetLinkDensity}
						disabled={isLoading || !onGetLinkDensity}
					>
						Analyze Density
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
