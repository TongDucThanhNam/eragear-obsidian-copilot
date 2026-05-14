export interface HtmlExplainerPromptInput {
	title: string;
	source: string;
	relatedNotes: Array<{
		title: string;
		path: string;
		excerpt: string;
	}>;
}

export function buildHtmlExplainerPrompt(
	input: HtmlExplainerPromptInput,
): string {
	return `You are generating a single-file interactive HTML explorable explanation.

Requirements:
- Output only valid HTML.
- No external network dependencies.
- Use inline CSS and inline JavaScript only.
- Explain the concept with:
  1. Core idea
  2. Mental model
  3. Interactive example
  4. Common misconceptions
  5. Tradeoffs
  6. Self-test section
- Use the source note as ground truth.
- Use related notes only as context.

Title:
${input.title}

Source note:
${input.source}

Related notes:
${input.relatedNotes
	.map((note) => `## ${note.title}\nPath: ${note.path}\n${note.excerpt}`)
	.join("\n\n")}
`;
}
