import { describe, expect, it, vi } from 'vitest';
import type { RectElement } from '../types/editor';
import {
  captureElementRaster,
  createRasterImageElement,
  findElementNode,
  getRasterCapture,
  worldPointToImageLocal,
} from '../utils/elementRasterUtils';

const rect: RectElement = {
  id: 'rect-1',
  layerId: 'layer-base',
  type: 'rect',
  x: 10,
  y: 20,
  width: 100,
  height: 60,
  rotation: 30,
  opacity: 0.6,
  fill: '#ffffff',
  stroke: '#111111',
  strokeWidth: 2,
};

describe('element raster conversion', () => {
  it('resolves the owning element node from a compound child hit', () => {
    const group = { id: () => 'sticky-1', parent: null };
    const child = { id: () => '', parent: group };
    expect(findElementNode(child as never, new Set(['sticky-1']))).toBe(group);
  });

  it('rounds capture bounds and caps oversized pixel ratios', () => {
    expect(getRasterCapture({ x: 10.2, y: 20.8, width: 100.1, height: 60.2 })).toEqual({
      x: 10,
      y: 20,
      width: 101,
      height: 61,
      pixelRatio: 2,
    });
    expect(getRasterCapture({ x: 0, y: 0, width: 5000, height: 1000 })?.pixelRatio).toBeLessThanOrEqual(4096 / 5000);
    expect(getRasterCapture({ x: 0, y: 0, width: 0, height: 10 })).toBeNull();
  });

  it('converts a rotated world point to image-local coordinates', () => {
    const image = {
      type: 'image' as const,
      id: 'i',
      layerId: 'l',
      src: 'x',
      x: 10,
      y: 20,
      width: 100,
      height: 50,
      rotation: 90,
    };
    const local = worldPointToImageLocal(image, { x: 10, y: 30 });
    expect(local.x).toBeCloseTo(10);
    expect(local.y).toBeCloseTo(0);
  });

  it('creates a same-id raster image with baked rotation and preserved metadata', () => {
    const image = createRasterImageElement(
      rect,
      { src: 'data:image/png;base64,test', x: 2, y: 3, width: 120, height: 90 },
      { size: 0.2, points: [{ x: 0.5, y: 0.5 }] },
    );
    expect(image).toMatchObject({
      id: 'rect-1',
      layerId: 'layer-base',
      type: 'image',
      x: 2,
      y: 3,
      width: 120,
      height: 90,
      rotation: 0,
      opacity: 0.6,
      src: 'data:image/png;base64,test',
    });
    expect(image.erasures).toHaveLength(1);
  });

  it('restores node opacity and returns null when capture fails', () => {
    let opacity = 0.6;
    const node = {
      getClientRect: () => ({ x: 2, y: 3, width: 120, height: 90 }),
      opacity: vi.fn((value?: number) => value === undefined ? opacity : (opacity = value)),
      toDataURL: vi.fn(() => { throw new Error('capture failed'); }),
    };
    expect(captureElementRaster(node as never)).toBeNull();
    expect(opacity).toBe(0.6);
  });
});
