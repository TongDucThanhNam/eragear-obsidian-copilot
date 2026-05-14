import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildCaseStudyPrompt } from "@/learning/prompt-builders/case-study.prompt";
import type { GeneratedArtifact } from "@/learning/types";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface CaseStudyGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateCaseStudyForNote(
	app: App,
	file: TFile,
	options: CaseStudyGenerationOptions = {},
): Promise<GeneratedArtifact> {
	const folderPath = ARTIFACT_FOLDERS.caseStudies;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(
		`${folderPath}/${slugify(file.basename)}-case-study.md`,
	);
	const caseStudy = await buildCaseStudy(app, file, options.relatedNotes ?? []);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => caseStudy);
	} else {
		await app.vault.create(artifactPath, caseStudy);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Complete case study and move to review";
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

async function buildCaseStudy(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildCaseStudyPrompt({
		title: file.basename,
		sourcePath: file.path,
		source,
		relatedNotes,
	});

	return `---
type: case-study
area:
status: apply
source_note: ${file.path}
created: ${generatedAt}
---

# ${file.basename} case study

## Scenario

Apply [[${file.basename}]] to a realistic project, system, or decision.

## Constraints

- What constraints make the idea non-trivial?
- What assumptions must hold?
- What resources, data, or tools are available?

## Step-by-step application

1. Restate the concept in operational terms.
2. Pick a concrete target situation.
3. Apply the mechanism from the source note.
4. Check tradeoffs and failure modes.
5. Decide the next implementation or learning step.

## Reflection questions

1. What changed after applying the concept?
2. What did the source note not explain well enough?
3. What should be reviewed before marking this mastered?

## Related context

${formatRelatedNotes(relatedNotes)}

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
