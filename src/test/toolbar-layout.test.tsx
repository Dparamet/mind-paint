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
    const state = useEditorStore.getState();
    state.clearCanvas();
    state.setTool('select');
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

  it('toggles the shape menu from its trigger', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);
    const trigger = screen.getByRole('button', { name: 'Shapes' });

    await user.click(trigger);
    expect(screen.getByRole('menu', { name: 'Shape tools' })).toBeInTheDocument();
    await user.click(trigger);

    expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
  });

  it('closes the shape menu after an outside pointer interaction', async () => {
    const user = userEvent.setup();
    render(<Toolbar />);

    await user.click(screen.getByRole('button', { name: 'Shapes' }));
    await user.click(document.body);

    expect(screen.queryByRole('menu', { name: 'Shape tools' })).not.toBeInTheDocument();
  });

  it('keeps canvas actions reachable when the workspace is narrow', () => {
    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    expect(screen.getByRole('toolbar', { name: 'Canvas actions' })).toHaveClass('overflow-x-auto');
  });

  it('shows and updates formatting for the selected text element', async () => {
    const user = userEvent.setup();
    const state = useEditorStore.getState();
    const text = {
      id: 'text-1',
      layerId: state.activeLayerId,
      type: 'text' as const,
      text: 'Hello',
      x: 20,
      y: 30,
      width: 240,
      fontSize: 28,
      fontFamily: 'Georgia, serif',
      fontStyle: 'italic bold',
      align: 'right' as const,
      stroke: '#00000000',
      fill: '#17202a',
      strokeWidth: 0,
    };
    state.addElement(text);
    state.setSelectedElementId(text.id);

    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    expect(screen.getByRole('spinbutton', { name: 'Font size' })).toHaveValue(28);
    expect(screen.getByRole('combobox', { name: 'Font family' })).toHaveValue('Georgia, serif');
    expect(screen.getByRole('button', { name: 'Fill color, current #17202a' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Bold' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Italic' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Text align right' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Text align center' }));

    expect(useEditorStore.getState().elements.find((element) => element.id === text.id)).toMatchObject({
      align: 'center',
    });
  });

  it('offers every whole-canvas export format in an accessible menu', async () => {
    const user = userEvent.setup();
    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));

    const toolbar = screen.getByRole('toolbar', { name: 'Canvas actions' });
    const menu = screen.getByRole('menu', { name: 'Export formats' });
    expect(menu).toBeInTheDocument();
    expect(toolbar).not.toContainElement(menu);
    for (const name of ['PNG @3x', 'Transparent PNG', 'JPEG @3x', 'SVG', 'PDF', 'Project JSON']) {
      expect(screen.getByRole('menuitem', { name })).toBeInTheDocument();
    }
  });

  it('closes the export menu with Escape', async () => {
    const user = userEvent.setup();
    render(<Topbar stageRef={createRef<Konva.Stage | null>()} onOpenSettings={() => undefined} />);

    await user.click(screen.getByRole('button', { name: 'Export' }));
    await user.keyboard('{Escape}');

    expect(screen.queryByRole('menu', { name: 'Export formats' })).not.toBeInTheDocument();
  });
});
