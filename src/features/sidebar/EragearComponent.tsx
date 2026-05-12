import type { App } from "obsidian";
import type React from "react";
import "@/components/ui/tokens.css";
import { PortalProvider } from "@/components/ui/portal-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconBrain, IconMessage, IconWrench } from "@/components/ui/Icons";
import type EragearPlugin from "@/main";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { TestPanel } from "@/features/test-panel/TestPanel";
import { AppContextProvider } from "@/shared/context/AppContext";
import { CommandCenterView } from "@/views/command-center/CommandCenterView";

interface EragearComponentProps {
	app: App;
	plugin: EragearPlugin;
}

export const EragearComponent: React.FC<EragearComponentProps> = ({
	app,
	plugin,
}) => {
	// Active tabs management.
	return (
		<AppContextProvider>
			<div className="eragear-copilot-root">
				<PortalProvider>
					<div className="eragear-main">
						<Tabs defaultValue="learning" className="eragear-main-tabs">
							<TabsList className="eragear-main-tabs-list">
								<TabsTrigger value="learning" className="">
									<IconBrain />
									<span>Learn</span>
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
								<CommandCenterView plugin={plugin} />
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
