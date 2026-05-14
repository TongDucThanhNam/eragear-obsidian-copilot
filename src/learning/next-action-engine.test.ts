import { describe, expect, it } from "vitest";
import {
	generateNextActionQueue,
	inferNextAction,
	scoreLearningNote,
} from "@/learning/next-action-engine";
import type {
	LearningNote,
	LearningScanResult,
} from "@/learning/types";

describe("next action engine", () => {
	it("groups multiple missing metadata fields into one action", () => {
		const note = learningNote({
			type: undefined,
			area: undefined,
			status: undefined,
			missingFields: ["type", "area", "status"],
		});

		expect(inferNextAction(note)).toBe("Add missing learning metadata");
	});

	it("suggests HTML explainer generation for visualize notes without artifacts", () => {
		const note = learningNote({
			status: "visualize",
			artifactHtml: undefined,
		});

		expect(inferNextAction(note)).toBe(
			"Generate HTML explorable explanation",
		);
	});

	it("scores high priority notes above low priority notes", () => {
		const low = learningNote({ priority: 10 });
		const high = learningNote({ priority: 90 });

		expect(scoreLearningNote(high)).toBeGreaterThan(scoreLearningNote(low));
	});

	it("removes mastered notes from the queue", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "mastered" })]),
		);

		expect(queue).toHaveLength(0);
	});

	it("penalizes recently touched notes", () => {
		const today = "2026-05-12";
		const untouched = learningNote({ lastTouched: "2026-05-01" });
		const touched = learningNote({ lastTouched: today });

		expect(scoreLearningNote(untouched, undefined, today)).toBeGreaterThan(
			scoreLearningNote(touched, undefined, today),
		);
	});

	it("describes quiz artifact output for test notes without scores", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "test", quizScore: undefined })]),
		);

		expect(queue[0]?.action).toBe("Generate quiz and test understanding");
		expect(queue[0]?.expectedOutput).toBe(
			"_quizzes/<note-slug>.md and next_action = complete quiz",
		);
	});

	it("treats quiz score zero as a recorded weak score", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "test", quizScore: 0 })]),
		);

		expect(queue[0]?.action).toBe("Review weak points from quiz");
		expect(queue[0]?.expectedOutput).toBeUndefined();
	});

	it("describes structure output for seed notes", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "seed" })]),
		);

		expect(queue[0]?.action).toBe(
			"Convert raw note into structured learning note",
		);
		expect(queue[0]?.expectedOutput).toBe(
			"00_Command_Center/learning-drafts/<note-slug>-structure.md and status = explain",
		);
	});

	it("describes explanation output for explain notes", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "explain" })]),
		);

		expect(queue[0]?.action).toBe(
			"Generate explanation, mechanism, examples, and failure modes",
		);
		expect(queue[0]?.expectedOutput).toBe(
			"00_Command_Center/learning-drafts/<note-slug>-explanation.md and status = visualize",
		);
		expect(queue[0]?.suggestedAgent).toBe("reasoning-model");
	});

	it("describes bridge note output for under-connected connect notes", () => {
		const queue = generateNextActionQueue(
			scanWith([
				learningNote({
					status: "connect",
					links: ["one.md"],
				}),
			]),
		);

		expect(queue[0]?.action).toBe(
			"Add links to related notes, MOCs, and bridge notes",
		);
		expect(queue[0]?.expectedOutput).toBe(
			"03_Bridge_Notes/<note-slug>-bridge.md and next_action = review bridge note",
		);
	});

	it("describes case study output for apply notes", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "apply" })]),
		);

		expect(queue[0]?.action).toBe(
			"Create case study, lab, or implementation example",
		);
		expect(queue[0]?.expectedOutput).toBe(
			"05_Case_Studies/<note-slug>-case-study.md and next_action = complete case study",
		);
	});

	it("describes review checklist output for review notes", () => {
		const queue = generateNextActionQueue(
			scanWith([learningNote({ status: "review" })]),
		);

		expect(queue[0]?.action).toBe("Review note and promote maturity if passed");
		expect(queue[0]?.expectedOutput).toBe(
			"_reviews/<note-slug>-review.md and next_action = complete review",
		);
	});
});

function learningNote(overrides: Partial<LearningNote> = {}): LearningNote {
	return {
		path: "Learning/example.md",
		title: "Example",
		type: "concept",
		area: "systems",
		status: "explain",
		maturity: 2,
		priority: 50,
		links: [],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};
}

function scanWith(notes: LearningNote[]): LearningScanResult {
	return {
		notes,
		weakNotes: [],
		missingArtifacts: [],
		dueReviews: [],
		summary: {
			totalNotes: notes.length,
			missingType: 0,
			missingArea: 0,
			missingStatus: 0,
			weakNotes: 0,
			missingArtifacts: 0,
			dueReviews: 0,
		},
		scannedAt: "2026-05-12T00:00:00.000Z",
	};
}
