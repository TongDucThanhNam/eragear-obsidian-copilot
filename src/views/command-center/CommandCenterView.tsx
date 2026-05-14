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
	IconWarning,
} from "@/components/ui/Icons";
import type EragearPlugin from "@/main";
import type { AgentTaskStatus } from "@/agent/agent-task";
import type { LearningAgentTaskSummary } from "@/agent/task-store";
import type { AgentWriteProposalSummary } from "@/agent/write-proposal";
import { LEARNING_NOTE_TYPES, LEARNING_STATUSES } from "@/learning/constants";
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
}

export function CommandCenterView({ plugin }: CommandCenterViewProps) {
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
	const metadataIssues =
		scan.summary.missingType +
		scan.summary.missingArea +
		scan.summary.missingStatus;
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

	return (
		<div className="eragear-learning-center">
			<header className="eragear-learning-header">
				<div>
					<h2>Learning OS</h2>
					<p role="status" aria-live="polite">
						{scan.summary.totalNotes} notes · {queue.length} actions ·{" "}
						{aiActionCount} AI actions · {pendingProposals} ACP proposals
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

			<AcpLanePanel
				aiAction={aiAction}
				plugin={plugin}
				onRunWithAcp={runWithAcp}
				onCreateAgentTask={createAgentTask}
				onRunAgentTask={runAgentTask}
				runningTask={runningAcpTask}
				blockedTask={blockedAcpTask}
				pendingProposalCount={pendingProposals}
				disabled={busy}
			/>

			<div className="eragear-learning-overview">
				<NextActionHero
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
				<section
					className="eragear-learning-module-grid"
					aria-label="Learning modules"
				>
					<ModuleTile
						icon={<IconTag />}
						title="Metadata"
						value={metadataIssues}
						detail="missing fields"
					/>
					<ModuleTile
						icon={<IconPackage />}
						title="Artifacts"
						value={scan.summary.missingArtifacts}
						detail="HTML explainers"
					/>
					<ModuleTile
						icon={<IconRotate />}
						title="Reviews"
						value={scan.summary.dueReviews}
						detail="due now"
					/>
					<ModuleTile
						icon={<IconCode />}
						title="ACP"
						value={acpWorkCount}
						detail="AI actions/tasks"
					/>
				</section>
			</div>

			<section className="eragear-learning-summary" aria-label="Learning summary">
				<Metric label="Weak" value={scan.summary.weakNotes} />
				<Metric label="Type" value={scan.summary.missingType} />
				<Metric label="Area" value={scan.summary.missingArea} />
				<Metric label="Status" value={scan.summary.missingStatus} />
				<Metric label="Artifacts" value={scan.summary.missingArtifacts} />
				<Metric label="Reviews" value={scan.summary.dueReviews} />
			</section>

			<section className="eragear-learning-panel">
				<div className="eragear-learning-panel-header">
					<div>
						<h3>Active note</h3>
						<p>Current note state and progress controls.</p>
					</div>
					<IconFileText />
				</div>

				{activeNote ? (
					<div className="eragear-next-action">
						<button
							type="button"
							className="eragear-learning-link"
							onClick={() => openNote(plugin, activeNote)}
						>
							{activeNote.title}
						</button>
						<MetadataFixer
							draft={activeDraft}
							onDraftChange={setActiveDraft}
							onSave={saveActiveMetadata}
							disabled={busy}
							submitLabel="Save active note metadata"
						/>
						<ProgressControls
							note={activeNote}
							quizScoreDraft={quizScoreDraft}
							onQuizScoreDraftChange={setQuizScoreDraft}
							onRecordQuizScore={recordQuizScore}
							onPatch={patchActiveProgress}
							disabled={busy}
						/>
					</div>
				) : (
					<p>Open a note to add it to the learning queue.</p>
				)}
			</section>

			<ActionQueuePanel
				queue={queue}
				plugin={plugin}
				onRunAction={runQueuedAction}
				onRunWithAcp={runWithAcp}
				onCreateAgentTask={createAgentTask}
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
				disabled={busy}
			/>

			<div className="eragear-learning-grid">
				<NoteList
					title="Weak notes"
					icon={<IconWarning />}
					notes={scan.weakNotes}
					plugin={plugin}
					emptyText="No weak notes found."
				/>
				<NoteList
					title="Missing HTML explainers"
					icon={<IconFileText />}
					notes={scan.missingArtifacts}
					plugin={plugin}
					emptyText="No missing explainers."
				/>
				<NoteList
					title="Due reviews"
					icon={<IconRotate />}
					notes={scan.dueReviews}
					plugin={plugin}
					emptyText="No reviews due."
				/>
			</div>
		</div>
	);
}

const AGENT_TASK_STATUS_OPTIONS: readonly AgentTaskStatus[] = [
	"queued",
	"running",
	"proposed",
	"blocked",
	"done",
];

