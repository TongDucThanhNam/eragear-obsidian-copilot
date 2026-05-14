import { describe, expect, it } from "vitest";
import type { App, TFile } from "obsidian";
import { scanVaultLearningNotes } from "@/learning/note-scanner";

describe("note scanner", () => {
	it("detects missing learning metadata", () => {
		const app = createApp([
			createFile("Learning/missing.md", "missing", {
				priority: 80,
			}),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.missingType).toBe(1);
		expect(scan.summary.missingArea).toBe(1);
		expect(scan.summary.missingStatus).toBe(1);
		expect(scan.weakNotes[0]?.missingFields).toEqual([
			"type",
			"area",
			"status",
		]);
	});

	it("puts due review notes into dueReviews", () => {
		const app = createApp([
			createFile("Learning/review.md", "review", {
				type: "concept",
				area: "systems",
				status: "review",
				review_due: "2000-01-01",
			}),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.dueReviews).toBe(1);
		expect(scan.dueReviews[0]?.path).toBe("Learning/review.md");
	});

	it("ignores ordinary notes without learning frontmatter", () => {
		const app = createApp([
			createFile("Notes/ordinary.md", "ordinary", {}),
			createFile("Learning/enrolled.md", "enrolled", {
				type: "concept",
				area: "systems",
				status: "explain",
			}),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.totalNotes).toBe(1);
		expect(scan.notes[0]?.path).toBe("Learning/enrolled.md");
	});

	it("ignores agent task files", () => {
		const app = createApp([
			createFile(
				"00_Command_Center/agent-tasks/task.md",
				"task",
				{
					type: "agent-task",
					status: "queued",
					source_note: "Learning/cache.md",
				},
			),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.totalNotes).toBe(0);
	});

	it("ignores command center support notes", () => {
		const app = createApp([
			createFile("00_Command_Center/runtime-smoke-source.md", "source", {
				type: "concept",
				area: "learning-os",
				status: "visualize",
			}),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.totalNotes).toBe(0);
	});

	it("treats quiz score zero as a weak test result", () => {
		const app = createApp([
			createFile("Learning/quiz.md", "quiz", {
				type: "concept",
				area: "systems",
				status: "test",
				quiz_score: 0,
			}),
		]);

		const scan = scanVaultLearningNotes(app);

		expect(scan.summary.weakNotes).toBe(1);
		expect(scan.weakNotes[0]?.path).toBe("Learning/quiz.md");
	});
});

interface FileFixture {
	file: TFile;
	frontmatter: Record<string, unknown>;
}

function createFile(
	path: string,
	basename: string,
	frontmatter: Record<string, unknown>,
): FileFixture {
	return {
		file: {
			path,
			basename,
			extension: "md",
		} as TFile,
		frontmatter,
	};
}

function createApp(fixtures: FileFixture[]): App {
	const cacheByPath = new Map(
		fixtures.map((fixture) => [
			fixture.file.path,
			{ frontmatter: fixture.frontmatter },
		]),
	);

	return {
		vault: {
			getMarkdownFiles: () => fixtures.map((fixture) => fixture.file),
		},
		metadataCache: {
			getFileCache: (file: TFile) => cacheByPath.get(file.path),
			resolvedLinks: {},
		},
	} as unknown as App;
}
