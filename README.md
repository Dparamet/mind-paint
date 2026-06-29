# Mind Paint

Local-first drawing and thinking board built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and Dexie.js.

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
| Line | — | |
| Arrow | `A` | |
| Text | `T` | Click to place; inline editor (Enter commit, Esc cancel) |
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
- **Stroke & Fill** color pickers — click swatch to open popover: 12 preset colors, auto-tracked recent-color history (last 12, deduplicated, persisted), and a custom native picker
- **Opacity slider** — shown when element(s) selected (10 %–100 %)
- **Stroke dash** — solid `—`, dashed `╌`, dotted `···` — applies to new and selected elements
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
- Auto-save debounced 3 s to IndexedDB (Dexie.js)
- Manual save `Ctrl+S` equivalent via Save button
- Multiple projects with create / load / delete in Project Manager
- Last session auto-restored on open

### Export & Import
| Format | Notes |
|--------|-------|
| PNG @3x | |
| PNG transparent | |
| JPEG @3x | |
| PDF | Basic single-page |
| SVG | Raster-in-SVG wrapper |
| JSON | Full project round-trip |
| Import JSON | Loads project from `.json` file |
| Import image | From file or Ctrl+V paste |

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

Covers: store actions (undo/redo, layer CRUD, z-order, element CRUD), `getElementBounds` (including zero-size guards), `DASH_MAP`, `exportUtils`, `pointInPolygon`, `isElementInLasso`, and `isStickyLike` type guard. 58 tests total.

## Storage

- **IndexedDB** (via Dexie.js) — project data
- **localStorage** — editor settings only (tool, colors, recent colors, brush size, shortcuts, grid prefs, stroke dash)
- No backend required

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
    SettingsPanel.tsx      — shortcuts + grid settings
  store/
    useEditorStore.ts      — Zustand store: state, history, settings, layer/element/project actions
  db/
    indexedDb.ts           — Dexie schema + helpers
  types/
    editor.ts              — CanvasElement union, EditorSettings, Layer, StrokeDash, isStickyLike
  utils/
    elementUtils.ts        — getElementBounds, DASH_MAP, pointInPolygon, isElementInLasso
    exportUtils.ts         — PNG/JPEG/PDF/SVG/JSON download helpers
    clipboardUtils.ts      — image paste / file-to-dataURL helpers
  test/
    elementUtils.test.ts   — bounds, zero-size guards, DASH_MAP
    lasso-selection.test.ts — pointInPolygon + isElementInLasso
    sticky-typeguard.test.ts — isStickyLike type guard
```

## Performance Notes

- **Lasso & marquee drag at 60 fps** — imperative Konva refs + `batchDraw()` bypass React reconciler entirely during drag; no `setState` per frame
- `EMPTY_POINTS` module-level constant keeps React-Konva `points` prop reference-stable, preventing Konva from wiping imperative updates on re-render
- `selectedEls` in Topbar memoized with `useMemo` + `new Set(selectedElementIds)` for O(1) lookup (was O(n·m))
- Autosave debounced 3 000 ms
- `elementsByLayer` memoised with `useMemo`
- History capped at 40 snapshots; duplicate-snapshot guard via `JSON.stringify` comparison
- Main bundle ~204 kB gzip. Next target: dynamic `import()` for export/project-management code

## Deploy

`vite.config.ts` uses `base: './'` — deployable on Vercel and GitHub Pages without changes.
