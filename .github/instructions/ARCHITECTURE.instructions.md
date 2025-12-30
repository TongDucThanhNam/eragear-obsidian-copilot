---
applyTo: '**'
---

# Architecture Overview - EraGear Obsidian Copilot

This document provides a comprehensive overview of the plugin's architecture, data flow, and component interactions.

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│       Obsidian Vault & Workspace        │
├─────────────────────────────────────────┤
│                                         │
│  src/main.ts (Plugin Lifecycle)         │
│  ├─ onload()                            │
│  └─ onunload()                          │
│                                         │
│  src/core/vault-handler.ts              │
│  └─ VaultHandler (File operations)      │
│                                         │
│  src/ui/EragearComponent.tsx            │
│  └─ Main React Component Container      │
│     ├─ ChatPanel                        │
│     └─ TestPanel                        │
│        ├─ State Management              │
│        ├─ Custom Hooks                  │
│        ├─ Tab Renderers                 │
│        └─ Components                    │
│                                         │
└─────────────────────────────────────────┘
```

## Component Hierarchy

### 1. Main Entry Point: EragearComponent.tsx

```typescript
<EragearComponent>
  ├─ <ChatPanel />           // Chat interface (separate view)
  └─ <TestPanel />           // Test/operations panel
     ├─ <GlobalContextBar /> // File selection context
     ├─ <TabNavigation />    // Tab switcher
     ├─ [Tab Renderer]       // Dynamic content based on activeTab
     │  ├─ SearchTabRenderer
     │  ├─ OperationsTabRenderer
     │  ├─ InfoTabRenderer
     │  ├─ FilesTabRenderer
     │  └─ LabsTabRenderer
     └─ <ConsoleLog />       // Output display
```

## State Management Flow

### TestPanel State Architecture

```
TestPanel Component
│
├─ Core State (useState)
│  ├─ activeTab: TabId          // Current tab: "search" | "operations" | "info" | "files" | "labs"
│  ├─ selectedFile: TFile | null // Currently selected file
│  └─ isLoading: boolean         // Global loading state
│
├─ Tab-Specific State (useState)
│  ├─ searchState
│  │  ├─ quickSearchQuery: string
│  │  ├─ enhancedSearchQuery: string
│  │  ├─ fuzzyQuery: string
│  │  └─ results: any[]
│  │
│  ├─ opsState
│  │  ├─ getContentsPath: string
│  │  ├─ appendContentPath: string
│  │  ├─ appendContent: string
│  │  ├─ patchContentPath: string
│  │  ├─ patchContent: string
│  │  ├─ deleteFilePath: string
│  │  └─ readSectionPath: string
│  │
│  ├─ infoState
│  │  └─ updateFrontmatterPath: string
│  │
│  ├─ filesState
│  │  └─ dirPath: string
│  │
│  └─ labsState
│     ├─ readSectionPath: string
│     ├─ readCanvasPath: string
│     └─ readCanvasLocation: string
│
├─ Hook States (Custom Hooks)
│  ├─ useTestOutput()
│  │  ├─ testOutputs: TestOutput[]
│  │  ├─ addTestOutput(output: TestOutput)
│  │  └─ clearTestOutputs()
│  │
│  ├─ useSearch({ app, onAddOutput })
│  │  ├─ searchResults: any[]
│  │  ├─ handleQuickSearch(query: string)
│  │  ├─ handleEnhancedSearch(query: string)
│  │  └─ handleFuzzySearch(query: string)
│  │
│  └─ useFileOperations({ app, onAddOutput })
│     ├─ handleGetStructure()
│     ├─ handleGetContents()
│     ├─ handleAppendContent()
│     ├─ handlePatchContent()
│     ├─ handleDeleteFile()
│     ├─ handleUpdateFrontmatter()
│     ├─ handleGetMetadata()
│     ├─ handleGetActiveFile()
│     ├─ handleListVault()
│     ├─ handleListDir()
│     ├─ handleReadSection()
│     ├─ handleReadCanvas()
│     └─ handleGetRelated()
│
└─ Derived State (useMemo)
   └─ Tab configuration from constants.TABS
