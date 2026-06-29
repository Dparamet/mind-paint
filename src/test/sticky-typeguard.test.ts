import { describe, it, expect } from 'vitest';
import { isStickyLike, STICKY_LIKE_TYPES } from '../types/editor';

describe('isStickyLike type guard', () => {
  it('returns true for sticky', () => {
    expect(isStickyLike('sticky')).toBe(true);
  });

  it('returns true for mindNode', () => {
    expect(isStickyLike('mindNode')).toBe(true);
  });

  it('returns true for speech', () => {
    expect(isStickyLike('speech')).toBe(true);
  });

  it('returns false for rect', () => {
    expect(isStickyLike('rect')).toBe(false);
  });

  it('returns false for text', () => {
    expect(isStickyLike('text')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isStickyLike('')).toBe(false);
  });

  it('STICKY_LIKE_TYPES contains exactly sticky, mindNode, speech', () => {
    expect([...STICKY_LIKE_TYPES].sort()).toEqual(['mindNode', 'speech', 'sticky']);
  });
});
