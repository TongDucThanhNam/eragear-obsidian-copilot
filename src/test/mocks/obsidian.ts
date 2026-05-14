export class TFile {
	path: string;
	basename: string;
	extension: string;

	constructor(path: string) {
		this.path = normalizePath(path);
		const filename = this.path.split("/").pop() ?? this.path;
		const dotIndex = filename.lastIndexOf(".");
		this.basename = dotIndex >= 0 ? filename.slice(0, dotIndex) : filename;
		this.extension = dotIndex >= 0 ? filename.slice(dotIndex + 1) : "";
	}
}

export class TFolder {
	path: string;

	constructor(path: string) {
		this.path = normalizePath(path);
	}
}

export interface App {
	vault: {
		getAbstractFileByPath: (path: string) => TFile | TFolder | null;
		getFiles: () => TFile[];
		getMarkdownFiles: () => TFile[];
		cachedRead: (file: TFile) => Promise<string>;
		process: (file: TFile, callback: (content: string) => string) => Promise<void>;
		create: (path: string, content: string) => Promise<TFile>;
		createFolder: (path: string) => Promise<void>;
	};
	metadataCache: {
		getFileCache: (file: TFile) => { frontmatter?: Record<string, unknown> } | null;
		resolvedLinks: Record<string, Record<string, number>>;
	};
	fileManager: {
		processFrontMatter: (
			file: TFile,
			callback: (frontmatter: Record<string, unknown>) => void,
		) => Promise<void>;
	};
}

export const Platform = {
	isDesktopApp: true,
};

export function normalizePath(path: string): string {
	return path
		.replace(/\\/g, "/")
		.replace(/^\/+/, "")
		.replace(/\/+/g, "/")
		.replace(/\/$/, "");
}
