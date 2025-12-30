import * as acp from "@agentclientprotocol/sdk";
import type { ToolCallContent } from "../../domain/models/session-update";

export class AcpTypeConverter {
	static toToolCallContent(
		acpContent: acp.ToolCallContent[] | undefined | null,
	): ToolCallContent[] | undefined {
		if (!acpContent) return undefined;

		const converted: ToolCallContent[] = [];

		for (const item of acpContent) {
			if (item.type === "diff") {
				converted.push({
					type: "diff",
					path: item.path,
					newText: item.newText ?? undefined,
					oldText: item.oldText ?? undefined,
				});
			} else if (item.type === "terminal") {
				converted.push({
					type: "terminal",
					terminalId: item.terminalId,
					text: (item as any).text || "", // Cast if text missing in type def
				});
			} else if (item.type === ("text" as any)) {
				converted.push({
					type: "text",
					text: (item as any).text,
				});
			}
		}

		return converted.length > 0 ? converted : undefined;
	}
}
