import { formatLearningDate } from "@/learning/frontmatter";
import type { LearningMastery } from "@/learning/types";

export type MasteryCategory =
	| "recall"
	| "mechanism"
	| "transfer"
	| "application";

export interface MasteryUpdate {
	category: MasteryCategory;
	score: number;
	evidenceNote?: string;
	weakPoints?: string[];
	examinedAt?: string;
}

export const DONE_MASTERY_THRESHOLD = 6;
export const MASTERED_MASTERY_THRESHOLD = 8;

export function updateMasteryScore(
	mastery: LearningMastery | undefined,
	update: MasteryUpdate,
): LearningMastery {
	const next: LearningMastery = {
		...mastery,
		last_examined: update.examinedAt ?? formatLearningDate(),
	};
	next[scoreKey(update.category)] = clampScore(update.score);
	if (update.evidenceNote) {
		next.evidence_notes = unique([...(next.evidence_notes ?? []), update.evidenceNote]);
	}
	if (update.weakPoints) {
		next.weak_points = unique([
			...(next.weak_points ?? []),
			...update.weakPoints.filter((point) => point.trim().length > 0),
		]);
	}
	return next;
}

export function meetsMasteryThreshold(
	mastery: LearningMastery | undefined,
	threshold: number,
): boolean {
	return (
		(mastery?.recall_score ?? 0) >= threshold &&
		(mastery?.mechanism_score ?? 0) >= threshold &&
		(mastery?.transfer_score ?? 0) >= threshold &&
		(mastery?.application_score ?? 0) >= threshold
	);
}

export function extractWeakPoints(
	results: Array<{ category: MasteryCategory; score: number; note: string }>,
	threshold = DONE_MASTERY_THRESHOLD,
): string[] {
	return results
		.filter((result) => result.score < threshold)
		.map((result) => `${result.category}: ${result.note}`);
}

function scoreKey(category: MasteryCategory): keyof LearningMastery {
	switch (category) {
		case "recall":
			return "recall_score";
		case "mechanism":
			return "mechanism_score";
		case "transfer":
			return "transfer_score";
		case "application":
			return "application_score";
	}
}

function clampScore(score: number): number {
	if (!Number.isFinite(score)) return 0;
	return Math.max(0, Math.min(10, score));
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values));
}
