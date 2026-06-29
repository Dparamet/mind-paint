import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { Arrow, Ellipse, Group, Image as KonvaImage, Layer as KonvaLayer, Line, Rect, Stage, Text, Transformer } from 'react-konva';
import type Konva from 'konva';
import { Maximize2, RotateCcw } from 'lucide-react';
import { dataUrlToImageSize, getImageFromClipboard } from '../utils/clipboardUtils';
import { DASH_MAP, getElementBounds } from '../utils/elementUtils';
import { useEditorStore } from '../store/useEditorStore';
import type { CanvasElement, CircleElement, ImageElement, RectElement, TextElement } from '../types/editor';
import { isStickyLike } from '../types/editor';

function pointInPolygon(px: number, py: number, pts: number[]) {
  const n = pts.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function isElementInLasso(el: CanvasElement, pts: number[]) {
  const b = getElementBounds(el);
  return (
    [[b.x + b.w / 2, b.y + b.h / 2], [b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]] as [number, number][]
  ).some(([x, y]) => pointInPolygon(x, y, pts));
}

const EMPTY_POINTS: number[] = [];

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
    prependElement,
    updateElement,
    deleteElement,
    deleteSelectedElements,
    strokeDash,
  } = useEditorStore();
  const transformerRef = useRef<Konva.Transformer>(null);
  const containerRef = useRef<HTMLElement>(null);
  const drawingId = useRef<string | null>(null);
  const rightEraseId = useRef<string | null>(null);
  const middlePanStart = useRef<{ pointer: { x: number; y: number }; stage: { x: number; y: number } } | null>(null);
  const fillCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fillElementIdRef = useRef<string | null>(null);
  const [scale, setScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [stageSize, setStageSize] = useState({ width: 1200, height: 800 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const isErasingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const editingCancelledRef = useRef(false);
  // ponytail: refs + batchDraw instead of state — eliminates 60fps React re-renders during drag
  const marqueeStartRef = useRef<{ x: number; y: number } | null>(null);
  const marqueeRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeKonvaRef = useRef<Konva.Rect>(null);
  const lassoPointsRef = useRef<number[]>([]);
  const lassoLineRef = useRef<Konva.Line>(null);
  const lassoActiveRef = useRef(false);

  const activeLayer = layers.find((layer) => layer.id === activeLayerId);
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
  }, [canEditActiveLayer, activeLayerId]);

  // Reset fill accumulation when the fill element is undone/removed
  useEffect(() => {
    if (fillElementIdRef.current && !elements.find(e => e.id === fillElementIdRef.current)) {
      fillCanvasRef.current = null;
      fillElementIdRef.current = null;
    }
  }, [elements]);

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

  function getPointer(noSnap = false) {
    const stage = stageRef.current;
    const pointer = stage?.getPointerPosition();
    if (!stage || !pointer) return null;
    const raw = { x: (pointer.x - stagePosition.x) / scale, y: (pointer.y - stagePosition.y) / scale };
    return noSnap ? raw : snapPoint(raw);
  }

  function snapValue(value: number) {
    return snapToGrid ? Math.round(value / gridSize) * gridSize : value;
  }

  function snapPoint(point: { x: number; y: number }) {
    return { x: snapValue(point.x), y: snapValue(point.y) };
  }

  function hexToRgb(hex: string) {
    const m = hex.replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
    if (!m) return null;
    return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) };
  }

  function floodFill(screenX: number, screenY: number) {
    const stage = stageRef.current;
    if (!stage) return;

    const fill = hexToRgb(fillColor);
    if (!fill) return;

    // Hide transformer so handles don't appear in the snapshot
    const prevNodes = transformerRef.current?.nodes() ?? [];
    transformerRef.current?.nodes([]);

    const W = stageSize.width;
    const H = stageSize.height;
    const stageCanvas = stage.toCanvas({ pixelRatio: 1 });

    transformerRef.current?.nodes(prevNodes);

    // Composite: stage render + accumulated fill canvas (fixes async image loading gap)
    const composite = document.createElement('canvas');
    composite.width = W; composite.height = H;
    const compCtx = composite.getContext('2d')!;
    compCtx.drawImage(stageCanvas, 0, 0);
    if (fillCanvasRef.current && fillCanvasRef.current.width === W && fillCanvasRef.current.height === H) {
      compCtx.drawImage(fillCanvasRef.current, 0, 0);
    }

    const srcPx = compCtx.getImageData(0, 0, W, H).data;

    const px = Math.round(screenX);
    const py = Math.round(screenY);
    if (px < 0 || px >= W || py < 0 || py >= H) return;

    const si = (py * W + px) * 4;
    const tr = srcPx[si], tg = srcPx[si + 1], tb = srcPx[si + 2];

    if (tr === fill.r && tg === fill.g && tb === fill.b) return;

    // BFS with typed arrays for perf
    const visited = new Uint8Array(W * H);
    const queue = new Int32Array(W * H);
    let head = 0, tail = 0;
    const start = py * W + px;
    queue[tail++] = start;
    visited[start] = 1;

    const out = new Uint8ClampedArray(W * H * 4);
    const TOLERANCE = 32;

    while (head < tail) {
      const pos = queue[head++];
      const x = pos % W;
      const pi = pos * 4;
      out[pi] = fill.r; out[pi + 1] = fill.g; out[pi + 2] = fill.b; out[pi + 3] = 255;

      for (const npos of [pos - 1, pos + 1, pos - W, pos + W]) {
        if (npos < 0 || npos >= W * H) continue;
        if (Math.abs((npos % W) - x) > 1) continue;
        if (visited[npos]) continue;
        visited[npos] = 1;
        const ni = npos * 4;
        const diff = Math.abs(srcPx[ni] - tr) + Math.abs(srcPx[ni + 1] - tg) + Math.abs(srcPx[ni + 2] - tb);
        if (diff < TOLERANCE) queue[tail++] = npos;
      }
    }

    // Accumulate into fillCanvasRef so next BFS sees this fill immediately
    if (!fillCanvasRef.current || fillCanvasRef.current.width !== W || fillCanvasRef.current.height !== H) {
      fillCanvasRef.current = document.createElement('canvas');
      fillCanvasRef.current.width = W;
      fillCanvasRef.current.height = H;
    }
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = W; tmpCanvas.height = H;
    tmpCanvas.getContext('2d')!.putImageData(new ImageData(out, W, H), 0, 0);
    fillCanvasRef.current.getContext('2d')!.drawImage(tmpCanvas, 0, 0);

    const dataUrl = fillCanvasRef.current.toDataURL('image/png');
    const worldX = -stagePosition.x / scale;
    const worldY = -stagePosition.y / scale;

    // Reuse existing fill element (update src) or create new one
    if (fillElementIdRef.current && elements.find(e => e.id === fillElementIdRef.current)) {
      updateElement(fillElementIdRef.current, { src: dataUrl } as Partial<CanvasElement>);
    } else {
      const id = crypto.randomUUID();
      fillElementIdRef.current = id;
      prependElement({
        id,
        layerId: activeLayerId,
        type: 'image',
        src: dataUrl,
        x: worldX,
        y: worldY,
        width: W / scale,
        height: H / scale,
        stroke: '#00000000',
        fill: '#00000000',
        strokeWidth: 0,
      });
    }
  }

  function eraseAtScreenPoint(screenPos: { x: number; y: number }) {
    const node = stageRef.current?.getIntersection(screenPos);
    if (!node) return;
    const id = node.id();
    const el = elements.find((e) => e.id === id);
    if (!el) return;
    const elementLayer = layers.find((l) => l.id === el.layerId);
    if (elementLayer?.visible && !elementLayer.locked) deleteElement(id);
  }

  function commitEdit() {
    if (editingCancelledRef.current) { editingCancelledRef.current = false; return; }
    if (!editingId) return;
    const id = editingId;
    const el = elements.find((e) => e.id === id);
    const stickyLike = el && isStickyLike(el.type);
    setEditingId(null);
    if (editingText.trim() || stickyLike) {
      updateElement(id, { text: editingText } as Partial<CanvasElement>);
    } else {
      deleteElement(id);
    }
  }

  function cancelEdit() {
    editingCancelledRef.current = true;
    if (!editingId) return;
    const id = editingId;
    setEditingId(null);
    const el = elements.find((e) => e.id === id);
    if (el && 'text' in el && !el.text) deleteElement(id);
  }

  function handlePointerDown(event: Konva.KonvaEventObject<MouseEvent | TouchEvent>) {
    if ('button' in event.evt && event.evt.button === 2 && rightClickEraser && canEditActiveLayer) {
      event.evt.preventDefault();
      rightEraseId.current = 'active';
      const pos = stageRef.current?.getPointerPosition();
      if (pos) eraseAtScreenPoint(pos);
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
      if (clickedStage && !isSpacePressed) {
        setSelectedElementIds([]);
        marqueeStartRef.current = point;
        marqueeKonvaRef.current?.visible(true);
      }
      return;
    }

    if (tool === 'lasso') {
      if (!isSpacePressed) {
        setSelectedElementIds([]);
        lassoActiveRef.current = true;
        const rawP = getPointer(true) ?? point;
        lassoPointsRef.current = [rawP.x, rawP.y];
        if (lassoLineRef.current) {
          lassoLineRef.current.points([rawP.x, rawP.y]);
          lassoLineRef.current.visible(true);
          lassoLineRef.current.getLayer()?.batchDraw();
        }
      }
      return;
    }

    if (!canEditActiveLayer) return;

    const hitId = event.target.id();
    if (tool === 'fill') {
      // Check direct hit first; group children (sticky/mindNode/speech inner Rect/Text) have no id,
      // so traverse to parent to find the group's element id.
      let targetId = hitId;
      if (!elements.find((e) => e.id === targetId)) {
        targetId = (event.target.parent as Konva.Node | null)?.id() ?? '';
      }
      const hitEl = elements.find((e) => e.id === targetId);
      if (hitEl && ['rect', 'circle', 'sticky', 'mindNode', 'speech'].includes(hitEl.type)) {
        updateElement(hitEl.id, { fill: fillColor });
      } else {
        const pos = stageRef.current?.getPointerPosition();
        if (pos) floodFill(pos.x, pos.y);
      }
      return;
    }

    const id = crypto.randomUUID();
    drawingId.current = id;

    if (tool === 'eraser') {
      isErasingRef.current = true;
      const pos = stageRef.current?.getPointerPosition();
      if (pos) eraseAtScreenPoint(pos);
      return;
    }

    if (tool === 'pen' || tool === 'pencil') {
      addElement({
        id,
        layerId: activeLayerId,
        type: 'line',
        x: 0,
        y: 0,
        points: [point.x, point.y],
        stroke: strokeColor,
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
          dash: DASH_MAP[strokeDash],
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
          dash: DASH_MAP[strokeDash],
        });
      }
    }

    if (tool === 'rectangle' || tool === 'sticky' || tool === 'mindNode' || tool === 'speech') {
      if (tool === 'sticky') {
        addElement({
          id, layerId: activeLayerId, type: 'sticky',
          x: point.x, y: point.y, width: 220, height: 160,
          text: '', fontSize, stroke: strokeColor, fill: fillColor, strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        setEditingId(id);
        setEditingText('');
        return;
      }
      if (tool === 'mindNode') {
        addElement({
          id, layerId: activeLayerId, type: 'mindNode',
          x: point.x, y: point.y, width: 220, height: 84,
          text: '', fontSize, stroke: strokeColor, fill: fillColor, strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        setEditingId(id);
        setEditingText('');
        return;
      }
      if (tool === 'speech') {
        addElement({
          id, layerId: activeLayerId, type: 'speech',
          x: point.x, y: point.y, width: 240, height: 120,
          text: '', fontSize, stroke: strokeColor, fill: fillColor, strokeWidth: 2,
        });
        drawingId.current = null;
        setSelectedElementId(id);
        setEditingId(id);
        setEditingText('');
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
        dash: DASH_MAP[strokeDash],
      });
      drawStartRef.current = point;
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
        dash: DASH_MAP[strokeDash],
      });
    }

    if (tool === 'text') {
      drawingId.current = null;
      const element: TextElement = {
        id,
        layerId: activeLayerId,
        type: 'text',
        x: point.x,
        y: point.y,
        text: '',
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
      setEditingId(id);
      setEditingText('');
      return;
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

    if (isErasingRef.current || rightEraseId.current) {
      const pos = stageRef.current?.getPointerPosition();
      if (pos) eraseAtScreenPoint(pos);
      return;
    }

    if (lassoActiveRef.current) {
      const p = getPointer(true);
      if (p) {
        const prev = lassoPointsRef.current;
        if (prev.length >= 2) {
          const dx = p.x - prev[prev.length - 2], dy = p.y - prev[prev.length - 1];
          if (dx * dx + dy * dy < 9) return;
        }
        prev.push(p.x, p.y);
        if (lassoLineRef.current) {
          lassoLineRef.current.points(prev);
          lassoLineRef.current.getLayer()?.batchDraw();
        }
      }
      return;
    }

    if (marqueeStartRef.current && tool === 'select') {
      const mp = getPointer();
      if (mp) {
        const start = marqueeStartRef.current;
        const m = { x: Math.min(start.x, mp.x), y: Math.min(start.y, mp.y), w: Math.abs(mp.x - start.x), h: Math.abs(mp.y - start.y) };
        marqueeRef.current = m;
        if (marqueeKonvaRef.current) {
          marqueeKonvaRef.current.setAttrs({ x: m.x, y: m.y, width: m.w, height: m.h });
          marqueeKonvaRef.current.getLayer()?.batchDraw();
        }
      }
      return;
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
    if (element.type === 'rect' && drawStartRef.current) {
      const start = drawStartRef.current;
      updateElement(id, {
        x: Math.min(start.x, point.x),
        y: Math.min(start.y, point.y),
        width: Math.abs(point.x - start.x),
        height: Math.abs(point.y - start.y),
      }, false);
    }
    if (element.type === 'circle') {
      updateElement(id, { radiusX: Math.abs(point.x - element.x), radiusY: Math.abs(point.y - element.y) }, false);
    }
  }

  function handleMouseUp() {
    if (lassoActiveRef.current) {
      lassoActiveRef.current = false;
      const pts = lassoPointsRef.current;
      if (pts.length >= 6) {
        const selected = elements.filter((el) => isElementInLasso(el, pts));
        if (selected.length) setSelectedElementIds(selected.map((el) => el.id));
      }
      lassoPointsRef.current = [];
      if (lassoLineRef.current) {
        lassoLineRef.current.visible(false);
        lassoLineRef.current.points(EMPTY_POINTS);
        lassoLineRef.current.getLayer()?.batchDraw();
      }
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current;
      if (m.w > 4 || m.h > 4) {
        const { x, y, w, h } = m;
        const selected = elements.filter((el) => {
          const b = getElementBounds(el);
          return b.x < x + w && b.x + b.w > x && b.y < y + h && b.y + b.h > y;
        });
        if (selected.length) setSelectedElementIds(selected.map((el) => el.id));
      }
      marqueeRef.current = null;
      if (marqueeKonvaRef.current) {
        marqueeKonvaRef.current.visible(false);
        marqueeKonvaRef.current.getLayer()?.batchDraw();
      }
    }
    marqueeStartRef.current = null;
    drawingId.current = null;
    rightEraseId.current = null;
    middlePanStart.current = null;
    drawStartRef.current = null;
    isErasingRef.current = false;
    setIsMiddlePanning(false);
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
    if (isStickyLike(element.type)) {
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
    setEditingId(element.id);
    setEditingText(element.text);
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
      dash: element.dash?.length ? element.dash : undefined,
      draggable: canMoveElement,
      onClick: (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (tool === 'fill') return; // handled by handlePointerDown (mousedown)
        if (tool === 'select') {
          if (event.evt.shiftKey) toggleSelectedElementId(element.id);
          else setSelectedElementId(element.id);
        }
      },
      onTap: () => {
        if (tool === 'select') setSelectedElementId(element.id);
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
    <main ref={containerRef} className="relative flex flex-1 items-center justify-center overflow-hidden bg-white">
      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-md border border-line bg-panel px-2 py-1 text-xs text-ink shadow-soft">
        <span>{Math.round(scale * 100)}%</span>
        <input
          aria-label="Canvas zoom"
          type="range"
          min="0.15"
          max="4"
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
        className={`${showGrid ? 'bg-white [background-image:linear-gradient(#e8e8e8_1px,transparent_1px),linear-gradient(90deg,#e8e8e8_1px,transparent_1px)] [background-size:20px_20px]' : 'bg-white'} ${isMiddlePanning ? 'cursor-grabbing' : ''}`}
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
          <Rect x={-100000} y={-100000} width={200000} height={200000} fill="#ffffff" />
        </KonvaLayer>
        {elementsByLayer.map(({ layer, elements: layerElements }) => (
          <KonvaLayer key={layer.id} visible={layer.visible} listening={!layer.locked}>
            <Group>{layerElements.map(renderElement)}</Group>
          </KonvaLayer>
        ))}
        <KonvaLayer>
          <Transformer ref={transformerRef} rotateEnabled enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']} />
          <Rect
            ref={marqueeKonvaRef}
            visible={false} x={0} y={0} width={0} height={0}
            stroke="#4c7eff" strokeWidth={1 / scale}
            dash={[4 / scale, 4 / scale]} fill="rgba(76,126,255,0.06)"
            listening={false}
          />
          <Line
            ref={lassoLineRef}
            visible={false} points={EMPTY_POINTS}
            stroke="#4c7eff" strokeWidth={1.5 / scale}
            dash={[4 / scale, 4 / scale]} fill="rgba(76,126,255,0.06)"
            closed listening={false}
          />
        </KonvaLayer>
      </Stage>

      {editingId && (() => {
        const el = elements.find((e) => e.id === editingId);
        if (!el || !('text' in el)) return null;
        const left = el.x * scale + stagePosition.x;
        const top = el.y * scale + stagePosition.y;
        const w = ('width' in el ? (el as { width: number }).width : 260) * scale;
        const rawFs = (el as { fontSize?: number }).fontSize;
        const fs = rawFs != null ? rawFs * scale : 16;
        const stickyLike = isStickyLike(el.type);
        const elH = ('height' in el ? (el as { height: number }).height : 0) * scale;
        return (
          <textarea
            key={editingId}
            autoFocus
            className="absolute z-20 resize-none font-[inherit] outline-none"
            style={{
              left, top, width: Math.max(120, w), fontSize: fs, lineHeight: 1.5,
              ...(stickyLike ? {
                height: elH || undefined,
                minHeight: elH || Math.max(48, fs * 2),
                padding: `${Math.max(8, 14 * scale)}px`,
                backgroundColor: el.fill ?? '#fef08a',
                border: `2px solid ${el.stroke ?? '#17202a'}`,
                borderRadius: el.type === 'sticky' ? '8px' : el.type === 'mindNode' ? '42px' : '16px',
                color: el.stroke ?? '#17202a',
                boxShadow: el.type === 'sticky' ? '0 4px 12px rgba(23,32,42,0.12)' : undefined,
              } : {
                minHeight: Math.max(32, fs * 2),
                border: '2px solid #0f766e',
                borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.95)',
                padding: '4px',
              }),
            }}
            value={editingText}
            onChange={(e) => setEditingText(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { e.preventDefault(); cancelEdit(); }
              else if (e.key === 'Enter' && !e.shiftKey && el.type === 'text') { e.preventDefault(); commitEdit(); }
            }}
          />
        );
      })()}

      {selectedElementId && (
        <button
          className="absolute bottom-4 left-4 rounded-md border border-line bg-panel px-3 py-2 text-sm shadow-soft hover:border-coral hover:text-coral"
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
