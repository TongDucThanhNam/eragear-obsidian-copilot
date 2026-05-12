import type { App, TFile } from "obsidian";
import {
	detectMissingFields,
	formatLearningDate,
	isReviewDue,
	parseLearningFrontmatter,
} from "@/learning/frontmatter";
import type { LearningNote, LearningScanResult } from "@/learning/types";

export function scanVaultLearningNotes(app: App): LearningScanResult {
	const today = formatLearningDate();
	const notes = app.vault.getMarkdownFiles().map((file) => scanLearningNote(app, file));
	const weakNotes = notes.filter(isWeakLearningNote);
	const missingArtifacts = notes.filter(
		(note) => note.status === "visualize" && !note.artifactHtml,
	);
	const dueReviews = notes.filter((note) => isReviewDue(note.reviewDue, today));

	return {
		notes,
		weakNotes,
		missingArtifacts,
		dueReviews,
		summary: {
			totalNotes: notes.length,
			missingType: notes.filter((note) => note.missingFields.includes("type"))
				.length,
			missingArea: notes.filter((note) => note.missingFields.includes("area"))
				.length,
			missingStatus: notes.filter((note) =>
				note.missingFields.includes("status"),
			).length,
			weakNotes: weakNotes.length,
			missingArtifacts: missingArtifacts.length,
			dueReviews: dueReviews.length,
		},
		scannedAt: new Date().toISOString(),
	};
}

export function scanLearningNote(
	app: App,
	file: TFile,
): LearningNote {
	const cache = app.metadataCache.getFileCache(file);
	const frontmatter = parseLearningFrontmatter(
		cache?.frontmatter as Record<string, unknown> | undefined,
	);
	const links = Object.keys(app.metadataCache.resolvedLinks[file.path] || {});
	const backlinks = getBacklinks(app, file.path);
	const graphScore = links.length + backlinks.length;
	const missingFields = detectMissingFields(frontmatter);

	return {
		path: file.path,
		title: file.basename,
		...frontmatter,
		links,
		backlinks,
		graphScore,
		finalScore: undefined,
		missingFields,
	};
}

export function isWeakLearningNote(note: LearningNote): boolean {
	if (note.missingFields.length > 0) return true;
	if ((note.maturity ?? 0) <= 2 && note.status !== "mastered") return true;
	if ((note.priority ?? 0) >= 80 && note.status !== "mastered") return true;
	if (note.status === "test" && (note.quizScore ?? 0) > 0) {
		return (note.quizScore ?? 0) < 7;
	}
	return note.status === "review" && isReviewDue(note.reviewDue, formatLearningDate());
}

function getBacklinks(app: App, targetPath: string): string[] {
	const backlinks: string[] = [];
	for (const [sourcePath, targets] of Object.entries(
		app.metadataCache.resolvedLinks,
	)) {
		if (targets[targetPath]) {
			backlinks.push(sourcePath);
		}
	}
	return backlinks;
}
