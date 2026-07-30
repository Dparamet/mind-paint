import { createRef, forwardRef, useImperativeHandle, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { CanvasStage } from '../components/CanvasStage';
import { useEditorStore } from '../store/useEditorStore';

vi.mock('react-konva', () => {
  const Stage = forwardRef(function MockStage(
    props: { children?: ReactNode; onMouseDown?: (event: unknown) => void },
    ref,
  ) {
    const stage = {
      getPointerPosition: () => ({ x: 160, y: 140 }),
      findOne: () => null,
      getIntersection: () => null,
    };
    useImperativeHandle(ref, () => stage);

    return (
      <div
        data-testid="canvas-stage"
        onMouseDown={(event) => props.onMouseDown?.({
          evt: event.nativeEvent,
          target: { id: () => '', parent: null, getStage: () => stage },
        })}
      >
        {props.children}
      </div>
    );
  });

  const Layer = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Group = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Shape = () => null;
  const Transformer = forwardRef(function MockTransformer(_props, ref) {
    useImperativeHandle(ref, () => ({
      nodes: () => undefined,
      getLayer: () => ({ batchDraw: () => undefined }),
    }));
    return null;
  });

  return {
    Arrow: Shape,
    Circle: Shape,
    Ellipse: Shape,
    Group,
    Image: Shape,
    Layer,
    Line: Shape,
    Rect: Shape,
    RegularPolygon: Shape,
    Stage,
    Star: Shape,
    Text: Shape,
    Transformer,
  };
});

class ResizeObserverStub {
  observe() {}
  disconnect() {}
}

describe('Canvas text placement', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    const state = useEditorStore.getState();
    state.clearCanvas();
    state.setTool('text');
  });

  it('commits a new text element after cancelling the previous placement', () => {
    const stageRef = createRef<Konva.Stage | null>();
    render(<CanvasStage stageRef={stageRef} />);

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'ข้อความใหม่' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(useEditorStore.getState().elements).toEqual([
      expect.objectContaining({ type: 'text', text: 'ข้อความใหม่' }),
    ]);
  });
});
