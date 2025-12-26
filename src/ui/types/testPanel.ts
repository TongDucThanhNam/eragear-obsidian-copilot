/**
 * Test Panel Types
 * Defines all interfaces and types for the test panel functionality
 */

export interface TestOutput {
    id: string;
    title: string;
    content: string;
    status: "success" | "error" | "info";
    timestamp: string;
}

export interface Tab {
    id: string;
    icon: string;
    label: string;
    tooltip: string;
}

export type TabId = "search" | "ops" | "info" | "files" | "labs";

export interface TestPanelState {
    activeTab: TabId;
    selectedFile: any | null;
    testOutputs: TestOutput[];
    isLoading: boolean;
}

// Search Tab State
export interface SearchState {
    quickSearchQuery: string;
    enhancedSearchQuery: string;
    fuzzyQuery: string;
    searchResults: any[];
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
}

export interface TestPanelModernProps {
    app: any;
}
