export interface ReviewPromptInput {
	title: string;
	sourcePath: string;
	source: string;
	relatedNotes: Array<{
		title: string;
		path: string;
		excerpt: string;
	}>;
}

export function buildReviewPrompt(input: ReviewPromptInput): string {
	return `You are generating a spaced-review checklist for a learning note.

Requirements:
- Use the source note as ground truth.
- Use related notes only as context.
- Focus on recall, connection, and application.
- Include:
  1. Recall checks
  2. Link checks
  3. Artifact checks
  4. Application checks
  5. Promotion criteria for maturity/mastery

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
