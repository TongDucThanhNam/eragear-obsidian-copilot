import type { App } from "obsidian";
import type React from "react";
import { useState } from "react";
import { AppContextProvider } from "./context/AppContext";
import { ChatPanel } from "./views/ChatPanel/ChatPanel";
import { TestPanel } from "./views/TestPanel";

interface EragearComponentProps {
	app: App;
}

type ViewMode = "chat" | "playground";

export const EragearComponent: React.FC<EragearComponentProps> = ({ app }) => {
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
						<ChatPanel app={app} />
					) : (
						<TestPanel app={app} />
					)}
				</div>
			</div>
		</AppContextProvider>
	);
};
