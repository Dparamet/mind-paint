import type Konva from 'konva';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Topbar } from '../components/Topbar';
import { Toolbar } from '../components/Toolbar';
import { useEditorStore } from '../store/useEditorStore';

describe('Toolbar layout', () => {
  beforeEach(() => {
    useEditorStore.getState().setTool('select');
  });

  it('keeps every drawing tool reachable in a scrollable navigation region', () => {
    render(<Toolbar />);

    const tools = screen.getByRole('navigation', { name: 'Drawing tools' });
    expect(tools).toHaveClass('min-h-0', 'overflow-y-auto');
    expect(screen.getByRole('button', { name: 'Text (T)' })).toBeInTheDocument();
  });

  it('groups geometry tools in an accessible popover', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);

    await user.click(screen.getByRole('button', { name: 'Shapes' }));

    expect(screen.getByRole('menu', { name: 'Shape tools' })).toBeInTheDocument();
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Polygons')).toBeInTheDocument();
    expect(screen.getByText('Decorative')).toBeInTheDocument();

    await user.click(screen.getByRole('menuitemradio', { name: 'Triangle' }));

    expect(useEditorStore.getState().tool).toBe('triangle');
    expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
  });

  it('closes the shape popover with Escape', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);

    await user.click(screen.getByRole('button', { name: 'Shapes' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
  });

  it('keeps canvas actions reachable when the workspace is narrow', () => {
    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    expect(screen.getByRole('toolbar', { name: 'Canvas actions' })).toHaveClass('overflow-x-auto');
  });
});
