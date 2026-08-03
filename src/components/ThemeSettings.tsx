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

const overrideFields: Array<{ key: ThemeColorKey; label: string; description: string }> = [
  { key: 'paper', label: 'App background', description: 'Secondary surfaces and app background' },
  { key: 'panel', label: 'Panels', description: 'Toolbars, sidebars, dialogs, and controls' },
  { key: 'ink', label: 'Text', description: 'Application text and icons' },
  { key: 'line', label: 'Borders', description: 'Borders, separators, and grid' },
  { key: 'accent', label: 'Accent', description: 'Active tools, focus, and selection' },
  { key: 'coral', label: 'Error and warning', description: 'Destructive actions and errors' },
  { key: 'canvas', label: 'Canvas', description: 'Normal editor canvas surface' },
];

export function ThemeSettings() {
  const state = useEditorStore();
  const customPalette = resolveThemePalette({
    theme: 'custom',
    customThemePrimary: state.customThemePrimary,
    customThemeOverrides: state.customThemeOverrides,
  });

  return (
    <section aria-labelledby="appearance-heading">
      <h3
        id="appearance-heading"
        className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50"
      >
        Appearance
      </h3>

      <div
        role="radiogroup"
        aria-label="Application theme"
        className="grid grid-cols-2 gap-2"
      >
        {choices.map(({ id, label }) => {
          const sample = id === 'custom' ? customPalette : PRESET_THEMES[id];
          const selected = state.theme === id;
          return (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={label}
              onClick={() => state.setTheme(id)}
              className={`rounded-md border bg-paper p-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-accent/35 ${
                selected ? 'border-accent text-accent' : 'border-line hover:border-accent/50'
              }`}
            >
              <span className="mb-1 flex gap-1" aria-hidden="true">
                <span
                  className="h-3 w-3 rounded-full border border-line"
                  style={{ background: sample.paper }}
                />
                <span
                  className="h-3 w-3 rounded-full border border-line"
                  style={{ background: sample.accent }}
                />
              </span>
              {label}
            </button>
          );
        })}
      </div>

      {state.theme === 'custom' && (
        <div className="mt-3 space-y-3 rounded-lg border border-line bg-paper p-3">
          <label className="flex items-center justify-between text-sm">
            <span>Primary color</span>
            <input
              aria-label="Primary theme color"
              type="color"
              value={state.customThemePrimary}
              onChange={(event) => state.setCustomThemePrimary(event.target.value)}
              className="h-8 w-12 cursor-pointer rounded border border-line bg-panel"
            />
          </label>

          <details>
            <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-ink/60">
              Advanced customization
            </summary>
            <div className="mt-3 space-y-2">
              {overrideFields.map(({ key, label, description }) => {
                const requested = state.customThemeOverrides[key];
                const applied = customPalette[key];
                const adjusted = Boolean(requested && requested.toLowerCase() !== applied.toLowerCase());
                return (
                  <div key={key} className="rounded-md border border-line/70 bg-panel/40 p-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <label className="flex min-w-0 flex-1 items-center justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block font-medium">{label}</span>
                          <span className="block truncate text-[10px] text-ink/50">{description}</span>
                        </span>
                        <input
                          aria-label={`${label} theme color`}
                          type="color"
                          value={requested ?? applied}
                          onChange={(event) => state.setCustomThemeOverride(key, event.target.value)}
                          className="h-7 w-11 shrink-0 cursor-pointer rounded border border-line bg-panel"
                        />
                      </label>
                      <span
                        aria-label={`Applied ${label} color`}
                        className="h-6 w-6 shrink-0 rounded-full border border-line"
                        style={{ background: applied }}
                      />
                      <button
                        type="button"
                        aria-label={`Use automatic ${label} color`}
                        disabled={!requested}
                        onClick={() => state.setCustomThemeOverride(key, null)}
                        className="rounded px-1.5 py-1 text-[10px] text-ink/60 hover:text-accent disabled:opacity-30"
                      >
                        Auto
                      </button>
                    </div>
                    {adjusted && (
                      <span className="mt-1 block text-[10px] text-coral" role="status">
                        Adjusted for readability
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </details>

          <button
            type="button"
            aria-label="Reset custom theme"
            onClick={state.resetCustomTheme}
            className="flex items-center gap-2 text-xs font-medium text-coral hover:underline"
          >
            <RotateCcw size={13} />
            Reset custom theme
          </button>
        </div>
      )}
    </section>
  );
}
