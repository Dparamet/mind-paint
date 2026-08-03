import { createRef, forwardRef, useImperativeHandle, useRef, type MouseEvent, type ReactNode } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Konva from 'konva';
import { CanvasStage } from '../components/CanvasStage';
import { useEditorStore } from '../store/useEditorStore';

const rectangleNode = vi.hoisted(() => {
  let opacity = 1;
  return {
    id: () => 'rect-erase',
    getClientRect: () => ({ x: 20, y: 30, width: 100, height: 80 }),
    opacity: (value?: number) => value === undefined ? opacity : (opacity = value),
    toDataURL: () => 'data:image/png;base64,rectangle',
  };
});

vi.mock('react-konva', () => {
  type StageProps = {
    children?: ReactNode;
    onMouseDown?: (event: unknown) => void;
    onMouseMove?: (event: unknown) => void;
    onMouseUp?: (event: unknown) => void;
  };

  const Stage = forwardRef(function MockStage(props: StageProps, ref) {
    const pointerRef = useRef({ x: 60, y: 60 });
    const stage = {
      getPointerPosition: () => pointerRef.current,
      getIntersection: () => rectangleNode,
      findOne: () => rectangleNode,
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

const rectangle = {
  id: 'rect-erase',
  layerId: 'layer-base',
  type: 'rect' as const,
  x: 20,
  y: 30,
  width: 100,
  height: 80,
  fill: '#ffffff',
  stroke: '#111111',
  strokeWidth: 2,
};

describe('Canvas partial eraser', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverStub);
    useEditorStore.setState({
      tool: 'eraser',
      brushSize: 10,
      layers: [{ id: 'layer-base', name: 'Layer 1', visible: true, locked: false }],
      activeLayerId: 'layer-base',
      elements: [rectangle],
      history: [],
      future: [],
      selectedElementId: null,
      selectedElementIds: [],
    });
  });

  it('rasterizes and partially erases a rectangle instead of deleting it', () => {
    render(<CanvasStage stageRef={createRef<Konva.Stage | null>()} />);

    const stage = screen.getByTestId('canvas-stage');
    fireEvent.mouseDown(stage, { clientX: 60, clientY: 60 });
    fireEvent.mouseMove(stage, { clientX: 70, clientY: 60 });
    fireEvent.mouseUp(stage, { clientX: 60, clientY: 60 });

    expect(useEditorStore.getState().elements).toEqual([
      expect.objectContaining({
        id: 'rect-erase',
        type: 'image',
        src: 'data:image/png;base64,rectangle',
        erasures: [expect.objectContaining({
          points: expect.arrayContaining([expect.objectContaining({ x: 0.4, y: 0.375 })]),
        })],
      }),
    ]);
    expect(useEditorStore.getState().history).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toEqual([rectangle]);
  });

  it('does not rasterize an element on a locked layer', () => {
    useEditorStore.setState({
      layers: [{ id: 'layer-base', name: 'Layer 1', visible: true, locked: true }],
    });
    render(<CanvasStage stageRef={createRef<Konva.Stage | null>()} />);

    fireEvent.mouseDown(screen.getByTestId('canvas-stage'), { clientX: 60, clientY: 60 });

    expect(useEditorStore.getState().elements[0].type).toBe('rect');
  });
});
