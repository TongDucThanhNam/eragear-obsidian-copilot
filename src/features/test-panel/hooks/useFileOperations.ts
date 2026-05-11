/**
 * useFileOperations Hook
 * Manages file read/write operations
 */

import type { App } from "obsidian";
import { Notice } from "obsidian";
import { createGraphService } from "@/infra/obsidian/graph-service";
import { VaultHandler } from "@/infra/obsidian/vault-handler";

interface UseFileOperationsOptions {
    app: App;
    onAddOutput: (title: string, content: string, status: "success" | "error" | "info") => void;
}

export function useFileOperations({ app, onAddOutput }: UseFileOperationsOptions) {
    const vaultHandler = new VaultHandler(app);
    const graphService = createGraphService(app);

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

            await vaultHandler.updateFrontmatter(file, (fm) => {
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
            const tree = vaultHandler.listFilesInVault();
            onAddOutput(
                "✓ listFilesInVault()",
                tree,
                "success",
            );
            new Notice(`Vault structure generated`, 2000);
            return tree;
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
            return "";
        }

        try {
            const tree = vaultHandler.listFilesInDir(dirPath);
            onAddOutput(
                `✓ listFilesInDir("${dirPath}")`,
                tree,
                "success",
            );
            new Notice("Directory structure generated", 2000);
            return tree;
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

    const getGraphNeighborhood = (_maxHops: number = 1) => {
        try {
            const activeFile = vaultHandler.getActiveFile();
            if (!activeFile) {
                throw new Error("No active file");
            }

            // Get 1-hop neighborhood
            const result = graphService.getNeighborhood(activeFile);

            // Format output
            const outgoingNodes = result.nodes.filter(n => n.type === "outgoing");
            const incomingNodes = result.nodes.filter(n => n.type === "incoming");

            const formatted = [
                `🎯 Focal Node: ${result.focalNode.basename}`,
                `   Path: ${result.focalNode.path}`,
                "",
                `📤 Outgoing Links (${result.outgoingCount}):`,
                outgoingNodes.length > 0
                    ? outgoingNodes.map(n => `   → ${n.basename} (${n.linkCount || 1}x)`).join("\n")
                    : "   (none)",
                "",
                `📥 Incoming Links (${result.incomingCount}):`,
                incomingNodes.length > 0
                    ? incomingNodes.map(n => `   ← ${n.basename} (${n.linkCount || 1}x)`).join("\n")
                    : "   (none)",
                "",
                `📊 Total connections: ${result.nodes.length - 1}`,
            ].join("\n");

            onAddOutput(
                `✓ getGraphNeighborhood("${activeFile.basename}")`,
                formatted,
                "success",
            );
            new Notice(`Neighborhood: ${result.nodes.length - 1} connections`, 2000);
            return result;
        } catch (error) {
            onAddOutput("✗ getGraphNeighborhood()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getLinkDensity = () => {
        try {
            const activeFile = vaultHandler.getActiveFile();
            if (!activeFile) {
                throw new Error("No active file");
            }

            const density = graphService.getLinkDensity(activeFile);
            const bidirectional = graphService.getBidirectionalLinks(activeFile);

            const formatted = [
                `📊 Link Density for: ${activeFile.basename}`,
                "",
                `   📤 Outgoing: ${density.outgoing}`,
                `   📥 Incoming: ${density.incoming}`,
                `   🔄 Total: ${density.total}`,
                `   📈 Ratio (out/in): ${density.ratio.toFixed(2)}`,
                "",
                `🔗 Bidirectional Links (${bidirectional.length}):`,
                bidirectional.length > 0
                    ? bidirectional.map(p => `   ↔ ${p.split("/").pop()?.replace(/\.md$/, "")}`).join("\n")
                    : "   (none)",
            ].join("\n");

            onAddOutput(
                `✓ getLinkDensity("${activeFile.basename}")`,
                formatted,
                "success",
            );
            new Notice(`Density: ${density.total} total links`, 2000);
            return { density, bidirectional };
        } catch (error) {
            onAddOutput("✗ getLinkDensity()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
    };

    const getSmartContext = async (
        maxDepth: number = 2,
        targetPath?: string,
    ) => {
        try {
            const file = targetPath?.trim()
                ? vaultHandler.getFileByPath(targetPath.trim())
                : vaultHandler.getActiveFile();

            if (!file) throw new Error("No active file");

            const depth = Number.isFinite(maxDepth) ? Math.max(0, Math.min(10, maxDepth)) : 2;
            const result = await graphService.getSmartContext(file, depth);

            const top = result.relatedFiles.slice(0, 20);

            const relatedForAi = top.map((path) => {
                const info = result.nodeMap[path];
                return {
                    path,
                    title: path.split("/").pop()?.replace(/\.md$/, "") || path,
                    hop: info?.hop ?? null,
                    relation: info?.type ?? null,
                    degree: info?.linkCount ?? null,
                };
            });

            const aiPayload = {
                kind: "graph_context_snapshot_v1",
                focal: {
                    path: file.path,
                    title: file.basename,
                },
                depth,
                stats: result.stats,
                related: relatedForAi,
                note: "Use hop=1 and bidirectional first; hop=2+ as supporting context.",
            };

            const formatted = [
                `## Graph Context (Worker, resolvedLinks snapshot)`,
                `- Focal: ${file.basename} (\`${file.path}\`)`,
                `- Depth: ${depth}`,
                `- Related files: ${result.relatedFiles.length}`,
                `- Nodes processed: ${result.stats.totalNodes}`,
                `- Execution: ${result.stats.executionMs.toFixed(1)}ms`,
                "",
                "### Ranked related notes (top)",
                top.length > 0
                    ? top
                        .map((p, i) => {
                            const info = result.nodeMap[p];
                            const title = p.split("/").pop()?.replace(/\.md$/, "") || p;
                            const hop = info?.hop ?? "?";
                            const rel = info?.type ?? "?";
                            const deg = info?.linkCount ?? "?";
                            return `${i + 1}. ${title} (hop=${hop}, rel=${rel}, degree=${deg}) — \`${p}\``;
                        })
                        .join("\n")
                    : "(none)",
                "",
                "### AI prompt payload (paste as JSON)",
                "```json",
                JSON.stringify(aiPayload, null, 2),
                "```",
            ].join("\n");

            onAddOutput(
                `✓ getSmartContext("${file.basename}")`,
                formatted,
                "success",
            );
            new Notice(`Smart context: ${result.relatedFiles.length} files`, 2000);
            return result;
        } catch (error) {
            onAddOutput("✗ getSmartContext()", `Error: ${error}`, "error");
            new Notice(`Failed: ${error}`, 2000);
            throw error;
        }
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
        getGraphNeighborhood,
        getLinkDensity,
        getSmartContext,
    };
}
