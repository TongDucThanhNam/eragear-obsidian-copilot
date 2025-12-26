# Eragear Copilot - API Reference

## VaultHandler Class

The `VaultHandler` is the core service for accessing vault data in Eragear Copilot.

### Import
```typescript
import { VaultHandler } from './core/vault-handler';

// Create instance (usually done in plugin)
const vaultHandler = new VaultHandler(app);
```

### Methods

#### 1. getNodeContent()

Reads the complete content of a note file.

```typescript
async getNodeContent(file: TFile): Promise<string>
```

**Parameters:**
- `file: TFile` - The file to read

**Returns:**
- `Promise<string>` - Complete markdown content

**Example:**
```typescript
const activeFile = app.workspace.getActiveFile();
if (activeFile) {
  const content = await vaultHandler.getNodeContent(activeFile);
  console.log(content);
}
```

**Performance:**
- Uses `app.vault.cachedRead()` for optimization
- Returns instantly from cache if not recently modified
- Safe for frequent calls

---

#### 2. getNoteStructure()

Extracts the table of contents from a note.

```typescript
getNoteStructure(file: TFile): string
```

**Parameters:**
- `file: TFile` - The file to analyze

**Returns:**
- `string` - Markdown-formatted outline, or error message if no headings

**Example:**
```typescript
const activeFile = app.workspace.getActiveFile();
if (activeFile) {
  const toc = vaultHandler.getNoteStructure(activeFile);
  console.log(toc);
  // Output:
  // # Introduction
  // ## Background
  // ### History
  // ## Main Content
  // ### Section A
  // ### Section B
}
```

**Output Format:**
- One heading per line
- Markdown syntax: `# H1`, `## H2`, `### H3`, etc.
- Each line represents one heading from the note
- Empty string if no headings found
- Max depth: H6

**Use Cases:**
- Quick overview of document structure
- Identify document organization
- Plan new sections
- Generate navigation

---

#### 3. getNoteMetadata()

Extracts metadata information from a note.

```typescript
getNoteMetadata(file: TFile): string
```

**Parameters:**
- `file: TFile` - The file to analyze

**Returns:**
- `string` - JSON string containing tags and frontmatter

**Example:**
```typescript
const activeFile = app.workspace.getActiveFile();
if (activeFile) {
  const metadata = vaultHandler.getNoteMetadata(activeFile);
  console.log(metadata);
  // Output:
  // {
  //   "tags": ["#work", "#project", "#important"],
  //   "frontmatter": {
  //     "created": "2025-01-15",
  //     "author": "John Doe",
  //     "status": "draft"
  //   }
  // }
}
```

**Output Format:**
- JSON string with two properties:
  - `tags: string[]` - Array of tags from the note
  - `frontmatter: Record<string, any>` - YAML frontmatter as object

**Data Extracted:**
- Tags from YAML front matter
- All frontmatter key-value pairs
- Supports nested structures in frontmatter

**Use Cases:**
- Verify tag assignments
- Check custom metadata
- Validate properties
- Organization audits

---

#### 4. searchNotes()

Searches the vault for notes matching a keyword.

```typescript
searchNotes(query: string, limit?: number): TFile[]
```

**Parameters:**
- `query: string` - Search keyword (required)
- `limit: number` - Maximum results (optional, default: 5)

**Returns:**
- `TFile[]` - Array of matching files, sorted by relevance

**Example:**
```typescript
// Basic search
const results = vaultHandler.searchNotes("Python");
results.forEach(file => {
  console.log(`${file.basename} (${file.path})`);
});

// Search with limit
const topResults = vaultHandler.searchNotes("AI", 10);

// Search with exact limit
const results = vaultHandler.searchNotes("project", 3);
```

**Ranking Algorithm:**
1. **Title Match** (score: 10+)
   - File basename contains query
   - Exact match gets highest score
   - Partial matches still ranked high

2. **Tag Match** (score: 5)
   - File tags contain query
   - Any tag substring match counts

3. **Not Implemented Yet:**
   - Content search (coming in Phase 3)
   - Due to performance concerns
   - Will use Web Workers when implemented

