import {
    type App,
    getAllTags,
    normalizePath,
    prepareFuzzySearch,
    prepareSimpleSearch,
    TFile,
    type TFolder,
} from "obsidian";

export interface FileListItem {
    name: string;
    path: string;
    isDirectory: boolean;
    isFile: boolean;
}

export interface SearchResult {
    file: TFile;
    score: number;
    baseName: string;
    path: string;
}

export class VaultHandler {
    constructor(private app: App) { }

    /**
     * Module 1: Note Reader
     * Đọc nội dung note an toàn
     * @param file - The file to read
     * @returns Promise containing the markdown content
     */
    async getNodeContent(file: TFile): Promise<string> {
        // Dùng cachedRead để tối ưu hiệu năng cho các file ít thay đổi
        return await this.app.vault.cachedRead(file);
    }

    /**
     * Module 2: Structure Analyzer
     * Lấy TOC (Table of Contents) dưới dạng Markdown Outline
     * @param file - The file to extract structure from
     * @returns Markdown-formatted outline of the note
     */
    getNoteStructure(file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);

        if (!cache || !cache.headings) {
            return "No structure found (No headings).";
        }

        // Map headings object thành string markdown với line number
        // Line number giúp AI hiểu độ dài tương đối của mỗi section
        const toc = cache.headings
            .map((h) => {
                return `${"#".repeat(h.level)} ${h.heading} (L${h.position.start.line})`;
            })
            .join("\n");

