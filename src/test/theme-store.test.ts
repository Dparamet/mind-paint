import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEditorStore } from '../store/useEditorStore';
import type { RectElement } from '../types/editor';

beforeEach(() => {
  localStorage.clear();
  useEditorStore.setState({
    theme: 'warm',
    customThemePrimary: '#7c3aed',
    customThemeOverrides: {},
    elements: [],
    history: [],
    future: [],
  });
});

describe('theme settings store', () => {
  it('persists theme selection and custom values', () => {
    useEditorStore.getState().setTheme('custom');
    useEditorStore.getState().setCustomThemePrimary('#2563eb');
    useEditorStore.getState().setCustomThemeOverride('canvas', '#eef4ff');

    expect(JSON.parse(localStorage.getItem('mind-paint-settings') ?? '{}')).toMatchObject({
      theme: 'custom',
      customThemePrimary: '#2563eb',
      customThemeOverrides: { canvas: '#eef4ff' },
    });
  });

  it('resets custom values without changing the selected theme', () => {
    useEditorStore.setState({
      theme: 'custom',
      customThemePrimary: '#2563eb',
      customThemeOverrides: { paper: '#ffffff' },
    });

    useEditorStore.getState().resetCustomTheme();

    expect(useEditorStore.getState()).toMatchObject({
      theme: 'custom',
      customThemePrimary: '#7c3aed',
      customThemeOverrides: {},
    });
  });

  it('does not mutate artwork or history when changing theme', () => {
    const elements: RectElement[] = [{
      id: 'r1', layerId: 'layer-base', type: 'rect', x: 0, y: 0,
      width: 10, height: 10, stroke: '#111111', fill: '#abcdef', strokeWidth: 2,
    }];
    useEditorStore.setState({ elements, history: [], future: [] });

    useEditorStore.getState().setTheme('dark');

    expect(useEditorStore.getState().elements).toEqual(elements);
    expect(useEditorStore.getState().history).toEqual([]);
  });

  it('keeps the in-memory choice when storage throws', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota');
    });

    useEditorStore.getState().setTheme('dark');

    expect(useEditorStore.getState().theme).toBe('dark');
    spy.mockRestore();
  });

  it('removes one custom override without resetting the others', () => {
    useEditorStore.setState({ customThemeOverrides: { paper: '#ffffff', canvas: '#eeeeee' } });

    useEditorStore.getState().setCustomThemeOverride('paper', null);

    expect(useEditorStore.getState().customThemeOverrides).toEqual({ canvas: '#eeeeee' });
  });
});
