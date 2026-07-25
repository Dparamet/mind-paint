import type Konva from 'konva';
import { createRef } from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Topbar } from '../components/Topbar';
import { Toolbar } from '../components/Toolbar';

describe('Toolbar layout', () => {
  it('keeps every drawing tool reachable in a scrollable navigation region', () => {
    render(<Toolbar />);

    const tools = screen.getByRole('navigation', { name: 'Drawing tools' });
    expect(tools).toHaveClass('min-h-0', 'overflow-y-auto');
    expect(screen.getByRole('button', { name: 'Text (T)' })).toBeInTheDocument();
  });

  it('keeps canvas actions reachable when the workspace is narrow', () => {
    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    expect(screen.getByRole('toolbar', { name: 'Canvas actions' })).toHaveClass('overflow-x-auto');
  });
});
