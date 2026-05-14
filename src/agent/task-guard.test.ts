import { describe, expect, it } from "vitest";
import { isPathAllowed, validateAgentWritePlan } from "@/agent/task-guard";

describe("agent task write guard", () => {
	it("allows files inside allowed write zones", () => {
		expect(isPathAllowed("_quizzes/cache.md", ["_quizzes"])).toBe(true);
		expect(isPathAllowed("05_Case_Studies/cache.md", ["05_Case_Studies"])).toBe(
			true,
		);
	});

	it("rejects files outside allowed write zones", () => {
		expect(isPathAllowed("Resources/cache.md", ["_quizzes"])).toBe(false);
		expect(isPathAllowed("../outside.md", ["_quizzes"])).toBe(false);
	});

	it("validates a complete write plan", () => {
		const result = validateAgentWritePlan(
			{ allowedWriteZones: ["_reviews"] },
			["_reviews/cache-review.md", "Resources/cache.md"],
		);

		expect(result.isValid).toBe(false);
		expect(result.allowed).toEqual(["_reviews/cache-review.md"]);
		expect(result.rejected).toEqual(["Resources/cache.md"]);
	});
});
