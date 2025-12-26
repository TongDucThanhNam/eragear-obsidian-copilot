# Developer Quick Reference

Fast lookup guide for common tasks in the EraGear Obsidian Copilot plugin.

## File Locations

### Core Plugin Files
- **Plugin entry**: `src/main.ts`
- **Lifecycle hooks**: `src/main.ts` (onload, onunload)
- **Settings**: `src/settings.ts`
- **Vault operations**: `src/core/vault-handler.ts`

### UI Module
- **Main entry**: `src/ui/EragearComponent.tsx`
- **Main view**: `src/ui/views/TestPanel/TestPanel.tsx`
- **Chat view**: `src/ui/views/ChatPanel/ChatPanel.tsx`
- **UI module export**: `src/ui/index.ts`

### Types
- **State types**: `src/ui/types/testPanel.ts`
- **Component prop types**: `src/ui/types/components.ts`
- **Barrel export**: `src/ui/types/index.ts`

### Hooks
- **Output management**: `src/ui/hooks/useTestOutput.ts`
- **Search logic**: `src/ui/hooks/useSearch.ts`
- **File operations**: `src/ui/hooks/useFileOperations.ts`
- **Barrel export**: `src/ui/hooks/index.ts`

### Components
- **Action cards**: `src/ui/components/ActionCard/`
- **Context bar**: `src/ui/components/GlobalContextBar/`
- **Tab switcher**: `src/ui/components/TabNavigation/`
- **Console output**: `src/ui/components/ConsoleLog/`
- **Barrel export**: `src/ui/components/index.ts`

### Tabs
- **Search tab**: `src/ui/views/TestPanel/tabs/SearchTab.tsx`
- **Operations tab**: `src/ui/views/TestPanel/tabs/OperationsTab.tsx`
- **Info tab**: `src/ui/views/TestPanel/tabs/InfoTab.tsx`
- **Files tab**: `src/ui/views/TestPanel/tabs/FilesTab.tsx`
- **Labs tab**: `src/ui/views/TestPanel/tabs/LabsTab.tsx`
- **Barrel export**: `src/ui/views/TestPanel/tabs/index.ts`

### Styles
- **Main component**: `src/ui/EragearComponent.css`
- **TestPanel**: `src/ui/views/TestPanel/TestPanel.css`

---

## Common Tasks

### Adding a New Tab

1. **Create component file**
   ```bash
   touch src/ui/views/TestPanel/tabs/YourTab.tsx
   ```

2. **Define the component**
   ```typescript
   import type React from "react";
   
   interface YourTabProps {
     // Define props here
   }
   
   export const YourTabRenderer: React.FC<YourTabProps> = ({ /* props */ }) => {
     return (
       <div>
         {/* Your JSX here */}
       </div>
     );
   };
   ```

3. **Export from tabs/index.ts**
   ```typescript
   export { YourTabRenderer } from "./YourTab";
   ```

4. **Add to TestPanel.tsx**
   ```typescript
   // In TestPanel state setup
   const [yourTabState, setYourTabState] = useState({...});
   
   // In handler functions section
   const handleYourAction = () => { /* ... */ };
   
   // In renderTabContent()
   case "your-tab":
     return (
       <YourTabRenderer
         tabState={yourTabState}
         onYourAction={handleYourAction}
         testOutputs={testOutputs}
       />
     );
   ```

5. **Update constants.ts**
   ```typescript
   export const TABS: Tab[] = [
     { id: "your-tab", label: "Your Tab", icon: "icon-name" },
     // ... rest of tabs
   ];
   ```

6. **Update types**
   In `src/ui/types/testPanel.ts`, add state interface:
   ```typescript
   interface YourTabState {
     // Properties here
   }
   
   interface TestPanelState {
     // ...
     yourTabState: YourTabState;
   }
   ```

---

### Adding a New File Operation

