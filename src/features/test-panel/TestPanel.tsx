/**
 * TestPanel Component - Modularized
 * Main test panel that orchestrates sub-modules
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";

import { useTestOutput } from "@/features/test-panel/hooks/useTestOutput";
import type { TabId } from "@/features/test-panel/types";
import { TABS } from "./constants";
import { FilesTab } from "@/features/test-panel/tabs/FilesTab";
import { InfoTab } from "@/features/test-panel/tabs/InfoTab";
import { LabsTab } from "@/features/test-panel/tabs/LabsTab";
import { OperationsTab } from "@/features/test-panel/tabs/OperationsTab";
import { SearchTab } from "@/features/test-panel/tabs/SearchTab";
import "./TestPanel.css";
import { GlobalContextBar } from "@/features/test-panel/components/GlobalContextBar/GlobalContextBar";
import { ConsoleLog } from "@/features/test-panel/components/ConsoleLog/ConsoleLog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export interface TestPanelProps {
	app: App;
}

export const TestPanel: React.FC<TestPanelProps> = ({ app }) => {
	// Core state
	const [activeTab, setActiveTab] = useState<TabId>("search");
	const [selectedFile, setSelectedFile] = useState<TFile | null>(null);
	const [isConsoleCollapsed, setIsConsoleCollapsed] = useState(false);

	// Output management
	const { testOutputs, addTestOutput, clearTestOutputs } = useTestOutput();

	return (
		<div className="test-panel-modern-wrapper">
			{/* Global Context Bar */}
			<GlobalContextBar
				app={app}
				selectedFile={selectedFile}
				onFileSelect={setSelectedFile}
			/>

			

			{/* Main Layout Container */}
			<div
				className={`test-panel-layout-container ${isConsoleCollapsed ? "has-collapsed-console" : ""}`}
			>
				{/* Tab Navigation */}
			<Tabs value={activeTab} onValueChange={setActiveTab}>
				<TabsList className="tab-navigation">
					{TABS.map((tab) => (
						<TabsTrigger
							key={tab.id}
							value={tab.id}
							title={tab.tooltip}
							aria-label={tab.label}
							className="tab-nav-trigger"
						>
							<span className="tab-nav-icon">{tab.icon}</span>
							<span className="tab-nav-label">{tab.label}</span>
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="search">
					<SearchTab app={app} onAddOutput={addTestOutput} />
				</TabsContent>
				<TabsContent value="ops">
					<OperationsTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
					/>
				</TabsContent>
				<TabsContent value="info">
					<InfoTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
					/>
				</TabsContent>
				<TabsContent value="files">
					<FilesTab app={app} onAddOutput={addTestOutput} />
				</TabsContent>
				<TabsContent value="labs">
					<LabsTab
						app={app}
						selectedFile={selectedFile}
						onAddOutput={addTestOutput}
					/>
				</TabsContent>
			</Tabs>
			
				{/* Bottom Section - Sticky */}
				<div className="test-panel-bottom-section">
					<ConsoleLog
						testOutputs={testOutputs}
						onClear={clearTestOutputs}
						isCollapsed={isConsoleCollapsed}
						setIsCollapsed={setIsConsoleCollapsed}
					/>
				</div>
			</div>
		</div>
	);
};
