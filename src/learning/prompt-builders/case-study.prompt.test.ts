import { describe, expect, it } from "vitest";
import { buildCaseStudyPrompt } from "@/learning/prompt-builders/case-study.prompt";

describe("case study prompt", () => {
	it("includes source, constraints, and follow-up task requirements", () => {
		const prompt = buildCaseStudyPrompt({
			title: "Caching",
			sourcePath: "Systems/caching.md",
			source: "Caching stores reusable results.",
			relatedNotes: [
				{
					title: "Invalidation",
					path: "Systems/invalidation.md",
					excerpt: "Invalidation decides when cache entries expire.",
				},
			],
		});

		expect(prompt).toContain("Scenario");
		expect(prompt).toContain("Constraints");
		expect(prompt).toContain("Follow-up implementation task");
		expect(prompt).toContain("Systems/caching.md");
		expect(prompt).toContain("Invalidation");
	});
});
