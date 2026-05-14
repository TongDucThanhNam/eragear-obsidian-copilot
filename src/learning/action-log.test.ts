import { describe, expect, it } from "vitest";
import { formatLearningActionLogEntry } from "@/learning/action-log-format";
import type { LearningActionRunResult } from "@/learning/action-runner";
import type { LearningNote, NextActionCandidate } from "@/learning/types";

describe("learning action log", () => {
	it("formats artifact run entries", () => {
		const entry = formatLearningActionLogEntry(
			candidate(),
			{
				type: "artifact",
				artifact: {
					notePath: "Learning/cache.md",
					artifactPath: "_quizzes/cache.md",
				},
			},
			"2026-05-13",
		);

		expect(entry).toContain("2026-05-13 - Generate quiz");
		expect(entry).toContain("Learning/cache.md");
		expect(entry).toContain("_quizzes/cache.md");
		expect(entry).toContain("missing quiz_score");
	});

	it("formats transition run entries", () => {
		const result: LearningActionRunResult = {
			type: "transition",
			message: "Quiz passed. Moved to apply.",
		};

		expect(formatLearningActionLogEntry(candidate(), result)).toContain(
			"Quiz passed. Moved to apply.",
		);
	});
});

function candidate(): NextActionCandidate {
	return {
		note: learningNote(),
		action: "Generate quiz",
		reason: ["missing quiz_score"],
		expectedOutput: "_quizzes/<note-slug>.md",
		suggestedAgent: "deterministic",
		score: 142,
	};
}

function learningNote(): LearningNote {
	return {
		path: "Learning/cache.md",
		title: "Cache",
		type: "concept",
		area: "systems",
		status: "test",
		maturity: 2,
		priority: 80,
		links: [],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
	};
}
