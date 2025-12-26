/**
 * src/ui/ - UI Module
 * 
 * Comprehensive structure for AI-assisted development with clear separation of concerns
 */

📁 src/ui/
├── 📁 views/                          # Main feature views
│   ├── 📁 TestPanel/
│   │   ├── TestPanel.tsx              # Main TestPanel component (refactored)
│   │   ├── TestPanel.css              # Styles for TestPanel
│   │   ├── constants.ts               # Tab definitions and constants
│   │   ├── 📁 tabs/                   # Individual tab renderers
│   │   │   ├── SearchTab.tsx          # Search functionality tab
│   │   │   ├── OperationsTab.tsx      # File operations tab
│   │   │   ├── InfoTab.tsx            # Metadata/info tab
│   │   │   ├── FilesTab.tsx           # File navigation tab
│   │   │   ├── LabsTab.tsx            # Advanced features tab
│   │   │   └── index.ts               # Export all tabs
│   │   └── index.ts                   # Export TestPanel
│   ├── 📁 ChatPanel/
│   │   ├── ChatPanel.tsx              # Chat interface component
│   │   └── index.ts                   # Export ChatPanel
│   └── index.ts                       # Export all views
│
├── 📁 components/                     # Reusable UI components
│   ├── 📁 ActionCard/
│   │   ├── ActionCard.tsx             # Action card component
│   │   ├── ActionCardGroup.tsx        # Grouped action cards
│   │   └── index.ts                   # Export action card components
│   ├── 📁 GlobalContextBar/
│   │   ├── GlobalContextBar.tsx       # File context bar component
│   │   └── index.ts                   # Export
│   ├── 📁 TabNavigation/
│   │   ├── TabNavigation.tsx          # Tab switcher component
│   │   └── index.ts                   # Export
│   ├── 📁 ConsoleLog/
│   │   ├── ConsoleLog.tsx             # Console output component
│   │   └── index.ts                   # Export
│   └── index.ts                       # Central component export
│
├── 📁 hooks/                          # Custom React hooks
│   ├── useTestOutput.ts               # Test output state management
│   ├── useSearch.ts                   # Search functionality hook
│   ├── useFileOperations.ts           # File operation methods hook
│   └── index.ts                       # Export all hooks
│
├── 📁 types/                          # TypeScript type definitions
│   ├── testPanel.ts                   # TestPanel related types
│   ├── components.ts                  # Component prop types
│   └── index.ts                       # Export all types
│
├── 📁 styles/                         # Global UI styles (future)
│   └── global.css                     # Global CSS variables & utilities
│
├── EragearComponent.tsx               # Main UI entry component
├── EragearComponent.css               # Main component styles
├── eragear-view.tsx                   # Obsidian view integration
├── index.ts                           # Central UI module export
└── README.md                          # This file


## Architecture Principles

### 1. Single Responsibility
- Each file has ONE clear purpose
- Components are small and focused (< 200 lines typically)
- Hooks handle state logic separately from rendering

### 2. Separation of Concerns
- **Views** (`views/`): Feature-level components that compose other components
- **Components** (`components/`): Reusable UI elements
- **Hooks** (`hooks/`): Business logic and state management
- **Types** (`types/`): Type definitions used across modules

### 3. Smart Hierarchy
```
EragearComponent (Entry point)
    ↓
TestPanel (Main view)
    ├── GlobalContextBar (Component)
    ├── TabNavigation (Component)
    ├── [SearchTabRenderer, OperationsTabRenderer, etc.] (Tab renderers)
    └── ConsoleLog (Component)
        
Each uses hooks for state management (useTestOutput, useSearch, useFileOperations)
```

### 4. Import Patterns

**Don't import deeply nested modules:**
```typescript
// ❌ BAD - Too deep
import { SearchTabRenderer } from "../../views/TestPanel/tabs/SearchTab";

// ✅ GOOD - Use barrel exports
import { SearchTabRenderer } from "../views/TestPanel/tabs";
```

**Always use barrel exports (`index.ts`):**
```typescript
// ❌ BAD
import { ActionCard } from "./components/ActionCard/ActionCard";

// ✅ GOOD
import { ActionCard } from "./components";
```

## Adding New Features

### Adding a New Tab

1. Create `src/ui/views/TestPanel/tabs/YourTab.tsx`
2. Define interface and component
3. Export from `src/ui/views/TestPanel/tabs/index.ts`
4. Add to `TestPanel.tsx` render logic

### Adding a New Component

1. Create `src/ui/components/YourComponent/YourComponent.tsx`
2. Create `src/ui/components/YourComponent/index.ts`
3. Export from `src/ui/components/index.ts`
4. Define types in `src/ui/types/components.ts`

### Adding a New Hook

1. Create `src/ui/hooks/useYourHook.ts`
2. Export from `src/ui/hooks/index.ts`
3. Define types if needed in `src/ui/types/`

## For AI Coding Assistants

This structure makes it MUCH EASIER for AI to:

✅ Understand code relationships at a glance
✅ Find relevant files quickly
✅ Make focused changes without breaking other code
✅ Generate properly structured new features
✅ Maintain consistent patterns throughout
✅ Navigate imports without deep nesting
✅ Understand which file changes need coordinated updates

### Key Files for Reference

- **State Flow**: `TestPanel.tsx` → hooks (`useTestOutput`, `useSearch`, `useFileOperations`)
- **Component Props**: `types/components.ts` and `types/testPanel.ts`
- **Tab Structure**: `views/TestPanel/tabs/` directory
- **Styles**: Search for class names in `views/TestPanel/TestPanel.css`

