import { describe, expect, it } from "vitest";
import { buildHtmlExplainerPrompt } from "@/learning/prompt-builders/html-explainer.prompt";

describe("html explainer prompt", () => {
	it("includes related notes as supporting context", () => {
		const prompt = buildHtmlExplainerPrompt({
			title: "Caching",
			source: "Caching stores reusable results.",
			relatedNotes: [
				{
					title: "Cache invalidation",
					path: "Systems/cache-invalidation.md",
					excerpt: "Invalidation is one of the hard parts.",
				},
			],
		});

		expect(prompt).toContain("Caching");
		expect(prompt).toContain("Cache invalidation");
		expect(prompt).toContain("Systems/cache-invalidation.md");
		expect(prompt).toContain("Invalidation is one of the hard parts.");
	});
});
