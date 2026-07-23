import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { LayerPanel } from './components/LayerPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { ProjectManager } from './components/ProjectManager';
import { SettingsPanel } from './components/SettingsPanel';
import { Toolbar } from './components/Toolbar';
import { Topbar } from './components/Topbar';
import { getProject, listProjects } from './db/indexedDb';
import { lastProjectKey, useEditorStore } from './store/useEditorStore';
import type { CanvasElement } from './types/editor';

let internalClipboard: CanvasElement[] = [];
export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const saveCurrentProject = useEditorStore((state) => state.saveCurrentProject);
  const loadProject = useEditorStore((state) => state.loadProject);
  const autosaveKey = useEditorStore((state) => `${state.id}:${state.updatedAt}:${state.elements.length}:${state.layers.length}`);
  const saveStatus = useEditorStore((state) => state.saveStatus);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      // Only block shortcuts when user is typing text — not for range/checkbox/number/color inputs
      const inputType = (target as HTMLInputElement | null)?.type ?? '';
      const isTyping =
        target?.tagName === 'TEXTAREA' ||
        (target?.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'color', 'file'].includes(inputType));
      if (isTyping) return;

      // getState() inside the handler keeps deps empty — no re-bind per store change
      const store = useEditorStore.getState();
      const key = event.key.toLowerCase();
      const mod = event.ctrlKey || event.metaKey;

      if (mod && key === 'z') {
        event.preventDefault();
        if (event.shiftKey) store.redo();
        else store.undo();
        return;
      }
      if (mod && key === 'y') {
        event.preventDefault();
        store.redo();
        return;
      }
      if (mod && key === 's') {
        event.preventDefault();
        void store.saveCurrentProject();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (!store.selectedElementIds.length) return;
        event.preventDefault();
        store.deleteSelectedElements();
        return;
      }
      if (mod && key === 'd') {
        event.preventDefault();
        store.duplicateSelectedElements();
        return;
      }
      if (mod && key === 'c') {
        internalClipboard = store.elements
          .filter((element) => store.selectedElementIds.includes(element.id))
          .map((element) => structuredClone(element));
        return;
      }
      if (mod && key === 'v' && internalClipboard.length) {
        event.preventDefault();
        const copies = internalClipboard.map((element) => ({
          ...structuredClone(element),
          id: crypto.randomUUID(),
          x: element.x + 40,
          y: element.y + 40,
        }) as CanvasElement);
        copies.forEach(store.addElement);
        store.setSelectedElementIds(copies.map((copy) => copy.id));
        internalClipboard = copies;
        return;
      }
      const tool = store.shortcuts[key];
      if (tool) store.setTool(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function recoverLastSession() {
      const lastProjectId = localStorage.getItem(lastProjectKey);
      const project = lastProjectId ? await getProject(lastProjectId) : (await listProjects())[0];
      if (!cancelled && project) loadProject(project);
    }
    void recoverLastSession();
    return () => {
      cancelled = true;
    };
  }, [loadProject]);

  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'saving') return;
    const timer = window.setTimeout(() => {
      void saveCurrentProject();
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [autosaveKey, saveCurrentProject, saveStatus]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper text-ink">
      <Toolbar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar stageRef={stageRef} onOpenSettings={() => setSettingsOpen(true)} />
        <CanvasStage stageRef={stageRef} />
      </div>
      <SettingsPanel open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <div className="flex w-72 shrink-0 flex-col overflow-hidden border-l border-line bg-panel">
        <PropertiesPanel />
        <LayerPanel />
        <ProjectManager />
        <div className="shrink-0 border-t border-line bg-sunshine/10 px-4 py-2 text-xs font-medium text-ink/70">
          {saveStatus === 'saving' && <span className="text-accent">Saving…</span>}
          {saveStatus === 'saved' && <span>Saved</span>}
          {saveStatus === 'dirty' && <span className="text-coral">Unsaved changes</span>}
          {saveStatus === 'error' && <span className="text-coral">Save failed</span>}
        </div>
      </div>
    </div>
  );
}
