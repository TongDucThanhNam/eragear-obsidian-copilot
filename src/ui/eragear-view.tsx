import { ItemView, WorkspaceLeaf } from "obsidian";
import { createRoot, type Root } from "react-dom/client";
import { EragearComponent } from "./EragearComponent";

export const ERAGEAR_VIEW_TYPE = "eragear-copilot-view";

import type EragearPlugin from "../main";

/**
 * EragearView: Custom Obsidian View for Eragear Copilot Sidebar
 *
 * This class represents the visual component displayed in the sidebar.
 * It manages the lifecycle of React component rendering and cleanup.
 */
export class EragearView extends ItemView {
	root: Root | null = null;
	plugin: EragearPlugin;

	constructor(leaf: WorkspaceLeaf, plugin: EragearPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	/**
	 * Returns the unique identifier for this view type.
	 * Obsidian uses this to persist and restore the view.
	 */
	getViewType(): string {
		return ERAGEAR_VIEW_TYPE;
	}

	/**
	 * Returns the display text shown on the tab.
	 */
	getDisplayText(): string {
		return "Eragear Copilot";
	}

	/**
	 * Returns the icon name (from Lucide icons) shown on the tab.
	 * https://lucide.dev/
	 */
	getIcon(): string {
		return "bot";
	}

	/**
	 * Lifecycle hook: Called when the view is opened.
	 * This is where we mount our React application.
	 */
	async onOpen() {
		// containerEl.children[0] is the header (with icon/title)
		// containerEl.children[1] is the content area where we render
		const container = this.containerEl.children[1];
		if (!container) return;

		container.empty();

		// Mount React component into the container
		// Pass app as props to the component
		this.root = createRoot(container as HTMLElement);
		this.root.render(<EragearComponent app={this.app} plugin={this.plugin} />);
	}

	/**
	 * Lifecycle hook: Called when the view is closed.
	 * Clean up React component.
	 */
	async onClose() {
		if (this.root) {
			this.root.unmount();
			this.root = null;
		}
	}
}
