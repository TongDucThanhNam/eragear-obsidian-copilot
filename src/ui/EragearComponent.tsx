import type { App } from "obsidian";
import type React from "react";
import { TestPanel } from "./views/TestPanel";
import "./EragearComponent.css";

interface EragearComponentProps {
	app: App;
}

export const EragearComponent: React.FC<EragearComponentProps> = ({ app }) => {
	return (
		<div className="eragear-main">
			<TestPanel app={app} />
		</div>
	);
};