function NextActionHero({
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

	return (
		<section className="eragear-next-action-hero">
			<div className="eragear-learning-eyebrow">
				<IconBrain />
				<span>Next action</span>
			</div>
			{nextAction ? (
				<div className="eragear-next-action">
					<div className="eragear-next-action-title-row">
						<div>
							<h3>{nextAction.action}</h3>
							<button
								type="button"
								className="eragear-learning-link"
								onClick={() => openNote(plugin, nextAction.note)}
							>
								{nextAction.note.title}
							</button>
						</div>
						<StatusChip>{agentLabel(nextAction.suggestedAgent)}</StatusChip>
					</div>
					<div className="eragear-next-action-meta">
						<StatusChip>score {Math.round(nextAction.score)}</StatusChip>
						<StatusChip>{nextAction.note.status ?? "missing status"}</StatusChip>
						{nextAction.note.area ? (
							<StatusChip>{nextAction.note.area}</StatusChip>
						) : null}
					</div>
					<ul className="eragear-reason-list">
						{nextAction.reason.slice(0, 3).map((reason) => (
							<li key={reason}>{reason}</li>
						))}
					</ul>
					{nextAction.expectedOutput ? (
						<p>{nextAction.expectedOutput}</p>
					) : null}
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
								<span>Run with ACP</span>
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
								<span>Run local action</span>
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
								<span>Create ACP task</span>
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
								<span>Run local fallback</span>
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

function ModuleTile({
	icon,
	title,
	value,
	detail,
}: {
	icon: React.ReactNode;
	title: string;
	value: number;
	detail: string;
}) {
	return (
		<div className="eragear-module-tile">
			<div>
				{icon}
				<span>{title}</span>
			</div>
			<strong>{value}</strong>
			<p>{detail}</p>
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

function ProgressControls({
	note,
	quizScoreDraft,
	onQuizScoreDraftChange,
	onRecordQuizScore,
	onPatch,
	disabled,
}: {
	note: LearningNote;
	quizScoreDraft: string;
	onQuizScoreDraftChange: (value: string) => void;
	onRecordQuizScore: () => void;
	onPatch: (patch: LearningFrontmatterPatch) => void;
	disabled: boolean;
}) {
	const nextStatus = note.status ? getNextLearningStatus(note.status) : null;
	const nextMaturity = clampMaturity((note.maturity ?? 0) + 1);

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
					onClick={() =>
						onPatch({
							status: nextStatus ?? note.status,
							maturity: nextMaturity,
						})
					}
					disabled={disabled || !nextStatus}
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
					disabled={disabled}
				>
					<span>Mark mastered</span>
				</Button>
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
					<h3>Action queue</h3>
					<p>Ranked actions from vault state.</p>
				</div>
				<IconList />
			</div>
			{visibleActions.length > 0 ? (
				<ol className="eragear-action-queue">
					{visibleActions.map((candidate) => (
						<li key={candidate.note.path}>
							<div className="eragear-action-row-main">
								<div>
									<strong>{candidate.action}</strong>
									<button
										type="button"
										className="eragear-learning-link"
										onClick={() => openNote(plugin, candidate.note)}
									>
										{candidate.note.title}
									</button>
								</div>
								<div className="eragear-action-row-chips">
									<StatusChip>score {Math.round(candidate.score)}</StatusChip>
									<StatusChip>{agentLabel(candidate.suggestedAgent)}</StatusChip>
								</div>
							</div>
							{candidate.expectedOutput ? (
								<p>{candidate.expectedOutput}</p>
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
					))}
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
	disabled,
}: {
	proposals: AgentWriteProposalSummary[];
	plugin: EragearPlugin;
	onApply: (proposal: AgentWriteProposalSummary) => void;
	disabled: boolean;
}) {
	const visibleProposals = proposals.slice(0, 6);

	return (
		<section className="eragear-learning-panel">
			<div className="eragear-learning-panel-header">
				<div>
					<h3>ACP write proposals</h3>
					<p>ACP agent output staged before file writes.</p>
				</div>
				<IconFileText />
			</div>
			{visibleProposals.length > 0 ? (
				<ol className="eragear-write-proposal-list">
					{visibleProposals.map((proposal) => (
						<li key={proposal.path}>
							<div className="eragear-action-row-main">
								<div>
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
							{proposal.rejectedPaths.length > 0 ? (
								<p>Rejected: {proposal.rejectedPaths.join(", ")}</p>
							) : (
								<p>Write paths pass the task guard.</p>
							)}
							<Button
								type="button"
								variant="secondary"
								onClick={() => onApply(proposal)}
								disabled={
									disabled || !proposal.isValid || proposal.status !== "pending"
								}
								size="sm"
							>
								<span>Apply proposal</span>
							</Button>
						</li>
					))}
				</ol>
			) : (
				<p>No ACP write proposals found.</p>
			)}
		</section>
	);
}

function NoteList({
	title,
	icon,
	notes,
	plugin,
	emptyText,
}: {
	title: string;
	icon: React.ReactNode;
	notes: LearningNote[];
	plugin: EragearPlugin;
	emptyText: string;
}) {
	const visibleNotes = notes.slice(0, 8);

	return (
		<section className="eragear-learning-panel">
			<div className="eragear-learning-panel-header">
				<h3>{title}</h3>
				{icon}
			</div>
			{visibleNotes.length > 0 ? (
				<ol className="eragear-learning-note-list">
					{visibleNotes.map((note) => (
						<li key={note.path}>
							<button
								type="button"
								className="eragear-learning-link"
								onClick={() => openNote(plugin, note)}
							>
								{note.title}
							</button>
							<span>
								{note.status ?? "missing status"}
								{note.priority ? ` · ${note.priority}` : ""}
							</span>
						</li>
					))}
				</ol>
			) : (
				<p>{emptyText}</p>
			)}
		</section>
	);
}

function openNote(plugin: EragearPlugin, note: LearningNote): void {
	openPath(plugin, note.path);
}

function openPath(plugin: EragearPlugin, path: string): void {
	plugin.app.workspace.openLinkText(path, "", false);
}
