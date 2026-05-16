import { describe, expect, it } from "vitest";
import {
	DONE_MASTERY_THRESHOLD,
	MASTERED_MASTERY_THRESHOLD,
	extractWeakPoints,
	meetsMasteryThreshold,
	updateMasteryScore,
} from "@/learning/mastery";

describe("mastery evidence", () => {
	it("updates category scores, evidence, weak points, and last examined", () => {
		const mastery = updateMasteryScore(undefined, {
			category: "recall",
			score: 7,
			evidenceNote: "_reviews/cache.md",
			weakPoints: ["mechanism: stale reads"],
			examinedAt: "2026-05-15",
		});

		expect(mastery.recall_score).toBe(7);
		expect(mastery.evidence_notes).toEqual(["_reviews/cache.md"]);
		expect(mastery.weak_points).toEqual(["mechanism: stale reads"]);
		expect(mastery.last_examined).toBe("2026-05-15");
	});

	it("checks done and mastered thresholds", () => {
		const done = {
			recall_score: 6,
			mechanism_score: 6,
			transfer_score: 6,
			application_score: 6,
		};
		const mastered = {
			recall_score: 8,
			mechanism_score: 8,
			transfer_score: 8,
			application_score: 8,
		};

		expect(meetsMasteryThreshold(done, DONE_MASTERY_THRESHOLD)).toBe(true);
		expect(meetsMasteryThreshold(done, MASTERED_MASTERY_THRESHOLD)).toBe(false);
		expect(meetsMasteryThreshold(mastered, MASTERED_MASTERY_THRESHOLD)).toBe(true);
	});

	it("extracts weak points for follow-up reviews", () => {
		expect(
			extractWeakPoints([
				{ category: "recall", score: 8, note: "solid" },
				{ category: "transfer", score: 4, note: "missed analogy" },
			]),
		).toEqual(["transfer: missed analogy"]);
	});
});
