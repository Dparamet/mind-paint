import { describe, it, expect, beforeEach } from 'vitest';
import { useEditorStore } from '../store/useEditorStore';
import type { ImageElement, RectElement, SavedProject } from '../types/editor';

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
  // Reset to clean state before each test
  useEditorStore.setState({
    elements: [],
    history: [],
    future: [],
    selectedElementId: null,
    selectedElementIds: [],
  });
});

describe('store — undo', () => {
  it('undo removes last added element', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    expect(useEditorStore.getState().elements).toHaveLength(1);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(0);
  });

  it('undo with empty history does nothing', () => {
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(0);
  });

  it('multiple undos step back through history', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.addElement(makeRect('r2'));
    expect(useEditorStore.getState().elements).toHaveLength(2);

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(useEditorStore.getState().elements[0].id).toBe('r1');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(0);
  });

  it('undo clears selection', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    s.setSelectedElementId('r1');
    expect(useEditorStore.getState().selectedElementId).toBe('r1');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().selectedElementId).toBeNull();
    expect(useEditorStore.getState().selectedElementIds).toHaveLength(0);
  });
});

describe('store — redo', () => {
  it('redo re-applies undone element', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements).toHaveLength(0);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().elements).toHaveLength(1);
    expect(useEditorStore.getState().elements[0].id).toBe('r1');
  });

  it('redo with empty future does nothing', () => {
    useEditorStore.getState().redo();
    expect(useEditorStore.getState().elements).toHaveLength(0);
  });

  it('new action clears redo future', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    useEditorStore.getState().undo();           // r1 in future
    s.addElement(makeRect('r2'));               // new action
    expect(useEditorStore.getState().future).toHaveLength(0);

    useEditorStore.getState().redo();           // nothing to redo
    expect(useEditorStore.getState().elements.map(e => e.id)).toEqual(['r2']);
  });
});

describe('store — updateElement undo', () => {
  it('undo reverts element property change', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1', { fill: '#ff0000' }));

    useEditorStore.getState().updateElement('r1', { fill: '#00ff00' });
    expect(useEditorStore.getState().elements[0].fill).toBe('#00ff00');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().elements[0].fill).toBe('#ff0000');
  });

  it('updateElement with trackHistory=false does not push undo entry', () => {
    const s = useEditorStore.getState();
    s.addElement(makeRect('r1'));
    const historyLenAfterAdd = useEditorStore.getState().history.length;

    useEditorStore.getState().updateElement('r1', { fill: '#123456' }, false);
    expect(useEditorStore.getState().history.length).toBe(historyLenAfterAdd);
  });

  it('undoes and serializes non-destructive image erasures', () => {
    const image: ImageElement = {
      id: 'image-1',
      layerId: BASE_LAYER,
      type: 'image',
      src: 'data:image/png;base64,test',
      x: 0,
      y: 0,
      width: 100,
      height: 80,
    };
    useEditorStore.getState().addElement(image);
    const erasures = [{ size: 0.1, points: [{ x: 0.5, y: 0.5 }] }];

    useEditorStore.getState().updateElement(image.id, { erasures });
    expect(useEditorStore.getState().toProject().elements[0]).toMatchObject({ erasures });

    useEditorStore.getState().undo();
    expect((useEditorStore.getState().elements[0] as ImageElement).erasures).toBeUndefined();

    useEditorStore.getState().redo();
    expect((useEditorStore.getState().elements[0] as ImageElement).erasures).toEqual(erasures);
  });
});

describe('store — project background', () => {
  it('persists the selected project background mode', () => {
    useEditorStore.getState().setBackgroundMode('greenScreen');

    expect(useEditorStore.getState().backgroundMode).toBe('greenScreen');
    expect(useEditorStore.getState().toProject().backgroundMode).toBe('greenScreen');
    expect(useEditorStore.getState().saveStatus).toBe('dirty');
  });

  it('defaults older projects to a normal background', () => {
    const legacy = { ...useEditorStore.getState().toProject() } as Record<string, unknown>;
    delete legacy.backgroundMode;

    useEditorStore.getState().loadProject(legacy as unknown as SavedProject);

    expect(useEditorStore.getState().backgroundMode).toBe('normal');
  });
});

describe('store — line style settings', () => {
  it('persists the selected line endpoint style', () => {
    useEditorStore.getState().setLineHead('both');

    expect(useEditorStore.getState().lineHead).toBe('both');
    expect(JSON.parse(localStorage.getItem('mind-paint-settings') ?? '{}').lineHead).toBe('both');
  });
});
