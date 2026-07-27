# Canvas Editing Tools Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicit lasso-selection move handle, a categorized shape picker, and non-destructive partial image erasing in one reviewable branch.

**Architecture:** Keep selection and drawing interactions in Konva coordinates, move pure geometry/mask operations into tested utilities, and persist normalized image erase strokes on `ImageElement`. Avoid per-frame store writes for group movement and avoid regenerating image data URLs while erasing.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Konva 10/react-konva 19, Vitest 4, Testing Library.

## Global Constraints

- Add no dependencies.
- Existing projects without image erase data must remain valid.
- Lasso movement and image erase drags create one undo history entry per gesture.
- Hidden or locked layer elements cannot be moved or erased.
- Existing non-image eraser behavior remains unchanged.
- PNG, JPEG, PDF, SVG-raster, JSON, save/reload, undo, and redo must preserve the erased result.
- The pull request targets `ux-ui` from `codex/bright-ui-on-ux-ui`.

---

### Task 1: Pure Selection and Image-Mask Utilities

**Files:**
- Create: `src/utils/imageMaskUtils.ts`
- Modify: `src/utils/elementUtils.ts`
- Modify: `src/types/editor.ts`
- Test: `src/test/lasso-selection.test.ts`
- Create: `src/test/imageMaskUtils.test.ts`

**Interfaces:**
- Produces: `getElementsBounds(elements: CanvasElement[]): Bounds | null`
- Produces: `moveElementOrigins(origins: ElementOrigin[], dx: number, dy: number): ElementOrigin[]`
- Produces: `ImageEraseStroke { points: number[]; size: number }`
- Produces: `normalizeErasePoint(point, width, height): Point`
- Produces: `appendErasePoint(stroke, point, minDistance): ImageEraseStroke`
- Produces: `renderMaskedImage(image, width, height, erasures): HTMLCanvasElement`

- [ ] **Step 1: Write failing selection utility tests**

```ts
it('returns the union bounds for selected elements', () => {
  expect(getElementsBounds([rectAt(10, 20, 30, 40), rectAt(80, 50, 20, 10)]))
    .toEqual({ x: 10, y: 20, w: 90, h: 40 });
});

it('moves every origin by the same delta', () => {
  expect(moveElementOrigins([{ id: 'a', x: 1, y: 2 }], 10, -4))
    .toEqual([{ id: 'a', x: 11, y: -2 }]);
});
```

- [ ] **Step 2: Run selection tests and verify RED**

Run: `npm test -- src/test/lasso-selection.test.ts`

Expected: FAIL because `getElementsBounds` and `moveElementOrigins` are not exported.

- [ ] **Step 3: Implement minimal selection utilities**

Use `getElementBounds` for each element, reduce to a union, return `null` for an empty list, and map origins without mutating them.

- [ ] **Step 4: Run selection tests and verify GREEN**

Run: `npm test -- src/test/lasso-selection.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing image-mask tests**

```ts
it('normalizes image-local coordinates', () => {
  expect(normalizeErasePoint({ x: 50, y: 25 }, 100, 50)).toEqual({ x: 0.5, y: 0.5 });
});

it('skips samples below the distance threshold', () => {
  const stroke = { points: [0.5, 0.5], size: 0.1 };
  expect(appendErasePoint(stroke, { x: 0.51, y: 0.5 }, 0.02)).toBe(stroke);
});

it('renders erased pixels transparent without changing the source image', () => {
  const masked = renderMaskedImage(sourceCanvas, 20, 20, [
    { points: [0.25, 0.5, 0.75, 0.5], size: 0.2 },
  ]);
  expect(alphaAt(masked, 10, 10)).toBe(0);
  expect(alphaAt(sourceCanvas, 10, 10)).toBe(255);
});
```

- [ ] **Step 6: Run mask tests and verify RED**

Run: `npm test -- src/test/imageMaskUtils.test.ts`

Expected: FAIL because mask utilities do not exist.

- [ ] **Step 7: Implement mask data and renderer**

Add to `ImageElement`:

```ts
export interface ImageEraseStroke {
  points: number[];
  size: number;
}

