# Complete Theme Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all seven Custom theme controls visibly update their labeled application regions, including interaction/error colors and Canvas editor chrome.

**Architecture:** Extend the existing semantic theme palette instead of adding component-specific theme state. The pure resolver remains the single source of truth; ThemeRoot publishes all tokens to CSS while CanvasStage consumes resolved hex colors only for Konva-owned editor chrome.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Tailwind CSS 3.4, Konva 10, Vitest 4, Testing Library

## Global Constraints

- Advanced tokens are exactly `paper`, `panel`, `ink`, `line`, `accent`, `coral`, and `canvas`.
- Preset palettes and existing persisted Custom overrides remain compatible.
- Application theme changes never mutate document elements, history, project data, or exported artwork.
- Custom `ink` keeps a 4.5:1 contrast minimum against `paper`; Custom `accent` keeps a 3:1 minimum against `panel`.
- Transparent and Green Screen background modes continue overriding `canvas`.
- Do not add dependencies or component-specific theme stores.

---

### Task 1: Complete Theme Domain

**Files:**
- Modify: `src/types/editor.ts:186-190`
- Modify: `src/theme/theme.ts:70-113`
- Modify: `src/test/theme.test.ts`

**Interfaces:**
- Consumes: existing `ThemeSettings` and preset palettes.
- Produces: seven-key `ThemeColorKey`, `ThemePalette = Record<ThemeColorKey, string>`, exported `getContrastRatio(a, b)`, and seven-key normalization/resolution.

- [ ] **Step 1: Write failing domain tests**

Add tests that require Accent/Error overrides, seven CSS variables, and exported contrast evidence:

```ts
it('normalizes and applies all seven advanced overrides', () => {
  const customThemeOverrides = {
    paper: '#101010', panel: '#202020', ink: '#ffffff', line: '#303030',
    accent: '#00ffcc', coral: '#ff3366', canvas: '#181818',
  };
  const normalized = normalizeThemeSettings({ theme: 'custom', customThemePrimary: '#7c3aed', customThemeOverrides });
  expect(normalized.customThemeOverrides).toEqual(customThemeOverrides);
  expect(resolveThemePalette(normalized)).toMatchObject(customThemeOverrides);
});

it('reports requested text contrast and exports all CSS variables', () => {
  expect(getContrastRatio('#ffffff', '#ffffff')).toBe(1);
  const variables = toThemeCssVariables(resolveThemePalette({ theme: 'custom', customThemePrimary: '#7c3aed', customThemeOverrides: { accent: '#112233', coral: '#445566' } }));
  expect(variables).toMatchObject({ '--color-accent': '17 34 51', '--color-coral': '68 85 102' });
});
```

- [ ] **Step 2: Verify tests fail**

Run: `npm test -- src/test/theme.test.ts`

Expected: FAIL because `accent`/`coral` are excluded from `ThemeColorKey` and `getContrastRatio` is not exported.

- [ ] **Step 3: Implement the seven-token domain**

Change the types and resolver keys:

```ts
export type ThemeColorKey = 'paper' | 'panel' | 'ink' | 'line' | 'accent' | 'coral' | 'canvas';
export type ThemePalette = Record<ThemeColorKey, string>;

export function getContrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

const keys: ThemeColorKey[] = ['paper', 'panel', 'ink', 'line', 'accent', 'coral', 'canvas'];
```

Use `getContrastRatio()` in `readableText()`, `readableAccent()`, and final Custom ink correction. After applying overrides, contrast-correct `accent` against the overridden `panel`:

```ts
const palette = { ...derived, ...settings.customThemeOverrides };
return {
  ...palette,
  ink: getContrastRatio(palette.ink, palette.paper) >= 4.5 ? palette.ink : readableText(palette.paper),
  accent: getContrastRatio(palette.accent, palette.panel) >= 3 ? palette.accent : readableAccent(palette.accent, palette.panel),
};
```

- [ ] **Step 4: Verify domain tests and build**

Run: `npm test -- src/test/theme.test.ts && npm run build`

