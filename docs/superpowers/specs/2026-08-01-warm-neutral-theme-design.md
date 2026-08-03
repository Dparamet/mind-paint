# Warm Neutral Theme Design

## Goal

Remove the remaining green cast from cards, selected rows, panel headers, borders, grid patterns, and scrollbars while keeping teal (`#0f766e`) as the sole interaction accent.

## Palette

- `paper`: warm cream `#f7f3ea`
- `panel`: light ivory `#fffaf0`
- `line`: warm gray-beige `#ded5c7`
- `ink`: unchanged `#24313d`
- `accent`: unchanged teal `#0f766e`
- `coral`: unchanged and reserved for destructive/error states

## Interaction Rules

- Default cards, rows, controls, headers, and app backgrounds use only `paper`, `panel`, and `line`.
- Selected outlined items use a cream surface with a teal border/text; they do not use translucent teal backgrounds.
- Hover states use a neutral cream surface plus a teal border/text where emphasis is needed.
- Solid teal remains valid for primary active tool buttons, focus rings, and compact selection controls.
- Green Screen mode remains bright green because it represents exported canvas content, not application chrome.
- User-selectable sticky note colors remain unchanged because they are document content.

## Scope

- Update global Tailwind neutral tokens.
- Remove `bg-accent/5` and `bg-accent/10` from ordinary panel/card selection surfaces.
- Replace hard-coded green-tinted checker, grid, and scrollbar colors with warm neutral values.
- Cover Projects, Layers, Settings, Toolbar popovers, Topbar status areas, Background menu, and Canvas selection chrome.

## Compatibility and Testing

This is a visual-token change only; document data and persisted settings do not change. Tests will assert the warm palette values and ensure Project/Layer surfaces no longer use translucent teal fills. Existing tests and the production build must pass.
