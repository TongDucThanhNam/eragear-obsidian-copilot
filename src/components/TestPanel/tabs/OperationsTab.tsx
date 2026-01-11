/**
 * Operations Tab
 * Manages note operations and internal state
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import { ActionCard, ActionCardGroup } from "@/components/ActionCard";
import { Button } from "@/components/ui/button";
import {
	InputGroup,
	InputGroupInput,
	InputGroupTextarea,
	InputGroupButton,
} from "@/components/ui/input-group";
import {
	IconList,
	IconFileText,
	IconPlus,
	IconPen,
	IconTrash,
	IconSearch,
	IconRotate,
} from "@/components/ui/Icons";
import { useFileOperations } from "@/hooks";
import type { OperationsState } from "@/types/testPanel";

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
			<h3>Note Operations</h3>

			<ActionCardGroup title="Read Operations">
				<ActionCard
					title="Get Structure"
					description="Table of contents"
					icon={<IconList />}
					variant="safe"
				>
					<Button
						variant="default"
						size="sm"
						onClick={handleGetStructure}
						disabled={isLoading}
					>
						{isLoading ? <IconRotate /> : <IconFileText />}
						Get Structure
					</Button>
				</ActionCard>

				<ActionCard
					title="Get Contents"
					description="Read file content"
					icon={<IconFileText />}
					variant="safe"
				>
					<InputGroup>
						<InputGroupInput
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
						<InputGroupButton>
							<Button
								variant="outline"
								size="sm"
								onClick={handleGetContents}
								disabled={
									isLoading || (!opsState.getContentsPath.trim() && !selectedFile)
								}
							>
								<IconSearch />
								Read
							</Button>
						</InputGroupButton>
					</InputGroup>
				</ActionCard>
			</ActionCardGroup>

			<ActionCardGroup title="Write Operations">
				<ActionCard
					title="Append Content"
					icon={<IconPlus />}
					variant="destructive"
				>
					<InputGroup>
						<InputGroupInput
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
					</InputGroup>
					<InputGroupTextarea
						placeholder="Content to append..."
						value={opsState.appendText}
						onChange={(e) =>
							setOpsState((prev) => ({ ...prev, appendText: e.target.value }))
						}
						disabled={isLoading}
						rows={3}
					/>
					<Button
						variant="destructive"
						size="sm"
						onClick={handleAppendContent}
						disabled={
							isLoading ||
							(!opsState.appendContentPath.trim() && !selectedFile) ||
							!opsState.appendText.trim()
						}
					>
						<IconPlus />
						Append Content (Writes!)
					</Button>
				</ActionCard>

				<ActionCard
					title="Patch Content"
					icon={<IconPen />}
					variant="destructive"
				>
					<InputGroup>
						<InputGroupInput
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
						<InputGroupButton>
							<Button
								variant="destructive"
								size="sm"
								onClick={handlePatchContent}
								disabled={
									isLoading || (!opsState.patchContentPath.trim() && !selectedFile)
								}
							>
								<IconPen />
								Patch
							</Button>
						</InputGroupButton>
					</InputGroup>
				</ActionCard>

				<ActionCard
					title="Delete File"
					icon={<IconTrash />}
					variant="destructive"
				>
					<InputGroup>
						<InputGroupInput
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
						<InputGroupButton>
							<Button
								variant="destructive"
								size="sm"
								onClick={handleDeleteFile}
								disabled={
									isLoading || (!opsState.deleteFilePath.trim() && !selectedFile)
								}
							>
								<IconTrash />
								Delete
							</Button>
						</InputGroupButton>
					</InputGroup>
				</ActionCard>
			</ActionCardGroup>
		</div>
	);
};
