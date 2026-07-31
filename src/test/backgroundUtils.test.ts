import { describe, expect, it } from 'vitest';
import { getCanvasBackgroundFill } from '../utils/backgroundUtils';

describe('canvas background fill', () => {
  it('maps every project mode to its exact stage fill', () => {
    expect(getCanvasBackgroundFill('normal')).toBe('#fffaf0');
    expect(getCanvasBackgroundFill('transparent')).toBe('#00000000');
    expect(getCanvasBackgroundFill('greenScreen')).toBe('#00FF00');
  });
});
