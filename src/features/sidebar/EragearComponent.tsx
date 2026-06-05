import type { App } from "obsidian";
import React from "react";
import "@/components/ui/tokens.css";
import { PortalProvider } from "@/components/ui/portal-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	IconBrain,
	IconFileText,
	IconMagic,
	IconMessage,
	IconPackage,
	IconWrench,
} from "@/components/ui/Icons";
import type EragearPlugin from "@/main";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { TestPanel } from "@/features/test-panel/TestPanel";
import { AppContextProvider } from "@/shared/context/AppContext";
import {
	CommandCenterView,
	type CommandCenterMode,
} from "@/views/command-center/CommandCenterView";

interface EragearComponentProps {
	app: App;
	plugin: EragearPlugin;
}

export const EragearComponent: React.FC<EragearComponentProps> = ({
	app,
	plugin,
}) => {
	const [activeTab, setActiveTab] = React.useState("learning");
	const learningMode = toCommandCenterMode(activeTab);

	// Active tabs management.
	return (
		<AppContextProvider>
			<div className="eragear-copilot-root">
				<PortalProvider>
					<div className="eragear-main">
						<Tabs
							value={activeTab}
							onValueChange={(value) => setActiveTab(value)}
							className="eragear-main-tabs"
						>
							<TabsList className="eragear-main-tabs-list">
								<TabsTrigger value="learning" className="">
									<IconBrain />
									<span>Learning</span>
								</TabsTrigger>
								<TabsTrigger value="inspector" className="">
									<IconFileText />
									<span>Inspector</span>
								</TabsTrigger>
								<TabsTrigger value="examiner" className="">
									<IconMagic />
									<span>Examiner</span>
								</TabsTrigger>
								<TabsTrigger value="artifacts" className="">
									<IconPackage />
									<span>Artifacts</span>
								</TabsTrigger>
								<TabsTrigger value="chat" className="">
									<IconMessage />
									<span>Chat</span>
								</TabsTrigger>
								<TabsTrigger value="playground" className="">
									<IconWrench />
									<span>Labs</span>
								</TabsTrigger>
							</TabsList>

							<TabsContent value="learning" className="eragear-tab-panel">
								{activeTab === "learning" && learningMode ? (
									<CommandCenterView plugin={plugin} mode="learning" />
								) : null}
							</TabsContent>
							<TabsContent value="inspector" className="eragear-tab-panel">
								{activeTab === "inspector" && learningMode ? (
									<CommandCenterView plugin={plugin} mode="inspector" />
								) : null}
							</TabsContent>
							<TabsContent value="examiner" className="eragear-tab-panel">
								{activeTab === "examiner" && learningMode ? (
									<CommandCenterView plugin={plugin} mode="examiner" />
								) : null}
							</TabsContent>
							<TabsContent value="artifacts" className="eragear-tab-panel">
								{activeTab === "artifacts" && learningMode ? (
									<CommandCenterView plugin={plugin} mode="artifacts" />
								) : null}
							</TabsContent>
							<TabsContent value="chat" className="">
								<ChatPanel app={app} plugin={plugin} />
							</TabsContent>
							<TabsContent value="playground" className="eragear-tab-panel">
								<TestPanel app={app} />
							</TabsContent>
						</Tabs>
					</div>
				</PortalProvider>
			</div>
		</AppContextProvider>
	);
};

function toCommandCenterMode(value: string): CommandCenterMode | null {
	if (
		value === "learning" ||
		value === "inspector" ||
		value === "examiner" ||
		value === "artifacts"
	) {
		return value;
	}
	return null;
}
