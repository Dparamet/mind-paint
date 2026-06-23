import { Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

// Most-used drawing colors: ink/greys, warm accents, then cool tones.
const PRESET_COLORS = [
  '#17202a', '#34495e', '#95a5a6', '#ffffff', '#e74c3c', '#e67e22',
  '#f1c40f', '#f4b860', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6',
];

interface ColorPickerProps {
  label: string;
  value: string;
  recent: string[];
  onChange: (color: string) => void;
}

function sameColor(a: string, b: string) {
  return a.toLowerCase() === b.toLowerCase();
}

function Swatch({ color, selected, onPick }: { color: string; selected: boolean; onPick: (color: string) => void }) {
  return (
    <button
      type="button"
      aria-label={color}
      aria-pressed={selected}
      title={color}
      className={`flex h-6 w-6 items-center justify-center rounded border transition ${selected ? 'border-accent ring-2 ring-accent/40' : 'border-line hover:border-accent'}`}
      style={{ backgroundColor: color }}
      onClick={() => onPick(color)}
    >
      {selected && <Check size={12} className="text-white mix-blend-difference" />}
    </button>
  );
}

export function ColorPicker({ label, value, recent, onChange }: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function pick(color: string) {
    onChange(color);
    setOpen(false);
  }

  return (
    <div ref={rootRef} className="relative flex shrink-0 items-center gap-2 text-xs font-medium text-ink">
      {label}
      <button
        type="button"
        aria-label={`${label} color, current ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="h-7 w-7 rounded-md border border-line shadow-soft transition hover:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
        style={{ backgroundColor: value }}
        onClick={() => setOpen((prev) => !prev)}
      />
      {open && (
        <div
          role="dialog"
          aria-label={`${label} color picker`}
          className="absolute left-0 top-9 z-40 w-52 rounded-md border border-line bg-panel p-3 shadow-soft"
        >
          <div className="grid grid-cols-6 gap-1.5">
            {PRESET_COLORS.map((color) => (
              <Swatch key={color} color={color} selected={sameColor(color, value)} onPick={pick} />
            ))}
          </div>

          {recent.length > 0 && (
            <>
              <div className="mb-1.5 mt-3 text-[10px] font-bold uppercase tracking-wide text-ink/50">Recent</div>
              <div className="grid grid-cols-6 gap-1.5">
                {recent.map((color) => (
                  <Swatch key={color} color={color} selected={sameColor(color, value)} onPick={pick} />
                ))}
              </div>
            </>
          )}

          <label className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
            <span>Custom</span>
            <input
              aria-label={`${label} custom color`}
              type="color"
              value={value}
              onChange={(event) => onChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}
