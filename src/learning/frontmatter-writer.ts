import type { App, TFile } from "obsidian";
import { LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import type { LearningNoteType, LearningStatus } from "@/learning/types";

export interface LearningFrontmatterPatch {
	type?: LearningNoteType;
	area?: string;
	status?: LearningStatus;
	maturity?: number;
	priority?: number;
	sprint?: string;
	nextAction?: string;
	quizScore?: number;
	reviewDue?: string;
	lastTouched?: string;
}

export async function patchLearningFrontmatter(
	app: App,
	file: TFile,
	patch: LearningFrontmatterPatch,
): Promise<void> {
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		for (const [key, value] of Object.entries(patch)) {
			if (value !== undefined && value !== "") {
				frontmatter[toFrontmatterKey(key)] = value;
			}
		}
	});
}

function toFrontmatterKey(key: string): string {
	if (key in LEARNING_FRONTMATTER_KEYS) {
		return LEARNING_FRONTMATTER_KEYS[
			key as keyof typeof LEARNING_FRONTMATTER_KEYS
		];
	}
	return key;
}