erasures?: ImageEraseStroke[];
```

Render strokes using a single offscreen canvas and `destination-out`, with round caps and joins. Clamp invalid dimensions to at least `1`.

- [ ] **Step 8: Run mask tests and full typecheck**

Run: `npm test -- src/test/imageMaskUtils.test.ts src/test/lasso-selection.test.ts`

Run: `npx tsc -b --pretty false`

Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/types/editor.ts src/utils/elementUtils.ts src/utils/imageMaskUtils.ts src/test/lasso-selection.test.ts src/test/imageMaskUtils.test.ts
git commit -m "add selection and image mask utilities"
```

### Task 2: Lasso Move Handle

**Files:**
- Modify: `src/components/CanvasStage.tsx`
- Create: `src/test/group-move-history.test.ts`

**Interfaces:**
- Consumes: `getElementsBounds`, `moveElementOrigins`
- Produces: Konva selection handle with id `selection-move-handle`

- [ ] **Step 1: Write failing history test**

Create two elements, record origins, apply one group-move commit with history enabled only for the first update, and assert one `undo()` restores both origins.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- src/test/group-move-history.test.ts`

Expected: FAIL until the group-commit helper or expected store call pattern exists.

- [ ] **Step 3: Add handle and direct-node drag path**

Render a `Group` in the overlay layer when `selectedElementIds.length > 1` and at least one selected element is editable:

```tsx
<Group
  id="selection-move-handle"
  x={selectionBounds.x + 12 / scale}
  y={selectionBounds.y + 12 / scale}
  draggable
  onDragStart={startSelectionHandleDrag}
  onDragMove={previewSelectionHandleDrag}
  onDragEnd={commitSelectionHandleDrag}
>
  <Circle radius={12 / scale} fill="#0f766e" />
  <Arrow points={[-5 / scale, 0, 5 / scale, 0]} fill="#fff" stroke="#fff" />
</Group>
```

Capture origins and node references on drag start, mutate Konva nodes during drag move, and call `updateElement` only on drag end. Snap the committed delta once.

- [ ] **Step 4: Preserve existing direct selected-element drag**

Reuse the same origin/commit helper for the existing `groupMoveRef` path, replacing its per-pointer store writes with direct node mutation followed by one store commit.

- [ ] **Step 5: Run lasso/history tests**

Run: `npm test -- src/test/lasso-selection.test.ts src/test/group-move-history.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CanvasStage.tsx src/test/group-move-history.test.ts
git commit -m "add draggable lasso selection handle"
```

### Task 3: Categorized Shape Picker

**Files:**
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/test/toolbar-layout.test.tsx`

**Interfaces:**
- Produces: button `Shapes`
- Produces: menu `Shape tools`
- Categories: `Basic`, `Polygons`, `Decorative`

- [ ] **Step 1: Write failing component tests**

```ts
it('opens categorized shape tools and selects a shape', async () => {
  await user.click(screen.getByRole('button', { name: 'Shapes' }));
  expect(screen.getByRole('menu', { name: 'Shape tools' })).toBeVisible();
  expect(screen.getByText('Basic')).toBeVisible();
  expect(screen.getByText('Polygons')).toBeVisible();
  await user.click(screen.getByRole('menuitemradio', { name: 'Triangle' }));
  expect(useEditorStore.getState().tool).toBe('triangle');
});
```

Also test `Escape` and outside-click closure.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: FAIL because `Shapes` and `Shape tools` do not exist.

- [ ] **Step 3: Implement the popover**

Move shape metadata into categorized constants, remove individual shape buttons from `toolGroups`, and render an anchored popover to the toolbar’s right. Use `aria-expanded`, `aria-haspopup="menu"`, `menuitemradio`, Escape handling, and a window pointer-down outside guard.

- [ ] **Step 4: Run component tests and verify GREEN**

