import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "@/components/ui/tabs";
import type { App } from "obsidian";
import type React from "react";
import { AppContextProvider } from "../../context/AppContext";
import EragearPlugin from "@/main";
import { ChatPanel } from "@/views/ChatPanel/ChatPanel";
import { TestPanel } from "@/views/TestPanel/TestPanel";

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
		</AppContextProvider>
	);
};
