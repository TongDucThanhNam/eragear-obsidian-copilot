import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface LearningExplanationPromptInput {
	title: string;
	source: string;
	relatedNotes: HtmlExplainerRelatedNote[];
}

export function buildLearningExplanationPrompt(
	input: LearningExplanationPromptInput,
): string {
	return `You are expanding a structured learning note into an explanation.

Requirements:
- Use the source note as ground truth.
- Use related notes only as context.
- Explain the concept through: core idea, mental model, mechanism, examples, misconceptions, tradeoffs, and self-test questions.
- Mark any uncertain inference explicitly.
- Output markdown that can later be converted into an interactive HTML explainer.

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
