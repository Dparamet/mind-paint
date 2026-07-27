# Lasso Move Handle, Shape Picker, and Partial Image Eraser

## Goal

Improve three related canvas-editing workflows in one pull request:

1. Move a multi-element lasso selection from an explicit handle inside its selection frame.
2. Replace the long list of geometric-shape tools with a categorized popover.
3. Erase part of an image without deleting the entire image element.

The work stays within the current React, Zustand, and Konva architecture and adds no dependencies.

## 1. Lasso Selection Move Handle

### Interaction

- A multi-element selection displays one arrow handle inside the upper-left area of the selection frame.
- The handle remains aligned while the canvas is zoomed or panned.
- Pointer-dragging the handle moves every editable selected element by the same delta.
- Locked-layer elements do not move.
- A drag creates one undo history entry, regardless of the number of pointer-move events.
- Clicking the handle without dragging preserves the selection.
- The existing ability to drag directly from a selected element remains available.

### Architecture

The handle is rendered in the Konva overlay layer alongside the existing `Transformer`. Its bounds are derived from the selected Konva nodes, so rotation, zoom, and pan use the same coordinate system as the selection frame.

During drag:

1. Capture editable element origins at pointer-down.
2. Update Konva node positions directly during pointer movement.
3. Commit final snapped positions to the Zustand store at pointer-up.
4. Record history only for the first committed element update.

This avoids React/store updates on every animation frame.

## 2. Categorized Shape Picker

### Interaction

- The toolbar shows one `Shapes` trigger instead of every geometric-shape button.
- Pressing the trigger opens a popover to the right of the vertical toolbar.
- The popover groups tools as:
  - Basic: Rectangle, Circle
  - Polygons: Triangle, Diamond, Pentagon, Hexagon, Octagon
  - Decorative: Star
- Selecting a shape activates that tool and closes the popover.
- The active shape icon appears on the trigger and uses the existing active-tool styling.
- `Escape`, clicking outside, or choosing a tool closes the popover.
- The trigger and options are keyboard accessible and expose expanded/selected state.

### Architecture

`Toolbar` owns only the popover’s open state. Shape metadata moves to a shared constant within the toolbar module so rendering and active-state checks use one source of truth. Non-shape tools keep their current grouping and shortcuts.

## 3. Partial Image Eraser

### Interaction

- Using the existing eraser over an image paints transparency instead of deleting the whole image.
- Dragging continuously creates one eraser stroke.
- Erasing other element types keeps current behavior.
- Eraser strokes follow image resize, rotation, zoom, and pan.
- Undo/redo restores or reapplies a complete stroke.
- Saved projects and JSON export preserve the mask.
- PNG, JPEG, PDF, and SVG raster-backed export render the erased result.

### Data Model

`ImageElement` gains an optional `erasures` array:

```ts
interface ImageEraseStroke {
  points: number[];
  size: number;
}
```

- Point coordinates are normalized to the image’s width and height (`0..1`).
- Stroke size is normalized against the image’s smaller dimension.
- Existing projects without `erasures` remain valid.
- Imported erase data is treated as optional canvas data and does not execute code or load additional resources.

### Rendering

`ImageNode` composites the source image and mask into an offscreen canvas:

1. Draw the source image.
2. Draw erase strokes with `globalCompositeOperation = "destination-out"`.
3. Pass the composited canvas to the Konva image node.

The composited canvas is memoized by source, output dimensions, and erase-stroke data. Image loading remains asynchronous and stale loads are ignored.

### Pointer Mapping

Konva’s inverse absolute transform converts the stage pointer into image-local coordinates. Coordinates and brush size are normalized before storing. The mask canvas clips strokes naturally at the image boundary.

### History and Performance

- Pointer-down creates the stroke and history checkpoint.
- Pointer-move appends points without additional history snapshots.
- Consecutive samples closer than a small threshold are skipped.
- Only the actively erased image recomposites.
- No data URL is regenerated during pointer movement.

## Error and Boundary Handling

- Hidden or locked layers cannot be moved or erased.
- Missing or failed image sources keep the existing image-loading fallback behavior.
- Empty or malformed optional erase arrays are ignored safely.
- A selection with no editable elements does not show an active move handle.
- Pointer cancellation commits the last valid drag/erase position and clears temporary state.

## Testing

### Unit and component tests

- Calculate union bounds for multi-selection.
- Apply one drag delta to all editable selected elements.
- Preserve a single history checkpoint for group movement.
- Open/close the shape popover and select a categorized shape.
- Normalize and denormalize erase strokes.
- Composite an erase mask without mutating the original source.
- Serialize, restore, undo, and redo image erasures.

### Browser verification

- Lasso-select multiple rotated and unrotated elements, then drag the arrow handle at multiple zoom levels.
- Open the Shapes popover by pointer and keyboard.
- Erase a visible section of an uploaded image, then undo and redo.
- Save/reload the project and verify the mask remains.
- Export and visually confirm erased pixels.

## Performance Gate

Before the pull request:

- Measure pointer-move store-update counts for lasso movement and image erasing.
- Confirm lasso handle dragging performs zero store writes until commit.
- Confirm one image-erase drag creates one history entry.
- Compare production bundle size against the current baseline.
- Verify no new dependency or unbounded per-frame canvas allocation is introduced.

## Delivery

The pull request contains separate commits for:

1. Lasso move handle.
2. Categorized shape picker.
3. Partial image eraser.
4. Any review-driven fixes.

The PR targets `ux-ui` from `codex/bright-ui-on-ux-ui`.
