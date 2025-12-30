import type * as acp from "@agentclientprotocol/sdk";
import type { ToolCallContent } from "../../domain/models/session-update";

/**
 * Extended type for ACP ToolCallContent to include text property
 * that may not be in official SDK types yet
 */
type ExtendedAcpToolCallContent = acp.ToolCallContent & {
	text?: string;
};

/**
 * Convert ACP SDK ToolCallContent to our domain ToolCallContent type.
 *
 * @param acpContent - Array of ACP ToolCallContent items
 * @returns Converted domain ToolCallContent array, or undefined if empty
 */
export function toToolCallContent(
	acpContent: acp.ToolCallContent[] | undefined | null,
): ToolCallContent[] | undefined {
	if (!acpContent) return undefined;

	const converted: ToolCallContent[] = [];

	for (const item of acpContent) {
		const extItem = item as ExtendedAcpToolCallContent;

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
				text: extItem.text || "",
			});
		} else if ((item.type as string) === "text") {
			// Handle text type which may not be in SDK types
			converted.push({
				type: "text",
				text: extItem.text || "",
			});
		}
	}

	return converted.length > 0 ? converted : undefined;
}

/**
 * @deprecated Use the exported function directly instead
 */
export const AcpTypeConverter = {
	toToolCallContent,
};
