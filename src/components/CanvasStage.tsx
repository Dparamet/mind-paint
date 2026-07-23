import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer as KonvaLayer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Maximize2, RotateCcw } from 'lucide-react';
import { dataUrlToImageSize, getImageFromClipboard } from '../utils/clipboardUtils';
import { useEditorStore } from '../store/useEditorStore';
import type { CanvasElement, CircleElement, ImageElement, RectElement, TextElement } from '../types/editor';

interface CanvasStageProps {
  stageRef: RefObject<Konva.Stage | null>;
}

function useLoadedImage(src: string) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.src = src;
  }, [src]);

  return image;
}

function ImageNode({ element, selectable }: { element: ImageElement; selectable: boolean }) {
  const image = useLoadedImage(element.src);
  return <KonvaImage image={image ?? undefined} {...element} draggable={selectable} />;
}

function isMouseEvent(event: MouseEvent | TouchEvent): event is MouseEvent {
  return 'button' in event;
}

export function CanvasStage({ stageRef }: CanvasStageProps) {
  const {
    width,
    height,
    layers,
    elements,
    tool,
    activeLayerId,
    strokeColor,
    fillColor,
    brushSize,
    showGrid,
    snapToGrid,
    gridSize,
    fontSize,
    fontFamily,
    bold,
    italic,
    textAlign,
    rightClickEraser,
    selectedElementId,
    selectedElementIds,
    setSelectedElementId,
    setSelectedElementIds,
    toggleSelectedElementId,
    addElement,
    updateElement,
    deleteElement,
    deleteSelectedElements,
  } = useEditorStore();
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLElement>(null);
  const drawingId = useRef<string | null>(null);
  const rightEraseId = useRef<string | null>(null);
  const middlePanStart = useRef<{ pointer: { x: number; y: number }; stage: { x: number; y: number } } | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);

  const activeLayer = layers.find((layer) => layer.id === activeLayerId);
  const selectedElement = elements.find((element) => element.id === selectedElementId);
  const canEditActiveLayer = Boolean(activeLayer && activeLayer.visible && !activeLayer.locked);
  const fontStyle = `${italic ? 'italic ' : ''}${bold ? 'bold' : 'normal'}`;

  const elementsByLayer = useMemo(
    () => layers.map((layer) => ({ layer, elements: elements.filter((element) => element.layerId === layer.id) })),
    [elements, layers],
  );

  useEffect(() => {
    const stage = stageRef.current;
    const transformer = transformerRef.current;
    if (!stage || !transformer) return;
    const selectedNodes = selectedElementIds
      .map((id) => stage.findOne(`#${id}`))
      .filter((node): node is Konva.Node => Boolean(node));
    transformer.nodes(selectedNodes);
    transformer.getLayer()?.batchDraw();
  }, [selectedElementIds, elements, stageRef]);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      setStageSize({
        width: Math.max(320, entry.contentRect.width),
        height: Math.max(320, entry.contentRect.height),
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(true);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') setIsSpacePressed(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  useEffect(() => {
    const onPaste = async (event: ClipboardEvent) => {
      const src = await getImageFromClipboard(event);
      if (!src || !canEditActiveLayer) return;
      event.preventDefault();
      await insertImage(src, { x: 140, y: 120 });
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  });

  async function insertImage(src: string, point: { x: number; y: number }) {
    const size = await dataUrlToImageSize(src);
    const maxSide = 520;
    const ratio = Math.min(1, maxSide / Math.max(size.width, size.height));
    const element: ImageElement = {
      id: crypto.randomUUID(),
      layerId: activeLayerId,
      type: 'image',
      src,
      x: point.x,
      y: point.y,
      width: Math.round(size.width * ratio),
      height: Math.round(size.height * ratio),
      stroke: '#00000000',
      fill: '#00000000',
      strokeWidth: 0,
    };
    addElement(element);
    setSelectedElementId(element.id);
  }

  function getPointer() {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;
    return snapPoint({
      x: (pointer.x - stagePosition.x) / scale,
      y: (pointer.y - stagePosition.y) / scale,
    });
  }

  function snapValue(value: number) {
    return snapToGrid ? Math.round(value / gridSize) * gridSize : value;
  }

  function snapPoint(point: { x: number; y: number }) {
    return { x: snapValue(point.x), y: snapValue(point.y) };
  }

  function handlePointerDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if ('button' in event.evt && event.evt.button === 2 && rightClickEraser && canEditActiveLayer) {
      event.evt.preventDefault();
      const point = getPointer();
      if (!point) return;
      const id = crypto.randomUUID();
      rightEraseId.current = id;
      drawingId.current = id;
      addElement({
        id,
        layerId: activeLayerId,
        type: 'line',
        x: 0,
        y: 0,
        points: [point.x, point.y],
        stroke: '#fffaf0',
        fill: 'transparent',
        strokeWidth: Math.max(12, brushSize * 1.8),
        tension: 0.2,
        lineCap: 'round',
        lineJoin: 'round',
      });
      return;
    }

    if (isMouseEvent(event.evt) && event.evt.button === 1) {
      const mouseEvent = event.evt;
      event.evt.preventDefault();
      middlePanStart.current = {
        pointer: { x: mouseEvent.clientX, y: mouseEvent.clientY },
        stage: stagePosition,
      };
      setIsMiddlePanning(true);
      return;
    }

    const point = getPointer();
    if (!point) return;

    const clickedStage = event.target === event.target.getStage();
    if (tool === 'select') {
      if (clickedStage && !isSpacePressed) setSelectedElementIds([]);
      return;
    }

    if (!canEditActiveLayer) return;

    const hitId = event.target.id();
    if (tool === 'fill') {
      if (hitId) applyFill(hitId);
      return;
    }

    const id = crypto.randomUUID();
    drawingId.current = id;

    if (tool === 'pen' || tool === 'pencil' || tool === 'eraser') {
      addElement({
        id,
        layerId: activeLayerId,
        type: 'line',
        x: 0,
        y: 0,
        points: [point.x, point.y],
        stroke: tool === 'eraser' ? '#ffffff' : strokeColor,
        fill: 'transparent',
        strokeWidth: tool === 'pencil' ? Math.max(1, brushSize / 2) : brushSize,
        tension: tool === 'pen' ? 0.45 : 0.15,
        lineCap: 'round',
        lineJoin: 'round',
      });
    }

    if (tool === 'line' || tool === 'arrow') {
      if (tool === 'line') {
        addElement({
          id,
          layerId: activeLayerId,
          type: 'line',
          x: 0,
          y: 0,
          points: [point.x, point.y, point.x, point.y],
          stroke: strokeColor,
          fill: 'transparent',
          strokeWidth: brushSize,
          tension: 0,
          lineCap: 'round',
          lineJoin: 'round',
        });
      } else {
        addElement({
          id,
          layerId: activeLayerId,
          type: 'arrow',
          x: 0,
          y: 0,
          points: [point.x, point.y, point.x, point.y],
          stroke: strokeColor,
          fill: strokeColor,
          strokeWidth: brushSize,
          pointerLength: 18,
          pointerWidth: 18,
        });
      }
    }

    if (tool === 'rectangle' || tool === 'sticky' || tool === 'mindNode' || tool === 'speech') {
      if (tool === 'sticky') {
        addElement({
          id,
          layerId: activeLayerId,
          type: 'sticky',
          x: point.x,
          y: point.y,
          width: 220,
          height: 160,
          text: 'Sticky note',
          fontSize,
          stroke: strokeColor,
          fill: fillColor,
          strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        return;
      }
      if (tool === 'mindNode') {
        addElement({
          id,
          layerId: activeLayerId,
          type: 'mindNode',
          x: point.x,
          y: point.y,
          width: 220,
          height: 84,
          text: 'Mind node',
          fontSize,
          stroke: strokeColor,
          fill: fillColor,
          strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        return;
      }
      if (tool === 'speech') {
        addElement({
          id,
          layerId: activeLayerId,
          type: 'speech',
          x: point.x,
          y: point.y,
          width: 240,
          height: 120,
          text: 'Speech bubble',
          fontSize,
          stroke: strokeColor,
          fill: fillColor,
          strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        return;
      }
      addElement({
        id,
        layerId: activeLayerId,
        type: 'rect',
        x: point.x,
        y: point.y,
        width: 1,
        height: 1,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth: brushSize,
      });
    }

    if (tool === 'circle') {
      addElement({
        id,
        layerId: activeLayerId,
        type: 'circle',
        x: point.x,
        y: point.y,
        radiusX: 1,
        radiusY: 1,
        stroke: strokeColor,
        fill: fillColor,
        strokeWidth: brushSize,
      });
    }

    if (tool === 'text') {
      const text = window.prompt('Text', 'New thought');
      drawingId.current = null;
      if (!text) return;
      const element: TextElement = {
        id,
        layerId: activeLayerId,
        type: 'text',
        x: point.x,
        y: point.y,
        text,
        width: 260,
        fontSize,
        fontFamily,
        fontStyle,
        align: textAlign,
        stroke: strokeColor,
        fill: strokeColor,
        strokeWidth: 0,
      };
      addElement(element);
      setSelectedElementId(id);
    }
  }

  function handleMouseMove(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if ('clientX' in event.evt) {
      const start = middlePanStart.current;
      if (start) {
        setStagePosition({
          x: start.stage.x + event.evt.clientX - start.pointer.x,
          y: start.stage.y + event.evt.clientY - start.pointer.y,
        });
        return;
      }
    }

    const id = drawingId.current;
    const point = getPointer();
    if (!id || !point) return;
    const element = elements.find((item) => item.id === id);
    if (!element) return;

    if (element.type === 'line') {
      const isStraightLine = element.points.length === 4 && element.tension === 0;
      updateElement(id, { points: isStraightLine ? [element.points[0], element.points[1], point.x, point.y] : [...element.points, point.x, point.y] }, false);
    }
    if (element.type === 'arrow') {
      updateElement(id, { points: [element.points[0], element.points[1], point.x, point.y] }, false);
    }
    if (element.type === 'rect') {
      updateElement(id, { width: point.x - element.x, height: point.y - element.y }, false);
    }
    if (element.type === 'circle') {
      updateElement(id, { radiusX: Math.abs(point.x - element.x), radiusY: Math.abs(point.y - element.y) }, false);
    }
  }

  function handleMouseUp() {
    drawingId.current = null;
    rightEraseId.current = null;
    middlePanStart.current = null;
    setIsMiddlePanning(false);
  }

  function applyFill(id: string) {
    const target = elements.find((element) => element.id === id);
    if (!target) return;
    const layer = layers.find((item) => item.id === target.layerId);
    if (!layer || layer.locked || !layer.visible) return;
    if (target.type === 'line') updateElement(id, { stroke: fillColor });
    else updateElement(id, { fill: fillColor });
  }

  function handleWheel(event: Konva.KonvaEventObject<WheelEvent>) {
    event.evt.preventDefault();
    if (event.evt.altKey) {
      setStagePosition((position) => ({
        ...position,
        x: position.x - event.evt.deltaY,
      }));
      return;
    }

    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return;

    const scaleBy = 1.06;
    const oldScale = scale;
    const mousePointTo = {
      x: (pointer.x - stagePosition.x) / oldScale,
      y: (pointer.y - stagePosition.y) / oldScale,
    };
    const nextScale = Math.min(4, Math.max(0.15, event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy));

    setScale(nextScale);
    setStagePosition({
      x: pointer.x - mousePointTo.x * nextScale,
      y: pointer.y - mousePointTo.y * nextScale,
    });
  }

  function resetZoom() {
    setScale(1);
    setStagePosition({ x: 0, y: 0 });
  }

  function fitToScreen() {
    const padding = 96;
    const nextScale = Math.min(
      1.4,
      Math.max(0.15, Math.min((stageSize.width - padding) / width, (stageSize.height - padding) / height)),
    );
    setScale(nextScale);
    setStagePosition({
      x: (stageSize.width - width * nextScale) / 2,
      y: (stageSize.height - height * nextScale) / 2,
    });
  }

  function handleTransformEnd(id: string, node: Konva.Node, element: CanvasElement) {
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();
    node.scale({ x: 1, y: 1 });

    if (element.type === 'rect' || element.type === 'image') {
      updateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(8, (element as RectElement | ImageElement).width * scaleX),
        height: Math.max(8, (element as RectElement | ImageElement).height * scaleY),
        rotation: node.rotation(),
      });
    }
    if (element.type === 'circle') {
      updateElement(id, {
        x: node.x(),
        y: node.y(),
        radiusX: Math.max(4, (element as CircleElement).radiusX * scaleX),
        radiusY: Math.max(4, (element as CircleElement).radiusY * scaleY),
        rotation: node.rotation(),
      });
    }
    if (element.type === 'text') {
      updateElement(id, {
        x: node.x(),
        y: node.y(),
        width: Math.max(80, (element as TextElement).width * scaleX),
        rotation: node.rotation(),
      });
    }
    if (element.type === 'sticky' || element.type === 'mindNode' || element.type === 'speech') {
      updateElement(id, {
        x: snapValue(node.x()),
        y: snapValue(node.y()),
        width: Math.max(80, element.width * scaleX),
        height: Math.max(48, element.height * scaleY),
        rotation: node.rotation(),
      });
    }
  }

  function editTextElement(element: CanvasElement) {
    if (!('text' in element)) return;
    const text = window.prompt('Edit text', element.text);
    if (text === null) return;
    updateElement(element.id, { text } as Partial<CanvasElement>);
  }

  function renderElement(element: CanvasElement) {
    const elementLayer = layers.find((layer) => layer.id === element.layerId);
    const canMoveElement = tool === 'select' && Boolean(elementLayer && elementLayer.visible && !elementLayer.locked);
    const common = {
      id: element.id,
      key: element.id,
      x: element.x,
      y: element.y,
      rotation: element.rotation ?? 0,
      opacity: element.opacity ?? 1,
      stroke: element.stroke,
      fill: element.fill,
      strokeWidth: element.strokeWidth,
      draggable: canMoveElement,
      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (tool === 'fill') {
          applyFill(element.id);
          return;
        }
        if (tool === 'select') {
          if (event.evt.shiftKey) toggleSelectedElementId(element.id);
          else setSelectedElementId(element.id);
        }
      },
      onTap: () => {
        if (tool === 'select') setSelectedElementId(element.id);
        if (tool === 'fill') applyFill(element.id);
      },
      onDragStart: (event: Konva.KonvaEventObject<DragEvent>) => {
        if (!event.evt.altKey || tool !== 'select') return;
        const copy = {
          ...structuredClone(element),
          id: crypto.randomUUID(),
          x: element.x + 24,
          y: element.y + 24,
        } as CanvasElement;
        addElement(copy);
        setSelectedElementId(copy.id);
      },
      onDragEnd: (event: Konva.KonvaEventObject<DragEvent>) => {
        updateElement(element.id, { x: snapValue(event.target.x()), y: snapValue(event.target.y()) });
      },
      onTransformEnd: (event: Konva.KonvaEventObject<Event>) => handleTransformEnd(element.id, event.target, element),
      onDblClick: () => editTextElement(element),
      onDblTap: () => editTextElement(element),
    };

    if (element.type === 'line') return <Line {...common} points={element.points} tension={element.tension} lineCap={element.lineCap} lineJoin={element.lineJoin} />;
    if (element.type === 'arrow') return <Arrow {...common} points={element.points} pointerLength={element.pointerLength} pointerWidth={element.pointerWidth} />;
    if (element.type === 'rect') return <Rect {...common} width={element.width} height={element.height} />;
    if (element.type === 'circle') return <Ellipse {...common} radiusX={element.radiusX} radiusY={element.radiusY} />;
    if (element.type === 'text') return <Text {...common} text={element.text} width={element.width} fontSize={element.fontSize} fontFamily={element.fontFamily} fontStyle={element.fontStyle} align={element.align} />;
    if (element.type === 'sticky') {
      return (
        <Group {...common}>
          <Rect width={element.width} height={element.height} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} cornerRadius={8} shadowColor="#17202a" shadowOpacity={0.12} shadowBlur={12} />
          <Text text={element.text} x={14} y={14} width={element.width - 28} fontSize={element.fontSize} fill={element.stroke} />
        </Group>
      );
    }
    if (element.type === 'mindNode') {
      return (
        <Group {...common}>
          <Rect width={element.width} height={element.height} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} cornerRadius={42} />
          <Text text={element.text} x={18} y={element.height / 2 - element.fontSize / 1.6} width={element.width - 36} fontSize={element.fontSize} fill={element.stroke} align="center" />
        </Group>
      );
    }
    if (element.type === 'speech') {
      return (
        <Group {...common}>
          <Rect width={element.width} height={element.height} fill={element.fill} stroke={element.stroke} strokeWidth={element.strokeWidth} cornerRadius={16} />
          <Line points={[42, element.height, 28, element.height + 24, 76, element.height]} fill={element.fill} stroke={element.stroke} closed strokeWidth={element.strokeWidth} />
          <Text text={element.text} x={16} y={16} width={element.width - 32} fontSize={element.fontSize} fill={element.stroke} />
        </Group>
      );
    }
    return <ImageNode key={element.id} element={{ ...element, ...common }} selectable={canMoveElement} />;
  }

  return (
    <main ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-paper">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-line bg-panel px-2 py-1 text-xs font-medium text-ink shadow-soft">
        <span>{Math.round(scale * 100)}%</span>
        <input
          aria-label="Canvas zoom"
          type="range"
          min="0.35"
          max="1.25"
          step="0.05"
          value={scale}
          onChange={(event) => setScale(Number(event.target.value))}
        />
        <button className="icon-button h-8 w-8" aria-label="Reset zoom" title="Reset zoom" onClick={resetZoom}>
          <RotateCcw size={14} />
        </button>
        <button className="icon-button h-8 w-8" aria-label="Fit to screen" title="Fit to screen" onClick={fitToScreen}>
          <Maximize2 size={14} />
        </button>
      </div>

      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        x={stagePosition.x}
        y={stagePosition.y}
        scale={{ x: scale, y: scale }}
        draggable={isSpacePressed}
        className={`${showGrid ? 'bg-[radial-gradient(circle,#cfe4db_1px,transparent_1px)] [background-size:24px_24px]' : 'bg-paper'} ${isMiddlePanning ? 'cursor-grabbing' : ''}`}
        onMouseDown={handlePointerDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onWheel={handleWheel}
        onContextMenu={(event) => event.evt.preventDefault()}
        onDragEnd={(event) => {
          if (event.target === stageRef.current) {
            setStagePosition({ x: event.target.x(), y: event.target.y() });
          }
        }}
      >
        <KonvaLayer listening={false}>
          <Rect x={-100000} y={-100000} width={200000} height={200000} fill="#fffaf0" />
        </KonvaLayer>
        {elementsByLayer.map(({ layer, elements: layerElements }) => (
          <KonvaLayer key={layer.id} visible={layer.visible} listening={!layer.locked}>
            <Group>{layerElements.map(renderElement)}</Group>
          </KonvaLayer>
        ))}
        <KonvaLayer>
          <Transformer ref={transformerRef} rotateEnabled enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']} />
        </KonvaLayer>
      </Stage>

      {selectedElementId && (
        <button
          className="absolute bottom-4 left-4 rounded-md border border-line bg-panel px-3 py-2 text-sm font-medium shadow-soft hover:border-coral hover:bg-coral/10 hover:text-coral"
          onClick={() => {
            if (selectedElementIds.length) {
              deleteSelectedElements();
              return;
            }
            deleteElement(selectedElementId);
          }}
        >
          Delete selected
        </button>
      )}
    </main>
  );
}
