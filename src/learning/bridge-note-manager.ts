import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildBridgeNotePrompt } from "@/learning/prompt-builders/bridge-note.prompt";
import type { GeneratedArtifact } from "@/learning/types";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface BridgeNoteGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateBridgeNoteForNote(
	app: App,
	file: TFile,
	options: BridgeNoteGenerationOptions = {},
): Promise<GeneratedArtifact> {
	const folderPath = ARTIFACT_FOLDERS.bridgeNotes;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(
		`${folderPath}/${slugify(file.basename)}-bridge.md`,
	);
	const bridgeNote = await buildBridgeNote(app, file, options.relatedNotes ?? []);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => bridgeNote);
	} else {
		await app.vault.create(artifactPath, bridgeNote);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Review bridge note and add missing links";
		frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched] = formatLearningDate();
	});

	return {
		notePath: file.path,
		artifactPath,
	};
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFolder) return;
	if (existing) {
		throw new Error(`${normalized} exists but is not a folder`);
	}
	await app.vault.createFolder(normalized);
}

async function buildBridgeNote(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildBridgeNotePrompt({
		title: file.basename,
		sourcePath: file.path,
		source,
		relatedNotes,
	});

	return `---
type: bridge
area:
status: connect
source_note: ${file.path}
created: ${generatedAt}
---

# ${file.basename} bridge

## Why this bridge exists

Connect [[${file.basename}]] to related notes so the concept is not isolated.

## Source note

- [[${file.basename}]]
- Path: \`${file.path}\`

## Related note map

${formatRelatedNotes(relatedNotes)}

## Missing links to add

- Add the strongest related notes as wikilinks in the source note.
- Add this bridge note to any relevant MOC.
- Re-scan the Learning Command Center after updating links.

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
