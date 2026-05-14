import { describe, expect, it } from "vitest";
import { buildLearningAgentTask } from "@/agent/task-router";
import type { LearningNote, NextActionCandidate } from "@/learning/types";

describe("learning agent task router", () => {
	it("routes visualize notes to explainer write zone", () => {
		const task = buildLearningAgentTask(
			candidate({ status: "visualize", artifactHtml: undefined }),
			"Source content",
			[],
			"2026-05-13",
		);

		expect(task.allowedWriteZones).toEqual(["_explainers"]);
		expect(task.prompt).toContain("single-file interactive HTML");
	});

	it("routes apply notes to case study write zone", () => {
		const task = buildLearningAgentTask(
			candidate({ status: "apply" }),
			"Source content",
			[],
			"2026-05-13",
		);

		expect(task.allowedWriteZones).toEqual(["05_Case_Studies"]);
		expect(task.prompt).toContain("practical case study");
	});

	it("routes explanation notes to learning draft write zone", () => {
		const task = buildLearningAgentTask(
			candidate({ status: "explain" }),
			"Source content",
			[],
			"2026-05-13",
		);

		expect(task.allowedWriteZones).toEqual([
			"00_Command_Center/learning-drafts",
		]);
		expect(task.prompt).toContain("expanding a structured learning note");
	});

	it("caps large source notes before creating agent prompts", () => {
		const task = buildLearningAgentTask(
			candidate({ status: "explain" }),
			`---\ntype: concept\n---\n${"Large source. ".repeat(5000)}`,
			[],
			"2026-05-13",
		);

		expect(task.prompt.length).toBeLessThan(16000);
		expect(task.prompt).toContain("Source note truncated");
	});
});

function candidate(overrides: Partial<LearningNote>): NextActionCandidate {
	const note: LearningNote = {
		path: "Learning/cache.md",
		title: "Cache",
		type: "concept",
		area: "systems",
		status: "explain",
		maturity: 2,
		priority: 80,
		links: [],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};

	return {
		note,
		action: "Run learning action",
		reason: [],
		expectedOutput: "artifact",
		suggestedAgent: "coding-agent",
		score: 100,
	};
}
