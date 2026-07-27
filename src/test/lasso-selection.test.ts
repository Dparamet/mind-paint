import { describe, it, expect } from 'vitest';
import { getElementsBounds, isElementInLasso, moveElementOrigins, pointInPolygon } from '../utils/elementUtils';
import type { CanvasElement } from '../types/editor';

const BASE = { id: 'x', layerId: 'l', stroke: '#000', fill: '#fff', strokeWidth: 1 };

// Square lasso: (0,0)→(100,0)→(100,100)→(0,100)
const SQUARE = [0, 0, 100, 0, 100, 100, 0, 100];

describe('pointInPolygon', () => {
  it('returns true for point inside square polygon', () => {
    expect(pointInPolygon(50, 50, SQUARE)).toBe(true);
  });

  it('returns false for point outside square polygon', () => {
    expect(pointInPolygon(150, 50, SQUARE)).toBe(false);
  });

  it('returns false for empty polygon', () => {
    expect(pointInPolygon(50, 50, [])).toBe(false);
  });

  it('handles non-convex (L-shaped) polygon', () => {
    // L shape: bottom-left concavity
    const lShape = [0, 0, 60, 0, 60, 40, 40, 40, 40, 100, 0, 100];
    expect(pointInPolygon(10, 50, lShape)).toBe(true);   // inside left arm
    expect(pointInPolygon(55, 70, lShape)).toBe(false);  // inside the cut-out
  });
});

describe('isElementInLasso', () => {
  it('returns true when element center is inside lasso', () => {
    const rect = { ...BASE, type: 'rect', x: 30, y: 30, width: 40, height: 40 } as CanvasElement;
    expect(isElementInLasso(rect, SQUARE)).toBe(true);
  });

  it('returns false when element is fully outside lasso', () => {
    const rect = { ...BASE, type: 'rect', x: 200, y: 200, width: 40, height: 40 } as CanvasElement;
    expect(isElementInLasso(rect, SQUARE)).toBe(false);
  });

  it('returns true when element partially overlaps lasso (corner inside)', () => {
    // Element mostly outside but top-left corner is inside the square
    const rect = { ...BASE, type: 'rect', x: 80, y: 80, width: 60, height: 60 } as CanvasElement;
    expect(isElementInLasso(rect, SQUARE)).toBe(true);
  });
});

describe('multi-selection movement', () => {
  it('returns the union bounds for selected elements', () => {
    const first = { ...BASE, id: 'a', type: 'rect', x: 10, y: 20, width: 30, height: 40 } as CanvasElement;
    const second = { ...BASE, id: 'b', type: 'rect', x: 80, y: 50, width: 20, height: 10 } as CanvasElement;

    expect(getElementsBounds([first, second])).toEqual({ x: 10, y: 20, w: 90, h: 40 });
  });

  it('returns null when the selection is empty', () => {
    expect(getElementsBounds([])).toBeNull();
  });

  it('moves every origin by the same delta without mutation', () => {
    const origins = [{ id: 'a', x: 1, y: 2 }, { id: 'b', x: -4, y: 8 }];

    expect(moveElementOrigins(origins, 10, -4)).toEqual([
      { id: 'a', x: 11, y: -2 },
      { id: 'b', x: 6, y: 4 },
    ]);
    expect(origins[0]).toEqual({ id: 'a', x: 1, y: 2 });
  });
});
