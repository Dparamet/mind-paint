import type Konva from 'konva';
import { AlignCenter, AlignCenterVertical, AlignEndVertical, AlignHorizontalSpaceBetween, AlignLeft, AlignRight, AlignStartVertical, AlignVerticalSpaceBetween, ChevronDown, ChevronUp, ChevronsDown, ChevronsUp, Download, FileUp, Grid2X2, ImagePlus, Redo2, Save, Settings, Trash2, Undo2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { BackgroundMenu } from './BackgroundMenu';
import { ColorPicker } from './ColorPicker';
import { useEditorStore } from '../store/useEditorStore';
import { dataUrlToImageSize, fileToDataUrl } from '../utils/clipboardUtils';
import { downloadDataUrl, downloadJson, downloadPdfFromDataUrl, downloadSvg, readJsonFile } from '../utils/exportUtils';
import { DASH_MAP, getElementBounds } from '../utils/elementUtils';
import { CANVAS_BACKGROUND_ID, getExportBackground, withTemporaryBackground } from '../utils/backgroundUtils';
import type { CanvasElement, ImageElement, StrokeDash } from '../types/editor';
import { isStickyLike } from '../types/editor';

const STICKY_COLORS = ['#fef08a', '#bfdbfe', '#bbf7d0', '#fecdd3', '#e9d5ff'];

interface TopbarProps {
  stageRef: RefObject<Konva.Stage | null>;
  onOpenSettings: () => void;
}

export function Topbar({ stageRef, onOpenSettings }: TopbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMenuPosition, setExportMenuPosition] = useState({ left: 0, top: 0 });
  const state = useEditorStore();

  const activeLayer = state.layers.find((l) => l.id === state.activeLayerId);
  const canAddImage = activeLayer?.visible && !activeLayer.locked;

  const selectedEls = useMemo(() => {
    const idSet = new Set(state.selectedElementIds);
    return state.elements.filter((e) => idSet.has(e.id));
  }, [state.elements, state.selectedElementIds]);
  const selectedText = selectedEls.find((element) => element.type === 'text');
  const isSelectedText = selectedEls.some((e) => e.type === 'text');
  const showTextControls = state.tool === 'text' || isSelectedText;
  const hasSelection = selectedEls.length > 0;
  const textFontSize = selectedText?.fontSize ?? state.fontSize;
  const textFontFamily = selectedText?.fontFamily ?? state.fontFamily;
  const textBold = selectedText ? selectedText.fontStyle?.includes('bold') ?? false : state.bold;
  const textItalic = selectedText ? selectedText.fontStyle?.includes('italic') ?? false : state.italic;
  const textAlign = selectedText?.align ?? state.textAlign;

  useEffect(() => {
    if (!exportOpen) return;

    const positionMenu = () => {
      const rect = exportButtonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuWidth = exportMenuRef.current?.offsetWidth || 176;
      setExportMenuPosition({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - menuWidth - 8)),
        top: rect.bottom + 4,
      });
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setExportOpen(false);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        exportRef.current
        && !exportRef.current.contains(target)
        && !exportMenuRef.current?.contains(target)
      ) {
        setExportOpen(false);
      }
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
  }, [exportOpen]);

  function handleStrokeChange(color: string) {
    state.setStrokeColor(color);
    selectedEls.forEach((el) => state.updateElement(el.id, { stroke: color }));
  }

  function handleFillChange(color: string) {
    state.setFillColor(color);
    selectedEls.forEach((el) => {
      if (el.type !== 'line' && el.type !== 'arrow') {
        state.updateElement(el.id, { fill: color });
      }
    });
  }

  function handleFontSize(size: number) {
    state.setFontSize(size);
    selectedEls
      .filter((e): e is Extract<CanvasElement, { fontSize: number }> => 'fontSize' in e)
      .forEach((el) => state.updateElement(el.id, { fontSize: size } as Partial<CanvasElement>));
  }

  function handleFontFamily(family: string) {
    state.setFontFamily(family);
    selectedEls
      .filter((e): e is Extract<CanvasElement, { fontFamily: string }> => 'fontFamily' in e)
      .forEach((el) => state.updateElement(el.id, { fontFamily: family } as Partial<CanvasElement>));
  }

  function handleBold(bold: boolean, italic = state.italic) {
    state.setBold(bold);
    const style = `${italic ? 'italic ' : ''}${bold ? 'bold' : 'normal'}`.trim();
    selectedEls
      .filter((e) => e.type === 'text')
      .forEach((el) => state.updateElement(el.id, { fontStyle: style } as Partial<CanvasElement>));
  }

  function handleItalic(italic: boolean, bold = state.bold) {
    state.setItalic(italic);
    const style = `${italic ? 'italic ' : ''}${bold ? 'bold' : 'normal'}`.trim();
    selectedEls
      .filter((e) => e.type === 'text')
      .forEach((el) => state.updateElement(el.id, { fontStyle: style } as Partial<CanvasElement>));
  }

  function handleTextAlign(align: 'left' | 'center' | 'right') {
    state.setTextAlign(align);
    selectedEls
      .filter((element) => element.type === 'text')
      .forEach((element) => state.updateElement(element.id, { align } as Partial<CanvasElement>));
  }

  function handleOpacity(opacity: number) {
    selectedEls.forEach((el, i) => state.updateElement(el.id, { opacity }, i === 0));
  }

  function handleDash(dash: StrokeDash) {
    state.setStrokeDash(dash);
    const points = DASH_MAP[dash];
    selectedEls.forEach((el, i) => state.updateElement(el.id, { dash: points } as Partial<CanvasElement>, i === 0));
  }

  function alignSelected(axis: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') {
    const bbs = selectedEls.map((el) => ({ el, b: getElementBounds(el) }));
    const updates: Array<[string, Partial<CanvasElement>]> = [];
    if (axis === 'left') {
      const min = Math.min(...bbs.map(({ b }) => b.x));
      bbs.forEach(({ el }) => updates.push([el.id, { x: min }]));
    } else if (axis === 'right') {
      const max = Math.max(...bbs.map(({ b }) => b.x + b.w));
      bbs.forEach(({ el, b }) => updates.push([el.id, { x: max - b.w }]));
    } else if (axis === 'center') {
      const min = Math.min(...bbs.map(({ b }) => b.x));
      const max = Math.max(...bbs.map(({ b }) => b.x + b.w));
      const cx = (min + max) / 2;
      bbs.forEach(({ el, b }) => updates.push([el.id, { x: cx - b.w / 2 }]));
    } else if (axis === 'top') {
      const min = Math.min(...bbs.map(({ b }) => b.y));
      bbs.forEach(({ el }) => updates.push([el.id, { y: min }]));
    } else if (axis === 'bottom') {
      const max = Math.max(...bbs.map(({ b }) => b.y + b.h));
      bbs.forEach(({ el, b }) => updates.push([el.id, { y: max - b.h }]));
    } else {
      const min = Math.min(...bbs.map(({ b }) => b.y));
      const max = Math.max(...bbs.map(({ b }) => b.y + b.h));
      const cy = (min + max) / 2;
      bbs.forEach(({ el, b }) => updates.push([el.id, { y: cy - b.h / 2 }]));
    }
    updates.forEach(([id, patch], i) => state.updateElement(id, patch, i === 0));
  }

  function distributeSelected(dir: 'h' | 'v') {
    if (selectedEls.length < 3) return;
    const bbs = selectedEls.map((el) => ({ el, b: getElementBounds(el) }));
    const updates: Array<[string, Partial<CanvasElement>]> = [];
    if (dir === 'h') {
      const sorted = [...bbs].sort((a, b) => a.b.x - b.b.x);
      const span = sorted.at(-1)!.b.x + sorted.at(-1)!.b.w - sorted[0].b.x;
      const totalW = sorted.reduce((s, { b }) => s + b.w, 0);
      const gap = (span - totalW) / (sorted.length - 1);
      let cursor = sorted[0].b.x + sorted[0].b.w + gap;
      sorted.slice(1, -1).forEach(({ el, b }) => { updates.push([el.id, { x: cursor }]); cursor += b.w + gap; });
    } else {
      const sorted = [...bbs].sort((a, b) => a.b.y - b.b.y);
      const span = sorted.at(-1)!.b.y + sorted.at(-1)!.b.h - sorted[0].b.y;
      const totalH = sorted.reduce((s, { b }) => s + b.h, 0);
      const gap = (span - totalH) / (sorted.length - 1);
      let cursor = sorted[0].b.y + sorted[0].b.h + gap;
      sorted.slice(1, -1).forEach(({ el, b }) => { updates.push([el.id, { y: cursor }]); cursor += b.h + gap; });
    }
    updates.forEach(([id, patch], i) => state.updateElement(id, patch, i === 0));
  }

  function captureStage(
    mimeType: 'image/png' | 'image/jpeg',
    pixelRatio: number,
    quality: number,
    forceTransparent = false,
  ) {
    const stage = stageRef.current;
    if (!stage) return null;
    const background = stage.findOne(`#${CANVAS_BACKGROUND_ID}`);
    const fill = getExportBackground(state.backgroundMode, mimeType, forceTransparent);
    return withTemporaryBackground(background, fill, () => stage.toDataURL({ pixelRatio, mimeType, quality }));
  }

  function exportSvg() {
    const dataUrl = captureStage('image/png', 2, 1);
    if (dataUrl) {
      const name = state.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint';
      downloadSvg(dataUrl, state.width, state.height, `${name}.svg`);
    }
  }

  async function uploadImage(file: File | undefined) {
    if (!file || !canAddImage) return;
    try {
      const src = await fileToDataUrl(file);
      const size = await dataUrlToImageSize(src);
      const ratio = Math.min(1, 520 / Math.max(size.width, size.height));
      const element: ImageElement = {
        id: crypto.randomUUID(),
        layerId: state.activeLayerId,
        type: 'image',
        src,
        x: 160,
        y: 120,
        width: Math.round(size.width * ratio),
        height: Math.round(size.height * ratio),
        stroke: '#00000000',
        fill: '#00000000',
        strokeWidth: 0,
      };
      state.addElement(element);
      state.setSelectedElementId(element.id);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import image.');
    }
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    try {
      const project = await readJsonFile(file);
      state.loadProject(project);
      await state.saveCurrentProject();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Unable to import project.');
    }
  }

  function exportImage(mimeType: 'image/png' | 'image/jpeg', transparent = false) {
    const dataUrl = captureStage(mimeType, 3, 0.92, transparent);
    if (!dataUrl) return;
    const ext = mimeType === 'image/png' ? 'png' : 'jpg';
    downloadDataUrl(dataUrl, `${state.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint'}@3x.${ext}`);
  }

  function exportPdf() {
    const dataUrl = captureStage('image/jpeg', 2, 0.9);
    if (dataUrl) downloadPdfFromDataUrl(dataUrl, `${state.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint'}.pdf`);
  }

  function clearCanvas() {
    if (!window.confirm('Clear everything on the current canvas?')) return;
    if (!window.confirm('This will remove all elements and reset the page. Continue?')) return;
    state.clearCanvas();
  }

  function runExport(action: () => void) {
    try {
      action();
    } finally {
      setExportOpen(false);
    }
  }

  const selOpacity = selectedEls[0]?.opacity ?? 1;
  const selDashRaw = selectedEls[0]?.dash;
  const selDashStr = JSON.stringify(selDashRaw ?? []);
  const activeDash: StrokeDash = (Object.keys(DASH_MAP) as StrokeDash[]).find((k) => JSON.stringify(DASH_MAP[k]) === selDashStr) ?? 'solid';
  const hasStickySelected = selectedEls.some((e) => isStickyLike(e.type));

  const exportItems = [
    { label: 'PNG @3x', action: () => exportImage('image/png') },
    { label: 'Transparent PNG', action: () => exportImage('image/png', true) },
    { label: 'JPEG @3x', action: () => exportImage('image/jpeg') },
    { label: 'SVG', action: exportSvg },
    { label: 'PDF', action: exportPdf },
    { label: 'Project JSON', action: () => downloadJson(state.toProject()) },
  ];

  return (
    <header className="flex shrink-0 flex-col gap-1.5 border-b border-line bg-panel px-4 py-2 shadow-[0_1px_0_rgba(255,255,255,0.75)]">

      {/* Row 1 — drawing controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="Project name"
          className="w-44 min-w-0 rounded-md border border-line bg-paper px-3 py-1.5 text-sm font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          value={state.name}
          onChange={(e) => state.setName(e.target.value)}
        />
        <div className="h-5 w-px bg-line" />

        <div className="flex items-center gap-2">
          <ColorPicker label="Stroke" value={state.strokeColor} recent={state.recentColors} onChange={handleStrokeChange} />
          <ColorPicker label="Fill" value={selectedText?.fill ?? state.fillColor} recent={state.recentColors} onChange={handleFillChange} />
          {hasSelection && (
            <span className="rounded border border-accent/30 bg-paper px-1.5 py-0.5 text-[10px] font-medium text-accent">→ sel</span>
          )}
        </div>
        <div className="h-5 w-px bg-line" />

        {showTextControls ? (
          <>
            <select
              aria-label="Font family"
              className="rounded-md border border-line bg-paper px-2 py-1.5 text-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              value={textFontFamily}
              onChange={(e) => handleFontFamily(e.target.value)}
            >
              <option value="Inter, sans-serif">Inter</option>
              <option value="Georgia, serif">Georgia</option>
              <option value="'Courier New', monospace">Courier</option>
              <option value="Verdana, sans-serif">Verdana</option>
            </select>
            <input
              aria-label="Font size"
              className="w-16 rounded-md border border-line bg-paper px-2 py-1.5 text-xs outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              type="number" min="10" max="96" step="2"
              value={textFontSize}
              onChange={(e) => handleFontSize(Number(e.target.value))}
            />
            <button
              aria-label="Bold" aria-pressed={textBold} title="Bold"
              className={`icon-button h-8 w-8 font-bold ${textBold ? 'border-accent bg-paper text-accent' : ''}`}
              onClick={() => handleBold(!textBold, textItalic)}
            >B</button>
            <button
              aria-label="Italic" aria-pressed={textItalic} title="Italic"
              className={`icon-button h-8 w-8 italic ${textItalic ? 'border-accent bg-paper text-accent' : ''}`}
              onClick={() => handleItalic(!textItalic, textBold)}
            >I</button>
            <div className="flex items-center gap-0.5 rounded-md border border-line bg-paper p-0.5">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  aria-label={`Text align ${align}`}
                  aria-pressed={textAlign === align}
                  title={`Text align ${align}`}
                  className={`icon-button h-7 w-7 border-transparent ${
                    textAlign === align ? 'bg-paper text-accent' : ''
                  }`}
                  onClick={() => handleTextAlign(align)}
                >
                  {align === 'left' ? (
                    <AlignLeft size={14} />
                  ) : align === 'center' ? (
                    <AlignCenter size={14} />
                  ) : (
                    <AlignRight size={14} />
                  )}
                </button>
              ))}
            </div>
          </>
        ) : state.tool === 'fill' ? (
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-ink">
            Fill tolerance
            <input
              aria-label="Fill tolerance"
              className="w-24 accent-accent"
              type="range" min="0" max="96" step="4"
              value={state.fillTolerance}
              onChange={(e) => state.setFillTolerance(Number(e.target.value))}
            />
            <span className="w-7 tabular-nums">{state.fillTolerance}</span>
          </label>
        ) : (
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-ink">
            Brush
            <input
              aria-label="Brush size"
              className="w-24 accent-accent"
              type="range" min="1" max="48"
              value={state.brushSize}
              onChange={(e) => state.setBrushSize(Number(e.target.value))}
            />
            <span className="w-5 tabular-nums">{state.brushSize}</span>
          </label>
        )}
        <div className="h-5 w-px bg-line" />

        <label className="flex items-center gap-1.5 text-xs font-medium text-ink" title="Show grid">
          <input type="checkbox" className="accent-accent" checked={state.showGrid} onChange={(e) => state.setShowGrid(e.target.checked)} />
          <Grid2X2 size={13} />
        </label>
        <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
          <input type="checkbox" className="accent-accent" checked={state.snapToGrid} onChange={(e) => state.setSnapToGrid(e.target.checked)} />
          Snap
        </label>
      </div>

      {/* Style row — opacity + stroke dash, only when elements are selected */}
      {hasSelection && (
        <div className="flex items-center gap-3">
          <label className="flex shrink-0 items-center gap-2 text-xs font-medium text-ink">
            Opacity
            <input type="range" min="0.1" max="1" step="0.05" className="w-20 accent-accent"
              value={selOpacity}
              onChange={(e) => handleOpacity(Number(e.target.value))}
            />
            <span className="w-7 tabular-nums">{Math.round(selOpacity * 100)}%</span>
          </label>
          <div className="h-4 w-px bg-line" />
          <span className="text-xs font-medium text-ink/60">Stroke</span>
          <div className="flex items-center gap-0.5 rounded border border-line bg-paper p-0.5">
            {(['solid', 'dashed', 'dotted'] as const).map((d) => (
              <button key={d} title={d} aria-pressed={activeDash === d}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition ${activeDash === d ? 'bg-accent text-panel' : 'text-ink hover:bg-panel'}`}
                onClick={() => handleDash(d)}
              >
                {d === 'solid' ? '—' : d === 'dashed' ? '╌' : '···'}
              </button>
            ))}
          </div>
          {hasStickySelected && (
            <>
              <div className="h-4 w-px bg-line" />
              <span className="text-[10px] font-medium text-ink/60">Note</span>
              <div className="flex items-center gap-1">
                {STICKY_COLORS.map((c) => (
                  <button
                    key={c}
                    title={c}
                    aria-label={`Note color ${c}`}
                    className="h-5 w-5 rounded border border-line shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06)] transition hover:border-accent"
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      state.setFillColor(c);
                      selectedEls
                        .filter((e) => isStickyLike(e.type))
                        .forEach((el, i) => state.updateElement(el.id, { fill: c }, i === 0));
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Row 2 — actions */}
      <div
        role="toolbar"
        aria-label="Canvas actions"
        className="flex max-w-full items-center gap-1 overflow-x-auto pb-1"
      >
        <button className="icon-button h-8 w-8" title="Undo (Ctrl+Z)" aria-label="Undo" onClick={state.undo} disabled={!state.history.length}>
          <Undo2 size={15} />
        </button>
        <button className="icon-button h-8 w-8" title="Redo (Ctrl+Y)" aria-label="Redo" onClick={state.redo} disabled={!state.future.length}>
          <Redo2 size={15} />
        </button>
        {state.selectedElementId && selectedEls.length === 1 && (
          <>
            <div className="mx-1 h-5 w-px bg-line" />
            <button className="icon-button h-8 w-8" title="Bring to front" aria-label="Bring to front" onClick={() => state.moveElementToFront(state.selectedElementId!)}><ChevronsUp size={14} /></button>
            <button className="icon-button h-8 w-8" title="Bring forward" aria-label="Bring forward" onClick={() => state.moveElementForward(state.selectedElementId!)}><ChevronUp size={14} /></button>
            <button className="icon-button h-8 w-8" title="Send backward" aria-label="Send backward" onClick={() => state.moveElementBackward(state.selectedElementId!)}><ChevronDown size={14} /></button>
            <button className="icon-button h-8 w-8" title="Send to back" aria-label="Send to back" onClick={() => state.moveElementToBack(state.selectedElementId!)}><ChevronsDown size={14} /></button>
          </>
        )}
        <div className="mx-1 h-5 w-px bg-line" />
        <button className="icon-button h-8 w-8" title="Upload image" aria-label="Upload image" onClick={() => imageInputRef.current?.click()} disabled={!canAddImage}>
          <ImagePlus size={15} />
        </button>
        <button className="icon-button h-8 w-8" title="Save (Ctrl+S)" aria-label="Save" onClick={state.saveCurrentProject}>
          <Save size={15} />
        </button>
        <button className="icon-button h-8 w-8 hover:border-coral hover:bg-coral/10 hover:text-coral" title="Clear canvas" aria-label="Clear canvas" onClick={clearCanvas}>
          <Trash2 size={15} />
        </button>
        <BackgroundMenu value={state.backgroundMode} onChange={state.setBackgroundMode} />
        <div className="mx-1 h-5 w-px bg-line" />
        <div ref={exportRef} className="relative">
          <button
            ref={exportButtonRef}
            aria-label="Export"
            aria-controls="export-formats-menu"
            aria-expanded={exportOpen}
            aria-haspopup="menu"
            className="flex h-8 cursor-pointer select-none items-center gap-1.5 rounded-md border border-line bg-panel px-2.5 text-xs font-medium text-ink transition hover:border-accent hover:text-accent"
            onClick={() => setExportOpen((open) => !open)}
          >
            <Download size={14} /> Export <ChevronDown size={12} />
          </button>
          {exportOpen && createPortal(
            <div
              ref={exportMenuRef}
              id="export-formats-menu"
              role="menu"
              aria-label="Export formats"
              className="fixed z-[100] min-w-44 overflow-hidden rounded-md border border-line bg-panel py-1 shadow-soft"
              style={exportMenuPosition}
            >
              {exportItems.map(({ label, action }) => (
                <button
                  key={label}
                  role="menuitem"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-paper"
                  onClick={() => runExport(action)}
                >
                  {label}
                </button>
              ))}
            </div>
          , document.body)}
        </div>
        <button className="icon-button h-8 w-8" title="Import JSON" aria-label="Import JSON" onClick={() => jsonInputRef.current?.click()}>
          <FileUp size={15} />
        </button>
        <div className="mx-1 h-5 w-px bg-line" />
        <button className="icon-button h-8 w-8" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
          <Settings size={15} />
        </button>
      </div>

      {/* Row 3 — align + distribute (multi-select only) */}
      {selectedEls.length > 1 && (
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[10px] font-medium text-ink/50">Align</span>
          <button className="icon-button h-7 w-7" title="Align left" aria-label="Align left" onClick={() => alignSelected('left')}><AlignLeft size={13} /></button>
          <button className="icon-button h-7 w-7" title="Align center" aria-label="Align center" onClick={() => alignSelected('center')}><AlignCenter size={13} /></button>
          <button className="icon-button h-7 w-7" title="Align right" aria-label="Align right" onClick={() => alignSelected('right')}><AlignRight size={13} /></button>
          <div className="mx-1 h-4 w-px bg-line" />
          <button className="icon-button h-7 w-7" title="Align top" aria-label="Align top" onClick={() => alignSelected('top')}><AlignStartVertical size={13} /></button>
          <button className="icon-button h-7 w-7" title="Align middle" aria-label="Align middle" onClick={() => alignSelected('middle')}><AlignCenterVertical size={13} /></button>
          <button className="icon-button h-7 w-7" title="Align bottom" aria-label="Align bottom" onClick={() => alignSelected('bottom')}><AlignEndVertical size={13} /></button>
          {selectedEls.length > 2 && (
            <>
              <div className="mx-1 h-4 w-px bg-line" />
              <span className="mr-1 text-[10px] font-medium text-ink/50">Distribute</span>
              <button className="icon-button h-7 w-7" title="Distribute horizontally" aria-label="Distribute horizontally" onClick={() => distributeSelected('h')}><AlignHorizontalSpaceBetween size={13} /></button>
              <button className="icon-button h-7 w-7" title="Distribute vertically" aria-label="Distribute vertically" onClick={() => distributeSelected('v')}><AlignVerticalSpaceBetween size={13} /></button>
            </>
          )}
        </div>
      )}

      <input ref={imageInputRef} className="hidden" type="file" accept="image/*" onChange={(e) => void uploadImage(e.target.files?.[0])} />
      <input ref={jsonInputRef} className="hidden" type="file" accept="application/json" onChange={(e) => void importJson(e.target.files?.[0])} />
    </header>
  );
}