Run: `npm test -- src/test/toolbar-layout.test.tsx`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/Toolbar.tsx src/test/toolbar-layout.test.tsx
git commit -m "group geometric tools in shape picker"
```

### Task 4: Partial Image Eraser Integration

**Files:**
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/test/store-undo.test.ts`
- Modify: `src/test/exportUtils.test.ts`

**Interfaces:**
- Consumes: `ImageEraseStroke`, `normalizeErasePoint`, `appendErasePoint`, `renderMaskedImage`
- Produces: one stored erase stroke per pointer gesture

- [ ] **Step 1: Write failing store round-trip tests**

Add an image with one erasure, update it with a second stroke, assert `undo()` restores the first list and `redo()` restores both. Assert `toProject()` retains the arrays.

- [ ] **Step 2: Run store tests and verify RED**

Run: `npm test -- src/test/store-undo.test.ts`

Expected: FAIL until the gesture integration uses one history checkpoint and persists erase data.

- [ ] **Step 3: Render masked images**

Update `ImageNode` to memoize the composited canvas from the loaded source image, element width/height, and erasures. Keep fill rasters non-interactive.

- [ ] **Step 4: Integrate image erase gestures**

Add `imageEraseRef` containing image id, stroke index, and current stroke. On eraser pointer-down over an editable image, convert the pointer through `node.getAbsoluteTransform().copy().invert()`, normalize it, and add the initial stroke with history enabled. On pointer-move append thresholded samples with `trackHistory=false`. On pointer-up clear the ref.

Do not run shape deletion for the active image stroke. Right-click eraser uses the same image path.

- [ ] **Step 5: Verify store and export tests**

Run: `npm test -- src/test/store-undo.test.ts src/test/exportUtils.test.ts src/test/imageMaskUtils.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/CanvasStage.tsx src/test/store-undo.test.ts src/test/exportUtils.test.ts
git commit -m "support partial image erasing"
```

### Task 5: Browser, Performance, and Quality Gates

**Files:**
- Modify only if verification exposes a defect.

**Interfaces:**
- Consumes the completed feature set.
- Produces verification evidence for the pull request.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test -- --run`

Run: `npm run build`

Expected: all tests and production build pass.

- [ ] **Step 2: Record build baseline**

Capture generated JS/CSS gzip sizes and compare them with the pre-feature build (`689.38 kB` JS raw, `215.27 kB` JS gzip, `19.16 kB` CSS raw, `4.31 kB` CSS gzip). Explain any material increase.

- [ ] **Step 3: Measure interaction write counts**

Instrument browser verification without committing diagnostics:

- Lasso handle pointer moves: `0` Zustand element writes until pointer-up.
- One lasso commit: number of writes equals editable selected elements; only the first tracks history.
- One image erase gesture: one history checkpoint; subsequent samples do not add history entries.

- [ ] **Step 4: Browser verification**

At `1280x720` and `768x720`:

1. Lasso-select two shapes and drag the arrow handle after zoom/pan.
2. Open Shapes, choose Triangle, and draw it.
3. Upload an image, erase its center, undo, redo, save, reload, and export.
4. Inspect console errors.

- [ ] **Step 5: Run `performance-optimization` review**

Document before/after bundle size, store-write counts, offscreen-canvas allocation behavior, and any measured bottleneck. Fix only measured regressions.

- [ ] **Step 6: Run `code-review-and-quality` review**

Review tests first, then correctness, readability, architecture, security, and performance. Resolve every Critical or required finding and rerun affected tests.

- [ ] **Step 7: Final commit if review required fixes**

```bash
git add src/components/CanvasStage.tsx src/components/Toolbar.tsx src/types/editor.ts src/utils/elementUtils.ts src/utils/imageMaskUtils.ts src/test
git commit -m "address canvas editing review findings"
```

- [ ] **Step 8: Push and open one draft PR**

Push `codex/bright-ui-on-ux-ui`, target `ux-ui`, and include the root causes, user impact, test/build results, browser verification, and performance evidence in the PR body.
