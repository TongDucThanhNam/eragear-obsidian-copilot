import { ARTIFACT_FOLDERS } from "@/learning/constants";
import { buildBridgeNotePrompt } from "@/learning/prompt-builders/bridge-note.prompt";
import { buildCaseStudyPrompt } from "@/learning/prompt-builders/case-study.prompt";
import { buildHtmlExplainerPrompt } from "@/learning/prompt-builders/html-explainer.prompt";
import { buildLearningExplanationPrompt } from "@/learning/prompt-builders/learning-explanation.prompt";
import { buildLearningStructurePrompt } from "@/learning/prompt-builders/learning-structure.prompt";
import { buildQuizPrompt } from "@/learning/prompt-builders/quiz.prompt";
import { buildReviewPrompt } from "@/learning/prompt-builders/review.prompt";
import { createAgentSourceExcerpt } from "@/agent/task-source";
import {
	ARTIFACT_CONTRACTS,
	inferArtifactTypeFromPath,
} from "@/learning/artifact-contracts";
import type { HtmlExplainerRelatedNote } from "@/learning/artifact-manager";
import type { NextActionCandidate } from "@/learning/types";
import type { LearningAgentTask } from "@/agent/agent-task";

export function buildLearningAgentTask(
	candidate: NextActionCandidate,
	source: string,
	relatedNotes: HtmlExplainerRelatedNote[],
	createdAt: string,
): LearningAgentTask {
	const id = createTaskId(candidate.note.path, candidate.action, createdAt);

	return {
		id,
		status: "queued",
		title: `${candidate.action}: ${candidate.note.title}`,
		notePath: candidate.note.path,
		action: candidate.action,
		suggestedAgent: candidate.suggestedAgent,
		expectedOutput: candidate.expectedOutput,
		allowedWriteZones: getAllowedWriteZones(candidate),
		prompt: buildPrompt(candidate, source, relatedNotes),
		createdAt,
	};
}

function buildPrompt(
	candidate: NextActionCandidate,
	source: string,
	relatedNotes: HtmlExplainerRelatedNote[],
): string {
	const sourceExcerpt = createAgentSourceExcerpt(source);
	const base = {
		title: candidate.note.title,
		source: sourceExcerpt,
		relatedNotes,
	};

	if (candidate.note.status === "seed") {
		return buildLearningStructurePrompt(base);
	}

	if (candidate.note.status === "explain") {
		return buildLearningExplanationPrompt(base);
	}

	if (
		candidate.note.status === "visualize" &&
		!candidate.note.artifactHtml &&
		!candidate.note.artifacts?.html_explainer?.path
	) {
		return withArtifactContract(
			buildHtmlExplainerPrompt(base),
			"_explainers/example.html",
		);
	}

	if (
		candidate.note.status === "test" &&
		typeof candidate.note.quizScore !== "number"
	) {
		return withArtifactContract(buildQuizPrompt(base), "_quizzes/example.md");
	}

	if (candidate.note.status === "connect" && candidate.note.links.length < 5) {
		return withArtifactContract(
			buildBridgeNotePrompt({
				...base,
				sourcePath: candidate.note.path,
			}),
			"03_Bridge_Notes/example.md",
		);
	}

	if (candidate.note.status === "apply") {
		return withArtifactContract(
			buildCaseStudyPrompt({
				...base,
				sourcePath: candidate.note.path,
			}),
			"05_Case_Studies/example.md",
		);
	}

	if (candidate.note.status === "review") {
		return withArtifactContract(
			buildReviewPrompt({
				...base,
				sourcePath: candidate.note.path,
			}),
			"_reviews/example.md",
		);
	}

	return `You are helping complete a Learning OS action.

Action:
${candidate.action}

Note:
${candidate.note.title}
Path: ${candidate.note.path}

Expected output:
${candidate.expectedOutput ?? "Update the note safely."}

Source note:
${sourceExcerpt}

Related notes:
${relatedNotes
	.map((note) => `## ${note.title}\nPath: ${note.path}\n${note.excerpt}`)
	.join("\n\n")}
`;
}

function withArtifactContract(prompt: string, samplePath: string): string {
	const type = inferArtifactTypeFromPath(samplePath);
	if (!type) return prompt;
	const contract = ARTIFACT_CONTRACTS[type];
	return `${prompt}

Quality contract:
- Fill the artifact completely; do not leave placeholders.
- Minimum length: ${contract.minLength} characters.
- Include concrete sections for: ${contract.requiredTerms.join(", ")}.
- The proposal will be rejected if quality checks fail.
`;
}

function getAllowedWriteZones(candidate: NextActionCandidate): string[] {
	if (
		candidate.note.status === "seed" ||
		candidate.note.status === "explain"
	) {
		return [normalizeCommandCenterPath("learning-drafts")];
	}
	if (candidate.note.status === "visualize") {
		return [ARTIFACT_FOLDERS.explainers];
	}
	if (candidate.note.status === "test") {
		return [ARTIFACT_FOLDERS.quizzes];
	}
	if (candidate.note.status === "connect") {
		return [ARTIFACT_FOLDERS.bridgeNotes];
	}
	if (candidate.note.status === "apply") {
		return [ARTIFACT_FOLDERS.caseStudies];
	}
	if (candidate.note.status === "review") {
		return [ARTIFACT_FOLDERS.reviews];
	}
	return [candidate.note.path];
}

function normalizeCommandCenterPath(child: string): string {
	return `${ARTIFACT_FOLDERS.commandCenter}/${child}`;
}

function createTaskId(notePath: string, action: string, createdAt: string): string {
	return slugify(`${createdAt}-${notePath}-${action}`).slice(0, 120);
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "learning-task";
}
