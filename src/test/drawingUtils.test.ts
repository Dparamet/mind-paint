import { describe, expect, it } from 'vitest';
import { erasePolyline, floodFillMask, removeContiguousBackground } from '../utils/drawingUtils';

describe('erasePolyline', () => {
  it('cuts a small section out of a stroke instead of deleting the whole line', () => {
    const pieces = erasePolyline([0, 0, 10, 0, 20, 0], { x: 10, y: 0 }, 2);

    expect(pieces).toHaveLength(2);
    expect(pieces[0][0]).toBe(0);
    expect(pieces[0][pieces[0].length - 2]).toBeCloseTo(8);
    expect(pieces[1][0]).toBeCloseTo(12);
    expect(pieces[1][pieces[1].length - 2]).toBe(20);
  });

  it('returns the original stroke when the eraser is away from it', () => {
    expect(erasePolyline([0, 0, 10, 0, 20, 0], { x: 10, y: 8 }, 2)).toEqual([[0, 0, 10, 0, 20, 0]]);
  });

  it('removes a stroke only when the eraser covers it completely', () => {
    expect(erasePolyline([0, 0, 4, 0], { x: 2, y: 0 }, 4)).toEqual([]);
  });
});

describe('floodFillMask', () => {
  it('fills only the contiguous region inside a border', () => {
    const width = 5;
    const height = 5;
    const source = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        const border = x === 0 || x === width - 1 || y === 0 || y === height - 1;
        source[i] = border ? 0 : 255;
        source[i + 1] = border ? 0 : 255;
        source[i + 2] = border ? 0 : 255;
        source[i + 3] = 255;
      }
    }

    const mask = floodFillMask(source, width, height, 2, 2, { r: 255, g: 0, b: 0 });
    const painted = Array.from(mask).filter((value, index) => index % 4 === 3 && value === 255);

    expect(painted).toHaveLength(9);
    expect(mask[2 * width * 4 + 2 * 4]).toBe(255);
    expect(mask[0]).toBe(0);
  });

  it('does not create a new mask when the target already has the fill color', () => {
    const source = new Uint8ClampedArray(4 * 4).fill(255);
    expect(floodFillMask(source, 1, 1, 0, 0, { r: 255, g: 255, b: 255 })).toEqual(new Uint8ClampedArray(4));
  });
});

describe('removeContiguousBackground', () => {
  it('makes only the clicked contiguous background transparent', () => {
    const width = 4;
    const height = 3;
    const source = new Uint8ClampedArray(width * height * 4);
    for (let pixel = 0; pixel < width * height; pixel += 1) {
      const i = pixel * 4;
      source[i] = 255;
      source[i + 1] = 255;
      source[i + 2] = 255;
      source[i + 3] = 255;
    }

    const island = (1 * width + 1) * 4;
    source[island] = 20;
    source[island + 1] = 20;
    source[island + 2] = 20;

    const { pixels, removed } = removeContiguousBackground(source, width, height, 0, 0, 12);

    expect(removed).toBe(11);
    expect(pixels[3]).toBe(0);
    expect(pixels[island + 3]).toBe(255);
    expect(source[3]).toBe(255);
  });

  it('returns unchanged pixels when the click is outside the image', () => {
    const source = new Uint8ClampedArray([255, 255, 255, 255]);
    expect(removeContiguousBackground(source, 1, 1, 2, 0).pixels).toEqual(source);
    expect(removeContiguousBackground(source, 1, 1, 2, 0).removed).toBe(0);
  });
});
