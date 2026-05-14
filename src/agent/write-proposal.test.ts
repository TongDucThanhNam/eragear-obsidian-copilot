import { describe, expect, it } from "vitest";
import { parseAgentWriteProposal } from "@/agent/write-proposal-format";

describe("agent write proposal", () => {
	it("parses pending write proposal JSON", () => {
		const proposal = parseAgentWriteProposal(
			"00_Command_Center/agent-proposals/task.json",
			"task",
			JSON.stringify({
				taskPath: "00_Command_Center/agent-tasks/task.md",
				writes: [
					{
						path: "_explainers/cache.html",
						content: "<!doctype html>",
					},
				],
			}),
		);

		expect(proposal).toEqual({
			id: "task",
			path: "00_Command_Center/agent-proposals/task.json",
			taskPath: "00_Command_Center/agent-tasks/task.md",
			status: "pending",
			writes: [
				{
					path: "_explainers/cache.html",
					content: "<!doctype html>",
				},
			],
		});
	});

	it("rejects malformed proposal JSON", () => {
		expect(parseAgentWriteProposal("bad.json", "bad", "{")).toBeNull();
	});
});
