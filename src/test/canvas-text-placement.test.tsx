import { createRef, forwardRef, useImperativeHandle, useRef, type MouseEvent, type ReactNode } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { CanvasStage } from '../components/CanvasStage';
import { useEditorStore } from '../store/useEditorStore';

vi.mock('react-konva', () => {
  type StageProps = {
    children?: ReactNode;
    onMouseDown?: (event: unknown) => void;
    onMouseMove?: (event: unknown) => void;
    onMouseUp?: (event: unknown) => void;
  };

  const Stage = forwardRef(function MockStage(
    props: StageProps,
    ref,
  ) {
    const pointerRef = useRef({ x: 160, y: 140 });
    const stage = {
      getPointerPosition: () => pointerRef.current,
      findOne: () => null,
      getIntersection: () => null,
    };
    useImperativeHandle(ref, () => stage);

    const dispatch = (handler: ((event: unknown) => void) | undefined, event: MouseEvent<HTMLDivElement>) => {
      pointerRef.current = { x: event.clientX, y: event.clientY };
      handler?.({
        evt: event.nativeEvent,
        target: { id: () => '', parent: null, getStage: () => stage },
      });
    };

    return (
      <div
        data-testid="canvas-stage"
        onMouseDown={(event) => dispatch(props.onMouseDown, event)}
        onMouseMove={(event) => dispatch(props.onMouseMove, event)}
        onMouseUp={(event) => dispatch(props.onMouseUp, event)}
      >
        {props.children}
      </div>
    );
  });

  const Layer = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Group = ({ children }: { children?: ReactNode }) => <>{children}</>;
  const Shape = forwardRef(function MockShape(_props, ref) {
    useImperativeHandle(ref, () => ({
      setAttrs: () => undefined,
      visible: () => undefined,
      getLayer: () => ({ batchDraw: () => undefined }),
    }));
    return null;
  });
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
    fireEvent.mouseUp(screen.getByTestId('canvas-stage'));
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'));
    fireEvent.mouseUp(screen.getByTestId('canvas-stage'));
    const editor = screen.getByRole('textbox');
    fireEvent.change(editor, { target: { value: 'ข้อความใหม่' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(useEditorStore.getState().elements).toEqual([
      expect.objectContaining({ type: 'text', text: 'ข้อความใหม่' }),
    ]);
  });

  it('allows text placement after the active draft is removed externally', () => {
    const stageRef = createRef<Konva.Stage | null>();
    render(<CanvasStage stageRef={stageRef} />);

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'));
    fireEvent.mouseUp(screen.getByTestId('canvas-stage'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();

    act(() => useEditorStore.getState().clearCanvas());
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'));
    fireEvent.mouseUp(screen.getByTestId('canvas-stage'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('creates a text box from dragged canvas bounds and edits after release', () => {
    const stageRef = createRef<Konva.Stage | null>();
    render(<CanvasStage stageRef={stageRef} />);
    const stage = screen.getByTestId('canvas-stage');

    fireEvent.mouseDown(stage, { clientX: 100, clientY: 120 });
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    fireEvent.mouseMove(stage, { clientX: 340, clientY: 220 });
    fireEvent.mouseUp(stage, { clientX: 340, clientY: 220 });

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(useEditorStore.getState().elements).toEqual([
      expect.objectContaining({ type: 'text', x: 100, y: 120, width: 240, height: 100 }),
    ]);
  });

  it('creates the default text box from a click', () => {
    const stageRef = createRef<Konva.Stage | null>();
    render(<CanvasStage stageRef={stageRef} />);
    const stage = screen.getByTestId('canvas-stage');

    fireEvent.mouseDown(stage, { clientX: 100, clientY: 120 });
    fireEvent.mouseUp(stage, { clientX: 100, clientY: 120 });

    expect(useEditorStore.getState().elements[0]).toEqual(
      expect.objectContaining({ type: 'text', width: 260, height: 72 }),
    );
  });
});
