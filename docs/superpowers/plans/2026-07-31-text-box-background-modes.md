# Text Box and Background Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users drag on the canvas to create editable text boxes and choose a persisted Normal, Transparent, or Green Screen project background that exports consistently.

**Architecture:** Add project-level `backgroundMode` state and isolate background/export decisions in pure utilities. Extend the existing Konva pointer pipeline with a text draft rectangle that becomes a `TextElement` on pointer-up, then reuse the existing inline editor. Keep the new background menu in its own component so the already-large Topbar remains readable.

**Tech Stack:** React 19, TypeScript, Zustand, Konva/react-konva, Tailwind CSS, Vitest, Testing Library

## Global Constraints

- Text interaction is `select Text → drag on Canvas → release → type immediately`.
- A click without a meaningful drag creates a `260 × 72` text box.
- Text boxes have a minimum size of `80 × 36` and support reverse-direction drags.
- Background modes are exactly `normal`, `transparent`, and `greenScreen`.
- Green Screen uses chroma green `#00FF00`.
- Transparent JPEG and PDF exports use white because those outputs do not support alpha.
- `Transparent PNG` forces alpha for one export without changing project state.
- Older Project JSON without new fields must continue to load.
- No new runtime dependency.

---

## File Structure

- Create `src/utils/textBoxUtils.ts`: pure text-box geometry and fallback dimensions.
- Create `src/test/textBoxUtils.test.ts`: geometry behavior.
- Create `src/utils/backgroundUtils.ts`: canvas/export background decisions and safe temporary node mutation.
- Create `src/test/backgroundUtils.test.ts`: mode/mime decisions and restoration behavior.
- Create `src/components/BackgroundMenu.tsx`: accessible portaled background selector.
- Create `src/test/background-menu.test.tsx`: interaction/accessibility tests.
- Modify `src/types/editor.ts`: `BackgroundMode`, `TextElement.height`, and project field.
- Modify `src/store/useEditorStore.ts`: defaults, setter, load normalization, and serialization.
- Modify `src/App.tsx`: include background mode in the autosave dependency key.
- Modify `src/components/CanvasStage.tsx`: text drag lifecycle, box rendering/editing, and stage background.
- Modify `src/components/Topbar.tsx`: mount Background menu and make exports mode-aware.
- Modify `src/test/canvas-text-placement.test.tsx`: pointer gesture integration coverage.
- Modify `src/test/store-undo.test.ts`: persistence/backward compatibility coverage.
- Modify `src/test/toolbar-layout.test.tsx`: Background control remains reachable in the action toolbar.

---

### Task 1: Persist Background Mode and Text Box Height

**Files:**
- Modify: `src/types/editor.ts`
- Modify: `src/store/useEditorStore.ts`
- Modify: `src/App.tsx`
- Test: `src/test/store-undo.test.ts`

**Interfaces:**
- Produces: `BackgroundMode = 'normal' | 'transparent' | 'greenScreen'`
- Produces: `EditorStore.setBackgroundMode(mode: BackgroundMode): void`
- Produces: `EditorDocument.backgroundMode: BackgroundMode`
- Produces: `TextElement.height?: number` for old-project compatibility; every newly created text box writes it.

- [ ] **Step 1: Write failing store tests**

Add tests that independently assert the public store behavior:

```ts
it('persists the selected project background mode', () => {
  const state = useEditorStore.getState();
  state.setBackgroundMode('greenScreen');

  expect(useEditorStore.getState().backgroundMode).toBe('greenScreen');
  expect(useEditorStore.getState().toProject().backgroundMode).toBe('greenScreen');
  expect(useEditorStore.getState().saveStatus).toBe('dirty');
});

it('defaults older projects to a normal background', () => {
  const current = useEditorStore.getState().toProject();
  const legacy = { ...current } as Partial<typeof current>;
  delete legacy.backgroundMode;

  useEditorStore.getState().loadProject(legacy as typeof current);

  expect(useEditorStore.getState().backgroundMode).toBe('normal');
});
```

- [ ] **Step 2: Run the tests and verify RED**

Run:

```bash
npm test -- src/test/store-undo.test.ts
```

Expected: TypeScript/test failure because `setBackgroundMode` and `backgroundMode` do not exist.

- [ ] **Step 3: Implement the model and store normalization**

In `src/types/editor.ts` add:

```ts
export type BackgroundMode = 'normal' | 'transparent' | 'greenScreen';

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  width: number;
  height?: number;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
}

export interface EditorDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
  backgroundMode: BackgroundMode;
}
```

In `src/store/useEditorStore.ts`:

```ts
const DEFAULT_BACKGROUND_MODE: BackgroundMode = 'normal';

function normalizeBackgroundMode(value: unknown): BackgroundMode {
  return value === 'transparent' || value === 'greenScreen' ? value : 'normal';
}
```

