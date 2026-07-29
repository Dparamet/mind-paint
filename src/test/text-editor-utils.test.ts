import { describe, expect, it } from 'vitest';
import { shouldCommitInlineText } from '../utils/textEditorUtils';

describe('shouldCommitInlineText', () => {
  it('commits a plain text element with Enter', () => {
    expect(shouldCommitInlineText('Enter', false, 'text')).toBe(true);
  });

  it('keeps editing when Shift+Enter inserts a line break', () => {
    expect(shouldCommitInlineText('Enter', true, 'text')).toBe(false);
  });

  it('keeps Enter available for multiline sticky-like elements', () => {
    expect(shouldCommitInlineText('Enter', false, 'sticky')).toBe(false);
    expect(shouldCommitInlineText('Enter', false, 'mindNode')).toBe(false);
    expect(shouldCommitInlineText('Enter', false, 'speech')).toBe(false);
  });
});
