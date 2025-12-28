/**
 * TestPanel Component - Modularized
 * Main test panel that orchestrates sub-modules
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";

import { ConsoleLog, GlobalContextBar, TabNavigation } from "../../components";
import { useTestOutput } from "../../hooks";
import type { TabId } from "../../types";
import { TABS } from "./constants";
import { FilesTab, InfoTab, LabsTab, OperationsTab, SearchTab } from "./tabs";

export interface TestPanelProps {
	app: App;
}

export const TestPanel: React.FC<TestPanelProps> = ({ app }) => {
	// Core state
	const [activeTab, setActiveTab] = useState<TabId>("search");
	const [selectedFile, setSelectedFile] = useState<TFile | null>(null);

	// Output management
	const { testOutputs, addTestOutput, clearTestOutputs } = useTestOutput();

	// Render the active tab content
	const renderTabContent = () => {
		switch (activeTab) {
			case "search":
				return <SearchTab app={app} onAddOutput={addTestOutput} />;

			case "ops":
				return (
					<OperationsTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
					/>
				);

			case "info":
				return (
					<InfoTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
					/>
				);

			case "files":
				return <FilesTab app={app} onAddOutput={addTestOutput} />;

			case "labs":
				return (
					<LabsTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
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
