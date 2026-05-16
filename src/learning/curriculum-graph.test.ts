import { describe, expect, it } from "vitest";
import {
	enrichNotesWithCurriculumGraph,
	generateCurriculumSprint,
} from "@/learning/curriculum-graph";
import type { LearningNote } from "@/learning/types";

describe("curriculum graph", () => {
	it("orders prerequisites before blocked dependent notes", () => {
		const notes = [
			note("Learning/advanced.md", "Advanced cache", {
				prerequisites: ["[[Cache basics]]"],
				priority: 90,
			}),
			note("Learning/basics.md", "Cache basics", {
				status: "review",
				unlocks: ["[[Advanced cache]]"],
				priority: 40,
			}),
		];

		const graph = enrichNotesWithCurriculumGraph(notes);
		const advanced = graph.notes.find((item) => item.title === "Advanced cache");
		const basics = graph.notes.find((item) => item.title === "Cache basics");

		expect(advanced?.unmetPrerequisites).toEqual(["[[Cache basics]]"]);
		expect(basics?.unlockCount).toBe(1);
		expect(graph.blockedNotes.map((item) => item.title)).toContain(
			"Advanced cache",
		);
	});

	it("detects circular prerequisites without crashing", () => {
		const graph = enrichNotesWithCurriculumGraph([
			note("Learning/a.md", "A", { prerequisites: ["[[B]]"] }),
			note("Learning/b.md", "B", { prerequisites: ["[[A]]"] }),
		]);

		expect(graph.cycles.length).toBeGreaterThan(0);
		expect(graph.notes.some((item) => item.circularDependency)).toBe(true);
	});

	it("generates finite sprint lists from roadmap terms", () => {
		const sprint = generateCurriculumSprint(
			[
				note("Learning/os.md", "Operating systems", { area: "systems" }),
				note("Learning/sql.md", "Database indexing", { area: "database" }),
			],
			"Data Systems",
			1,
		);

		expect(sprint.notes).toHaveLength(1);
		expect(sprint.notes[0]?.title).toBe("Database indexing");
	});
});

function note(
	path: string,
	title: string,
	overrides: Partial<LearningNote> = {},
): LearningNote {
	return {
		path,
		title,
		type: "concept",
		area: "systems",
		status: "explain",
		maturity: 2,
		priority: 50,
		links: [],
		backlinks: [],
		graphScore: 0,
		missingFields: [],
		...overrides,
	};
}
