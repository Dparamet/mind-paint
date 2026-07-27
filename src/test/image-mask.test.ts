import { describe, expect, it } from 'vitest';
import { appendErasePoint, normalizeErasePoint } from '../utils/imageMaskUtils';

describe('image mask coordinates', () => {
  it('normalizes and clamps points to the image bounds', () => {
    expect(normalizeErasePoint({ x: 50, y: 25 }, 100, 50)).toEqual({ x: 0.5, y: 0.5 });
    expect(normalizeErasePoint({ x: -10, y: 80 }, 100, 50)).toEqual({ x: 0, y: 1 });
  });

  it('keeps a compact stroke by skipping points that are too close', () => {
    const stroke = { size: 0.1, points: [{ x: 0.25, y: 0.25 }] };
    expect(appendErasePoint(stroke, { x: 0.251, y: 0.251 })).toBe(stroke);
    expect(appendErasePoint(stroke, { x: 0.5, y: 0.5 }).points).toHaveLength(2);
  });
});
