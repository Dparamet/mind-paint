# 🎨 Mind Paint

> **A local-first drawing & thinking board**
> Built with React, Vite, TypeScript, TailwindCSS, React-Konva, Zustand, and native IndexedDB

---

## ✨ Overview

**Mind Paint** is a fast, lightweight, and offline-first canvas designed for visual thinking, brainstorming, and sketching.
It provides a smooth, flexible drawing experience without requiring any backend.

---

## 🚀 Features

### ✏️ Drawing Tools

| Tool             | Shortcut | Description                                                       |
| ---------------- | -------- | ----------------------------------------------------------------- |
| Select / Move    | `V`      | Click to select, Shift+click for multi-select, drag to box-select |
| Lasso            | `L`      | Freehand selection                                                |
| Pen              | `P`      | Smooth freehand stroke                                            |
| Pencil           | —        | Lightweight natural stroke                                        |
| Eraser           | `E`      | Remove elements                                                   |
| Fill Bucket      | `F`      | Flood-fill canvas                                                 |
| Rectangle        | `R`      | Draw rectangles in any direction                                  |
| Circle / Ellipse | `C`      | Draw circles or ellipses                                          |
| Line Styles      | `A`      | Arrow styles, dashed, dotted                                      |
| Shapes           | —        | Triangle, diamond, star, etc.                                     |
| Text             | `T`      | Inline editable text                                              |
| Sticky Note      | —        | Editable notes                                                    |
| Mind Node        | —        | Nodes for mind mapping                                            |
| Speech Bubble    | —        | Annotation bubbles                                                |

---

### 🧭 Canvas

* Infinite canvas with smooth navigation
* Pan: `Space + drag` or middle mouse
* Zoom: scroll (15% – 400%)
* Marquee & lasso selection
* Optional snap-to-grid (24px)
* Duplicate: `Alt + drag`
* Paste images directly from clipboard

---

### 🎨 Styling

* Color picker with recent history (last 12 colors)
* Opacity control (10% – 100%)
* Stroke styles: solid, dashed, dotted
* Line endpoints: none, start, end, both
* Brush size (1–48)
* Text formatting (font, size, bold, italic)
* Sticky note color presets

---

### 🔧 Selection & Transform

* Multi-select via Shift, drag, or lasso
* Resize & rotate (Konva Transformer)
* Z-order controls (front/back)
* Align & distribute tools
* Properties panel (X, Y, Width, Height, Rotation)

---

### 🗂️ Layers

* Create, rename, delete
* Reorder layers
* Lock / hide elements

---

### 📁 Projects

* Auto-save every 3 seconds (IndexedDB)
* Manual save (`Ctrl+S`)
* Project Manager (create, load, delete)
* Automatic session restore

---

### 📤 Export & Import

| Format          | Notes                        |
| --------------- | ---------------------------- |
| PNG @3x         | High quality                 |
| Transparent PNG | No background                |
| JPEG @3x        |                              |
| PDF             | Single page                  |
| SVG             | Raster wrapper               |
| JSON            | Full project data            |
| Import JSON     | Up to 25MB                   |
| Import Image    | PNG/JPEG/WebP/GIF up to 10MB |

---

### ⌨️ Keyboard Shortcuts

| Key               | Action            |
| ----------------- | ----------------- |
| Ctrl+Z / Ctrl+Y   | Undo / Redo       |
| Ctrl+C / Ctrl+V   | Copy / Paste      |
| Ctrl+D            | Duplicate         |
| Delete            | Remove selected   |
| Space + Drag      | Pan               |
| Scroll            | Zoom              |
| Alt + Drag        | Duplicate element |
| V P E R C T F A L | Tool shortcuts    |

---

## 🛠️ Setup

### Install

```bash
npm install
```

### Run (Development)

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Test

```bash
npm test
```

> ✅ Includes 119 tests covering state management, IndexedDB, import/export validation, geometry, lasso selection, and UI behavior.

---

## 💾 Storage

* **IndexedDB** → Project data
* **localStorage** → Editor settings
* ❌ No backend required

---

## 🔒 Security

* Strict validation for all imported JSON files
* File size limits (JSON ≤ 25MB, Images ≤ 10MB)
* Content Security Policy (CSP) enabled
* Secure headers on Vercel deployments
* Service worker caches only safe requests
* Sensitive files excluded via `.gitignore`
* Security audit: `npm audit --audit-level=high`

---

## 🧱 Architecture

```
src/
  components/      → UI, canvas, panels
  store/           → Zustand state management
  db/              → IndexedDB adapter
  utils/           → geometry, export, clipboard
  types/           → shared types
  test/            → unit tests
```

---

## ⚡ Performance

* 60 FPS interactions (Konva + batchDraw)
* No React re-render during drag operations
* Optimized selection & layer rendering
* Autosave debounced (3 seconds)
* History capped at 40 snapshots
* Bundle size: **187.36 kB gzip** (−15.2%)
* CSS: **4.60 kB gzip**

---

## 🚀 Deploy

* Supports **Vercel** and **GitHub Pages**
* Configured with `base: './'` for static hosting
* Production-ready security headers

---

## 🎯 Philosophy

> Local-first • Fast • Lightweight • No backend • Full control

---

## 👨‍💻 Author

**Paramet D.**
Computer Engineering Student 🇹🇭

---

## ⭐️ Support

If you find this project useful, consider giving it a ⭐ on GitHub!
