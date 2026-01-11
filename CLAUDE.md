# AGENTS.md

## Mục tiêu
Chuẩn hoá cách xây UI cho Obsidian Plugin theo mô hình “shadcn-like UI layer”:
- Feature/UI screen **không import trực tiếp** từ `@base-ui/react/*`.
- `@/components/ui/*` wrap Base UI để tạo API ổn định (Button, Dialog, Popover, Menu…).
- Prioritize using icon from library `@phosphor-icons/react` (installed via npm).
- Styling dùng **plain CSS** và **Obsidian theme variables**, không dựng theme/config riêng.

## Tài liệu tham khảo chính
- Base UI Quick Start (unstyled, dùng plain CSS/CSS-in-JS tuỳ bạn): https://base-ui.com/react/overview/quick-start
- Base UI Styling (data attributes + CSS variables): https://base-ui.com/react/handbook/styling
- Base UI Composition (render prop, forwardRef + spread props): https://base-ui.com/react/handbook/composition
- Base UI Popover Portal API (container, default append <body>): https://base-ui.com/react/components/popover
- Obsidian Theme Migration Guide (spacing `--size-*`, cursor `--cursor`, `--cursor-link`): https://obsidian.md/blog/1-0-theme-migration-guide
## Quy tắc kiến trúc (bắt buộc)
### 1) Module boundary
- Feature layer:
  - IMPORT: `@/components/ui/*` và domain modules.
  - KHÔNG IMPORT: `@base-ui/react/*`.
- UI layer (`@/components/ui/*`):
  - Được phép import `@base-ui/react/*`.
  - Chịu trách nhiệm: composition, portal container, className/data-attrs, primitives.
### 2) Namespace class & low specificity
- Mọi class CSS của UI layer phải prefix, ví dụ: `cui-` hoặc `${pluginId}-`.
- Không viết selector global kiểu `button {}`/`input {}`.
- Tất cả CSS được “neo” vào root container của plugin: `.my-plugin-root`.

### 3) Token strategy: chỉ alias từ Obsidian variables
- Không hard-code màu.
- Tạo token alias trong `.my-plugin-root`:
  - `--cui-bg: var(--background-primary)`
  - `--cui-text: var(--text-normal)`
  - `--cui-border: var(--background-modifier-border)`
  - `--cui-accent: var(--interactive-accent)`
  - …

## Obsidian-native guidelines (bắt buộc)
### 1) Spacing theo grid 4px
Obsidian dùng grid 4px và khuyến nghị dùng `--size-*` cho mọi dimension/padding/margin.

### 2) Cursor convention
Obsidian chỉ dùng `pointer` cho link; interactive element nên dùng `--cursor`, link dùng `--cursor-link`.

## Base UI trong mô hình “shadcn-like”
Base UI là unstyled, bạn tự style bằng plain CSS (hoặc cách khác).

### 1) Composition: dùng render prop (tương đương asChild)
- Base UI dùng `render` prop để compose part với custom component.
- Custom component đưa vào `render={<MyButton />}` bắt buộc:
  - `forwardRef`
  - spread toàn bộ props vào DOM node underneath

Quy ước nội bộ:
- UI layer expose API kiểu shadcn: `asChild?: boolean`
- Implement bằng cách “map” sang `render` prop (của Base UI hoặc của primitives).

### 2) Styling theo state: data attributes + CSS variables
Base UI khuyến nghị style state dựa trên:
- data attributes (ví dụ `[data-checked]`, `[data-open]`…)
- CSS variables động (ví dụ Popover Popup expose `--available-height`, `--anchor-width`)

## Portal strategy (bắt buộc cho Popup UI)
### Vấn đề
Nhiều component có popup (Popover, Menu, Select, Tooltip, Dialog…) render qua Portal.
Với Popover, Portal mặc định append vào `<body>`.

Nếu bạn scope CSS theo `.my-plugin-root ...`, popup portal ra `<body>` sẽ “thoát scope”.

### Chuẩn nội bộ
- Trong view root của Obsidian plugin, tạo:
  - `rootEl` (React mount)
  - `portalEl` (nằm trong root)
