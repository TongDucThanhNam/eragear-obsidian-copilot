import { describe, expect, it } from "vitest";
import { evaluateArtifactQuality } from "@/learning/artifact-quality";

describe("artifact quality", () => {
	it("passes concrete filled artifacts", () => {
		const result = evaluateArtifactQuality(
			"quiz",
			`# Cache quiz

## Recall question

${"Question: explain the core idea. Answer: reusable results are kept close. ".repeat(8)}

## Mechanism question

${"Question: describe invalidation. Answer: writes update or remove stale entries. ".repeat(8)}

## Application

${"Apply the cache to a production endpoint and explain the tradeoff. ".repeat(8)}
`,
		);

		expect(result.passed).toBe(true);
		expect(result.score).toBeGreaterThanOrEqual(70);
	});

	it("rejects placeholders and empty artifacts", () => {
		const result = evaluateArtifactQuality(
			"html_explainer",
			"<!doctype html><p>Replace this section.</p>",
		);

		expect(result.passed).toBe(false);
		expect(result.issues.join(" ")).toContain("placeholder");
	});
});
