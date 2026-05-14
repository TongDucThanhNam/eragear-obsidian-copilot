import { describe, expect, it } from "vitest";
import { buildQuizPrompt } from "@/learning/prompt-builders/quiz.prompt";

describe("quiz prompt", () => {
	it("builds a source-grounded self-test prompt with related context", () => {
		const prompt = buildQuizPrompt({
			title: "Load balancing",
			source: "Load balancers distribute traffic.",
			relatedNotes: [
				{
					title: "Health checks",
					path: "Systems/health-checks.md",
					excerpt: "Health checks remove failed instances.",
				},
			],
		});

		expect(prompt).toContain("Five short-answer questions");
		expect(prompt).toContain("Load balancing");
		expect(prompt).toContain("Health checks");
		expect(prompt).toContain("Systems/health-checks.md");
	});
});
