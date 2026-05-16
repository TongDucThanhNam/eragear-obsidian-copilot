import { type App, normalizePath, TFile, TFolder } from "obsidian";
import { ARTIFACT_FOLDERS, LEARNING_FRONTMATTER_KEYS } from "@/learning/constants";
import { formatLearningDate } from "@/learning/frontmatter";
import type { GeneratedArtifact, LearningMastery } from "@/learning/types";
import { extractWeakPoints, updateMasteryScore } from "@/learning/mastery";

export interface ExaminerResult {
	recall: number;
	mechanism: number;
	transfer: number;
	application: number;
	evidenceNote?: string;
	notes?: {
		recall?: string;
		mechanism?: string;
		transfer?: string;
		application?: string;
	};
}

export async function generateExaminerForNote(
	app: App,
	file: TFile,
): Promise<GeneratedArtifact> {
	const folderPath = normalizePath(`${ARTIFACT_FOLDERS.reviews}/exams`);
	await ensureFolder(app, ARTIFACT_FOLDERS.reviews);
	await ensureFolder(app, folderPath);
	const artifactPath = normalizePath(`${folderPath}/${slugify(file.basename)}-exam.md`);
	const content = buildExaminerArtifact(file.path, file.basename);
	const existing = app.vault.getAbstractFileByPath(artifactPath);
	if (existing instanceof TFile) {
		await app.vault.process(existing, () => content);
	} else {
		await app.vault.create(artifactPath, content);
	}
	return { notePath: file.path, artifactPath };
}

export function applyExaminerResultToMastery(
	mastery: LearningMastery | undefined,
	result: ExaminerResult,
): LearningMastery {
	const weakPoints = extractWeakPoints([
		{ category: "recall", score: result.recall, note: result.notes?.recall ?? "Recall answer was weak." },
		{ category: "mechanism", score: result.mechanism, note: result.notes?.mechanism ?? "Mechanism answer was weak." },
		{ category: "transfer", score: result.transfer, note: result.notes?.transfer ?? "Transfer answer was weak." },
		{ category: "application", score: result.application, note: result.notes?.application ?? "Application answer was weak." },
	]);
	let next = mastery;
	for (const [category, score] of [
		["recall", result.recall],
		["mechanism", result.mechanism],
		["transfer", result.transfer],
		["application", result.application],
	] as const) {
		next = updateMasteryScore(next, {
			category,
			score,
			evidenceNote: result.evidenceNote,
			weakPoints,
		});
	}
	return next;
}

export async function writeExaminerResultFrontmatter(
	app: App,
	file: TFile,
	result: ExaminerResult,
): Promise<void> {
	const mastery = applyExaminerResultToMastery(undefined, result);
	await app.fileManager.processFrontMatter(file, (frontmatter) => {
		frontmatter.mastery = mastery;
		frontmatter[LEARNING_FRONTMATTER_KEYS.lastTouched] = formatLearningDate();
	});
}

function buildExaminerArtifact(notePath: string, title: string): string {
	return `# ${title} examiner

Source note: \`${notePath}\`

## Question set

### Recall

1. Explain the core idea without looking at the source note.
2. Name the important terms and their roles.

### Mechanism

1. Describe the mechanism step by step.
2. Explain why the mechanism works.

### Transfer

1. Compare this idea to a related note.
2. Explain where the analogy breaks.

### Application

1. Apply the idea to a concrete project or decision.
2. Identify one failure mode and mitigation.

## Rubric

- 0-5: incomplete or source-dependent.
- 6-7: usable with minor weak points.
- 8-10: reliable without prompts and transferable.

## Weak-point extraction

Record each weak answer as \`category: concrete follow-up\`.
`;
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
	const normalized = normalizePath(folderPath);
	const existing = app.vault.getAbstractFileByPath(normalized);
	if (existing instanceof TFolder) return;
	if (existing) throw new Error(`${normalized} exists but is not a folder`);
	await app.vault.createFolder(normalized);
}

function slugify(value: string): string {
	const slug = value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
	return slug || "learning-note";
}
