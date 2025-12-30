import { Tabs } from "@base-ui/react/tabs";
import type { App } from "obsidian";
import type React from "react";
import type EragearPlugin from "../main";
import { AppContextProvider } from "./context/AppContext";
import { ChatPanel } from "./views/ChatPanel/ChatPanel";
import { TestPanel } from "./views/TestPanel";

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
				<Tabs.Root defaultValue="chat" className="eragear-main-tabs">
					<Tabs.List className="eragear-tabs-list">
						<Tabs.Tab value="chat" className="eragear-tab">
							💬 Chat
						</Tabs.Tab>
						<Tabs.Tab value="playground" className="eragear-tab">
							🛠️ Playground
						</Tabs.Tab>
						<Tabs.Indicator className="eragear-tabs-indicator" />
					</Tabs.List>

					<Tabs.Panel value="chat" className="eragear-tab-panel">
						<ChatPanel app={app} plugin={plugin} />
					</Tabs.Panel>
					<Tabs.Panel value="playground" className="eragear-tab-panel">
						<TestPanel app={app} />
					</Tabs.Panel>
				</Tabs.Root>
			</div>
		</AppContextProvider>
	);
};
