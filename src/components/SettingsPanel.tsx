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
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { shortcuts, rightClickEraser, setShortcut, setRightClickEraser } = useEditorStore();
  if (!open) return null;

  function keyFor(tool: Tool) {
    return Object.entries(shortcuts).find(([, t]) => t === tool)?.[0] ?? '';
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-[26rem] max-h-[85vh] overflow-y-auto rounded-xl border border-line bg-panel shadow-soft">
        <div className="sticky top-0 flex shrink-0 items-center justify-between border-b border-line bg-panel px-4 py-3">
          <h2 className="text-sm font-bold uppercase tracking-wide">Settings</h2>
          <button className="icon-button h-8 w-8" aria-label="Close settings" onClick={onClose}>
            <X size={15} />
          </button>
        </div>

        <div className="space-y-5 p-4">
          {/* Keyboard reference */}
          <div className="rounded-lg border border-line bg-white p-3 text-xs leading-7 text-ink/70">
            {[
              ['Space + drag', 'pan canvas'],
              ['Alt + scroll', 'horizontal pan'],
              ['Alt + drag object', 'duplicate'],
              ['Delete', 'remove selected'],
              ['Ctrl+C / Ctrl+V', 'copy / paste'],
              ['Ctrl+D', 'duplicate selected'],
            ].map(([key, desc]) => (
              <div key={key} className="flex items-baseline gap-2">
                <kbd className="shrink-0 rounded border border-line bg-paper px-1.5 py-0.5 font-mono text-[10px] leading-none">
                  {key}
                </kbd>
                <span>{desc}</span>
              </div>
            ))}
          </div>

          <label className="flex items-center justify-between gap-3 text-sm">
            <span>Right click eraser</span>
            <input
              type="checkbox"
              checked={rightClickEraser}
              onChange={(e) => setRightClickEraser(e.target.checked)}
            />
          </label>

          <div>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-ink/50">
              Keyboard Shortcuts
            </h3>
            <div className="grid grid-cols-2 gap-2">
              {configurableTools.map(({ tool, label }) => (
                <label
                  key={tool}
                  className="flex items-center justify-between gap-2 rounded-md border border-line bg-white px-2.5 py-2 text-xs"
                >
                  <span className="truncate">{label}</span>
                  <input
                    aria-label={`${label} shortcut`}
                    className="h-7 w-12 rounded border border-line text-center font-mono uppercase outline-none focus:border-accent"
                    maxLength={1}
                    value={keyFor(tool).toUpperCase()}
                    onChange={(e) => setShortcut(tool, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
