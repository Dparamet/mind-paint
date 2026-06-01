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
export default function App() {
  const stageRef = useRef<Konva.Stage | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const setTool = useEditorStore((state) => state.setTool);
  const shortcuts = useEditorStore((state) => state.shortcuts);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const saveCurrentProject = useEditorStore((state) => state.saveCurrentProject);
  const loadProject = useEditorStore((state) => state.loadProject);
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
      const tool = shortcuts[event.key.toLowerCase()];
      if (tool) setTool(tool);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [redo, setTool, undo]);

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
      <div className="flex w-72 flex-col bg-panel">
        <LayerPanel />
        <ProjectManager />
        <div className="border-t border-line px-4 py-2 text-xs text-ink/60">
          {saveStatus === 'saving' && 'Saving...'}
          {saveStatus === 'saved' && 'Saved'}
          {saveStatus === 'dirty' && 'Unsaved changes'}
          {saveStatus === 'error' && 'Save failed'}
        </div>
      </div>
    </div>
  );
}
