# Collapsible Right Sidebar and Reliable Eraser Design

## Goal

Make the editor's right sidebar collapsible so the canvas can reclaim horizontal space, and make erasing reliable when the pointer moves quickly between browser events.

## Scope

- Add one control that collapses the entire right sidebar.
- Keep a 44px-wide rail visible while collapsed so the sidebar can always be reopened.
- Preserve the existing Properties, Layers, Project Manager, and save-status content while expanded.
- Improve both the Eraser tool and right-click erasing by sampling the full pointer path.
- Preserve layer visibility/lock rules, partial raster erasing, vector stroke splitting, and one undo-history entry per erase gesture.

Out of scope: persisting the sidebar state across reloads, redesigning individual sidebar sections, changing eraser size controls, or refactoring unrelated canvas tools.

## UI Design

The sidebar remains expanded by default at its current width of 288px. A header control at the top edge uses a left-facing chevron and the accessible label `Collapse right sidebar`. Activating it hides the sidebar content and changes the container to a 44px rail. The same control remains visible in the rail, changes to a right-facing chevron, and uses the label `Expand right sidebar`.

The control exposes `aria-expanded` and points to the content region with `aria-controls`. Collapsing removes the content from the rendered accessibility tree rather than merely clipping it. The sidebar width transition is short and respects the existing theme tokens.

The state is local UI state in a focused `RightSidebar` component. The component owns only expansion state and layout; existing panels retain their current store interactions.

## Eraser Design

The current implementation erases only at the latest pointer position. Fast movement can jump across a thin stroke or shape without producing an event over that element.

During an erase gesture, the canvas stores the previous screen-space pointer position. For every move, it generates evenly spaced sample positions from the previous position to the current one and calls the existing erase operation for each sample. Spacing is derived from the visible eraser radius and capped so adjacent samples overlap. This keeps behavior stable across zoom levels and avoids excessive work for slow movement.

The previous point is reset on pointer-up/leave and when a new erase gesture begins. Both the selected Eraser tool and right-click erasing use the same path-sampling function. Existing erase logic remains responsible for hit detection, raster conversion, image masks, vector cutting, locked/hidden layers, and history.

## Data Flow

1. Pointer-down starts an erase gesture, resets gesture history, and erases at the initial point.
2. Pointer-move reads the current screen position.
3. The path sampler creates intermediate screen points between the previous and current positions.
4. Each sample passes through the existing world-coordinate conversion and erase logic.
5. Pointer-up clears all gesture refs while retaining one undo-history snapshot for the complete gesture.

## Testing

- Component test: sidebar starts expanded, collapses to its rail, removes panel content, updates accessibility state, and expands again.
- Canvas regression test: one large pointer jump that crosses a shape erases it even when neither endpoint intersects the shape.
- Canvas regression test: pointer-up resets interpolation so a later gesture does not erase across the gap between gestures.
- Run the focused tests first, then the complete Vitest suite and production build.

## Error and Performance Considerations

If pointer or stage coordinates are unavailable, the event is ignored as today. Sampling uses finite bounded steps based on segment length; it does not introduce timers or asynchronous state. The implementation reuses the existing single-history-slot mechanism, preventing one undo entry per interpolated sample.
