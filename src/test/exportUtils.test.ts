import { describe, it, expect, vi, beforeEach } from 'vitest';
import { downloadSvg, readJsonFile } from '../utils/exportUtils';

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

describe('downloadSvg', () => {
  it('creates an anchor with correct download filename', () => {
    const clicks: string[] = [];
    const anchor = { href: '', download: '', click: () => clicks.push(anchor.download) };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement);

    downloadSvg('data:image/png;base64,abc', 800, 600, 'test.svg');

    expect(anchor.download).toBe('test.svg');
    expect(clicks).toHaveLength(1);
  });

  it('sets anchor href to the object URL', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement);

    downloadSvg('data:image/png;base64,abc', 800, 600, 'out.svg');

    expect(anchor.href).toBe('blob:mock-url');
  });

  it('revokes the object URL after click', () => {
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement);

    downloadSvg('data:image/png;base64,abc', 400, 300, 'out.svg');

    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('wraps the dataUrl inside an SVG image tag with correct dimensions', () => {
    let capturedBlob: Blob | null = null;
    const OrigBlob = globalThis.Blob;
    vi.stubGlobal('Blob', class MockBlob extends OrigBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        capturedBlob = new OrigBlob(parts, opts);
      }
    });
    const anchor = { href: '', download: '', click: vi.fn() };
    vi.spyOn(document, 'createElement').mockReturnValueOnce(anchor as unknown as HTMLAnchorElement);

    downloadSvg('data:image/png;base64,XYZ', 1200, 900, 'board.svg');

    return capturedBlob!.text().then((text) => {
      expect(text).toContain('width="1200"');
      expect(text).toContain('height="900"');
      expect(text).toContain('href="data:image/png;base64,XYZ"');
      expect(text).toContain('<svg');
    });
  });
});

describe('readJsonFile', () => {
  it('defaults legacy project backgrounds to normal', async () => {
    const file = new File([
      JSON.stringify({
        id: 'legacy-project',
        name: 'Legacy project',
        width: 800,
        height: 600,
        layers: [{ id: 'layer-base', name: 'Layer 1', visible: true, locked: false }],
        elements: [],
      }),
    ], 'legacy.json', { type: 'application/json' });

    await expect(readJsonFile(file)).resolves.toMatchObject({ backgroundMode: 'normal' });
  });
});
