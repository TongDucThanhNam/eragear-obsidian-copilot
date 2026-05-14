import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface LearningStructurePromptInput {
	title: string;
	source: string;
	relatedNotes: HtmlExplainerRelatedNote[];
}

export function buildLearningStructurePrompt(
	input: LearningStructurePromptInput,
): string {
	return `You are converting a raw source note into a structured learning note.

Requirements:
- Preserve claims from the source note.
- Do not invent facts.
- Produce markdown sections for: core idea, mechanism, examples, failure modes, connections, next learning action.
- Keep the output concise enough to paste back into the source note.

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
