# Line Style Dropdown and Teal Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Combine Line and Arrow into one style-aware toolbar control and make teal (`#0f766e`) the app's consistent primary interaction color.

**Architecture:** Keep the existing `line` and `arrow` canvas element types for document compatibility, but drive creation through a persisted `LineHead` setting. Centralize endpoint-to-element conversion in `elementUtils`, then reuse it from Toolbar selection updates and Canvas creation/rendering.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Konva/react-konva, Tailwind CSS 3, Vitest, Testing Library

## Global Constraints

- Preserve existing `line` and `arrow` documents.
- Endpoint styles are exactly `none`, `end`, `start`, and `both`.
- Stroke patterns remain exactly `solid`, `dashed`, and `dotted`.
- Keep shortcut `A` as the quick end-arrow action.
- Use teal `#0f766e` for ordinary interactive emphasis; retain coral only for destructive/error semantics.
- Do not add dependencies.

---

### Task 1: Line style model and conversion helpers

**Files:**
- Modify: `src/types/editor.ts`
- Modify: `src/utils/elementUtils.ts`
- Modify: `src/store/useEditorStore.ts`
- Test: `src/test/elementUtils.test.ts`

**Interfaces:**
- Produces: `LineHead = 'none' | 'end' | 'start' | 'both'`
- Produces: `lineHeadPatch(head: LineHead): Partial<LineElement | ArrowElement>`
- Produces: persisted store fields `lineHead: LineHead` and `setLineHead(head: LineHead): void`

- [ ] **Step 1: Write failing helper tests**

```ts
expect(lineHeadPatch('none')).toMatchObject({ type: 'line' });
expect(lineHeadPatch('end')).toMatchObject({ type: 'arrow', pointerAtBeginning: false, pointerAtEnding: true });
expect(lineHeadPatch('start')).toMatchObject({ type: 'arrow', pointerAtBeginning: true, pointerAtEnding: false });
expect(lineHeadPatch('both')).toMatchObject({ type: 'arrow', pointerAtBeginning: true, pointerAtEnding: true });
```

- [ ] **Step 2: Run the focused test and verify failure**

Run: `npm test -- src/test/elementUtils.test.ts`

Expected: FAIL because `lineHeadPatch` and `LineHead` do not exist.

- [ ] **Step 3: Add the model and helper**

```ts
export type LineHead = 'none' | 'end' | 'start' | 'both';

export function lineHeadPatch(head: LineHead): Partial<LineElement | ArrowElement> {
  if (head === 'none') return { type: 'line' };
  return {
    type: 'arrow',
    pointerLength: 18,
    pointerWidth: 18,
    pointerAtBeginning: head === 'start' || head === 'both',
    pointerAtEnding: head === 'end' || head === 'both',
  };
}
```

Add optional `pointerAtBeginning` and `pointerAtEnding` to `ArrowElement`. Add `lineHead` to `EditorSettings`, default it to `none`, include it in `pickSettings`, and add a persisted `setLineHead` action.

- [ ] **Step 4: Run the focused test**

Run: `npm test -- src/test/elementUtils.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the model**

```bash
git add src/types/editor.ts src/utils/elementUtils.ts src/store/useEditorStore.ts src/test/elementUtils.test.ts
git commit -m "feat: add persisted line endpoint styles"
```

### Task 2: Unified Line dropdown

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Consumes: `LineHead`, `lineHeadPatch`, `DASH_MAP`, `setLineHead`, `setStrokeDash`
- Produces: accessible `Line styles` trigger and `Line style tools` menu

- [ ] **Step 1: Write failing toolbar tests**

```ts
await user.click(screen.getByRole('button', { name: 'Line styles' }));
expect(screen.getByRole('menu', { name: 'Line style tools' })).toBeInTheDocument();
await user.click(screen.getByRole('menuitemradio', { name: 'Arrow at both ends' }));
expect(useEditorStore.getState().lineHead).toBe('both');
await user.click(screen.getByRole('button', { name: 'Line styles' }));
await user.click(screen.getByRole('menuitemradio', { name: 'Dashed line' }));
expect(useEditorStore.getState().strokeDash).toBe('dashed');
```

Also assert Escape and outside pointer interaction close the menu.

- [ ] **Step 2: Run the toolbar test and verify failure**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: FAIL because the Line styles trigger is absent.

- [ ] **Step 3: Implement the Line dropdown**

Remove the standalone Line/Arrow group entries. Add one trigger before Shapes and a popover with endpoint and stroke groups. Render compact SVG previews, expose radio semantics, and share Escape/outside-click cleanup with the Shape menu. Endpoint selection calls `setTool(head === 'none' ? 'line' : 'arrow')`, `setLineHead(head)`, and applies `lineHeadPatch(head)` to selected line/arrow elements. Dash selection calls `setStrokeDash(dash)` and applies `DASH_MAP[dash]` to selected line/arrow elements, tracking history only for the first update.

- [ ] **Step 4: Run toolbar tests**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit the dropdown**

```bash
git add src/components/Toolbar.tsx src/test/toolbar-layout.test.tsx
git commit -m "feat: unify line and arrow tools"
```

### Task 3: Draw and render all endpoint styles

**Files:**
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/store/useEditorStore.ts`
- Test: `src/test/store-undo.test.ts`