Expected: all theme tests PASS and build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/types/editor.ts src/theme/theme.ts src/test/theme.test.ts
git commit -m "fix: complete custom theme palette"
```

---

### Task 2: Complete Advanced Settings and Contrast Feedback

**Files:**
- Modify: `src/components/ThemeSettings.tsx`
- Modify: `src/test/theme-settings.test.tsx`
- Modify: `src/test/theme-root.test.tsx`

**Interfaces:**
- Consumes: seven-key `ThemeColorKey`, `getContrastRatio()`, `resolveThemePalette()`, and existing store override actions.
- Produces: Accent/Error controls, region descriptions, per-token Auto actions, and visible applied-color feedback for corrected text/accent values.

- [ ] **Step 1: Write failing Settings-to-root integration tests**

Add a harness that mounts ThemeRoot around SettingsPanel and change every advanced input:

```tsx
render(<ThemeRoot><SettingsPanel open onClose={() => undefined} /></ThemeRoot>);
await user.click(screen.getByRole('radio', { name: 'Custom' }));
await user.click(screen.getByText('Advanced customization'));

const values = {
  'App background theme color': '#111111',
  'Panels theme color': '#222222',
  'Text theme color': '#ffffff',
  'Borders theme color': '#333333',
  'Accent theme color': '#00ccaa',
  'Error and warning theme color': '#ff3366',
  'Canvas theme color': '#181818',
};
for (const [label, value] of Object.entries(values)) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}
expect(useEditorStore.getState().customThemeOverrides).toEqual({
  paper: '#111111', panel: '#222222', ink: '#ffffff', line: '#333333',
  accent: '#00ccaa', coral: '#ff3366', canvas: '#181818',
});
expect(screen.getByTestId('theme-root').style.getPropertyValue('--color-coral')).toBe('255 51 102');
```

Add a test that chooses white text on white paper and expects `Adjusted for readability` plus the resolved applied swatch.

- [ ] **Step 2: Verify integration tests fail**

Run: `npm test -- src/test/theme-settings.test.tsx src/test/theme-root.test.tsx`

Expected: FAIL because Accent/Error inputs and contrast feedback do not exist.

- [ ] **Step 3: Add complete controls and feedback**

Use these field definitions:

```ts
const overrideFields: Array<{ key: ThemeColorKey; label: string; description: string }> = [
  { key: 'paper', label: 'App background', description: 'Secondary surfaces and app background' },
  { key: 'panel', label: 'Panels', description: 'Toolbars, sidebars, dialogs, and controls' },
  { key: 'ink', label: 'Text', description: 'Application text and icons' },
  { key: 'line', label: 'Borders', description: 'Borders, separators, and grid' },
  { key: 'accent', label: 'Accent', description: 'Active tools, focus, and selection' },
  { key: 'coral', label: 'Error and warning', description: 'Destructive actions and errors' },
  { key: 'canvas', label: 'Canvas', description: 'Normal editor canvas surface' },
];
```

For each row, display `description`, the requested color input, an applied-color swatch from `customPalette[key]`, and the existing Auto button. When `customThemeOverrides[key]` exists but differs case-insensitively from `customPalette[key]`, render:

```tsx
<span className="text-[10px] text-coral" role="status">Adjusted for readability</span>
```

- [ ] **Step 4: Verify Settings tests**

Run: `npm test -- src/test/theme-settings.test.tsx src/test/theme-root.test.tsx`

Expected: all Settings and ThemeRoot tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/ThemeSettings.tsx src/test/theme-settings.test.tsx src/test/theme-root.test.tsx
git commit -m "fix: expose every custom theme token"
```

---

### Task 3: Remove Theme-Bypassing Application Chrome

