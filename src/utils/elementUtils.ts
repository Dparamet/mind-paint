import type { CanvasElement, StrokeDash } from '../types/editor';

export interface ElementOrigin {
  id: string;
  x: number;
  y: number;
}

export function getElementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  switch (el.type) {
    case 'rect':
    case 'image':
    case 'sticky':
    case 'mindNode':
    case 'speech':
      return { x: el.x, y: el.y, w: el.width || 1, h: el.height || 1 };
    case 'circle':
      return { x: el.x - el.radiusX, y: el.y - el.radiusY, w: el.radiusX * 2 || 1, h: el.radiusY * 2 || 1 };
    case 'text':
      return { x: el.x, y: el.y, w: el.width || 1, h: el.fontSize * 2 || 1 };
    case 'polygon':
      return { x: el.x - el.radius, y: el.y - el.radius, w: el.radius * 2 || 1, h: el.radius * 2 || 1 };
    case 'star':
      return { x: el.x - el.outerRadius, y: el.y - el.outerRadius, w: el.outerRadius * 2 || 1, h: el.outerRadius * 2 || 1 };
    case 'line':
    case 'arrow': {
      const xs = el.points.filter((_, i) => i % 2 === 0);
      const ys = el.points.filter((_, i) => i % 2 === 1);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return { x: minX, y: minY, w: Math.max(...xs) - minX || 1, h: Math.max(...ys) - minY || 1 };
    }
  }
}

export function pointInPolygon(px: number, py: number, pts: number[]) {
  const n = pts.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = pts[i * 2], yi = pts[i * 2 + 1];
    const xj = pts[j * 2], yj = pts[j * 2 + 1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function isElementInLasso(el: CanvasElement, pts: number[]) {
  const b = getElementBounds(el);
  return (
    [[b.x + b.w / 2, b.y + b.h / 2], [b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]] as [number, number][]
  ).some(([x, y]) => pointInPolygon(x, y, pts));
}

export function getElementsBounds(elements: CanvasElement[]): { x: number; y: number; w: number; h: number } | null {
  if (!elements.length) return null;
  const bounds = elements.map(getElementBounds);
  const x = Math.min(...bounds.map((bound) => bound.x));
  const y = Math.min(...bounds.map((bound) => bound.y));
  const right = Math.max(...bounds.map((bound) => bound.x + bound.w));
  const bottom = Math.max(...bounds.map((bound) => bound.y + bound.h));
  return { x, y, w: right - x, h: bottom - y };
}

export function moveElementOrigins(origins: ElementOrigin[], dx: number, dy: number): ElementOrigin[] {
  return origins.map((origin) => ({ ...origin, x: origin.x + dx, y: origin.y + dy }));
}

export const DASH_MAP: Record<StrokeDash, number[]> = {
  solid: [],
  dashed: [12, 8],
  dotted: [2, 6],
};
