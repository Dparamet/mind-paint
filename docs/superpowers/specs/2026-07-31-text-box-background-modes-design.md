# Text Box and Background Modes Design

**Date:** 2026-07-31

## Goal

Make the Text tool behave like a real text-box tool and let users choose a canvas background suited to normal drawing, transparent compositing, or chroma-key editing.

## Scope

- Drag on the canvas with the Text tool to define a text box.
- Preserve quick click-to-create behavior with a default box size.
- Enter text immediately after the box is created.
- Add project-level `Normal`, `Transparent`, and `Green Screen` background modes.
- Keep editor preview, autosave, Project JSON, and exported files consistent with the selected mode.

Out of scope:

- Arbitrary custom background colors or images.
- Per-layer background modes.
- Rich text with mixed styles inside one text box.
- New export formats.

## Text Box Interaction

1. The user selects `Text` in the drawing toolbar.
2. Pointer-down starts a temporary text-box draft at the canvas coordinate.
3. Pointer movement updates the draft width and height and shows a visible dashed outline.
4. Pointer-up creates a `TextElement` using the normalized bounds and opens the inline textarea with focus.
5. A click without a meaningful drag creates a default `260 × 72` box.
6. `Ctrl+Enter` or `Cmd+Enter` commits the text. Clicking outside also commits it. `Escape` cancels an empty new box or abandons edits to an existing box.
7. Existing text boxes continue to support selection, movement, resizing, and double-click editing.

The minimum box size is `80 × 36`. Dragging in any direction is supported by normalizing the start and end coordinates.

## Data Model

`TextElement` gains a persisted `height` field so the drawn box has stable dimensions. Older projects without `height` use a derived fallback based on font size.

The project document gains:

```ts
type BackgroundMode = 'normal' | 'transparent' | 'greenScreen';
```

`backgroundMode` defaults to `normal`. Project loading normalizes missing values to preserve compatibility with older Project JSON files.

## Background Control

Add a `Background` button to the Topbar actions area. It opens an accessible dropdown with three radio-style choices:

- `Normal` — existing paper background.
- `Transparent` — checkerboard preview in the editor and real alpha where the file format supports it.
- `Green Screen` — solid chroma green `#00FF00`.

The active choice is visibly marked and exposed through `aria-checked`. The menu closes after selection, on outside click, and with `Escape`. It uses the same portaled overlay pattern as Export so toolbar overflow cannot clip it.

## Canvas Rendering

The Konva stage owns a non-interactive background rectangle below every layer:

- `normal`: the current paper color.
- `transparent`: transparent fill; the surrounding DOM shows a checkerboard only as an editing aid.
- `greenScreen`: `#00FF00`.

The background node has a stable identifier so export code targets it directly instead of relying on the first rectangle in the scene. It is never selectable or hit-tested.

## Export Behavior

Export reads `backgroundMode` from the project state:

| Mode | PNG | SVG | JPEG | PDF |
|---|---|---|---|---|
| Normal | Paper background | Paper background | Paper background | Paper background |
| Transparent | Alpha | Alpha | White fallback | White fallback |
| Green Screen | `#00FF00` | `#00FF00` | `#00FF00` | `#00FF00` |

`Transparent PNG` remains available and forces alpha for that one export without changing the saved project mode. Export must restore any temporary background mutation in a `finally` block.

Project JSON includes `backgroundMode` and text-box dimensions.

## State and Persistence

`backgroundMode` is project content rather than a global user preference. Changing it:

- marks the project dirty;
- participates in autosave, including the autosave dependency key;
- remains a direct project setting and is not added to element/layer undo history in this scope;
- survives save, reload, duplication, import, and export.

## Error and Edge Handling

- Locked or hidden active layers continue to reject new Text elements; the control remains selected without mutating content.
- A draft cancelled before pointer-up creates no element.
- Losing the draft element during project recovery, undo, clear, or project load clears inline editing state.
- Pointer coordinates respect stage zoom, pan, grid snapping, and reverse-direction drags.
- Unsupported or missing `backgroundMode` values normalize to `normal`.

## Accessibility

- Text remains a native toolbar button with `aria-pressed`.
- Background is a button with `aria-haspopup="menu"` and `aria-expanded`.
- Background choices use `menuitemradio` and `aria-checked`.
- Menus support keyboard activation, `Escape`, and outside-click dismissal.
- Checkerboard preview is not the sole indicator; the selected mode is always named in the control.

## Testing

Automated tests will cover:

- click-to-create default text boxes;
- drag-to-create bounds, reverse drags, and minimum dimensions;
- opening the inline editor only after pointer-up;
- committing and cancelling text;
- clearing stale edit state;
- background menu selection and accessibility;
- project persistence and backward-compatible defaults;
- canvas background rendering contract;
- PNG/SVG/JPEG/PDF background decisions without leaving the stage mutated;
- full regression suite and production build.

Manual UI verification will cover toolbar overflow, pointer interaction, focus, checkerboard preview, chroma green output, and representative exports.
