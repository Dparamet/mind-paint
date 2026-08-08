import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useState } from 'react';
import type { SaveStatus } from '../store/useEditorStore';
import { LayerPanel } from './LayerPanel';
import { ProjectManager } from './ProjectManager';
import { PropertiesPanel } from './PropertiesPanel';

interface RightSidebarProps {
  saveStatus: SaveStatus;
}

export function RightSidebar({ saveStatus }: RightSidebarProps) {
  const [expanded, setExpanded] = useState(true);
  const label = expanded ? 'Collapse right sidebar' : 'Expand right sidebar';

  return (
    <aside
      aria-label="Right sidebar"
      className={`flex shrink-0 flex-col overflow-hidden border-l border-line bg-panel transition-[width] duration-200 motion-reduce:transition-none ${expanded ? 'w-72' : 'w-11'}`}
    >
      <div className={`flex h-11 shrink-0 items-center border-b border-line bg-paper ${expanded ? 'justify-end px-2' : 'justify-center'}`}>
        <button
          className="icon-button h-8 w-8"
          type="button"
          aria-label={label}
          title={label}
          aria-expanded={expanded}
          aria-controls="right-sidebar-content"
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>
      </div>

      {expanded && (
        <div id="right-sidebar-content" className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <PropertiesPanel />
          <LayerPanel />
          <ProjectManager />
          <div className="shrink-0 border-t border-line bg-paper px-4 py-2 text-xs font-medium text-ink/70">
            {saveStatus === 'saving' && <span className="text-accent">Saving…</span>}
            {saveStatus === 'saved' && <span>Saved</span>}
            {saveStatus === 'dirty' && <span className="text-coral">Unsaved changes</span>}
            {saveStatus === 'error' && <span className="text-coral">Save failed</span>}
          </div>
        </div>
      )}
    </aside>
  );
}
