const DEFAULT_MAX_AGENT_SOURCE_CHARS = 12000;

export function createAgentSourceExcerpt(
	source: string,
	maxChars = DEFAULT_MAX_AGENT_SOURCE_CHARS,
): string {
	if (source.length <= maxChars) return source;

	const frontmatter = extractFrontmatter(source);
	const availableBodyChars = Math.max(0, maxChars - frontmatter.length);
	const body = source.slice(frontmatter.length);
	const excerpt = body.slice(0, availableBodyChars).trimEnd();
	const omittedChars = source.length - frontmatter.length - excerpt.length;
	const truncationNote = [
		"",
		`[Source note truncated: ${omittedChars} chars omitted.]`,
		"Use this excerpt as the bounded source context. If the full note is needed, create a narrower learning note first.",
	].join("\n");

	return `${frontmatter}${excerpt}${truncationNote}`;
}

function extractFrontmatter(source: string): string {
	if (!source.startsWith("---\n")) return "";

	const end = source.indexOf("\n---", 4);
	if (end === -1) return "";

	const afterClosingFence = end + "\n---".length;
	const includesTrailingNewline = source.charAt(afterClosingFence) === "\n";
	return source.slice(0, afterClosingFence + (includesTrailingNewline ? 1 : 0));
}
