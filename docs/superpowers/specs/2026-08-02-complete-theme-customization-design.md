# Complete Theme Customization Design

## Goal

Make every advanced theme control visibly affect its intended application area. Extend Custom theme controls to cover interaction and error colors, remove application-chrome colors that bypass the theme palette, and explain contrast correction instead of silently appearing to ignore a chosen text color.

## Root Cause

The first theme implementation correctly persists overrides and applies CSS variables, but the visible result is incomplete:

- Canvas occupies the largest surface and consumes its resolved color directly, so its override is immediately obvious.
- `ThemeColorKey` excludes `accent` and `coral`, preventing advanced customization of interaction and error colors.
- Canvas selection handles, marquee/lasso outlines, text-editor overlays, button highlights, and shadows contain hard-coded teal, white, or warm-neutral values.
- Custom text color is silently replaced when it fails the 4.5:1 contrast rule, so the control can display a chosen value that is not the resolved value.
- Background labels do not explain which application regions consume `paper` versus `panel`, making valid but subtle changes difficult to recognize.

## Theme Tokens

Advanced customization exposes these seven tokens:

- `paper`: application background and secondary control surfaces.
- `panel`: toolbar, topbar, sidebars, dialogs, and primary controls.
- `ink`: application text and icons.
- `line`: borders, separators, grid, and neutral outlines.
- `accent`: active tools, focus, selection, and interactive emphasis.
- `coral`: destructive, warning, and error states.
- `canvas`: the normal editor canvas surface.

`ThemeColorKey` covers all seven tokens, and `ThemePalette` is `Record<ThemeColorKey, string>`. Existing persisted override objects remain compatible because every key is optional.

## Resolution and Contrast

Preset behavior remains unchanged. Custom derives all seven tokens from the primary color, then applies valid six-digit hex overrides.

The resolver continues enforcing a 4.5:1 minimum contrast for `ink` against `paper`. Settings shows both the selected input color and the applied resolved color when correction occurs, with a short `Adjusted for readability` message. The saved override is preserved so changing the surface color can make it valid later; the UI never claims the rejected color is currently applied.

Accent is contrast-corrected against `panel` to at least 3:1. Error color remains independently adjustable and is not derived from accent.

## Application Coverage

Tailwind semantic classes continue consuming CSS variables. Hard-coded colors are removed only from application chrome:

- Button and toolbar shadows derive from `ink` or `accent` with alpha.
- Canvas selection handles, marquee, lasso, draft outlines, and inline text editor chrome use the resolved `accent`, `panel`, and `ink` colors.
- Grid lines use `line`; normal canvas uses `canvas`.
- Background-mode swatches use the appropriate theme token where they represent the normal canvas.

Document-owned colors remain unchanged. Shape fills/strokes, text colors, sticky-note styling, image pixels, and exported document content do not inherit application theme tokens.

## Components and Data Flow

`ThemeSettings` keeps using the existing store actions and adds Accent and Error controls. Labels include concise region descriptions, and each override retains its individual `Auto` action.

`resolveThemePalette()` remains the single palette authority. `ThemeRoot` publishes every resolved token as RGB CSS variables. `CanvasStage` resolves the same palette once per theme-setting change and passes palette hex values to Konva application-chrome nodes. Theme settings do not enter document history or project serialization.

## Error Handling and Compatibility

- Invalid persisted colors are discarded independently during normalization.
- Unknown theme identifiers still fall back to `warm`.
- Storage failures keep current-session Theme state active.
- Older Custom themes without Accent or Error overrides continue using derived defaults.
- Transparent and Green Screen modes still override the normal themed canvas.
- Export helpers retain existing document/export background behavior.

## Testing

- Domain tests cover all seven keys, override precedence, and applied-versus-requested text contrast behavior.
- Settings integration tests change every advanced color input and verify the corresponding store override.
- ThemeRoot tests verify every CSS variable reflects the resolved palette.
- Canvas tests verify selection chrome uses the resolved accent while element-owned colors remain unchanged.
- Full tests and production build must pass.

Verification commands:

```bash
npm test
npm run build
```

## Success Criteria

- Every Advanced color control produces a visible change in its labeled area.
- Accent and Error colors are independently adjustable.
- No application selection/focus chrome remains tied to hard-coded teal.
- Contrast correction is visible and understandable in Settings.
- Artwork data, undo history, project persistence, and export colors remain unchanged by Theme changes.
