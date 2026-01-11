/**
 * TestPanel Component - Modularized
 * Main test panel that orchestrates sub-modules
 */

import type { App, TFile } from "obsidian";
import type React from "react";
import { useState } from "react";

import { useTestOutput } from "@/hooks";
import type { TabId } from "@/types/testPanel";
import { TABS } from "./constants";
import { FilesTab } from "../../../components/TestPanel/tabs/FilesTab";
import { InfoTab } from "../../../components/TestPanel/tabs/InfoTab";
import { LabsTab } from "../../../components/TestPanel/tabs/LabsTab";
import { OperationsTab } from "../../../components/TestPanel/tabs/OperationsTab";
import { SearchTab } from "../../../components/TestPanel/tabs/SearchTab";
import "./TestPanel.css";
import { GlobalContextBar } from "@/components/Settings/GlobalContextBar/GlobalContextBar";
import { TabNavigation } from "@/components/TabNavigation/TabNavigation";
import { ConsoleLog } from "@/components/ConsoleLog/ConsoleLog";
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