```

## Data Flow Diagrams

### Search Tab Flow

```
SearchTabRenderer Component
│
├─ Props from TestPanel
│  ├─ searchState (input values)
│  ├─ isLoading
│  ├─ handlers: onQuickSearchChange, onQuickSearch, etc.
│  └─ testOutputs
│
├─ User Input
│  └─ Type in search fields
│
├─ Event Handlers
│  └─ handleQuickSearch()
│     └─ setState(searchQuery)
│
├─ Hook Processing (useSearch)
│  ├─ Call VaultHandler.quickSearch()
│  ├─ Set searchResults
│  └─ addTestOutput({ status: "success", ... })
│
└─ Output
   └─ ConsoleLog displays results
      └─ testOutputs array updated
```

### File Operations Tab Flow

```
OperationsTabRenderer Component
│
├─ Props from TestPanel
│  ├─ opsState (input paths)
│  ├─ isLoading
│  ├─ selectedFile
│  ├─ handlers: onGetContentsPathChange, onGetContents, etc.
│  └─ testOutputs
│
├─ User Input
│  └─ Click action button (Get Contents, Append, etc.)
│
├─ Event Handler
│  └─ handleGetContents() or handleAppendContent(), etc.
│     ├─ Validate file/path
│     ├─ setIsLoading(true)
│     └─ Call VaultHandler method
│
├─ Hook Processing (useFileOperations)
│  ├─ Perform file operation
│  ├─ Create TestOutput with result
│  ├─ addTestOutput(...)
│  └─ setIsLoading(false)
│
└─ Output
   └─ ConsoleLog displays operation result
      └─ testOutputs array updated
```

## Custom Hooks Architecture

### useTestOutput Hook

**Purpose**: Manage test output history and display

```typescript
interface TestOutput {
  id: string;
  timestamp: number;
  status: "success" | "error" | "info" | "loading";
  title: string;
  message: string;
  data?: any;
}

Hook State:
  testOutputs: TestOutput[] // Max 10 items (FIFO rotation)

Functions:
  addTestOutput(output: Omit<TestOutput, 'id' | 'timestamp'>)
    → Generates id and timestamp
    → Adds to array
    → Keeps only last 10

  clearTestOutputs()
    → Empties array
    → Called by user action
```

### useSearch Hook

**Purpose**: Encapsulate all search functionality

```typescript
Hook State:
  searchResults: any[]

Functions:
  handleQuickSearch(query: string)
    → Calls VaultHandler.quickSearch()
    → Updates searchResults
    → Adds TestOutput

  handleEnhancedSearch(query: string)
    → Calls VaultHandler.enhancedSearch()
    → Returns filtered results
    → Adds TestOutput

  handleFuzzySearch(query: string)
    → Calls VaultHandler.fuzzySearch()
    → Returns fuzzy-matched results
    → Adds TestOutput

Dependencies:
  - app: Obsidian App instance
  - onAddOutput: Callback to parent's addTestOutput
```

### useFileOperations Hook

**Purpose**: Encapsulate all file operation methods

```typescript
Functions (13 total):
  handleGetStructure()
    → Calls VaultHandler.getVaultStructure()
    → Returns folder/file tree

  handleGetContents(path: string)
    → Calls VaultHandler.getFileContents(path)
    → Returns file contents

  handleAppendContent(path: string, content: string)
    → Calls VaultHandler.appendContent(path, content)
    → Updates file

  handlePatchContent(path: string, content: string)
    → Calls VaultHandler.patchContent(path, content)
    → Replaces content

  handleDeleteFile(path: string)
    → Calls VaultHandler.deleteFile(path)
    → Removes file

  handleUpdateFrontmatter(path: string, data: Record<string, any>)
    → Calls VaultHandler.updateFrontmatter(path, data)
    → Updates YAML frontmatter

  handleGetMetadata(path: string)
    → Calls VaultHandler.getFileMetadata(path)
    → Returns file metadata

  handleGetActiveFile()
    → Calls app.workspace.getActiveFile()
    → Returns currently open file

  handleListVault()
    → Calls VaultHandler.listVaultRoot()
    → Returns root files/folders

  handleListDir(path: string)
    → Calls VaultHandler.listDirectory(path)
    → Returns directory contents

  handleReadSection(path: string, section: string)
    → Calls VaultHandler.readSection(path, section)
    → Returns section content

  handleReadCanvas(path: string)
    → Calls VaultHandler.readCanvas(path)
    → Returns canvas data

  handleGetRelated(path: string)
    → Calls VaultHandler.getRelatedFiles(path)
    → Returns linked files

