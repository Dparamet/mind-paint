import { useEditorStore } from '../store/useEditorStore';
import type { CanvasElement } from '../types/editor';

function NumInput({ label, value, step = 1, onChange }: { label: string; value: number; step?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink">
      <span className="w-6 shrink-0 text-right text-ink/50">{label}</span>
      <input
        type="number"
        step={step}
        className="w-full min-w-0 rounded border border-line bg-white px-1.5 py-0.5 text-xs outline-none focus:border-accent"
        value={Math.round(value * 10) / 10}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

export function PropertiesPanel() {
  const state = useEditorStore();
  const el = state.elements.find((e) => e.id === state.selectedElementId);
  if (!el) return null;

  function upd(patch: Partial<CanvasElement>) {
    state.updateElement(el!.id, patch);
  }

  return (
    <div className="shrink-0 border-b border-line px-3 py-2">
      <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-ink/40">Properties</div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        <NumInput label="X" value={el.x} onChange={(x) => upd({ x })} />
        <NumInput label="Y" value={el.y} onChange={(y) => upd({ y })} />
        {'width' in el && (
          <NumInput label="W" value={(el as { width: number }).width}
            onChange={(w) => upd({ width: Math.max(1, w) } as Partial<CanvasElement>)} />
        )}
        {'height' in el && (
          <NumInput label="H" value={(el as { height: number }).height}
            onChange={(h) => upd({ height: Math.max(1, h) } as Partial<CanvasElement>)} />
        )}
        {'radiusX' in el && (
          <NumInput label="Rx" value={(el as { radiusX: number }).radiusX}
            onChange={(v) => upd({ radiusX: Math.max(1, v) } as Partial<CanvasElement>)} />
        )}
        {'radiusY' in el && (
          <NumInput label="Ry" value={(el as { radiusY: number }).radiusY}
            onChange={(v) => upd({ radiusY: Math.max(1, v) } as Partial<CanvasElement>)} />
        )}
        <NumInput label="°" step={5} value={el.rotation ?? 0} onChange={(rotation) => upd({ rotation })} />
        <NumInput label="SW" value={el.strokeWidth ?? 0}
          onChange={(sw) => upd({ strokeWidth: Math.max(0, sw) })} />
      </div>
    </div>
  );
}
