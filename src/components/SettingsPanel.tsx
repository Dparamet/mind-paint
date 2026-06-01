import { X } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';
import type { Tool } from '../types/editor';

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const configurableTools: Array<{ tool: Tool; label: string }> = [
  { tool: 'select', label: 'Select' },
  { tool: 'pen', label: 'Pen' },
  { tool: 'pencil', label: 'Pencil' },
  { tool: 'eraser', label: 'Eraser' },
  { tool: 'rectangle', label: 'Rectangle' },
  { tool: 'circle', label: 'Circle' },
  { tool: 'line', label: 'Line' },
  { tool: 'arrow', label: 'Arrow' },
  { tool: 'text', label: 'Text' },
  { tool: 'fill', label: 'Fill' },
  { tool: 'sticky', label: 'Sticky note' },
  { tool: 'mindNode', label: 'Mind node' },
  { tool: 'speech', label: 'Speech bubble' },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { shortcuts, rightClickEraser, setShortcut, setRightClickEraser } = useEditorStore();
  if (!open) return null;

  function keyFor(tool: Tool) {
    return Object.entries(shortcuts).find(([, mappedTool]) => mappedTool === tool)?.[0] ?? '';
  }

  return (
    <div className="absolute right-80 top-16 z-30 w-80 rounded-md border border-line bg-panel shadow-soft">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide">Settings</h2>
        <button className="icon-button h-8 w-8" aria-label="Close settings" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <div className="space-y-4 p-4">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>Right click eraser</span>
          <input
            type="checkbox"
            checked={rightClickEraser}
            onChange={(event) => setRightClickEraser(event.target.checked)}
          />
        </label>

        <div>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/60">Shortcuts</h3>
          <div className="grid grid-cols-2 gap-2">
            {configurableTools.map(({ tool, label }) => (
              <label key={tool} className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-2 py-2 text-xs">
                <span className="truncate">{label}</span>
                <input
                  aria-label={`${label} shortcut`}
                  className="h-7 w-12 rounded border border-line text-center uppercase outline-none focus:border-accent"
                  maxLength={1}
                  value={keyFor(tool).toUpperCase()}
                  onChange={(event) => setShortcut(tool, event.target.value)}
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