**Files:**
- Modify: `src/theme/theme.ts`
- Modify: `src/styles.css`
- Modify: `src/components/Topbar.tsx`
- Modify: `src/components/Toolbar.tsx`
- Modify: `src/components/BackgroundMenu.tsx`
- Modify: `src/components/CanvasStage.tsx`
- Modify: `src/test/canvas-text-placement.test.tsx`
- Modify: `src/test/background-menu.test.tsx`
- Modify: `src/test/theme.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: resolved `ThemePalette` and CSS variables from Tasks 1-2.
- Produces: semantic shadows/swatches and Konva editor chrome derived from `palette.accent`, `palette.panel`, `palette.ink`, and alpha conversion.

- [ ] **Step 1: Add failing chrome coverage tests**

Add assertions that the normal Background menu swatch uses `bg-canvas`, and export a pure alpha helper from the theme module:

```ts
expect(screen.getByRole('menuitemradio', { name: 'Normal' }).querySelector('[aria-hidden="true"]')).toHaveClass('bg-canvas');
expect(hexToRgba('#00ccaa', 0.08)).toBe('rgba(0, 204, 170, 0.08)');
```

Instrument the existing `react-konva` mock with a hoisted spy and verify editor chrome receives Custom Accent while store-owned artwork colors remain unchanged:

```tsx
const shapeSpy = vi.hoisted(() => vi.fn());

// inside MockShape, before useImperativeHandle
shapeSpy(_props);

it('themes editor chrome without changing artwork colors', () => {
  const rectangle = {
    id: 'rect-theme-test', layerId: 'layer-base', type: 'rect' as const,
    x: 0, y: 0, width: 20, height: 20,
    stroke: '#123456', fill: '#abcdef', strokeWidth: 2,
  };
  useEditorStore.setState({
    tool: 'select',
    theme: 'custom',
    customThemePrimary: '#7c3aed',
    customThemeOverrides: { accent: '#00ccaa' },
    elements: [rectangle],
  });
  shapeSpy.mockClear();
  render(<CanvasStage stageRef={createRef<Konva.Stage | null>()} />);

  expect(shapeSpy).toHaveBeenCalledWith(expect.objectContaining({ stroke: '#00ccaa' }));
  expect(useEditorStore.getState().elements[0]).toMatchObject({ stroke: '#123456', fill: '#abcdef' });
});
```

- [ ] **Step 2: Verify chrome tests fail**

Run: `npm test -- src/test/background-menu.test.tsx src/test/canvas-text-placement.test.tsx src/test/theme.test.ts`

Expected: FAIL because the normal swatch and Canvas selection chrome still contain fixed warm/teal colors.

- [ ] **Step 3: Replace application-only hard-coded colors**

Export this helper from `src/theme/theme.ts`:

```ts
export function hexToRgba(color: string, alpha: number): string {
  const [r, g, b] = rgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
```

In CanvasStage resolve the complete palette instead of only `themeCanvas`, then use:

```tsx
const themePalette = useMemo(
  () => resolveThemePalette({ theme, customThemePrimary, customThemeOverrides }),
  [customThemeOverrides, customThemePrimary, theme],
);

stroke={themePalette.accent}
fill={hexToRgba(themePalette.accent, 0.08)}
```

Apply the same palette values to marquee, lasso, multi-selection handle, draft outline, and inline text-editor border/background. Keep all `element.stroke`, `element.fill`, sticky-note shadows, image pixels, and export colors unchanged.

Replace application shadows with variable-aware CSS:

```css
box-shadow: 0 1px 0 rgb(var(--color-ink) / 0.12);
box-shadow: 0 8px 18px rgb(var(--color-accent) / 0.24);
```

Change the normal Background menu swatch from `bg-[#fffaf0]` to `bg-canvas` and update README to state that all seven Custom tokens are adjustable.

- [ ] **Step 4: Run full verification**

Run: `npm test`

Expected: all Vitest suites PASS.

Run: `npm run build`

Expected: TypeScript and Vite build succeed; the existing bundle-size warning may remain.

- [ ] **Step 5: Commit**

```bash
git add src/theme/theme.ts src/styles.css src/components/Topbar.tsx src/components/Toolbar.tsx src/components/BackgroundMenu.tsx src/components/CanvasStage.tsx src/test/theme.test.ts src/test/canvas-text-placement.test.tsx src/test/background-menu.test.tsx README.md
git commit -m "fix: apply theme tokens across editor chrome"
```
