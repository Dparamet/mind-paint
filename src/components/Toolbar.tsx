import { ArrowUpRight, Brain, ChevronRight, Circle, Diamond, Eraser, Hexagon, ImageOff, Lasso, MessageSquare, Minus, MousePointer2, Octagon, PaintBucket, Pencil, PenLine, Pentagon, Square, Star, StickyNote, Triangle, Type } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { Tool } from '../types/editor';
import { useEditorStore } from '../store/useEditorStore';

type ToolEntry = { id: Tool; label: string; icon: ComponentType<{ size?: number }> };

const toolGroups: ToolEntry[][] = [
  [
    { id: 'select', label: 'Select / Move (V)', icon: MousePointer2 },
    { id: 'lasso', label: 'Lasso select (L)', icon: Lasso },
  ],
  [
    { id: 'pen', label: 'Pen (P)', icon: PenLine },
    { id: 'pencil', label: 'Pencil', icon: Pencil },
    { id: 'eraser', label: 'Eraser (E)', icon: Eraser },
    { id: 'fill', label: 'Fill bucket (F)', icon: PaintBucket },
    { id: 'backgroundEraser', label: 'Remove image background', icon: ImageOff },
  ],
  [
    { id: 'line', label: 'Line', icon: Minus },
    { id: 'arrow', label: 'Arrow (A)', icon: ArrowUpRight },
  ],
  [
    { id: 'text', label: 'Text (T)', icon: Type },
    { id: 'sticky', label: 'Sticky note', icon: StickyNote },
    { id: 'mindNode', label: 'Mind node', icon: Brain },
    { id: 'speech', label: 'Speech bubble', icon: MessageSquare },
  ],
];

const shapeCategories: Array<{ label: string; tools: ToolEntry[] }> = [
  {
    label: 'Basic',
    tools: [
      { id: 'rectangle', label: 'Rectangle', icon: Square },
      { id: 'circle', label: 'Circle', icon: Circle },
      { id: 'triangle', label: 'Triangle', icon: Triangle },
    ],
  },
  {
    label: 'Polygons',
    tools: [
      { id: 'diamond', label: 'Diamond', icon: Diamond },
      { id: 'pentagon', label: 'Pentagon', icon: Pentagon },
      { id: 'hexagon', label: 'Hexagon', icon: Hexagon },
      { id: 'octagon', label: 'Octagon', icon: Octagon },
    ],
  },
  {
    label: 'Decorative',
    tools: [{ id: 'star', label: 'Star', icon: Star }],
  },
];

const shapeTools = shapeCategories.flatMap((category) => category.tools);

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const [shapesOpen, setShapesOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const shapeTriggerRef = useRef<HTMLButtonElement>(null);
  const activeShape = shapeTools.find((entry) => entry.id === tool);

  useEffect(() => {
    if (!shapesOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShapesOpen(false);
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popoverRef.current?.contains(target) && !shapeTriggerRef.current?.contains(target)) {
        setShapesOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [shapesOpen]);

  return (
    <aside className="relative flex min-h-0 w-16 flex-col items-center border-r border-line bg-panel px-2 py-3">
      <div className="mb-2 h-9 w-9 shrink-0 select-none rounded-md border border-sunshine/70 bg-sunshine text-center text-lg font-black leading-9 text-ink shadow-[0_8px_18px_rgba(247,201,72,0.28)]">
        M
      </div>
      <nav
        aria-label="Drawing tools"
        className="flex min-h-0 w-full flex-1 flex-col items-center gap-1 overflow-y-auto overscroll-contain pb-2"
      >
        {toolGroups.map((group, i) => (
          <div key={i} className="flex w-full shrink-0 flex-col items-center gap-1">
            {i > 0 && <div className="my-1.5 h-px w-8 bg-line" />}
            {i === 2 && (
              <button
                ref={shapeTriggerRef}
                aria-label="Shapes"
                aria-controls="shape-tools-menu"
                aria-expanded={shapesOpen}
                aria-haspopup="menu"
                title="Shapes"
                className={`tool-button relative shrink-0 ${activeShape ? 'tool-button-active' : ''}`}
                onClick={() => setShapesOpen((open) => !open)}
              >
                {activeShape ? <activeShape.icon size={18} /> : <Square size={18} />}
                <ChevronRight className="absolute bottom-0.5 right-0.5" size={9} />
              </button>
            )}
            {group.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                aria-label={label}
                aria-pressed={tool === id}
                title={label}
                className={`tool-button shrink-0 ${tool === id ? 'tool-button-active' : ''}`}
                onClick={() => setTool(id)}
              >
                <Icon size={18} />
              </button>
            ))}
          </div>
        ))}
      </nav>
      {shapesOpen && (
        <div
          id="shape-tools-menu"
          ref={popoverRef}
          role="menu"
          aria-label="Shape tools"
          className="absolute left-[calc(100%+8px)] top-40 z-40 w-52 rounded-xl border border-line bg-panel p-3 shadow-xl"
        >
          {shapeCategories.map((category) => (
            <section key={category.label} className="not-last:mb-3">
              <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                {category.label}
              </div>
              <div className="grid grid-cols-3 gap-1">
                {category.tools.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    role="menuitemradio"
                    aria-checked={tool === id}
                    aria-label={label}
                    title={label}
                    className={`flex h-12 items-center justify-center rounded-lg border transition-colors ${
                      tool === id
                        ? 'border-sunshine bg-sunshine/20 text-ink'
                        : 'border-transparent text-muted hover:border-line hover:bg-canvas hover:text-ink'
                    }`}
                    onClick={() => {
                      setTool(id);
                      setShapesOpen(false);
                    }}
                  >
                    <Icon size={20} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
}
