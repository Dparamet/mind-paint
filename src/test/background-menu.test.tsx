import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BackgroundMenu } from '../components/BackgroundMenu';

describe('BackgroundMenu', () => {
  it('selects a background mode from an accessible menu', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BackgroundMenu value="normal" onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: 'Background: Normal' }));
    const green = screen.getByRole('menuitemradio', { name: 'Green Screen' });
    expect(green).toHaveAttribute('aria-checked', 'false');
    await user.click(green);

    expect(onChange).toHaveBeenCalledWith('greenScreen');
    expect(screen.queryByRole('menu', { name: 'Background modes' })).not.toBeInTheDocument();
  });

  it('marks the current mode and closes with Escape', async () => {
    const user = userEvent.setup();
    render(<BackgroundMenu value="transparent" onChange={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Background: Transparent' }));
    expect(screen.getByRole('menuitemradio', { name: 'Transparent' })).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Background modes' })).not.toBeInTheDocument();
  });
});
