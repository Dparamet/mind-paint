export type Tool =
  | 'select'
  | 'lasso'
  | 'pen'
  | 'pencil'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'triangle'
  | 'diamond'
  | 'hexagon'
  | 'star'
  | 'line'
  | 'arrow'
  | 'sticky'
  | 'mindNode'
  | 'speech'
  | 'text'
  | 'fill';

export type ElementKind = 'line' | 'arrow' | 'rect' | 'circle' | 'polygon' | 'star' | 'text' | 'image' | 'sticky' | 'mindNode' | 'speech';

export interface Point {
  x: number;
  y: number;
}

export type StrokeDash = 'solid' | 'dashed' | 'dotted';

export interface BaseElement {
  id: string;
  layerId: string;
  type: ElementKind;
  x: number;
  y: number;
  rotation?: number;
  opacity?: number;
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
  dash?: number[];
  /** Sticky annotation attached to the element (shown as a 💬 badge) */
  comment?: string;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: number[];
  tension?: number;
  lineCap?: 'butt' | 'round' | 'square';
  lineJoin?: 'round' | 'bevel' | 'miter';
  globalCompositeOperation?: GlobalCompositeOperation;
}

export interface ArrowElement extends BaseElement {
  type: 'arrow';
  points: number[];
  pointerLength: number;
  pointerWidth: number;
}

export interface RectElement extends BaseElement {
  type: 'rect';
  width: number;
  height: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radiusX: number;
  radiusY: number;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  width: number;
  fontSize: number;
  fontFamily: string;
  fontStyle?: string;
  align?: 'left' | 'center' | 'right';
}

export interface StickyElement extends BaseElement {
  type: 'sticky';
  text: string;
  width: number;
  height: number;
  fontSize: number;
}

export interface MindNodeElement extends BaseElement {
  type: 'mindNode';
  text: string;
  width: number;
  height: number;
  fontSize: number;
}

export interface SpeechElement extends BaseElement {
  type: 'speech';
  text: string;
  width: number;
  height: number;
  fontSize: number;
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string;
  width: number;
  height: number;
  /** Flood-fill raster: non-interactive background paint, excluded from selection */
  isFill?: boolean;
}

export interface PolygonElement extends BaseElement {
  type: 'polygon';
  sides: number;
  radius: number;
}

export interface StarElement extends BaseElement {
  type: 'star';
  numPoints: number;
  outerRadius: number;
  innerRadius: number;
}

export type CanvasElement =
  | LineElement
  | ArrowElement
  | RectElement
  | CircleElement
  | PolygonElement
  | StarElement
  | TextElement
  | ImageElement
  | StickyElement
  | MindNodeElement
  | SpeechElement;

export const STICKY_LIKE_TYPES = ['sticky', 'mindNode', 'speech'] as const;
export type StickyLikeKind = (typeof STICKY_LIKE_TYPES)[number];
export function isStickyLike(type: string): type is StickyLikeKind {
  return (STICKY_LIKE_TYPES as readonly string[]).includes(type);
}

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
}

export interface EditorDocument {
  id: string;
  name: string;
  width: number;
  height: number;
  layers: Layer[];
  elements: CanvasElement[];
  createdAt: number;
  updatedAt: number;
}

export type SavedProject = EditorDocument;

export interface EditorSettings {
  tool: Tool;
  strokeColor: string;
  fillColor: string;
  recentColors: string[];
  brushSize: number;
  fillTolerance: number;
  showGrid: boolean;
  snapToGrid: boolean;
  gridSize: number;
  fontSize: number;
  fontFamily: string;
  bold: boolean;
  italic: boolean;
  textAlign: 'left' | 'center' | 'right';
  rightClickEraser: boolean;
  shortcuts: Record<string, Tool>;
  strokeDash: StrokeDash;
}
