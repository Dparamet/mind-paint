# User-Selectable Theme System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persisted Warm, Light, Dark, and user-derived Custom themes that restyle the application and canvas surface without mutating artwork colors.

**Architecture:** Theme source settings live in the existing Zustand editor settings and persist through `mind-paint-settings`. A pure theme utility normalizes settings, derives palettes, enforces readable contrast, and exposes CSS-variable values; a root component applies those variables while CanvasStage receives the resolved canvas hex value separately for Konva.

**Tech Stack:** React 19, TypeScript 5.9, Zustand 5, Tailwind CSS 3.4, Konva 10, Vitest 4, Testing Library

## Global Constraints

- Theme identifiers are exactly `warm`, `light`, `dark`, and `custom`.
- Existing users default to `warm`; project documents and the IndexedDB schema do not change.
- Custom accepts one primary color plus optional overrides for `paper`, `panel`, `ink`, `line`, and `canvas`.
- Theme changes never mutate strokes, fills, text colors, sticky-note colors, image pixels, history, or undo/redo state.
- `transparent` and `greenScreen` background modes take precedence over the theme canvas color.
- Export output continues to use document/export background rules, not the application theme.
- Do not add a color library; palette derivation stays in a focused local utility.

---

## File Structure

- Create `src/theme/theme.ts`: theme presets, validation, custom derivation, contrast correction, normalization, and CSS-variable conversion.
- Create `src/components/ThemeRoot.tsx`: resolve store settings and publish theme variables at the application root.
- Create `src/components/ThemeSettings.tsx`: Appearance controls, Custom primary input, advanced overrides, and reset.
- Create `src/test/theme.test.ts`: pure theme-domain tests.
- Create `src/test/theme-store.test.ts`: persistence, normalization, reset, and artwork immutability tests.
- Create `src/test/theme-root.test.tsx`: root variable application tests.
- Create `src/test/theme-settings.test.tsx`: Settings interaction and accessibility tests.
- Modify `src/types/editor.ts`: add theme types and fields to `EditorSettings`.
- Modify `src/store/useEditorStore.ts`: defaults, normalized loading, persistence-safe actions, and setting selection.
- Modify `tailwind.config.js` and `src/styles.css`: route semantic colors through RGB-channel CSS variables and add `canvas`.
- Modify `src/App.tsx`: mount the application inside `ThemeRoot`.
- Modify `src/components/SettingsPanel.tsx`: render the focused Appearance component.
- Modify `src/utils/backgroundUtils.ts` and `src/components/CanvasStage.tsx`: use the resolved canvas color only for normal editor background mode.
- Modify `src/test/backgroundUtils.test.ts`: verify theme canvas precedence rules.
- Modify `README.md`: document the four themes and local persistence.

---

### Task 1: Theme Domain and Palette Derivation

**Files:**
- Create: `src/theme/theme.ts`
- Create: `src/test/theme.test.ts`
- Modify: `src/types/editor.ts:186-205`

**Interfaces:**
- Consumes: no application state; only theme settings supplied as plain values.
- Produces: `ThemeId`, `ThemeColorKey`, `ThemePalette`, `ThemeSettings`, `DEFAULT_CUSTOM_PRIMARY`, `PRESET_THEMES`, `isHexColor()`, `normalizeThemeSettings()`, `resolveThemePalette()`, and `toThemeCssVariables()`.

- [ ] **Step 1: Add theme types and write failing palette tests**

Add to `src/types/editor.ts` before `EditorSettings`, then add the three theme fields to `EditorSettings`:

```ts
export type ThemeId = 'warm' | 'light' | 'dark' | 'custom';
export type ThemeColorKey = 'paper' | 'panel' | 'ink' | 'line' | 'canvas';
export type ThemePalette = Record<ThemeColorKey | 'accent' | 'coral', string>;
export type CustomThemeOverrides = Partial<Record<ThemeColorKey, string>>;

export interface ThemeSettings {
  theme: ThemeId;
  customThemePrimary: string;
  customThemeOverrides: CustomThemeOverrides;
}
```

Add these properties inside the existing `EditorSettings` interface:

```ts
theme: ThemeId;
customThemePrimary: string;
customThemeOverrides: CustomThemeOverrides;
```

