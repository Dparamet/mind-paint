# User-Selectable Theme System Design

## Goal

Let users change the application appearance without changing the colors stored in their artwork. The first release provides `Warm`, `Light`, `Dark`, and `Custom` themes, persists the selection locally, and makes the canvas surface a softer version of the selected theme.

## Scope

- Add theme controls to the existing Settings panel.
- Apply theme colors to application chrome and the canvas surface.
- Persist the selected theme and custom values with the existing editor settings in `localStorage`.
- Preserve all document-owned colors, including strokes, fills, text, sticky notes, and images.
- Provide advanced per-surface overrides and a reset action for `Custom`.

The feature does not add accounts, cloud theme synchronization, theme import/export, or changes to project document data.

## Theme Model

`ThemeId` has four values:

- `warm`: the current warm neutral palette and the default for existing users.
- `light`: a clean white and neutral-gray palette.
- `dark`: dark application surfaces with readable light text.
- `custom`: a palette derived from one user-selected primary color.

The persisted settings contain the selected `theme`, a `customThemePrimary` color, and optional `customThemeOverrides`. Overrides are limited to application background, panel, text, border, and canvas colors. Missing or invalid fields fall back independently to the derived custom palette.

## Palette Architecture

Tailwind semantic colors continue to use the existing names: `paper`, `panel`, `ink`, `line`, `accent`, and `coral`. Their values change from fixed hex colors to CSS custom properties. A new semantic `canvas` token controls the canvas surface independently from the application background.

Each preset defines these tokens on the application root. `Custom` derives accessible UI tokens from the primary color by adjusting lightness and saturation, then applies any advanced overrides. The canvas color is derived as a softer, lower-saturation surface than the primary color. Theme calculation never reads or writes canvas element colors.

Destructive and error states keep a dedicated `coral` token so a custom primary color cannot hide their meaning.

## Components

### Theme Utilities

A focused theme utility owns preset definitions, color validation, custom-palette derivation, contrast correction, and conversion to the CSS-variable map. It has no React or store dependency and can be unit tested directly.

### Editor Store

The existing editor store owns the selected theme and custom settings. Store actions select a theme, set the custom primary color, update or clear an override, and reset the complete custom palette. Every action uses the existing settings persistence path.

### Theme Application

A small root-level component reads theme settings from the store and applies the resulting CSS variables and a `data-theme` attribute to the application root. Changes appear immediately without reloading. The initial HTML/CSS fallback remains the current Warm theme, preventing an unstyled or transparent screen if stored settings cannot be read.

### Settings UI

Settings gains an Appearance section containing:

- Four theme choices with compact color swatches.
- A primary color control shown for `Custom`.
- A collapsed `Advanced customization` area for the five optional overrides.
- A `Reset custom theme` action.

Controls have visible labels, keyboard focus states, and selected-state text in addition to color, so color alone is not required to understand the current choice.

## Data Flow

1. Startup loads persisted editor settings and merges them with defaults.
2. Theme settings are normalized so old or malformed values safely fall back.
3. The theme utility resolves a preset or derives the Custom palette.
4. The root theme component publishes the resolved semantic CSS variables.
5. Existing components consume the variables through their current Tailwind semantic classes; the canvas consumes the new `canvas` token.

Selecting or editing a theme repeats steps 3–5 immediately and persists the source settings. Resolved colors are not persisted because they can be deterministically regenerated.

## Canvas and Artwork Rules

- Theme changes update the canvas surface used by the editor.
- The Custom canvas default is lighter and less saturated than its primary color.
- Theme changes do not mutate elements, history, undo/redo state, saved projects, exports, or image pixels.
- Existing explicit background modes remain document/editor behavior. Where such a mode intentionally supplies its own canvas background, it takes precedence over the theme canvas token.
- Export output continues to follow the document background/export rules, not the surrounding application theme.

## Validation and Recovery

- Only valid six-digit hex colors are accepted by the theme utility.
- Invalid persisted theme identifiers fall back to `warm`.
- Invalid custom primary or override values fall back individually without discarding other valid settings.
- Generated text and surface pairs are contrast-corrected toward a readable light or dark text color.
- Reset removes all overrides and restores the default Custom primary color.
- A storage write failure keeps the theme active for the current session and does not damage document data.

## Compatibility

Existing users have no theme fields in stored settings, so merging with defaults selects `warm` and preserves the current appearance. Project files and IndexedDB schemas do not change. Existing Tailwind semantic class names remain stable to minimize component churn.

## Testing

Unit tests cover preset resolution, Custom derivation, color validation, contrast correction, and override precedence. Store tests cover selection, persistence, normalization, and reset. Component tests cover Settings visibility, theme selection, Custom controls, and accessible selected states. Integration assertions verify CSS variables update immediately, the canvas uses the theme token, and artwork/document colors remain unchanged.

Verification commands:

```bash
npm test
npm run build
```

## Success Criteria

- Users can switch among `Warm`, `Light`, `Dark`, and `Custom` in Settings.
- The chosen theme survives reloads.
- Custom creates a complete palette from one primary color and supports optional per-surface overrides.
- The canvas follows the theme with a softer color while artwork colors remain unchanged.
- Invalid stored colors cannot make the application unusable.
- Existing tests and the production build pass.