**Interfaces:**
- Consumes: `lineHead`, `lineHeadPatch`
- Produces: Konva arrows with `pointerAtBeginning` and `pointerAtEnding`

- [ ] **Step 1: Write failing store behavior test**

```ts
state.setLineHead('both');
expect(useEditorStore.getState().lineHead).toBe('both');
expect(JSON.parse(localStorage.getItem('mind-paint-settings') ?? '{}').lineHead).toBe('both');
```

- [ ] **Step 2: Run the focused store test and verify failure**

Run: `npm test -- src/test/store-undo.test.ts`

Expected: FAIL before the persisted action is wired.

- [ ] **Step 3: Use line style during creation and rendering**

Read `lineHead` in `CanvasStage`. Treat both legacy tools as one segment workflow: `tool === 'line'` forces no head, while `tool === 'arrow'` uses the stored headed style and falls back to `end`. Spread `lineHeadPatch(effectiveHead)` into the new element. Pass `pointerAtBeginning={element.pointerAtBeginning ?? false}` and `pointerAtEnding={element.pointerAtEnding ?? true}` to Konva `Arrow` so old arrows retain their end pointer.

Update shortcut handling so selecting tool `arrow` also sets `lineHead` to `end`, preserving `A` as a predictable quick action.

- [ ] **Step 4: Run focused and full tests**

Run: `npm test -- src/test/store-undo.test.ts src/test/toolbar-layout.test.tsx src/test/elementUtils.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit canvas support**

```bash
git add src/components/CanvasStage.tsx src/store/useEditorStore.ts src/test/store-undo.test.ts
git commit -m "feat: render configurable line endpoints"
```

### Task 4: Teal-first theme consolidation and verification

**Files:**
- Modify: `tailwind.config.js`
- Modify: `src/styles.css`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/Topbar.tsx`
- Modify: `src/components/LayerPanel.tsx`
- Modify: `src/components/SettingsPanel.tsx`
- Modify: `src/components/ProjectManager.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Test: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Consumes: Tailwind `accent`, neutral surface tokens, and semantic `coral`
- Produces: teal-only ordinary interaction states across the app

- [ ] **Step 1: Add a theme regression assertion**

Assert the Toolbar logo and selected popover items use `border-accent`, `bg-accent/10` or `bg-accent`, and do not use `sunshine` or `sky` classes.

- [ ] **Step 2: Run the test and verify failure**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: FAIL while the Toolbar still uses sunshine/sky emphasis.

- [ ] **Step 3: Replace non-semantic accent variants**

Replace ordinary `sunshine` and `sky` emphasis with `accent` equivalents in interactive highlights, panel headings, status strips, grid decoration, and hover states. Keep `coral` only on destructive actions. Change the logo treatment to teal and use the neutral panel color for its glyph. Remove unused `sunshine` and `sky` tokens from `tailwind.config.js` once `rg "sunshine|sky" src` returns no ordinary UI usages.

- [ ] **Step 4: Verify code, tests, and build**

Run: `npm test`

Expected: all tests PASS.

Run: `npm run build`

Expected: TypeScript and Vite build complete successfully.

Run: `rg -n "sunshine|sky" src tailwind.config.js`

Expected: no ordinary interaction usages; any remaining match has explicit semantic justification.

- [ ] **Step 5: Commit theme and final verification**

```bash
git add tailwind.config.js src/styles.css src/components src/test/toolbar-layout.test.tsx
git commit -m "style: unify app around teal accent"
```