Create `src/test/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOM_PRIMARY,
  isHexColor,
  normalizeThemeSettings,
  resolveThemePalette,
  toThemeCssVariables,
} from '../theme/theme';

describe('theme domain', () => {
  it('resolves all presets with exact semantic colors', () => {
    expect(resolveThemePalette({ theme: 'warm', customThemePrimary: DEFAULT_CUSTOM_PRIMARY, customThemeOverrides: {} })).toMatchObject({ paper: '#f7f3ea', panel: '#fffaf0', canvas: '#fffaf0' });
    expect(resolveThemePalette({ theme: 'light', customThemePrimary: DEFAULT_CUSTOM_PRIMARY, customThemeOverrides: {} })).toMatchObject({ paper: '#f4f6f8', panel: '#ffffff', canvas: '#f8fafc' });
    expect(resolveThemePalette({ theme: 'dark', customThemePrimary: DEFAULT_CUSTOM_PRIMARY, customThemeOverrides: {} })).toMatchObject({ paper: '#111827', panel: '#1f2937', ink: '#f3f4f6', canvas: '#273449' });
  });

  it('derives a soft canvas and accepts valid overrides', () => {
    const palette = resolveThemePalette({ theme: 'custom', customThemePrimary: '#7c3aed', customThemeOverrides: { canvas: '#eee8ff' } });
    expect(palette.accent).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.canvas).toBe('#eee8ff');
  });

  it('corrects an unreadable custom text override', () => {
    const palette = resolveThemePalette({ theme: 'custom', customThemePrimary: '#7c3aed', customThemeOverrides: { paper: '#ffffff', ink: '#ffffff' } });
    expect(palette.ink).toBe('#17202a');
  });

  it('normalizes invalid persisted values independently', () => {
    expect(normalizeThemeSettings({ theme: 'system', customThemePrimary: 'red', customThemeOverrides: { paper: '#abcdef', ink: 'bad' } })).toEqual({
      theme: 'warm',
      customThemePrimary: DEFAULT_CUSTOM_PRIMARY,
      customThemeOverrides: { paper: '#abcdef' },
    });
  });

  it('validates strict six-digit hex and emits RGB channels', () => {
    expect(isHexColor('#12aBcF')).toBe(true);
    expect(isHexColor('#fff')).toBe(false);
    expect(toThemeCssVariables({ paper: '#ffffff', panel: '#ffffff', ink: '#000000', line: '#dddddd', accent: '#2563eb', coral: '#c84234', canvas: '#f8fafc' }))
      .toMatchObject({ '--color-paper': '255 255 255', '--color-accent': '37 99 235' });
  });
});
```

- [ ] **Step 2: Run the tests to verify the missing module failure**

Run: `npm test -- src/test/theme.test.ts`

Expected: FAIL because `../theme/theme` does not exist.

- [ ] **Step 3: Implement the pure theme module**

Create `src/theme/theme.ts` with these exact public constants and functions. Use `mix()` to create soft Custom surfaces, and darken an overly pale accent until it reaches a 3:1 contrast ratio against the panel:

```ts
import type { CSSProperties } from 'react';
import type { ThemeColorKey, ThemeId, ThemePalette, ThemeSettings } from '../types/editor';

export const DEFAULT_CUSTOM_PRIMARY = '#7c3aed';

export const PRESET_THEMES: Record<Exclude<ThemeId, 'custom'>, ThemePalette> = {
  warm: { paper: '#f7f3ea', panel: '#fffaf0', ink: '#24313d', line: '#ded5c7', accent: '#0f766e', coral: '#c84234', canvas: '#fffaf0' },
  light: { paper: '#f4f6f8', panel: '#ffffff', ink: '#17202a', line: '#d7dce2', accent: '#2563eb', coral: '#c84234', canvas: '#f8fafc' },
  dark: { paper: '#111827', panel: '#1f2937', ink: '#f3f4f6', line: '#374151', accent: '#5eead4', coral: '#fb7185', canvas: '#273449' },
};

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function rgb(hex: string): [number, number, number] {
  return [Number.parseInt(hex.slice(1, 3), 16), Number.parseInt(hex.slice(3, 5), 16), Number.parseInt(hex.slice(5, 7), 16)];
}

function hex([r, g, b]: number[]): string {
  return `#${[r, g, b].map((value) => Math.round(value).toString(16).padStart(2, '0')).join('')}`;
}

function mix(color: string, target: string, targetWeight: number): string {
  const from = rgb(color);
  const to = rgb(target);
  return hex(from.map((value, index) => value * (1 - targetWeight) + to[index] * targetWeight));
}