- Truyền `portalEl` qua React Context (PortalProvider).
- Mọi `<*.Portal>` trong UI layer phải set `container={portalEl}`.
Popover Portal hỗ trợ prop `container` (HTMLElement/ShadowRoot/ref/null).

### Stacking context
- Set `.my-plugin-root { isolation: isolate; }`
- Mục tiêu: giảm z-index xung đột trong workspace nhiều panes.

## Cấu trúc thư mục đề xuất
```
src/
  component/
    ui/
      index.ts
      portal-provider.tsx
      tokens.css
      primitives/
        button.tsx
        input.tsx
        surface.tsx
        text.tsx
      popover.tsx
      dialog.tsx
      menu.tsx
      tooltip.tsx
      select.tsx
```

## CSS: tokens + primitives + components
### tokens.css (alias từ Obsidian)
.my-plugin-root {
  --cui-bg: var(--background-primary);
  --cui-bg-2: var(--background-secondary);
  --cui-text: var(--text-normal);
  --cui-text-muted: var(--text-muted);
  --cui-border: var(--background-modifier-border);

  --cui-accent: var(--interactive-accent);
  --cui-accent-hover: var(--interactive-accent-hover);

  --cui-radius: var(--radius-m);
  --cui-shadow: var(--shadow-s);

  /* spacing via Obsidian size grid */
  --cui-px: var(--size-4-2);  /* 8px */
  --cui-py: var(--size-4-2);  /* 8px */
}

.my-plugin-root {
  isolation: isolate;
}

### Primitive: Button (cursor convention)
.cui-Button {
  cursor: var(--cursor);
  border-radius: var(--cui-radius);
}

.cui-LinkLike {
  cursor: var(--cursor-link);
}

### Component: Popover popup sizing via Base UI CSS vars
.cui-PopoverPopup {
  max-height: var(--available-height); /* Base UI exposes on Popover.Popup */
  background: var(--cui-bg);
  color: var(--cui-text);
  border: 1px solid var(--cui-border);
  border-radius: var(--cui-radius);
  box-shadow: var(--cui-shadow);
}

## TypeScript patterns (UI layer)
### 1) PortalProvider (bắt buộc)
- Portal container được tạo 1 lần / view.
- UI components dùng `usePortalContainer()`.

### 2) Primitives phải forwardRef + spread props
Mục tiêu:
- dùng được trong Base UI `render` prop. :contentReference[oaicite:19]{index=19}

### 3) Wrapper component expose API ổn định
Ví dụ Popover:
- Popover, PopoverTrigger, PopoverContent (Popup), PopoverClose…
- Internally map to Base UI parts: Root/Trigger/Portal/Positioner/Popup/Arrow...

Popover anatomy có các parts như Root, Trigger, Portal, Positioner, Popup… :contentReference[oaicite:20]{index=20}

## Style Settings plugin (tuỳ chọn, không bắt buộc)
Chỉ dùng khi thật sự cần “tweak” UI density/radius… mà vẫn muốn user chỉnh trong 1 pane chung.
Style Settings scan comment `/* @settings` (YAML) trong CSS và hỗ trợ variable-* và class-toggle. :contentReference[oaicite:21]{index=21}

Ví dụ (đặt trong styles.css của plugin):
/* @settings
name: My Plugin
id: my-plugin
settings:
  -
    id: density
    title: Density
    type: variable-select
    default: comfy
    options:
      - comfy
      - compact
*/

Sau đó trong CSS:
.my-plugin-root {
  /* map density -> padding, gap... */
}

## Checklist trước khi merge
- Không import `@base-ui/react/*` ngoài `@/components/ui/*`.
- Không hard-code màu; dùng Obsidian variables hoặc alias tokens.
- Spacing dùng `--size-*`; cursor dùng `--cursor` / `--cursor-link`.
- Popup UI set portal `container` về root plugin (tránh mất CSS scope).
- Styling state dùng data-attributes + CSS vars của Base UI (không cần JS).
- Components compose qua `render` và custom components đảm bảo forwardRef + spread props.
