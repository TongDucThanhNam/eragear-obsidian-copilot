import type { LearningFrontmatterPatch } from "@/learning/frontmatter-writer";
import type { LearningNote } from "@/learning/types";

export interface StarterLearningMetadataOptions {
	defaultArea?: string;
}

export function buildStarterLearningMetadataPatch(
	note: LearningNote,
	options: StarterLearningMetadataOptions = {},
): LearningFrontmatterPatch | null {
	const patch: LearningFrontmatterPatch = {};

	if (!note.type) {
		patch.type = "concept";
	}
	if (!note.area) {
		patch.area =
			normalizeArea(note.sprint) ??
			normalizeArea(options.defaultArea) ??
			inferAreaFromPath(note.path);
	}
	if (!note.status) {
		patch.status = "seed";
	}
	if (typeof note.maturity !== "number") {
		patch.maturity = 0;
	}

	return Object.keys(patch).length > 0 ? patch : null;
}

function inferAreaFromPath(path: string): string {
	const [folder] = path.split("/");
	return normalizeArea(folder) ?? "learning";
}

function normalizeArea(value: string | undefined): string | undefined {
	if (!value) return undefined;

	const normalized = value
		.trim()
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");

	return normalized.length > 0 ? normalized : undefined;
}