Add `backgroundMode: DEFAULT_BACKGROUND_MODE` in `createDocument()`, declare `setBackgroundMode`, implement it with `updatedAt: Date.now()` and `saveStatus: 'dirty'`, normalize the value in `loadProject`, and include it in `toProject()`.

Update `src/App.tsx` so `autosaveKey` includes `state.backgroundMode`.

- [ ] **Step 4: Run focused tests and verify GREEN**

```bash
npm test -- src/test/store-undo.test.ts
```

Expected: all tests in the file pass.

- [ ] **Step 5: Commit Task 1**

```bash
git add src/types/editor.ts src/store/useEditorStore.ts src/App.tsx src/test/store-undo.test.ts
git commit -m "feat: persist canvas background mode"
```

---

### Task 2: Drag to Create Text Boxes

**Files:**
- Create: `src/utils/textBoxUtils.ts`
- Create: `src/test/textBoxUtils.test.ts`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/test/canvas-text-placement.test.tsx`

**Interfaces:**
- Produces: `normalizeTextBox(start, end): { x: number; y: number; width: number; height: number }`
- Consumes: existing `TextElement`, `getPointer()`, grid snapping, inline editor state, and Konva overlay layer.

- [ ] **Step 1: Write failing pure geometry tests**

Create `src/test/textBoxUtils.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { normalizeTextBox } from '../utils/textBoxUtils';

describe('normalizeTextBox', () => {
  it('uses dragged bounds', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 220, y: 110 })).toEqual({
      x: 20, y: 30, width: 200, height: 80,
    });
  });

  it('normalizes reverse drags', () => {
    expect(normalizeTextBox({ x: 220, y: 110 }, { x: 20, y: 30 })).toEqual({
      x: 20, y: 30, width: 200, height: 80,
    });
  });

  it('uses the default box for a click', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 22, y: 31 })).toEqual({
      x: 20, y: 30, width: 260, height: 72,
    });
  });

  it('enforces minimum dimensions for a meaningful drag', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 70, y: 50 })).toEqual({
      x: 20, y: 30, width: 80, height: 36,
    });
  });
});
```

- [ ] **Step 2: Run geometry tests and verify RED**

```bash
npm test -- src/test/textBoxUtils.test.ts
```

Expected: FAIL because `textBoxUtils` does not exist.

- [ ] **Step 3: Implement pure geometry**

Create `src/utils/textBoxUtils.ts`:

```ts
const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 72;
const MIN_WIDTH = 80;
const MIN_HEIGHT = 36;
const DRAG_THRESHOLD = 4;

export function normalizeTextBox(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
    return { x: start.x, y: start.y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(MIN_WIDTH, Math.abs(dx)),
    height: Math.max(MIN_HEIGHT, Math.abs(dy)),
  };
}
```

Define the local `Point` interface in the same file.

- [ ] **Step 4: Run geometry tests and verify GREEN**

```bash
npm test -- src/test/textBoxUtils.test.ts
```

Expected: 4 tests pass.

- [ ] **Step 5: Write failing Canvas interaction tests**

Extend the `react-konva` Stage test double so its pointer follows `clientX/clientY` for `mouseDown`, `mouseMove`, and `mouseUp`. Add tests that assert real store output:

```ts
it('creates a text box from dragged canvas bounds and edits after release', () => {
  fireEvent.mouseDown(stage, { clientX: 100, clientY: 120 });
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  fireEvent.mouseMove(stage, { clientX: 340, clientY: 220 });
  fireEvent.mouseUp(stage, { clientX: 340, clientY: 220 });

  expect(screen.getByRole('textbox')).toBeInTheDocument();
  expect(useEditorStore.getState().elements).toEqual([
    expect.objectContaining({ type: 'text', x: 100, y: 120, width: 240, height: 100 }),
  ]);
});

