/**
 * useFileOperations Hook
 * Manages file read/write operations
 */

import { Notice } from "obsidian";
import { VaultHandler } from "../../core/vault-handler";
import type { TestOutput } from "../types";

interface UseFileOperationsOptions {
    app: any;
    onAddOutput: (title: string, content: string, status: "success" | "error" | "info") => void;
}

export function useFileOperations({ app, onAddOutput }: UseFileOperationsOptions) {
    const vaultHandler = new VaultHandler(app);

    const getFileContents = async (targetPath: string) => {
        try {
            const content = await vaultHandler.getFileContents(targetPath);
            const preview =
                content.slice(0, 500) +
                (content.length > 500 ? "\n\n[... truncated]" : "");
            onAddOutput(
                `✓ getFileContents("${targetPath}")`,
                `File size: ${content.length} bytes\n\n${preview}`,
                "success",
            );
            new Notice("File loaded", 2000);
            return content;
        } catch (error) {
            onAddOutput("✗ getFileContents()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const appendContent = async (targetPath: string, appendText: string) => {
        try {
            await vaultHandler.appendContent(targetPath, appendText, "\n\n");
            onAddOutput(
                `✓ appendContent("${targetPath}")`,
                `Appended ${appendText.length} characters`,
                "success",
            );
            new Notice("Content appended", 2000);
        } catch (error) {
            onAddOutput("✗ appendContent()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const patchContent = async (targetPath: string) => {
        try {
            await vaultHandler.patchContent(
                targetPath,
                `\n\n*Patched by Eragear at ${new Date().toLocaleString()}*`,
                "after-frontmatter",
                "",
            );
            onAddOutput(
                `✓ patchContent("${targetPath}")`,
                "Patched after frontmatter",
                "success",
            );
            new Notice("Content patched", 2000);
        } catch (error) {
            onAddOutput("✗ patchContent()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const deleteFile = async (targetPath: string) => {
        try {
            await vaultHandler.deleteFile(targetPath, false);
            onAddOutput(
                `✓ deleteFile("${targetPath}")`,
                "File moved to trash",
                "success",
            );
            new Notice("File deleted", 2000);
        } catch (error) {
            onAddOutput("✗ deleteFile()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const updateFrontmatter = async (targetPath: string) => {
        try {
            const file = vaultHandler.getFileByPath(targetPath);
            if (!file) {
                throw new Error(`File not found: ${targetPath}`);
            }

            await vaultHandler.updateFrontmatter(file, (fm: any) => {
                fm.eragear_test_timestamp = new Date().toISOString();
                fm.eragear_test = true;
            });

            onAddOutput(
                `✓ updateFrontmatter("${targetPath}")`,
                "Frontmatter updated with test fields",
                "success",
            );
            new Notice("Frontmatter updated", 2000);
        } catch (error) {
            onAddOutput("✗ updateFrontmatter()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const readSpecificSection = async (targetPath: string, subpath: string) => {
        try {
            const file = vaultHandler.getFileByPath(targetPath);
            if (!file) {
                throw new Error(`File not found: ${targetPath}`);
            }

            const content = await vaultHandler.readSpecificSection(file, subpath);
            const preview =
                content.slice(0, 500) +
                (content.length > 500 ? "\n\n[... truncated]" : "");
            onAddOutput(
                `✓ readSpecificSection("${targetPath}", "${subpath}")`,
                `Section size: ${content.length} chars\n\n${preview}`,
                "success",
            );
            new Notice("Section retrieved", 2000);
            return content;
        } catch (error) {
            onAddOutput("✗ readSpecificSection()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const readCanvas = async (targetPath: string) => {
        try {
            const file = vaultHandler.getFileByPath(targetPath);
            if (!file) {
                throw new Error(`File not found: ${targetPath}`);
            }

            const canvasData = await vaultHandler.readCanvas(file);
            if (!canvasData) {
                throw new Error("Invalid canvas file");
            }

            const formatted = `📊 Canvas Data:\nNodes: ${canvasData.nodes.length}\nEdges: ${canvasData.edges.length}`;
            onAddOutput(`✓ readCanvas("${targetPath}")`, formatted, "success");
            new Notice("Canvas loaded", 2000);
            return canvasData;
        } catch (error) {
            onAddOutput("✗ readCanvas()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const listFilesInVault = () => {
        try {
            const items = vaultHandler.listFilesInVault();
            const formatted = items
                .map(
                    (item: any) =>
                        `${item.isDirectory ? "📁" : "📄"} ${item.name}`,
                )
                .join("\n");
            onAddOutput(
                "✓ listFilesInVault()",
                `Found ${items.length} items:\n\n${formatted}`,
                "success",
            );
            new Notice(`Found ${items.length} items`, 2000);
            return items;
        } catch (error) {
            onAddOutput("✗ listFilesInVault()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const listFilesInDir = (dirPath: string) => {
        if (!dirPath.trim()) {
            onAddOutput("✗ listFilesInDir()", "Enter directory path", "info");
            new Notice("No directory specified", 2000);
            return [];
        }

        try {
            const items = vaultHandler.listFilesInDir(dirPath);
            const formatted = items
                .map(
                    (item: any) =>
                        `${item.isDirectory ? "📁" : "📄"} ${item.name}`,
                )
                .join("\n");
            onAddOutput(
                `✓ listFilesInDir("${dirPath}")`,
                `Found ${items.length} items:\n\n${formatted}`,
                "success",
            );
            new Notice(`Found ${items.length} items`, 2000);
            return items;
        } catch (error) {
            onAddOutput(
                `✗ listFilesInDir("${dirPath}")`,
                `Error: ${error}`,
                "error",
            );
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getRelatedFiles = () => {
        try {
            const activeFile = vaultHandler.getActiveFile();
            if (!activeFile) {
                throw new Error("No active file");
            }

            const { outlinks, backlinks } = vaultHandler.getRelatedFiles(activeFile);
            const formatted = `📤 Outlinks (${outlinks.length}):\n${outlinks.length > 0
                    ? outlinks.map((p) => `  → ${p}`).join("\n")
                    : "  (none)"
                }\n\n📥 Backlinks (${backlinks.length}):\n${backlinks.length > 0
                    ? backlinks.map((p) => `  ← ${p}`).join("\n")
                    : "  (none)"
                }`;
            onAddOutput(
                `✓ getRelatedFiles("${activeFile.basename}")`,
                formatted,
                "success",
            );
            new Notice("Links retrieved", 2000);
            return { outlinks, backlinks };
        } catch (error) {
            onAddOutput("✗ getRelatedFiles()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getNoteStructure = () => {
        try {
            const activeFile = vaultHandler.getActiveFile();
            if (!activeFile) {
                throw new Error("No active file");
            }

            const structure = vaultHandler.getNoteStructure(activeFile);
            onAddOutput(
                `✓ getNoteStructure("${activeFile.basename}")`,
                structure || "(No headings found)",
                "success",
            );
            new Notice("Structure retrieved", 2000);
            return structure;
        } catch (error) {
            onAddOutput("✗ getNoteStructure()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getMetadata = () => {
        try {
            const activeFile = vaultHandler.getActiveFile();
            if (!activeFile) {
                throw new Error("No active file");
            }

            const metadata = vaultHandler.getNoteMetadata(activeFile);
            onAddOutput(
                `✓ getNoteMetadata("${activeFile.basename}")`,
                metadata,
                "success",
            );
            new Notice("Metadata retrieved", 2000);
            return metadata;
        } catch (error) {
            onAddOutput("✗ getNoteMetadata()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getActiveFile = () => {
        const activeFile = vaultHandler.getActiveFile();
        if (!activeFile) {
            onAddOutput("✓ getActiveFile()", "No file currently active", "info");
            new Notice("No active file", 2000);
        } else {
            onAddOutput(
                "✓ getActiveFile()",
                `Active: ${activeFile.basename}\nPath: ${activeFile.path}\nSize: ${activeFile.stat.size} bytes`,
                "success",
            );
            new Notice(`Active: ${activeFile.basename}`, 2000);
        }
        return activeFile;
    };

    return {
        getFileContents,
        appendContent,
        patchContent,
        deleteFile,
        updateFrontmatter,
        readSpecificSection,
        readCanvas,
        listFilesInVault,
        listFilesInDir,
        getRelatedFiles,
        getNoteStructure,
        getMetadata,
        getActiveFile,
    };
}
