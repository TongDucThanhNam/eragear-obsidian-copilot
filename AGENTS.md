# AGENTS.md

## Mục tiêu

Repo này là Obsidian community plugin `eragear-copilot`. Khi làm việc trong repo, mục tiêu là tạo/sửa plugin theo đường ngắn nhất để chạy được trong Obsidian, nhưng vẫn giữ các chuẩn quan trọng: lifecycle sạch, API Obsidian đúng, UI native, CSS không phá theme, và debug bằng Obsidian CLI thay vì đoán.

Luôn dùng skill Obsidian ở `.agents/skills/obsidian/SKILL.md` cho mọi task liên quan tới Obsidian API, `Plugin`, `ItemView`, `MarkdownView`, `TFile`, vault operations, settings, manifest, command, hoặc UI trong plugin. Chỉ mở thêm các file trong `reference/` khi cần đúng chủ đề.

Vault dùng để phát triển plugin là `PlaygrondObsidianVault` ở `/home/terasumi/Documents/PlaygrondObsidianVault`. Không chạy debug/reload plugin trên vault chính như `StudyWithTerasumi` trừ khi user yêu cầu rõ. Khi dùng Obsidian CLI cho plugin dev, ưu tiên truyền `vault=PlaygrondObsidianVault` trong lệnh để tránh nhắm nhầm vault đang active.

## Vòng lặp làm việc mặc định

1. Xác nhận bối cảnh:
   - Đọc `manifest.json`, `package.json`, `src/main.ts`, và file liên quan trực tiếp tới task.
   - Chạy `obsidian version`, `obsidian vault=PlaygrondObsidianVault vault info=path`, `obsidian vaults verbose` khi cần debug runtime.
   - Chạy `obsidian vault=PlaygrondObsidianVault plugin id=eragear-copilot` trước khi dùng `plugin:reload`; nếu CLI báo plugin không tồn tại, kiểm tra vault mismatch thay vì giả định repo đang được Obsidian load.
2. Sửa nhỏ, đúng chỗ:
   - Lifecycle và registration ở `src/main.ts`.
   - Obsidian integration ở `src/app/**`.
   - Feature UI ở `src/features/**`.
   - Vault/API adapters ở `src/infra/obsidian/**`.
   - Reusable UI wrappers ở `src/components/ui/**`.
3. Verify:
   - `npm run lint` cho rule TypeScript/Obsidian.
   - `npm run build` cho bundle production.
   - Nếu plugin đang được load trong vault dev: `obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot`, rồi kiểm tra `obsidian vault=PlaygrondObsidianVault dev:errors` và `obsidian vault=PlaygrondObsidianVault dev:console level=error limit=50`.
4. Khi hoàn tất, báo rõ file đã sửa, lệnh đã chạy, và lệnh nào không chạy được vì CLI/vault/plugin state.

Obsidian CLI phản ánh trạng thái app/vault đang mở, không phản ánh tự động repo hiện tại. Không dùng CLI để xoá/sửa note của user trừ khi user yêu cầu rõ.

## Golden path để tạo plugin đơn giản

Khi cần tạo plugin mới hoặc scaffold lại một plugin tối giản, bắt đầu từ plugin chạy được trước, rồi mới thêm feature:

- Required root files: `manifest.json`, `package.json`, `tsconfig.json`, `esbuild.config.mjs`, `src/main.ts`, `styles.css`, `README.md`, `LICENSE`.
- `manifest.json` phải hợp lệ để submit:
  - `id` không chứa `obsidian`, không kết thúc bằng `plugin`, chỉ lowercase/digit/dash/underscore.
  - `name` không chứa `Obsidian`, không kết thúc bằng `Plugin`.
  - `description` không chứa "This plugin" hoặc "Obsidian", và kết thúc bằng `.`, `?`, `!`, hoặc `)`.
- `src/main.ts` chỉ làm lifecycle tối thiểu: load settings, register views/settings/commands/events, cleanup tài nguyên tự tạo.
- Không giữ lại tên template như `MyPlugin`, `SampleModal`, sample commands, hoặc hotkeys mặc định.

Pattern tối thiểu cho `src/main.ts`:

