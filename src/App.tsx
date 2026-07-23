import type Konva from 'konva';
import { useEffect, useRef, useState } from 'react';
import { CanvasStage } from './components/CanvasStage';
import { LayerPanel } from './components/LayerPanel';
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
  const setTool = useEditorStore((state) => state.setTool);
  const shortcuts = useEditorStore((state) => state.shortcuts);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const saveCurrentProject = useEditorStore((state) => state.saveCurrentProject);
  const loadProject = useEditorStore((state) => state.loadProject);
  const selectedElementIds = useEditorStore((state) => state.selectedElementIds);
  const elements = useEditorStore((state) => state.elements);
  const addElement = useEditorStore((state) => state.addElement);
  const setSelectedElementIds = useEditorStore((state) => state.setSelectedElementIds);
  const deleteSelectedElements = useEditorStore((state) => state.deleteSelectedElements);
  const duplicateSelectedElements = useEditorStore((state) => state.duplicateSelectedElements);
  const autosaveKey = useEditorStore((state) => `${state.id}:${state.updatedAt}:${state.elements.length}:${state.layers.length}`);
  const saveStatus = useEditorStore((state) => state.saveStatus);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA';
      if (isTyping) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
        return;
      }
      if (event.key === 'Delete' || event.key === 'Backspace') {
        event.preventDefault();
        deleteSelectedElements();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        duplicateSelectedElements();
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        internalClipboard = elements.filter((element) => selectedElementIds.includes(element.id)).map((element) => structuredClone(element));
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v' && internalClipboard.length) {
        event.preventDefault();
        const copies = internalClipboard.map((element) => ({
          ...structuredClone(element),
          id: crypto.randomUUID(),
          x: element.x + 40,
          y: element.y + 40,
        }) as CanvasElement);
        copies.forEach(addElement);
        setSelectedElementIds(copies.map((copy) => copy.id));
        internalClipboard = copies;
        return;
      }
      const tool = shortcuts[event.key.toLowerCase()];
      if (tool) setTool(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [addElement, deleteSelectedElements, duplicateSelectedElements, elements, redo, selectedElementIds, setSelectedElementIds, setTool, shortcuts, undo]);

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
      <div className="flex w-72 flex-col border-l border-line bg-panel">
        <LayerPanel />
        <ProjectManager />
        <div className="border-t border-line bg-sunshine/10 px-4 py-2 text-xs font-medium text-ink/70">
          {saveStatus === 'saving' && <span className="text-accent">Saving...</span>}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'dirty' && <span className="text-coral">Unsaved changes</span>}
          {saveStatus === 'error' && <span className="text-coral">Save failed</span>}
        </div>
      </div>
    </div>
  );
}
