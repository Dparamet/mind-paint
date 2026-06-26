import type { CanvasElement, StrokeDash } from '../types/editor';

export function getElementBounds(el: CanvasElement): { x: number; y: number; w: number; h: number } {
  switch (el.type) {
    case 'rect':
    case 'image':
    case 'sticky':
    case 'mindNode':
    case 'speech':
      return { x: el.x, y: el.y, w: el.width, h: el.height };
    case 'circle':
      return { x: el.x - el.radiusX, y: el.y - el.radiusY, w: el.radiusX * 2, h: el.radiusY * 2 };
    case 'text':
      return { x: el.x, y: el.y, w: el.width, h: el.fontSize * 2 };
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

export const DASH_MAP: Record<StrokeDash, number[]> = {
  solid: [],
  dashed: [12, 8],
  dotted: [2, 6],
};
