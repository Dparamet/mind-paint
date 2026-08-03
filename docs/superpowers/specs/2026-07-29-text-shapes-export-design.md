# Text, Shapes, and Export Design

**Date:** 2026-07-29  
**Status:** Approved

## Scope

Improve only these three editor areas:

1. Text creation and editing
2. Geometry and decorative shape selection
3. Whole-canvas file export

Selection, layers, project storage, drawing brushes, and unrelated editor behavior remain unchanged.

## Design Direction

Use compact contextual controls that match the existing editor:

- Text remains a primary tool in the left toolbar. Text formatting appears in the top bar while the Text tool is active or a text element is selected.
- Geometry and decorative shapes live in one categorized dropdown in the left toolbar.
- Export formats live in one dropdown in the top bar.

This keeps the canvas visible, avoids duplicate side panels, and makes the three features discoverable without adding modal interruptions.

## Text

### Interaction

- Choosing Text and clicking the canvas creates a text element and immediately opens inline editing.
- `Enter` commits a single-line edit.
- `Shift+Enter` inserts a new line.
- `Escape` cancels the edit. A newly created empty text element is removed.
- Double-clicking an existing text element reopens inline editing.
- Selecting a text element exposes its formatting controls in the top bar.

### Formatting

The contextual controls include:

- Font family
- Font size
- Bold
- Italic
- Left, center, and right alignment
- Fill color, used as the text color

Changes apply both to the active text defaults and to selected text elements. Text content and formatting remain serializable in project JSON.

## Shapes Dropdown

The left toolbar exposes one Shapes button. Its icon reflects the currently active shape.

The dropdown is grouped as:

- **Basic:** Rectangle, Circle/Ellipse, Triangle
- **Polygons:** Diamond, Pentagon, Hexagon, Octagon
- **Decorative:** Star

Choosing a shape activates it and closes the dropdown. The menu closes on outside pointer interaction or `Escape`. It exposes accessible menu roles and selected state.

## Export Dropdown

The top bar exposes one labeled Export control with:

- PNG @3x
- Transparent PNG
- JPEG @3x
- SVG
- PDF
- Project JSON

Exports cover the whole canvas. The downloaded filename is derived from the project name and falls back to `mind-paint`.

PNG, JPEG, and PDF use the rendered canvas. SVG remains a valid SVG document containing the rendered artwork so every supported Konva element is preserved consistently. Project JSON preserves editable layers and elements for round-trip import.

The menu closes after an export, outside pointer interaction, or `Escape`. Errors that prevent export must not leave the menu or canvas in a corrupted state.

## Component Boundaries

- `Toolbar.tsx` owns the Shapes trigger, categories, menu state, and tool selection.
- `Topbar.tsx` owns contextual text controls and the Export trigger/menu.
- `CanvasStage.tsx` owns text placement, inline editing, and rendered shapes.
- `exportUtils.ts` owns file construction and browser download helpers.
- `useEditorStore.ts` owns persisted text defaults and element updates.

No new global state is needed for dropdown visibility.

## Verification

Automated tests must verify:

- Text remains reachable and its formatting controls update state/selection.
- `Shift+Enter` creates a line break while `Enter` commits.
- The Shapes menu opens, exposes all categories, selects a tool, and closes with `Escape`.
- The Export menu exposes every supported format, invokes the appropriate export path, and closes safely.
- SVG construction and filenames are correct.
- Existing editor tests still pass.
- `npm run build` succeeds.

## Out of Scope

- Exporting only selected elements
- Rich-text spans with multiple styles inside one text element
- Additional shape libraries or custom SVG path import
- Multi-page PDF
- Replacing the existing project JSON schema
