export interface QuizPromptInput {
	title: string;
	source: string;
	relatedNotes: Array<{
		title: string;
		path: string;
		excerpt: string;
	}>;
}

export function buildQuizPrompt(input: QuizPromptInput): string {
	return `You are generating a self-test quiz from a learning note.

Requirements:
- Use the source note as ground truth.
- Use related notes only as context.
- Create active recall questions, not trivia.
- Include:
  1. Five short-answer questions
  2. Three misconception checks
  3. Two application prompts
  4. An answer key grounded in the source

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
