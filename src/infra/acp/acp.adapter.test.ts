import { describe, expect, it } from "vitest";
import type { App } from "obsidian";
import { AcpAdapter } from "@/infra/acp/acp.adapter";

describe("AcpAdapter bounded permissions", () => {
	it("auto-approves safe proposal writes using absolute vault paths", async () => {
		const adapter = createBoundedAdapter();

		const result = await adapter.requestPermission({
			title:
				"Write /mock-vault/00_Command_Center/agent-proposals/task.json",
			options: [
				{ optionId: "reject", name: "Reject", kind: "reject" },
				{ optionId: "allow_once", name: "Allow once", kind: "allow_once" },
			],
		});

		expect(result).toEqual({
			outcome: { outcome: "selected", optionId: "allow_once" },
		});
	});

	it("auto-cancels unsafe bounded permissions", async () => {
		const adapter = createBoundedAdapter();

		const result = await adapter.requestPermission({
			title: "`ls -la /mock-vault`",
			options: [{ optionId: "allow_once", name: "Allow once" }],
		});

		expect(result).toEqual({ outcome: { outcome: "cancelled" } });
	});
});

function createBoundedAdapter(): AcpAdapter {
	const adapter = new AcpAdapter({
		vault: {
			adapter: {
				basePath: "/mock-vault",
			},
		},
	} as App);

	adapter.setAutoApproveSafeFilePermissions(true);
	adapter.setWriteGuard((path) => ({
		allowed: path.startsWith("00_Command_Center/agent-proposals/"),
	}));
	return adapter;
}
