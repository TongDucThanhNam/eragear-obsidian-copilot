import { STATUS_WEIGHT } from "@/learning/constants";
import { formatLearningDate, isReviewDue } from "@/learning/frontmatter";
import type {
	LearningNote,
	LearningScanResult,
	NextActionCandidate,
} from "@/learning/types";

export function inferNextAction(note: LearningNote): string {
	if (note.missingFields.length > 1) return "Add missing learning metadata";
	if (!note.type) return "Add note type";
	if (!note.area) return "Add learning area";
	if (!note.status) return "Set learning status";

	switch (note.status) {
		case "seed":
			return "Convert raw note into structured learning note";
		case "explain":
			return "Generate explanation, mechanism, examples, and failure modes";
		case "visualize":
			if (!note.artifactHtml) {
				return "Generate HTML explorable explanation";
			}
			return "Review existing visualization and move to connect stage";
		case "connect":
			if (note.links.length < 5) {
				return "Add links to related notes, MOCs, and bridge notes";
			}
			return "Validate connections and move to test stage";
		case "test":
			if (typeof note.quizScore !== "number") {
				return "Generate quiz and test understanding";
			}
			if (note.quizScore < 7) return "Review weak points from quiz";
			return "Move to apply stage";
		case "apply":
			return "Create case study, lab, or implementation example";
		case "review":
			return "Review note and promote maturity if passed";
		case "done":
			return "Schedule spaced review";
		case "mastered":
			return "No immediate action required";
	}
}

export function scoreLearningNote(
	note: LearningNote,
	activeSprint?: string,
	today = formatLearningDate(),
): number {
	const priority = note.priority ?? 0;
	const statusWeight = note.status ? STATUS_WEIGHT[note.status] : 94;
	const missingFieldWeight = note.missingFields.length * 22;
	const missingArtifactWeight =
		note.status === "visualize" && !note.artifactHtml ? 36 : 0;
	const reviewDueWeight = isReviewDue(note.reviewDue, today) ? 28 : 0;
	const sprintWeight =
		activeSprint && note.sprint === activeSprint ? 24 : 0;
	const graphImportanceWeight = Math.min(note.graphScore ?? 0, 20);
	const recentlyTouchedPenalty = isRecentlyTouched(note.lastTouched, today)
		? 16
		: 0;

	return (
		priority +
		statusWeight +
		missingFieldWeight +
		missingArtifactWeight +
		reviewDueWeight +
		sprintWeight +
		graphImportanceWeight -
		recentlyTouchedPenalty
	);
}

export function generateNextActionQueue(
	scan: LearningScanResult,
	activeSprint?: string,
): NextActionCandidate[] {
	return scan.notes
		.map((note) => {
			const score = scoreLearningNote(note, activeSprint);
			const scoredNote = { ...note, finalScore: score };
			return {
				note: scoredNote,
				action: inferNextAction(scoredNote),
				reason: buildReasons(scoredNote, activeSprint),
				expectedOutput: expectedOutput(scoredNote),
				suggestedAgent: suggestedAgent(scoredNote),
				score,
			};
		})
		.filter((candidate) => candidate.action !== "No immediate action required")
		.sort((a, b) => b.score - a.score);
}

function buildReasons(note: LearningNote, activeSprint?: string): string[] {
	const reasons: string[] = [];
	if (note.missingFields.length > 0) {
		reasons.push(`missing ${note.missingFields.join(", ")}`);
	}
	if (note.status) reasons.push(`status = ${note.status}`);
	if (typeof note.priority === "number") reasons.push(`priority = ${note.priority}`);
	if (note.status === "visualize" && !note.artifactHtml) {
		reasons.push("artifact_html is missing");
	}
	if (note.reviewDue && isReviewDue(note.reviewDue, formatLearningDate())) {
		reasons.push(`review_due = ${note.reviewDue}`);
	}
	if (activeSprint && note.sprint === activeSprint) {
		reasons.push(`active sprint = ${activeSprint}`);
	}
	if ((note.graphScore ?? 0) > 0) {
		reasons.push(`graph score = ${note.graphScore}`);
	}
	return reasons;
}

function expectedOutput(note: LearningNote): string | undefined {
	if (note.status === "seed") {
		return "00_Command_Center/learning-drafts/<note-slug>-structure.md and status = explain";
	}
	if (note.status === "explain") {
		return "00_Command_Center/learning-drafts/<note-slug>-explanation.md and status = visualize";
	}
	if (note.status === "visualize" && !note.artifactHtml) {
		return "_explainers/<note-slug>.html and status = connect";
	}
	if (note.status === "test" && typeof note.quizScore !== "number") {
		return "_quizzes/<note-slug>.md and next_action = complete quiz";
	}
	if (note.status === "connect" && note.links.length < 5) {
		return "03_Bridge_Notes/<note-slug>-bridge.md and next_action = review bridge note";
	}
	if (note.status === "apply") {
		return "05_Case_Studies/<note-slug>-case-study.md and next_action = complete case study";
	}
	if (note.status === "review") {
		return "_reviews/<note-slug>-review.md and next_action = complete review";
	}
	if (!note.type || !note.area || !note.status) {
		return "Updated learning frontmatter";
	}
	return undefined;
}

function suggestedAgent(
	note: LearningNote,
): "deterministic" | "reasoning-model" | "coding-agent" {
	if (!note.type || !note.area || !note.status) return "deterministic";
	if (note.status === "visualize" && !note.artifactHtml) return "coding-agent";
	if (
		note.status === "seed" ||
		note.status === "explain" ||
		note.status === "connect" ||
		note.status === "test" ||
		note.status === "apply" ||
		note.status === "review"
	) {
		return "reasoning-model";
	}
	return "deterministic";
}

function isRecentlyTouched(lastTouched: string | undefined, today: string): boolean {
	return lastTouched === today;
}