**Example Results:**
```typescript
// Query: "meeting"
// Results returned in order:
// 1. "meeting-notes.md" (title match - score 15)
// 2. "2025-weekly-meeting.md" (title match - score 12)
// 3. "project-status.md" (tag: #meeting - score 5)
```

**Performance:**
- Fast: Uses Obsidian's built-in search
- Cached: Results from metadata cache
- Scalable: Optimized for vaults < 2000 notes
- Thread: Runs on main thread (currently)

**Limitations:**
- Doesn't search file content yet
- Max results per query: 1000 (practical limit)
- Case-insensitive search only

**Use Cases:**
- Find related notes
- Discover existing content
- Organize by keywords
- Tag-based discovery

---

## React Components

### EragearComponent

Main component that contains tab navigation.

```typescript
interface EragearComponentProps {
  app: App;  // Obsidian App instance
}

<EragearComponent app={app} />
```

**Props:**
- `app: App` - Obsidian application instance (required)

**Tabs:**
- Chat - Chat interface for AI interaction
- Test - Testing and debugging interface

---

### ChatPanel

Chat interface component.

```typescript
<ChatPanel />
```

**State:**
- Messages: Array of chat messages
- Input: Current user input text
- IsLoading: Whether awaiting response

**Props:** None

**Features:**
- Auto-scroll on new messages
- Typing indicator
- Message timestamps
- Enter-to-send
- Shift+Enter for newline

---

### TestPanel

Testing interface with three sub-tabs.

```typescript
interface TestPanelProps {
  app: App;  // Obsidian App instance
}

<TestPanel app={app} />
```

**Props:**
- `app: App` - Obsidian application instance (required)

**Sub-tabs:**

1. **Search Tab**
   - State: `searchQuery`, `searchResults`
   - Methods: `handleSearch()`, `handleKeyPress()`
   - Components: Input field, result list

2. **Structure Tab**
   - State: `tocResult`, `isLoading`
   - Methods: `handleGetStructure()`
   - Components: Button, code output

3. **Metadata Tab**
   - State: `metadataResult`, `isLoading`
   - Methods: `handleGetMetadata()`
   - Components: Button, JSON output

---

## EragearView Class

Obsidian view container for React components.

```typescript
export class EragearView extends ItemView {
  root: Root | null;
  constructor(leaf: WorkspaceLeaf);
  getViewType(): string;
  getDisplayText(): string;
  getIcon(): string;
  async onOpen(): Promise<void>;
  async onClose(): Promise<void>;
}
```

**Constants:**
```typescript
export const ERAGEAR_VIEW_TYPE = 'eragear-copilot-view';
```

**Lifecycle:**
- `onOpen()` - Called when view opens, mounts React
- `onClose()` - Called when view closes, unmounts React

---

## Plugin Main Class

The main plugin class that manages lifecycle.

```typescript
export default class EragearPlugin extends Plugin {
  settings: MyPluginSettings;
  vaultHandler: VaultHandler;
  
  async onload(): Promise<void>;
  onunload(): void;
  async loadSettings(): Promise<void>;
  async saveSettings(): Promise<void>;
  async activateView(): Promise<void>;
}
```

**Methods:**

### activateView()

Opens or focuses the Eragear Copilot sidebar.

```typescript
async activateView(): Promise<void>
```

**Behavior:**
- If view is open: focuses it
- If view is closed: opens in right sidebar
- Automatically reveals the leaf
- Creates new leaf if necessary

**Example:**
```typescript
await plugin.activateView();
```

---

## Type Definitions

### MyPluginSettings

Plugin configuration interface.

```typescript
interface MyPluginSettings {
  mySetting: string;           // General setting
  apiEndpoint: string;         // Eragear API URL
  enableDebugMode: boolean;    // Debug flag
}

const DEFAULT_SETTINGS: MyPluginSettings = {
  mySetting: 'default',
  apiEndpoint: 'https://eragear.app',
  enableDebugMode: false
};
```

### Message (ChatPanel)

Chat message interface.

