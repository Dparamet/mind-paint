interface Point {
  x: number;
  y: number;
}

const DEFAULT_WIDTH = 260;
const DEFAULT_HEIGHT = 72;
const MIN_WIDTH = 80;
const MIN_HEIGHT = 36;
const DRAG_THRESHOLD = 4;

export function normalizeTextBox(start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (Math.hypot(dx, dy) < DRAG_THRESHOLD) {
    return { x: start.x, y: start.y, width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };
  }

  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.max(MIN_WIDTH, Math.abs(dx)),
    height: Math.max(MIN_HEIGHT, Math.abs(dy)),
  };
}
