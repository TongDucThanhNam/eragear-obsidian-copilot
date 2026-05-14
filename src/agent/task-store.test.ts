import { describe, expect, it } from "vitest";
import { parseLearningAgentTaskSummary } from "@/agent/task-frontmatter";

describe("agent task store", () => {
	it("parses agent task summaries from frontmatter", () => {
		expect(
			parseLearningAgentTaskSummary(
				"00_Command_Center/agent-tasks/task.md",
				"task",
				{
					type: "agent-task",
					status: "running",
					source_note: "Learning/cache.md",
					action: "Generate HTML explorable explanation",
					suggested_agent: "coding-agent",
					allowed_write_zones: ["_explainers"],
					created: "2026-05-12",
				},
			),
		).toEqual({
			id: "task",
			path: "00_Command_Center/agent-tasks/task.md",
			title: "task",
			status: "running",
			notePath: "Learning/cache.md",
			action: "Generate HTML explorable explanation",
			suggestedAgent: "coding-agent",
			allowedWriteZones: ["_explainers"],
			createdAt: "2026-05-12",
		});
	});

	it("ignores non-task frontmatter", () => {
		expect(
			parseLearningAgentTaskSummary("note.md", "note", {
				type: "concept",
			}),
		).toBeNull();
	});
});
