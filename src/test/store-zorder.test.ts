import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/useEditorStore';
import type { RectElement } from '../types/editor';

const BASE_LAYER = 'layer-base';

function makeRect(id: string, overrides: Partial<RectElement> = {}): RectElement {
  return {
    id,
    layerId: BASE_LAYER,
    type: 'rect',
    x: 0, y: 0,
    width: 100, height: 100,
    stroke: '#000000',
    fill: '#ffffff',
    strokeWidth: 2,
    ...overrides,
  };
}

beforeEach(() => {
  useEditorStore.setState({ elements: [], history: [], future: [], selectedElementId: null, selectedElementIds: [] });
});

describe('store — moveElementToFront', () => {
  it('moves element to last position (rendered on top)', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));
    s.addElement(makeRect('r3'));

    useEditorStore.getState().moveElementToFront('r1');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r2', 'r3', 'r1']);
  });

  it('already at front — no change in order', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));

    useEditorStore.getState().moveElementToFront('r2');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r1', 'r2']);
  });

  it('unknown id — does nothing', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));

    useEditorStore.getState().moveElementToFront('ghost');

    expect(useEditorStore.getState().elements).toHaveLength(1);
  });
});

describe('store — moveElementToBack', () => {
  it('moves element to first position (rendered at bottom)', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));
    s.addElement(makeRect('r3'));

    useEditorStore.getState().moveElementToBack('r3');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r3', 'r1', 'r2']);
  });
});

describe('store — moveElementForward', () => {
  it('swaps element with the next one', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));
    s.addElement(makeRect('r3'));

    useEditorStore.getState().moveElementForward('r1');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r2', 'r1', 'r3']);
  });

  it('already last — no change', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));

    useEditorStore.getState().moveElementForward('r2');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r1', 'r2']);
  });
});

describe('store — moveElementBackward', () => {
  it('swaps element with the previous one', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));
    s.addElement(makeRect('r3'));

    useEditorStore.getState().moveElementBackward('r3');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r1', 'r3', 'r2']);
  });

  it('already first — no change', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));

    useEditorStore.getState().moveElementBackward('r1');

    const ids = useEditorStore.getState().elements.map((e) => e.id);
    expect(ids).toEqual(['r1', 'r2']);
  });
});

describe('store — z-order undo', () => {
  it('moveElementToFront is undoable', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));

    useEditorStore.getState().moveElementToFront('r1');
    expect(useEditorStore.getState().elements.map((e) => e.id)).toEqual(['r2', 'r1']);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements.map((e) => e.id)).toEqual(['r1', 'r2']);
  });
});
