import type { ExtendedMessagePart, Message } from "@/features/chat/types";

const hasText = (value: string): boolean => value.trim().length > 0;

export const hasRenderableMessagePart = (
	part: ExtendedMessagePart,
): boolean => {
	switch (part.type) {
		case "text":
		case "thought":
			return hasText(part.text);
		case "tool-call":
			return true;
		case "tool-calls":
			return part.toolCalls.length > 0;
		case "output":
			return hasText(part.output.text);
		default:
			return false;
	}
};

export const hasRenderableMessageContent = (message: Message): boolean =>
	message.parts.some(hasRenderableMessagePart);

export const getMessageTextContent = (message: Message): string =>
	message.parts
		.map((part) => {
			if (part.type === "text") return part.text;
			if (part.type === "thought") return `Reasoning:\n${part.text}\n`;
			if (part.type === "output") return part.output.text;
			return "";
		})
		.filter(hasText)
		.join("\n");
