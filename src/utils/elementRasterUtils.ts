import type Konva from 'konva';
import type { CanvasElement, ImageElement, ImageEraseStroke, Point } from '../types/editor';

const MAX_RASTER_SIDE = 4096;
const DEFAULT_PIXEL_RATIO = 2;

export interface RectLike {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RasterCapture extends RectLike {
  pixelRatio: number;
}

export interface CapturedRaster extends RectLike {
  src: string;
}

export function findElementNode(hitNode: Konva.Node | null, elementIds: ReadonlySet<string>): Konva.Node | null {
  let node = hitNode;
  while (node) {
    if (elementIds.has(node.id())) return node;
    node = node.parent;
  }
  return null;
}

export function getRasterCapture(bounds: RectLike): RasterCapture | null {
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite)) return null;
  const x = Math.floor(bounds.x);
  const y = Math.floor(bounds.y);
  const width = Math.ceil(bounds.x + bounds.width) - x;
  const height = Math.ceil(bounds.y + bounds.height) - y;
  if (width < 1 || height < 1) return null;
  const pixelRatio = Math.min(DEFAULT_PIXEL_RATIO, MAX_RASTER_SIDE / width, MAX_RASTER_SIDE / height);
  return { x, y, width, height, pixelRatio };
}

export function worldPointToImageLocal(element: ImageElement, point: Point): Point {
  const radians = -((element.rotation ?? 0) * Math.PI) / 180;
  const dx = point.x - element.x;
  const dy = point.y - element.y;
  return {
    x: dx * Math.cos(radians) - dy * Math.sin(radians),
    y: dx * Math.sin(radians) + dy * Math.cos(radians),
  };
}

export function captureElementRaster(node: Konva.Node): CapturedRaster | null {
  const capture = getRasterCapture(node.getClientRect());
  if (!capture) return null;
  const opacity = node.opacity();
  try {
    node.opacity(1);
    const src = node.toDataURL({ ...capture, mimeType: 'image/png' });
    return { src, x: capture.x, y: capture.y, width: capture.width, height: capture.height };
  } catch {
    return null;
  } finally {
    node.opacity(opacity);
  }
}

export function createRasterImageElement(
  source: CanvasElement,
  capture: CapturedRaster,
  firstStroke: ImageEraseStroke,
): ImageElement {
  return {
    id: source.id,
    layerId: source.layerId,
    type: 'image',
    src: capture.src,
    x: capture.x,
    y: capture.y,
    width: capture.width,
    height: capture.height,
    rotation: 0,
    opacity: source.opacity,
    comment: source.comment,
    erasures: [firstStroke],
  };
}