function luminance(color: string): number {
  const channels = rgb(color).map((value) => {
    const channel = value / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

function readableText(surface: string): string {
  return contrast('#17202a', surface) >= contrast('#f8fafc', surface) ? '#17202a' : '#f8fafc';
}

function readableAccent(primary: string, panel: string): string {
  let accent = primary;
  for (let step = 0; step < 8 && contrast(accent, panel) < 3; step += 1) accent = mix(accent, '#000000', 0.12);
  return accent;
}

export function normalizeThemeSettings(value: Record<string, unknown>): ThemeSettings {
  const validThemes: ThemeId[] = ['warm', 'light', 'dark', 'custom'];
  const theme = validThemes.includes(value.theme as ThemeId) ? value.theme as ThemeId : 'warm';
  const customThemePrimary = isHexColor(value.customThemePrimary) ? value.customThemePrimary : DEFAULT_CUSTOM_PRIMARY;
  const input = value.customThemeOverrides && typeof value.customThemeOverrides === 'object' ? value.customThemeOverrides as Record<string, unknown> : {};
  const keys: ThemeColorKey[] = ['paper', 'panel', 'ink', 'line', 'canvas'];
  const customThemeOverrides = Object.fromEntries(keys.filter((key) => isHexColor(input[key])).map((key) => [key, input[key] as string]));
  return { theme, customThemePrimary, customThemeOverrides };
}

export function resolveThemePalette(settings: ThemeSettings): ThemePalette {
  if (settings.theme !== 'custom') return PRESET_THEMES[settings.theme];
  const primary = isHexColor(settings.customThemePrimary) ? settings.customThemePrimary : DEFAULT_CUSTOM_PRIMARY;
  const paper = mix(primary, '#ffffff', 0.94);
  const panel = mix(primary, '#ffffff', 0.97);
  const derived: ThemePalette = {
    paper,
    panel,
    ink: readableText(paper),
    line: mix(primary, '#ffffff', 0.78),
    accent: readableAccent(primary, panel),
    coral: '#c84234',
    canvas: mix(primary, '#ffffff', 0.88),
  };
  const palette = { ...derived, ...settings.customThemeOverrides };
  return { ...palette, ink: contrast(palette.ink, palette.paper) >= 4.5 ? palette.ink : readableText(palette.paper) };
}

export function toThemeCssVariables(palette: ThemePalette): CSSProperties {
  return Object.fromEntries(Object.entries(palette).map(([key, value]) => [`--color-${key}`, rgb(value).join(' ')])) as CSSProperties;
}
```

- [ ] **Step 4: Run theme tests and type-check**

Run: `npm test -- src/test/theme.test.ts && npm run build`

Expected: theme tests PASS and the production build succeeds.

- [ ] **Step 5: Commit the theme domain**

```bash
git add src/types/editor.ts src/theme/theme.ts src/test/theme.test.ts
git commit -m "feat: add theme palette domain"
```

---

### Task 2: Persisted Theme Store Actions

**Files:**
- Create: `src/test/theme-store.test.ts`
- Modify: `src/store/useEditorStore.ts:29-68,90-115,146-175,209-310`

**Interfaces:**
- Consumes: `normalizeThemeSettings()` and `DEFAULT_CUSTOM_PRIMARY` from Task 1.
- Produces: store fields from `ThemeSettings` and actions `setTheme(theme)`, `setCustomThemePrimary(color)`, `setCustomThemeOverride(key, color)`, and `resetCustomTheme()`.

- [ ] **Step 1: Write failing store tests**

Create `src/test/theme-store.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '../store/useEditorStore';

beforeEach(() => {
  localStorage.clear();
  useEditorStore.setState({ theme: 'warm', customThemePrimary: '#7c3aed', customThemeOverrides: {}, elements: [], history: [], future: [] });
});

describe('theme settings store', () => {
  it('persists theme selection and custom values', () => {
    useEditorStore.getState().setTheme('custom');
    useEditorStore.getState().setCustomThemePrimary('#2563eb');
    useEditorStore.getState().setCustomThemeOverride('canvas', '#eef4ff');
    expect(JSON.parse(localStorage.getItem('mind-paint-settings') ?? '{}')).toMatchObject({ theme: 'custom', customThemePrimary: '#2563eb', customThemeOverrides: { canvas: '#eef4ff' } });
  });

  it('resets custom values without changing the selected theme', () => {
    useEditorStore.setState({ theme: 'custom', customThemePrimary: '#2563eb', customThemeOverrides: { paper: '#ffffff' } });
    useEditorStore.getState().resetCustomTheme();
    expect(useEditorStore.getState()).toMatchObject({ theme: 'custom', customThemePrimary: '#7c3aed', customThemeOverrides: {} });
  });

  it('does not mutate artwork or history when changing theme', () => {
    const elements = [{ id: 'r1', layerId: 'layer-base', type: 'rect', x: 0, y: 0, width: 10, height: 10, stroke: '#111111', fill: '#abcdef', strokeWidth: 2 }] as const;
    useEditorStore.setState({ elements: [...elements], history: [], future: [] });
    useEditorStore.getState().setTheme('dark');
    expect(useEditorStore.getState().elements).toEqual(elements);
    expect(useEditorStore.getState().history).toEqual([]);
  });

  it('keeps the in-memory choice when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    useEditorStore.getState().setTheme('dark');
    expect(useEditorStore.getState().theme).toBe('dark');
    spy.mockRestore();
  });
});
```

- [ ] **Step 2: Run the store tests to verify missing action failures**

Run: `npm test -- src/test/theme-store.test.ts`

Expected: FAIL because the four theme actions do not exist.

- [ ] **Step 3: Add normalized defaults and persistence-safe actions**

In `src/store/useEditorStore.ts`, import the theme utility and types, add these defaults and action signatures, and include all three fields in `pickSettings()`:

```ts
import { DEFAULT_CUSTOM_PRIMARY, isHexColor, normalizeThemeSettings } from '../theme/theme';
import type { ThemeColorKey, ThemeId } from '../types/editor';

// inside defaultSettings
theme: 'warm',
customThemePrimary: DEFAULT_CUSTOM_PRIMARY,
customThemeOverrides: {},

// inside loadSettings after parsing
return {
  ...defaultSettings,
  ...parsed,
  ...normalizeThemeSettings(parsed as Record<string, unknown>),
  lineHead: normalizeLineHead(parsed.lineHead),
};

// inside EditorStore
setTheme: (theme: ThemeId) => void;
setCustomThemePrimary: (color: string) => void;
setCustomThemeOverride: (key: ThemeColorKey, color: string | null) => void;
resetCustomTheme: () => void;

function persistSettings(settings: EditorSettings) {
  try { localStorage.setItem(settingsKey, JSON.stringify(settings)); } catch { /* keep session state */ }
}
```

Add the actions to the Zustand initializer:

```ts
setTheme: (theme) => set((state) => {
  const next = { ...pickSettings(state), theme };
  persistSettings(next);
  return { theme };
}),
setCustomThemePrimary: (customThemePrimary) => {
  if (!isHexColor(customThemePrimary)) return;
  set((state) => {
    persistSettings({ ...pickSettings(state), customThemePrimary });
    return { customThemePrimary };
  });
},
setCustomThemeOverride: (key, color) => set((state) => {
  const customThemeOverrides = { ...state.customThemeOverrides };
  if (color === null) delete customThemeOverrides[key];
  else if (isHexColor(color)) customThemeOverrides[key] = color;
  persistSettings({ ...pickSettings(state), customThemeOverrides });
  return { customThemeOverrides };
}),
resetCustomTheme: () => set((state) => {
  const customThemePrimary = DEFAULT_CUSTOM_PRIMARY;
  const customThemeOverrides = {};
  persistSettings({ ...pickSettings(state), customThemePrimary, customThemeOverrides });
  return { customThemePrimary, customThemeOverrides };
}),
```

- [ ] **Step 4: Run store and regression tests**

Run: `npm test -- src/test/theme-store.test.ts src/test/store-undo.test.ts`

Expected: both test files PASS.

- [ ] **Step 5: Commit store persistence**

```bash
git add src/store/useEditorStore.ts src/test/theme-store.test.ts
git commit -m "feat: persist theme settings"
```

---

### Task 3: CSS Variable Theme Root

**Files:**
- Create: `src/components/ThemeRoot.tsx`
- Create: `src/test/theme-root.test.tsx`
- Modify: `tailwind.config.js:5-17`
- Modify: `src/styles.css:1-48`
- Modify: `src/App.tsx:116-136`

**Interfaces:**
- Consumes: theme store fields and `resolveThemePalette()` / `toThemeCssVariables()`.
- Produces: a `ThemeRoot({ children })` component and semantic Tailwind colors backed by `--color-*` RGB channels.

- [ ] **Step 1: Write the failing root application test**

Create `src/test/theme-root.test.tsx`:

```tsx
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeRoot } from '../components/ThemeRoot';
import { useEditorStore } from '../store/useEditorStore';

beforeEach(() => useEditorStore.setState({ theme: 'warm', customThemePrimary: '#7c3aed', customThemeOverrides: {} }));

describe('ThemeRoot', () => {
  it('publishes preset variables and updates immediately', () => {
    render(<ThemeRoot><span>content</span></ThemeRoot>);
    const root = screen.getByTestId('theme-root');
    expect(root).toHaveAttribute('data-theme', 'warm');
    expect(root.style.getPropertyValue('--color-paper')).toBe('247 243 234');
    act(() => useEditorStore.getState().setTheme('dark'));
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(root.style.getPropertyValue('--color-paper')).toBe('17 24 39');
  });
});
```

- [ ] **Step 2: Run the test to verify the missing component failure**

Run: `npm test -- src/test/theme-root.test.tsx`

Expected: FAIL because `ThemeRoot` does not exist.

- [ ] **Step 3: Implement ThemeRoot and variable-backed Tailwind tokens**

Create `src/components/ThemeRoot.tsx`:

```tsx
import { useMemo, type ReactNode } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useEditorStore } from '../store/useEditorStore';
import { resolveThemePalette, toThemeCssVariables } from '../theme/theme';

