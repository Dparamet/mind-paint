import { ArrowUpRight, Circle, Eraser, MessageSquare, MousePointer2, Network, PaintBucket, Pencil, PenLine, Square, StickyNote, Type } from 'lucide-react';
import type { ComponentType } from 'react';
import type { Tool } from '../types/editor';
import { useEditorStore } from '../store/useEditorStore';

const tools: Array<{ id: Tool; label: string; icon: ComponentType<{ size?: number }> }> = [
  { id: 'select', label: 'Select / Move', icon: MousePointer2 },
  { id: 'pen', label: 'Pen', icon: PenLine },
  { id: 'pencil', label: 'Pencil', icon: Pencil },
  { id: 'eraser', label: 'Eraser', icon: Eraser },
  { id: 'rectangle', label: 'Rectangle', icon: Square },
  { id: 'circle', label: 'Circle', icon: Circle },
  { id: 'line', label: 'Straight line', icon: PenLine },
  { id: 'arrow', label: 'Arrow', icon: ArrowUpRight },
  { id: 'sticky', label: 'Sticky note', icon: StickyNote },
  { id: 'mindNode', label: 'Mind map node', icon: Network },
  { id: 'speech', label: 'Speech bubble', icon: MessageSquare },
  { id: 'text', label: 'Text', icon: Type },
  { id: 'fill', label: 'Fill', icon: PaintBucket },
];

export function Toolbar() {
  const tool = useEditorStore((state) => state.tool);
  const setTool = useEditorStore((state) => state.setTool);

  return (
    <aside className="flex w-16 flex-col items-center gap-2 border-r border-line bg-panel px-3 py-4">
      <div className="mb-2 h-9 w-9 select-none rounded-md border border-sunshine/70 bg-sunshine text-center text-lg font-black leading-9 text-ink shadow-[0_8px_18px_rgba(247,201,72,0.28)]">M</div>
      {tools.map(({ id, label, icon: Icon }) => (
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
    </aside>
  );
}
