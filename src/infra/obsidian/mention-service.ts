import { type App, prepareFuzzySearch, TFile } from "obsidian";

/**
 * NoteMentionService - Maintains a real-time index of all markdown files
 * in the vault and provides fuzzy search functionality.
 * 
 * Based on Obsidian Agent Client's implementation.
 */
export class NoteMentionService {
	private app: App;
	private files: TFile[] = [];
	private eventRefs: (() => void)[] = [];

	constructor(app: App) {
		this.app = app;
		this.rebuildIndex();
		this.registerEvents();
	}

	/**
	 * Rebuild the file index from vault
	 */
	private rebuildIndex(): void {
		this.files = this.app.vault.getMarkdownFiles();
		console.log("[NoteMentionService] Index rebuilt, files count:", this.files.length);
	}

	/**
	 * Register vault events to keep index updated
	 */
	private registerEvents(): void {
		// File created
		const createRef = this.app.vault.on("create", (file) => {
			if (file instanceof TFile && file.extension === "md") {
				console.log("[NoteMentionService] File created:", file.path);
				this.rebuildIndex();
			}
		});

		// File deleted
		const deleteRef = this.app.vault.on("delete", (file) => {
			console.log("[NoteMentionService] File deleted:", file.path);
			this.rebuildIndex();
		});

		// File renamed
		const renameRef = this.app.vault.on("rename", (file, oldPath) => {
			if (file instanceof TFile && file.extension === "md") {
				console.log("[NoteMentionService] File renamed:", oldPath, "->", file.path);
				this.rebuildIndex();
			}
		});

		// Store refs for cleanup
		this.eventRefs.push(
			() => this.app.vault.offref(createRef),
			() => this.app.vault.offref(deleteRef),
			() => this.app.vault.offref(renameRef),
		);
	}

	/**
	 * Fuzzy search across note names, paths, and aliases.
	 * Returns top 5 matching files.
	 * 
	 * @param query - Search query
	 * @returns Array of matching TFile objects
	 */
	searchNotes(query: string): TFile[] {
		console.log("[NoteMentionService] searchNotes called with:", query);
		console.log("[NoteMentionService] Total files indexed:", this.files.length);

		if (!query.trim()) {
			// Return recently modified files when query is empty
			const recentFiles = this.files
				.slice()
				.sort((a, b) => (b.stat?.mtime || 0) - (a.stat?.mtime || 0))
				.slice(0, 5);
			console.log("[NoteMentionService] Empty query, returning recent files:", recentFiles.map(f => f.basename));
			return recentFiles;
		}

		const fuzzySearch = prepareFuzzySearch(query.trim());

		// Score each file based on multiple fields
		const scored: Array<{ file: TFile; score: number }> = this.files.map((file) => {
			const basename = file.basename;
			const path = file.path;

			// Get aliases from frontmatter
			const fileCache = this.app.metadataCache.getFileCache(file);
			const aliases = fileCache?.frontmatter?.aliases as string[] | string | undefined;
			const aliasArray: string[] = Array.isArray(aliases)
				? aliases
				: aliases
					? [aliases]
					: [];

			// Search in basename, path, and aliases
			const searchFields = [basename, path, ...aliasArray];
			let bestScore = -Infinity;

			for (const field of searchFields) {
				const match = fuzzySearch(field);
				if (match && match.score > bestScore) {
					bestScore = match.score;
				}
			}

			return { file, score: bestScore };
		});

		const results = scored
			.filter((item) => item.score > -Infinity)
			.sort((a, b) => b.score - a.score)
			.slice(0, 5)
			.map((item) => item.file);

		console.log("[NoteMentionService] Search results:", results.map(f => f.basename));
		return results;
	}

	/**
	 * Get all indexed markdown files
	 */
	getAllFiles(): TFile[] {
		return this.files;
	}

	/**
	 * Lookup file by exact path
	 */
	getFileByPath(path: string): TFile | null {
		return this.files.find((f) => f.path === path) || null;
	}

	/**
	 * Find file by basename (without extension)
	 */
	getFileByBasename(basename: string): TFile | null {
		// Exact match first
		let file = this.files.find((f) => f.basename === basename);
		if (file) return file;

		// Case-insensitive match
		file = this.files.find(
			(f) => f.basename.toLowerCase() === basename.toLowerCase()
		);
		if (file) return file;

		return null;
	}

	/**
	 * Clean up event listeners
	 */
	destroy(): void {
		console.log("[NoteMentionService] Destroying service");
		for (const unsubscribe of this.eventRefs) {
			unsubscribe();
		}
		this.eventRefs = [];
		this.files = [];
	}
}
