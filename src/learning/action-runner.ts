import { type App, TFile } from "obsidian";
import {
	generateHtmlExplainerForNote,
	type HtmlExplainerRelatedNote,
} from "@/learning/artifact-manager";
import { generateBridgeNoteForNote } from "@/learning/bridge-note-manager";
import { generateCaseStudyForNote } from "@/learning/case-study-manager";
import { formatLearningDate } from "@/learning/frontmatter";
import { patchLearningFrontmatter } from "@/learning/frontmatter-writer";
import { generateLearningExplanationForNote } from "@/learning/learning-explanation-manager";
import { buildStarterLearningMetadataPatch } from "@/learning/learning-metadata-defaults";
import { generateLearningStructureForNote } from "@/learning/learning-structure-manager";
import { inferDeterministicTransition } from "@/learning/learning-state";
import { generateQuizForNote } from "@/learning/quiz-manager";
import { generateReviewForNote } from "@/learning/review-manager";
import type { GeneratedArtifact, NextActionCandidate } from "@/learning/types";

export type LearningActionRunResult =
	| {
			type: "artifact";
			artifact: GeneratedArtifact;
	  }
	| {
			type: "notice";
			message: string;
	  }
	| {
			type: "transition";
			message: string;
	  };

export interface LearningActionRunOptions {
	relatedNotes?: HtmlExplainerRelatedNote[];
	defaultArea?: string;
}

export async function runLearningAction(
	app: App,
	candidate: NextActionCandidate,
	options: LearningActionRunOptions = {},
): Promise<LearningActionRunResult> {
	const file = app.vault.getAbstractFileByPath(candidate.note.path);

	if (!(file instanceof TFile) || file.extension !== "md") {
		throw new Error(`Learning note not found: ${candidate.note.path}`);
	}

	if (!candidate.note.type || !candidate.note.area || !candidate.note.status) {
		const patch = buildStarterLearningMetadataPatch(candidate.note, {
			defaultArea: options.defaultArea,
		});
		if (!patch) {
			return {
				type: "notice",
				message:
					"This note is missing required learning metadata. Add missing metadata next.",
			};
		}

		await patchLearningFrontmatter(app, file, {
			...patch,
			lastTouched: formatLearningDate(),
		});
		return {
			type: "transition",
			message: "Added starter learning metadata.",
		};
	}

	if (candidate.note.status === "seed") {
		const artifact = await generateLearningStructureForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (candidate.note.status === "explain") {
		const artifact = await generateLearningExplanationForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (
		candidate.note.status === "visualize" &&
		!candidate.note.artifactHtml
	) {
		const artifact = await generateHtmlExplainerForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (
		candidate.note.status === "test" &&
		typeof candidate.note.quizScore !== "number"
	) {
		const artifact = await generateQuizForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (candidate.note.status === "connect" && candidate.note.links.length < 5) {
		const artifact = await generateBridgeNoteForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (candidate.note.status === "apply") {
		const artifact = await generateCaseStudyForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	if (candidate.note.status === "review") {
		const artifact = await generateReviewForNote(app, file, {
			relatedNotes: options.relatedNotes ?? [],
		});
		return { type: "artifact", artifact };
	}

	const transition = inferDeterministicTransition(candidate);
	if (transition) {
		await patchLearningFrontmatter(app, file, {
			...transition.patch,
			lastTouched: formatLearningDate(),
		});
		return {
			type: "transition",
			message: transition.message,
		};
	}

	return {
		type: "notice",
		message: `No runner implemented for action: ${candidate.action}`,
	};
}
