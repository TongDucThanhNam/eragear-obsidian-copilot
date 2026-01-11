# UI Styling Guidelines

This plugin targets Obsidian, so components should use plain CSS with Obsidian theme variables. Prefer the shared patterns below to keep borders, focus rings, and padding consistent.

## Design Goals
- Use Obsidian CSS variables (`--background-*`, `--text-*`, `--interactive-*`).
- Avoid heavy shadows and strong rings; keep focus subtle.
- Match Obsidian spacing and typography (`--size-*`, `--font-ui-*`).
- Keep components compact for toolbar/footer usage.

### CSS Hooks
Styles are defined in `src/components/ui/*.css`:
 - For example component `badge.tsx` will have `badge.css` as styles.

### Interaction Notes

## Input Group Styling
Keep input groups subtle and aligned with Obsidian.

Recommended overrides:
- Border: `1px solid var(--background-modifier-border)`
- Focus: `border-color: var(--background-modifier-border-hover)` and no glow
- Buttons: remove borders and box-shadows, use hover background only

## Common Variables
Use these theme variables for consistent appearance:
- `--background-primary`, `--background-secondary`
- `--background-modifier-border`, `--background-modifier-border-hover`
- `--background-modifier-hover`
- `--text-normal`, `--text-muted`
- `--radius-s`, `--radius-m`

## Do / Don’t
**Do**
- Use `var(--background-*)` and `var(--text-*)`
- Keep focus subtle and non-glowy
- Keep controls 32–36px tall

**Don’t**
- Add custom gradients or heavy shadows
- Use inline styles for visual polish