Dependencies:
  - app: Obsidian App instance
  - onAddOutput: Callback to parent's addTestOutput
```

## Type System

### Core Types (types/testPanel.ts)

```typescript
type TabId = "search" | "operations" | "info" | "files" | "labs";

interface TestOutput {
  id: string;
  timestamp: number;
  status: "success" | "error" | "info" | "loading";
  title: string;
  message: string;
  data?: any;
}

interface SearchState {
  quickSearchQuery: string;
  enhancedSearchQuery: string;
  fuzzyQuery: string;
  results: any[];
}

interface OperationsState {
  getContentsPath: string;
  appendContentPath: string;
  appendContent: string;
  patchContentPath: string;
  patchContent: string;
  deleteFilePath: string;
  readSectionPath: string;
}

interface InfoState {
  updateFrontmatterPath: string;
}

interface FilesState {
  dirPath: string;
}

interface LabsState {
  readSectionPath: string;
  readCanvasPath: string;
  readCanvasLocation: string;
}

interface TestPanelState {
  activeTab: TabId;
  selectedFile: TFile | null;
  isLoading: boolean;
  searchState: SearchState;
  opsState: OperationsState;
  infoState: InfoState;
  filesState: FilesState;
  labsState: LabsState;
  testOutputs: TestOutput[];
}
```

### Component Prop Types (types/components.ts)

```typescript
interface ActionCardProps {
  title: string;
  variant?: "default" | "safe" | "destructive";
  onClick?: () => void;
  disabled?: boolean;
  isLoading?: boolean;
  children?: React.ReactNode;
}

interface ActionCardGroupProps {
  children: React.ReactNode;
  direction?: "row" | "column";
  spacing?: "compact" | "normal" | "loose";
}

interface GlobalContextBarProps {
  selectedFile: TFile | null;
  onPickFile: () => void;
  onClearFile: () => void;
}

interface TabNavigationProps {
  activeTab: TabId;
  tabs: Tab[];
  onTabChange: (tabId: TabId) => void;
}

interface ConsoleLogProps {
  testOutputs: TestOutput[];
  onClear?: () => void;
}
```

## Integration with VaultHandler

The plugin uses a centralized `VaultHandler` class in `src/core/vault-handler.ts` for all file operations:

```typescript
class VaultHandler {
  // Search operations
  quickSearch(query: string): any[]
  enhancedSearch(query: string): any[]
  fuzzySearch(query: string): any[]

  // File operations
  getFileContents(path: string): string
  appendContent(path: string, content: string): Promise<void>
  patchContent(path: string, content: string): Promise<void>
  deleteFile(path: string): Promise<void>
  updateFrontmatter(path: string, data: Record<string, any>): Promise<void>

  // Metadata operations
  getFileMetadata(path: string): any
  getVaultStructure(): any

  // Navigation
  listVaultRoot(): any[]
  listDirectory(path: string): any[]
  getRelatedFiles(path: string): TFile[]

