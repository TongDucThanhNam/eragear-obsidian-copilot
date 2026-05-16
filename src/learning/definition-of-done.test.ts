import { describe, expect, it } from "vitest";
import {
	canPromoteStatus,
	evaluateDefinitionOfDone,
	getPromotionBlockers,
} from "@/learning/definition-of-done";
import type { LearningNote } from "@/learning/types";

describe("definition of done", () => {
	it("allows and blocks every status gate with human-readable blockers", () => {
		expect(canPromoteStatus(note({ status: "explain" }), "visualize")).toBe(true);
		expect(
			getPromotionBlockers(note({ status: "visualize" }), "connect"),
		).toContain("HTML explainer evidence is missing.");
		expect(
			canPromoteStatus(
				note({
					status: "visualize",
					artifacts: {
						html_explainer: {
							path: "_explainers/cache.html",
							quality_score: 80,
						},
					},
				}),
				"connect",
			),
		).toBe(true);
		expect(
			canPromoteStatus(note({ status: "connect", links: ["a", "b"] }), "test"),
		).toBe(false);
		expect(
			canPromoteStatus(
				note({
					status: "test",
					quizScore: 8,
				}),
				"apply",
			),
		).toBe(true);
		expect(
			canPromoteStatus(
				note({
					status: "apply",
					artifacts: { case_study: { quality_score: 75 } },
				}),
				"review",
			),
		).toBe(true);
		expect(
			canPromoteStatus(
				note({
					status: "review",
					artifacts: { review: { quality_score: 75 } },
					dod: { evidence_notes: ["_reviews/cache.md"] },
					mastery: {
						recall_score: 6,
						mechanism_score: 6,
						transfer_score: 6,
						application_score: 6,
					},
				}),
				"done",
			),
		).toBe(true);
		expect(
			canPromoteStatus(
				note({
					status: "done",
					dod: { evidence_notes: ["_reviews/cache.md"] },
					mastery: {
						recall_score: 8,
						mechanism_score: 8,
						transfer_score: 8,
						application_score: 8,
						weak_points: [],
					},
				}),
				"mastered",
			),
		).toBe(true);
	});

	it("evaluates current note blockers for command center display", () => {
		const evaluation = evaluateDefinitionOfDone(
			note({
				status: "done",
				mastery: {
					recall_score: 8,
					mechanism_score: 5,
					transfer_score: 8,
					application_score: 8,
					weak_points: ["transfer to production"],
				},
			}),
		);

		expect(evaluation.passed).toBe(false);
		expect(evaluation.blockers.join(" ")).toContain("mechanism");
		expect(evaluation.blockers.join(" ")).toContain("Weak points");
	});
});

function note(overrides: Partial<LearningNote> = {}): LearningNote {
	return {
		path: "Learning/cache.md",
		title: "Cache",
		type: "concept",
		area: "systems",
		status: "explain",
		maturity: 2,
		priority: 50,
		links: ["a", "b", "c", "d", "e"],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};
}
