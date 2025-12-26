/**
 * GlobalContextBar Component
 * Displays and manages the currently selected file context
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";
import type { GlobalContextBarProps } from "../../types";

export const GlobalContextBar: React.FC<GlobalContextBarProps> = ({
	app,
	selectedFile,
	onFileSelect,
}) => {
	const [showFilePicker, setShowFilePicker] = useState(false);

	const handleUseActiveFile = () => {
		const activeFile = app.workspace.getActiveFile();
		if (activeFile) {
			onFileSelect(activeFile);
			setShowFilePicker(false);
		}
	};

	const handleClearSelection = () => {
		onFileSelect(null);
	};

	const getFileIcon = (file: TFile | null): string => {
		if (!file) return "📄";
		if (file.extension === "md") return "📝";
		if (file.extension === "canvas") return "🎨";
		if (file.extension === "json") return "⚙️";
		return "📄";
	};

	return (
		<div className="global-context-bar">
			<div className="context-bar-left">
				<span className="context-icon">{getFileIcon(selectedFile)}</span>
				<div className="context-info">
					<span className="context-label">Target File:</span>
					<span className="context-value">
						{selectedFile ? selectedFile.path : "None selected"}
					</span>
				</div>
			</div>

			<div className="context-bar-right">
				<button
					type="button"
					className="context-btn context-btn-primary"
					onClick={handleUseActiveFile}
					title="Use the currently active file in Obsidian"
				>
					📌 Use Active
				</button>

				{selectedFile && (
					<button
						type="button"
						className="context-btn context-btn-secondary"
						onClick={handleClearSelection}
						title="Clear the selected file"
					>
						✕ Clear
					</button>
				)}

				<button
					type="button"
					className="context-btn context-btn-secondary"
					onClick={() => setShowFilePicker(!showFilePicker)}
					title="Browse vault files"
				>
					🔍 Pick
				</button>
			</div>

			{/* File Picker Dropdown */}
			{showFilePicker && (
				<div className="context-file-picker">
					<input
						type="text"
						className="context-file-input"
						placeholder="Type to search files..."
						autoFocus
						onKeyDown={(e) => {
							if (e.key === "Escape") setShowFilePicker(false);
						}}
						onChange={(e) => {
							// File search will be implemented with FileSuggester component
						}}
					/>
					<div className="context-file-list">
						{app.vault
							.getFiles()
							.slice(0, 10)
							.map((file: TFile) => (
								<div
									key={file.path}
									className="context-file-item"
									onClick={() => {
										onFileSelect(file);
										setShowFilePicker(false);
									}}
									role="button"
									tabIndex={0}
									onKeyDown={(e) => {
										if (e.key === "Enter") {
											onFileSelect(file);
											setShowFilePicker(false);
										}
									}}
								>
									<span className="context-file-icon">
										{file.extension === "md" ? "📝" : "📄"}
									</span>
									<span className="context-file-name">{file.basename}</span>
									<span className="context-file-path">{file.path}</span>
								</div>
							))}
					</div>
				</div>
			)}
		</div>
	);
};
