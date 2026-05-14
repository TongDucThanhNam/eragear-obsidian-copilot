import {
	LEARNING_FRONTMATTER_KEYS,
	LEARNING_NOTE_TYPES,
	LEARNING_STATUSES,
} from "@/learning/constants";
import type {
	LearningField,
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
