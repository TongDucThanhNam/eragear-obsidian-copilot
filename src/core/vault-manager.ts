/**
 * Vault Manager
 *
 * Safe, caching-aware wrapper around Obsidian Vault API.
 * This module handles all interactions with the Obsidian vault,
 * ensuring thread safety and proper resource management.
 *
 * Design Principles:
 * 1. No complex object passing to Worker (only JSON-serializable data)
 * 2. Caching via Obsidian's MetadataCache for performance
 * 3. Error recovery (graceful degradation if file not found)
 * 4. Type safety with proper interfaces
 */

import { type App, getAllTags, MarkdownView, TFile, TFolder } from "obsidian";

export interface FileData {
    path: string;
    title: string;
    content: string;
    tags: Set<string>;
    outgoingLinks: string[];
    incomingLinks: string[];
}

export interface FileReference {
    path: string;
    title: string;
}

export class VaultManager {
    constructor(private app: App) { }

    /**
     * Get content of a file safely
     * Uses cachedRead for optimal performance
     */
    async getFileContent(file: TFile): Promise<string> {
        try {
            return await this.app.vault.cachedRead(file);
        } catch (error) {
            console.error(`[VaultManager] Failed to read ${file.path}:`, error);
            return "";
        }
    }

    /**
     * Get file by path
     */
    getFileByPath(filePath: string): TFile | null {
        const file = this.app.vault.getFileByPath(filePath);
        return file instanceof TFile ? file : null;
    }

    /**
     * Get all markdown files in vault
     */
    getAllFiles(): TFile[] {
        return this.app.vault.getMarkdownFiles();
    }

    /**
     * Get current active file
     */
    getActiveFile(): TFile | null {
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        return view?.file ?? null;
    }

    /**
     * Get file structure (headings)
     */
    getFileStructure(file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);

        if (!cache?.headings) {
            return "# No structure found";
        }

        return cache.headings
            .map((h) => `${"#".repeat(h.level)} ${h.heading}`)
            .join("\n");
    }

    /**
     * Get tags from file
     */
    getFileTags(file: TFile): Set<string> {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) return new Set();

        const tags = getAllTags(cache);
        if (!tags) return new Set();
        return new Set(tags.map((tag) => tag.replace(/^#/, "")));
    }

    /**
     * Get outgoing links from file
     */
    getOutgoingLinks(file: TFile): FileReference[] {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache?.links) return [];

        const links = cache.links
            .map((link) => {
                const linkedFile = this.resolveLink(file, link.link);
                if (!linkedFile) return null;
                return {
                    path: linkedFile.path,
                    title: linkedFile.basename,
                };
            })
            .filter((l): l is FileReference => l !== null);

        return links;
    }

    /**
     * Get incoming links (backlinks) to file
     */
    getIncomingLinks(file: TFile): FileReference[] {
        const resolvedLinks = this.app.metadataCache.resolvedLinks;
        if (!resolvedLinks) return [];

        const links: FileReference[] = [];
        for (const [sourcePath, targets] of Object.entries(resolvedLinks)) {
            if (targets[file.path]) {
                const sourceFile = this.getFileByPath(sourcePath);
                if (sourceFile) {
                    links.push({
                        path: sourcePath,
                        title: sourceFile.basename,
                    });
                }
            }
        }

        return links;
    }

    /**
     * Resolve wiki link [[...]] to actual file
     */
    private resolveLink(sourceFile: TFile, linkPath: string): TFile | null {
        try {
            const resolvedPath = this.app.metadataCache.getFirstLinkpathDest(
                linkPath,
                sourceFile.path,
            );
            return resolvedPath instanceof TFile ? resolvedPath : null;
        } catch {
            return null;
        }
    }

    /**
     * Collect all necessary data from a file for Worker processing
     * This method prepares JSON-serializable data only
     */
    async collectFileData(file: TFile): Promise<FileData> {
        const content = await this.getFileContent(file);
        const tags = this.getFileTags(file);
        const outgoing = this.getOutgoingLinks(file);
        const incoming = this.getIncomingLinks(file);

        return {
            path: file.path,
            title: file.basename,
            content,
            tags,
            outgoingLinks: outgoing.map((l) => l.path),
            incomingLinks: incoming.map((l) => l.path),
        };
    }

    /**
     * Collect data for all files (potentially expensive)
     * Used for building full graph
     */
    async collectAllFilesData(): Promise<FileData[]> {
        const allFiles = this.getAllFiles();
        const results: FileData[] = [];

        for (const file of allFiles) {
            try {
                const data = await this.collectFileData(file);
                results.push(data);
            } catch (error) {
                console.error(
                    `[VaultManager] Error collecting data for ${file.path}:`,
                    error,
                );
            }
        }

        return results;
    }

    /**
     * Get simplified file list for Worker (without content)
     * Used for lightweight index updates
     */
    getFileMetadata(): Array<{ path: string; title: string }> {
        return this.getAllFiles().map((file) => ({
            path: file.path,
            title: file.basename,
        }));
    }

    /**
     * Search files by name (simple)
     */
    searchFiles(query: string): TFile[] {
        const lowerQuery = query.toLowerCase();
        return this.getAllFiles().filter((file) =>
            file.basename.toLowerCase().includes(lowerQuery),
        );
    }

    /**
     * Get files by tag
     */
    getFilesByTag(tag: string): TFile[] {
        const allFiles = this.getAllFiles();
        return allFiles.filter((file) => {
            const fileTags = this.getFileTags(file);
            return fileTags.has(tag);
        });
    }

    /**
     * Modify file content safely
     */
    async modifyFile(file: TFile, newContent: string): Promise<void> {
        try {
            await this.app.vault.modify(file, newContent);
        } catch (error) {
            console.error(`[VaultManager] Failed to modify ${file.path}:`, error);
            throw error;
        }
    }

    /**
     * Create new file
     */
    async createFile(path: string, content: string): Promise<TFile> {
        const file = await this.app.vault.create(path, content);
        return file;
    }

    /**
     * Get vault root folder
     */
    getRootFolder(): TFolder | null {
        const root = this.app.vault.getRoot();
        return root instanceof TFolder ? root : null;
    }

    /**
     * Get folder by path
     */
    getFolderByPath(folderPath: string): TFolder | null {
        const folder = this.app.vault.getFolderByPath(folderPath);
        return folder instanceof TFolder ? folder : null;
    }

    /**
     * Listen to vault changes
     * Used for keeping Worker index up-to-date
     */
    onMetadataChanged(callback: (file: TFile) => void): () => void {
        const handler = (file: TFile) => {
            if (file instanceof TFile) {
                callback(file);
            }
        };

        this.app.metadataCache.on("changed", handler);

        // Return unsubscribe function
        return () => {
            this.app.metadataCache.off("changed", handler);
        };
    }

    /**
     * Listen to file creation
     */
    onFileCreated(callback: (file: TFile) => void): () => void {
        const handler = (file: TFile) => {
            if (file instanceof TFile) {
                callback(file);
            }
        };

        this.app.vault.on("create", handler);

        return () => {
            this.app.vault.off("create", handler);
        };
    }

    /**
     * Listen to file deletion
     */
    onFileDeleted(callback: (file: TFile) => void): () => void {
        const handler = (file: TFile) => {
            callback(file);
        };

        this.app.vault.on("delete", handler);

        return () => {
            this.app.vault.off("delete", handler);
        };
    }
}

// Export factory function
export function createVaultManager(app: App): VaultManager {
    return new VaultManager(app);
}
