/**
 * Test Panel Types
 * Defines all interfaces and types for the test panel functionality
 */

import type { App, TFile } from "obsidian";

export interface TestOutput {
	id: string;
	title: string;
	content: string;
	status: "success" | "error" | "info";
	timestamp: string;
}

export type TabId = "search" | "ops" | "info" | "files" | "labs" | "chat";

export interface TestPanelState {
	activeTab: TabId;
	selectedFile: TFile | null;
	testOutputs: TestOutput[];
	isLoading: boolean;
}

// Search Tab State
export interface SearchState {
	quickSearchQuery: string;
	enhancedSearchQuery: string;
	fuzzyQuery: string;
	searchResults: unknown[];
}

// Operations Tab State
export interface OperationsState {
	getContentsPath: string;
	appendContentPath: string;
	appendText: string;
	patchContentPath: string;
	deleteFilePath: string;
}

// Info Tab State
export interface InfoState {
	updateFrontmatterPath: string;
}

// Files Tab State
export interface FilesState {
	dirPath: string;
}

// Labs Tab State
export interface LabsState {
	readSectionPath: string;
	subpath: string;
	readCanvasPath: string;
	/** Max depth for worker-based graph context */
	smartContextDepth: number;
}

export interface TestPanelModernProps {
	app: App;
}
