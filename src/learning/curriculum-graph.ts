import type { LearningDependencyLink, LearningNote } from "@/learning/types";

export interface CurriculumGraphResult {
	notes: LearningNote[];
	blockedNotes: LearningNote[];
	cycles: string[][];
}

export interface CurriculumSprint {
	name: string;
	notes: LearningNote[];
}

export const CURRICULUM_ROADMAPS: Record<string, string[]> = {
	"Systems Bridge": ["systems", "architecture", "operating systems"],
	"Data Systems": ["data systems", "database", "storage"],
	"Runtime/Backend Execution": ["runtime", "backend", "execution"],
	"Production Debugging": ["debugging", "observability", "production"],
	"Distributed Systems": ["distributed systems", "consensus", "networking"],
	"AI Engineering": ["ai engineering", "llm", "agents"],
};

export function enrichNotesWithCurriculumGraph(
	notes: LearningNote[],
): CurriculumGraphResult {
	const byPath = new Map(notes.map((note) => [note.path, note]));
	const byTitle = new Map(notes.map((note) => [note.title.toLowerCase(), note]));
	const cycles = detectCycles(notes, byPath, byTitle);
	const cyclePaths = new Set(cycles.flat());
	const enriched = notes.map((note) => {
		const prerequisiteLinks = resolveLinks(note.prerequisites ?? [], byPath, byTitle);
		const unlockLinks = resolveLinks(note.unlocks ?? [], byPath, byTitle);
		const unmetPrerequisites = prerequisiteLinks
			.filter((link) => {
				const prerequisite = link.path ? byPath.get(link.path) : undefined;
				return !prerequisite || !isCompleteEnough(prerequisite);
			})
			.map((link) => link.raw);
		return {
			...note,
			prerequisiteLinks,
			unlockLinks,
			unmetPrerequisites,
			unlockCount: unlockLinks.length,
			dependencyDepth: computeDependencyDepth(note, byPath, byTitle),
			circularDependency: cyclePaths.has(note.path),
			blockers: [
				...(note.blockers ?? []),
				...unmetPrerequisites.map((item) => `Prerequisite not met: ${item}`),
				...(cyclePaths.has(note.path) ? ["Circular prerequisite detected."] : []),
			],
		};
	});

	return {
		notes: enriched,
		blockedNotes: enriched.filter((note) => (note.blockers ?? []).length > 0),
		cycles,
	};
}

export function generateCurriculumSprint(
	notes: LearningNote[],
	roadmapName: keyof typeof CURRICULUM_ROADMAPS | string,
	limit = 12,
): CurriculumSprint {
	const terms = CURRICULUM_ROADMAPS[roadmapName] ?? [roadmapName.toLowerCase()];
	const graph = enrichNotesWithCurriculumGraph(notes);
	const selected = graph.notes
		.filter((note) => matchesRoadmap(note, terms))
		.sort((a, b) => {
			const blockedDelta =
				(a.unmetPrerequisites?.length ?? 0) - (b.unmetPrerequisites?.length ?? 0);
			if (blockedDelta !== 0) return blockedDelta;
			const depthDelta = (a.dependencyDepth ?? 0) - (b.dependencyDepth ?? 0);
			if (depthDelta !== 0) return depthDelta;
			return (b.priority ?? 0) - (a.priority ?? 0);
		})
		.slice(0, limit);
	return { name: roadmapName, notes: selected };
}

function resolveLinks(
	values: string[],
	byPath: Map<string, LearningNote>,
	byTitle: Map<string, LearningNote>,
): LearningDependencyLink[] {
	return values.map((raw) => {
		const title = stripWikilink(raw);
		const exact = byPath.get(title) ?? byPath.get(`${title}.md`);
		const byResolvedTitle = byTitle.get(title.toLowerCase());
		const note = exact ?? byResolvedTitle;
		return {
			raw,
			title,
			path: note?.path,
			exists: note !== undefined,
		};
	});
}

function stripWikilink(value: string): string {
	const trimmed = value.trim();
	const match = /^\[\[([^|\]]+)(?:\|[^\]]+)?\]\]$/.exec(trimmed);
	return (match?.[1] ?? trimmed).trim();
}

function isCompleteEnough(note: LearningNote): boolean {
	return note.status === "done" || note.status === "mastered";
}

function computeDependencyDepth(
	note: LearningNote,
	byPath: Map<string, LearningNote>,
	byTitle: Map<string, LearningNote>,
	seen = new Set<string>(),
): number {
	if (seen.has(note.path)) return 0;
	seen.add(note.path);
	const depths = resolveLinks(note.prerequisites ?? [], byPath, byTitle)
		.map((link) => (link.path ? byPath.get(link.path) : undefined))
		.filter((item): item is LearningNote => item !== undefined)
		.map((prerequisite) =>
			1 + computeDependencyDepth(prerequisite, byPath, byTitle, new Set(seen)),
		);
	return Math.max(0, ...depths);
}

function detectCycles(
	notes: LearningNote[],
	byPath: Map<string, LearningNote>,
	byTitle: Map<string, LearningNote>,
): string[][] {
	const cycles: string[][] = [];
	const visiting = new Set<string>();
	const visited = new Set<string>();

	const visit = (note: LearningNote, stack: string[]) => {
		if (visiting.has(note.path)) {
			const start = stack.indexOf(note.path);
			cycles.push(stack.slice(start).concat(note.path));
			return;
		}
		if (visited.has(note.path)) return;
		visiting.add(note.path);
		for (const link of resolveLinks(note.prerequisites ?? [], byPath, byTitle)) {
			const next = link.path ? byPath.get(link.path) : undefined;
			if (next) visit(next, [...stack, note.path]);
		}
		visiting.delete(note.path);
		visited.add(note.path);
	};

	for (const note of notes) visit(note, []);
	return cycles;
}

function matchesRoadmap(note: LearningNote, terms: string[]): boolean {
	const haystack = `${note.title} ${note.area ?? ""} ${note.sprint ?? ""}`.toLowerCase();
	return terms.some((term) => haystack.includes(term.toLowerCase()));
}
