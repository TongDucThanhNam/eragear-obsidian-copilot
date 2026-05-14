export interface BridgeNotePromptInput {
	title: string;
	sourcePath: string;
	source: string;
	relatedNotes: Array<{
		title: string;
		path: string;
		excerpt: string;
	}>;
}

export function buildBridgeNotePrompt(input: BridgeNotePromptInput): string {
	return `You are generating a bridge note that connects one learning note to related vault context.

Requirements:
- Use Obsidian wikilinks when referencing notes.
- Use the source note as the anchor.
- Use related notes only as context.
- Include:
  1. Why this bridge exists
  2. Source note summary
  3. Related note map
  4. Missing links to add
  5. Follow-up learning actions

Source:
${input.title}
Path: ${input.sourcePath}

Source note:
${input.source}

Related notes:
${input.relatedNotes
	.map((note) => `## ${note.title}\nPath: ${note.path}\n${note.excerpt}`)
	.join("\n\n")}
`;
}
