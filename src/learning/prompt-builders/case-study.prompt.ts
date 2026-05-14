export interface CaseStudyPromptInput {
	title: string;
	sourcePath: string;
	source: string;
	relatedNotes: Array<{
		title: string;
		path: string;
		excerpt: string;
	}>;
}

export function buildCaseStudyPrompt(input: CaseStudyPromptInput): string {
	return `You are generating a practical case study for a learning note.

Requirements:
- Use the source note as ground truth.
- Use related notes only as context.
- Create a concrete application scenario.
- Include:
  1. Scenario
  2. Constraints
  3. Step-by-step application
  4. Failure modes
  5. Reflection questions
  6. Follow-up implementation task

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
