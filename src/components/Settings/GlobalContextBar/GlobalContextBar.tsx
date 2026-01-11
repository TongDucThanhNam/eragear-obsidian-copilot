/**
 * GlobalContextBar Component
 * Displays and manages the currently selected file context
 */

import type { TFile } from "obsidian";
import type React from "react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxGroup,
	ComboboxInput,
	ComboboxItem,
	ComboboxLabel,
	ComboboxList,
} from "@/components/ui/combobox";
import { FileTextIcon, XIcon, FoldersIcon, FileIcon, FileCodeIcon, FileImageIcon } from "@phosphor-icons/react";
import type { GlobalContextBarProps } from "../../../types/components";
import "./global-context-bar.css";

const FILE_ICONS: Record<string, React.ReactNode> = {
	md: <FileTextIcon />,
	canvas: <FileImageIcon />,
	json: <FileCodeIcon />,
};

const DEFAULT_ICON = <FileIcon />;

const getFileIcon = (file: TFile | null): React.ReactNode => {
	if (!file) return DEFAULT_ICON;
	return FILE_ICONS[file.extension] || DEFAULT_ICON;
};

export const GlobalContextBar: React.FC<GlobalContextBarProps> = ({
	app,
	selectedFile,
	onFileSelect,
}) => {
	const [searchQuery, setSearchQuery] = useState("");

	const allFiles = useMemo(() => app.vault.getFiles(), [app.vault]);

	const filteredFiles = useMemo(() => {
		const query = searchQuery.trim().toLowerCase();
		if (!query) return allFiles;

		return allFiles.filter(
			(file) =>
				file.path.toLowerCase().includes(query) ||
				file.basename.toLowerCase().includes(query)
		);
	}, [allFiles, searchQuery]);

	const handleUseActiveFile = () => {
		const activeFile = app.workspace.getActiveFile();
		if (activeFile) {
			onFileSelect(activeFile);
		}
	};

	const handleClearSelection = () => {
		onFileSelect(null);
	};

	const handleFileSelect = (value: string | null) => {
		if (value) {
			const file = allFiles.find((f) => f.path === value);
			if (file) {
				onFileSelect(file);
			}
		}
	};

	return (
		<div className="gcb-container">
			<div className="gcb-content">
				{/* Left Section - File Info */}
				<div className="gcb-left">
					<div className="gcb-icon-wrapper">{getFileIcon(selectedFile)}</div>
					<div className="gcb-info">
						<span className="gcb-label">Context File</span>
						<span className="gcb-filename" title={selectedFile?.path ?? undefined}>
							{selectedFile ? selectedFile.basename : "No file selected"}
						</span>
						{selectedFile && (
							<span className="gcb-filepath">{selectedFile.path}</span>
						)}
					</div>
				</div>

				{/* Right Section - Actions */}
				<div className="gcb-actions">
					<Button
						variant="outline"
						size="sm"
						onClick={handleUseActiveFile}
						title="Use the currently active file in Obsidian"
					>
						<FoldersIcon />
						<span className="gcb-btn-text">Use Active</span>
					</Button>

					{selectedFile && (
						<Button
							variant="ghost"
							size="sm"
							onClick={handleClearSelection}
							title="Clear the selected file"
						>
							<XIcon />
							<span className="gcb-btn-text">Clear</span>
						</Button>
					)}

					{/* File Picker Combobox */}
					<Combobox
						value={selectedFile?.path ?? ""}
						inputValue={searchQuery}
						onValueChange={handleFileSelect}
						onInputValueChange={setSearchQuery}
					>
						<ComboboxInput
							showTrigger={false}
							showClear={false}
							placeholder="Search files..."
							className="gcb-combobox-input"
						/>
						<ComboboxContent align="end" sideOffset={4} className="gcb-combobox-content">
							<ComboboxList className="gcb-combobox-list">
								<ComboboxGroup>
									<ComboboxLabel>Files in Vault</ComboboxLabel>
									{filteredFiles.length === 0 ? (
										<ComboboxEmpty className="gcb-combobox-empty">
											No files found
										</ComboboxEmpty>
									) : (
										filteredFiles.slice(0, 50).map((file) => (
											<ComboboxItem key={file.path} value={file.path}>
												<span className="gcb-combobox-item-icon">
													{getFileIcon(file)}
												</span>
												<div className="gcb-combobox-item-content">
													<span className="gcb-combobox-item-name">
														{file.basename}
													</span>
													<span className="gcb-combobox-item-path">
														{file.path}
													</span>
												</div>
											</ComboboxItem>
										))
									)}
								</ComboboxGroup>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
			</div>
		</div>
	);
};
