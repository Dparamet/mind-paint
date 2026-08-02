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
