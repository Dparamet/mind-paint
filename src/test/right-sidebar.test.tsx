import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { RightSidebar } from '../components/RightSidebar';

vi.mock('../db/indexedDb', () => ({
  deleteProject: vi.fn().mockResolvedValue(undefined),
  listProjects: vi.fn().mockResolvedValue([]),
  saveProject: vi.fn().mockResolvedValue(undefined),
}));

describe('RightSidebar', () => {
  it('collapses to a reopen rail and expands without losing access', async () => {
    const user = userEvent.setup();
    render(<RightSidebar saveStatus="saved" />);

    const collapse = screen.getByRole('button', { name: 'Collapse right sidebar' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Layers')).toBeInTheDocument();

    await user.click(collapse);

    const expand = screen.getByRole('button', { name: 'Expand right sidebar' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Layers')).not.toBeInTheDocument();

    await user.click(expand);

    expect(screen.getByText('Layers')).toBeInTheDocument();
  });
});
