import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	IconBrain,
	IconCheckCircle,
	IconCode,
	IconFileText,
	IconList,
	IconMagic,
	IconPackage,
	IconRotate,
	IconTag,
} from "@/components/ui/Icons";
import type EragearPlugin from "@/main";
import type { LearningAcpRunEvent } from "@/main";
import type { AgentTaskStatus } from "@/agent/agent-task";
import type { LearningAgentTaskSummary } from "@/agent/task-store";
import type { AgentWriteProposalSummary } from "@/agent/write-proposal";
import { LEARNING_NOTE_TYPES, LEARNING_STATUSES } from "@/learning/constants";
import {
	canPromoteStatus,
	getPromotionBlockers,
} from "@/learning/definition-of-done";
import type { LearningFrontmatterPatch } from "@/learning/frontmatter-writer";
import { getNextLearningStatus } from "@/learning/learning-state";
import type {
	LearningNote,
	LearningNoteType,
	LearningScanResult,
	LearningStatus,
	NextActionCandidate,
} from "@/learning/types";
import "./CommandCenterView.css";

interface CommandCenterViewProps {
	plugin: EragearPlugin;
	mode?: CommandCenterMode;
}

export type CommandCenterMode =
	| "learning"
	| "inspector"
	| "examiner"
	| "artifacts";

