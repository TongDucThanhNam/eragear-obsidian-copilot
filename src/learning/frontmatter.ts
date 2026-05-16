import {
	LEARNING_FRONTMATTER_KEYS,
	LEARNING_NOTE_TYPES,
	LEARNING_STATUSES,
} from "@/learning/constants";
import type {
	LearningArtifacts,
	LearningDefinitionOfDone,
	LearningField,
	LearningMastery,
	LearningNoteType,
	LearningStatus,
} from "@/learning/types";

export interface LearningFrontmatter {
	type?: LearningNoteType;
	area?: string;
	status?: LearningStatus;
	maturity?: number;
	priority?: number;
	sprint?: string;
	nextAction?: string;
	artifactHtml?: string;
	quizScore?: number;
	reviewDue?: string;
	lastTouched?: string;
	prerequisites?: string[];
	unlocks?: string[];
	mastery?: LearningMastery;
	artifacts?: LearningArtifacts;
	dod?: LearningDefinitionOfDone;
}

export function parseLearningFrontmatter(
	frontmatter: Record<string, unknown> | undefined,
): LearningFrontmatter {
	if (!frontmatter) return {};

	return {
		type: parseNoteType(frontmatter[LEARNING_FRONTMATTER_KEYS.type]),
		area: parseString(frontmatter[LEARNING_FRONTMATTER_KEYS.area]),
		status: parseStatus(frontmatter[LEARNING_FRONTMATTER_KEYS.status]),
		maturity: parseNumber(frontmatter[LEARNING_FRONTMATTER_KEYS.maturity]),
		priority: parseNumber(frontmatter[LEARNING_FRONTMATTER_KEYS.priority]),
		sprint: parseString(frontmatter[LEARNING_FRONTMATTER_KEYS.sprint]),
		nextAction: parseString(frontmatter[LEARNING_FRONTMATTER_KEYS.nextAction]),
		artifactHtml: parseString(
			frontmatter[LEARNING_FRONTMATTER_KEYS.artifactHtml],
		),
		quizScore: parseNumber(frontmatter[LEARNING_FRONTMATTER_KEYS.quizScore]),
		reviewDue: parseString(frontmatter[LEARNING_FRONTMATTER_KEYS.reviewDue]),
		lastTouched: parseString(
			frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched],
		),
		prerequisites: parseStringList(frontmatter.prerequisites),
		unlocks: parseStringList(frontmatter.unlocks),
		mastery: parseMastery(frontmatter.mastery),
		artifacts: parseArtifacts(frontmatter.artifacts, {
			artifactHtml: parseString(frontmatter[LEARNING_FRONTMATTER_KEYS.artifactHtml]),
		}),
		dod: parseDefinitionOfDone(frontmatter.dod),
	};
}

export function hasLearningFrontmatter(
	frontmatter: Record<string, unknown> | undefined,
): boolean {
	if (!frontmatter) return false;
	return Object.values(LEARNING_FRONTMATTER_KEYS).some(
		(key) => frontmatter[key] !== undefined,
	);
}

export function detectMissingFields(
	frontmatter: LearningFrontmatter,
): LearningField[] {
	const missing: LearningField[] = [];
	if (!frontmatter.type) missing.push("type");
	if (!frontmatter.area) missing.push("area");
	if (!frontmatter.status) missing.push("status");
	return missing;
}

export function formatLearningDate(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

export function isReviewDue(reviewDue: string | undefined, today: string): boolean {
	if (!reviewDue) return false;
	return reviewDue <= today;
}

function parseString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function parseNumber(value: unknown): number | undefined {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value !== "string") return undefined;

	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function parseBoolean(value: unknown): boolean | undefined {
	if (typeof value === "boolean") return value;
	if (typeof value !== "string") return undefined;
	const raw = value.trim().toLowerCase();
	if (raw === "true") return true;
	if (raw === "false") return false;
	return undefined;
}

function parseStringList(value: unknown): string[] | undefined {
	if (Array.isArray(value)) {
		const parsed = value
			.map(parseString)
			.filter((item): item is string => item !== undefined);
		return parsed.length > 0 ? parsed : undefined;
	}
	if (typeof value !== "string") return undefined;
	const parsed = value
		.split(/[\n,]/)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
	return parsed.length > 0 ? parsed : undefined;
}

function parseRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function parseMastery(value: unknown): LearningMastery | undefined {
	const record = parseRecord(value);
	if (!record) return undefined;
	const mastery: LearningMastery = {
		recall_score: parseNumber(record.recall_score),
		mechanism_score: parseNumber(record.mechanism_score),
		transfer_score: parseNumber(record.transfer_score),
		application_score: parseNumber(record.application_score),
		last_examined: parseString(record.last_examined),
		evidence_notes: parseStringList(record.evidence_notes),
		weak_points: parseStringList(record.weak_points),
	};
	return hasDefinedValue(mastery) ? mastery : undefined;
}

function parseArtifacts(
	value: unknown,
	legacy: { artifactHtml?: string },
): LearningArtifacts | undefined {
	const record = parseRecord(value);
	const artifacts: LearningArtifacts = {};
	if (legacy.artifactHtml) {
		artifacts.html_explainer = { path: legacy.artifactHtml };
	}
	if (record) {
		for (const key of [
			"html_explainer",
			"quiz",
			"bridge_note",
			"case_study",
			"review",
		] as const) {
			const artifact = parseArtifactRecord(record[key]);
			if (artifact) artifacts[key] = artifact;
		}
	}
	return hasDefinedValue(artifacts) ? artifacts : undefined;
}

function parseArtifactRecord(value: unknown): LearningArtifacts["quiz"] {
	const record = parseRecord(value);
	if (!record) return undefined;
	const artifact = {
		path: parseString(record.path),
		quality_score: parseNumber(record.quality_score),
		quality_issues: parseStringList(record.quality_issues),
		reviewed: parseBoolean(record.reviewed),
		updated_at: parseString(record.updated_at),
	};
	return hasDefinedValue(artifact) ? artifact : undefined;
}

function parseDefinitionOfDone(
	value: unknown,
): LearningDefinitionOfDone | undefined {
	const record = parseRecord(value);
	if (!record) return undefined;
	const dod: LearningDefinitionOfDone = {
		evidence_notes: parseStringList(record.evidence_notes),
		explanation_reviewed: parseBoolean(record.explanation_reviewed),
		visualization_reviewed: parseBoolean(record.visualization_reviewed),
		connections_reviewed: parseBoolean(record.connections_reviewed),
		quiz_reviewed: parseBoolean(record.quiz_reviewed),
		application_reviewed: parseBoolean(record.application_reviewed),
		reviewed: parseBoolean(record.reviewed),
	};
	return hasDefinedValue(dod) ? dod : undefined;
}

function hasDefinedValue(value: Record<string, unknown>): boolean {
	return Object.values(value).some((item) => item !== undefined);
}

function parseStatus(value: unknown): LearningStatus | undefined {
	const raw = parseString(value);
	if (!raw) return undefined;
	return LEARNING_STATUSES.includes(raw as LearningStatus)
		? (raw as LearningStatus)
		: undefined;
}

function parseNoteType(value: unknown): LearningNoteType | undefined {
	const raw = parseString(value);
	if (!raw) return undefined;
	return LEARNING_NOTE_TYPES.includes(raw as LearningNoteType)
		? (raw as LearningNoteType)
		: undefined;
}
