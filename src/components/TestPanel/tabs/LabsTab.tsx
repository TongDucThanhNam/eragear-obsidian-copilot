/**
 * Labs Tab
 * Manages advanced features and experimental tools
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "@/components/ActionCard";
import { useFileOperations } from "@/hooks";
import type { LabsState } from "@/types/testPanel";

interface LabsTabProps {
	app: App;
	selectedFile: TFile | null;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export const LabsTab: React.FC<LabsTabProps> = ({
	app,
	selectedFile,
	onAddOutput,
}) => {
	const [labsState, setLabsState] = useState<LabsState>({
		readSectionPath: "",
		subpath: "",
		readCanvasPath: "",
		smartContextDepth: 2,
	});
	const [isLoading, setIsLoading] = useState(false);
	const fileOps = useFileOperations({ app, onAddOutput });

	const handleGetRelatedFiles = async () => {
		try {
			await fileOps.getRelatedFiles();
		} catch {
			// handled in hook
		}
	};

	const handleGetSmartContext = async () => {
		setIsLoading(true);
		try {
			await fileOps.getSmartContext(
				labsState.smartContextDepth,
				selectedFile?.path,
			);
		} catch {
			// handled in hook
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetGraphNeighborhood = async () => {
		setIsLoading(true);
		try {
			await fileOps.getGraphNeighborhood();
		} catch {
			// handled in hook
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetLinkDensity = async () => {
		setIsLoading(true);
		try {
			await fileOps.getLinkDensity();
		} catch {
			// handled in hook
		} finally {
			setIsLoading(false);
		}
	};

	const handleReadSpecificSection = async () => {
		setIsLoading(true);
		try {
			const path = labsState.readSectionPath || selectedFile?.path;
			if (!path?.trim() || !labsState.subpath.trim()) {
				onAddOutput(
					"✗ readSpecificSection()",
					"Enter file path and subpath",
					"info",
				);
				return;
			}
			await fileOps.readSpecificSection(path, labsState.subpath);
		} finally {
			setIsLoading(false);
		}
	};

	const handleReadCanvas = async () => {
		setIsLoading(true);
		try {
			const path = labsState.readCanvasPath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ readCanvas()", "Select a .canvas file", "info");
				return;
			}
			await fileOps.readCanvas(path);
		} finally {
			setIsLoading(false);
		}
	};

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
						onClick={handleGetRelatedFiles}
						disabled={isLoading}
						aria-label="Get related files via backlinks and outlinks"
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
								setLabsState((prev) => ({
									...prev,
									smartContextDepth: Math.max(
										0,
										Math.min(10, Math.floor(Number(e.target.value))),
									),
								}))
							}
							disabled={isLoading}
							aria-label="Smart context depth (0-10)"
						/>
						<button
							type="button"
							className="test-btn test-btn-primary"
							onClick={handleGetSmartContext}
							disabled={isLoading}
							aria-label="Analyze smart context"
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
						onClick={handleGetGraphNeighborhood}
						disabled={isLoading}
						aria-label="Get graph neighborhood"
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
						onClick={handleGetLinkDensity}
						disabled={isLoading}
						aria-label="Analyze link density"
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
						onChange={(e) =>
							setLabsState((prev) => ({
								...prev,
								readSectionPath: e.target.value,
							}))
						}
						disabled={isLoading}
						aria-label="File path for section reading"
					/>
					<input
						type="text"
						className="test-input"
						placeholder="Subpath (e.g., '#Intro' or '#^blockid')"
						value={labsState.subpath}
						onChange={(e) =>
							setLabsState((prev) => ({ ...prev, subpath: e.target.value }))
						}
						disabled={isLoading}
						aria-label="Subpath (heading or block ID)"
					/>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={handleReadSpecificSection}
						disabled={
							isLoading ||
							(!labsState.readSectionPath.trim() && !selectedFile) ||
							!labsState.subpath.trim()
						}
						aria-label="Read specific section"
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
						onChange={(e) =>
							setLabsState((prev) => ({
								...prev,
								readCanvasPath: e.target.value,
							}))
						}
						disabled={isLoading}
						aria-label="Canvas file path"
					/>
					<button
						type="button"
						className="test-btn test-btn-secondary"
						onClick={handleReadCanvas}
						disabled={
							isLoading || (!labsState.readCanvasPath.trim() && !selectedFile)
						}
						aria-label="Read canvas file"
					>
						Read Canvas
					</button>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
