import type {
	LearningArtifactRecord,
	LearningArtifactType,
	LearningNote,
	LearningStatus,
} from "@/learning/types";

export interface DefinitionOfDoneEvaluation {
	passed: boolean;
	blockers: string[];
}

const PASSING_ARTIFACT_SCORE = 70;
const DONE_MASTERY_SCORE = 6;
const MASTERED_MASTERY_SCORE = 8;

export function evaluateDefinitionOfDone(
	note: LearningNote,
): DefinitionOfDoneEvaluation {
	if (!note.status) {
		return { passed: false, blockers: ["Learning status is missing."] };
	}
	const target = getNextStatusForEvaluation(note.status);
	if (!target) return { passed: true, blockers: [] };
	const blockers = getPromotionBlockers(note, target);
	return { passed: blockers.length === 0, blockers };
}

export function canPromoteStatus(
	note: LearningNote,
	targetStatus: LearningStatus,
): boolean {
	return getPromotionBlockers(note, targetStatus).length === 0;
}

export function getPromotionBlockers(
	note: LearningNote,
	targetStatus: LearningStatus,
): string[] {
	const blockers = getBaselineBlockers(note);
	if (blockers.length > 0) return blockers;

	switch (targetStatus) {
		case "seed":
		case "explain":
			return [];
		case "visualize":
			return getExplainToVisualizeBlockers(note);
		case "connect":
			return getVisualizeToConnectBlockers(note);
		case "test":
			return getConnectToTestBlockers(note);
		case "apply":
			return getTestToApplyBlockers(note);
		case "review":
			return getApplyToReviewBlockers(note);
		case "done":
			return getReviewToDoneBlockers(note);
		case "mastered":
			return getDoneToMasteredBlockers(note);
	}
}

function getBaselineBlockers(note: LearningNote): string[] {
	const blockers: string[] = [];
	if (!note.type) blockers.push("Note type is missing.");
	if (!note.area) blockers.push("Learning area is missing.");
	if (!note.status) blockers.push("Learning status is missing.");
	return blockers;
}

function getExplainToVisualizeBlockers(note: LearningNote): string[] {
	if (note.dod?.explanation_reviewed === false) {
		return ["Explanation has not been reviewed."];
	}
	return [];
}

function getVisualizeToConnectBlockers(note: LearningNote): string[] {
	const artifact = note.artifacts?.html_explainer;
	if (!note.artifactHtml && !artifact?.path) {
		return ["HTML explainer evidence is missing."];
	}
	return getArtifactQualityBlockers("html_explainer", artifact);
}

function getConnectToTestBlockers(note: LearningNote): string[] {
	const blockers: string[] = [];
	if ((note.unmetPrerequisites ?? []).length > 0) {
		blockers.push(`Unmet prerequisites: ${note.unmetPrerequisites?.join(", ")}.`);
	}
	if (note.links.length < 5 && !hasPassingArtifact(note.artifacts?.bridge_note)) {
		blockers.push("At least five links or a passing bridge note are required.");
	}
	return blockers;
}

function getTestToApplyBlockers(note: LearningNote): string[] {
	if (typeof note.quizScore === "number") {
		return note.quizScore >= 7 ? [] : ["Quiz score is below 7."];
	}
	if (
		(note.mastery?.recall_score ?? 0) >= DONE_MASTERY_SCORE &&
		(note.mastery?.mechanism_score ?? 0) >= DONE_MASTERY_SCORE
	) {
		return [];
	}
	return ["Quiz or recall/mechanism mastery evidence is missing."];
}

function getApplyToReviewBlockers(note: LearningNote): string[] {
	if (
		hasPassingArtifact(note.artifacts?.case_study) ||
		(note.mastery?.application_score ?? 0) >= DONE_MASTERY_SCORE
	) {
		return [];
	}
	return ["Application evidence or a passing case study is missing."];
}

function getReviewToDoneBlockers(note: LearningNote): string[] {
	const blockers = getMasteryThresholdBlockers(note, DONE_MASTERY_SCORE);
	if (!hasEvidence(note)) {
		blockers.push("Definition of Done evidence notes are missing.");
	}
	if (!hasPassingArtifact(note.artifacts?.review) && note.dod?.reviewed !== true) {
		blockers.push("Review evidence is missing.");
	}
	return blockers;
}

function getDoneToMasteredBlockers(note: LearningNote): string[] {
	const blockers = getMasteryThresholdBlockers(note, MASTERED_MASTERY_SCORE);
	if (!hasEvidence(note)) {
		blockers.push("Mastery evidence notes are missing.");
	}
	if ((note.mastery?.weak_points ?? []).length > 0) {
		blockers.push("Weak points must be resolved before mastery.");
	}
	return blockers;
}

function getMasteryThresholdBlockers(
	note: LearningNote,
	threshold: number,
): string[] {
	const blockers: string[] = [];
	for (const [label, score] of [
		["recall", note.mastery?.recall_score],
		["mechanism", note.mastery?.mechanism_score],
		["transfer", note.mastery?.transfer_score],
		["application", note.mastery?.application_score],
	] as const) {
		if ((score ?? 0) < threshold) {
			blockers.push(`${label} mastery score is below ${threshold}.`);
		}
	}
	return blockers;
}

function getArtifactQualityBlockers(
	type: LearningArtifactType,
	artifact: LearningArtifactRecord | undefined,
): string[] {
	if (!artifact || artifact.quality_score === undefined) return [];
	if (artifact.quality_score >= PASSING_ARTIFACT_SCORE) return [];
	return [`${formatArtifactType(type)} quality score is below ${PASSING_ARTIFACT_SCORE}.`];
}

function hasPassingArtifact(
	artifact: LearningArtifactRecord | undefined,
): boolean {
	return (artifact?.quality_score ?? 0) >= PASSING_ARTIFACT_SCORE;
}

function hasEvidence(note: LearningNote): boolean {
	return (
		(note.dod?.evidence_notes ?? []).length > 0 ||
		(note.mastery?.evidence_notes ?? []).length > 0
	);
}

function getNextStatusForEvaluation(
	status: LearningStatus,
): LearningStatus | null {
	const index = STATUS_ORDER.indexOf(status);
	if (index === -1) return null;
	return STATUS_ORDER[index + 1] ?? null;
}

function formatArtifactType(type: LearningArtifactType): string {
	return type.replace(/_/g, " ");
}

const STATUS_ORDER: LearningStatus[] = [
	"seed",
	"explain",
	"visualize",
	"connect",
	"test",
	"apply",
	"review",
	"done",
	"mastered",
];
