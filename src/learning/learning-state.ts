import { formatLearningDate } from "@/learning/frontmatter";
import { canPromoteStatus } from "@/learning/definition-of-done";
import type { LearningFrontmatterPatch } from "@/learning/frontmatter-writer";
import type {
	LearningNote,
	LearningStatus,
	NextActionCandidate,
} from "@/learning/types";

export interface LearningTransition {
	patch: LearningFrontmatterPatch;
	message: string;
}

export function getNextLearningStatus(
	status: LearningStatus,
): LearningStatus | null {
	const index = LEARNING_STATUS_ORDER.indexOf(status);
	if (index === -1) return null;
	return LEARNING_STATUS_ORDER[index + 1] ?? null;
}

export function inferDeterministicTransition(
	candidate: NextActionCandidate,
	today = formatLearningDate(),
): LearningTransition | null {
	const note = candidate.note;

	if (!note.type || !note.area || !note.status) {
		return null;
	}

	switch (note.status) {
		case "seed":
			return canPromoteStatus(note, "explain")
				? transitionTo(note, "explain", "Moved seed to explain.")
				: null;
		case "explain":
			return canPromoteStatus(note, "visualize")
				? transitionTo(note, "visualize", "Moved explanation to visualize.")
				: null;
		case "visualize":
			return canPromoteStatus(note, "connect")
				? transitionTo(note, "connect", "Moved visualization to connect.")
				: null;
		case "connect":
			return canPromoteStatus(note, "test")
				? transitionTo(note, "test", "Connections validated. Moved to test.")
				: null;
		case "test":
			if (canPromoteStatus(note, "apply")) {
				return transitionTo(note, "apply", "Quiz passed. Moved to apply.");
			}
			return typeof note.quizScore === "number" && note.quizScore < 7
				? transitionTo(note, "explain", "Quiz was weak. Moved back to explain.")
				: null;
		case "apply":
			return canPromoteStatus(note, "review")
				? transitionTo(note, "review", "Application evidence moved to review.")
				: null;
		case "review":
			return canPromoteStatus(note, "done")
				? transitionTo(note, "done", "Review evidence moved to done.")
				: null;
		case "done":
			if (canPromoteStatus(note, "mastered")) {
				return transitionTo(note, "mastered", "Mastery evidence accepted.");
			}
			return {
				patch: {
					status: "review",
					reviewDue: addDays(today, 7),
				},
				message: "Scheduled spaced review.",
			};
		default:
			return null;
	}
}

function transitionTo(
	note: LearningNote,
	status: LearningStatus,
	message: string,
): LearningTransition {
	return {
		patch: {
			status,
			maturity: bumpMaturity(note.maturity),
		},
		message,
	};
}

function bumpMaturity(maturity: number | undefined): number {
	return Math.min((maturity ?? 0) + 1, 5);
}

function addDays(dateValue: string, days: number): string {
	const [year, month, day] = dateValue.split("-").map(Number);
	if (!year || !month || !day) return dateValue;

	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + days);
	return formatLearningDate(date);
}

const LEARNING_STATUS_ORDER: LearningStatus[] = [
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
