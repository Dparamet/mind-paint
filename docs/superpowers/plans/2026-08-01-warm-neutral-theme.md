# Warm Neutral Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove green-tinted neutral surfaces while retaining teal (`#0f766e`) as the app's only interaction accent.

**Architecture:** Change the shared Tailwind neutral tokens first so most surfaces update centrally, then remove translucent teal fills from selected and hover states. Replace remaining hard-coded green neutral colors in checker patterns, canvas grid chrome, and scrollbars.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind CSS 3, Vitest, Testing Library, Vite

## Global Constraints

- `paper` must be `#f7f3ea`.
- `panel` remains `#fffaf0`.
- `line` must be `#ded5c7`.
- `accent` remains teal `#0f766e`.
- `coral` remains destructive/error-only.
- Green Screen and document sticky colors remain unchanged.
- Do not add dependencies or change persisted document data.

---

### Task 1: Warm neutral tokens and surfaces

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/styles.css`
- Modify: `src/App.tsx`
- Modify: `src/components/BackgroundMenu.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/components/LayerPanel.tsx`
- Modify: `src/components/ProjectManager.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/Toolbar.tsx`
- Test: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Consumes: existing Tailwind color names `paper`, `panel`, `line`, `accent`, `coral`
- Produces: warm neutral application chrome with teal-only interaction emphasis

- [ ] **Step 1: Write failing palette and surface tests**

```ts
expect(screen.getByText('M')).toHaveClass('bg-accent', 'text-panel');
render(<LayerPanel />);
expect(screen.getByLabelText('Rename Layer 1').closest('[class*="rounded-lg"]'))
  .toHaveClass('bg-panel', 'border-accent/50');
```

Also assert the active layer row does not have `bg-accent/10`. Verify Project card classes through the palette source scan in Step 4.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: FAIL because `paper` and `line` still use green-tinted values and the active layer still uses `bg-accent/10`.

- [ ] **Step 3: Implement shared warm neutrals**

Set Tailwind colors:

```js
paper: '#f7f3ea',
panel: '#fffaf0',
line: '#ded5c7',
accent: '#0f766e',
coral: '#c84234'
```

Change ordinary `bg-accent/5` and `bg-accent/10` panel/header/row fills to `bg-paper` or `bg-panel`. Keep teal border/text/focus classes and solid `.tool-button-active`. Replace hard-coded `#cfe4db` with `#ded5c7`, scrollbar hover `#9fcabe` with `#b9aa97`, and canvas checker/grid green neutrals with `#ded5c7`.

- [ ] **Step 4: Verify focused tests and palette scan**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: PASS.

Run: `rg -n "#effaf5|#cfe4db|#9fcabe|bg-accent/5|bg-accent/10" src tailwind.config.js`

Expected: no ordinary application-chrome matches. Any retained translucent teal class must be on a compact interaction state rather than a panel/card surface.

- [ ] **Step 5: Run full verification**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.js src/styles.css src/App.tsx src/components src/test/toolbar-layout.test.tsx
git commit -m "style: warm application neutral surfaces"
```
