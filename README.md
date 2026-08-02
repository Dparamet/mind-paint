# Mind Paint

Local-first drawing and thinking board built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and native IndexedDB.

## Features

### Drawing Tools
| Tool | Shortcut | Notes |
|------|----------|-------|
| Select / Move | `V` | Click, Shift+click multi-select, drag marquee to box-select |
| Lasso | `L` | Freehand polygon select — draw any shape to select elements within it |
| Pen | `P` | Smooth freehand stroke |
| Pencil | — | Lighter freehand stroke |
| Eraser | `E` | Deletes elements under cursor |
| Fill bucket | `F` | Flood-fill on canvas pixels |
| Rectangle | `R` | Drag any direction — no negative-size bug |
| Circle / Ellipse | `C` | |
| Line styles | `A` | One dropdown for plain, start-arrow, end-arrow, and double-arrow lines; solid, dashed, or dotted strokes |
| Shapes dropdown | — | Rectangle, Circle/Ellipse, Triangle, Diamond, Pentagon, Hexagon, Octagon, Star |
| Text | `T` | Click to place; inline editor (`Enter` commit, `Shift+Enter` newline, `Esc` cancel) |
| Sticky note | — | Double-click to edit inline; Enter commits, Esc cancels (blank sticky auto-deletes on Esc) |
| Mind node | — | Double-click to edit inline |
| Speech bubble | — | Double-click to edit inline |

### Canvas
- **Infinite canvas** — pan with Space+drag or middle mouse, zoom with scroll wheel (15 %–400 %)
- **Marquee select** — drag on empty canvas to box-select multiple elements
- **Lasso select** — press `L` and draw a freehand shape to select elements partially or fully inside it
- **Snap to grid** — optional 24 px grid with snap toggle
- **Zoom slider** — top-left HUD with reset and fit-to-screen buttons
- **Alt+drag** to duplicate any element in place
- **Paste image** from clipboard

### Styling
- **Application themes** — Warm, Light, Dark, or Custom; Custom derives a complete palette from one primary color and supports optional per-surface overrides
- **Stroke & Fill** color pickers — click swatch to open popover: 12 preset colors, auto-tracked recent-color history (last 12, deduplicated, persisted), and a custom native picker
- **Opacity slider** — shown when element(s) selected (10 %–100 %)
- **Stroke dash** — solid `—`, dashed `╌`, dotted `···` — applies to new and selected elements
- **Line endpoints** — none, start, end, or both — applies to new and selected line elements
- **Brush size** slider (1–48)
- **Text controls** — font family, size, bold, italic (context-aware, shown for text tool or selected text)
- **Sticky color presets** — per-sticky background color swatches shown in Topbar when sticky/mindNode/speech selected

### Selection & Transform
- Multi-select with Shift+click, marquee drag, or lasso
- Resize + rotate via Konva Transformer handles
- **Z-order** — Bring to Front / Forward / Backward / Send to Back (shown in toolbar when 1 element selected)
- **Align & Distribute** — shown when ≥ 2 elements selected: align left / center / right / top / middle / bottom; distribute H/V (≥ 3 elements)
- **Properties panel** — live X, Y, W, H, Rotation, Stroke-Width inputs in right sidebar when element selected

### Layers
- Add, rename, delete, reorder (up/down), toggle visibility, lock/unlock

### Projects
- Auto-save debounced 3 s to native IndexedDB
- Manual save `Ctrl+S` equivalent via Save button
- Multiple projects with create / load / delete in Project Manager
- Last session auto-restored on open

### Export & Import
| Format | Notes |
|--------|-------|
| PNG @3x | |
| Transparent PNG | |
| JPEG @3x | |
| PDF | Basic single-page |
| SVG | Raster-in-SVG wrapper |
| Project JSON | Full project round-trip |
| Import JSON | Validated `.json` project, maximum 25 MB |
| Import image | PNG/JPEG/WebP/GIF from file or Ctrl+V paste, maximum 10 MB |

### Keyboard Shortcuts
| Keys | Action |
|------|--------|
| `Ctrl+Z` | Undo (40-step) |
| `Ctrl+Y` | Redo |
| `Ctrl+C` | Copy selected |
| `Ctrl+V` | Paste (elements or image from clipboard) |
| `Ctrl+D` | Duplicate selected |
| `Delete` / `Backspace` | Delete selected |
| `Space+drag` | Pan canvas |
| `Middle drag` | Pan canvas |
| `Scroll` | Zoom |
| `Alt+drag` | Drag-duplicate element |
| `V P E R C T F A L` | Tool shortcuts (customisable in Settings) |
| Right-click drag | Quick eraser |

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Test

