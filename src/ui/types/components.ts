/**
 * Types for UI Components
 */

import type React from "react";
import type { App, TFile } from "obsidian";
import type { TestOutput } from "./testPanel";

export interface ActionCardProps {
	title: string;
	description?: string;
	icon: string;
	variant?: "safe" | "destructive" | "default";
	children: React.ReactNode;
}

export interface ActionCardGroupProps {
	title: string;
	children: React.ReactNode;
}

export interface GlobalContextBarProps {
	app: App;
	selectedFile: TFile | null;
	onFileSelect: (file: TFile | null) => void;
}

export interface TabNavigationProps {
	tabs: Tab[];
	activeTab: string;
	onTabChange: (tabId: string) => void;
}

export interface Tab {
	id: string;
	icon: string;
	label: string;
	tooltip: string;
}

export interface ConsoleLogProps {
	testOutputs: TestOutput[];
	onClear: () => void;
	isCollapsed: boolean;
	setIsCollapsed: (collapsed: boolean) => void;
}
