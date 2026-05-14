import { describe, expect, it } from "vitest";
import { formatLearningAgentTaskFile } from "@/agent/task-format";
import type { LearningAgentTask } from "@/agent/agent-task";

describe("learning agent task writer", () => {
	it("formats task files with allowed write zones and checklist", () => {
		const content = formatLearningAgentTaskFile(task());

		expect(content).toContain("type: agent-task");
		expect(content).toContain("Allowed write zones");
		expect(content).toContain("`_quizzes`");
		expect(content).toContain("Completion checklist");
	});
});

function task(): LearningAgentTask {
	return {
		id: "task",
		status: "queued",
		title: "Generate quiz: Cache",
		notePath: "Learning/cache.md",
		action: "Generate quiz",
		suggestedAgent: "deterministic",
		expectedOutput: "_quizzes/cache.md",
		allowedWriteZones: ["_quizzes"],
		prompt: "Build a quiz.",
		createdAt: "2026-05-13",
	};
}
