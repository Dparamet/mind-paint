import { create } from 'zustand';
import type {
  CanvasElement,
  EditorDocument,
  EditorSettings,
  Layer,
  SavedProject,
  StrokeDash,
  Tool,
} from '../types/editor';
import { saveProject } from '../db/indexedDb';

const settingsKey = 'mind-paint-settings';
const lastProjectKey = 'mind-paint-last-project-id';
const defaultLayerId = 'layer-base';

const defaultSettings: EditorSettings = {
  tool: 'select',
  strokeColor: '#17202a',
  fillColor: '#f4b860',
  recentColors: [],
  brushSize: 6,
  fillTolerance: 32,
  showGrid: true,
  snapToGrid: false,
  gridSize: 24,
  fontSize: 24,
  fontFamily: 'Inter, sans-serif',
  bold: false,
  italic: false,
  textAlign: 'left',
  rightClickEraser: true,
  strokeDash: 'solid',
  shortcuts: {
    v: 'select',
    l: 'lasso',
    p: 'pen',
    e: 'eraser',
    r: 'rectangle',
    c: 'circle',
    t: 'text',
    f: 'fill',
    a: 'arrow',
  },
};

function loadSettings(): EditorSettings {
  try {
    const raw = localStorage.getItem(settingsKey);
    return raw ? { ...defaultSettings, ...JSON.parse(raw) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function createDocument(): EditorDocument {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name: 'Untitled mind board',
    width: 1600,
    height: 1000,
    layers: [{ id: defaultLayerId, name: 'Layer 1', visible: true, locked: false }],
    elements: [],
    createdAt: now,
    updatedAt: now,
  };
}

type Snapshot = Pick<EditorDocument, 'layers' | 'elements'>;
type SaveStatus = 'saved' | 'saving' | 'dirty' | 'error';

interface EditorStore extends EditorDocument, EditorSettings {
  activeLayerId: string;
  selectedElementId: string | null;
  selectedElementIds: string[];
  history: Snapshot[];
  future: Snapshot[];
  isSaving: boolean;
  saveStatus: SaveStatus;
  setTool: (tool: Tool) => void;
  setStrokeColor: (color: string) => void;
  setFillColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setFillTolerance: (tolerance: number) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;
  setFontSize: (size: number) => void;
  setFontFamily: (family: string) => void;
  setBold: (bold: boolean) => void;
  setItalic: (italic: boolean) => void;
  setTextAlign: (align: EditorSettings['textAlign']) => void;
  setRightClickEraser: (enabled: boolean) => void;
  setStrokeDash: (dash: StrokeDash) => void;
  setShortcut: (tool: Tool, key: string) => void;
  setName: (name: string) => void;
  setSelectedElementId: (id: string | null) => void;
  setSelectedElementIds: (ids: string[]) => void;
  toggleSelectedElementId: (id: string) => void;
  addElement: (element: CanvasElement) => void;
  prependElement: (element: CanvasElement) => void;
  updateElement: (id: string, patch: Partial<CanvasElement>, trackHistory?: boolean) => void;
  deleteElement: (id: string) => void;
  deleteSelectedElements: () => void;
  clearCanvas: () => void;
  duplicateSelectedElements: () => void;
  moveElementForward: (id: string) => void;
  moveElementBackward: (id: string) => void;
  moveElementToFront: (id: string) => void;
  moveElementToBack: (id: string) => void;
  addLayer: () => void;
  renameLayer: (id: string, name: string) => void;
  deleteLayer: (id: string) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  moveLayer: (id: string, direction: 'up' | 'down') => void;
  setActiveLayerId: (id: string) => void;
  undo: () => void;
  redo: () => void;
  newProject: () => void;
  loadProject: (project: SavedProject) => void;
  saveCurrentProject: () => Promise<void>;
  toProject: () => SavedProject;
}

function persistSettings(settings: EditorSettings) {
  localStorage.setItem(settingsKey, JSON.stringify(settings));
}

// ponytail: dragging the native color input commits intermediate hexes here; dedupe + cap keeps it self-cleaning. Debounce on commit if it ever feels noisy.
function pushRecent(list: string[], color: string) {
  return [color, ...list.filter((existing) => existing.toLowerCase() !== color.toLowerCase())].slice(0, 12);
}

function pickSettings(state: EditorSettings): EditorSettings {
  return {
    tool: state.tool,
    strokeColor: state.strokeColor,
    fillColor: state.fillColor,
    recentColors: state.recentColors,
    brushSize: state.brushSize,
    fillTolerance: state.fillTolerance,
    showGrid: state.showGrid,
    snapToGrid: state.snapToGrid,
    gridSize: state.gridSize,
    fontSize: state.fontSize,
    fontFamily: state.fontFamily,
    bold: state.bold,
    italic: state.italic,
    textAlign: state.textAlign,
    rightClickEraser: state.rightClickEraser,
    strokeDash: state.strokeDash,
    shortcuts: state.shortcuts,
  };
}

// Invariant: layers/elements are immutable — every mutation replaces the array,
// so snapshots are plain references (no structuredClone) and equality is identity.
function snapshot(state: Pick<EditorStore, 'layers' | 'elements'>): Snapshot {
  return { layers: state.layers, elements: state.elements };
}

function snapshotsEqual(a: Snapshot, b: Snapshot) {
  return a.layers === b.layers && a.elements === b.elements;
}

// Single writer for selection state so selectedElementId can never desync from the array
function selection(ids: string[]) {
  return { selectedElementIds: ids, selectedElementId: ids[0] ?? null };
}

function withHistory(state: EditorStore) {
  const current = snapshot(state);
  const previous = state.history.at(-1);
  const history = previous && snapshotsEqual(previous, current) ? state.history : [...state.history.slice(-39), current];
  return {
    history,
    future: [],
    updatedAt: Date.now(),
    saveStatus: 'dirty' as SaveStatus,
  };
}

const initialDocument = createDocument();

export const useEditorStore = create<EditorStore>((set, get) => ({
  ...initialDocument,
  ...loadSettings(),
  activeLayerId: defaultLayerId,
  selectedElementId: null,
  selectedElementIds: [],
  history: [],
  future: [],
  isSaving: false,
  saveStatus: 'dirty',

  setTool: (tool) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), tool });
      return { tool };
    }),
  setStrokeColor: (strokeColor) =>
    set((state) => {
      const recentColors = pushRecent(state.recentColors, strokeColor);
      persistSettings({ ...pickSettings(state), strokeColor, recentColors });
      return { strokeColor, recentColors };
    }),
  setFillColor: (fillColor) =>
    set((state) => {
      const recentColors = pushRecent(state.recentColors, fillColor);
      persistSettings({ ...pickSettings(state), fillColor, recentColors });
      return { fillColor, recentColors };
    }),
  setBrushSize: (brushSize) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), brushSize });
      return { brushSize };
    }),
  setFillTolerance: (fillTolerance) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), fillTolerance });
      return { fillTolerance };
    }),
  setShowGrid: (showGrid) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), showGrid });
      return { showGrid };
    }),
  setSnapToGrid: (snapToGrid) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), snapToGrid });
      return { snapToGrid };
    }),
  setGridSize: (gridSize) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), gridSize });
      return { gridSize };
    }),
  setFontSize: (fontSize) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), fontSize });
      return { fontSize };
    }),
  setFontFamily: (fontFamily) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), fontFamily });
      return { fontFamily };
    }),
  setBold: (bold) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), bold });
      return { bold };
    }),
  setItalic: (italic) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), italic });
      return { italic };
    }),
  setTextAlign: (textAlign) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), textAlign });
      return { textAlign };
    }),
  setRightClickEraser: (rightClickEraser) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), rightClickEraser });
      return { rightClickEraser };
    }),
  setStrokeDash: (strokeDash) =>
    set((state) => {
      persistSettings({ ...pickSettings(state), strokeDash });
      return { strokeDash };
    }),
  setShortcut: (tool, key) =>
    set((state) => {
      const normalized = key.trim().toLowerCase();
      const shortcuts = Object.fromEntries(
        Object.entries(state.shortcuts).filter(([, mappedTool]) => mappedTool !== tool),
      );
      if (normalized) shortcuts[normalized] = tool;
      const settings = { ...pickSettings(state), shortcuts };
      persistSettings(settings);
      return { shortcuts };
    }),
  setName: (name) => set({ name, updatedAt: Date.now(), saveStatus: 'dirty' }),
  setSelectedElementId: (id) => set(selection(id ? [id] : [])),
  setSelectedElementIds: (ids) => set(selection(ids)),
  toggleSelectedElementId: (id) =>
    set((state) =>
      selection(
        state.selectedElementIds.includes(id)
          ? state.selectedElementIds.filter((selectedId) => selectedId !== id)
          : [...state.selectedElementIds, id],
      ),
    ),

  addElement: (element) => set((state) => ({ ...withHistory(state), elements: [...state.elements, element] })),
  prependElement: (element) => set((state) => ({ ...withHistory(state), elements: [element, ...state.elements] })),
  updateElement: (id, patch, trackHistory = true) =>
    set((state) => ({
      ...(trackHistory ? withHistory(state) : { updatedAt: Date.now(), saveStatus: 'dirty' as SaveStatus }),
      elements: state.elements.map((element) =>
        element.id === id ? ({ ...element, ...patch } as CanvasElement) : element,
      ),
    })),
  deleteElement: (id) =>
    set((state) => ({
      ...withHistory(state),
      elements: state.elements.filter((element) => element.id !== id),
      ...selection(state.selectedElementIds.filter((selectedId) => selectedId !== id)),
    })),
  deleteSelectedElements: () =>
    set((state) => {
      if (!state.selectedElementIds.length) return {};
      const selected = new Set(state.selectedElementIds);
      return {
        ...withHistory(state),
        elements: state.elements.filter((element) => !selected.has(element.id)),
        ...selection([]),
      };
    }),
  clearCanvas: () =>
    set((state) => ({
      ...withHistory(state),
      layers: [{ id: defaultLayerId, name: 'Layer 1', visible: true, locked: false }],
      elements: [],
      activeLayerId: defaultLayerId,
      ...selection([]),
    })),
  duplicateSelectedElements: () =>
    set((state) => {
      if (!state.selectedElementIds.length) return {};
      const selected = new Set(state.selectedElementIds);
      const copies = state.elements
        .filter((element) => selected.has(element.id))
        .map((element) => ({
          ...structuredClone(element),
          id: crypto.randomUUID(),
          x: element.x + 32,
          y: element.y + 32,
        }) as CanvasElement);
      return {
        ...withHistory(state),
        elements: [...state.elements, ...copies],
        ...selection(copies.map((copy) => copy.id)),
      };
    }),
  moveElementForward: (id) =>
    set((state) => {
      const idx = state.elements.findIndex((e) => e.id === id);
      if (idx < 0 || idx >= state.elements.length - 1) return {};
      const els = [...state.elements];
      [els[idx], els[idx + 1]] = [els[idx + 1], els[idx]];
      return { ...withHistory(state), elements: els };
    }),
  moveElementBackward: (id) =>
    set((state) => {
      const idx = state.elements.findIndex((e) => e.id === id);
      if (idx <= 0) return {};
      const els = [...state.elements];
      [els[idx - 1], els[idx]] = [els[idx], els[idx - 1]];
      return { ...withHistory(state), elements: els };
    }),
  moveElementToFront: (id) =>
    set((state) => {
      const el = state.elements.find((e) => e.id === id);
      if (!el) return {};
      return { ...withHistory(state), elements: [...state.elements.filter((e) => e.id !== id), el] };
    }),
  moveElementToBack: (id) =>
    set((state) => {
      const el = state.elements.find((e) => e.id === id);
      if (!el) return {};
      return { ...withHistory(state), elements: [el, ...state.elements.filter((e) => e.id !== id)] };
    }),

  addLayer: () =>
    set((state) => {
      const layer: Layer = {
        id: crypto.randomUUID(),
        name: `Layer ${state.layers.length + 1}`,
        visible: true,
        locked: false,
      };
      return { ...withHistory(state), layers: [...state.layers, layer], activeLayerId: layer.id };
    }),
  renameLayer: (id, name) =>
    set((state) => ({ ...withHistory(state), layers: state.layers.map((layer) => (layer.id === id ? { ...layer, name } : layer)) })),
  deleteLayer: (id) =>
    set((state) => {
      if (state.layers.length === 1) return {};
      const layers = state.layers.filter((layer) => layer.id !== id);
      return {
        ...withHistory(state),
        layers,
        elements: state.elements.filter((element) => element.layerId !== id),
        activeLayerId: state.activeLayerId === id ? layers[0].id : state.activeLayerId,
        ...selection([]),
      };
    }),
  toggleLayerVisibility: (id) =>
    set((state) => ({ ...withHistory(state), layers: state.layers.map((layer) => (layer.id === id ? { ...layer, visible: !layer.visible } : layer)) })),
  toggleLayerLock: (id) =>
    set((state) => ({ ...withHistory(state), layers: state.layers.map((layer) => (layer.id === id ? { ...layer, locked: !layer.locked } : layer)) })),
  moveLayer: (id, direction) =>
    set((state) => {
      const index = state.layers.findIndex((layer) => layer.id === id);
      const target = direction === 'up' ? index + 1 : index - 1;
      if (index < 0 || target < 0 || target >= state.layers.length) return {};
      const layers = [...state.layers];
      [layers[index], layers[target]] = [layers[target], layers[index]];
      return { ...withHistory(state), layers };
    }),
  setActiveLayerId: (activeLayerId) => set({ activeLayerId }),

  undo: () =>
    set((state) => {
      const previous = state.history.at(-1);
      if (!previous) return {};
      return {
        layers: previous.layers,
        elements: previous.elements,
        history: state.history.slice(0, -1),
        future: [snapshot(state), ...state.future],
        ...selection([]),
        saveStatus: 'dirty',
        updatedAt: Date.now(),
      };
    }),
  redo: () =>
    set((state) => {
      const next = state.future[0];
      if (!next) return {};
      return {
        layers: next.layers,
        elements: next.elements,
        history: [...state.history, snapshot(state)],
        future: state.future.slice(1),
        ...selection([]),
        saveStatus: 'dirty',
        updatedAt: Date.now(),
      };
    }),
  newProject: () => {
    const doc = createDocument();
    localStorage.setItem(lastProjectKey, doc.id);
    set({ ...doc, activeLayerId: doc.layers[0].id, ...selection([]), history: [], future: [], saveStatus: 'dirty' });
  },
  loadProject: (project) =>
    set(() => {
      localStorage.setItem(lastProjectKey, project.id);
      return {
      ...project,
      activeLayerId: project.layers[0]?.id ?? defaultLayerId,
      ...selection([]),
      history: [],
      future: [],
      saveStatus: 'saved',
    };
    }),
  toProject: () => {
    const state = get();
    return {
      id: state.id,
      name: state.name,
      width: state.width,
      height: state.height,
      layers: state.layers,
      elements: state.elements,
      createdAt: state.createdAt,
      updatedAt: Date.now(),
    };
  },
  saveCurrentProject: async () => {
    set({ isSaving: true, saveStatus: 'saving' });
    try {
      await saveProject(get().toProject());
      localStorage.setItem(lastProjectKey, get().id);
      set({ isSaving: false, saveStatus: 'saved' });
    } catch (error) {
      set({ isSaving: false, saveStatus: 'error' });
      throw error;
    }
  },
}));

export { lastProjectKey };
