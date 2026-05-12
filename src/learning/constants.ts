import type { LearningStatus } from "@/learning/types";

export const LEARNING_FRONTMATTER_KEYS = {
	type: "type",
	area: "area",
	status: "status",
	maturity: "maturity",
	priority: "priority",
	sprint: "sprint",
	nextAction: "next_action",
	artifactHtml: "artifact_html",
	quizScore: "quiz_score",
	reviewDue: "review_due",
	lastTouched: "last_touched",
} as const;

export const LEARNING_STATUSES: readonly LearningStatus[] = [
	"seed",
	"explain",
	"visualize",
	"connect",
	"test",
	"apply",
	"review",
	"done",
	"mastered",
];

export const LEARNING_NOTE_TYPES = [
	"moc",
	"concept",
	"bridge",
	"tool",
	"case-study",
	"project",
	"question",
	"source",
	"adr",
] as const;

export const ARTIFACT_FOLDERS = {
	explainers: "_explainers",
	bridgeNotes: "03_Bridge_Notes",
	caseStudies: "05_Case_Studies",
	commandCenter: "00_Command_Center",
} as const;

export const ALLOWED_WRITE_ZONES = [
	ARTIFACT_FOLDERS.explainers,
	ARTIFACT_FOLDERS.bridgeNotes,
	ARTIFACT_FOLDERS.caseStudies,
	ARTIFACT_FOLDERS.commandCenter,
] as const;

export const STATUS_WEIGHT: Record<LearningStatus, number> = {
	seed: 90,
	explain: 82,
	visualize: 78,
	connect: 68,
	test: 72,
	apply: 62,
	review: 58,
	done: 18,
	mastered: 0,
};
