# Collapsible Right Sidebar and Reliable Eraser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a reversible 44px collapsed state to the right sidebar and prevent fast eraser gestures from skipping canvas elements between pointer events.

**Architecture:** Extract the right column into a focused `RightSidebar` component with local expansion state and accessible controls. Keep the existing eraser mutation pipeline, but route eraser pointer positions through a pure segment sampler and reset its gesture ref at every boundary.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Konva/react-konva 10/19, Tailwind CSS 3, Vitest 4, Testing Library.

## Global Constraints

- Expanded sidebar width remains exactly 288px (`w-72`).
- Collapsed rail width is exactly 44px (`w-11`) and always exposes the reopen control.
- Sidebar state is not persisted across reloads.
- Both normal Eraser and right-click erasing use interpolated path sampling.
- Hidden and locked layers remain protected.
- One undo-history snapshot is created per erase gesture, not per sample.
- No dependency changes or unrelated canvas refactors.

---

### Task 1: Collapsible Right Sidebar

**Files:**
- Create: `src/components/RightSidebar.tsx`
- Create: `src/test/right-sidebar.test.tsx`
- Modify: `src/App.tsx:1-138`

**Interfaces:**
- Produces: `RightSidebar({ saveStatus }: { saveStatus: SaveStatus }): JSX.Element`
- Consumes: existing `PropertiesPanel`, `LayerPanel`, `ProjectManager`, and `SaveStatus`.

- [ ] **Step 1: Write the failing component test**

Render the real `RightSidebar` with `saveStatus="saved"`. Assert that `Collapse right sidebar` starts with `aria-expanded="true"`, `Layers` is visible, clicking collapses to a button named `Expand right sidebar`, removes `Layers`, and clicking again restores it.

```tsx
it('collapses to a reopen rail and expands without losing access', async () => {
  const user = userEvent.setup();
  render(<RightSidebar saveStatus="saved" />);
  const collapse = screen.getByRole('button', { name: 'Collapse right sidebar' });
  expect(collapse).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('Layers')).toBeInTheDocument();
  await user.click(collapse);
  const expand = screen.getByRole('button', { name: 'Expand right sidebar' });
  expect(expand).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('Layers')).not.toBeInTheDocument();
  await user.click(expand);
  expect(screen.getByText('Layers')).toBeInTheDocument();
});
```

- [ ] **Step 2: Verify the test fails for the missing component**

Run: `npm test -- src/test/right-sidebar.test.tsx`

Expected: FAIL because `../components/RightSidebar` does not exist.

- [ ] **Step 3: Implement the minimal component and integrate it**

Create `RightSidebar` with `useState(true)`, `PanelLeftClose`/`PanelLeftOpen`, an `aside` switching between `w-72` and `w-11`, and a content region rendered only while expanded. Move the existing right-column JSX from `App.tsx` into this component and replace it with:

```tsx
<RightSidebar saveStatus={saveStatus} />
```

Use `aria-controls="right-sidebar-content"`, matching content `id`, and a width transition class.

- [ ] **Step 4: Verify the focused test passes**

Run: `npm test -- src/test/right-sidebar.test.tsx`

Expected: PASS with 1 test.

### Task 2: Continuous Eraser Sampling

**Files:**
- Modify: `src/utils/drawingUtils.ts:1-106`
- Modify: `src/test/drawingUtils.test.ts:1-25`
- Modify: `src/components/CanvasStage.tsx:154-172,457-545,568-682,843-859,1048-1058`
- Modify: `src/test/canvas-partial-eraser.test.tsx:8-158`

**Interfaces:**
- Produces: `sampleSegment(start: Point, end: Point, maxSpacing: number): Point[]` returning ordered samples after `start`, always including `end`.
- Consumes: `eraseAtScreenPoint(screenPos)` and existing gesture refs/history functions.

- [ ] **Step 1: Write failing pure sampler tests**

```ts
it('fills a fast pointer segment with bounded samples including the endpoint', () => {
  expect(sampleSegment({ x: 0, y: 0 }, { x: 10, y: 0 }, 4)).toEqual([
    { x: 10 / 3, y: 0 }, { x: 20 / 3, y: 0 }, { x: 10, y: 0 },
  ]);
});

it('returns only the endpoint for zero distance or invalid spacing', () => {
  expect(sampleSegment({ x: 2, y: 3 }, { x: 2, y: 3 }, 0)).toEqual([{ x: 2, y: 3 }]);
});
```

- [ ] **Step 2: Verify sampler tests fail**

Run: `npm test -- src/test/drawingUtils.test.ts`

Expected: FAIL because `sampleSegment` is not exported.

- [ ] **Step 3: Implement the pure sampler**

Compute `steps = Math.max(1, Math.ceil(distance / validSpacing))`, where invalid/non-positive spacing falls back to the full segment length or `1` for zero distance. Return points for `index = 1..steps` using linear interpolation.

- [ ] **Step 4: Verify sampler tests pass**

Run: `npm test -- src/test/drawingUtils.test.ts`

Expected: PASS.

- [ ] **Step 5: Write failing canvas regression tests**

Make the test-stage `getIntersection(screenPos)` return the rectangle node only inside its bounds. Add one test where `mouseDown` at `(0, 60)` and a single `mouseMove` to `(140, 60)` crosses the rectangle; assert it rasterizes to an image. Add another test with separate gestures at those endpoints and assert the rectangle remains unchanged, proving pointer-up reset prevents bridging gestures.

- [ ] **Step 6: Verify canvas regression tests fail for skipped paths**

Run: `npm test -- src/test/canvas-partial-eraser.test.tsx`

Expected: the fast-drag test FAILS because current code checks only `(0, 60)` and `(140, 60)`; the separate-gesture test remains green.

- [ ] **Step 7: Connect sampling to both eraser entry paths**

Add `lastEraseScreenPointRef`. Implement `beginEraseGesture(pos)` to clear current erase refs, set the last position, and erase once. Implement `continueEraseGesture(pos)` to call `sampleSegment(last, pos, Math.max(1, Math.min(4, brushSize / 2)))`, erase each sample, and update the last position. Use these functions for normal Eraser and right-click erasing; clear the last point in `handleMouseUp`.

- [ ] **Step 8: Verify focused eraser tests pass**

Run: `npm test -- src/test/drawingUtils.test.ts src/test/canvas-partial-eraser.test.tsx`

Expected: PASS.

### Task 3: Full Verification

**Files:**
- Verify all files changed in Tasks 1-2.

**Interfaces:**
- Consumes: completed sidebar and eraser behaviors.
- Produces: fresh test/build evidence.

- [ ] **Step 1: Run the full test suite**

Run: `npm test`

Expected: all Vitest suites pass with zero failures.

- [ ] **Step 2: Run the production build**

Run: `npm run build`

Expected: TypeScript and Vite finish with exit code 0.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check && git diff --stat && git status --short`

Expected: no whitespace errors; only the plan, sidebar, canvas, utility, and corresponding test files are changed.
