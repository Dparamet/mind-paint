import type { BackgroundMode } from '../types/editor';

export const CANVAS_BACKGROUND_ID = 'canvas-background';

export function getCanvasBackgroundFill(mode: BackgroundMode): string {
  if (mode === 'transparent') return '#00000000';
  if (mode === 'greenScreen') return '#00FF00';
  return '#fffaf0';
}
