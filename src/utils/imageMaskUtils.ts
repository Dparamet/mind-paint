import type { ImageEraseStroke } from '../types/editor';

type Point = { x: number; y: number };

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

export function normalizeErasePoint(point: Point, width: number, height: number): Point {
  return {
    x: clamp01(point.x / Math.max(1, width)),
    y: clamp01(point.y / Math.max(1, height)),
  };
}

export function appendErasePoint(
  stroke: ImageEraseStroke,
  point: Point,
  minDistance = 0.003,
): ImageEraseStroke {
  const previous = stroke.points.at(-1);
  if (previous && Math.hypot(point.x - previous.x, point.y - previous.y) < minDistance) {
    return stroke;
  }
  return { ...stroke, points: [...stroke.points, point] };
}

export function renderMaskedImage(
  image: CanvasImageSource,
  width: number,
  height: number,
  erasures: ImageEraseStroke[] = [],
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) return canvas;

  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  context.save();
  context.globalCompositeOperation = 'destination-out';
  context.lineCap = 'round';
  context.lineJoin = 'round';

  for (const stroke of erasures) {
    if (!stroke.points.length) continue;
    context.lineWidth = Math.max(1, stroke.size * Math.min(canvas.width, canvas.height));
    context.beginPath();
    const first = stroke.points[0];
    context.moveTo(first.x * canvas.width, first.y * canvas.height);
    if (stroke.points.length === 1) {
      context.lineTo(first.x * canvas.width + 0.01, first.y * canvas.height);
    } else {
      for (const point of stroke.points.slice(1)) {
        context.lineTo(point.x * canvas.width, point.y * canvas.height);
      }
    }
    context.stroke();
  }

  context.restore();
  return canvas;
}
