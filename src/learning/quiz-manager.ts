import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { buildQuizPrompt } from "@/learning/prompt-builders/quiz.prompt";
import type { GeneratedArtifact } from "@/learning/types";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";

export interface QuizGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateQuizForNote(
	app: App,
	file: TFile,
	options: QuizGenerationOptions = {},
): Promise<GeneratedArtifact> {
	const folderPath = ARTIFACT_FOLDERS.quizzes;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(`${folderPath}/${slugify(file.basename)}.md`);
	const quiz = await buildQuiz(app, file, options.relatedNotes ?? []);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => quiz);
	} else {
		await app.vault.create(artifactPath, quiz);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction] =
			"Complete quiz and record quiz_score";
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

async function buildQuiz(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const generatedAt = formatLearningDate();
	const prompt = buildQuizPrompt({
		title: file.basename,
		source,
		relatedNotes,
	});

	return `# ${file.basename} quiz

Generated: ${generatedAt}

## Short-answer questions

1. What is the core idea of this note?
2. What mechanism makes the idea work?
3. What is one concrete example?
4. What failure mode should you watch for?
5. How does this connect to another note in the vault?

## Misconception checks

1. What is a tempting but wrong simplification?
2. Which part of the idea is often overgeneralized?
3. What would make this idea fail in practice?

## Application prompts

1. Apply the idea to a current project or case study.
2. Explain the idea to someone who knows the related context but not this note.

## Answer key source

\`\`\`markdown
${source.slice(0, 12000)}
\`\`\`

## Agent handoff prompt

\`\`\`text
${prompt.slice(0, 20000)}
\`\`\`
`;
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
