import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildLearningStructurePrompt } from "@/learning/prompt-builders/learning-structure.prompt";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";
import type { GeneratedArtifact } from "@/learning/types";

const DRAFT_FOLDER = normalizePath(`${ARTIFACT_FOLDERS.commandCenter}/learning-drafts`);

export interface LearningStructureGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateLearningStructureForNote(
	app: App,
	file: TFile,
	options: LearningStructureGenerationOptions = {},
): Promise<GeneratedArtifact> {
	await ensureFolderPath(app, DRAFT_FOLDER);

	const artifactPath = normalizePath(
		`${DRAFT_FOLDER}/${slugify(file.basename)}-structure.md`,
	);
	const draft = await buildLearningStructureDraft(
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
		frontmatter[LEARNING_FRONTMATTER_KEYS.status] = "explain";
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Review learning structure and expand explanation";
		frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched] = formatLearningDate();
	});

	return {
		notePath: file.path,
		artifactPath,
		nextStatus: "explain",
	};
}

async function buildLearningStructureDraft(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildLearningStructurePrompt({
		title: file.basename,
		source,
		relatedNotes,
	});

	return `---
learning_artifact: structure
source_note: ${file.path}
generated: ${generatedAt}
---

# ${file.basename} learning structure

## Core idea

State the central claim in one or two sentences.

## Mechanism

Describe the moving parts that make the idea work.

## Examples

- Add one concrete example from the source note.
- Add one practical example from your vault or current work.

## Failure modes

- Name the easiest misunderstanding.
- Name the context where this idea stops working.

## Connections

${formatRelatedNotes(relatedNotes)}

## Next learning action

Expand this structure into an explanation, then move the source note toward \`visualize\`.

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
