import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { SettingsPanel } from '../components/SettingsPanel';
import { ThemeRoot } from '../components/ThemeRoot';
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

  it('applies every advanced color from Settings through ThemeRoot', async () => {
    const user = userEvent.setup();
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
  });

  it('shows when a requested text color is adjusted for readability', async () => {
    const user = userEvent.setup();
    render(<SettingsPanel open onClose={() => undefined} />);
    await user.click(screen.getByRole('radio', { name: 'Custom' }));
    await user.click(screen.getByText('Advanced customization'));

    fireEvent.change(screen.getByLabelText('App background theme color'), { target: { value: '#ffffff' } });
    fireEvent.change(screen.getByLabelText('Text theme color'), { target: { value: '#ffffff' } });

    expect(screen.getByRole('status')).toHaveTextContent('Adjusted for readability');
    expect(screen.getByLabelText('Applied Text color')).toHaveStyle({ background: '#17202a' });
  });
});