export function ThemeRoot({ children }: { children: ReactNode }) {
  const settings = useEditorStore(useShallow((state) => ({
    theme: state.theme,
    customThemePrimary: state.customThemePrimary,
    customThemeOverrides: state.customThemeOverrides,
  })));
  const style = useMemo(() => toThemeCssVariables(resolveThemePalette(settings)), [settings]);
  return <div data-testid="theme-root" data-theme={settings.theme} style={style} className="flex h-screen w-screen overflow-hidden bg-paper text-ink">{children}</div>;
}
```

Change `tailwind.config.js` colors to:

```js
colors: {
  ink: 'rgb(var(--color-ink) / <alpha-value>)',
  paper: 'rgb(var(--color-paper) / <alpha-value>)',
  panel: 'rgb(var(--color-panel) / <alpha-value>)',
  line: 'rgb(var(--color-line) / <alpha-value>)',
  accent: 'rgb(var(--color-accent) / <alpha-value>)',
  coral: 'rgb(var(--color-coral) / <alpha-value>)',
  canvas: 'rgb(var(--color-canvas) / <alpha-value>)',
},
```

Set RGB-channel fallbacks in `src/styles.css`:

```css
:root {
  --color-ink: 36 49 61;
  --color-paper: 247 243 234;
  --color-panel: 255 250 240;
  --color-line: 222 213 199;
  --color-accent: 15 118 110;
  --color-coral: 200 66 52;
  --color-canvas: 255 250 240;
  color: rgb(var(--color-ink));
  background: rgb(var(--color-paper));
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.overflow-auto,
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: rgb(var(--color-line)) transparent;
}