1. **Add handler to useFileOperations**
   In `src/ui/hooks/useFileOperations.ts`:
   ```typescript
   const handleYourOperation = async (path: string) => {
     try {
       onAddOutput({
         status: "loading",
         title: "Your Operation",
         message: "Processing...",
       });
       
       const result = await app.vault.adapter.read(path);
       
       onAddOutput({
         status: "success",
         title: "Your Operation",
         message: "Success!",
         data: result,
       });
     } catch (error) {
       onAddOutput({
         status: "error",
         title: "Your Operation",
         message: error instanceof Error ? error.message : "Unknown error",
       });
     }
   };
   
   return { /* ... existing */ handleYourOperation };
   ```

2. **Add to TestPanel**
   ```typescript
   const fileOps = useFileOperations({ app, onAddOutput });
   
   const handleYourOperation = () => {
     fileOps.handleYourOperation(/* args */);
   };
   ```

3. **Add UI button in appropriate tab**
   ```typescript
   <ActionCard
     title="Your Operation"
     onClick={handleYourOperation}
     isLoading={isLoading}
   >
     Your Operation
   </ActionCard>
   ```

---

### Adding a New Component

1. **Create component directory**
   ```bash
   mkdir -p src/ui/components/YourComponent
   ```

2. **Create component file**
   ```typescript
   // src/ui/components/YourComponent/YourComponent.tsx
   import type React from "react";
   
   export interface YourComponentProps {
     // Props here
   }
   
   export const YourComponent: React.FC<YourComponentProps> = ({ /* props */ }) => {
     return <div>{/* JSX */}</div>;
   };
   ```

3. **Create barrel export**
   ```typescript
   // src/ui/components/YourComponent/index.ts
   export { YourComponent } from "./YourComponent";
   export type { YourComponentProps } from "./YourComponent";
   ```

4. **Update components/index.ts**
   ```typescript
   export { YourComponent } from "./YourComponent";
   ```

5. **Define prop types (optional)**
   In `src/ui/types/components.ts`:
   ```typescript
   export interface YourComponentProps {
     // Props here
   }
   ```

---

### Updating State Management

1. **Find state variable** in `TestPanel.tsx`
2. **Update useState** declaration
3. **Update setter** in handler function
4. **Update type** in `types/testPanel.ts`
5. **Update component prop** that receives state

---

### Adding CSS Styles

**For TestPanel-related styles:**
```css
/* src/ui/views/TestPanel/TestPanel.css */
.your-class {
  color: var(--text-normal);
  background: var(--background-secondary);
  /* Use Obsidian theme variables */
}
```

**For EragearComponent styles:**
```css
/* src/ui/EragearComponent.css */
.your-class {
  /* Styles here */
}
```

**Common CSS Variables:**
```css
--background-primary        /* Main background */
--background-secondary      /* Secondary background */
--text-normal               /* Normal text color */
--text-muted                /* Muted text color */
--interactive-normal        /* Interactive element normal state */
--interactive-accent        /* Interactive element accent state */
--color-red                 /* Red for destructive actions */
--color-green               /* Green for success */
--color-yellow              /* Yellow for warnings */
--color-blue                /* Blue for info */
```

---

## Import Patterns

### ✅ Correct Patterns

```typescript
// Use barrel exports
import { TestPanel } from "../views";
import { ActionCard } from "../components";
import { useTestOutput } from "../hooks";
import type { SearchState } from "../types";

// From main UI module
import { TestPanel } from "../../ui";

// Explicit imports for clarity
import type React from "react";
import { useState } from "react";
```

### ❌ Avoid These Patterns

```typescript
// Don't import deeply nested
import TestPanel from "../../views/TestPanel/TestPanel";

// Don't import from intermediate files
import { ActionCard } from "../components/ActionCard/ActionCard";

// Don't use relative paths with many ../
import { ActionCard } from "../../../components";

// Don't skip types
import SearchState from "../../types/testPanel";
```

