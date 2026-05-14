import { describe, expect, it } from "vitest";
import {
	getNextLearningStatus,
	inferDeterministicTransition,
} from "@/learning/learning-state";
import type { LearningNote, NextActionCandidate } from "@/learning/types";

describe("learning state", () => {
	it("returns the next status in the learning lifecycle", () => {
		expect(getNextLearningStatus("visualize")).toBe("connect");
		expect(getNextLearningStatus("mastered")).toBeNull();
	});

	it("moves visualized notes with artifacts to connect", () => {
		const transition = inferDeterministicTransition(
			candidate(
				learningNote({
					status: "visualize",
					artifactHtml: "_explainers/cache.html",
					maturity: 2,
				}),
			),
		);

		expect(transition?.patch).toMatchObject({
			status: "connect",
			maturity: 3,
		});
	});

	it("moves failed quiz notes back to explain", () => {
		const transition = inferDeterministicTransition(
			candidate(
				learningNote({
					status: "test",
					quizScore: 5,
				}),
			),
		);

		expect(transition?.patch.status).toBe("explain");
	});

	it("schedules done notes for review", () => {
		const transition = inferDeterministicTransition(
			candidate(
				learningNote({
					status: "done",
				}),
			),
			"2026-05-13",
		);

		expect(transition?.patch).toMatchObject({
			status: "review",
			reviewDue: "2026-05-20",
		});
	});
});

function candidate(note: LearningNote): NextActionCandidate {
	return {
		note,
		action: "Run transition",
		reason: [],
		suggestedAgent: "deterministic",
		score: 0,
	};
}

function learningNote(overrides: Partial<LearningNote> = {}): LearningNote {
	return {
		path: "Learning/example.md",
		title: "Example",
		type: "concept",
		area: "systems",
		status: "explain",
		maturity: 2,
		priority: 50,
		links: ["a.md", "b.md", "c.md", "d.md", "e.md"],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};
}
