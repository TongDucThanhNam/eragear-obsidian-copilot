import { describe, expect, it } from "vitest";
import { buildReviewPrompt } from "@/learning/prompt-builders/review.prompt";

describe("review prompt", () => {
	it("builds review checks with promotion criteria", () => {
		const prompt = buildReviewPrompt({
			title: "Indexes",
			sourcePath: "Systems/indexes.md",
			source: "Indexes speed up reads with write tradeoffs.",
			relatedNotes: [
				{
					title: "Query planning",
					path: "Systems/query-planning.md",
					excerpt: "Planners choose access paths.",
				},
			],
		});

		expect(prompt).toContain("Recall checks");
		expect(prompt).toContain("Promotion criteria");
		expect(prompt).toContain("Systems/indexes.md");
		expect(prompt).toContain("Query planning");
	});
});
