# Eragear Copilot - Development Guide

## Setup & Installation

### Prerequisites
- Node.js >= 14
- npm >= 6
- Git
- Obsidian installed for testing

### Initial Setup

```bash
# Clone repository
git clone <repo-url>
cd eragear-obsidian-copilot

# Install dependencies
npm install

# Install React dependencies
npm install react react-dom @types/react @types/react-dom

# Start development
npm run dev
```

### Project Structure

```
eragear-obsidian-copilot/
├── src/
│   ├── main.ts                  # Plugin entry point
│   ├── settings.ts              # Settings interface
│   ├── core/
│   │   └── vault-handler.ts     # Core vault operations
│   └── ui/
│       ├── eragear-view.tsx     # Obsidian view container
│       ├── EragearComponent.tsx # Main React component
│       ├── ChatPanel.tsx        # Chat interface
│       ├── TestPanel.tsx        # Testing interface
│       ├── EragearComponent.css # Main styles
│       └── TestPanel.css        # Test panel styles
├── docs/
│   ├── README.md                # Overview
│   ├── IMPLEMENTATION.md        # This file (detailed docs)
│   ├── USER_GUIDE.md           # User documentation
│   ├── API_REFERENCE.md        # API docs
│   └── DEVELOPMENT.md          # Development guide
├── package.json
├── tsconfig.json
├── manifest.json
├── main.js                      # Compiled output
├── styles.css                   # Compiled CSS
└── esbuild.config.mjs          # Build configuration
```

## Development Workflow

### 1. Make Changes

Edit files in `src/` directory:

```typescript
// Example: src/core/vault-handler.ts
export class VaultHandler {
  // Make your changes here
}
```

### 2. Build & Test

```bash
# Development build (watch mode)
npm run dev

# Production build
npm run build

# Type check only
tsc -noEmit -skipLibCheck
```

### 3. Test in Obsidian

1. Open Obsidian settings
2. Go to Community Plugins → Installed plugins
3. Reload the plugin or restart Obsidian
4. Test your changes

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
git push origin feature-branch
```

## Architecture

### Layer 1: Core Logic (Vault Operations)

**File:** `src/core/vault-handler.ts`

Handles all interaction with Obsidian vault:
- Reading note content
- Analyzing structure
- Extracting metadata
- Searching notes

**Key Principles:**
- Pure functions (no side effects)
- Use Obsidian cache APIs
- Optimize for performance
- Clear error handling

### Layer 2: Plugin Management

**File:** `src/main.ts`

Manages plugin lifecycle:
- Initialization
- Settings management
- View registration
- Command registration
- Resource cleanup

### Layer 3: UI Components

**Files:** `src/ui/*.tsx`

React components for user interface:
- EragearComponent - Main container
- ChatPanel - Chat interface
- TestPanel - Testing interface
- eragear-view - Obsidian view wrapper

**Key Principles:**
- Functional components
- React hooks for state
- Props for data flow
- Memoization for performance

### Layer 4: Styling

**Files:** `src/ui/*.css`

Follows Obsidian design system:
- CSS variables for theming
- Responsive design
- Accessibility considerations
- Animation/transitions

## Key Concepts

### 1. VaultHandler Pattern

Access vault through dedicated service:

```typescript
// ✅ Good
const vaultHandler = new VaultHandler(app);
const results = vaultHandler.searchNotes("query");

// ❌ Bad (avoid direct API access)
const results = app.vault.search("query"); // Wrong approach
```

### 2. Caching Strategy

Use Obsidian's built-in caching:

```typescript
// ✅ Good - Uses cache
const content = await app.vault.cachedRead(file);

// ⚠️ Slower - Direct read
const content = await app.vault.read(file);
```

### 3. React Lifecycle

Proper mounting and cleanup:

```typescript
async onOpen() {
  const container = this.containerEl.children[1];
  this.root = createRoot(container as HTMLElement);
  this.root.render(<EragearComponent app={this.app} />);
}

async onClose() {
  this.root?.unmount();  // Important: cleanup
}
```

### 4. Error Handling

Always handle potential errors:

```typescript
try {
  const result = vaultHandler.getNoteStructure(file);
  if (!result) {
    console.warn('No structure found');
  }
} catch (error) {
  console.error('Failed to get structure:', error);
}
```

## Adding New Features

### Example: Adding a New VaultHandler Method

1. **Add method to VaultHandler:**

```typescript
// src/core/vault-handler.ts
export class VaultHandler {
  /**
   * New method - Get word count
   */
  getWordCount(file: TFile): number {
    try {
      const content = this.app.vault.cachedRead(file);
      return content.split(/\s+/).length;
    } catch (error) {
      console.error('Error counting words:', error);
      return 0;
    }
  }
}
```

2. **Add UI component:**

```typescript
// src/ui/WordCountPanel.tsx
import { VaultHandler } from '../core/vault-handler';
import { App } from 'obsidian';