```ts
import { Notice, Plugin } from "obsidian";

export default class EragearPlugin extends Plugin {
	async onload(): Promise<void> {
		this.addCommand({
			id: "show-status",
			name: "Show status",
			callback: () => new Notice(`${this.manifest.name} is ready.`),
		});
	}
}
```

Nếu thêm React view, plugin class không giữ reference tới view. Dùng `registerView()` để return view mới, React root được mount/unmount trong chính `ItemView`.

## Obsidian API rules bắt buộc

- Dùng `this.app`, không dùng global `app`.
- Dùng `this.addCommand()`, `this.registerEvent()`, `this.registerDomEvent()`, `this.registerInterval()` để Obsidian tự cleanup.
- Không store `ItemView`/`MarkdownView` instance trong plugin property.
- Không detach leaves trong `onunload()`.
- Với active editor, dùng `editorCallback` hoặc `this.app.workspace.getActiveViewOfType(MarkdownView)` và Editor API.
- Với background file edit, dùng `Vault.process()`.
- Với frontmatter, dùng `this.app.fileManager.processFrontMatter()`.
- Với path từ user/settings, dùng `normalizePath()`.
- Với file lookup, dùng `getAbstractFileByPath()` rồi narrow bằng `instanceof TFile`/`TFolder`; không cast ép kiểu.
- Với delete/trash, ưu tiên `this.app.fileManager.trashFile(file)`.
- Với network request trong plugin, dùng `requestUrl()` thay vì `fetch()`.
- Với platform detection, dùng `Platform` API, không dùng `navigator.userAgent`.
- Không dùng `innerHTML`/`outerHTML`; dùng React JSX hoặc Obsidian DOM helpers.
- Tránh regex lookbehind để giữ tương thích iOS cũ.

## Commands, settings, và UX text

- UI text dùng sentence case: `Open settings`, không dùng `Open Settings`.
- Command `id` không chứa plugin id và không chứa chữ `command`.
- Command `name` không lặp lại plugin name và không chứa chữ `command`.
- Không đặt default hotkeys.
- Settings tab dùng `new Setting(containerEl).setName(...).setHeading()`, không tự tạo heading HTML.
- Settings headings không dùng "General", "settings", "options", hoặc tên plugin làm heading.
- Notice/error message phải ngắn, actionable, và không spam console trong production.

## UI architecture

Repo dùng mô hình shadcn-like UI layer:

- Feature layer (`src/features/**`, `src/app/**`) được import `@/components/ui/*` và domain modules.
- Feature layer không import trực tiếp `@base-ui/react/*`.
- UI layer (`src/components/ui/**`) là nơi duy nhất được wrap Base UI.
- UI wrappers expose API ổn định kiểu `Button`, `Popover`, `DropdownMenu`, `Tabs`, `Select`, `Combobox`.
- Native-first cho primitive đơn giản: `Button`, `Badge`, `Card`, text/surface helpers nên là React/native DOM + CSS, không cần Base UI.
- Chỉ dùng Base UI khi component cần behavior khó tự viết đúng: focus management, keyboard navigation, typeahead, aria state, popup positioning, dismiss/escape handling, hoặc portal.
- Nếu wrapper support `asChild`, map sang Base UI `render` prop.
- Component được đưa vào Base UI `render` phải `forwardRef` và spread toàn bộ props xuống DOM node.
- Icon ưu tiên `@phosphor-icons/react`; import tên có hậu tố `Icon`, ví dụ `NetworkIcon`, `GearIcon`.
- Icon-only button bắt buộc có `aria-label` và tooltip/focus state phù hợp.

Check nhanh boundary:

```bash
rg -n 'from ["'\'']@base-ui/react' src --glob '!src/components/ui/**'
```

## Portal strategy cho popup UI

Popup UI như Popover, Dialog, Menu, Select, Combobox không được portal thẳng ra `body` nếu làm mất CSS scope.

- View root tạo `rootEl` và `portalEl` nằm trong root plugin.
- React tree bọc bằng `PortalProvider`.
- UI layer lấy `container` từ `usePortalContainer()`.
- Mọi Base UI `<*.Portal>` phải set `container={portalEl}` khi component hỗ trợ.
- Root container dùng `.eragear-copilot-root { isolation: isolate; }` để giảm xung đột stacking context.

