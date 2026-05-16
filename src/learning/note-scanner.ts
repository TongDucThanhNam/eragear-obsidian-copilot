import type { App, TFile } from "obsidian";
import {
	detectMissingFields,
	formatLearningDate,
	hasLearningFrontmatter,
	isReviewDue,
	parseLearningFrontmatter,
} from "@/learning/frontmatter";
import { ARTIFACT_FOLDERS } from "@/learning/constants";
import { evaluateDefinitionOfDone } from "@/learning/definition-of-done";
import { enrichNotesWithCurriculumGraph } from "@/learning/curriculum-graph";
import type { LearningNote, LearningScanResult } from "@/learning/types";

export function scanVaultLearningNotes(app: App): LearningScanResult {
	const today = formatLearningDate();
	const scannedNotes = app.vault
		.getMarkdownFiles()
		.filter((file) => {
			if (isLearningSystemArtifactPath(file.path)) return false;
			const frontmatter = app.metadataCache.getFileCache(file)?.frontmatter as
				| Record<string, unknown>
				| undefined;
			return isLearningNoteFrontmatter(frontmatter);
		})
		.map((file) => scanLearningNote(app, file));
	const graph = enrichNotesWithCurriculumGraph(scannedNotes);
	const notes = graph.notes.map((note) => {
		const dod = evaluateDefinitionOfDone(note);
		return {
			...note,
			blockers: [...(note.blockers ?? []), ...dod.blockers],
		};
	});
	const weakNotes = notes.filter(isWeakLearningNote);
	const missingArtifacts = notes.filter(
		(note) =>
			note.status === "visualize" &&
			!note.artifactHtml &&
			!note.artifacts?.html_explainer?.path,
	);
	const dueReviews = notes.filter((note) => isReviewDue(note.reviewDue, today));
	const blockedNotes = notes.filter((note) => (note.blockers ?? []).length > 0);
	const masteryGaps = notes.filter(hasMasteryGap);
	const artifactQualityIssues = notes.filter(hasArtifactQualityIssue);

	return {
		notes,
		weakNotes,
		missingArtifacts,
		dueReviews,
		blockedNotes,
		masteryGaps,
		artifactQualityIssues,
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
			blockedNotes: blockedNotes.length,
			masteryGaps: masteryGaps.length,
			artifactQualityIssues: artifactQualityIssues.length,
		},
		scannedAt: new Date().toISOString(),
	};
}

function isLearningNoteFrontmatter(
	frontmatter: Record<string, unknown> | undefined,
): boolean {
	if (frontmatter?.type === "agent-task") return false;
	return hasLearningFrontmatter(frontmatter);
}

function isLearningSystemArtifactPath(path: string): boolean {
	return path.startsWith(`${ARTIFACT_FOLDERS.commandCenter}/`);
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
	if ((note.blockers ?? []).length > 0) return true;
	if ((note.maturity ?? 0) <= 2 && note.status !== "mastered") return true;
	if ((note.priority ?? 0) >= 80 && note.status !== "mastered") return true;
	if (note.status === "test" && typeof note.quizScore === "number") {
		return note.quizScore < 7;
	}
	return note.status === "review" && isReviewDue(note.reviewDue, formatLearningDate());
}

function hasMasteryGap(note: LearningNote): boolean {
	if (note.status !== "done" && note.status !== "mastered") return false;
	return (
		(note.mastery?.recall_score ?? 0) < 6 ||
		(note.mastery?.mechanism_score ?? 0) < 6 ||
		(note.mastery?.transfer_score ?? 0) < 6 ||
		(note.mastery?.application_score ?? 0) < 6
	);
}

function hasArtifactQualityIssue(note: LearningNote): boolean {
	return Object.values(note.artifacts ?? {}).some(
		(artifact) =>
			artifact !== undefined &&
			artifact.quality_score !== undefined &&
			artifact.quality_score < 70,
	);
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
