# Mind Paint

Local-first drawing and thinking board built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and Dexie.js.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Storage

- Project data is saved in IndexedDB through Dexie.js.
- `localStorage` is only used for small editor settings such as selected tool, stroke color, fill color, and brush size.
- No backend is required.

## Deploy

The Vite config uses:

```ts
base: './'
```

This keeps the build deployable on Vercel and GitHub Pages.
