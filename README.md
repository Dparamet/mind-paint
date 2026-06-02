# Mind Paint

Local-first drawing and thinking board built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and Dexie.js.

## Features

- Drawing tools for pen, pencil, eraser, line, arrow, rectangle, circle, text, sticky note, mind node, and speech bubble.
- Select, move, resize, rotate, duplicate, delete, undo, and redo.
- Layer management with visibility, lock, rename, reorder, and delete controls.
- Project save/load/delete in IndexedDB.
- Image import from file or clipboard.
- Export to PNG, JPEG, SVG, PDF, and project JSON.
- Local editor settings persisted in `localStorage`.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Current production build baseline:

```text
vite v7.3.3
dist/index.html                  0.60 kB | gzip:   0.34 kB
dist/assets/index-DxII_bnO.css  12.64 kB | gzip:   3.20 kB
dist/assets/index-DBq-WFeP.js  653.46 kB | gzip: 204.07 kB
```

Build status: passes. Vite reports the main JS chunk is larger than `500 kB` after minification.

## Storage

- Project data is saved in IndexedDB through Dexie.js.
- `localStorage` is only used for small editor settings such as selected tool, stroke color, fill color, and brush size.
- No backend is required.

## Architecture

- `src/App.tsx` wires the editor shell, global keyboard shortcuts, last-session recovery, and autosave.
- `src/components/CanvasStage.tsx` renders React-Konva layers and handles drawing, selection, zoom, pan, paste, and transforms.
- `src/store/useEditorStore.ts` owns editor state, history, settings persistence, layer actions, and project save/load helpers.
- `src/db/indexedDb.ts` defines the Dexie database and `projects` table.
- `src/utils/exportUtils.ts` and `src/utils/clipboardUtils.ts` handle export/import helpers.

## Performance Notes

- Autosave is debounced for `3000ms` to avoid writing IndexedDB on every edit.
- `CanvasStage` groups elements by layer with `useMemo`.
- Dexie indexes `projects` by `id`, `name`, `updatedAt`, and `createdAt`.
- Main bundle is near the suggested `< 200KB gzipped` initial JavaScript budget (`204.07 kB gzip` in the latest measured build).
- Next optimization target: split rarely used export/project-management code with `dynamic import()` or Rollup `manualChunks`.

## Testing And Quality

```bash
npm run build
```

`npm test` is not configured yet:

```text
npm error Missing script: "test"
```

Recommended next quality step: add a small test runner such as Vitest, then cover store behavior in `src/store/useEditorStore.ts` before changing editor logic.

## Deploy

The Vite config uses:

```ts
base: './'
```

This keeps the build deployable on Vercel and GitHub Pages.