---

## Debugging Tips

### Check Build
```bash
bun run dev
```
Should show: `[watch] build finished, watching for changes...`

### Check TypeScript
```bash
bunx tsc --noEmit
```
Should show: `error TS...` for actual errors only

### Enable Console Logging
Add to component:
```typescript
console.log("Debug info:", variable);
```

Open Obsidian console: `Ctrl+Shift+I` (DevTools)

### Check State Updates
In React DevTools:
1. Install React DevTools browser extension
2. Select component in Components tab
3. Watch "State" section update

### Common Errors

| Error | Solution |
|-------|----------|
| "Could not resolve X" | Check import path, verify file exists |
| "Cannot find module X" | Add to barrel export in index.ts |
| "Property doesn't exist" | Check TypeScript interface definition |
| "Element not rendering" | Check conditional logic, verify props |
| "CSS not applying" | Check class name, verify esbuild plugin |

---

## Build Commands

```bash
# Development build with watch
bun run dev

# Production build
bun run esbuild

# Type check
bunx tsc --noEmit

# Lint (if configured)
bunx eslint src/
```

---

## File Structure Summary

```
src/
├── main.ts                         # Plugin entry point
├── settings.ts                     # Settings UI
├── core/
│   └── vault-handler.ts           # File operations API
└── ui/                            # UI Module
    ├── index.ts                   # Central export
    ├── EragearComponent.tsx        # Main container
    ├── EragearComponent.css
    ├── types/
    │   ├── testPanel.ts           # State types
    │   ├── components.ts          # Prop types
    │   └── index.ts               # Export all types
    ├── hooks/
    │   ├── useTestOutput.ts       # Output management
    │   ├── useSearch.ts           # Search logic
    │   ├── useFileOperations.ts   # File operations
    │   └── index.ts               # Export all hooks
    ├── components/
    │   ├── ActionCard/
    │   ├── GlobalContextBar/
    │   ├── TabNavigation/
    │   ├── ConsoleLog/
    │   └── index.ts               # Export all components
    └── views/
        ├── TestPanel/
        │   ├── TestPanel.tsx      # Main component
        │   ├── TestPanel.css
        │   ├── constants.ts
        │   ├── tabs/              # Tab renderers
        │   │   ├── SearchTab.tsx
        │   │   ├── OperationsTab.tsx
        │   │   ├── InfoTab.tsx
        │   │   ├── FilesTab.tsx
        │   │   ├── LabsTab.tsx
        │   │   └── index.ts
        │   └── index.ts
        ├── ChatPanel/
        │   ├── ChatPanel.tsx
        │   └── index.ts
        └── index.ts               # Export all views
```

---

## Best Practices

### Code Organization
- ✅ One component per file
- ✅ Use barrel exports for clean imports
- ✅ Keep files < 200 lines when possible
- ✅ Extract logic to hooks
- ✅ Group related functionality

### Naming Conventions
- ✅ Component files: `PascalCase.tsx`
- ✅ Hook files: `useHookName.ts`
- ✅ Type files: `descriptive.ts`
- ✅ CSS classes: `kebab-case`
- ✅ State variables: `camelCase`

### Type Safety
- ✅ Use `interface` for props
- ✅ Use `type` for aliases
- ✅ Always type hook returns
- ✅ Use `React.FC<Props>` for components
- ✅ Import `type` keyword for types

### Component Props
- ✅ Define prop interfaces
- ✅ Use destructuring in parameters
- ✅ Provide default props when appropriate
- ✅ Document complex props

---

## Resources

- [Obsidian API Docs](https://docs.obsidian.md/)
- [React Docs](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- Architecture documentation: [ARCHITECTURE.md](ARCHITECTURE.md)
- Setup guide: [DEVELOPMENT.md](DEVELOPMENT.md)

---

**Last Updated**: December 26, 2024  
**For Issues**: Check the project's issue tracker
