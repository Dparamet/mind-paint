import { describe, expect, it } from 'vitest';
import { normalizeTextBox } from '../utils/textBoxUtils';

describe('normalizeTextBox', () => {
  it('uses dragged bounds', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 220, y: 110 })).toEqual({
      x: 20,
      y: 30,
      width: 200,
      height: 80,
    });
  });

  it('normalizes reverse drags', () => {
    expect(normalizeTextBox({ x: 220, y: 110 }, { x: 20, y: 30 })).toEqual({
      x: 20,
      y: 30,
      width: 200,
      height: 80,
    });
  });

  it('uses the default box for a click', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 22, y: 31 })).toEqual({
      x: 20,
      y: 30,
      width: 260,
      height: 72,
    });
  });

  it('enforces minimum dimensions for a meaningful drag', () => {
    expect(normalizeTextBox({ x: 20, y: 30 }, { x: 70, y: 50 })).toEqual({
      x: 20,
      y: 30,
      width: 80,
      height: 36,
    });
  });
});
