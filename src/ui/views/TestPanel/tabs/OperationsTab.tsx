/**
 * Operations Tab Renderer
 * Renders the note operations tab content
 */

import type { TFile } from "obsidian";
import type React from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import type { OperationsState } from "../../../types";

interface OperationsTabProps {
	opsState: OperationsState;
	isLoading: boolean;
	selectedFile: TFile | null;
	onGetContentsPathChange: (path: string) => void;
	onAppendContentPathChange: (path: string) => void;
	onAppendTextChange: (text: string) => void;
	onPatchContentPathChange: (path: string) => void;
	onDeleteFilePathChange: (path: string) => void;
	onGetStructure: () => void;
	onGetContents: () => void;
	onAppendContent: () => void;
	onPatchContent: () => void;
	onDeleteFile: () => void;
}

export const OperationsTabRenderer: React.FC<OperationsTabProps> = ({
	opsState,
	isLoading,
	selectedFile,
	onGetContentsPathChange,
	onAppendContentPathChange,
	onAppendTextChange,
	onPatchContentPathChange,
	onDeleteFilePathChange,
	onGetStructure,
	onGetContents,
	onAppendContent,
	onPatchContent,
	onDeleteFile,
}) => {
	return (
		<div className="test-section">
			<h3>🛠️ Note Operations</h3>

			<ActionCardGroup title="Read Operations">
				<ActionCard
					title="Get Structure"
					description="Table of contents"
					icon="📋"
					variant="safe"
				>
					<button
						type="button"
						className="test-btn test-btn-primary"
						onClick={onGetStructure}
						disabled={isLoading}
					>
						{isLoading ? "⏳" : "📖"} Get Structure
					</button>
				</ActionCard>

				<ActionCard
					title="Get Contents"
					description="Read file content"
					icon="📄"
					variant="safe"
				>
					<div className="test-input-group">
						<input
							type="text"
							className="test-input"
							placeholder="File path (or use context)"
							value={opsState.getContentsPath}
							onChange={(e) => onGetContentsPathChange(e.target.value)}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={onGetContents}
							disabled={
								isLoading || (!opsState.getContentsPath.trim() && !selectedFile)
							}
						>
							Read
						</button>
					</div>
				</ActionCard>
			</ActionCardGroup>

			<ActionCardGroup title="Write Operations">
				<ActionCard title="Append Content" icon="➕" variant="destructive">
					<input
						type="text"
						className="test-input"
						placeholder="File path (or use context)"
						value={opsState.appendContentPath}
						onChange={(e) => onAppendContentPathChange(e.target.value)}
						disabled={isLoading}
					/>
					<textarea
						className="test-textarea"
						placeholder="Content to append..."
						value={opsState.appendText}
						onChange={(e) => onAppendTextChange(e.target.value)}
						disabled={isLoading}
						rows={3}
					/>
					<button
						type="button"
						className="test-btn test-btn-warning"
						onClick={onAppendContent}
						disabled={
							isLoading ||
							(!opsState.appendContentPath.trim() && !selectedFile) ||
							!opsState.appendText.trim()
						}
					>
						⚠️ Append Content (Writes!)
					</button>
				</ActionCard>

				<ActionCard title="Patch Content" icon="🔧" variant="destructive">
					<input
						type="text"
						className="test-input"
						placeholder="File path (or use context)"
						value={opsState.patchContentPath}
						onChange={(e) => onPatchContentPathChange(e.target.value)}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-warning"
						onClick={onPatchContent}
						disabled={
							isLoading || (!opsState.patchContentPath.trim() && !selectedFile)
						}
					>
						⚠️ Patch After Frontmatter (Writes!)
					</button>
				</ActionCard>

				<ActionCard title="Delete File" icon="🗑️" variant="destructive">
					<input
						type="text"
						className="test-input"
						placeholder="File path (or use context)"
						value={opsState.deleteFilePath}
						onChange={(e) => onDeleteFilePathChange(e.target.value)}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-danger"
						onClick={onDeleteFile}
						disabled={
							isLoading || (!opsState.deleteFilePath.trim() && !selectedFile)
						}
					>
						🗑️ Delete (Moves to Trash)
					</button>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
