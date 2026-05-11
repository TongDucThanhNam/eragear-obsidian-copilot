/**
 * Info Tab
 * Manages metadata and information operations
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard } from "@/features/test-panel/components/ActionCard";
import { Button } from "@/components/ui/button";
import { InputGroup, InputGroupInput, InputGroupButton } from "@/components/ui/input-group";
import { useFileOperations } from "@/features/test-panel/hooks/useFileOperations";
import type { InfoState } from "@/features/test-panel/types";
import "./info-tab.css";

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
	const [loadingAction, setLoadingAction] = useState<string | null>(null);

	const fileOps = useFileOperations({ app, onAddOutput });

	const handleGetMetadata = async () => {
		setLoadingAction("metadata");
		try {
			await fileOps.getMetadata();
		} finally {
			setLoadingAction(null);
		}
	};

	const handleUpdateFrontmatter = async () => {
		setLoadingAction("frontmatter");
		try {
			const path = infoState.updateFrontmatterPath || selectedFile?.path;
			if (!path?.trim()) {
				onAddOutput("✗ updateFrontmatter()", "Select a file first", "info");
				return;
			}
			await fileOps.updateFrontmatter(path);
		} finally {
			setLoadingAction(null);
		}
	};

	const handleGetActiveFile = () => {
		setLoadingAction("activeFile");
		try {
			fileOps.getActiveFile();
		} finally {
			setLoadingAction(null);
		}
	};

	const handleUseSelectedFile = () => {
		if (selectedFile) {
			setInfoState((prev) => ({
				...prev,
				updateFrontmatterPath: selectedFile.path,
			}));
		}
	};

	return (
		<div className="info-tab">
			<div className="info-tab-header">
				<h3 className="info-tab-title">ℹ️ Metadata & Information</h3>
				{selectedFile && (
					<span className="info-tab-file-badge" title={selectedFile.path}>
						📄 {selectedFile.name}
					</span>
				)}
			</div>

			<div className="info-tab-actions">
				<ActionCard
					title="Get Metadata"
					description="Retrieve active file metadata"
					icon="🏷️"
					variant="safe"
				>
					<div className="info-card-action">
						<Button
							variant="default"
							size="sm"
							onClick={handleGetMetadata}
								// disabled={loadingAction !== null}
						>
							{loadingAction === "metadata" ? (
								<span className="loading-spinner" />
							) : (
								"📊"
							)}
							{loadingAction === "metadata" ? "Loading..." : "Get Metadata"}
						</Button>
					</div>
				</ActionCard>

				<ActionCard
					title="Update Frontmatter"
					description="Modify YAML frontmatter (writes to file)"
					icon="✏️"
				>
					<div className="info-card-action">
						<InputGroup>
							<InputGroupInput
								type="text"
								placeholder="File path or leave empty for selected file"
								value={infoState.updateFrontmatterPath}
								onChange={(e) =>
									setInfoState((prev) => ({
										...prev,
										updateFrontmatterPath: e.target.value,
									}))
								}
								disabled={loadingAction !== null}
								aria-label="File path for frontmatter update"
							/>
							{selectedFile && !infoState.updateFrontmatterPath && (
								<InputGroupButton
									variant="ghost"
									size="sm"
									onClick={handleUseSelectedFile}
									disabled={loadingAction !== null}
									title="Use selected file"
								>
									📎
								</InputGroupButton>
							)}
							<InputGroupButton
								variant="destructive"
								size="sm"
								onClick={handleUpdateFrontmatter}
								disabled={
									loadingAction !== null ||
									(!infoState.updateFrontmatterPath.trim() && !selectedFile)
								}
								title="Update frontmatter (writes to file)"
							>
								{loadingAction === "frontmatter" ? (
									<span className="loading-spinner" />
								) : (
									"⚠️"
								)}
								{loadingAction === "frontmatter" ? "Writing..." : "Update"}
							</InputGroupButton>
						</InputGroup>
					</div>
				</ActionCard>

				<ActionCard
					title="Active File"
					description="Get currently active file info"
					icon="📌"
					variant="safe"
				>
					<div className="info-card-action">
						<Button
							variant="secondary"
							size="sm"
							onClick={handleGetActiveFile}
							// disabled={loadingAction !== null}
						>
							{loadingAction === "activeFile" ? (
								<span className="loading-spinner" />
							) : (
								"📌"
							)}
							{loadingAction === "activeFile" ? "Loading..." : "Get Active File"}
						</Button>
					</div>
				</ActionCard>
			</div>
		</div>
	);
};
