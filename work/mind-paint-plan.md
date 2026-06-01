# Mind Paint Implementation Plan

Goal: build a frontend-only React drawing and thinking board MVP.

Architecture: Vite hosts a single-page app. Zustand owns editor state/history, React-Konva renders canvas layers, Dexie persists projects and large canvas/image JSON in IndexedDB. localStorage is used only for small editor settings.

Tasks:
- Create React + Vite + TypeScript + Tailwind config.
- Add editor types, export helpers, clipboard image helpers, and Dexie database.
- Implement Zustand editor store with tools, layers, drawing objects, undo/redo, save/load shape.
- Implement `CanvasStage.tsx` for drawing, select/move/resize, image upload/paste, text insertion.
- Implement toolbar, topbar, layer panel, project manager, app shell.
- Run `npm install`, then `npm run build`.
