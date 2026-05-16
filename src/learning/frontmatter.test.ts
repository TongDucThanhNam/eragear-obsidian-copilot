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

	it("parses partial schema v2 safely", () => {
		const frontmatter = parseLearningFrontmatter({
			type: "concept",
			area: "systems",
			status: "done",
			prerequisites: ["[[Cache]]"],
			unlocks: "[[Distributed cache]], [[CDN]]",
			mastery: {
				recall_score: 7,
				mechanism_score: "8",
				weak_points: ["invalidation"],
			},
			artifacts: {
				html_explainer: {
					path: "_explainers/cache.html",
					quality_score: "82",
				},
			},
			dod: {
				evidence_notes: ["_reviews/cache-review.md"],
				reviewed: true,
			},
		});

		expect(frontmatter.prerequisites).toEqual(["[[Cache]]"]);
		expect(frontmatter.unlocks).toEqual(["[[Distributed cache]]", "[[CDN]]"]);
		expect(frontmatter.mastery?.mechanism_score).toBe(8);
		expect(frontmatter.artifacts?.html_explainer?.quality_score).toBe(82);
		expect(frontmatter.dod?.reviewed).toBe(true);
	});

	it("parses full schema v2 artifact and DoD records", () => {
		const frontmatter = parseLearningFrontmatter({
			type: "project",
			area: "ai-engineering",
			status: "mastered",
			prerequisites: ["[[Prompting]]"],
			unlocks: ["[[Agent evals]]"],
			mastery: {
				recall_score: 9,
				mechanism_score: 9,
				transfer_score: 8,
				application_score: 8,
				last_examined: "2026-05-15",
				evidence_notes: ["_reviews/agents-exam.md"],
				weak_points: [],
			},
			artifacts: {
				html_explainer: { path: "_explainers/agents.html", quality_score: 90 },
				quiz: { path: "_quizzes/agents.md", quality_score: 85 },
				bridge_note: { path: "03_Bridge_Notes/agents.md", quality_score: 80 },
				case_study: { path: "05_Case_Studies/agents.md", quality_score: 82 },
				review: { path: "_reviews/agents.md", quality_score: 88 },
			},
			dod: {
				evidence_notes: ["_reviews/agents-exam.md"],
				explanation_reviewed: true,
				visualization_reviewed: true,
				connections_reviewed: true,
				quiz_reviewed: true,
				application_reviewed: true,
				reviewed: true,
			},
		});

		expect(frontmatter.mastery?.application_score).toBe(8);
		expect(frontmatter.artifacts?.case_study?.quality_score).toBe(82);
		expect(frontmatter.dod?.connections_reviewed).toBe(true);
	});

	it("ignores malformed schema v2 values without throwing", () => {
		const frontmatter = parseLearningFrontmatter({
			type: "concept",
			area: "systems",
			status: "explain",
			prerequisites: [1, "", "[[Valid]]"],
			mastery: "bad",
			artifacts: {
				quiz: "bad",
			},
			dod: ["bad"],
		});

		expect(frontmatter.prerequisites).toEqual(["[[Valid]]"]);
		expect(frontmatter.mastery).toBeUndefined();
		expect(frontmatter.artifacts).toBeUndefined();
		expect(frontmatter.dod).toBeUndefined();
	});
});