export const WordCountPanel: React.FC<{ app: App }> = ({ app }) => {
  const vaultHandler = new VaultHandler(app);
  const [wordCount, setWordCount] = useState(0);

  const handleGetWordCount = () => {
    const file = app.workspace.getActiveFile();
    if (!file) return;
    const count = vaultHandler.getWordCount(file);
    setWordCount(count);
  };

  return (
    <div>
      <button onClick={handleGetWordCount}>Count Words</button>
      {wordCount > 0 && <p>Words: {wordCount}</p>}
    </div>
  );
};
```

3. **Integrate into TestPanel:**

```typescript
// src/ui/TestPanel.tsx
import { WordCountPanel } from './WordCountPanel';

// Add tab
<button className={`test-tab ${activeTab === "wordcount" ? "active" : ""}`}
        onClick={() => setActiveTab("wordcount")}>
  📊 Word Count
</button>

// Add content
{activeTab === "wordcount" && <WordCountPanel app={app} />}
```

4. **Build and test:**

```bash
npm run build
# Test in Obsidian
```

## Code Style Guide

### TypeScript

- Use strict mode
- Explicit type annotations
- Avoid `any` type
- Use interfaces for contracts

```typescript
// ✅ Good
interface SearchOptions {
  query: string;
  limit: number;
  tags?: string[];
}

function search(options: SearchOptions): TFile[] {
  // Implementation
}

// ❌ Bad
function search(options: any): any {
  // Implementation
}
```

### React Components

- Functional components only
- Use hooks for state
- Memoize expensive computations
- Clear prop types

```typescript
// ✅ Good
interface ComponentProps {
  app: App;
  onClose?: () => void;
}

export const MyComponent: React.FC<ComponentProps> = ({ 
  app, 
  onClose 
}) => {
  const [state, setState] = useState('');
  
  return <div>{state}</div>;
};

// ❌ Bad
export const MyComponent = (props: any) => {
  // Missing prop types
  return <div>{props.something}</div>;
};
```

### CSS

- Use CSS variables for colors
- Mobile-first design
- Meaningful class names
- Comment complex selectors

```css
/* ✅ Good */
.component-container {
  background-color: var(--background-primary);
  padding: var(--space-m);
}

/* ❌ Bad */
.container {
  background-color: #ffffff;
  padding: 1rem;
}
```

## Testing

### Manual Testing Checklist

```markdown
- [ ] Plugin loads without errors
- [ ] Ribbon icon appears
- [ ] Sidebar opens on click
- [ ] Chat panel displays
- [ ] Test panel has all tabs
- [ ] Search returns results
- [ ] Structure shows TOC
- [ ] Metadata shows tags
- [ ] Dark mode works
- [ ] Mobile responsive
```

### Automated Testing (Future)

```typescript
// Unit tests (to be implemented)
describe('VaultHandler', () => {
  it('should search notes', () => {
    // Test implementation
  });
});

// React component tests
describe('TestPanel', () => {
  it('should render search tab', () => {
    // Test implementation
  });
});
```

## Debugging

### Console Logging

```typescript
// Enable debug logs
const DEBUG = true;

