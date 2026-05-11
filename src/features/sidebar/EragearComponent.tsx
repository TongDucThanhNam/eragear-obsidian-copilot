import type { App } from "obsidian";
import type React from "react";
import { PortalProvider } from "@/components/ui/portal-provider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type EragearPlugin from "@/main";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { TestPanel } from "@/features/test-panel/TestPanel";
import { AppContextProvider } from "@/shared/context/AppContext";

interface EragearComponentProps {
	app: App;
	plugin: EragearPlugin;
}

export const EragearComponent: React.FC<EragearComponentProps> = ({
	app,
	plugin,
}) => {
	// Active TABS management (defaultValue="chat")
	return (
		<AppContextProvider>
			<PortalProvider>
				<div className="eragear-copilot-root">
					<div className="eragear-main">
						<Tabs defaultValue="chat" className="eragear-main-tabs">
							<TabsList className="">
								<TabsTrigger value="chat" className="">
									💬 Chat
								</TabsTrigger>
								<TabsTrigger value="playground" className="">
									🛠️ Playground
								</TabsTrigger>
							</TabsList>

							<TabsContent value="chat" className="">
								<ChatPanel app={app} plugin={plugin} />
							</TabsContent>
							<TabsContent value="playground" className="eragear-tab-panel">
								<TestPanel app={app} />
							</TabsContent>
						</Tabs>
					</div>
				</div>
			</PortalProvider>
		</AppContextProvider>
	);
};
