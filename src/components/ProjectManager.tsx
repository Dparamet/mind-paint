import { Copy, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { deleteProject, listProjects, saveProject } from '../db/indexedDb';
import { useEditorStore } from '../store/useEditorStore';
import type { SavedProject } from '../types/editor';

export function ProjectManager() {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const state = useEditorStore();

  async function refresh() {
    setProjects(await listProjects());
  }

  useEffect(() => {
    void refresh();
  }, [state.updatedAt]);

  async function remove(id: string) {
    await deleteProject(id);
    await refresh();
  }

  async function rename(project: SavedProject, name: string) {
    await saveProject({ ...project, name, updatedAt: Date.now() });
    await refresh();
  }

  async function duplicate(project: SavedProject) {
    const now = Date.now();
    const copy: SavedProject = {
      ...structuredClone(project),
      id: crypto.randomUUID(),
      name: `${project.name} copy`,
      createdAt: now,
      updatedAt: now,
    };
    await saveProject(copy);
    await refresh();
  }

  return (
    <section className="border-t border-line p-3">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink/75">Projects</h2>
        <button className="icon-button h-8 w-8" aria-label="New project" title="New project" onClick={state.newProject}>
          <Plus size={15} />
        </button>
      </div>
      <div className="max-h-56 space-y-2 overflow-auto">
        {projects.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-paper p-3 text-xs text-ink/65">No saved projects yet</div>
        ) : (
          projects.map((project) => (
            <div key={project.id} className="rounded-md border border-line bg-paper p-2 transition hover:border-sky/60">
              <div className="mb-2 flex gap-2">
                <div className="h-12 w-16 shrink-0 overflow-hidden rounded border border-line bg-sunshine/20">
                  <div className="flex h-full items-center justify-center text-[10px] font-semibold text-ink/50">
                    {project.elements.length} items
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={`Rename ${project.name}`}
                    className="w-full rounded border border-transparent bg-transparent px-1 text-sm font-medium outline-none focus:border-accent"
                    value={project.name}
                    onChange={(event) => void rename(project, event.target.value)}
                  />
                  <div className="px-1 text-[11px] text-ink/55">{new Date(project.updatedAt).toLocaleString()}</div>
                </div>
              </div>
              <div className="flex justify-end gap-1">
                <button className="icon-button h-8 w-8" aria-label={`Open ${project.name}`} onClick={() => state.loadProject(project)}>
                  <FolderOpen size={15} />
                </button>
                <button className="icon-button h-8 w-8" aria-label={`Duplicate ${project.name}`} onClick={() => duplicate(project)}>
                  <Copy size={15} />
                </button>
                <button className="icon-button h-8 w-8" aria-label={`Delete ${project.name}`} onClick={() => remove(project.id)}>
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