export function CommandCenterView({
	plugin,
	mode = "learning",
}: CommandCenterViewProps) {
	const [scan, setScan] = useState<LearningScanResult>(() =>
		plugin.getLearningScan(),
	);
	const [queue, setQueue] = useState<NextActionCandidate[]>(() =>
		plugin.getLearningActionQueue(),
	);
	const [activeNote, setActiveNote] = useState<LearningNote | null>(() =>
		plugin.getActiveLearningNote(),
	);
	const [agentTasks, setAgentTasks] = useState<LearningAgentTaskSummary[]>(() =>
		plugin.getLearningAgentTasks(),
	);
	const [acpRunEvents, setAcpRunEvents] = useState<LearningAcpRunEvent[]>(() =>
		plugin.getLearningAcpRunEvents(),
	);
	const [writeProposals, setWriteProposals] = useState<
		AgentWriteProposalSummary[]
	>([]);
	const [busy, setBusy] = useState(false);
	const [metadataDraft, setMetadataDraft] = useState(() =>
		createMetadataDraft(queue[0]?.note ?? null),
	);
	const [activeDraft, setActiveDraft] = useState(() =>
		createMetadataDraft(activeNote),
	);
	const [quizScoreDraft, setQuizScoreDraft] = useState(() =>
		typeof activeNote?.quizScore === "number" ? String(activeNote.quizScore) : "",
	);

	const refreshWriteProposals = useCallback(async () => {
		setWriteProposals(await plugin.getAgentWriteProposals());
	}, [plugin]);

	const refresh = useCallback(() => {
		const nextScan = plugin.scanLearningNotes();
		setScan(nextScan);
		setQueue(plugin.getLearningActionQueue());
		setActiveNote(plugin.getActiveLearningNote());
		setAgentTasks(plugin.getLearningAgentTasks());
		setAcpRunEvents(plugin.getLearningAcpRunEvents());
		void refreshWriteProposals();
	}, [plugin, refreshWriteProposals]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	useEffect(() => plugin.subscribeLearningState(refresh), [plugin, refresh]);

	useEffect(() => {
		void refreshWriteProposals();
	}, [refreshWriteProposals]);

	useEffect(() => {
		const intervalId = window.setInterval(() => {
			setAgentTasks(plugin.getLearningAgentTasks());
			setAcpRunEvents(plugin.getLearningAcpRunEvents());
			void refreshWriteProposals();
		}, 3000);

		return () => window.clearInterval(intervalId);
	}, [plugin, refreshWriteProposals]);

	const nextAction = queue[0] ?? null;
	const aiAction =
		queue.find((candidate) => candidate.suggestedAgent !== "deterministic") ??
		null;
	const aiActionCount = queue.filter(
		(candidate) => candidate.suggestedAgent !== "deterministic",
	).length;
	const pendingProposals = writeProposals.filter(
		(proposal) => proposal.status === "pending",
	).length;
	const runningAcpTask =
		agentTasks.find(
			(task) =>
				task.status === "running" && task.suggestedAgent !== "deterministic",
		) ?? null;
	const blockedAcpTask =
		agentTasks.find(
			(task) =>
				task.status === "blocked" && task.suggestedAgent !== "deterministic",
		) ?? null;
	const runnableAgentTasks = agentTasks.filter(
		(task) =>
			(task.status === "queued" || task.status === "blocked") &&
			task.suggestedAgent !== "deterministic",
	).length;
	const acpWorkCount = aiActionCount + runnableAgentTasks;
	const activeSprint = plugin.settings.activeLearningSprint || "S01-Systems-Bridge";

	useEffect(() => {
		setMetadataDraft(createMetadataDraft(nextAction?.note ?? null));
	}, [nextAction?.note.path]);

	useEffect(() => {
		setActiveDraft(createMetadataDraft(activeNote));
		setQuizScoreDraft(
			typeof activeNote?.quizScore === "number" ? String(activeNote.quizScore) : "",
		);
	}, [activeNote?.path]);

	const runSuggestedAction = async () => {
		setBusy(true);
		try {
			await plugin.runNextLearningAction();
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const runQueuedAction = async (candidate: NextActionCandidate) => {
		setBusy(true);
		try {
			await plugin.runLearningActionCandidate(candidate);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const createAgentTask = async (candidate: NextActionCandidate) => {
		setBusy(true);
		try {
			await plugin.createLearningAgentTask(candidate);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const runWithAcp = async (candidate: NextActionCandidate) => {
		setBusy(true);
		try {
			const result = await plugin.createLearningAgentTask(candidate);
			if (result) {
				await plugin.runLearningAgentTask(result.taskPath);
			}
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const updateAgentTaskStatus = async (
		task: LearningAgentTaskSummary,
		status: AgentTaskStatus,
	) => {
		setBusy(true);
		try {
			await plugin.updateLearningAgentTaskStatus(task.path, status);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const runAgentTask = async (task: LearningAgentTaskSummary) => {
		setBusy(true);
		setAgentTasks((current) =>
			current.map((item) =>
				item.path === task.path ? { ...item, status: "running" } : item,
			),
		);
		try {
			await plugin.runLearningAgentTask(task.path);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const applyWriteProposal = async (proposal: AgentWriteProposalSummary) => {
		setBusy(true);
		try {
			await plugin.applyAgentWriteProposal(proposal);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const rejectWriteProposal = async (proposal: AgentWriteProposalSummary) => {
		setBusy(true);
		try {
			await plugin.rejectAgentWriteProposal(proposal);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const saveMetadata = async () => {
		if (!nextAction) return;
		setBusy(true);
		try {
			await plugin.patchLearningMetadataForNote(
				nextAction.note.path,
				draftToPatch(metadataDraft),
			);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const saveActiveMetadata = async () => {
		if (!activeNote) return;
		setBusy(true);
		try {
			await plugin.patchLearningMetadataForActiveNote(draftToPatch(activeDraft));
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const patchActiveProgress = async (patch: LearningFrontmatterPatch) => {
		if (!activeNote) return;
		setBusy(true);
		try {
			await plugin.patchLearningMetadataForActiveNote(patch);
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const recordQuizScore = async () => {
		const quizScore = toOptionalNumber(quizScoreDraft);
		if (quizScore === undefined) return;
		await patchActiveProgress({
			quizScore,
			status: quizScore >= 7 ? "apply" : "explain",
			maturity: clampMaturity((activeNote?.maturity ?? 0) + (quizScore >= 7 ? 1 : 0)),
		});
	};

	const generateExaminer = async () => {
		setBusy(true);
		try {
			await plugin.generateExaminerForActiveNote();
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const modeMeta = getModeMeta(mode);

	return (
		<div className="eragear-learning-center">
			<header className="eragear-learning-header">
				<div>
					<h2>{modeMeta.title}</h2>
					<p role="status" aria-live="polite">
						{modeMeta.subtitle} · Sprint: {activeSprint} · {formatDisplayDate()} ·{" "}
						{scan.summary.totalNotes} notes · {queue.length} actions
					</p>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={refresh}
					aria-label="Scan learning notes"
				>
					<IconRotate />
					<span>Scan</span>
				</Button>
			</header>

			{mode === "learning" ? (
				<>
					<section className="eragear-learning-os-grid" aria-label="Learning OS">
						<TodayFocusPanel
							nextAction={nextAction}
							plugin={plugin}
							metadataDraft={metadataDraft}
							onMetadataDraftChange={setMetadataDraft}
							onSaveMetadata={saveMetadata}
							onRunSuggestedAction={runSuggestedAction}
							onRunWithAcp={runWithAcp}
							onCreateAgentTask={createAgentTask}
							busy={busy}
						/>
						<ActiveConceptPanel
							compact
							activeNote={activeNote}
							plugin={plugin}
							activeDraft={activeDraft}
							onActiveDraftChange={setActiveDraft}
							onSaveActiveMetadata={saveActiveMetadata}
							quizScoreDraft={quizScoreDraft}
							onQuizScoreDraftChange={setQuizScoreDraft}
							onRecordQuizScore={recordQuizScore}
							onPatchActiveProgress={patchActiveProgress}
							onGenerateExaminer={generateExaminer}
							busy={busy}
						/>
					</section>

					<ActionQueuePanel
						queue={queue}
						plugin={plugin}
						onRunAction={runQueuedAction}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						disabled={busy}
					/>

					<AcpLanePanel
						aiAction={aiAction}
						plugin={plugin}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						onRunAgentTask={runAgentTask}
						runningTask={runningAcpTask}
						blockedTask={blockedAcpTask}
						events={acpRunEvents}
						pendingProposalCount={pendingProposals}
						disabled={busy}
					/>

					<WriteProposalsPanel
						proposals={writeProposals}
						plugin={plugin}
						onApply={applyWriteProposal}
						onReject={rejectWriteProposal}
						disabled={busy}
						hideWhenEmpty
					/>

					<section className="eragear-learning-secondary-grid" aria-label="Learning overview">
						<LearningSummary scan={scan} acpWorkCount={acpWorkCount} />
						<SkillMapPanel notes={scan.notes} />
					</section>
				</>
			) : null}

			{mode === "inspector" ? (
				<section className="eragear-focused-mode" aria-label="Concept inspector">
					<ActiveConceptPanel
						activeNote={activeNote}
						plugin={plugin}
						activeDraft={activeDraft}
						onActiveDraftChange={setActiveDraft}
						onSaveActiveMetadata={saveActiveMetadata}
						quizScoreDraft={quizScoreDraft}
						onQuizScoreDraftChange={setQuizScoreDraft}
						onRecordQuizScore={recordQuizScore}
						onPatchActiveProgress={patchActiveProgress}
						onGenerateExaminer={generateExaminer}
						busy={busy}
					/>
					<ActionQueuePanel
						queue={queue}
						plugin={plugin}
						onRunAction={runQueuedAction}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						disabled={busy}
					/>
				</section>
			) : null}

			{mode === "examiner" ? (
				<section className="eragear-focused-mode" aria-label="Examiner mode">
					<ExaminerPanel
						note={activeNote ?? nextAction?.note ?? null}
						nextAction={nextAction}
						onGenerateExaminer={generateExaminer}
						onRunSuggestedAction={runSuggestedAction}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						disabled={busy}
					/>
					<LearningSessionPanel
						note={activeNote ?? nextAction?.note ?? null}
						nextAction={nextAction}
						onRunSuggestedAction={runSuggestedAction}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						onGenerateExaminer={generateExaminer}
						disabled={busy}
					/>
				</section>
			) : null}

			{mode === "artifacts" ? (
				<section className="eragear-focused-mode" aria-label="Artifact review">
					<AcpLanePanel
						aiAction={aiAction}
						plugin={plugin}
						onRunWithAcp={runWithAcp}
						onCreateAgentTask={createAgentTask}
						onRunAgentTask={runAgentTask}
						runningTask={runningAcpTask}
						blockedTask={blockedAcpTask}
						events={acpRunEvents}
						pendingProposalCount={pendingProposals}
						disabled={busy}
					/>

					<AgentTasksPanel
						tasks={agentTasks}
						plugin={plugin}
						onRun={runAgentTask}
						onStatusChange={updateAgentTaskStatus}
						disabled={busy}
					/>

					<WriteProposalsPanel
						proposals={writeProposals}
						plugin={plugin}
						onApply={applyWriteProposal}
						onReject={rejectWriteProposal}
						disabled={busy}
					/>
				</section>
			) : null}
		</div>
	);
}

function getModeMeta(mode: CommandCenterMode): { title: string; subtitle: string } {
	switch (mode) {
		case "inspector":
			return {
				title: "Concept Inspector",
				subtitle: "Current note state, blockers, and evidence",
			};
		case "examiner":
			return {
				title: "Examiner Mode",
				subtitle: "Test understanding before promotion",
			};
		case "artifacts":
			return {
				title: "Artifact Review",
				subtitle: "Staged ACP proposals and validation",
			};
		case "learning":
			return {
				title: "Eragear Learning OS",
				subtitle: "Today focus and next action queue",
			};
	}
}

function LearningSummary({
	scan,
	acpWorkCount,
}: {
	scan: LearningScanResult;
	acpWorkCount: number;
}) {
	return (
		<section className="eragear-learning-summary" aria-label="Learning summary">
			<Metric label="Weak" value={scan.summary.weakNotes} />
			<Metric label="Type" value={scan.summary.missingType} />
			<Metric label="Area" value={scan.summary.missingArea} />
			<Metric label="Status" value={scan.summary.missingStatus} />
			<Metric label="Artifacts" value={scan.summary.missingArtifacts} />
			<Metric label="Reviews" value={scan.summary.dueReviews} />
			<Metric label="Blocked" value={scan.summary.blockedNotes} />
			<Metric label="Mastery gaps" value={scan.summary.masteryGaps} />
			<Metric label="ACP" value={acpWorkCount} />
		</section>
	);
}

const AGENT_TASK_STATUS_OPTIONS: readonly AgentTaskStatus[] = [
	"queued",
	"running",
	"proposed",
	"blocked",
	"done",
];

const SKILL_AREAS = [
	{
		label: "Systems internals",
		terms: ["systems", "memory", "runtime", "thread", "process", "syscall"],
	},
	{
		label: "Data systems",
		terms: ["data", "database", "postgres", "index", "storage", "query"],
	},
	{
		label: "Runtime / backend",
		terms: ["backend", "runtime", "api", "request", "async", "serialization"],
	},
	{
		label: "Production debugging",
		terms: ["debug", "production", "observability", "logs", "metrics", "trace"],
	},
	{
		label: "Distributed systems",
		terms: ["distributed", "replication", "consensus", "partition", "queue"],
	},
	{
		label: "AI engineering",
		terms: ["ai", "llm", "rag", "agent", "retrieval", "evaluation"],
	},
] as const;

function SkillMapPanel({ notes }: { notes: LearningNote[] }) {
	const rows = SKILL_AREAS.map((area) => {
		const matchingNotes = notes.filter((note) => matchesSkillArea(note, area.terms));
		const progress = computeAreaProgress(matchingNotes);
		return {
			...area,
			count: matchingNotes.length,
			progress,
			weak: matchingNotes.filter((note) => isWeakForSkillMap(note)).length,
		};
	});
	const weakest = rows
		.filter((row) => row.count > 0)
		.sort((a, b) => a.progress - b.progress)[0];

	return (
		<section className="eragear-learning-panel eragear-skill-map-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Skill map</h3>
					<p>Where your SWE foundation is strong or thin.</p>
				</div>
				<IconBrain />
			</div>
			<div className="eragear-skill-map-list">
				{rows.map((row) => (
					<div className="eragear-skill-row" key={row.label}>
						<div className="eragear-skill-row-header">
							<span>{row.label}</span>
							<strong>{row.progress}%</strong>
						</div>
						<div
							className="eragear-progress-bar"
							aria-label={`${row.label} ${row.progress}%`}
						>
							<span className={`eragear-progress-fill-${progressBucket(row.progress)}`} />
						</div>
						<p>
							{row.count} notes · {row.weak} weak
						</p>
					</div>
				))}
			</div>
			<div className="eragear-diagnosis-box">
				<strong>Diagnosis</strong>
				<p>
					{weakest
						? `${weakest.label} is the weakest mapped area. Use the queue to clear blockers before adding new notes.`
						: "Add learning metadata to notes to build the skill map."}
				</p>
			</div>
		</section>
	);
}

function TodayFocusPanel({
	nextAction,
	plugin,
	metadataDraft,
	onMetadataDraftChange,
	onSaveMetadata,
	onRunSuggestedAction,
	onRunWithAcp,
	onCreateAgentTask,
	busy,
}: {
	nextAction: NextActionCandidate | null;
	plugin: EragearPlugin;
	metadataDraft: MetadataDraft;
	onMetadataDraftChange: (draft: MetadataDraft) => void;
	onSaveMetadata: () => void;
	onRunSuggestedAction: () => void;
	onRunWithAcp: (candidate: NextActionCandidate) => void;
	onCreateAgentTask: (candidate: NextActionCandidate) => void;
	busy: boolean;
}) {
	const usesAcp = nextAction?.suggestedAgent !== "deterministic";
	const outputBullets = nextAction ? getExpectedOutputBullets(nextAction) : [];
	const blockers = nextAction ? getActionBlockers(nextAction.note) : [];

	return (
		<section className="eragear-next-action-hero eragear-today-focus-panel">
			<div className="eragear-learning-eyebrow">
				<IconBrain />
				<span>Today focus</span>
			</div>
			{nextAction ? (
				<div className="eragear-next-action">
					<div className="eragear-next-action-title-row">
						<div>
							<span className="eragear-action-kicker">Do this now</span>
							<h3>{nextAction.action}</h3>
							<button
								type="button"
								className="eragear-learning-link eragear-focus-note-link"
								onClick={() => openNote(plugin, nextAction.note)}
							>
								{nextAction.note.title}
							</button>
						</div>
						<StatusChip>{shortAgentLabel(nextAction.suggestedAgent)}</StatusChip>
					</div>
					<div className="eragear-next-action-meta">
						<StatusChip>score {Math.round(nextAction.score)}</StatusChip>
						<StatusChip>{nextAction.note.status ?? "missing status"}</StatusChip>
						{nextAction.note.area ? (
							<StatusChip>{nextAction.note.area}</StatusChip>
						) : null}
					</div>
					<div className="eragear-focus-detail-grid">
						<div className="eragear-output-box">
							<strong>Why this matters</strong>
							<ul>
								{nextAction.reason.slice(0, 5).map((reason) => (
									<li key={reason}>{reason}</li>
								))}
							</ul>
						</div>
						{blockers.length > 0 ? (
							<div className="eragear-dod-gate">
								<strong>Blocked by</strong>
								<ul>
									{blockers.slice(0, 4).map((blocker) => (
										<li key={blocker}>{blocker}</li>
									))}
								</ul>
							</div>
						) : null}
						<div className="eragear-output-box">
							<strong>Expected output</strong>
							<ul>
								{outputBullets.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
					</div>
					<div className="eragear-primary-action-row">
						{usesAcp ? (
							<Button
								type="button"
								onClick={() => onRunWithAcp(nextAction)}
								disabled={busy}
								variant="secondary"
								size="lg"
								className="eragear-primary-action-button"
							>
								<IconCode />
								<span>Start agent run</span>
							</Button>
						) : (
							<Button
								type="button"
								onClick={onRunSuggestedAction}
								disabled={busy}
								variant="secondary"
								size="lg"
								className="eragear-primary-action-button"
							>
								<IconMagic />
								<span>Generate scaffold</span>
							</Button>
						)}
						{usesAcp ? (
							<Button
								type="button"
								onClick={() => onCreateAgentTask(nextAction)}
								disabled={busy}
								variant="outline"
								size="lg"
							>
								<IconFileText />
								<span>Save as task</span>
							</Button>
						) : null}
						{usesAcp ? (
							<Button
								type="button"
								onClick={onRunSuggestedAction}
								disabled={busy}
								variant="outline"
								size="lg"
							>
								<IconMagic />
								<span>Use local generator</span>
							</Button>
						) : null}
					</div>
					{nextAction.note.missingFields.length > 0 ? (
						<div className="eragear-inline-fix">
							<div className="eragear-learning-eyebrow">
								<IconTag />
								<span>Metadata fix</span>
							</div>
							<MetadataFixer
								draft={metadataDraft}
								onDraftChange={onMetadataDraftChange}
								onSave={onSaveMetadata}
								disabled={busy}
								submitLabel="Add missing metadata"
							/>
						</div>
					) : null}
				</div>
			) : (
				<div className="eragear-empty-state">
					<IconCheckCircle />
					<p>No learning action found.</p>
				</div>
			)}
		</section>
	);
}

function ActiveConceptPanel({
	compact = false,
	activeNote,
	plugin,
	activeDraft,
	onActiveDraftChange,
	onSaveActiveMetadata,
	quizScoreDraft,
	onQuizScoreDraftChange,
	onRecordQuizScore,
	onPatchActiveProgress,
	onGenerateExaminer,
	busy,
}: {
	compact?: boolean;
	activeNote: LearningNote | null;
	plugin: EragearPlugin;
	activeDraft: MetadataDraft;
	onActiveDraftChange: (draft: MetadataDraft) => void;
	onSaveActiveMetadata: () => void;
	quizScoreDraft: string;
	onQuizScoreDraftChange: (value: string) => void;
	onRecordQuizScore: () => void;
	onPatchActiveProgress: (patch: LearningFrontmatterPatch) => void;
	onGenerateExaminer: () => void;
	busy: boolean;
}) {
	return (
		<section className="eragear-learning-panel eragear-active-concept-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Active concept</h3>
					<p>What you understand, what is missing, and what can move.</p>
				</div>
				<IconFileText />
			</div>

			{activeNote ? (
				<div className="eragear-next-action">
					<button
						type="button"
						className="eragear-learning-link eragear-active-title"
						onClick={() => openNote(plugin, activeNote)}
					>
						{activeNote.title}
					</button>
					<div className="eragear-next-action-meta">
						<StatusChip>{activeNote.area ?? "missing area"}</StatusChip>
						<StatusChip>{activeNote.status ?? "missing status"}</StatusChip>
						<StatusChip>maturity {activeNote.maturity ?? 0}/5</StatusChip>
					</div>
					<StatusStepper status={activeNote.status} />
					<div className="eragear-session-diagnosis">
						<strong>{getCurrentStateHeadline(activeNote)}</strong>
						<p>{getSessionDiagnosis(activeNote)}</p>
					</div>
					<ConceptReadiness note={activeNote} limit={compact ? 3 : 7} />
					{compact ? (
						<div className="eragear-row-actions">
							<Button
								type="button"
								variant="outline"
								onClick={onGenerateExaminer}
								disabled={busy}
								size="sm"
							>
								<IconMagic />
								<span>Run examiner</span>
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => openNote(plugin, activeNote)}
								size="sm"
							>
								<IconFileText />
								<span>Open note</span>
							</Button>
						</div>
					) : (
						<>
							<MetadataFixer
								draft={activeDraft}
								onDraftChange={onActiveDraftChange}
								onSave={onSaveActiveMetadata}
								disabled={busy}
								submitLabel="Save active note metadata"
							/>
							<ProgressControls
								note={activeNote}
								quizScoreDraft={quizScoreDraft}
								onQuizScoreDraftChange={onQuizScoreDraftChange}
								onRecordQuizScore={onRecordQuizScore}
								onPatch={onPatchActiveProgress}
								onGenerateExaminer={onGenerateExaminer}
								disabled={busy}
							/>
							<EvidencePanel note={activeNote} />
						</>
					)}
				</div>
			) : (
				<p>Open a learning note to inspect the current concept.</p>
			)}
		</section>
	);
}

function ConceptReadiness({
	note,
	limit = 7,
}: {
	note: LearningNote;
	limit?: number;
}) {
	const missing = getMissingKnowledge(note);
	return (
		<div className="eragear-concept-readiness">
			<strong>Missing knowledge</strong>
			{missing.length > 0 ? (
				<ul>
					{missing.slice(0, limit).map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : (
				<p>No current blockers recorded.</p>
			)}
		</div>
	);
}

function AcpLanePanel({
	aiAction,
	plugin,
	onRunWithAcp,
	onCreateAgentTask,
	onRunAgentTask,
	runningTask,
	blockedTask,
	events,
	pendingProposalCount,
	disabled,
}: {
	aiAction: NextActionCandidate | null;
	plugin: EragearPlugin;
	onRunWithAcp: (candidate: NextActionCandidate) => void;
	onCreateAgentTask: (candidate: NextActionCandidate) => void;
	onRunAgentTask: (task: LearningAgentTaskSummary) => void;
	runningTask: LearningAgentTaskSummary | null;
	blockedTask: LearningAgentTaskSummary | null;
	events: LearningAcpRunEvent[];
	pendingProposalCount: number;
	disabled: boolean;
}) {
	const canStartAcp = !disabled && !runningTask;

	return (
		<section className="eragear-learning-panel eragear-acp-lane">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>AI / ACP lane</h3>
					<p>Model-backed learning work through the local ACP adapter.</p>
				</div>
				<IconCode />
			</div>
			{runningTask ? (
				<div
					className="eragear-acp-runtime-state"
					role="status"
					aria-live="polite"
				>
					<div className="eragear-action-row-chips">
						<StatusChip>running</StatusChip>
						<StatusChip>{agentTaskLabel(runningTask.suggestedAgent)}</StatusChip>
					</div>
					<strong>{runningTask.action}</strong>
					<button
						type="button"
						className="eragear-learning-link"
						onClick={() => openPath(plugin, runningTask.path)}
					>
						{runningTask.title}
					</button>
					<p>Waiting for ACP to write a proposal JSON.</p>
				</div>
			) : null}
			{!runningTask && pendingProposalCount > 0 ? (
				<div
					className="eragear-acp-runtime-state"
					role="status"
					aria-live="polite"
				>
					<div className="eragear-action-row-chips">
						<StatusChip>{pendingProposalCount} pending proposal</StatusChip>
						<StatusChip>review required</StatusChip>
					</div>
					<strong>ACP output is ready</strong>
					<p>Review the staged write proposal before applying it.</p>
				</div>
			) : null}
			{!runningTask && pendingProposalCount === 0 && blockedTask ? (
				<div
					className="eragear-acp-runtime-state"
					role="status"
					aria-live="polite"
				>
					<div className="eragear-action-row-chips">
						<StatusChip>blocked</StatusChip>
						<StatusChip>{agentTaskLabel(blockedTask.suggestedAgent)}</StatusChip>
					</div>
					<strong>Last ACP run produced no proposal</strong>
					<button
						type="button"
						className="eragear-learning-link"
						onClick={() => openPath(plugin, blockedTask.path)}
					>
						{blockedTask.title}
					</button>
					<p>The bounded runner now uses a compact excerpt and blocks large source reads.</p>
					<Button
						type="button"
						variant="outline"
						onClick={() => onRunAgentTask(blockedTask)}
						disabled={disabled}
						size="sm"
					>
						<IconCode />
						<span>Run blocked task again</span>
					</Button>
				</div>
			) : null}
			<AcpRuntimeEventList events={events} plugin={plugin} />
			{aiAction ? (
				<div className="eragear-action-row-main">
					<div>
						<div className="eragear-learning-eyebrow">
							<IconBrain />
							<span>Next AI action</span>
						</div>
						<strong>{aiAction.action}</strong>
						<button
							type="button"
							className="eragear-learning-link"
							onClick={() => openNote(plugin, aiAction.note)}
						>
							{aiAction.note.title}
						</button>
						{aiAction.expectedOutput ? <p>{aiAction.expectedOutput}</p> : null}
					</div>
					<div className="eragear-acp-lane-actions">
						<StatusChip>{agentLabel(aiAction.suggestedAgent)}</StatusChip>
						<Button
							type="button"
							variant="secondary"
							onClick={() => onRunWithAcp(aiAction)}
							disabled={!canStartAcp}
							size="sm"
						>
							<IconCode />
							<span>Run with ACP</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onCreateAgentTask(aiAction)}
							disabled={!canStartAcp}
							size="sm"
						>
							<span>Create ACP task</span>
						</Button>
					</div>
				</div>
			) : (
				<p>Finish local metadata actions to unlock AI-backed learning work.</p>
			)}
		</section>
	);
}

function AcpRuntimeEventList({
	events,
	plugin,
}: {
	events: LearningAcpRunEvent[];
	plugin: EragearPlugin;
}) {
	const visibleEvents = events.slice(-8).reverse();
	if (visibleEvents.length === 0) return null;

	return (
		<div className="eragear-acp-event-stream" role="status" aria-live="polite">
			<div className="eragear-acp-event-stream-header">
				<strong>Runtime state</strong>
				<span>{visibleEvents.length} latest events</span>
			</div>
			<ol className="eragear-acp-event-list">
				{visibleEvents.map((event) => (
					<li key={event.id} data-severity={event.severity ?? "info"}>
						<div className="eragear-acp-event-main">
							<div>
								<span className="eragear-acp-event-time">
									{formatRuntimeEventTime(event.createdAt)}
								</span>
								<strong>{event.message}</strong>
								<span>{event.taskTitle}</span>
							</div>
							<div className="eragear-action-row-chips">
								{event.status ? <StatusChip>{event.status}</StatusChip> : null}
								{event.proposalCount !== undefined ? (
									<StatusChip>{event.proposalCount} proposal</StatusChip>
								) : null}
								{event.stopReason ? (
									<StatusChip>{event.stopReason}</StatusChip>
								) : null}
								{event.chars !== undefined ? (
									<StatusChip>{event.chars} chars</StatusChip>
								) : null}
							</div>
						</div>
						{event.path ? (
							<button
								type="button"
								className="eragear-learning-link eragear-learning-path-link"
								onClick={() => openPath(plugin, event.path ?? "")}
							>
								{event.path}
							</button>
						) : null}
						{event.detail || event.outcome ? (
							<p>{[event.detail, event.outcome].filter(Boolean).join(" · ")}</p>
						) : null}
					</li>
				))}
			</ol>
		</div>
	);
}

function ProgressControls({
	note,
	quizScoreDraft,
	onQuizScoreDraftChange,
	onRecordQuizScore,
	onPatch,
	onGenerateExaminer,
	disabled,
}: {
	note: LearningNote;
	quizScoreDraft: string;
	onQuizScoreDraftChange: (value: string) => void;
	onRecordQuizScore: () => void;
	onPatch: (patch: LearningFrontmatterPatch) => void;
	onGenerateExaminer: () => void;
	disabled: boolean;
}) {
	const nextStatus = note.status ? getNextLearningStatus(note.status) : null;
	const nextMaturity = clampMaturity((note.maturity ?? 0) + 1);
	const nextStatusBlockers = nextStatus
		? getPromotionBlockers(note, nextStatus)
		: [];
	const canMoveNext = Boolean(nextStatus) && nextStatusBlockers.length === 0;
	const canMarkMastered =
		note.status === "done" && canPromoteStatus(note, "mastered");
	const masteredBlockers =
		note.status === "done" ? getPromotionBlockers(note, "mastered") : [];

	return (
		<div className="eragear-progress-controls">
			<div className="eragear-progress-controls-header">
				<strong>Learning progress</strong>
				<span>
					{note.status ?? "missing status"} · maturity {note.maturity ?? 0}
				</span>
			</div>

			<div className="eragear-progress-quiz">
				<label>
					<span>Quiz score</span>
					<input
						type="number"
						min="0"
						max="10"
						value={quizScoreDraft}
						onChange={(event) => onQuizScoreDraftChange(event.target.value)}
					/>
				</label>
				<Button
					type="button"
					variant="outline"
					onClick={onRecordQuizScore}
					disabled={disabled || quizScoreDraft.trim() === ""}
				>
					<span>Record quiz result</span>
				</Button>
			</div>

			<DefinitionOfDoneGate
				targetStatus={nextStatus}
				blockers={nextStatusBlockers}
			/>

			<div className="eragear-progress-actions">
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						onPatch({
							status: "review",
							reviewDue: addDays(formatLocalDate(), 7),
						})
					}
					disabled={disabled}
				>
					<span>Schedule review</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={onGenerateExaminer}
					disabled={disabled}
				>
					<IconMagic />
					<span>Run examiner</span>
				</Button>
				<Button
					type="button"
					variant="outline"
					onClick={() =>
						onPatch({
							status: nextStatus ?? note.status,
							maturity: nextMaturity,
						})
					}
					disabled={disabled || !canMoveNext}
				>
					<span>{nextStatus ? `Move to ${nextStatus}` : "No next stage"}</span>
				</Button>
				<Button
					type="button"
					variant="secondary"
					onClick={() =>
						onPatch({
							status: "mastered",
							maturity: 5,
						})
					}
					disabled={disabled || !canMarkMastered}
				>
					<span>Promote to mastered</span>
				</Button>
			</div>
			{note.status === "done" && masteredBlockers.length > 0 ? (
				<DefinitionOfDoneGate
					targetStatus="mastered"
					blockers={masteredBlockers}
				/>
			) : null}
		</div>
	);
}

function DefinitionOfDoneGate({
	targetStatus,
	blockers,
}: {
	targetStatus: LearningStatus | null;
	blockers: string[];
}) {
	if (!targetStatus) return null;

	return (
		<div className="eragear-dod-gate">
			<strong>Definition of Done gate</strong>
			{blockers.length > 0 ? (
				<>
					<p>Status cannot move to {targetStatus} yet.</p>
					<ul>
						{blockers.slice(0, 5).map((blocker) => (
							<li key={blocker}>{blocker}</li>
						))}
					</ul>
				</>
			) : (
				<p>Evidence gate passed for {targetStatus}.</p>
			)}
		</div>
	);
}

function EvidencePanel({ note }: { note: LearningNote }) {
	const blockers = note.blockers ?? [];
	const weakPoints = note.mastery?.weak_points ?? [];
	const prerequisites = note.prerequisites ?? [];
	const unlocks = note.unlocks ?? [];
	const artifacts = Object.entries(note.artifacts ?? {});

	return (
		<div className="eragear-evidence-panel">
			<EvidenceGroup title="DoD blockers" items={blockers} empty="No blockers." />
			<EvidenceGroup
				title="Artifact quality"
				items={artifacts.map(
					([type, artifact]) =>
						`${type}: ${artifact.quality_score ?? "unscored"}${
							artifact.path ? ` · ${artifact.path}` : ""
						}`,
				)}
				empty="No artifact evidence."
			/>
			<EvidenceGroup
				title="Mastery evidence"
				items={[
					`recall ${note.mastery?.recall_score ?? 0}`,
					`mechanism ${note.mastery?.mechanism_score ?? 0}`,
					`transfer ${note.mastery?.transfer_score ?? 0}`,
					`application ${note.mastery?.application_score ?? 0}`,
				]}
				empty="No mastery evidence."
			/>
			<EvidenceGroup title="Weak points" items={weakPoints} empty="No weak points." />
			<EvidenceGroup
				title="Prerequisites"
				items={prerequisites}
				empty="No prerequisites."
			/>
			<EvidenceGroup title="Unlocks" items={unlocks} empty="No unlocks." />
		</div>
	);
}

function EvidenceGroup({
	title,
	items,
	empty,
}: {
	title: string;
	items: string[];
	empty: string;
}) {
	return (
		<div className="eragear-evidence-group">
			<strong>{title}</strong>
			{items.length > 0 ? (
				<ul>
					{items.slice(0, 4).map((item) => (
						<li key={item}>{item}</li>
					))}
				</ul>
			) : (
				<p>{empty}</p>
			)}
		</div>
	);
}

function ExaminerPanel({
	note,
	nextAction,
	onGenerateExaminer,
	onRunSuggestedAction,
	onRunWithAcp,
	onCreateAgentTask,
	disabled,
}: {
	note: LearningNote | null;
	nextAction: NextActionCandidate | null;
	onGenerateExaminer: () => void;
	onRunSuggestedAction: () => void;
	onRunWithAcp: (candidate: NextActionCandidate) => void;
	onCreateAgentTask: (candidate: NextActionCandidate) => void;
	disabled: boolean;
}) {
	const rubric = note ? getExaminerRubric(note) : [];

	return (
		<section className="eragear-learning-panel eragear-examiner-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Examiner mode</h3>
					<p>Score understanding before the concept can move forward.</p>
				</div>
				<IconMagic />
			</div>
			{note ? (
				<div className="eragear-examiner-layout">
					<div className="eragear-session-main">
						<div className="eragear-session-diagnosis">
							<strong>Concept: {note.title}</strong>
							<p>{getSessionDiagnosis(note)}</p>
						</div>
						<div className="eragear-output-box">
							<strong>Question focus</strong>
							<p>{getExaminerQuestion(note)}</p>
						</div>
						<div className="eragear-output-box">
							<strong>Rubric</strong>
							<ul>
								{rubric.map((item) => (
									<li key={item}>{item}</li>
								))}
							</ul>
						</div>
					</div>
					<div className="eragear-session-actions">
						<Button
							type="button"
							variant="secondary"
							onClick={onGenerateExaminer}
							disabled={disabled}
							size="sm"
						>
							<IconMagic />
							<span>Generate examiner</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onRunSuggestedAction}
							disabled={disabled || !nextAction}
							size="sm"
						>
							<span>Run next fix</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => nextAction && onCreateAgentTask(nextAction)}
							disabled={
								disabled ||
								!nextAction ||
								nextAction.suggestedAgent === "deterministic"
							}
							size="sm"
						>
							<span>Create ACP task</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => nextAction && onRunWithAcp(nextAction)}
							disabled={
								disabled ||
								!nextAction ||
								nextAction.suggestedAgent === "deterministic"
							}
							size="sm"
						>
							<span>Run ACP fill</span>
						</Button>
					</div>
				</div>
			) : (
				<p>Open a learning note to generate an examiner artifact.</p>
			)}
		</section>
	);
}

function LearningSessionPanel({
	note,
	nextAction,
	onRunSuggestedAction,
	onRunWithAcp,
	onCreateAgentTask,
	onGenerateExaminer,
	disabled,
}: {
	note: LearningNote | null;
	nextAction: NextActionCandidate | null;
	onRunSuggestedAction: () => void;
	onRunWithAcp: (candidate: NextActionCandidate) => void;
	onCreateAgentTask: (candidate: NextActionCandidate) => void;
	onGenerateExaminer: () => void;
	disabled: boolean;
}) {
	return (
		<section className="eragear-learning-panel eragear-session-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Learning session</h3>
					<p>Explain, visualize, connect, test, apply, then review.</p>
				</div>
				<IconMagic />
			</div>
			{note ? (
				<div className="eragear-session-layout">
					<div className="eragear-session-main">
						<StatusStepper status={note.status} />
						<div className="eragear-session-diagnosis">
							<strong>{note.title}</strong>
							<p>{getSessionDiagnosis(note)}</p>
						</div>
						<div className="eragear-output-box">
							<strong>Required fix</strong>
							<ul>
								{getMissingKnowledge(note)
									.slice(0, 4)
									.map((item) => (
										<li key={item}>{item}</li>
									))}
							</ul>
						</div>
					</div>
					<div className="eragear-session-actions">
						<Button
							type="button"
							variant="outline"
							onClick={onRunSuggestedAction}
							disabled={disabled || !nextAction}
							size="sm"
						>
							<span>Start 25-min session</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={onRunSuggestedAction}
							disabled={disabled || !nextAction}
							size="sm"
						>
							<span>Generate scaffold</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => nextAction && onCreateAgentTask(nextAction)}
							disabled={
								disabled ||
								!nextAction ||
								nextAction.suggestedAgent === "deterministic"
							}
							size="sm"
						>
							<span>Create ACP task</span>
						</Button>
						<Button
							type="button"
							variant="secondary"
							onClick={onGenerateExaminer}
							disabled={disabled}
							size="sm"
						>
							<span>Run examiner</span>
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => nextAction && onRunWithAcp(nextAction)}
							disabled={
								disabled ||
								!nextAction ||
								nextAction.suggestedAgent === "deterministic"
							}
							size="sm"
						>
							<span>Run ACP fill</span>
						</Button>
					</div>
				</div>
			) : (
				<p>Open a learning note or add one to the queue to start a session.</p>
			)}
		</section>
	);
}

function StatusStepper({ status }: { status?: LearningStatus }) {
	const activeIndex = status ? LEARNING_STATUSES.indexOf(status) : -1;
	const safeIndex = activeIndex >= 0 ? activeIndex : 0;
	const progressBucketValue =
		activeIndex >= 0
			? Math.round(((safeIndex + 1) / LEARNING_STATUSES.length) * 10)
			: 0;
	const nextStatus = status ? getNextLearningStatus(status) : null;

	return (
		<div className="eragear-status-rail" aria-label="Learning status">
			<div className="eragear-status-rail-header">
				<strong>{status ?? "missing status"}</strong>
				<span>
					{nextStatus ? `Next: ${nextStatus}` : "Final stage"} · step{" "}
					{activeIndex >= 0 ? safeIndex + 1 : 0}/{LEARNING_STATUSES.length}
				</span>
			</div>
			<div className="eragear-progress-bar" aria-hidden="true">
				<span
					className={`eragear-progress-fill-${progressBucket(progressBucketValue * 10)}`}
				/>
			</div>
			<div className="eragear-status-rail-labels">
				<span>Seed</span>
				<span>Mastered</span>
			</div>
		</div>
	);
}

interface MetadataDraft {
	type: string;
	area: string;
	status: string;
	priority: string;
	maturity: string;
	sprint: string;
}

function MetadataFixer({
	draft,
	onDraftChange,
	onSave,
	disabled,
	submitLabel,
}: {
	draft: MetadataDraft;
	onDraftChange: (draft: MetadataDraft) => void;
	onSave: () => void;
	disabled: boolean;
	submitLabel: string;
}) {
	return (
		<form
			className="eragear-learning-metadata-form"
			onSubmit={(event) => {
				event.preventDefault();
				onSave();
			}}
		>
			<label>
				<span>Type</span>
				<select
					value={draft.type}
					onChange={(event) =>
						onDraftChange({ ...draft, type: event.target.value })
					}
				>
					<option value="">Select type</option>
					{LEARNING_NOTE_TYPES.map((type) => (
						<option key={type} value={type}>
							{type}
						</option>
					))}
				</select>
			</label>
			<label>
				<span>Area</span>
				<input
					type="text"
					value={draft.area}
					onChange={(event) =>
						onDraftChange({ ...draft, area: event.target.value })
					}
					placeholder="systems-bridge"
				/>
			</label>
			<label>
				<span>Status</span>
				<select
					value={draft.status}
					onChange={(event) =>
						onDraftChange({ ...draft, status: event.target.value })
					}
				>
					<option value="">Select status</option>
					{LEARNING_STATUSES.map((status) => (
						<option key={status} value={status}>
							{status}
						</option>
					))}
				</select>
			</label>
			<label>
				<span>Priority</span>
				<input
					type="number"
					min="0"
					max="100"
					value={draft.priority}
					onChange={(event) =>
						onDraftChange({ ...draft, priority: event.target.value })
					}
				/>
			</label>
			<label>
				<span>Maturity</span>
				<input
					type="number"
					min="0"
					max="5"
					value={draft.maturity}
					onChange={(event) =>
						onDraftChange({ ...draft, maturity: event.target.value })
					}
				/>
			</label>
			<label>
				<span>Sprint</span>
				<input
					type="text"
					value={draft.sprint}
					onChange={(event) =>
						onDraftChange({ ...draft, sprint: event.target.value })
					}
					placeholder="systems-bridge"
				/>
			</label>
			<Button type="submit" variant="outline" disabled={disabled}>
				<span>{submitLabel}</span>
			</Button>
		</form>
	);
}

function draftToPatch(draft: MetadataDraft) {
	return {
		type: toOptionalNoteType(draft.type),
		area: draft.area.trim(),
		status: toOptionalStatus(draft.status),
		priority: toOptionalNumber(draft.priority),
		maturity: toOptionalNumber(draft.maturity),
		sprint: draft.sprint.trim(),
	};
}

function createMetadataDraft(note: LearningNote | null): MetadataDraft {
	return {
		type: note?.type ?? "",
		area: note?.area ?? "",
		status: note?.status ?? "",
		priority: typeof note?.priority === "number" ? String(note.priority) : "",
		maturity: typeof note?.maturity === "number" ? String(note.maturity) : "",
		sprint: note?.sprint ?? "",
	};
}

function toOptionalNumber(value: string): number | undefined {
	if (value.trim() === "") return undefined;
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : undefined;
}

function clampMaturity(value: number): number {
	return Math.max(0, Math.min(value, 5));
}

function addDays(dateValue: string, days: number): string {
	const [year, month, day] = dateValue.split("-").map(Number);
	if (!year || !month || !day) return dateValue;

	const date = new Date(year, month - 1, day);
	date.setDate(date.getDate() + days);
	return formatLocalDate(date);
}

function formatLocalDate(date = new Date()): string {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function toOptionalNoteType(value: string): LearningNoteType | undefined {
	return LEARNING_NOTE_TYPES.includes(value as LearningNoteType)
		? (value as LearningNoteType)
		: undefined;
}

function toOptionalStatus(value: string): LearningStatus | undefined {
	return LEARNING_STATUSES.includes(value as LearningStatus)
		? (value as LearningStatus)
		: undefined;
}

function StatusChip({ children }: { children: React.ReactNode }) {
	return <span className="eragear-status-chip">{children}</span>;
}

function agentLabel(agent: NextActionCandidate["suggestedAgent"]): string {
	if (agent === "deterministic") return "Local action";
	if (agent === "coding-agent") return "ACP coding agent";
	return "ACP reasoning agent";
}

function shortAgentLabel(agent: NextActionCandidate["suggestedAgent"]): string {
	if (agent === "deterministic") return "Local";
	if (agent === "coding-agent") return "Coding";
	return "Agent";
}

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="eragear-learning-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
	);
}

function ActionQueuePanel({
	queue,
	plugin,
	onRunAction,
	onRunWithAcp,
	onCreateAgentTask,
	disabled,
}: {
	queue: NextActionCandidate[];
	plugin: EragearPlugin;
	onRunAction: (candidate: NextActionCandidate) => void;
	onRunWithAcp: (candidate: NextActionCandidate) => void;
	onCreateAgentTask: (candidate: NextActionCandidate) => void;
	disabled: boolean;
}) {
	const visibleActions = queue.slice(0, 6);

	return (
		<section className="eragear-learning-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Next action queue</h3>
					<p>Learning scheduler with score, reason, and required output.</p>
				</div>
				<IconList />
			</div>
			{visibleActions.length > 0 ? (
				<ol className="eragear-action-queue">
					{visibleActions.map((candidate, index) => {
						const blockers = getActionBlockers(candidate.note);
						return (
							<li key={candidate.note.path}>
							<div className="eragear-action-row-main">
								<div className="eragear-action-rank">{index + 1}</div>
								<div className="eragear-action-description">
									<strong>{candidate.action}</strong>
									<button
										type="button"
										className="eragear-learning-link"
										onClick={() => openNote(plugin, candidate.note)}
									>
										{candidate.note.title}
									</button>
								</div>
								<div className="eragear-action-why">
									<strong>Why</strong>
									<span>{candidate.reason[0] ?? "highest ranked action"}</span>
								</div>
								<div className="eragear-action-output">
									<strong>Output</strong>
									<span>{inferOutputLabel(candidate)}</span>
								</div>
							</div>
							<div className="eragear-action-row-chips">
								<StatusChip>score {Math.round(candidate.score)}</StatusChip>
								<StatusChip>{agentLabel(candidate.suggestedAgent)}</StatusChip>
								<StatusChip>{candidate.note.status ?? "missing status"}</StatusChip>
								{blockers.length > 0 ? (
									<StatusChip>blocked by {blockers.length}</StatusChip>
								) : null}
							</div>
							{candidate.expectedOutput ? (
								<p>{candidate.expectedOutput}</p>
							) : null}
							{candidate.reason.length > 0 ? (
								<ul className="eragear-reason-list">
									{candidate.reason.slice(0, 4).map((reason) => (
										<li key={reason}>{reason}</li>
									))}
								</ul>
							) : null}
							{blockers.length > 0 ? (
								<div className="eragear-dod-gate">
									<strong>Blocked by</strong>
									<ul>
										{blockers.slice(0, 3).map((blocker) => (
											<li key={blocker}>{blocker}</li>
										))}
									</ul>
								</div>
							) : null}
							<div className="eragear-row-actions">
								{candidate.suggestedAgent !== "deterministic" ? (
									<Button
										type="button"
										variant="secondary"
										onClick={() => onRunWithAcp(candidate)}
										disabled={disabled}
										size="sm"
									>
										<span>Run with ACP</span>
									</Button>
								) : (
									<Button
										type="button"
										variant="outline"
										onClick={() => onRunAction(candidate)}
										disabled={disabled}
										size="sm"
									>
										<span>Run local action</span>
									</Button>
								)}
								{candidate.suggestedAgent !== "deterministic" ? (
									<Button
										type="button"
										variant="outline"
										onClick={() => onCreateAgentTask(candidate)}
										disabled={disabled}
										size="sm"
									>
										<span>Create ACP task</span>
									</Button>
								) : null}
							</div>
						</li>
						);
					})}
				</ol>
			) : (
				<p>No queued actions.</p>
			)}
		</section>
	);
}

function AgentTasksPanel({
	tasks,
	plugin,
	onRun,
	onStatusChange,
	disabled,
}: {
	tasks: LearningAgentTaskSummary[];
	plugin: EragearPlugin;
	onRun: (task: LearningAgentTaskSummary) => void;
	onStatusChange: (
		task: LearningAgentTaskSummary,
		status: AgentTaskStatus,
	) => void;
	disabled: boolean;
}) {
	const visibleTasks = tasks.slice(0, 6);

	return (
		<section className="eragear-learning-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>ACP agent tasks</h3>
					<p>Bounded handoffs executed through the ACP adapter.</p>
				</div>
				<IconFileText />
			</div>
			{visibleTasks.length > 0 ? (
				<ol className="eragear-agent-task-list">
					{visibleTasks.map((task) => (
						<li key={task.path}>
							<div className="eragear-action-row-main">
								<div>
									<button
										type="button"
										className="eragear-learning-link"
										onClick={() => openPath(plugin, task.path)}
									>
										{task.title}
									</button>
									{task.notePath ? (
										<button
											type="button"
											className="eragear-learning-link eragear-learning-path-link"
											onClick={() => openPath(plugin, task.notePath)}
										>
											{task.notePath}
										</button>
									) : null}
								</div>
								<div className="eragear-action-row-chips">
									<StatusChip>{task.status}</StatusChip>
									<StatusChip>{agentTaskLabel(task.suggestedAgent)}</StatusChip>
								</div>
							</div>
							<div className="eragear-agent-task-controls">
								<label>
									<span>Status</span>
									<select
										aria-label={`Status for ${task.title}`}
										value={task.status}
										disabled={disabled}
										onChange={(event) =>
											onStatusChange(
												task,
												event.target.value as AgentTaskStatus,
											)
										}
									>
										{AGENT_TASK_STATUS_OPTIONS.map((status) => (
											<option key={status} value={status}>
												{status}
											</option>
										))}
									</select>
								</label>
								<Button
									type="button"
									variant="outline"
									onClick={() => onRun(task)}
									disabled={
										disabled ||
										task.suggestedAgent === "deterministic" ||
										task.status === "running" ||
										task.status === "done" ||
										task.status === "proposed"
									}
									size="sm"
								>
									<span>Run ACP agent</span>
								</Button>
							</div>
						</li>
					))}
				</ol>
			) : (
				<p>No ACP agent tasks created.</p>
			)}
		</section>
	);
}

function agentTaskLabel(
	agent: LearningAgentTaskSummary["suggestedAgent"],
): string {
	if (agent === "deterministic") return "Local action";
	if (agent === "coding-agent") return "ACP coding agent";
	return "ACP reasoning agent";
}

function WriteProposalsPanel({
	proposals,
	plugin,
	onApply,
	onReject,
	disabled,
	hideWhenEmpty = false,
}: {
	proposals: AgentWriteProposalSummary[];
	plugin: EragearPlugin;
	onApply: (proposal: AgentWriteProposalSummary) => void;
	onReject: (proposal: AgentWriteProposalSummary) => void;
	disabled: boolean;
	hideWhenEmpty?: boolean;
}) {
	const visibleProposals = proposals.slice(0, 6);
	if (hideWhenEmpty && visibleProposals.length === 0) return null;

	return (
		<section className="eragear-learning-panel eragear-artifact-review-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>Artifact review</h3>
					<p>ACP output is staged, validated, and applied only after review.</p>
				</div>
				<IconFileText />
			</div>
			{visibleProposals.length > 0 ? (
				<ol className="eragear-write-proposal-list">
					{visibleProposals.map((proposal) => (
						<li key={proposal.path}>
							<div className="eragear-action-row-main">
								<div>
									<div className="eragear-learning-eyebrow">
										<IconPackage />
										<span>Artifact proposal</span>
									</div>
									<button
										type="button"
										className="eragear-learning-link"
										onClick={() => openPath(plugin, proposal.path)}
									>
										{proposal.id}
									</button>
								</div>
								<div className="eragear-action-row-chips">
									<StatusChip>{proposal.status}</StatusChip>
									<StatusChip>{proposal.writes.length} writes</StatusChip>
								</div>
							</div>
							<div className="eragear-proposal-review-grid">
								<div>
									<strong>Target files</strong>
									<ul>
										{proposal.writes.slice(0, 4).map((write) => (
											<li key={write.path}>{write.path}</li>
										))}
									</ul>
								</div>
								<div>
									<strong>Validation</strong>
									<ul>
										<li>{proposal.isValid ? "Path allowed" : "Path rejected"}</li>
										<li>
											{proposal.rejectedPaths.length === 0
												? "No external writes"
												: `Rejected: ${proposal.rejectedPaths.join(", ")}`}
										</li>
										<li>{proposal.status === "pending" ? "Review required" : proposal.status}</li>
									</ul>
								</div>
							</div>
							<div className="eragear-proposal-diff-preview">
								<strong>Proposed content preview</strong>
								<p>{proposal.writes[0]?.content.slice(0, 220) ?? "No content."}</p>
							</div>
							<div className="eragear-row-actions">
								<Button
									type="button"
									variant="secondary"
									onClick={() => onApply(proposal)}
									disabled={
										disabled || !proposal.isValid || proposal.status !== "pending"
									}
									size="sm"
								>
									<span>Apply</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => onApply(proposal)}
									disabled={
										disabled || !proposal.isValid || proposal.status !== "pending"
									}
									size="sm"
								>
									<span>Apply and update status</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => onReject(proposal)}
									disabled={disabled || proposal.status !== "pending"}
									size="sm"
								>
									<span>Reject</span>
								</Button>
								<Button
									type="button"
									variant="outline"
									onClick={() => openPath(plugin, proposal.path)}
									size="sm"
								>
									<span>Edit manually</span>
								</Button>
							</div>
						</li>
					))}
				</ol>
			) : (
				<p>No artifact proposals found.</p>
			)}
		</section>
	);
}

function matchesSkillArea(note: LearningNote, terms: readonly string[]): boolean {
	const haystack = `${note.title} ${note.area ?? ""} ${note.sprint ?? ""} ${note.type ?? ""}`.toLowerCase();
	return terms.some((term) => haystack.includes(term));
}

function computeAreaProgress(notes: LearningNote[]): number {
	if (notes.length === 0) return 0;
	const total = notes.reduce((sum, note) => {
		if (note.status === "mastered") return sum + 100;
		if (note.status === "done") return sum + 85;
		return sum + Math.min(((note.maturity ?? 0) / 5) * 100, 75);
	}, 0);
	return Math.round(total / notes.length);
}

function isWeakForSkillMap(note: LearningNote): boolean {
	return (
		(note.blockers ?? []).length > 0 ||
		(note.mastery?.weak_points ?? []).length > 0 ||
		(note.maturity ?? 0) <= 2
	);
}

function progressBucket(progress: number): number {
	return Math.max(0, Math.min(10, Math.round(progress / 10)));
}

function getExpectedOutputBullets(candidate: NextActionCandidate): string[] {
	const output = candidate.expectedOutput;
	if (!output) {
		return ["Update learning state", "Refresh queue", "Record evidence"];
	}
	if (output.includes("bridge")) {
		return [
			"Create bridge note",
			"Explain the mechanism",
			"Add comparison table",
			"Link related concepts",
		];
	}
	if (output.includes("_explainers")) {
		return [
			"Create HTML explainer",
			"Show mental model",
			"Add interactive example",
			"Include self-test",
		];
	}
	if (output.includes("_quizzes")) {
		return [
			"Create quiz",
			"Score recall and mechanism",
			"Capture weak points",
			"Schedule next fix",
		];
	}
	if (output.includes("case-study")) {
		return [
			"Create case study",
			"Describe decision point",
			"Record failure modes",
			"Link project evidence",
		];
	}
	return output
		.split(" and ")
		.map((item) => item.trim())
		.filter((item) => item.length > 0)
		.slice(0, 4);
}

function inferOutputLabel(candidate: NextActionCandidate): string {
	const output = candidate.expectedOutput ?? "";
	if (output.includes("bridge")) return "Bridge note";
	if (output.includes("_explainers")) return "HTML explainer";
	if (output.includes("_quizzes")) return "Quiz score";
	if (output.includes("case-study")) return "Case study";
	if (output.includes("_reviews")) return "Review evidence";
	if (output.includes("frontmatter")) return "Metadata";
	return "Learning evidence";
}

function getMissingKnowledge(note: LearningNote): string[] {
	const items = [
		...note.missingFields.map((field) => `Missing ${field}`),
		...(note.unmetPrerequisites ?? []).map(
			(prerequisite) => `Prerequisite: ${prerequisite}`,
		),
		...(note.blockers ?? []),
		...(note.mastery?.weak_points ?? []).map(
			(point) => `Weak point: ${point}`,
		),
	];
	if (items.length > 0) return Array.from(new Set(items));
	if (note.status === "visualize" && !note.artifactHtml) {
		return ["HTML explainer is missing"];
	}
	if (note.status === "test" && typeof note.quizScore !== "number") {
		return ["Quiz score is missing"];
	}
	return [];
}

function getActionBlockers(note: LearningNote): string[] {
	return Array.from(
		new Set([
			...(note.unmetPrerequisites ?? []).map(
				(prerequisite) => `Prerequisite: ${prerequisite}`,
			),
			...(note.blockers ?? []),
		]),
	);
}

function getSessionDiagnosis(note: LearningNote): string {
	if ((note.blockers ?? []).length > 0) {
		return "This concept cannot advance until its blockers are cleared.";
	}
	if ((note.mastery?.weak_points ?? []).length > 0) {
		return "You have recorded weak points. Use examiner or review mode before promotion.";
	}
	if (note.status === "seed") return "This concept is new and needs structure.";
	if (note.status === "explain") return "Definition exists; mechanism evidence is next.";
	if (note.status === "visualize") return "Build a diagram or explainer to make the model inspectable.";
	if (note.status === "connect") return "Connect this concept to prerequisites and adjacent systems.";
	if (note.status === "test") return "Test understanding before applying the concept.";
	if (note.status === "apply") return "Create project, case-study, or debugging evidence.";
	if (note.status === "review") return "Review weak points and decide if done is justified.";
	if (note.status === "done") return "Done requires mastery evidence before it becomes mastered.";
	return "This concept has strong evidence recorded.";
}

function getCurrentStateHeadline(note: LearningNote): string {
	if ((note.blockers ?? []).length > 0) return "Clear blockers first";
	if ((note.missingFields ?? []).length > 0) return "Metadata needs cleanup";
	if (getMissingKnowledge(note).length > 0) return "Understanding is incomplete";
	if (note.status === "done") return "Ready for mastery evidence";
	if (note.status === "mastered") return "Mastery evidence recorded";
	return "Ready for the next learning step";
}

function getExaminerQuestion(note: LearningNote): string {
	const missing = getMissingKnowledge(note)[0];
	if (missing) {
		return `Explain ${missing.toLowerCase()} and why it matters for ${note.title}.`;
	}
	if (note.status === "test") {
		return `What would prove that you can use ${note.title} beyond a surface definition?`;
	}
	return `Explain the mechanism behind ${note.title}, then name one failure mode and one production implication.`;
}

function getExaminerRubric(note: LearningNote): string[] {
	const baseline = [
		"Answers the question directly",
		"Explains the internal mechanism",
		"Names a tradeoff or failure mode",
		"Connects the concept to a related system",
		"States the next fix if confidence is weak",
	];
	const blockers = (note.blockers ?? []).slice(0, 2);
	if (blockers.length === 0) return baseline;
	return [
		...baseline.slice(0, 3),
		...blockers.map((blocker) => `Addresses blocker: ${blocker}`),
		...baseline.slice(3),
	];
}

function formatDisplayDate(date = new Date()): string {
	return date.toLocaleDateString(undefined, {
		day: "2-digit",
		month: "short",
		year: "numeric",
	});
}

function formatRuntimeEventTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "";
	return date.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
	});
}

function openNote(plugin: EragearPlugin, note: LearningNote): void {
	openPath(plugin, note.path);
}

function openPath(plugin: EragearPlugin, path: string): void {
	plugin.app.workspace.openLinkText(path, "", false);
}
