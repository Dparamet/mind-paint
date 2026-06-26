import { ArrowUpRight, Circle, Eraser, MousePointer2, PaintBucket, Pencil, PenLine, Square, Type } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Tool } from '../types/editor';
import { useEditorStore } from '../store/useEditorStore';

type ToolEntry = { id: Tool; label: string; icon: ComponentType<{ size?: number }> };

const toolGroups: ToolEntry[][] = [
  [
    { id: 'select', label: 'Select / Move (V)', icon: MousePointer2 },
  ],
  [
    { id: 'pen', label: 'Pen (P)', icon: PenLine },
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'eraser', label: 'Eraser (E)', icon: Eraser },
    { id: 'fill', label: 'Fill bucket (F)', icon: PaintBucket },
  ],
  [
    { id: 'rectangle', label: 'Rectangle (R)', icon: Square },
    { id: 'circle', label: 'Circle (C)', icon: Circle },
    { id: 'line', label: 'Line', icon: PenLine },
    { id: 'arrow', label: 'Arrow (A)', icon: ArrowUpRight },
  ],
  [
    { id: 'text', label: 'Text (T)', icon: Type },
  ],
];

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);

  return (
    <aside className="flex w-16 flex-col items-center gap-1 border-r border-line bg-panel px-3 py-4">
      <div className="mb-3 h-9 w-9 select-none rounded-md bg-accent text-center text-lg font-black leading-9 text-white">
        M
      </div>
      {toolGroups.map((group, i) => (
        <div key={i} className="flex w-full flex-col items-center gap-1">
          {i > 0 && <div className="my-1.5 h-px w-8 bg-line" />}
          {group.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              aria-label={label}
              title={label}
              className={`tool-button ${tool === id ? 'tool-button-active' : ''}`}
              onClick={() => setTool(id)}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
