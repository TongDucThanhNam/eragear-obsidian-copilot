import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildLearningExplanationPrompt } from "@/learning/prompt-builders/learning-explanation.prompt";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";
import type { GeneratedArtifact } from "@/learning/types";

const DRAFT_FOLDER = normalizePath(`${ARTIFACT_FOLDERS.commandCenter}/learning-drafts`);

export interface LearningExplanationGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateLearningExplanationForNote(
	app: App,
	file: TFile,
	options: LearningExplanationGenerationOptions = {},
): Promise<GeneratedArtifact> {
	await ensureFolderPath(app, DRAFT_FOLDER);

	const artifactPath = normalizePath(
		`${DRAFT_FOLDER}/${slugify(file.basename)}-explanation.md`,
	);
	const draft = await buildLearningExplanationDraft(
		app,
		file,
		options.relatedNotes ?? [],
	);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => draft);
	} else {
		await app.vault.create(artifactPath, draft);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.status] = "visualize";
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Generate HTML explorable explanation";
		frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched] = formatLearningDate();
	});

	return {
		notePath: file.path,
		artifactPath,
		nextStatus: "visualize",
	};
}

async function buildLearningExplanationDraft(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildLearningExplanationPrompt({
		title: file.basename,
		source,
		relatedNotes,
	});

	return `---
learning_artifact: explanation
source_note: ${file.path}
generated: ${generatedAt}
---

# ${file.basename} explanation

## Core idea

Write the source-backed idea in plain language.

## Mental model

Describe the model a learner should keep in mind.

## Mechanism

Explain the causal chain or operational steps.

## Examples

- Source-backed example:
- Applied example:

## Common misconceptions

- Misconception:
- Why it is wrong:

## Tradeoffs

- Strength:
- Constraint:
- Failure mode:

## Self-test

1. What is the core mechanism?
2. What breaks if the main assumption is false?
3. Which related note changes how this concept should be applied?

## Related context

${formatRelatedNotes(relatedNotes)}

## Source note

\`\`\`markdown
${source.slice(0, 12000)}
\`\`\`

## Agent handoff prompt

\`\`\`text
${prompt.slice(0, 20000)}
\`\`\`
`;
}

function formatRelatedNotes(relatedNotes: HtmlExplainerRelatedNote[]): string {
	if (relatedNotes.length === 0) {
		return "- No related notes were found in graph context.";
	}

	return relatedNotes
		.slice(0, 8)
		.map(
			(note) =>
				`- [[${note.title}]] - \`${note.path}\`\n  ${note.excerpt.slice(0, 240)}`,
		)
		.join("\n");
}

async function ensureFolderPath(app: App, folderPath: string): Promise<void> {
	const parts = normalizePath(folderPath).split("/").filter(Boolean);
	let current = "";

	for (const part of parts) {
		current = current ? `${current}/${part}` : part;
		const existing = app.vault.getAbstractFileByPath(current);
		if (existing instanceof TFolder) continue;
		if (existing) {
			throw new Error(`${current} exists but is not a folder`);
		}
		await app.vault.createFolder(current);
	}
}

function stripFrontmatter(content: string): string {
	if (!content.startsWith("---")) return content;
	const end = content.indexOf("\n---", 3);
	if (end === -1) return content;
	return content.slice(end + 4).trimStart();
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "learning-note";
}