```bash
npm test
```

Covers store actions, IndexedDB ordering/compatibility, project and image import validation, canvas/text placement, background modes, image masking, export helpers, geometry bounds, lasso selection, line styles, themes, toolbar accessibility, and type guards. 132 tests total.

## Storage

- **Native IndexedDB** — project data; adapter preserves the previous Dexie database/store schema
- **localStorage** — editor settings only (theme preferences, tool, colors, recent colors, brush size, shortcuts, grid prefs, stroke dash, line endpoints)
- No backend required

## Security

- Project JSON imports are validated at the boundary: schema, element kinds, dimensions, layer references, duplicate IDs, collection limits, and local image data URLs
- Project imports are limited to 25 MB; image upload/paste accepts PNG, JPEG, WebP, or GIF up to 10 MB
- CSP restricts scripts, images, connections, workers, forms, and embedded objects; Vercel deployments also receive HSTS, clickjacking, MIME-sniffing, referrer, and permissions headers
- The service worker caches same-origin successful GET responses only and uses the app-shell fallback only for navigation requests
- Local secret files and private key formats are excluded by `.gitignore`
- Release check: `npm audit --audit-level=high`

## Architecture

```
src/
  App.tsx                  — shell, keyboard shortcuts, autosave, session recovery
  components/
    CanvasStage.tsx        — Konva stage, all drawing/selection/zoom/pan logic
    Toolbar.tsx            — left tool picker (4 groups: Selection, Draw, Shape, Annotate)
    Topbar.tsx             — color, style, text, z-order, align/distribute, export controls
    LayerPanel.tsx         — layer management
    ProjectManager.tsx     — project CRUD
    PropertiesPanel.tsx    — live X/Y/W/H/rotation/strokeWidth inputs
    ColorPicker.tsx        — stroke/fill swatch + popover with presets + recent history
    SettingsPanel.tsx      — settings modal shell
    ThemeRoot.tsx          — applies resolved theme CSS variables to the application
    ThemeSettings.tsx      — preset, custom palette, advanced override, and reset controls
  store/
    useEditorStore.ts      — Zustand store: state, history, settings, layer/element/project actions
  db/
    indexedDb.ts           — native IndexedDB adapter (Dexie-schema compatible)
  types/
    editor.ts              — CanvasElement union, EditorSettings, Layer, StrokeDash, LineHead, isStickyLike
  theme/
    theme.ts               — presets, custom palette derivation, validation, and contrast correction
  utils/
    elementUtils.ts        — bounds, dash/line-head mappings, lasso geometry
    exportUtils.ts         — PNG/JPEG/PDF/SVG/JSON helpers + project validation
    clipboardUtils.ts      — validated image paste / file-to-dataURL helpers
  test/
    elementUtils.test.ts   — bounds, zero-size guards, dash/head mappings
    indexedDb.test.ts      — ordering + legacy database-version compatibility
    exportUtils.test.ts    — exports + untrusted project import validation
    clipboardUtils.test.ts — image type/size validation
    lasso-selection.test.ts — pointInPolygon + isElementInLasso
    sticky-typeguard.test.ts — isStickyLike type guard
```

## Performance Notes

- **Lasso & marquee drag at 60 fps** — imperative Konva refs + `batchDraw()` bypass React reconciler entirely during drag; no `setState` per frame
- `EMPTY_POINTS` module-level constant keeps React-Konva `points` prop reference-stable, preventing Konva from wiping imperative updates on re-render
- `selectedEls` in Topbar memoized with `useMemo` + `new Set(selectedElementIds)` for O(1) lookup (was O(n·m))
- Autosave debounced 3 000 ms
- `elementsByLayer` memoised with `useMemo`
- History capped at 40 snapshots; identity-based duplicate-snapshot guard avoids serialization work
- Main bundle: **187.36 kB gzip**, reduced from **220.87 kB** (−33.51 kB / 15.2%) by replacing a 96 kB-source dependency with the native IndexedDB API
- Current production CSS: **4.60 kB gzip**

## Deploy

`vite.config.ts` uses `base: './'` for Vercel and GitHub Pages. `vercel.json` adds production security headers on Vercel; the HTML CSP remains the portable baseline on static hosts.