.overflow-auto::-webkit-scrollbar-thumb,
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgb(var(--color-line));
}

.overflow-auto::-webkit-scrollbar-thumb:hover,
.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgb(var(--color-accent));
}
```

In `App.tsx`, wrap the existing children with `ThemeRoot` and remove the old outer div so there is only one full-screen root.

- [ ] **Step 4: Run root, layout, and build verification**

Run: `npm test -- src/test/theme-root.test.tsx src/test/toolbar-layout.test.tsx && npm run build`

Expected: tests PASS and Tailwind compiles every opacity modifier such as `bg-ink/20` correctly.

- [ ] **Step 5: Commit the theme root**

```bash
git add src/components/ThemeRoot.tsx src/test/theme-root.test.tsx tailwind.config.js src/styles.css src/App.tsx
git commit -m "feat: apply semantic theme variables"
```

---

### Task 4: Appearance Settings UI

**Files:**
- Create: `src/components/ThemeSettings.tsx`
- Create: `src/test/theme-settings.test.tsx`
- Modify: `src/components/SettingsPanel.tsx:26-102`

**Interfaces:**
- Consumes: theme fields/actions from Task 2 and `PRESET_THEMES` / `resolveThemePalette()` from Task 1.
- Produces: accessible theme radio choices, Custom primary control, optional overrides, and reset UI.

- [ ] **Step 1: Write failing Settings interaction tests**

Create `src/test/theme-settings.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsPanel } from '../components/SettingsPanel';
import { useEditorStore } from '../store/useEditorStore';

