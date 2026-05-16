import { describe, expect, it } from "vitest";
import { applyExaminerResultToMastery } from "@/learning/examiner-manager";

describe("examiner manager", () => {
	it("stores graded category scores and weak points", () => {
		const mastery = applyExaminerResultToMastery(undefined, {
			recall: 8,
			mechanism: 5,
			transfer: 4,
			application: 7,
			evidenceNote: "_reviews/cache-exam.md",
			notes: {
				mechanism: "missed invalidation",
				transfer: "missed CDN comparison",
			},
		});

		expect(mastery.recall_score).toBe(8);
		expect(mastery.mechanism_score).toBe(5);
		expect(mastery.transfer_score).toBe(4);
		expect(mastery.application_score).toBe(7);
		expect(mastery.evidence_notes).toEqual(["_reviews/cache-exam.md"]);
		expect(mastery.weak_points).toContain("mechanism: missed invalidation");
		expect(mastery.weak_points).toContain("transfer: missed CDN comparison");
	});
});
