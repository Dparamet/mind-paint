import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsPanel } from '../components/SettingsPanel';
import { useEditorStore } from '../store/useEditorStore';

beforeEach(() => {
  useEditorStore.setState({
    theme: 'warm',
    customThemePrimary: '#7c3aed',
    customThemeOverrides: {},
  });
});

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
    expect(screen.getByLabelText('Canvas theme color')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset custom theme' }));
    expect(useEditorStore.getState()).toMatchObject({
      customThemePrimary: '#7c3aed',
      customThemeOverrides: {},
    });
  });
});
