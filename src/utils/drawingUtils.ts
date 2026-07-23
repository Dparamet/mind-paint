export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

interface Point {
  x: number;
  y: number;
}

const EPSILON = 1e-6;

function pointAt(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function samePoint(a: Point, b: Point) {
  return Math.abs(a.x - b.x) < EPSILON && Math.abs(a.y - b.y) < EPSILON;
}

function distanceSquared(a: Point, b: Point) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

function distanceSquaredToSegment(point: Point, a: Point, b: Point) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return distanceSquared(point, a);
  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSquared));
  return distanceSquared(point, pointAt(a, b, t));
}

function circleIntersections(a: Point, b: Point, center: Point, radius: number) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const fx = a.x - center.x;
  const fy = a.y - center.y;
  const aa = dx * dx + dy * dy;
  if (aa === 0) return [];

  const bb = 2 * (fx * dx + fy * dy);
  const cc = fx * fx + fy * fy - radius * radius;
  const discriminant = bb * bb - 4 * aa * cc;
  if (discriminant < 0) return [];

  const root = Math.sqrt(discriminant);
  return [(-bb - root) / (2 * aa), (-bb + root) / (2 * aa)]
    .filter((t) => t > EPSILON && t < 1 - EPSILON)
    .sort((x, y) => x - y);
}

/**
 * Removes only the part of a freehand polyline covered by an eraser circle.
 * The returned pieces can be rendered as separate line elements, preserving
 * the gap instead of reconnecting the surviving points.
 */
export function erasePolyline(points: number[], center: Point, radius: number): number[][] {
  if (points.length < 4 || radius <= 0) return points.length >= 4 ? [points.slice()] : [];

  const pieces: number[][] = [];
  let current: number[] | null = null;

  const flush = () => {
    if (current && current.length >= 4) pieces.push(current);
    current = null;
  };

  for (let i = 0; i + 3 < points.length; i += 2) {
    const a = { x: points[i], y: points[i + 1] };
    const b = { x: points[i + 2], y: points[i + 3] };
    const breaks = [0, ...circleIntersections(a, b, center, radius), 1];
    let emittedOutside = false;

    for (let j = 0; j + 1 < breaks.length; j += 1) {
      const startT = breaks[j];
      const endT = breaks[j + 1];
      if (endT - startT <= EPSILON) continue;
      const midpoint = pointAt(a, b, (startT + endT) / 2);
      const inside = distanceSquared(midpoint, center) <= radius * radius;
      if (inside) {
        flush();
        continue;
      }

      const start = pointAt(a, b, startT);
      const end = pointAt(a, b, endT);
      if (!current || !samePoint({ x: current[current.length - 2], y: current[current.length - 1] }, start)) {
        flush();
        current = [start.x, start.y];
      }
      if (!samePoint({ x: current[current.length - 2], y: current[current.length - 1] }, end)) {
        current.push(end.x, end.y);
      }
      emittedOutside = true;
    }

    if (!emittedOutside) flush();
  }

  flush();
  return pieces;
}

function colorDifference(data: Uint8ClampedArray, index: number, target: RgbColor) {
  return Math.abs(data[index] - target.r) + Math.abs(data[index + 1] - target.g) + Math.abs(data[index + 2] - target.b);
}

/**
 * Returns a transparent RGBA mask containing only the contiguous pixels that
 * should be painted. Existing pixels remain untouched so the mask can be
 * composited over an already accumulated fill layer.
 */
export function floodFillMask(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  fill: RgbColor,
  tolerance = 32,
): Uint8ClampedArray {
  const mask = new Uint8ClampedArray(width * height * 4);
  if (width <= 0 || height <= 0 || source.length < width * height * 4) return mask;
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return mask;

  const start = (startY * width + startX) * 4;
  const target = { r: source[start], g: source[start + 1], b: source[start + 2] };
  if (target.r === fill.r && target.g === fill.g && target.b === fill.b) return mask;

  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  const startIndex = startY * width + startX;
  queue[tail++] = startIndex;
  visited[startIndex] = 1;

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const index = pixel * 4;
    if (colorDifference(source, index, target) > tolerance) continue;

    mask[index] = fill.r;
    mask[index + 1] = fill.g;
    mask[index + 2] = fill.b;
    mask[index + 3] = 255;

    const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
    for (const next of neighbors) {
      if (next < 0 || next >= width * height || visited[next]) continue;
      if (Math.abs((next % width) - x) > 1) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }

  return mask;
}

export function removeContiguousBackground(
  source: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  startY: number,
  tolerance = 32,
) {
  const pixels = new Uint8ClampedArray(source);
  if (width <= 0 || height <= 0 || source.length < width * height * 4) return { pixels, removed: 0 };
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return { pixels, removed: 0 };

  const start = (startY * width + startX) * 4;
  const target = { r: source[start], g: source[start + 1], b: source[start + 2] };
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0;
  let tail = 0;
  let removed = 0;
  const startIndex = startY * width + startX;
  queue[tail++] = startIndex;
  visited[startIndex] = 1;

  while (head < tail) {
    const pixel = queue[head++];
    const x = pixel % width;
    const index = pixel * 4;
    if (source[index + 3] === 0 || colorDifference(source, index, target) > tolerance) continue;

    pixels[index + 3] = 0;
    removed += 1;

    const neighbors = [pixel - 1, pixel + 1, pixel - width, pixel + width];
    for (const next of neighbors) {
      if (next < 0 || next >= width * height || visited[next]) continue;
      if (Math.abs((next % width) - x) > 1) continue;
      visited[next] = 1;
      queue[tail++] = next;
    }
  }

  return { pixels, removed };
}