```typescript
interface Message {
  id: string;                      // Unique identifier
  role: 'user' | 'assistant';     // Message sender
  content: string;                 // Message text
  timestamp: Date;                 // When sent
}
```

### SearchResult (TestPanel)

Search result interface.

```typescript
interface SearchResult {
  path: string;      // Full file path
  basename: string;  // Filename only
}
```

---

## Obsidian API Usage

### App Instance

```typescript
// Get active file
const activeFile = app.workspace.getActiveFile();

// Get all markdown files
const allFiles = app.vault.getMarkdownFiles();

// Get file cache
const cache = app.metadataCache.getFileCache(file);
```

### Vault Operations

```typescript
// Read file content (cached)
const content = await app.vault.cachedRead(file);

// Get file cache
const cache = app.metadataCache.getFileCache(file);

// Get all tags
const tags = getAllTags(cache);
```

### Workspace

```typescript
// Get right sidebar leaf
const leaf = app.workspace.getRightLeaf(false);

// Set view state
await leaf.setViewState({ type: ERAGEAR_VIEW_TYPE, active: true });

// Get leaves of type
const leaves = app.workspace.getLeavesOfType(ERAGEAR_VIEW_TYPE);

// Reveal leaf
app.workspace.revealLeaf(leaf);
```

---

## Error Handling

### VaultHandler Errors

```typescript
try {
  const structure = vaultHandler.getNoteStructure(file);
  if (!structure || structure.includes('No structure found')) {
    console.warn('File has no headings');
  }
} catch (error) {
  console.error('Failed to get structure:', error);
}
```

### React Component Errors

```typescript
try {
  const results = vaultHandler.searchNotes(query);
  setSearchResults(results);
} catch (error) {
  console.error('Search error:', error);
  setSearchResults([]);
}
```

---

## Performance Tips

### Optimize Search
- Use specific keywords
- Limit results with `limit` parameter
- Cache results if needed

### Optimize Structure
- Only call when needed
- Cache results if accessed frequently
- Useful for displaying TOC

### Optimize Metadata
- Read once and cache
- Reuse across component renders
- Only read on demand

### React Best Practices
- Use `useMemo` for expensive operations
- Use `useCallback` for stable function references
- Memoize components with `memo`

---

## Examples

### Complete Chat Integration Example

```typescript
// In ChatPanel.tsx
const handleSendMessage = async () => {
  if (!input.trim()) return;
  
  setInput('');
  setIsLoading(true);
  
  try {
    // Get vault context
    const activeFile = app.workspace.getActiveFile();
    const content = activeFile ? 
      await vaultHandler.getNodeContent(activeFile) : null;
    
    // Send to API
    const response = await fetch('https://eragear.app/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: input,
        context: content,
        timestamp: new Date()
      })
    });
    
    const data = await response.json();
    
    // Add response to messages
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: data.message,
      timestamp: new Date()
    }]);
  } catch (error) {
    console.error('API error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

### Complete Search Integration Example

```typescript
// In TestPanel.tsx
const handleSearch = () => {
  if (!searchQuery.trim()) return;
  
  setIsLoading(true);
  try {
    const results = vaultHandler.searchNotes(searchQuery, 10);
    
    // Get metadata for each result
    const enriched = results.map(file => ({
      path: file.path,
      basename: file.basename,
      tags: JSON.parse(vaultHandler.getNoteMetadata(file)).tags
    }));
    
    setSearchResults(enriched);
  } catch (error) {
    console.error('Search error:', error);
  } finally {
    setIsLoading(false);
  }
};
```

---

## Changelog

### Version 1.0.0 (December 26, 2025)
- ✅ Initial release
- ✅ VaultHandler implementation
- ✅ Chat panel
- ✅ Test panel with 3 sub-tabs
- ✅ Obsidian integration

---

## Support & Issues

For issues, feature requests, or API questions:
1. Check this documentation first
2. Review GitHub issues
3. Open new issue with details
4. Include Obsidian version and plugin version

---

**Last Updated:** December 26, 2025  
**API Version:** 1.0.0  
**Status:** Stable
