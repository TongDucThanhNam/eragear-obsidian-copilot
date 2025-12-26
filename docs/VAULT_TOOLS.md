# Vault Tools API Reference

This document describes the vault manipulation tools available in the EraGear Obsidian Copilot plugin.

## Overview

The `VaultHandler` class provides comprehensive tools for interacting with your Obsidian vault. All methods are designed to be safe, performant, and non-blocking.

## Tools

### 1. `listFilesInVault()`

Lists all files and directories in the root directory of your Obsidian vault.

**Signature:**
```typescript
listFilesInVault(): FileListItem[]
```

**Returns:**
```typescript
interface FileListItem {
    name: string;           // File/directory name
    path: string;          // Full path from vault root
    isDirectory: boolean;  // Whether it's a folder
    isFile: boolean;       // Whether it's a file
}
```

**Example:**
```typescript
const items = vaultHandler.listFilesInVault();
items.forEach(item => {
    console.log(`${item.name} (${item.isDirectory ? 'Folder' : 'File'})`);
});
```

---

### 2. `listFilesInDir(dirPath)`

Lists all files and directories in a specific Obsidian directory.

**Signature:**
```typescript
listFilesInDir(dirPath: string): FileListItem[]
```

**Parameters:**
- `dirPath` (string): Path to the directory (e.g., `"folder/subfolder"`)

**Returns:** Array of `FileListItem` objects

**Throws:** Error if directory doesn't exist

**Example:**
```typescript
const items = vaultHandler.listFilesInDir("projects/active");
```

---

### 3. `getFileContents(filePath)`

Returns the complete content of a single file in your vault.

**Signature:**
```typescript
async getFileContents(filePath: string): Promise<string>
```

**Parameters:**
- `filePath` (string): Path to the file (e.g., `"folder/note.md"`)

**Returns:** Promise containing the file content as a string

**Throws:** Error if file doesn't exist

**Example:**
```typescript
const content = await vaultHandler.getFileContents("notes/my-note.md");
console.log(content);
```

---

### 4. `search(query, limit)`

Search for documents matching a specified text query across all files in the vault. Results are ranked by relevance score.

**Signature:**
```typescript
searchNotesEnhanced(query: string, limit: number = 10): SearchResult[]
```

**Parameters:**
- `query` (string): Search term
- `limit` (number, optional): Maximum number of results (default: 10)

**Returns:**
```typescript
interface SearchResult {
    file: TFile;           // Obsidian TFile object
    score: number;         // Relevance score
    baseName: string;      // File name without extension
    path: string;          // Full file path
}
```

**Scoring:**
- Title match: +100 (highest priority)
- Tag match: +50
- Path match: +25

**Example:**
```typescript
const results = vaultHandler.searchNotesEnhanced("machine learning", 5);
results.forEach(result => {
    console.log(`${result.baseName} (score: ${result.score})`);
});
```

---

### 5. `patchContent(filePath, content, insertType, targetId)`

Insert content into an existing note relative to a heading, block reference, or frontmatter field.

**Signature:**
```typescript
async patchContent(
    filePath: string,
    content: string,
    insertType: "heading" | "after-heading" | "before-heading" | "block" | "after-frontmatter",
    targetId: string
): Promise<void>
```

**Parameters:**
- `filePath` (string): Path to the file
- `content` (string): Content to insert
- `insertType` (string): Where to insert:
  - `"after-frontmatter"`: After the frontmatter section
  - `"heading"` or `"before-heading"`: Before a specific heading
  - `"after-heading"`: After a specific heading
  - `"block"`: After a block reference
- `targetId` (string): The heading text, block reference ID, or frontmatter field name

**Throws:** Error if target not found

**Examples:**
```typescript
// Insert after frontmatter
await vaultHandler.patchContent(
    "notes/my-note.md",
    "## New Section\nContent here",
    "after-frontmatter",
    ""
);

// Insert after a heading
await vaultHandler.patchContent(
    "notes/my-note.md",
    "Additional information",
    "after-heading",
    "Background"
);

// Insert after a block reference
await vaultHandler.patchContent(
    "notes/my-note.md",
    "Follow-up comment",
    "block",
    "my-block-id"
);
```

---

### 6. `appendContent(filePath, content, separator)`

Append content to a new or existing file in the vault.

**Signature:**
```typescript
async appendContent(
    filePath: string,
    content: string,
    separator: string = "\n\n"
): Promise<void>
```

**Parameters:**
- `filePath` (string): Path to the file (creates if doesn't exist)
- `content` (string): Content to append
- `separator` (string, optional): Separator between existing and new content (default: `"\n\n"`)

**Behavior:**
- If file doesn't exist, creates it with the provided content
- If file exists, appends content with the specified separator

**Example:**
```typescript
// Create or append to a file
await vaultHandler.appendContent(
    "logs/daily-log.md",
    "## 2025-12-26\nCompleted task A",
    "\n\n---\n\n"
);
```

---

### 7. `deleteFile(filePath, permanent)`

Delete a file or directory from your vault.

**Signature:**
```typescript
async deleteFile(filePath: string, permanent: boolean = true): Promise<void>
```

**Parameters:**
- `filePath` (string): Path to the file or directory to delete
- `permanent` (boolean, optional): If true, delete permanently; if false, move to trash (default: true)

**Throws:** Error if file/directory doesn't exist

**Example:**
```typescript
// Move to trash (recoverable)
await vaultHandler.deleteFile("temp/draft.md", false);

// Delete permanently (non-recoverable)
await vaultHandler.deleteFile("temp/old-file.md", true);
```

---

## Integration Examples

### Building a File Browser
```typescript
async function showVaultStructure() {
    const rootItems = vaultHandler.listFilesInVault();
    for (const item of rootItems) {
        if (item.isDirectory) {
            const subItems = vaultHandler.listFilesInDir(item.path);
            console.log(`📁 ${item.name}/`);
            subItems.forEach(sub => {
                console.log(`  📄 ${sub.name}`);
            });
        }
    }
}
```

### Building a Search and Preview Feature
```typescript
async function searchAndPreview(query: string) {
    const results = vaultHandler.searchNotesEnhanced(query, 5);
    for (const result of results) {
        const content = await vaultHandler.getFileContents(result.path);
        console.log(`\n=== ${result.baseName} ===`);
        console.log(content.slice(0, 200) + "...");
    }
}
```

### Building a Note Logging System
```typescript
async function logToVault(logEntry: string) {
    const today = new Date().toISOString().split('T')[0];
    const logPath = `logs/${today}.md`;
    
    await vaultHandler.appendContent(
        logPath,
        `- ${new Date().toLocaleTimeString()}: ${logEntry}`
    );
}
```

---

## Performance Considerations

- **File reading**: Uses `cachedRead()` for optimal performance on unchanged files
- **Searching**: Prioritizes title and tag matching to avoid full content scans
- **Directory listing**: Instant, uses vault's file tree structure
- **Large vaults**: All operations are non-blocking and won't freeze the UI

## Error Handling

All methods throw descriptive errors if operations fail:

```typescript
try {
    const content = await vaultHandler.getFileContents("nonexistent.md");
} catch (error) {
    console.error(error.message); // "File not found: nonexistent.md"
}
```

## Security & Permissions

- All file operations respect Obsidian's vault access patterns
- Path normalization prevents directory traversal attacks
- Files are read/written within the vault boundary only
