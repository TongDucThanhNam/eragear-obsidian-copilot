import { describe, expect, it } from "vitest";
import { buildStarterLearningMetadataPatch } from "@/learning/learning-metadata-defaults";
import type { LearningNote } from "@/learning/types";

describe("learning metadata defaults", () => {
	it("builds starter metadata for an unenrolled note", () => {
		expect(
			buildStarterLearningMetadataPatch(
				learningNote({
					type: undefined,
					area: undefined,
					status: undefined,
					maturity: undefined,
				}),
				{ defaultArea: "Systems Bridge" },
			),
		).toEqual({
			type: "concept",
			area: "systems-bridge",
			status: "seed",
			maturity: 0,
		});
	});

	it("only fills missing fields", () => {
		expect(
			buildStarterLearningMetadataPatch(
				learningNote({
					type: "tool",
					area: "ai",
					status: undefined,
					maturity: 2,
				}),
			),
		).toEqual({
			status: "seed",
		});
	});
});

function learningNote(overrides: Partial<LearningNote>): LearningNote {
	return {
		path: "Learning/example.md",
		title: "Example",
		links: [],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};
}
