import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { scanLearningNote } from "@/learning/note-scanner";
import type { GeneratedArtifact } from "@/learning/types";

export async function generateHtmlExplainerForNote(
	app: App,
	file: TFile,
): Promise<GeneratedArtifact> {
	const note = scanLearningNote(app, file);
	const folderPath = ARTIFACT_FOLDERS.explainers;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(`${folderPath}/${slugify(file.basename)}.html`);
	const html = await buildHtmlExplainer(app, file);
	const existing = app.vault.getAbstractFileByPath(artifactPath);

	if (existing instanceof TFile) {
		await app.vault.process(existing, () => html);
	} else {
		await app.vault.create(artifactPath, html);
	}

	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter[LEARNING_FRONTMATTER_KEYS.artifactHtml] = artifactPath;
		if (note.status === "visualize") {
			frontmatter[LEARNING_FRONTMATTER_KEYS.status] = "connect";
		}
		frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched] = formatLearningDate();
	});

	return {
		notePath: file.path,
		artifactPath,
		nextStatus: note.status === "visualize" ? "connect" : note.status,
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

async function buildHtmlExplainer(app: App, file: TFile): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const title = escapeHtml(file.basename);
	const body = escapeHtml(stripFrontmatter(content)).slice(0, 20000);
	const generatedAt = formatLearningDate();

	return `<!doctype html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${title}</title>
	<style>
		:root {
			color-scheme: light dark;
			font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
			line-height: 1.5;
		}
		body {
			margin: 0;
			padding: 2rem;
			background: Canvas;
			color: CanvasText;
		}
		main {
			max-width: 880px;
			margin: 0 auto;
		}
		section {
			border: 1px solid color-mix(in srgb, CanvasText 18%, transparent);
			border-radius: 8px;
			padding: 1rem;
			margin-block: 1rem;
		}
		pre {
			white-space: pre-wrap;
			overflow-wrap: anywhere;
		}
	</style>
</head>
<body>
	<main>
		<p>Generated ${generatedAt}</p>
		<h1>${title}</h1>
		<section>
			<h2>Core idea</h2>
			<p>Use this artifact as a starting point for an explorable explanation. The source note content is included below so a coding agent can refine the interaction safely inside this file.</p>
		</section>
		<section>
			<h2>Source note</h2>
			<pre>${body}</pre>
		</section>
	</main>
</body>
</html>
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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
