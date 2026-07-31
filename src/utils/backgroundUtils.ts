import type { BackgroundMode } from '../types/editor';

export const CANVAS_BACKGROUND_ID = 'canvas-background';

export function getCanvasBackgroundFill(mode: BackgroundMode): string {
  if (mode === 'transparent') return '#00000000';
  if (mode === 'greenScreen') return '#00FF00';
  return '#fffaf0';
}

type ExportMimeType = 'image/png' | 'image/jpeg';

interface BackgroundNode {
  getAttr: (key: string) => string;
  setAttr: (key: string, value: string) => unknown;
}

export function getExportBackground(
  mode: BackgroundMode,
  mimeType: ExportMimeType,
  forceTransparent = false,
): string {
  if (forceTransparent) return '#00000000';
  if (mode === 'greenScreen') return '#00FF00';
  if (mode === 'transparent') return mimeType === 'image/png' ? '#00000000' : '#FFFFFF';
  return '#fffaf0';
}

export function withTemporaryBackground<T>(
  node: BackgroundNode | null | undefined,
  fill: string,
  capture: () => T,
): T {
  if (!node) return capture();
  const previous = node.getAttr('fill');
  node.setAttr('fill', fill);
  try {
    return capture();
  } finally {
    node.setAttr('fill', previous);
  }
}