        return toc;
    }

    /**
     * Module 2.1: Metadata Extraction
     * Lấy Metadata quan trọng (Tags, Frontmatter) để bổ trợ context
     * @param file - The file to extract metadata from
     * @returns JSON string containing tags and frontmatter
     */
    getNoteMetadata(file: TFile): string {
        const cache = this.app.metadataCache.getFileCache(file);
        const tags = cache ? getAllTags(cache) : [];
        const frontmatter = cache?.frontmatter || {};

        return JSON.stringify({ tags, frontmatter });
    } /**
	 * Module 3: Keyword Search
	 * Tìm file theo Keyword (Title & Tags & Content)
	 *
	 * Note: Đây là bản search cơ bản chạy trên Main Thread (cho < 2000 notes).
	 * Với vault lớn hơn, sau này chúng ta sẽ đẩy logic này xuống Worker.
	 *
	 * @param query - Search keyword
	 * @param limit - Maximum number of results to return (default: 5)
	 * @returns Array of matching TFile objects, sorted by relevance score
	 */
    searchNotes(query: string, limit: number = 5): TFile[] {
        // Obsidian cung cấp hàm search engine nội bộ rất nhanh
        const searchFn = prepareSimpleSearch(query);

        const allFiles = this.app.vault.getMarkdownFiles();
        const results: { file: TFile; score: number }[] = [];

        for (const file of allFiles) {
            // 1. Check Title (Ưu tiên cao nhất)
            const titleScore = searchFn(file.basename);
            if (titleScore) {
                results.push({ file, score: 10 + titleScore.score }); // Boost score cho title
                continue;
            }

            // 2. Check Tags (Cache check - Nhanh)
            const cache = this.app.metadataCache.getFileCache(file);
            const tags = cache ? getAllTags(cache) : [];
            let tagMatch = false;
            if (tags) {
                for (const tag of tags) {
                    if (tag.includes(query)) {
                        tagMatch = true;
                        break;
                    }
                }
            }
            if (tagMatch) {
                results.push({ file, score: 5 }); // Score trung bình cho tags
            }

            // 3. Nếu muốn search content (Chậm - Cân nhắc chỉ bật khi cần thiết)
            // Hiện tại chúng ta skip scan content toàn bộ file để tránh lag UI
            // Ở giai đoạn sau sẽ dùng Aho-Corasick cho phần này.
        }

        // Sort theo score và lấy top K
        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => r.file);
    }

    /**
     * Module 4: List Files in Vault Root
     * Lists all files and directories in the root directory of the vault
     * @returns Array of files and directories with metadata
     */
    listFilesInVault(): FileListItem[] {
        const rootFolder = this.app.vault.getRoot();
        return this.getDirectoryContents(rootFolder);
    }

    /**
     * Module 5: List Files in Directory
     * Lists all files and directories in a specific directory
     * @param dirPath - Path to the directory (e.g., "folder/subfolder")
     * @returns Array of files and directories with metadata
     */
    listFilesInDir(dirPath: string): FileListItem[] {
        const normalizedPath = normalizePath(dirPath);
        const folder = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!folder || !(folder instanceof this.app.vault.getRoot().constructor)) {
            throw new Error(`Directory not found: ${dirPath}`);
        }

        return this.getDirectoryContents(folder as TFolder);
    }

    /**
     * Helper method to get directory contents
     * @param folder - The folder to read from
     * @returns Array of files and directories
     */
    private getDirectoryContents(folder: TFolder): FileListItem[] {
        const items: FileListItem[] = [];

        folder.children.forEach((child) => {
            const isFolder = child instanceof this.app.vault.getRoot().constructor;
            items.push({
                name: child.name,
                path: child.path,
                isDirectory: isFolder,
                isFile: !isFolder,
            });
        });

        return items.sort((a, b) => {
            // Directories first, then files, alphabetically
            if (a.isDirectory !== b.isDirectory) {
                return a.isDirectory ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });
    }

    /**
     * Module 6: Get File Contents
     * Returns the complete content of a single file in the vault
     * @param filePath - Path to the file (e.g., "folder/note.md")
     * @returns Promise containing the file content
     */
    async getFileContents(filePath: string): Promise<string> {
        const normalizedPath = normalizePath(filePath);
        const file = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!file || file instanceof this.app.vault.getRoot().constructor) {
            throw new Error(`File not found: ${filePath}`);
        }

        const tFile = file as TFile;
        return await this.getNodeContent(tFile);
    }

    /**
     * Module 7: Search Notes (Enhanced)
     * Search for documents matching a specified text query across all files
     * Returns search results with relevance scoring
     * @param query - Search query string
     * @param limit - Maximum number of results (default: 10)
     * @returns Array of search results sorted by relevance
     */
    searchNotesEnhanced(query: string, limit: number = 10): SearchResult[] {
        const searchFn = prepareSimpleSearch(query);
        const allFiles = this.app.vault.getMarkdownFiles();
        const results: { file: TFile; score: number }[] = [];

        for (const file of allFiles) {
            let score = 0;

            // 1. Title match (highest priority)
            const titleScore = searchFn(file.basename);
            if (titleScore) {
                score += 100 + titleScore.score * 10;
            }

            // 2. Tag match
            const cache = this.app.metadataCache.getFileCache(file);
            const tags = cache ? getAllTags(cache) : [];
            if (
                tags?.some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
            ) {
                score += 50;
            }

            // 3. Path match
            if (file.path.toLowerCase().includes(query.toLowerCase())) {
                score += 25;
            }

            if (score > 0) {
                results.push({ file, score });
            }
        }

        return results
            .sort((a, b) => b.score - a.score)
            .slice(0, limit)
            .map((r) => ({
                file: r.file,
                score: r.score,
                baseName: r.file.basename,
                path: r.file.path,
            }));
    }

    /**
     * Module 7.1: Fuzzy Search Files (Quick Switcher Style)
     * Tìm file theo kiểu Fuzzy Matching - cho phép gõ tắt, gõ sai ký tự
     * Dùng cho tính năng "Link Suggestion" khi AI cần chèn [[link]]
     *
     * Khác biệt với searchNotesEnhanced:
     * - Fuzzy: "obsapi" khớp "Obsidian API.md" (subsequence matching)
     * - Simple: Tìm từ khóa chính xác trong title/tag/path
     *
     * @param query - Search query (có thể gõ tắt)
     * @param limit - Maximum number of results (default: 10)
     * @returns Array of search results sorted by fuzzy score
     */
    fuzzySearchFiles(query: string, limit: number = 10): SearchResult[] {
        // prepareFuzzySearch: Thuật toán giống Quick Switcher (Ctrl+O)
        const fuzzyFn = prepareFuzzySearch(query);
        const allFiles = this.app.vault.getMarkdownFiles();
        const results: SearchResult[] = [];

        for (const file of allFiles) {
            // Fuzzy search trên Path (tốt hơn basename vì user có thể gõ "folder/note")
            const match = fuzzyFn(file.path);

            if (match) {
                results.push({
                    file: file,
                    score: match.score, // Score càng cao càng khớp
                    baseName: file.basename,
                    path: file.path,
                    // match.matches chứa array các đoạn [start, end] để highlight UI
                    // Có thể dùng sau này cho việc bôi đậm text
                });
            }
        }

        // Sort: Score cao nhất xếp trên (fuzzy score càng cao càng tốt)
        return results.sort((a, b) => b.score - a.score).slice(0, limit);
    }

    /**
     * Module 8: Patch Content
     * Insert content into an existing note relative to a heading, block reference, or frontmatter field
     * Uses Vault.process() for atomic updates to prevent race conditions
     * @param filePath - Path to the file
     * @param content - Content to insert
     * @param insertType - Where to insert: 'heading', 'after-heading', 'before-heading', 'block', 'after-frontmatter'
     * @param targetId - The heading text, block reference, or frontmatter field name
     */
    async patchContent(
        filePath: string,
        content: string,
        insertType:
            | "heading"
            | "after-heading"
            | "before-heading"
            | "block"
            | "after-frontmatter",
        targetId: string,
    ): Promise<void> {
        const tFile = this.getFileByPath(filePath);
        if (!tFile) {
            throw new Error(`File not found: ${filePath}`);
        }

        // Use process() for atomic update - prevents race conditions
        await this.app.vault.process(tFile, (fileContent) => {
            switch (insertType) {
                case "after-frontmatter": {
                    // Insert after frontmatter section
                    const lines = fileContent.split("\n");
                    let insertLine = 0;

                    // Skip frontmatter if it exists
                    if (lines[0] === "---") {
                        for (let i = 1; i < lines.length; i++) {
                            if (lines[i] === "---") {
                                insertLine = i + 1;
                                break;
                            }
                        }
                    }

                    lines.splice(insertLine, 0, "", content);
                    return lines.join("\n");
                }

                case "heading":
                case "before-heading": {
                    // Insert before heading
                    const headingRegex = new RegExp(
                        `^#+\\s+${this.escapeRegex(targetId)}`,
                        "m",
                    );
                    return fileContent.replace(headingRegex, `${content}\n\n$&`);
                }

                case "after-heading": {
                    // Insert after heading (before next heading or content)
                    const headingRegex = new RegExp(
                        `(^#+\\s+${this.escapeRegex(targetId)}.*)\\n`,
                        "m",
                    );
                    return fileContent.replace(headingRegex, `$1\n\n${content}\n`);
                }

                case "block": {
                    // Insert after block reference
                    const blockRegex = new RegExp(
                        `\\^${this.escapeRegex(targetId)}$`,
                        "m",
                    );
                    if (blockRegex.test(fileContent)) {
                        return fileContent.replace(blockRegex, `$&\n${content}`);
                    } else {
                        throw new Error(`Block reference not found: ^${targetId}`);
                    }
                }

                default:
                    return fileContent;
            }
        });
    }

    /**
     * Module 9: Append Content
     * Append content to a new or existing file in the vault
     * Uses Vault.process() for atomic updates to prevent race conditions
     * @param filePath - Path to the file (creates if doesn't exist)
     * @param content - Content to append
     * @param separator - Separator to use between existing and new content (default: "\n\n")
     */
    async appendContent(
        filePath: string,
        content: string,
        separator: string = "\n\n",
    ): Promise<void> {
        const normalizedPath = normalizePath(filePath);
        const file = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!file) {
            // File doesn't exist, create it
            await this.app.vault.create(normalizedPath, content);
        } else if (file instanceof this.app.vault.getRoot().constructor) {
            throw new Error(`Path is a directory, not a file: ${filePath}`);
        } else {
            // File exists, use process() for atomic append
            const tFile = file as TFile;
            await this.app.vault.process(tFile, (currentContent) => {
                // currentContent is the latest version at write time
                return currentContent + separator + content;
            });
        }
    }

    /**
     * Module 10: Delete File
     * Delete a file or directory from the vault
     * @param filePath - Path to the file or directory to delete
     * @param permanent - If true, delete permanently; if false, move to trash (default: true)
     */
    async deleteFile(filePath: string, permanent: boolean = true): Promise<void> {
        const normalizedPath = normalizePath(filePath);
        const file = this.app.vault.getAbstractFileByPath(normalizedPath);

        if (!file) {
            throw new Error(`File or directory not found: ${filePath}`);
        }

        if (permanent) {
            // Delete permanently
            await this.app.vault.delete(file, true);
        } else {
            // Move to trash
            await this.app.vault.trash(file, false);
        }
    }

    /**
     * Module 11: Graph Connections
     * Lấy danh sách các file liên kết (Forward & Backlinks)
     * Để AI hiểu ngữ cảnh xung quanh file hiện tại.
     * @param file - The file to analyze connections for
     * @returns Object containing outlinks and backlinks arrays
     */
    getRelatedFiles(file: TFile): { outlinks: string[]; backlinks: string[] } {
        const cache = this.app.metadataCache.getFileCache(file);
        const outlinks = new Set<string>();

        // 1. Get Forward Links (Links file này trỏ đi)
        if (cache?.links) {
            cache.links.forEach((link) => {
                const target = this.app.metadataCache.getFirstLinkpathDest(
                    link.link,
                    file.path,
                );
                if (target) outlinks.add(target.path);
            });
        }

        // 2. Get Backlinks (Các file trỏ tới file này) - Hơi tốn resource nếu không cache
        // Obsidian lưu resolvedLinks dạng: { [sourcePath]: { [targetPath]: count } }
        const backlinks = new Set<string>();
        const resolvedLinks = this.app.metadataCache.resolvedLinks;

        for (const [sourcePath, links] of Object.entries(resolvedLinks)) {
            if (links[file.path]) {
                // Nếu sourcePath có link tới file hiện tại
                backlinks.add(sourcePath);
            }
        }

        return {
            outlinks: Array.from(outlinks),
            backlinks: Array.from(backlinks),
        };
    }

    /**
     * Module 12: Precision Reader (Native Optimized)
     * Đọc nội dung chính xác dùng API resolveSubpath
     * Xử lý được heading trùng tên, block reference lồng nhau một cách chuẩn
     * 
     * @param file - File gốc
     * @param subpath - Ví dụ: "#Introduction" hoặc "#^blockid"
     * @returns Promise containing the section content
     */
    async readSpecificSection(file: TFile, subpath: string): Promise<string> {
        const cache = this.app.metadataCache.getFileCache(file);
        if (!cache) {
            throw new Error(`No cache available for file: ${file.path}`);
        }

        // 1. Dùng API Native để định vị (resolveSubpath không có trong public types)
        // Hàm này trả về { start: { line, col, offset }, end: ... }
        // Nó tự xử lý heading trùng tên, block ref, range heading con...
        // @ts-ignore - resolveSubpath exists but not in public API types
        const context = this.app.metadataCache.resolveSubpath(cache, subpath);

        if (!context) {
            throw new Error(`Section '${subpath}' not found via resolveSubpath`);
        }

        // 2. Đọc và cắt content
        const content = await this.getNodeContent(file);

        // start.offset và end.offset là chính xác vị trí byte
        return content.substring(context.start.offset, context.end.offset);
    }

    /**
     * Module 13: Safe Frontmatter Update
     * Cập nhật Metadata an toàn bằng API chuẩn của Obsidian
     * @param file - File cần sửa
     * @param callback - Hàm callback để mutate object frontmatter
     * @returns Promise that resolves when frontmatter is updated
     */
    async updateFrontmatter(
        file: TFile,
        callback: (frontmatter: Record<string, unknown>) => void,
    ): Promise<void> {
        await this.app.fileManager.processFrontMatter(file, (fm) => {
            callback(fm);
            // Obsidian tự động save và format lại YAML chuẩn.
        });
    }

    /**
     * Module 14: Get Active Context
     * Lấy file người dùng đang focus
     * @returns The currently active file or null if no file is active
     */
    getActiveFile(): TFile | null {
        return this.app.workspace.getActiveFile();
    }

    /**
     * Module 15: Canvas Reader
     * Đọc các node text và edge từ file .canvas (Obsidian Canvas/Mind Map)
     * Canvas files chứa visual roadmaps, flowcharts, concept maps
     * 
     * @param file - Canvas file to read
     * @returns Parsed canvas data with nodes and edges, or null if not a canvas file
     */
    async readCanvas(file: TFile): Promise<{ nodes: unknown[]; edges: unknown[] } | null> {
        if (file.extension !== 'canvas') {
            return null;
        }

        try {
            const content = await this.app.vault.cachedRead(file);
            const data = JSON.parse(content);

            // Canvas JSON structure:
            // data.nodes: Chứa text, file path, x, y, width, height
            // data.edges: Chứa quan hệ nối từ node này sang node kia
            return {
                nodes: data.nodes || [],
                edges: data.edges || []
            };
        } catch (error) {
            console.error(`Failed to parse canvas file ${file.path}:`, error);
            return null;
        }
    }

    /**
     * Helper method: Get File by Path (Safe Type Checking)
     * Validate file type như tài liệu hướng dẫn - Tránh lỗi type checking
     * @param path - Path to the file
     * @returns TFile if found and is a file, null otherwise
     */
    getFileByPath(path: string): TFile | null {
        const abstractFile = this.app.vault.getAbstractFileByPath(
            normalizePath(path),
        );

        if (abstractFile instanceof TFile) {
            return abstractFile;
        }

        return null;
    }

    /**
     * Helper method to escape regex special characters
     * @param str - String to escape
     * @returns Escaped string
     */
    private escapeRegex(str: string): string {
        return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
}
