import { Check, ChevronDown, Palette } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, useState } from 'react';
import type { BackgroundMode } from '../types/editor';

interface BackgroundMenuProps {
  value: BackgroundMode;
  onChange: (mode: BackgroundMode) => void;
}

const options: Array<{ mode: BackgroundMode; label: string; swatch: string }> = [
  { mode: 'normal', label: 'Normal', swatch: 'bg-canvas' },
  {
    mode: 'transparent',
    label: 'Transparent',
    swatch: 'bg-white [background-image:linear-gradient(45deg,#ded5c7_25%,transparent_25%),linear-gradient(-45deg,#ded5c7_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ded5c7_75%),linear-gradient(-45deg,transparent_75%,#ded5c7_75%)] [background-position:0_0,0_4px,4px_-4px,-4px_0] [background-size:8px_8px]',
  },
  { mode: 'greenScreen', label: 'Green Screen', swatch: 'bg-[#00FF00]' },
];

function getLabel(mode: BackgroundMode) {
  return options.find((option) => option.mode === mode)?.label ?? 'Normal';
}

export function BackgroundMenu({ value, onChange }: BackgroundMenuProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    if (!open) return;

    const positionMenu = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = menuRef.current?.offsetWidth || 192;
      setPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
        top: rect.bottom + 4,
      });
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !menuRef.current?.contains(target)) setOpen(false);
    };

    positionMenu();
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('pointerdown', closeOnOutsidePointer);
    window.addEventListener('resize', positionMenu);
    window.addEventListener('scroll', positionMenu, true);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('pointerdown', closeOnOutsidePointer);
      window.removeEventListener('resize', positionMenu);
      window.removeEventListener('scroll', positionMenu, true);
    };
  }, [open]);

  const label = getLabel(value);

  return (
    <div ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`Background: ${label}`}
        aria-controls="background-modes-menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
        onClick={() => setOpen((current) => !current)}
      >
        <Palette size={14} />
        <span>Background</span>
        <ChevronDown size={12} />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          id="background-modes-menu"
          role="menu"
          aria-label="Background modes"
          className="fixed z-[100] min-w-48 overflow-hidden rounded-md border border-line bg-panel py-1 shadow-soft"
          style={position}
        >
          {options.map((option) => (
            <button
              key={option.mode}
              type="button"
              role="menuitemradio"
              aria-checked={value === option.mode}
              aria-label={option.label}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-ink hover:bg-paper"
              onClick={() => {
                onChange(option.mode);
                setOpen(false);
              }}
            >
              <span className={`h-4 w-4 shrink-0 rounded-sm border border-line ${option.swatch}`} aria-hidden="true" />
              <span className="flex-1">{option.label}</span>
              {value === option.mode && <Check size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </div>
  );
}