## CSS rules

CSS phải native với Obsidian:

- Root scope thật của repo là `.eragear-copilot-root`, không dùng placeholder `.my-plugin-root`.
- UI layer dùng prefix `cui-`; feature-specific class dùng prefix `eragear-`.
- Không viết selector global như `button {}`, `input {}`, `.modal {}`.
- Không hard-code màu; dùng Obsidian variables hoặc alias token.
- Spacing/dimension theo grid 4px của Obsidian: `--size-4-1`, `--size-4-2`, `--size-4-3`, `--size-4-4`, ...
- Cursor interactive dùng `cursor: var(--cursor)`; link dùng `cursor: var(--cursor-link)`.
- Focus state dùng `:focus-visible` với `--interactive-accent` hoặc `--background-modifier-border-focus`.
- Không set style inline bằng JS; đưa style vào CSS scoped.

Token alias nên đặt ở `src/components/ui/tokens.css` hoặc `styles.css`:

```css
.eragear-copilot-root {
	--cui-bg: var(--background-primary);
	--cui-bg-2: var(--background-secondary);
	--cui-text: var(--text-normal);
	--cui-text-muted: var(--text-muted);
	--cui-border: var(--background-modifier-border);
	--cui-accent: var(--interactive-accent);
	--cui-accent-hover: var(--interactive-accent-hover);
	--cui-radius: var(--radius-m);
	--cui-shadow: var(--shadow-s);
	--cui-px: var(--size-4-2);
	--cui-py: var(--size-4-2);
	isolation: isolate;
}
```

Check nhanh màu hard-code:

```bash
rg -n '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' src styles.css
```

## Accessibility bắt buộc

- Mọi control interactive phải dùng native button/input/select khi có thể.
- Custom clickable element phải có `role`, `tabindex="0"`, Enter/Space handler, và focus style.
- Icon button phải có `aria-label`.
- Dialog/menu/popover phải quản lý focus và đóng được bằng keyboard.
- Dynamic status nên dùng `role="status"`/`aria-live="polite"` khi user cần biết.
- Touch target nên đạt tối thiểu 44x44px, nhất là plugin không desktop-only.

## Debug bằng Obsidian CLI

Dùng các lệnh này khi cần kiểm chứng runtime:

```bash
obsidian version
obsidian vault=PlaygrondObsidianVault vault info=path
obsidian vaults verbose
obsidian vault=PlaygrondObsidianVault plugin id=eragear-copilot
obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot
obsidian vault=PlaygrondObsidianVault dev:errors
obsidian vault=PlaygrondObsidianVault dev:console level=error limit=50
obsidian vault=PlaygrondObsidianVault dev:dom selector=".eragear-copilot-root" total
obsidian vault=PlaygrondObsidianVault dev:screenshot path="/tmp/eragear-copilot.png"
```

Không dùng vault chính cho workflow phát triển plugin. Nếu CLI đang active ở vault khác, vẫn target vault dev cụ thể:

```bash
obsidian vault=PlaygrondObsidianVault vault info=path
obsidian vault=PlaygrondObsidianVault plugin:reload id=eragear-copilot
```

Nếu `plugin:reload` báo không tìm thấy plugin:

- So sánh `obsidian vault=PlaygrondObsidianVault vault info=path` với vault chứa repo.
- Kiểm tra plugin folder nằm trong `<vault>/<configDir>/plugins/<manifest id>`.
- Kiểm tra restricted mode/community plugin enabled state.
- Không sửa code để "fix" lỗi runtime khi nguyên nhân là CLI đang trỏ sai vault.

## Definition of done

Trước khi coi task là xong:

- Không có import `@base-ui/react/*` ngoài `src/components/ui/**`.
- Không có hard-coded màu/spacing mới trong CSS.
- Lifecycle dùng registration APIs của Obsidian.
- File operations dùng API đúng cho active editor/background/frontmatter.
- UI text sentence case; command id/name sạch.
- `npm run lint` và `npm run build` đã chạy, hoặc ghi rõ vì sao không chạy.
- Nếu có thể reload plugin bằng CLI, kiểm tra `obsidian vault=PlaygrondObsidianVault dev:errors` sau reload.
