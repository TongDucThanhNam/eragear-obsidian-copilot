import { describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import {
	detectMissingFields,
	parseLearningFrontmatter,
} from "@/learning/frontmatter";
import { patchLearningFrontmatter } from "@/learning/frontmatter-writer";

describe("learning frontmatter", () => {
	it("detects missing type, area, and status", () => {
		const frontmatter = parseLearningFrontmatter({
			priority: 90,
		});

		expect(detectMissingFields(frontmatter)).toEqual([
			"type",
			"area",
			"status",
		]);
	});

	it("writes camel-case patches to learning frontmatter keys", async () => {
		const frontmatter: Record<string, unknown> = {};
		const app = {
			fileManager: {
				processFrontMatter: async (
					_file: TFile,
					callback: (frontmatter: Record<string, unknown>) => void,
				) => {
					callback(frontmatter);
				},
			},
		} as unknown as App;

		await patchLearningFrontmatter(app, {} as TFile, {
			type: "concept",
			area: "systems",
			status: "visualize",
			quizScore: 8,
			lastTouched: "2026-05-12",
		});

		expect(frontmatter).toEqual({
			type: "concept",
			area: "systems",
			status: "visualize",
			quiz_score: 8,
			last_touched: "2026-05-12",
		});
	});
});
