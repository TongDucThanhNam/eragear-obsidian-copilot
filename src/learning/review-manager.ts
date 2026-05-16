import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildReviewPrompt } from "@/learning/prompt-builders/review.prompt";
import type { GeneratedArtifact } from "@/learning/types";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface ReviewGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateReviewForNote(
	app: App,
	file: TFile,
	options: ReviewGenerationOptions = {},
): Promise<GeneratedArtifact> {
	const folderPath = ARTIFACT_FOLDERS.reviews;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(
		`${folderPath}/${slugify(file.basename)}-review.md`,
	);
	const review = await buildReview(app, file, options.relatedNotes ?? []);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => review);
	} else {
		await app.vault.create(artifactPath, review);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Complete review checklist and update maturity";
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

async function buildReview(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter as
		| Record<string, unknown>
		| undefined;
	const weakPoints = parseWeakPoints(frontmatter?.mastery);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildReviewPrompt({
		title: file.basename,
		sourcePath: file.path,
		source,
		relatedNotes,
	});

	return `---
type: source
area:
status: review
source_note: ${file.path}
created: ${generatedAt}
---

# ${file.basename} review

## Recall checks

- [ ] Explain the core idea without reading the source note.
- [ ] Name the mechanism that makes it work.
- [ ] Name one common misconception.

## Link checks

- [ ] Link the source note to at least one related note.
- [ ] Link the source note to a MOC or bridge note if relevant.

## Artifact checks

- [ ] Confirm any explainer, quiz, bridge note, or case study is still useful.
- [ ] Update stale artifact sections.

## Application checks

- [ ] Apply the concept to one concrete project, design, or decision.
- [ ] Record any remaining confusion in the source note.

## Weak points

${formatWeakPoints(weakPoints)}

## Promotion criteria

- Increase \`maturity\` if recall and application are both strong.
- Move to \`done\` if it should be reviewed again later.
- Move to \`mastered\` only when the concept is reliable without prompts.

## Related context

${formatRelatedNotes(relatedNotes)}

## Agent handoff prompt

\`\`\`text
${prompt.slice(0, 20000)}
\`\`\`
`;
}

function parseWeakPoints(value: unknown): string[] {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return [];
	}
	const weakPoints = (value as Record<string, unknown>).weak_points;
	if (!Array.isArray(weakPoints)) return [];
	return weakPoints.filter((item): item is string => typeof item === "string");
}

function formatWeakPoints(weakPoints: string[]): string {
	if (weakPoints.length === 0) {
		return "- No weak points recorded yet.";
	}
	return weakPoints.map((point) => `- [ ] ${point}`).join("\n");
}

function formatRelatedNotes(relatedNotes: HtmlExplainerRelatedNote[]): string {
	if (relatedNotes.length === 0) {
		return "- No related notes were found in graph context.";
	}

	return relatedNotes
		.slice(0, 8)
		.map((note) => `- [[${note.title}]] - \`${note.path}\``)
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
