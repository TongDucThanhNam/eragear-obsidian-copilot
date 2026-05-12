import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	IconBrain,
	IconFileText,
	IconMagic,
	IconRotate,
	IconWarning,
} from "@/components/ui/Icons";
import type EragearPlugin from "@/main";
import type {
	LearningNote,
	LearningScanResult,
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
	const [busy, setBusy] = useState(false);

	const refresh = useCallback(() => {
		const nextScan = plugin.scanLearningNotes();
		setScan(nextScan);
		setQueue(plugin.getLearningActionQueue());
	}, [plugin]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const generateExplainer = async () => {
		setBusy(true);
		try {
			await plugin.generateHtmlExplainerForActiveNote();
			refresh();
		} finally {
			setBusy(false);
		}
	};

	const nextAction = queue[0] ?? null;

	return (
		<div className="eragear-learning-center">
			<header className="eragear-learning-header">
				<div>
					<h2>Command center</h2>
					<p role="status" aria-live="polite">
						{scan.summary.totalNotes} notes scanned
					</p>
				</div>
				<Button type="button" variant="outline" onClick={refresh}>
					<IconRotate />
					<span>Scan</span>
				</Button>
			</header>

			<section className="eragear-learning-summary" aria-label="Learning summary">
				<Metric label="Weak notes" value={scan.summary.weakNotes} />
				<Metric label="Missing type" value={scan.summary.missingType} />
				<Metric label="Missing area" value={scan.summary.missingArea} />
				<Metric label="Missing status" value={scan.summary.missingStatus} />
				<Metric label="Missing artifacts" value={scan.summary.missingArtifacts} />
				<Metric label="Due reviews" value={scan.summary.dueReviews} />
			</section>

			<section className="eragear-learning-panel">
				<div className="eragear-learning-panel-header">
					<div>
						<h3>Next action</h3>
						<p>Deterministic recommendation from vault state.</p>
					</div>
					<IconBrain />
				</div>

				{nextAction ? (
					<div className="eragear-next-action">
						<div>
							<strong>{nextAction.action}</strong>
							<button
								type="button"
								className="eragear-learning-link"
								onClick={() => openNote(plugin, nextAction.note)}
							>
								{nextAction.note.title}
							</button>
						</div>
						<ul>
							{nextAction.reason.map((reason) => (
								<li key={reason}>{reason}</li>
							))}
						</ul>
						{nextAction.expectedOutput ? (
							<p>{nextAction.expectedOutput}</p>
						) : null}
						<Button
							type="button"
							onClick={generateExplainer}
							disabled={busy}
							variant="secondary"
						>
							<IconMagic />
							<span>Generate active explainer</span>
						</Button>
					</div>
				) : (
					<p>No learning action found.</p>
				)}
			</section>

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

function Metric({ label, value }: { label: string; value: number }) {
	return (
		<div className="eragear-learning-metric">
			<span>{label}</span>
			<strong>{value}</strong>
		</div>
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
	plugin.app.workspace.openLinkText(note.path, "", false);
}