it('creates the default text box from a click', () => {
  fireEvent.mouseDown(stage, { clientX: 100, clientY: 120 });
  fireEvent.mouseUp(stage, { clientX: 100, clientY: 120 });
  expect(useEditorStore.getState().elements[0]).toEqual(
    expect.objectContaining({ width: 260, height: 72 }),
  );
});
```

- [ ] **Step 6: Run Canvas tests and verify RED**

```bash
npm test -- src/test/canvas-text-placement.test.tsx
```

Expected: FAIL because the current Text tool creates the element on pointer-down and has no height.

- [ ] **Step 7: Implement the Text draft lifecycle**

In `CanvasStage.tsx`:

- Add `textDraftRef` containing `{ start, current }`.
- Add `textDraftKonvaRef` for the dashed preview rectangle.
- In `handlePointerDown`, when `tool === 'text'`, initialize the draft and show the preview; do not add an element yet.
- In `handleMouseMove`, update `current` and mutate preview bounds via `normalizeTextBox`.
- In `handleMouseUp`, hide the preview, create a `TextElement` with normalized `x`, `y`, `width`, and `height`, select it, and open inline editing.
- Render the preview in the overlay layer with `listening={false}`.
- Pass `height={element.height}` to Konva Text.
- Use `element.height ?? Math.max(72, element.fontSize * 3)` for inline editor height and transform fallback.

Preserve stale-edit cleanup, pan/zoom coordinates, snap behavior, and all non-Text pointer branches.

- [ ] **Step 8: Run Text tests and verify GREEN**

```bash
npm test -- src/test/textBoxUtils.test.ts src/test/canvas-text-placement.test.tsx
```

Expected: all geometry and Text placement tests pass.

- [ ] **Step 9: Commit Task 2**

```bash
git add src/utils/textBoxUtils.ts src/test/textBoxUtils.test.ts src/components/CanvasStage.tsx src/test/canvas-text-placement.test.tsx
git commit -m "feat: drag to create text boxes"
```

---

### Task 3: Background Menu and Canvas Preview

**Files:**
- Create: `src/components/BackgroundMenu.tsx`
- Create: `src/test/background-menu.test.tsx`
- Create: `src/utils/backgroundUtils.ts`
- Create: `src/test/backgroundUtils.test.ts`
- Modify: `src/components/Topbar.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Produces: `CANVAS_BACKGROUND_ID = 'canvas-background'`
- Produces: `getCanvasBackgroundFill(mode: BackgroundMode): string`
- Consumes: `BackgroundMenu({ value, onChange })`

- [ ] **Step 1: Write failing background decision tests**

Create `src/test/backgroundUtils.test.ts`:

```ts
expect(getCanvasBackgroundFill('normal')).toBe('#fffaf0');
expect(getCanvasBackgroundFill('transparent')).toBe('#00000000');
expect(getCanvasBackgroundFill('greenScreen')).toBe('#00FF00');
```

- [ ] **Step 2: Write failing menu behavior tests**

Create `src/test/background-menu.test.tsx` and render the real component:

```tsx
it('selects a background mode from an accessible menu', async () => {
  const onChange = vi.fn();
  render(<BackgroundMenu value="normal" onChange={onChange} />);

  await user.click(screen.getByRole('button', { name: 'Background: Normal' }));
  const green = screen.getByRole('menuitemradio', { name: 'Green Screen' });
  expect(green).toHaveAttribute('aria-checked', 'false');
  await user.click(green);

  expect(onChange).toHaveBeenCalledWith('greenScreen');
  expect(screen.queryByRole('menu', { name: 'Background modes' })).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run focused tests and verify RED**

```bash
npm test -- src/test/backgroundUtils.test.ts src/test/background-menu.test.tsx
```

Expected: FAIL because the utility and component do not exist.

- [ ] **Step 4: Implement background decisions and menu**

In `backgroundUtils.ts`, export the stable node id and exact fills.

Implement `BackgroundMenu.tsx` with:

- a native button labelled `Background: <mode label>`;
- a `menu` rendered with `createPortal(document.body)`;
- three `menuitemradio` buttons;
- `Escape`, outside pointer, scroll, and resize handling;
- fixed positioning and `z-[100]`, matching the Export overlay behavior;
- visible labels plus small swatches/checkerboard, never color-only state.

In `Topbar.tsx`, place the component beside Export:

```tsx
<BackgroundMenu value={state.backgroundMode} onChange={state.setBackgroundMode} />
```

In `CanvasStage.tsx`:

- select `backgroundMode` from the store;
- give the background rectangle `id={CANVAS_BACKGROUND_ID}`;
- set its fill with `getCanvasBackgroundFill(backgroundMode)`;
- add a checkerboard class to `<main>` only for transparent mode;
- keep the background rectangle non-listening.

- [ ] **Step 5: Run focused tests and verify GREEN**

```bash
npm test -- src/test/backgroundUtils.test.ts src/test/background-menu.test.tsx src/test/toolbar-layout.test.tsx
```

Expected: all focused tests pass and the Background button is inside the reachable actions toolbar.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/components/BackgroundMenu.tsx src/test/background-menu.test.tsx src/utils/backgroundUtils.ts src/test/backgroundUtils.test.ts src/components/Topbar.tsx src/components/CanvasStage.tsx src/test/toolbar-layout.test.tsx
git commit -m "feat: add canvas background modes"
```

---

### Task 4: Make Every Export Respect Background Mode

