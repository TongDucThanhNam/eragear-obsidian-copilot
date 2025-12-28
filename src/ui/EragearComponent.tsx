import type { App } from "obsidian";
import type React from "react";
import { AppContextProvider } from "./context/AppContext";
import { TestPanel } from "./views/TestPanel";

interface EragearComponentProps {
	app: App;
}

export const EragearComponent: React.FC<EragearComponentProps> = ({ app }) => {
	return (
		<AppContextProvider>
			<div className="eragear-main">
				<TestPanel app={app} />
			</div>
		</AppContextProvider>
	);
};
