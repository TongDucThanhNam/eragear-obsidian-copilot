import {
	ARTIFACT_CONTRACTS,
	inferArtifactTypeFromPath,
} from "@/learning/artifact-contracts";
import type { LearningArtifactType } from "@/learning/types";

export interface ArtifactQualityResult {
	type: LearningArtifactType;
	score: number;
	passed: boolean;
	issues: string[];
}

const PLACEHOLDER_PATTERNS = [
	"replace this section",
	"todo",
	"tbd",
	"lorem ipsum",
	"agent handoff prompt",
	"source note as ground truth",
];

export function evaluateArtifactQuality(
	type: LearningArtifactType,
	content: string,
): ArtifactQualityResult {
	const contract = ARTIFACT_CONTRACTS[type];
	const normalized = content.toLowerCase();
	const issues: string[] = [];
	let score = 100;

	if (content.trim().length < contract.minLength) {
		issues.push(`${contract.label} is too short.`);
		score -= 30;
	}

	if (isSourceOnlyArtifact(normalized)) {
		issues.push(`${contract.label} appears to be source-only.`);
		score -= 35;
	}

	for (const placeholder of PLACEHOLDER_PATTERNS) {
		if (normalized.includes(placeholder)) {
			issues.push(`${contract.label} contains placeholder text.`);
			score -= 35;
			break;
		}
	}

	for (const term of contract.requiredTerms) {
		if (!normalized.includes(term.toLowerCase())) {
			issues.push(`${contract.label} is missing ${term}.`);
			score -= 8;
		}
	}

	if (type === "html_explainer" && !looksLikeHtml(content)) {
		issues.push("HTML explainer is not valid single-file HTML.");
		score -= 30;
	}

	const boundedScore = Math.max(0, Math.min(100, score));
	return {
		type,
		score: boundedScore,
		passed: boundedScore >= 70 && issues.length <= 2,
		issues,
	};
}

export function evaluateArtifactQualityForPath(
	path: string,
	content: string,
): ArtifactQualityResult | null {
	const type = inferArtifactTypeFromPath(path);
	if (!type) return null;
	return evaluateArtifactQuality(type, content);
}

function looksLikeHtml(content: string): boolean {
	const normalized = content.trim().toLowerCase();
	return normalized.includes("<!doctype html") || normalized.includes("<html");
}

function isSourceOnlyArtifact(normalized: string): boolean {
	const sourceMarkers = [
		"## answer key source",
		"```markdown",
		"source note:",
	];
	const hasSourceMarker = sourceMarkers.some((marker) =>
		normalized.includes(marker),
	);
	const hasWorkSections =
		normalized.includes("## questions") ||
		normalized.includes("## scenario") ||
		normalized.includes("## review") ||
		normalized.includes("interactive") ||
		normalized.includes("application");
	return hasSourceMarker && !hasWorkSections;
}
