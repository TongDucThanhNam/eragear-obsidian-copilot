export type LearningStatus =
	| "seed"
	| "explain"
	| "visualize"
	| "connect"
	| "test"
	| "apply"
	| "review"
	| "done"
	| "mastered";

export type LearningNoteType =
	| "moc"
	| "concept"
	| "bridge"
	| "tool"
	| "case-study"
	| "project"
	| "question"
	| "source"
	| "adr";

export interface LearningNote {
	path: string;
	title: string;
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
	links: string[];
	backlinks: string[];
	graphScore?: number;
	finalScore?: number;
	missingFields: LearningField[];
}

export type LearningField = "type" | "area" | "status";

export interface LearningScanSummary {
	totalNotes: number;
	missingType: number;
	missingArea: number;
	missingStatus: number;
	weakNotes: number;
	missingArtifacts: number;
	dueReviews: number;
}

export interface LearningScanResult {
	notes: LearningNote[];
	weakNotes: LearningNote[];
	missingArtifacts: LearningNote[];
	dueReviews: LearningNote[];
	summary: LearningScanSummary;
	scannedAt: string;
}

export interface NextActionCandidate {
	note: LearningNote;
	action: string;
	reason: string[];
	expectedOutput?: string;
	suggestedAgent: "deterministic" | "reasoning-model" | "coding-agent";
	score: number;
}

export interface GeneratedArtifact {
	notePath: string;
	artifactPath: string;
	nextStatus?: LearningStatus;
}
