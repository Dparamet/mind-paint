import { describe, it, expect } from 'vitest';

// Extracted logic from App.tsx — regression test for the undo-blocked-by-input bug.
// Bug: `isTyping` was `tagName === 'INPUT'` which blocked Ctrl+Z on range/checkbox/number inputs.
// Fix: only block for text-entry inputs (text, number, email, password, search, url, tel).
function isTyping(target: Partial<HTMLElement & HTMLInputElement> | null): boolean {
  const inputType = (target as HTMLInputElement | null)?.type ?? '';
  return (
    target?.tagName === 'TEXTAREA' ||
    (target?.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'color', 'file'].includes(inputType))
  );
}

describe('isTyping — keyboard shortcut guard', () => {
  it('blocks shortcuts when text input is focused', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'text' })).toBe(true);
  });

  it('blocks shortcuts when number input is focused', () => {
    // font-size input — user may be mid-edit
    expect(isTyping({ tagName: 'INPUT', type: 'number' })).toBe(true);
  });

  it('blocks shortcuts when textarea is focused', () => {
    expect(isTyping({ tagName: 'TEXTAREA', type: '' })).toBe(true);
  });

  // --- regression cases (were incorrectly blocked before fix) ---

  it('does NOT block shortcuts on range input (brush slider)', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'range' })).toBe(false);
  });

  it('does NOT block shortcuts on checkbox (grid/snap toggle)', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'checkbox' })).toBe(false);
  });

  it('does NOT block shortcuts on color input', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'color' })).toBe(false);
  });

  it('does NOT block shortcuts on radio input', () => {
    expect(isTyping({ tagName: 'INPUT', type: 'radio' })).toBe(false);
  });

  it('does NOT block shortcuts when canvas (non-input) is focused', () => {
    expect(isTyping({ tagName: 'CANVAS', type: '' })).toBe(false);
  });

  it('does NOT block shortcuts when target is null', () => {
    expect(isTyping(null)).toBe(false);
  });
});
