# Mind Paint

Local-first drawing and thinking board built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and Dexie.js.

## Features

### Drawing Tools
| Tool | Shortcut | Notes |
|------|----------|-------|
| Select / Move | `V` | Click, Shift+click multi-select, drag marquee to box-select |
| Pen | `P` | Smooth freehand stroke |
| Pencil | — | Lighter freehand stroke |
| Eraser | `E` | Deletes elements under cursor |
| Fill bucket | `F` | Flood-fill on canvas pixels |
| Rectangle | `R` | Drag any direction — no negative-size bug |
| Circle / Ellipse | `C` | |
| Line | — | |
| Arrow | `A` | |
| Text | `T` | Click to place; inline editor (Enter commit, Esc cancel) |
| Sticky note | — | |
| Mind node | — | |
| Speech bubble | — | |

### Canvas
- **Infinite canvas** — pan with Space+drag or middle mouse, zoom with scroll wheel (15 %–400 %)
- **Marquee select** — drag on empty canvas to box-select multiple elements
- **Snap to grid** — optional 24 px grid with snap toggle
- **Zoom slider** — top-left HUD with reset and fit-to-screen buttons
- **Alt+drag** to duplicate any element in place
- **Paste image** from clipboard

### Styling
- **Stroke & Fill** color pickers — live-apply to selected elements; 12 recent colors auto-tracked
- **Opacity slider** — shown when element(s) selected (10 %–100 %)
- **Stroke dash** — solid `—`, dashed `╌`, dotted `···` — applies to new and selected elements
- **Brush size** slider (1–48)
- **Text controls** — font family, size, bold, italic (context-aware, shown for text tool or selected text)

### Selection & Transform
- Multi-select with Shift+click or marquee drag
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
| `V P E R C T F A` | Tool shortcuts (customisable in Settings) |
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

Covers: store actions (undo/redo, layer CRUD, z-order, element CRUD), `getElementBounds`, `DASH_MAP`, and `exportUtils`.

## Storage

- **IndexedDB** (via Dexie.js) — project data
- **localStorage** — editor settings only (tool, colors, brush size, shortcuts, grid prefs, stroke dash)
- No backend required

## Architecture

```
src/
  App.tsx                  — shell, keyboard shortcuts, autosave, session recovery
  components/
    CanvasStage.tsx        — Konva stage, all drawing/selection/zoom/pan logic
    Toolbar.tsx            — left tool picker
    Topbar.tsx             — color, style, text, z-order, align/distribute, export controls
    LayerPanel.tsx         — layer management
    ProjectManager.tsx     — project CRUD
    PropertiesPanel.tsx    — live X/Y/W/H/rotation/strokeWidth inputs
    ColorPicker.tsx        — stroke/fill swatch + popover
    SettingsPanel.tsx      — shortcuts + grid settings
  store/
    useEditorStore.ts      — Zustand store: state, history, settings, layer/element/project actions
  db/
    indexedDb.ts           — Dexie schema + helpers
  types/
    editor.ts              — CanvasElement union, EditorSettings, Layer, StrokeDash
  utils/
    elementUtils.ts        — getElementBounds, DASH_MAP
    exportUtils.ts         — PNG/JPEG/PDF/SVG/JSON download helpers
    clipboardUtils.ts      — image paste / file-to-dataURL helpers
```

## Performance Notes

- Autosave debounced 3 000 ms
- `elementsByLayer` memoised with `useMemo`
- History capped at 40 snapshots; duplicate-snapshot guard via `JSON.stringify` comparison
- Main bundle ~204 kB gzip. Next target: dynamic `import()` for export/project-management code

## Deploy

`vite.config.ts` uses `base: './'` — deployable on Vercel and GitHub Pages without changes.
