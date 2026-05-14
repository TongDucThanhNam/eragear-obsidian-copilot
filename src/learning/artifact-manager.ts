import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import { scanLearningNote } from "@/learning/note-scanner";
import { buildHtmlExplainerPrompt } from "@/learning/prompt-builders/html-explainer.prompt";
import type { GeneratedArtifact } from "@/learning/types";

export interface HtmlExplainerRelatedNote {
	title: string;
	path: string;
	excerpt: string;
}

export interface HtmlExplainerGenerationOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
}

export async function generateHtmlExplainerForNote(
	app: App,
	file: TFile,
	options: HtmlExplainerGenerationOptions = {},
): Promise<GeneratedArtifact> {
	const note = scanLearningNote(app, file);
	const folderPath = ARTIFACT_FOLDERS.explainers;
	await ensureFolder(app, folderPath);

	const artifactPath = normalizePath(`${folderPath}/${slugify(file.basename)}.html`);
	const html = await buildHtmlExplainer(app, file, options.relatedNotes ?? []);
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

async function buildHtmlExplainer(
	app: App,
	file: TFile,
	relatedNotes: HtmlExplainerRelatedNote[],
): Promise<string> {
	const content = await app.vault.cachedRead(file);
	const source = stripFrontmatter(content);
	const title = escapeHtml(file.basename);
	const body = escapeHtml(source).slice(0, 20000);
	const relatedContext = buildRelatedContextHtml(relatedNotes);
	const agentPrompt = escapeHtml(
		buildHtmlExplainerPrompt({
			title: file.basename,
			source,
			relatedNotes,
		}),
	).slice(0, 30000);
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
		button {
			border: 1px solid color-mix(in srgb, CanvasText 24%, transparent);
			border-radius: 6px;
			padding: 0.5rem 0.75rem;
			background: Canvas;
			color: CanvasText;
			cursor: pointer;
		}
		pre {
			white-space: pre-wrap;
			overflow-wrap: anywhere;
		}
		.related-note {
			margin-block: 0.75rem;
		}
		.related-note p {
			margin-block: 0.25rem;
		}
		.self-test-answer[hidden] {
			display: none;
		}
	</style>
</head>
<body>
	<main>
		<p>Generated ${generatedAt}</p>
		<h1>${title}</h1>
		<section>
			<h2>Core idea</h2>
			<p>This deterministic explainer packages the source note, related vault context, and a self-test scaffold into a single offline HTML artifact. A coding agent can refine the interaction later without losing the ground truth.</p>
		</section>
		<section>
			<h2>Mental model</h2>
			<p>Replace this section with a concrete model grounded in the source note.</p>
		</section>
		<section>
			<h2>Interactive example</h2>
			<p>Use the self-test controls below to reveal prompts and compare your answer against the source note.</p>
		</section>
		<section>
			<h2>Common misconceptions</h2>
			<p>Extract misconceptions from the note or related context.</p>
		</section>
		<section>
			<h2>Tradeoffs</h2>
			<p>Capture constraints, failure modes, and practical decision points.</p>
		</section>
		<section>
			<h2>Self-test</h2>
			<p>Answer before revealing the source-backed hint.</p>
			<button type="button" id="toggle-self-test">Reveal hint</button>
			<p class="self-test-answer" id="self-test-answer" hidden>Explain the core mechanism using only claims supported by the source note, then name one tradeoff or failure mode.</p>
		</section>
		<section>
			<h2>Related vault context</h2>
			${relatedContext}
		</section>
		<section>
			<h2>Source note</h2>
			<pre>${body}</pre>
		</section>
		<section>
			<h2>Agent handoff prompt</h2>
			<pre>${agentPrompt}</pre>
		</section>
	</main>
	<script>
		const button = document.getElementById("toggle-self-test");
		const answer = document.getElementById("self-test-answer");
		button?.addEventListener("click", () => {
			if (!answer) return;
			const nextHidden = !answer.hidden;
			answer.hidden = nextHidden;
			button.textContent = nextHidden ? "Reveal hint" : "Hide hint";
		});
	</script>
</body>
</html>
`;
}

function buildRelatedContextHtml(
	relatedNotes: HtmlExplainerRelatedNote[],
): string {
	if (relatedNotes.length === 0) {
		return "<p>No related notes were found in the current graph context.</p>";
	}

	return relatedNotes
		.slice(0, 5)
		.map((note) => {
			const title = escapeHtml(note.title);
			const path = escapeHtml(note.path);
			const excerpt = escapeHtml(note.excerpt).slice(0, 1000);
			return `<article class="related-note">
				<h3>${title}</h3>
				<p><small>${path}</small></p>
				<p>${excerpt}</p>
			</article>`;
		})
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

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
