import type { ElementKind } from '../types/editor';

export function shouldCommitInlineText(
  key: string,
  shiftKey: boolean,
  elementType: ElementKind,
) {
  return key === 'Enter' && !shiftKey && elementType === 'text';
}
