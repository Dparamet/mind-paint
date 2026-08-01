import { ArrowUpRight, Brain, ChevronRight, Circle, Diamond, Eraser, Hexagon, ImageOff, Lasso, MessageSquare, Minus, MousePointer2, Octagon, PaintBucket, Pencil, PenLine, Pentagon, Square, Star, StickyNote, Triangle, Type } from 'lucide-react';
import { useEffect, useRef, useState, type ComponentType } from 'react';
import type { CanvasElement, LineHead, StrokeDash, Tool } from '../types/editor';
import { useEditorStore } from '../store/useEditorStore';
import { DASH_MAP, lineHeadPatch } from '../utils/elementUtils';

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
  [],
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

const lineHeads: Array<{ id: LineHead; label: string }> = [
  { id: 'none', label: 'Plain line' },
  { id: 'end', label: 'Arrow at end' },
  { id: 'start', label: 'Arrow at start' },
  { id: 'both', label: 'Arrow at both ends' },
];

const strokeDashes: Array<{ id: StrokeDash; label: string }> = [
  { id: 'solid', label: 'Solid line' },
  { id: 'dashed', label: 'Dashed line' },
  { id: 'dotted', label: 'Dotted line' },
];

function LinePreview({ head, dash = 'solid' }: { head: LineHead; dash?: StrokeDash }) {
  const dashArray = dash === 'dashed' ? '10 6' : dash === 'dotted' ? '1 6' : undefined;
  return (
    <svg viewBox="0 0 72 20" className="h-5 w-16" aria-hidden="true">
      <line x1="8" y1="10" x2="64" y2="10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray={dashArray} />
      {(head === 'start' || head === 'both') && <path d="M16 3 8 10l8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
      {(head === 'end' || head === 'both') && <path d="m56 3 8 7-8 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

export function Toolbar() {
  const tool = useEditorStore((s) => s.tool);
  const setTool = useEditorStore((s) => s.setTool);
  const lineHead = useEditorStore((s) => s.lineHead);
  const setLineHead = useEditorStore((s) => s.setLineHead);
  const strokeDash = useEditorStore((s) => s.strokeDash);
  const setStrokeDash = useEditorStore((s) => s.setStrokeDash);
  const elements = useEditorStore((s) => s.elements);
  const selectedElementIds = useEditorStore((s) => s.selectedElementIds);
  const updateElement = useEditorStore((s) => s.updateElement);
  const [shapesOpen, setShapesOpen] = useState(false);
  const [linesOpen, setLinesOpen] = useState(false);
  const shapePopoverRef = useRef<HTMLDivElement>(null);
  const shapeTriggerRef = useRef<HTMLButtonElement>(null);
  const linePopoverRef = useRef<HTMLDivElement>(null);
  const lineTriggerRef = useRef<HTMLButtonElement>(null);
  const activeShape = shapeTools.find((entry) => entry.id === tool);
  const lineToolActive = tool === 'line' || tool === 'arrow';

  useEffect(() => {
    if (!shapesOpen && !linesOpen) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShapesOpen(false);
        setLinesOpen(false);
      }
    };
    const closeOnOutsideClick = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!shapePopoverRef.current?.contains(target) && !shapeTriggerRef.current?.contains(target)) {
        setShapesOpen(false);
      }
      if (!linePopoverRef.current?.contains(target) && !lineTriggerRef.current?.contains(target)) {
        setLinesOpen(false);
      }
    };

    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsideClick);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsideClick);
    };
  }, [linesOpen, shapesOpen]);

  function selectedLines() {
    const selected = new Set(selectedElementIds);
    return elements.filter((element) => selected.has(element.id) && (element.type === 'line' || element.type === 'arrow'));
  }

  function chooseLineHead(head: LineHead) {
    setLineHead(head);
    setTool(head === 'none' ? 'line' : 'arrow');
    selectedLines().forEach((element, index) => {
      const patch = {
        ...lineHeadPatch(head),
        fill: head === 'none' ? 'transparent' : element.stroke,
      } as Partial<CanvasElement>;
      updateElement(element.id, patch, index === 0);
    });
    setLinesOpen(false);
  }

  function chooseStrokeDash(dash: StrokeDash) {
    setStrokeDash(dash);
    selectedLines().forEach((element, index) => {
      updateElement(element.id, { dash: DASH_MAP[dash] } as Partial<CanvasElement>, index === 0);
    });
    setLinesOpen(false);
  }

  return (
    <aside className="relative flex min-h-0 w-16 flex-col items-center border-r border-line bg-panel px-2 py-3">
      <div className="mb-2 h-9 w-9 shrink-0 select-none rounded-md border border-accent bg-accent text-center text-lg font-black leading-9 text-panel shadow-[0_8px_18px_rgba(15,118,110,0.24)]">
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
              <>
                <button
                  ref={lineTriggerRef}
                  aria-label="Line styles"
                  aria-controls="line-style-tools-menu"
                  aria-expanded={linesOpen}
                  aria-haspopup="menu"
                  title="Line styles"
                  className={`tool-button relative shrink-0 ${lineToolActive ? 'tool-button-active' : ''}`}
                  onClick={() => {
                    setShapesOpen(false);
                    setLinesOpen((open) => !open);
                  }}
                >
                  {lineHead === 'none' ? <Minus size={18} /> : <ArrowUpRight size={18} />}
                  <ChevronRight className="absolute bottom-0.5 right-0.5" size={9} />
                </button>
                <button
                  ref={shapeTriggerRef}
                  aria-label="Shapes"
                  aria-controls="shape-tools-menu"
                  aria-expanded={shapesOpen}
                  aria-haspopup="menu"
                  title="Shapes"
                  className={`tool-button relative shrink-0 ${activeShape ? 'tool-button-active' : ''}`}
                  onClick={() => {
                    setLinesOpen(false);
                    setShapesOpen((open) => !open);
                  }}
                >
                  {activeShape ? <activeShape.icon size={18} /> : <Square size={18} />}
                  <ChevronRight className="absolute bottom-0.5 right-0.5" size={9} />
                </button>
              </>
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
      {linesOpen && (
        <div
          id="line-style-tools-menu"
          ref={linePopoverRef}
          role="menu"
          aria-label="Line style tools"
          className="absolute left-[calc(100%+8px)] top-40 z-40 w-64 rounded-xl border border-line bg-panel p-3 shadow-xl"
        >
          <section className="mb-3">
            <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">Endpoints</div>
            <div className="grid grid-cols-2 gap-1">
              {lineHeads.map(({ id, label }) => (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={lineHead === id}
                  aria-label={label}
                  title={label}
                  className={`flex h-12 items-center justify-center rounded-lg border transition-colors ${
                    lineHead === id
                      ? 'border-accent bg-paper text-accent'
                      : 'border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink'
                  }`}
                  onClick={() => chooseLineHead(id)}
                >
                  <LinePreview head={id} />
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-muted">Stroke</div>
            <div className="grid grid-cols-3 gap-1">
              {strokeDashes.map(({ id, label }) => (
                <button
                  key={id}
                  role="menuitemradio"
                  aria-checked={strokeDash === id}
                  aria-label={label}
                  title={label}
                  className={`flex h-10 items-center justify-center rounded-lg border transition-colors ${
                    strokeDash === id
                      ? 'border-accent bg-paper text-accent'
                      : 'border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink'
                  }`}
                  onClick={() => chooseStrokeDash(id)}
                >
                  <LinePreview head="none" dash={id} />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
      {shapesOpen && (
        <div
          id="shape-tools-menu"
          ref={shapePopoverRef}
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
                        ? 'border-accent bg-paper text-accent'
                        : 'border-transparent text-muted hover:border-line hover:bg-paper hover:text-ink'
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
