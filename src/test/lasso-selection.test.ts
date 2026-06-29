import { describe, it, expect } from 'vitest';
import { pointInPolygon, isElementInLasso } from '../utils/elementUtils';
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
