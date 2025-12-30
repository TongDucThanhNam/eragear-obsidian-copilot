import type * as acp from "@agentclientprotocol/sdk";
import type { ToolCallContent } from "../../domain/models/session-update";

/**
 * Extended type for ACP ToolCallContent to include additional properties
 * that may not be in official SDK types yet
 */
type ExtendedAcpToolCallContent = acp.ToolCallContent & {
	text?: string;
	content?: {
		type?: string;
		text?: string;
	};
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
	if (!acpContent) {
		console.log("[AcpTypeConverter] No content to convert");
		return undefined;
	}

	console.log("[AcpTypeConverter] Converting content:", acpContent);

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
				terminalId: item.terminalId ?? "unknown",
				text: extItem.text || "",
			});
		} else if ((item.type as string) === "text") {
			// Handle text type which may not be in SDK types
			converted.push({
				type: "text",
				text: extItem.text || "",
			});
		} else if ((item.type as string) === "content") {
			// Handle "content" wrapper type from ACP
			// Format: { type: 'content', content: { type: 'text', text: '...' } }
			const innerContent = extItem.content;
			if (innerContent) {
				if (innerContent.type === "text" && innerContent.text) {
					converted.push({
						type: "text",
						text: innerContent.text,
					});
				} else if (innerContent.text) {
					// Fallback if inner content has text but unknown type
					converted.push({
						type: "text",
						text: innerContent.text,
					});
				}
			}
		} else {
			// Fallback: if it has text property, treat as text
			if (extItem.text) {
				console.log(
					"[AcpTypeConverter] Handling unknown type as text:",
					item.type,
					extItem,
				);
				converted.push({
					type: "text",
					text: extItem.text,
				});
			} else if (extItem.content?.text) {
				// Last resort: check for nested content.text
				converted.push({
					type: "text",
					text: extItem.content.text,
				});
			}
		}
	}

	console.log("[AcpTypeConverter] Converted result:", converted);
	return converted.length > 0 ? converted : undefined;
}

/**
 * @deprecated Use the exported function directly instead
 */
export const AcpTypeConverter = {
	toToolCallContent,
};
