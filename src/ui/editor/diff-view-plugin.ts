import {
	Decoration,
	type DecorationSet,
	EditorView,
	ViewPlugin,
	type ViewUpdate,
	WidgetType,
} from "@codemirror/view";
import {
	RangeSetBuilder,
	StateField,
	type Transaction,
} from "@codemirror/state";

// --- Types ---

export interface DiffChunk {
	id: string;
	from: number; // Start position in the document
	to: number; // End position in the document (for replacement/deletion)
	originalText: string;
	suggestedText: string;
	type: "insert" | "delete" | "replace";
}

export type DiffAction = "accept" | "reject";

// --- State Field (Source of Truth) ---

export const diffStateField = StateField.define<DiffChunk[]>({
	create() {
		return [];
	},
	update(diffs, tr: Transaction) {
		// 1. Handle external updates (e.g. adding a new suggestion via dispatch)
		const newDiffs = tr.effects
			.filter((e) => e.is(addDiffEffect))
			.map((e) => e.value);

		if (newDiffs.length > 0) {
			return [...diffs, ...newDiffs];
		}

		// 2. Handle changes in the document (adjust positions of existing diffs)
		// If user types somewhere, we need to map the diff positions
		if (tr.docChanged) {
			return diffs
				.map((diff) => {
					const from = tr.changes.mapPos(diff.from);
					const to = tr.changes.mapPos(diff.to);
					return { ...diff, from, to };
				})
				.filter((diff) => diff.to >= diff.from); // Filter out invalid ones if any
		}

		return diffs;
	},
});

// --- Actions (Effects) ---

import { StateEffect } from "@codemirror/state";

export const addDiffEffect = StateEffect.define<DiffChunk>();
export const removeDiffEffect = StateEffect.define<string>(); // ID

// --- Decorations (View) ---

const diffTheme = EditorView.baseTheme({
	".eragear-diff-insert": {
		backgroundColor: "rgba(34, 197, 94, 0.2)", // Green background
		textDecoration: "none",
	},
	".eragear-diff-delete": {
		backgroundColor: "rgba(239, 68, 68, 0.2)", // Red background
		textDecoration: "line-through",
		opacity: "0.8",
	},
	".eragear-diff-widget": {
		display: "inline-block",
		marginLeft: "4px",
		verticalAlign: "middle",
	},
	".eragear-diff-btn": {
		cursor: "pointer",
		padding: "2px 6px",
		borderRadius: "4px",
		fontSize: "12px",
		fontWeight: "bold",
		marginLeft: "2px",
		border: "none",
		color: "white",
	},
	".eragear-btn-accept": {
		backgroundColor: "#22c55e",
	},
	".eragear-btn-reject": {
		backgroundColor: "#ef4444",
	},
});

class DiffWidget extends WidgetType {
	constructor(
		readonly id: string,
		readonly onAction: (id: string, action: DiffAction) => void,
	) {
		super();
	}

	toDOM() {
		const wrap = document.createElement("span");
		wrap.className = "eragear-diff-widget";

		// Accept Button
		const accept = document.createElement("button");
		accept.textContent = "✓";
		accept.className = "eragear-diff-btn eragear-btn-accept";
		accept.title = "Accept Change";
		accept.onclick = (e) => {
			e.preventDefault();
			this.onAction(this.id, "accept");
		};

		// Reject Button
		const reject = document.createElement("button");
		reject.textContent = "✗";
		reject.className = "eragear-diff-btn eragear-btn-reject";
		reject.title = "Reject Change";
		reject.onclick = (e) => {
			e.preventDefault();
			this.onAction(this.id, "reject");
		};

		wrap.appendChild(accept);
		wrap.appendChild(reject);
		return wrap;
	}

	ignoreEvent() {
		return true;
	}
}

export const diffPlugin = ViewPlugin.fromClass(
	class {
		decorations: DecorationSet;

		constructor(view: EditorView) {
			this.decorations = this.buildDecorations(view);
		}

		update(update: ViewUpdate) {
			if (
				update.docChanged ||
				update.viewportChanged ||
				update.state.field(diffStateField) !==
					update.startState.field(diffStateField)
			) {
				this.decorations = this.buildDecorations(update.view);
			}
		}

		buildDecorations(view: EditorView) {
			const builder = new RangeSetBuilder<Decoration>();
			const diffs = view.state.field(diffStateField);

			// Sort diffs by position is crucial for RangeSetBuilder
			const sortedDiffs = [...diffs].sort((a, b) => a.from - b.from);

			for (const diff of sortedDiffs) {
				// 1. Highlight the text being affected
				if (diff.type === "delete" || diff.type === "replace") {
					builder.add(
						diff.from,
						diff.to,
						Decoration.mark({ class: "eragear-diff-delete" }),
					);
				}

				// 2. Insert the widget with the "New" text + Buttons
				// For 'replace' or 'insert', we show the suggested text in the widget
				// For 'delete', we just show the buttons to confirm deletion
				const widgetPos = diff.to;

				// If we are replacing/inserting, we might want to show the NEW text
				// directly in the editor as a "ghost" text or inside the widget.
				// For simplicity/robustness, let's render the NEW text inside a widget decoration
				// so it doesn't mess up document positions until accepted.

				if (diff.type === "insert" || diff.type === "replace") {
					// Show new text as "Inline virtual text" (green)
					// We use a Widget that contains the text
					builder.add(
						widgetPos,
						widgetPos,
						Decoration.widget({
							widget: new ContentWidget(diff.suggestedText),
							side: 1,
						}),
					);
				}

				// Add the Control Buttons
				builder.add(
					widgetPos,
					widgetPos,
					Decoration.widget({
						widget: new DiffWidget(diff.id, (id, action) =>
							this.handleAction(view, id, action),
						),
						side: 1,
					}),
				);
			}

			return builder.finish();
		}

		handleAction(view: EditorView, id: string, action: DiffAction) {
			const diffs = view.state.field(diffStateField);
			const diff = diffs.find((d) => d.id === id);
			if (!diff) return;

			if (action === "accept") {
				// APPLY the change to the document
				const transaction: any = {
					effects: removeDiffEffect.of(id), // Remove the diff marker
				};

				if (diff.type === "insert") {
					transaction.changes = {
						from: diff.from,
						insert: diff.suggestedText,
					};
				} else if (diff.type === "delete") {
					transaction.changes = {
						from: diff.from,
						to: diff.to,
						insert: "",
					};
				} else if (diff.type === "replace") {
					transaction.changes = {
						from: diff.from,
						to: diff.to,
						insert: diff.suggestedText,
					};
				}

				view.dispatch(transaction);
			} else {
				// REJECT: Just remove the diff marker, no doc change
				view.dispatch({
					effects: removeDiffEffect.of(id),
				});
			}
		}
	},
	{
		decorations: (v) => v.decorations,
	},
);

class ContentWidget extends WidgetType {
	constructor(readonly content: string) {
		super();
	}

	toDOM() {
		const span = document.createElement("span");
		span.textContent = this.content;
		span.className = "eragear-diff-insert";
		return span;
	}
}

// Helper to bundle the Extension
export const diffViewExtension = [diffStateField, diffPlugin, diffTheme];