  // Canvas/Section
  readSection(path: string, section: string): string
  readCanvas(path: string): any
}
```

All hooks interact with this handler to perform operations.

## Tab Architecture

Each tab is a renderer component that:

1. **Receives props** from TestPanel (state + handlers)
2. **Renders UI** specific to that tab's functionality
3. **Calls handlers** from TestPanel when buttons/inputs change
4. **Displays outputs** via passed testOutputs array

### Adding a New Tab

1. Create `src/ui/views/TestPanel/tabs/YourTab.tsx`
2. Define interface extending necessary state
3. Implement JSX rendering
4. Add to `tabs/index.ts` export
5. Add to `TestPanel.tsx`:
   - Add state object
   - Add handlers
   - Add case in renderTabContent()
6. Update `constants.ts` TABS array
7. Update `types/testPanel.ts` with state interface

---

## Styling Strategy

### CSS Architecture

```
src/ui/
├── EragearComponent.css
│  └─ Main component styles
│
├── views/TestPanel/TestPanel.css
│  └─ TestPanel & tab styles
│
└─ styles/ (future)
   ├─ variables.css (CSS custom properties)
   ├─ components.css (reusable component styles)
   └─ utilities.css (utility classes)
```

### CSS Variables Integration

Uses Obsidian theme variables:

```css
--background-primary
--background-secondary
--text-normal
--text-muted
--interactive-normal
--interactive-accent
--color-red (for destructive actions)
--color-green (for success)
--color-yellow (for warnings)
--color-blue (for info)
```

### esbuild CSS Plugin

Custom plugin in `esbuild.config.mjs`:

```javascript
// Loads CSS files as text
// Creates <style> element with CSS content
// Injects into DOM on page load
// Ensures styles are applied before component render
```

---

## Performance Considerations

### Optimization Strategies

1. **Output History Limit**: TestOutputs limited to 10 items (FIFO)
2. **useMemo**: Tab configuration computed once
3. **Conditional Rendering**: Only active tab renders
4. **Hook Isolation**: Each hook manages own state
5. **Lazy Evaluation**: File operations only on button click

### Future Improvements

- Debounce search inputs
- Memoize component renders
- Lazy load file contents for large files
- Virtualize long output lists

---

## Security Considerations

### Current Approach

1. **Local-first**: All operations on local vault
2. **No network requests**: Except to configured AI service
3. **File validation**: Paths checked against vault root
4. **User consent**: Explicit action required for modifications

### Sensitive Operations

- Delete operations require confirmation
- Patch/append show preview before applying
- Destructive actions marked clearly

---

## Testing Strategy

### Current Coverage

Manual testing checklist:
- [ ] Each tab renders correctly
- [ ] Input state isolation (no cross-contamination)
- [ ] File operations work as expected
- [ ] Error handling displays properly
- [ ] CSS loads and styles apply
- [ ] Large outputs display without freezing

### Future Testing

- Unit tests for custom hooks
- Component snapshot tests
- Integration tests for tab workflows
- E2E tests for complete user journeys

---

## Extension Points

### Easy to Extend

✅ **Add new tab**: Follow tabs/ pattern  
✅ **Add operation**: Extend useFileOperations hook  
✅ **Add component**: Use components/ pattern  
✅ **Add types**: Update types/ module  
✅ **Add styles**: Update appropriate .css file

### Harder to Extend

⚠️ Change state structure (affects multiple places)  
⚠️ Change hook interfaces (breaks consumers)  
⚠️ Modify VaultHandler API (affects all hooks)  

---

## Debugging

### Enable Debug Output

Look for console logs in:
- `useTestOutput`: Output state changes
- `useSearch`: Search operation logs
- `useFileOperations`: File operation logs
- Components: Render lifecycle

### Common Issues

| Issue | Debug Step |
|-------|-----------|
| State not updating | Check if state setter called in hook |
| Import errors | Verify relative paths are correct |
| CSS not loading | Check esbuild plugin config |
| Tab not rendering | Check TABS array in constants.ts |
| Output not showing | Check TestOutput format in hook |

---

**Last Updated**: December 26, 2024  
**Version**: 2.0 (Restructured)  
**Maintainer**: EraGear Team