**Files:**
- Modify: `src/utils/backgroundUtils.ts`
- Modify: `src/test/backgroundUtils.test.ts`
- Modify: `src/components/Topbar.tsx`
- Test: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Produces: `getExportBackground(mode, mimeType, forceTransparent): string`
- Produces: `withTemporaryBackground<T>(node, fill, capture): T`
- Consumes: Konva background node selected by `#canvas-background`.

- [ ] **Step 1: Write failing export decision tests**

Add literal table cases:

```ts
expect(getExportBackground('transparent', 'image/png', false)).toBe('#00000000');
expect(getExportBackground('transparent', 'image/jpeg', false)).toBe('#FFFFFF');
expect(getExportBackground('greenScreen', 'image/jpeg', false)).toBe('#00FF00');
expect(getExportBackground('normal', 'image/png', true)).toBe('#00000000');
```

Add restoration coverage using a small node double whose real side effect is captured:

```ts
it('restores the stage background when capture throws', () => {
  let fill = '#fffaf0';
  const node = {
    getAttr: () => fill,
    setAttr: (_key: string, value: string) => { fill = value; },
  };

  expect(() => withTemporaryBackground(node, '#00FF00', () => { throw new Error('capture'); }))
    .toThrow('capture');
  expect(fill).toBe('#fffaf0');
});
```

- [ ] **Step 2: Run export utility tests and verify RED**

```bash
npm test -- src/test/backgroundUtils.test.ts
```

Expected: FAIL because export helpers do not exist.

- [ ] **Step 3: Implement safe export capture**

Implement MIME decisions exactly as the design table. `withTemporaryBackground` must use `try/finally`:

```ts
export function withTemporaryBackground<T>(node: BackgroundNode | null, fill: string, capture: () => T): T {
  if (!node) return capture();
  const previous = node.getAttr('fill');
  node.setAttr('fill', fill);
  try {
    return capture();
  } finally {
    node.setAttr('fill', previous);
  }
}
```

In `Topbar.tsx`, replace `stage.findOne('Rect')` with `stage.findOne(`#${CANVAS_BACKGROUND_ID}`)`. Route PNG, JPEG, SVG raster capture, and PDF capture through the helper. Keep `Transparent PNG` as `forceTransparent=true`. Do not mutate `state.backgroundMode` during export.

- [ ] **Step 4: Run focused export tests and verify GREEN**

```bash
npm test -- src/test/backgroundUtils.test.ts src/test/exportUtils.test.ts src/test/toolbar-layout.test.tsx
```

Expected: all focused tests pass.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/utils/backgroundUtils.ts src/test/backgroundUtils.test.ts src/components/Topbar.tsx src/test/toolbar-layout.test.tsx
git commit -m "fix: preserve background modes in exports"
```

---

### Task 5: Full Verification and Draft PR

**Files:**
- Verify all modified files
- Update Draft PR body with behavior and test evidence

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: a clean pushed branch and a reviewable Draft PR.

- [ ] **Step 1: Run the complete test suite**

```bash
npm test
```

Expected: every test file passes with zero failures.

- [ ] **Step 2: Run the production build**

```bash
npm run build
```

Expected: `tsc -b && vite build` exits `0`. Record the existing chunk-size warning separately if it remains.

- [ ] **Step 3: Check patch integrity**

```bash
git diff --check
git status --short
```

Expected: no whitespace errors; only intended files are changed before the final commit.

- [ ] **Step 4: Verify the user flows in the local UI**

Check:

1. Text click creates `260 × 72`; Text drag creates the drawn bounds and focuses input only after release.
2. Reverse drag and zoomed/panned placement use correct canvas coordinates.
3. Transparent mode shows checkerboard and transparent PNG output.
4. Green Screen shows and exports `#00FF00`.
5. Background and Export dropdowns overlay the canvas without clipping and close with `Escape`.

- [ ] **Step 5: Push and create or update a Draft PR**

```bash
git push -u origin HEAD
gh pr create --draft --base main --title "Add draggable text boxes and background modes" --body "Adds drag-created Text boxes, Normal/Transparent/Green Screen project backgrounds, mode-aware exports, and regression coverage."
```

If the branch already has an open Draft PR, update that PR instead of creating a duplicate. Include exact test count, build result, and the three background/export behaviors.

---

## Plan Self-Review

- Spec coverage: Text drag/click behavior, reverse/minimum bounds, inline editing, background modes, checkerboard preview, persistence, compatibility, all export modes, accessibility, and verification are assigned to Tasks 1–5.
- Placeholder scan: every code and command step has concrete content; no deferred implementation markers remain.
- Type consistency: all tasks use `BackgroundMode`, `backgroundMode`, `setBackgroundMode`, `normalizeTextBox`, `CANVAS_BACKGROUND_ID`, `getCanvasBackgroundFill`, `getExportBackground`, and `withTemporaryBackground` consistently.