if (DEBUG) {
  console.log('VaultHandler initialized');
}
```

### Browser DevTools

Open DevTools in Obsidian:
- Windows/Linux: `Ctrl+Shift+I`
- Mac: `Cmd+Option+I`

Check:
- Console tab for errors/warnings
- Network tab for API calls
- React DevTools for component state

### Performance Profiling

```typescript
// Measure execution time
console.time('searchNotes');
const results = vaultHandler.searchNotes('query');
console.timeEnd('searchNotes');
// Output: searchNotes: 1.234ms
```

## Build System

### esbuild Configuration

**File:** `esbuild.config.mjs`

```javascript
import esbuild from 'esbuild';

const prod = process.argv[2] === 'production';

const context = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  external: ['obsidian', 'electron'],
  format: 'cjs',
  target: 'ES6',
  logLevel: 'info',
  sourcemap: prod ? false : 'inline',
  minify: prod,
  outfile: 'main.js',
});

if (prod) {
  await context.rebuild();
  process.exit(0);
} else {
  await context.watch();
}
```

### TypeScript Configuration

**File:** `tsconfig.json`

Key settings:
- Strict mode: all checks enabled
- Module: ESNext
- Target: ES6
- JSX: react-jsx

## Performance Optimization

### Current Optimizations

✅ Obsidian cache usage (no disk reads)  
✅ React lazy rendering  
✅ CSS variables for theming  
✅ Efficient search algorithm  

### Future Optimizations

- [ ] Web Workers for search
- [ ] Result caching
- [ ] Virtual scrolling for large lists
- [ ] Code splitting
- [ ] Tree shaking

## Security Considerations

### Best Practices

1. **Validate user input:**
```typescript
if (!query || typeof query !== 'string') {
  throw new Error('Invalid query');
}
```

2. **No external dependencies:**
- Minimize npm dependencies
- Vet all packages
- Keep dependencies updated

3. **User data protection:**
- Local-first by default
- User consent for cloud features
- No telemetry without permission

4. **Obsidian API safety:**
- Use public APIs only
- Handle errors gracefully
- Don't access private APIs

## Contribution Guidelines

### Before Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/my-feature`
3. Follow code style guide
4. Test thoroughly
5. Write clear commit messages

### Commit Message Format

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Build/dependencies

**Example:**
```
feat(search): add filter by tags

Added ability to filter search results by tags.
Updates SearchOptions interface and adds filter logic.

Closes #123
```

## Troubleshooting Development Issues

### Build Fails

```bash
# Clear cache and rebuild
rm -rf node_modules package-lock.json
npm install
npm run build
```

### React Errors

```bash
# Clear browser cache
# Restart Obsidian
# Check browser console for details
```

### TypeScript Errors

```bash
# Check types
npm run type-check

# Review tsconfig.json
cat tsconfig.json
```

### Plugin Not Loading

1. Check manifest.json is valid JSON
2. Verify main.js exists
3. Check Obsidian console for errors
4. Restart Obsidian completely

## Release Process

### Preparing a Release

1. Update version in `package.json`
2. Update `manifest.json`
3. Add entries to `CHANGELOG.md`
4. Build: `npm run build`
5. Commit: `git commit -am "v1.x.x"`
6. Tag: `git tag -a v1.x.x -m "Release v1.x.x"`
7. Push: `git push && git push --tags`

### Publishing to Obsidian

1. Submit to community plugins registry
2. Wait for review
3. Plugin appears in community plugins list

## Resources

### Obsidian Docs
- [Plugin Development](https://docs.obsidian.md/Plugins/)
- [API Documentation](https://docs.obsidian.md/Reference/)
- [Sample Plugin](https://github.com/obsidianmd/sample-plugin)

### React Docs
- [React Documentation](https://react.dev/)
- [React Hooks](https://react.dev/reference/react)
- [TypeScript with React](https://www.typescriptlang.org/docs/handbook/react.html)

### TypeScript Docs
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Strict Mode](https://www.typescriptlang.org/tsconfig#strict)

## Support

For development questions:
1. Check this documentation
2. Review existing issues on GitHub
3. Open discussion with details
4. Include:
   - Node/npm versions
   - OS details
   - Obsidian version
   - Error messages

---

**Last Updated:** December 26, 2025  
**Status:** Actively Maintained