beforeEach(() => useEditorStore.setState({ theme: 'warm', customThemePrimary: '#7c3aed', customThemeOverrides: {} }));

describe('theme settings', () => {
  it('selects a labeled theme without relying on color alone', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel open onClose={() => undefined} />);
    await user.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(useEditorStore.getState().theme).toBe('dark');
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true');
  });

  it('shows custom controls and resets advanced overrides', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel open onClose={() => undefined} />);
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    expect(screen.getByLabelText('Primary theme color')).toBeInTheDocument();
    await user.click(screen.getByText('Advanced customization'));
    await user.click(screen.getByRole('button', { name: 'Reset custom theme' }));
    expect(useEditorStore.getState()).toMatchObject({ customThemePrimary: '#7c3aed', customThemeOverrides: {} });
  });
});
```

- [ ] **Step 2: Run the tests to verify missing Appearance controls**

Run: `npm test -- src/test/theme-settings.test.tsx`

Expected: FAIL because Settings contains no theme radios.

- [ ] **Step 3: Build the focused ThemeSettings component**

Create `src/components/ThemeSettings.tsx` using a radio group and native color inputs:

```tsx
import { RotateCcw } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import { PRESET_THEMES, resolveThemePalette } from '../theme/theme';
import type { ThemeColorKey, ThemeId } from '../types/editor';

const choices: Array<{ id: ThemeId; label: string }> = [
  { id: 'warm', label: 'Warm' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'custom', label: 'Custom' },
];
const overrideFields: Array<{ key: ThemeColorKey; label: string }> = [
  { key: 'paper', label: 'App background' },
  { key: 'panel', label: 'Panels' },
  { key: 'ink', label: 'Text' },
  { key: 'line', label: 'Borders' },
  { key: 'canvas', label: 'Canvas' },
];

export function ThemeSettings() {
  const state = useEditorStore();
  const palette = resolveThemePalette(state);
  return (
    <section aria-labelledby="appearance-heading">
      <h3 id="appearance-heading" className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">Appearance</h3>
      <div role="radiogroup" aria-label="Application theme" className="grid grid-cols-2 gap-2">
        {choices.map(({ id, label }) => {
          const sample = id === 'custom' ? palette : PRESET_THEMES[id];
          return <button key={id} type="button" role="radio" aria-checked={state.theme === id} aria-label={label} onClick={() => state.setTheme(id)} className={`rounded-md border p-2 text-left text-xs ${state.theme === id ? 'border-accent text-accent' : 'border-line'}`}><span className="mb-1 flex gap-1" aria-hidden="true"><i className="h-3 w-3 rounded-full" style={{ background: sample.paper }} /><i className="h-3 w-3 rounded-full" style={{ background: sample.accent }} /></span>{label}</button>;
        })}
      </div>
      {state.theme === 'custom' && <div className="mt-3 space-y-3">
        <label className="flex items-center justify-between text-sm">Primary color<input aria-label="Primary theme color" type="color" value={state.customThemePrimary} onChange={(event) => state.setCustomThemePrimary(event.target.value)} /></label>
        <details><summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-ink/60">Advanced customization</summary><div className="mt-2 space-y-2">{overrideFields.map(({ key, label }) => <div key={key} className="flex items-center justify-between gap-2 text-xs"><label className="flex flex-1 items-center justify-between">{label}<input aria-label={`${label} theme color`} type="color" value={state.customThemeOverrides[key] ?? palette[key]} onChange={(event) => state.setCustomThemeOverride(key, event.target.value)} /></label><button type="button" aria-label={`Use automatic ${label} color`} disabled={!state.customThemeOverrides[key]} onClick={() => state.setCustomThemeOverride(key, null)} className="text-ink/50 disabled:opacity-30">Auto</button></div>)}</div></details>
        <button type="button" className="flex items-center gap-2 text-xs text-coral" aria-label="Reset custom theme" onClick={state.resetCustomTheme}><RotateCcw size={13} />Reset custom theme</button>
      </div>}
    </section>
  );
}
```

Import and render `<ThemeSettings />` as the first block inside the Settings panel content, before keyboard reference.

- [ ] **Step 4: Run Settings and layout regression tests**

Run: `npm test -- src/test/theme-settings.test.tsx src/test/toolbar-layout.test.tsx`

Expected: both files PASS and every choice is keyboard-addressable through native buttons.

- [ ] **Step 5: Commit Appearance controls**

```bash
git add src/components/ThemeSettings.tsx src/components/SettingsPanel.tsx src/test/theme-settings.test.tsx
git commit -m "feat: add appearance theme controls"
```

---

### Task 5: Theme-Aware Canvas and Final Regression

**Files:**
- Modify: `src/utils/backgroundUtils.ts:5-10`
- Modify: `src/components/CanvasStage.tsx:65-90,1219-1272`
- Modify: `src/test/backgroundUtils.test.ts:7-14`
- Modify: `README.md:104-114,130-143`

**Interfaces:**
- Consumes: resolved `ThemePalette.canvas` from Task 1 and persisted settings from Task 2.
- Produces: `getCanvasBackgroundFill(mode, themeCanvas)` where explicit background modes override `themeCanvas`; export helpers remain unchanged.

- [ ] **Step 1: Update tests to require theme-aware normal canvas behavior**

Replace the first background test with:

```ts
describe('canvas background fill', () => {
  it('uses theme canvas only in normal mode', () => {
    expect(getCanvasBackgroundFill('normal', '#273449')).toBe('#273449');
    expect(getCanvasBackgroundFill('transparent', '#273449')).toBe('#00000000');
    expect(getCanvasBackgroundFill('greenScreen', '#273449')).toBe('#00FF00');
  });
});
```

- [ ] **Step 2: Run the background test to verify the signature failure**

Run: `npm test -- src/test/backgroundUtils.test.ts`

Expected: FAIL because normal mode still returns fixed `#fffaf0`.

