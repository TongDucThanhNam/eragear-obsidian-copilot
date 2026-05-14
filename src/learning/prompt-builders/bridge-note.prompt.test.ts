import { describe, expect, it } from "vitest";
import { buildBridgeNotePrompt } from "@/learning/prompt-builders/bridge-note.prompt";

describe("bridge note prompt", () => {
	it("includes source and related note context", () => {
		const prompt = buildBridgeNotePrompt({
			title: "Queues",
			sourcePath: "Systems/queues.md",
			source: "Queues buffer work.",
			relatedNotes: [
				{
					title: "Backpressure",
					path: "Systems/backpressure.md",
					excerpt: "Backpressure slows producers.",
				},
			],
		});

		expect(prompt).toContain("Queues");
		expect(prompt).toContain("Systems/queues.md");
		expect(prompt).toContain("Backpressure");
		expect(prompt).toContain("Missing links to add");
	});
});
