import type { LearningArtifactType } from "@/learning/types";

export interface ArtifactContract {
	type: LearningArtifactType;
	label: string;
	requiredTerms: string[];
	minLength: number;
}

export const ARTIFACT_CONTRACTS: Record<LearningArtifactType, ArtifactContract> = {
	html_explainer: {
		type: "html_explainer",
		label: "HTML explainer",
		requiredTerms: ["core idea", "mental model", "interactive", "self-test"],
		minLength: 800,
	},
	quiz: {
		type: "quiz",
		label: "Quiz",
		requiredTerms: ["question", "answer", "recall", "application"],
		minLength: 600,
	},
	bridge_note: {
		type: "bridge_note",
		label: "Bridge note",
		requiredTerms: ["source note", "related", "[[", "connection"],
		minLength: 500,
	},
	case_study: {
		type: "case_study",
		label: "Case study",
		requiredTerms: ["scenario", "decision", "tradeoff", "outcome"],
		minLength: 700,
	},
	review: {
		type: "review",
		label: "Review",
		requiredTerms: ["recall", "weak", "next review", "evidence"],
		minLength: 500,
	},
};

export function inferArtifactTypeFromPath(
	path: string,
): LearningArtifactType | null {
	if (path.startsWith("_explainers/") && path.endsWith(".html")) {
		return "html_explainer";
	}
	if (path.startsWith("_quizzes/")) return "quiz";
	if (path.startsWith("03_Bridge_Notes/")) return "bridge_note";
	if (path.startsWith("05_Case_Studies/")) return "case_study";
	if (path.startsWith("_reviews/")) return "review";
	return null;
}
