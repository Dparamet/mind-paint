import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeRoot } from '../components/ThemeRoot';
import { useEditorStore } from '../store/useEditorStore';

beforeEach(() => {
  useEditorStore.setState({
    theme: 'warm',
    customThemePrimary: '#7c3aed',
    customThemeOverrides: {},
  });
});

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
