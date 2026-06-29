import { describe, it, expect } from 'vitest';
import { getElementBounds, DASH_MAP } from '../utils/elementUtils';
import type { CanvasElement } from '../types/editor';

const BASE = { id: 'x', layerId: 'l', stroke: '#000', fill: '#fff', strokeWidth: 1 };

describe('getElementBounds — rect / image / sticky / mindNode / speech', () => {
  it('returns x, y, w, h directly from element', () => {
    const el = { ...BASE, type: 'rect', x: 10, y: 20, width: 80, height: 40 } as CanvasElement;
    expect(getElementBounds(el)).toEqual({ x: 10, y: 20, w: 80, h: 40 });
  });
});

describe('getElementBounds — circle', () => {
  it('returns bounding box from centre + radii', () => {
    const el = { ...BASE, type: 'circle', x: 50, y: 50, radiusX: 30, radiusY: 20 } as CanvasElement;
    expect(getElementBounds(el)).toEqual({ x: 20, y: 30, w: 60, h: 40 });
  });
});

describe('getElementBounds — text', () => {
  it('uses x/y and width + 2×fontSize as height estimate', () => {
    const el = { ...BASE, type: 'text', x: 5, y: 10, text: 'hi', width: 200, fontSize: 16, fontFamily: 'Inter' } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.x).toBe(5);
    expect(b.y).toBe(10);
    expect(b.w).toBe(200);
    expect(b.h).toBe(32); // fontSize * 2
  });
});

describe('getElementBounds — line', () => {
  it('returns min/max of all points as bounding box', () => {
    const el = { ...BASE, type: 'line', x: 0, y: 0, points: [0, 0, 100, 0, 50, 80] } as CanvasElement;
    expect(getElementBounds(el)).toEqual({ x: 0, y: 0, w: 100, h: 80 });
  });

  it('handles single-point degenerate line — non-zero w/h', () => {
    const el = { ...BASE, type: 'line', x: 0, y: 0, points: [20, 30, 20, 30] } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.w).toBeGreaterThanOrEqual(1);
    expect(b.h).toBeGreaterThanOrEqual(1);
  });
});

describe('getElementBounds — arrow', () => {
  it('same as line — uses point array', () => {
    const el = { ...BASE, type: 'arrow', x: 0, y: 0, points: [10, 20, 90, 60], pointerLength: 10, pointerWidth: 10 } as CanvasElement;
    expect(getElementBounds(el)).toEqual({ x: 10, y: 20, w: 80, h: 40 });
  });
});

describe('getElementBounds — zero-size guard', () => {
  it('rect with width=0 returns w >= 1', () => {
    const el = { ...BASE, type: 'rect', x: 0, y: 0, width: 0, height: 0 } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.w).toBeGreaterThanOrEqual(1);
    expect(b.h).toBeGreaterThanOrEqual(1);
  });

  it('circle with radiusX=0 returns w >= 1', () => {
    const el = { ...BASE, type: 'circle', x: 50, y: 50, radiusX: 0, radiusY: 0 } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.w).toBeGreaterThanOrEqual(1);
    expect(b.h).toBeGreaterThanOrEqual(1);
  });

  it('text with width=0 returns w >= 1', () => {
    const el = { ...BASE, type: 'text', x: 0, y: 0, text: '', width: 0, fontSize: 0, fontFamily: 'Inter' } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.w).toBeGreaterThanOrEqual(1);
    expect(b.h).toBeGreaterThanOrEqual(1);
  });

  it('sticky with zero size returns w/h >= 1', () => {
    const el = { ...BASE, type: 'sticky', x: 0, y: 0, width: 0, height: 0, text: '', fontSize: 14 } as CanvasElement;
    const b = getElementBounds(el);
    expect(b.w).toBeGreaterThanOrEqual(1);
    expect(b.h).toBeGreaterThanOrEqual(1);
  });
});

describe('DASH_MAP', () => {
  it('solid maps to empty array', () => {
    expect(DASH_MAP.solid).toEqual([]);
  });

  it('dashed maps to a two-value pattern', () => {
    expect(DASH_MAP.dashed).toHaveLength(2);
    expect(DASH_MAP.dashed[0]).toBeGreaterThan(DASH_MAP.dashed[1]); // gap < dash
  });

  it('dotted first value is very small (dot-like)', () => {
    expect(DASH_MAP.dotted[0]).toBeLessThanOrEqual(4);
  });
});
