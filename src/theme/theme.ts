import type { CSSProperties } from 'react';
import type { ThemeColorKey, ThemeId, ThemePalette, ThemeSettings } from '../types/editor';

export const DEFAULT_CUSTOM_PRIMARY = '#7c3aed';

export const PRESET_THEMES: Record<Exclude<ThemeId, 'custom'>, ThemePalette> = {
  warm: {
    paper: '#f7f3ea', panel: '#fffaf0', ink: '#24313d', line: '#ded5c7',
    accent: '#0f766e', coral: '#c84234', canvas: '#fffaf0',
  },
  light: {
    paper: '#f4f6f8', panel: '#ffffff', ink: '#17202a', line: '#d7dce2',
    accent: '#2563eb', coral: '#c84234', canvas: '#f8fafc',
  },
  dark: {
    paper: '#111827', panel: '#1f2937', ink: '#f3f4f6', line: '#374151',
    accent: '#5eead4', coral: '#fb7185', canvas: '#273449',
  },
};

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value);
}

function rgb(hex: string): [number, number, number] {
  return [
    Number.parseInt(hex.slice(1, 3), 16),
    Number.parseInt(hex.slice(3, 5), 16),
    Number.parseInt(hex.slice(5, 7), 16),
  ];
}

function hex(channels: number[]): string {
  return `#${channels
    .map((value) => Math.round(value).toString(16).padStart(2, '0'))
    .join('')}`;
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
  for (let step = 0; step < 8 && contrast(accent, panel) < 3; step += 1) {
    accent = mix(accent, '#000000', 0.12);
  }
  return accent;
}

export function normalizeThemeSettings(value: Record<string, unknown>): ThemeSettings {
  const validThemes: ThemeId[] = ['warm', 'light', 'dark', 'custom'];
  const theme = validThemes.includes(value.theme as ThemeId) ? value.theme as ThemeId : 'warm';
  const customThemePrimary = isHexColor(value.customThemePrimary)
    ? value.customThemePrimary
    : DEFAULT_CUSTOM_PRIMARY;
  const input = value.customThemeOverrides && typeof value.customThemeOverrides === 'object'
    ? value.customThemeOverrides as Record<string, unknown>
    : {};
  const keys: ThemeColorKey[] = ['paper', 'panel', 'ink', 'line', 'canvas'];
  const customThemeOverrides = Object.fromEntries(
    keys.filter((key) => isHexColor(input[key])).map((key) => [key, input[key] as string]),
  );
  return { theme, customThemePrimary, customThemeOverrides };
}

export function resolveThemePalette(settings: ThemeSettings): ThemePalette {
  if (settings.theme !== 'custom') return PRESET_THEMES[settings.theme];

  const primary = isHexColor(settings.customThemePrimary)
    ? settings.customThemePrimary
    : DEFAULT_CUSTOM_PRIMARY;
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
  return {
    ...palette,
    ink: contrast(palette.ink, palette.paper) >= 4.5 ? palette.ink : readableText(palette.paper),
  };
}

export function toThemeCssVariables(palette: ThemePalette): CSSProperties {
  return Object.fromEntries(
    Object.entries(palette).map(([key, value]) => [`--color-${key}`, rgb(value).join(' ')]),
  ) as CSSProperties;
}
