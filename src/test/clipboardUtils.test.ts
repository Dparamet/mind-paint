import { describe, expect, it } from 'vitest';
import { fileToDataUrl } from '../utils/clipboardUtils';

describe('fileToDataUrl image validation', () => {
  it('rejects unsupported image formats', async () => {
    const file = new File(['<svg/>'], 'vector.svg', { type: 'image/svg+xml' });

    await expect(fileToDataUrl(file)).rejects.toThrow('Unsupported image format');
  });

  it('rejects images larger than 10 MB', async () => {
    const file = new File(['x'], 'large.png', { type: 'image/png' });
    Object.defineProperty(file, 'size', { value: 11 * 1024 * 1024 });

    await expect(fileToDataUrl(file)).rejects.toThrow('Image is too large');
  });
});
