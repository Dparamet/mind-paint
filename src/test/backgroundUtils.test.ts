import { describe, expect, it } from 'vitest';
import {
  getCanvasBackgroundFill,
  getExportBackground,
  withTemporaryBackground,
} from '../utils/backgroundUtils';

describe('canvas background fill', () => {
  it('uses theme canvas only in normal mode', () => {
    expect(getCanvasBackgroundFill('normal', '#273449')).toBe('#273449');
    expect(getCanvasBackgroundFill('transparent', '#273449')).toBe('#00000000');
    expect(getCanvasBackgroundFill('greenScreen', '#273449')).toBe('#00FF00');
  });
});

describe('export background fill', () => {
  it('uses alpha for transparent exports that support it', () => {
    expect(getExportBackground('transparent', 'image/png', false)).toBe('#00000000');
  });

  it('uses white for transparent exports that do not support alpha', () => {
    expect(getExportBackground('transparent', 'image/jpeg', false)).toBe('#FFFFFF');
  });

  it('preserves green screen in opaque exports', () => {
    expect(getExportBackground('greenScreen', 'image/jpeg', false)).toBe('#00FF00');
  });

  it('lets Transparent PNG force alpha without changing the project mode', () => {
    expect(getExportBackground('normal', 'image/png', true)).toBe('#00000000');
  });
});

describe('temporary export background', () => {
  it('restores the stage background when capture throws', () => {
    let fill = '#fffaf0';
    const node = {
      getAttr: () => fill,
      setAttr: (_key: string, value: string) => { fill = value; },
    };

    expect(() => withTemporaryBackground(node, '#00FF00', () => {
      throw new Error('capture');
    })).toThrow('capture');
    expect(fill).toBe('#fffaf0');
  });
});
