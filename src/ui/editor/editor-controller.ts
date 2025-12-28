import type { App, MarkdownView } from "obsidian";
import type { EditorView } from "@codemirror/view";
import { addDiffEffect, type DiffChunk } from "./diff-view-plugin";

export class EditorController {
	constructor(private app: App) {}

	/**
	 * Dispatches a diff suggestion to the currently active Markdown editor.
	 */
	public injectDiff(diff: DiffChunk): boolean {
		// In Obsidian API, getActiveViewOfType(MarkdownView) is the way.
		// Since we don't have the class reference for 'instanceof' check easily without importing 'obsidian',
		// we rely on workspace.getActiveViewOfType if available, or just getActiveLeaf.

		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || activeLeaf.view.getViewType() !== "markdown") {
			console.warn("[Eragear] No active markdown view found");
			return false;
		}

		const activeView = activeLeaf.view as MarkdownView;

		// Access the underlying CodeMirror instance
		// In Obsidian 1.0+, (view.editor as any).cm is the CodeMirror 6 EditorView
		const editorView = (activeView.editor as any).cm as EditorView;

		if (!editorView) {
			console.error("[Eragear] Could not access CodeMirror instance");
			return false;
		}

		// Dispatch the effect
		editorView.dispatch({
			effects: addDiffEffect.of(diff),
		});

		return true;
	}

	/**
	 * Gets the current cursor position or selection
	 */
	public getContext(): {
		path: string;
		selection: string;
		cursor: number;
	} | null {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || activeLeaf.view.getViewType() !== "markdown") {
			return null;
		}

		const activeView = activeLeaf.view as MarkdownView;
		const editor = activeView.editor;

		// Map Obsidian cursor to some number/line
		const cursor = editor.getCursor();

		return {
			path: activeView.file?.path || "",
			selection: editor.getSelection(),
			cursor: cursor.line,
		};
	}
	/**
	 * Inserts text at the current cursor position.
	 */
	public insertText(text: string): boolean {
		const activeLeaf = this.app.workspace.activeLeaf;
		if (!activeLeaf || activeLeaf.view.getViewType() !== "markdown") {
			return false;
		}

		const activeView = activeLeaf.view as MarkdownView;
		const editor = activeView.editor;
		editor.replaceSelection(text);
		return true;
	}
}