- [ ] **Step 3: Pass the resolved canvas color to Konva without changing exports**

Change `getCanvasBackgroundFill()` only; do not alter `getExportBackground()`:

```ts
export function getCanvasBackgroundFill(mode: BackgroundMode, themeCanvas = '#fffaf0'): string {
  if (mode === 'transparent') return '#00000000';
  if (mode === 'greenScreen') return '#00FF00';
  return themeCanvas;
}
```

In `CanvasStage`, add `import { resolveThemePalette } from '../theme/theme';`, select the three theme settings, resolve the palette with `useMemo`, change the main surface class to `bg-canvas`, and supply the canvas hex:

```tsx
const themeSettings = useEditorStore(useShallow((state) => ({
  theme: state.theme,
  customThemePrimary: state.customThemePrimary,
  customThemeOverrides: state.customThemeOverrides,
})));
const themeCanvas = useMemo(() => resolveThemePalette(themeSettings).canvas, [themeSettings]);

<main ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-canvas">
  {/* existing controls and Stage */}
  <Rect
    id={CANVAS_BACKGROUND_ID}
    x={-100000}
    y={-100000}
    width={200000}
    height={200000}
    fill={getCanvasBackgroundFill(backgroundMode, themeCanvas)}
    listening={false}
  />
</main>
```

Add a README Features bullet for `Warm / Light / Dark / Custom themes`, update the localStorage settings list to include theme preferences, and add `theme/` plus the two new components to the source-tree summary.

- [ ] **Step 4: Run complete verification**

Run: `npm test`

Expected: every Vitest suite PASS.

Run: `npm run build`

Expected: TypeScript and Vite production build succeed with no errors.

- [ ] **Step 5: Commit canvas integration and documentation**

```bash
git add src/utils/backgroundUtils.ts src/components/CanvasStage.tsx src/test/backgroundUtils.test.ts README.md
git commit -m "feat: apply themes to canvas surface"
```

---

## Manual Verification

- [ ] Run `npm run dev`, open Settings, and select each of the four themes.
- [ ] Reload after choosing Dark and verify Dark remains selected.
- [ ] Choose Custom, change the primary color, expand Advanced customization, and override Canvas.
- [ ] Draw a colored shape, switch themes, and verify its stroke/fill values and undo history remain unchanged.
- [ ] Select Transparent and Green Screen backgrounds and verify they override the theme canvas; export PNG/JPEG and verify export backgrounds follow existing rules.
