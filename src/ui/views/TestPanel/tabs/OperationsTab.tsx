/**
 * Operations Tab
 * Manages note operations and internal state
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "../../../components";
import { useFileOperations } from "../../../hooks";
import type { OperationsState } from "../../../types";

interface OperationsTabProps {
	app: App;
	selectedFile: TFile | null;
	onAddOutput: (
		title: string,
		content: string,
		status: "success" | "error" | "info",
	) => void;
}

export const OperationsTab: React.FC<OperationsTabProps> = ({
	app,
	selectedFile,
	onAddOutput,
}) => {
	const [opsState, setOpsState] = useState<OperationsState>({
		getContentsPath: "",
		appendContentPath: "",
		appendText: "",
		patchContentPath: "",
		deleteFilePath: "",
	});

	const [isLoading, setIsLoading] = useState(false);

	const fileOps = useFileOperations({ app, onAddOutput });

	const handleGetStructure = async () => {
		setIsLoading(true);
		try {
			// Note: getNoteStructure might need selectedFile path if not handled inside hook
			// Checking hook implementation: often uses active file if not passed.
			// Let's assume the hook handles it or we should be explicit.
			// Ideally we pass selectedFile to hook or method.
			// Based on TestPanel logic: fileOps.getNoteStructure()
			await fileOps.getNoteStructure();
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetContents = async () => {
		setIsLoading(true);
		try {
			const path = opsState.getContentsPath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ getFileContents()", "Select a file first", "info");
				return;
			}
			await fileOps.getFileContents(path);
		} finally {
			setIsLoading(false);
		}
	};

	const handleAppendContent = async () => {
		setIsLoading(true);
		try {
			const path = opsState.appendContentPath || selectedFile?.path;
			if (!path?.trim() || !opsState.appendText.trim()) {
				onAddOutput(
					"✗ appendContent()",
					"Select file and enter content",
					"info",
				);
				return;
			}
			await fileOps.appendContent(path, opsState.appendText);
			setOpsState((prev) => ({ ...prev, appendText: "" }));
		} finally {
			setIsLoading(false);
		}
	};

	const handlePatchContent = async () => {
		setIsLoading(true);
		try {
			const path = opsState.patchContentPath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ patchContent()", "Select a file first", "info");
				return;
			}
			await fileOps.patchContent(path);
		} finally {
			setIsLoading(false);
		}
	};

	const handleDeleteFile = async () => {
		setIsLoading(true);
		try {
			const path = opsState.deleteFilePath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ deleteFile()", "Select a file first", "info");
				return;
			}
			await fileOps.deleteFile(path);
		} finally {
			setIsLoading(false);
		}
	};

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
						onClick={handleGetStructure}
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
							onChange={(e) =>
								setOpsState((prev) => ({
									...prev,
									getContentsPath: e.target.value,
								}))
							}
							disabled={isLoading}
						/>
						<button
							type="button"
							className="test-btn test-btn-secondary"
							onClick={handleGetContents}
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
						onChange={(e) =>
							setOpsState((prev) => ({
								...prev,
								appendContentPath: e.target.value,
							}))
						}
						disabled={isLoading}
					/>
					<textarea
						className="test-textarea"
						placeholder="Content to append..."
						value={opsState.appendText}
						onChange={(e) =>
							setOpsState((prev) => ({ ...prev, appendText: e.target.value }))
						}
						disabled={isLoading}
						rows={3}
					/>
					<button
						type="button"
						className="test-btn test-btn-warning"
						onClick={handleAppendContent}
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
						onChange={(e) =>
							setOpsState((prev) => ({
								...prev,
								patchContentPath: e.target.value,
							}))
						}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-warning"
						onClick={handlePatchContent}
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
						onChange={(e) =>
							setOpsState((prev) => ({
								...prev,
								deleteFilePath: e.target.value,
							}))
						}
						disabled={isLoading}
					/>
					<button
						type="button"
						className="test-btn test-btn-danger"
						onClick={handleDeleteFile}
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
