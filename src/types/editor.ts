export type Tool =
  | 'select'
  | 'pen'
  | 'pencil'
  | 'eraser'
  | 'rectangle'
  | 'circle'
  | 'line'
  | 'arrow'
  | 'sticky'
  | 'mindNode'
  | 'speech'
  | 'text'
  | 'fill';

export type ElementKind = 'line' | 'arrow' | 'rect' | 'circle' | 'text' | 'image' | 'sticky' | 'mindNode' | 'speech';

export interface Point {
  x: number;
  y: number;
}

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
}

export type CanvasElement =
  | LineElement
  | ArrowElement
  | RectElement
  | CircleElement
  | TextElement
  | ImageElement
  | StickyElement
  | MindNodeElement
  | SpeechElement;

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
}
