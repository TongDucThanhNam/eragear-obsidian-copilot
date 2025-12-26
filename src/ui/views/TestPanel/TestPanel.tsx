/**
 * TestPanel Component - Refactored
 * Main test panel for vault operations
 *
 * This component coordinates multiple sub-components and hooks
 * for a clean separation of concerns
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";

import { ConsoleLog, GlobalContextBar, TabNavigation } from "../../components";
import { useFileOperations, useSearch, useTestOutput } from "../../hooks";
import type {
	FilesState,
	InfoState,
	LabsState,
	OperationsState,
	SearchState,
	TabId,
} from "../../types";
import { TABS } from "./constants";
import {
	FilesTabRenderer,
	InfoTabRenderer,
	LabsTabRenderer,
	OperationsTabRenderer,
	SearchTabRenderer,
} from "./tabs";
import "./TestPanel.css";

export interface TestPanelProps {
	app: App;
}

export const TestPanel: React.FC<TestPanelProps> = ({ app }) => {
	// Core state
	const [activeTab, setActiveTab] = useState<TabId>("search");
	const [selectedFile, setSelectedFile] = useState<TFile | null>(null);
	const [isLoading, setIsLoading] = useState(false);

	// Hooks
	const { testOutputs, addTestOutput, clearTestOutputs } = useTestOutput();
	const { searchResults, setSearchResults, ...searchHooks } = useSearch({
		app,
		onAddOutput: addTestOutput,
	});
	const fileOps = useFileOperations({ app, onAddOutput: addTestOutput });

	// Tab-specific state
	const [searchState, setSearchState] = useState<SearchState>({
		quickSearchQuery: "",
		enhancedSearchQuery: "",
		fuzzyQuery: "",
		searchResults: [],
	});

	const [opsState, setOpsState] = useState<OperationsState>({
		getContentsPath: "",
		appendContentPath: "",
		appendText: "",
		patchContentPath: "",
		deleteFilePath: "",
	});

	const [infoState, setInfoState] = useState<InfoState>({
		updateFrontmatterPath: "",
	});

	const [filesState, setFilesState] = useState<FilesState>({
		dirPath: "",
	});

	const [labsState, setLabsState] = useState<LabsState>({
		readSectionPath: "",
		subpath: "",
		readCanvasPath: "",
	});

	// Search tab handlers
	const handleQuickSearch = async () => {
		setIsLoading(true);
		try {
			searchHooks.handleQuickSearch(searchState.quickSearchQuery);
		} finally {
			setIsLoading(false);
		}
	};

	const handleEnhancedSearch = async () => {
		setIsLoading(true);
		try {
			searchHooks.handleEnhancedSearch(searchState.enhancedSearchQuery);
		} finally {
			setIsLoading(false);
		}
	};

	const handleFuzzySearch = async () => {
		setIsLoading(true);
		try {
			searchHooks.handleFuzzySearch(searchState.fuzzyQuery);
		} finally {
			setIsLoading(false);
		}
	};

	// Operations tab handlers
	const handleGetStructure = async () => {
		setIsLoading(true);
		try {
			fileOps.getNoteStructure();
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetContents = async () => {
		setIsLoading(true);
		try {
			const path = opsState.getContentsPath || selectedFile?.path;
			if (!path?.trim()) {
				addTestOutput("✗ getFileContents()", "Select a file first", "info");
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
				addTestOutput(
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
				addTestOutput("✗ patchContent()", "Select a file first", "info");
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
				addTestOutput("✗ deleteFile()", "Select a file first", "info");
				return;
			}
			await fileOps.deleteFile(path);
		} finally {
			setIsLoading(false);
		}
	};

	// Info tab handlers
	const handleGetMetadata = async () => {
		setIsLoading(true);
		try {
			fileOps.getMetadata();
		} finally {
			setIsLoading(false);
		}
	};

	const handleUpdateFrontmatter = async () => {
		setIsLoading(true);
		try {
			const path = infoState.updateFrontmatterPath || selectedFile?.path;
			if (!path?.trim()) {
				addTestOutput("✗ updateFrontmatter()", "Select a file first", "info");
				return;
			}
			await fileOps.updateFrontmatter(path);
		} finally {
			setIsLoading(false);
		}
	};

	const handleGetActiveFile = async () => {
		fileOps.getActiveFile();
	};

	// Files tab handlers
	const handleListFilesInVault = async () => {
		setIsLoading(true);
		try {
			fileOps.listFilesInVault();
		} finally {
			setIsLoading(false);
		}
	};

	const handleListFilesInDir = async () => {
		setIsLoading(true);
		try {
			if (!filesState.dirPath.trim()) {
				addTestOutput("✗ listFilesInDir()", "Enter directory path", "info");
				return;
			}
			fileOps.listFilesInDir(filesState.dirPath);
		} finally {
			setIsLoading(false);
		}
	};

	// Labs tab handlers
	const handleGetRelatedFiles = async () => {
		fileOps.getRelatedFiles();
	};

	const handleReadSpecificSection = async () => {
		setIsLoading(true);
		try {
			const path = labsState.readSectionPath || selectedFile?.path;
			if (!path?.trim() || !labsState.subpath.trim()) {
				addTestOutput(
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
				addTestOutput("✗ readCanvas()", "Select a .canvas file", "info");
				return;
			}
			await fileOps.readCanvas(path);
		} finally {
			setIsLoading(false);
		}
	};

	// Render helper
	const renderTabContent = () => {
		switch (activeTab) {
			case "search":
				return (
					<SearchTabRenderer
						searchState={{ ...searchState, searchResults }}
						isLoading={isLoading}
						onQuickSearchChange={(query) =>
							setSearchState((prev) => ({ ...prev, quickSearchQuery: query }))
						}
						onEnhancedSearchChange={(query) =>
							setSearchState((prev) => ({
								...prev,
								enhancedSearchQuery: query,
							}))
						}
						onFuzzySearchChange={(query) =>
							setSearchState((prev) => ({ ...prev, fuzzyQuery: query }))
						}
						onQuickSearch={handleQuickSearch}
						onEnhancedSearch={handleEnhancedSearch}
						onFuzzySearch={handleFuzzySearch}
					/>
				);

			case "ops":
				return (
					<OperationsTabRenderer
						opsState={opsState}
						isLoading={isLoading}
						selectedFile={selectedFile}
						onGetContentsPathChange={(path) =>
							setOpsState((prev) => ({ ...prev, getContentsPath: path }))
						}
						onAppendContentPathChange={(path) =>
							setOpsState((prev) => ({ ...prev, appendContentPath: path }))
						}
						onAppendTextChange={(text) =>
							setOpsState((prev) => ({ ...prev, appendText: text }))
						}
						onPatchContentPathChange={(path) =>
							setOpsState((prev) => ({ ...prev, patchContentPath: path }))
						}
						onDeleteFilePathChange={(path) =>
							setOpsState((prev) => ({ ...prev, deleteFilePath: path }))
						}
						onGetStructure={handleGetStructure}
						onGetContents={handleGetContents}
						onAppendContent={handleAppendContent}
						onPatchContent={handlePatchContent}
						onDeleteFile={handleDeleteFile}
					/>
				);

			case "info":
				return (
					<InfoTabRenderer
						updateFrontmatterPath={infoState.updateFrontmatterPath}
						isLoading={isLoading}
						selectedFile={selectedFile}
						onUpdateFrontmatterPathChange={(path) =>
							setInfoState((prev) => ({ ...prev, updateFrontmatterPath: path }))
						}
						onGetMetadata={handleGetMetadata}
						onUpdateFrontmatter={handleUpdateFrontmatter}
						onGetActiveFile={handleGetActiveFile}
					/>
				);

			case "files":
				return (
					<FilesTabRenderer
						filesState={filesState}
						isLoading={isLoading}
						onDirPathChange={(path) =>
							setFilesState((prev) => ({ ...prev, dirPath: path }))
						}
						onListFilesInVault={handleListFilesInVault}
						onListFilesInDir={handleListFilesInDir}
					/>
				);

			case "labs":
				return (
					<LabsTabRenderer
						labsState={labsState}
						isLoading={isLoading}
						selectedFile={selectedFile}
						onReadSectionPathChange={(path) =>
							setLabsState((prev) => ({ ...prev, readSectionPath: path }))
						}
						onSubpathChange={(path) =>
							setLabsState((prev) => ({ ...prev, subpath: path }))
						}
						onReadCanvasPathChange={(path) =>
							setLabsState((prev) => ({ ...prev, readCanvasPath: path }))
						}
						onGetRelatedFiles={handleGetRelatedFiles}
						onReadSpecificSection={handleReadSpecificSection}
						onReadCanvas={handleReadCanvas}
					/>
				);

			default:
				return null;
		}
	};

	return (
		<div className="test-panel-modern-wrapper">
			{/* Global Context Bar */}
			<GlobalContextBar
				app={app}
				selectedFile={selectedFile}
				onFileSelect={setSelectedFile}
			/>

			{/* Tab Navigation */}
			<TabNavigation
				tabs={TABS}
				activeTab={activeTab}
				onTabChange={(tab) => setActiveTab(tab as TabId)}
			/>

			{/* Main Layout Container */}
			<div className="test-panel-layout-container">
				{/* Top Section (70%) - Test Content */}
				<div className="test-panel-top-section">
					<div className="test-panel-content-area">{renderTabContent()}</div>
				</div>

				{/* Bottom Section (30%) - Results */}
				<div className="test-panel-bottom-section">
					<ConsoleLog testOutputs={testOutputs} onClear={clearTestOutputs} />
				</div>
			</div>
		</div>
	);
};
