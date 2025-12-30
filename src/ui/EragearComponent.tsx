import type { App } from "obsidian";
import type React from "react";
import { useState } from "react";
import { AppContextProvider } from "./context/AppContext";
import { ChatPanel } from "./views/ChatPanel/ChatPanel";
import { TestPanel } from "./views/TestPanel";

import type EragearPlugin from "../main";

interface EragearComponentProps {
	app: App;
	plugin: EragearPlugin;
}

type ViewMode = "chat" | "playground";

export const EragearComponent: React.FC<EragearComponentProps> = ({
	app,
	plugin,
}) => {
	const [viewMode, setViewMode] = useState<ViewMode>("chat");

	return (
		<AppContextProvider>
			<div className="eragear-main">
				{/* Top-Level Mode Switcher */}
				<div className="eragear-panel-tabs">
					<button
						type="button"
						className={`eragear-panel-tab ${viewMode === "chat" ? "active" : ""}`}
						onClick={() => setViewMode("chat")}
					>
						💬 Chat
					</button>
					<button
						type="button"
						className={`eragear-panel-tab ${viewMode === "playground" ? "active" : ""}`}
						onClick={() => setViewMode("playground")}
					>
						🛠️ Playground
					</button>
				</div>

				{/* Content Area */}
				<div className="eragear-panel-content">
					{viewMode === "chat" ? (
						<ChatPanel app={app} plugin={plugin} />
					) : (
						<TestPanel app={app} />
					)}
				</div>
			</div>
		</AppContextProvider>
	);
};
