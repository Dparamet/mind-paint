# Line Style Dropdown and Teal Theme Design

## Goal

Unify Line and Arrow into one compact toolbar control, let users choose endpoint and dash styles, and make teal (`#0f766e`) the consistent primary UI color.

## Scope

- Replace the separate Line and Arrow toolbar buttons with one Line dropdown modeled after the existing Shape dropdown.
- Offer four endpoint styles: none, end, start, and both.
- Offer three stroke patterns: solid, dashed, and dotted.
- Show a visual line preview for every choice.
- Apply style changes to new lines and to selected line-like elements.
- Persist the most recently selected endpoint and dash styles.
- Keep the `A` shortcut as a quick way to select an end-arrow line.
- Preserve compatibility with existing `line` and `arrow` document elements.
- Consolidate decorative UI states around the existing teal accent. Semantic destructive states may remain red.

## Architecture

### Editor model

Add a persisted `LineHead` setting (`none`, `end`, `start`, `both`). Continue using the existing `StrokeDash` setting. Existing canvas element types remain unchanged for compatibility: a no-head line is stored as `line`; headed lines are stored as `arrow` with explicit start/end pointer flags.

### Toolbar

Add an accessible Line Style popover beside the Shape popover. Its trigger reflects the current endpoint style. The menu contains two bounded groups: endpoint style and stroke pattern. It closes after selection, on Escape, and on outside pointer interaction.

### Canvas and selection flow

Drawing reads `lineHead` and `strokeDash` from the store. `none` creates a Konva Line; all headed variants create a Konva Arrow and set pointer direction flags. Changing a style while line/arrow elements are selected updates those elements immediately and preserves undo behavior.

### Theme

Keep neutral surfaces (`paper`, `panel`, `line`, `ink`) and use `accent` teal for interactive selection, hover, focus, highlights, logo, and decorative status treatments. Reserve coral for destructive/error meaning only. Remove sunshine and sky from ordinary interactive emphasis.

## Error Handling and Compatibility

- Missing persisted `lineHead` defaults to `none`.
- Older arrows without direction flags default to an end pointer.
- Older lines render unchanged.
- Non-line selections ignore endpoint changes but may continue using the existing global dash behavior for newly created elements.

## Testing

- Toolbar tests cover opening, toggling, Escape, outside click, endpoint selection, and dash selection.
- Store tests cover persistence/defaults and selected-element updates where appropriate.
- Rendering or utility tests cover all four endpoint mappings.
- Existing tests and production build must pass.

## Out of Scope

Custom arrowhead geometry, curved connectors, labels, routing, and additional dash patterns are deferred so new styles can be added later without widening this first implementation.
