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

export type LearningArtifactType =
	| "html_explainer"
	| "quiz"
	| "bridge_note"
	| "case_study"
	| "review";

export interface LearningArtifactRecord {
	path?: string;
	quality_score?: number;
	quality_issues?: string[];
	reviewed?: boolean;
	updated_at?: string;
}

export interface LearningArtifacts {
	html_explainer?: LearningArtifactRecord;
	quiz?: LearningArtifactRecord;
	bridge_note?: LearningArtifactRecord;
	case_study?: LearningArtifactRecord;
	review?: LearningArtifactRecord;
}

export interface LearningMastery {
	recall_score?: number;
	mechanism_score?: number;
	transfer_score?: number;
	application_score?: number;
	last_examined?: string;
	evidence_notes?: string[];
	weak_points?: string[];
}

export interface LearningDefinitionOfDone {
	evidence_notes?: string[];
	explanation_reviewed?: boolean;
	visualization_reviewed?: boolean;
	connections_reviewed?: boolean;
	quiz_reviewed?: boolean;
	application_reviewed?: boolean;
	reviewed?: boolean;
}

export interface LearningDependencyLink {
	raw: string;
	path?: string;
	title: string;
	exists: boolean;
}

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
	prerequisites?: string[];
	unlocks?: string[];
	mastery?: LearningMastery;
	artifacts?: LearningArtifacts;
	dod?: LearningDefinitionOfDone;
	prerequisiteLinks?: LearningDependencyLink[];
	unlockLinks?: LearningDependencyLink[];
	blockers?: string[];
	unmetPrerequisites?: string[];
	unlockCount?: number;
	dependencyDepth?: number;
	circularDependency?: boolean;
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
	blockedNotes: number;
	masteryGaps: number;
	artifactQualityIssues: number;
}

export interface LearningScanResult {
	notes: LearningNote[];
	weakNotes: LearningNote[];
	missingArtifacts: LearningNote[];
	dueReviews: LearningNote[];
	blockedNotes: LearningNote[];
	masteryGaps: LearningNote[];
	artifactQualityIssues: LearningNote[];
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
