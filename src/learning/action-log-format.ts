import { formatLearningDate } from "@/learning/frontmatter";
import type { LearningActionRunResult } from "@/learning/action-runner";
import type { NextActionCandidate } from "@/learning/types";

export function formatLearningActionLogEntry(
	candidate: NextActionCandidate,
	result: LearningActionRunResult,
	date = formatLearningDate(),
): string {
	const lines = [
		`## ${date} - ${candidate.action}`,
		"",
		`- Note: [[${candidate.note.title}]]`,
		`- Path: \`${candidate.note.path}\``,
		`- Score: ${Math.round(candidate.score)}`,
		`- Agent: ${candidate.suggestedAgent}`,
		`- Result: ${formatResult(result)}`,
	];

	if (candidate.reason.length > 0) {
		lines.push(`- Reason: ${candidate.reason.join("; ")}`);
	}

	return lines.join("\n");
}

function formatResult(result: LearningActionRunResult): string {
	if (result.type === "artifact") {
		return `created \`${result.artifact.artifactPath}\``;
	}
	return result.message;
}
