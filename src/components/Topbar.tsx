import type Konva from 'konva';
import { Download, FileDown, FileImage, FileText, FileUp, Grid2X2, ImagePlus, Redo2, Save, Settings, Trash2, Undo2 } from 'lucide-react';
import { useRef, type RefObject } from 'react';
import { useEditorStore } from '../store/useEditorStore';
import { dataUrlToImageSize, fileToDataUrl } from '../utils/clipboardUtils';
import { downloadDataUrl, downloadJson, downloadPdfFromDataUrl, readJsonFile } from '../utils/exportUtils';
import type { ImageElement } from '../types/editor';

interface TopbarProps {
  stageRef: RefObject<Konva.Stage | null>;
  onOpenSettings: () => void;
}

export function Topbar({ stageRef, onOpenSettings }: TopbarProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const state = useEditorStore();
  const activeLayer = state.layers.find((layer) => layer.id === state.activeLayerId);
  const canAddImage = activeLayer?.visible && !activeLayer.locked;

  async function uploadImage(file: File | undefined) {
    if (!file || !canAddImage) return;
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
  }

  async function importJson(file: File | undefined) {
    if (!file) return;
    const project = await readJsonFile(file);
    state.loadProject(project);
    await state.saveCurrentProject();
  }

  function exportImage(mimeType: 'image/png' | 'image/jpeg', transparent = false) {
    const stage = stageRef.current;
    if (!stage) return;
    const oldFill = stage.findOne('Rect')?.attrs.fill;
    if (transparent) stage.findOne('Rect')?.setAttr('fill', '#00000000');
    const dataUrl = stage.toDataURL({ pixelRatio: 3, mimeType, quality: 0.92 });
    if (transparent) stage.findOne('Rect')?.setAttr('fill', oldFill);
    const extension = mimeType === 'image/png' ? 'png' : 'jpg';
    downloadDataUrl(dataUrl, `${state.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint'}@3x.${extension}`);
  }

  function exportPdf() {
    const dataUrl = stageRef.current?.toDataURL({ pixelRatio: 2, mimeType: 'image/jpeg', quality: 0.9 });
    if (dataUrl) downloadPdfFromDataUrl(dataUrl, `${state.name.replace(/\s+/g, '-').toLowerCase() || 'mind-paint'}.pdf`);
  }

  function clearCanvas() {
    const firstConfirm = window.confirm('Clear everything on the current canvas?');
    if (!firstConfirm) return;
    const secondConfirm = window.confirm('This will remove all elements and reset the page. Continue?');
    if (!secondConfirm) return;
    state.clearCanvas();
  }

  return (
    <header className="flex min-h-16 items-center gap-3 border-b border-line bg-panel px-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          aria-label="Project name"
          className="w-56 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none focus:border-accent"
          value={state.name}
          onChange={(event) => state.setName(event.target.value)}
        />
        <label className="flex items-center gap-2 text-xs font-medium text-ink">
          Stroke
          <input aria-label="Stroke color" type="color" value={state.strokeColor} onChange={(event) => state.setStrokeColor(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink">
          Fill
          <input aria-label="Fill color" type="color" value={state.fillColor} onChange={(event) => state.setFillColor(event.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink">
          Brush
          <input
            aria-label="Brush size"
            className="w-28 accent-accent"
            type="range"
            min="1"
            max="48"
            value={state.brushSize}
            onChange={(event) => state.setBrushSize(Number(event.target.value))}
          />
          <span className="w-6 tabular-nums">{state.brushSize}</span>
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink">
          <input aria-label="Show grid" type="checkbox" checked={state.showGrid} onChange={(event) => state.setShowGrid(event.target.checked)} />
          <Grid2X2 size={14} />
        </label>
        <label className="flex items-center gap-2 text-xs font-medium text-ink">
          <input aria-label="Snap to grid" type="checkbox" checked={state.snapToGrid} onChange={(event) => state.setSnapToGrid(event.target.checked)} />
          Snap
        </label>
        <select
          aria-label="Font family"
          className="rounded-md border border-line bg-white px-2 py-2 text-xs outline-none focus:border-accent"
          value={state.fontFamily}
          onChange={(event) => state.setFontFamily(event.target.value)}
        >
          <option value="Inter, sans-serif">Inter</option>
          <option value="Georgia, serif">Georgia</option>
          <option value="'Courier New', monospace">Courier</option>
          <option value="Verdana, sans-serif">Verdana</option>
        </select>
        <input
          aria-label="Font size"
          className="w-16 rounded-md border border-line bg-white px-2 py-2 text-xs outline-none focus:border-accent"
          type="number"
          min="10"
          max="96"
          value={state.fontSize}
          onChange={(event) => state.setFontSize(Number(event.target.value))}
        />
        <button className={`icon-button ${state.bold ? 'border-accent text-accent' : ''}`} title="Bold" aria-label="Bold" onClick={() => state.setBold(!state.bold)}>
          <strong>B</strong>
        </button>
        <button className={`icon-button ${state.italic ? 'border-accent text-accent' : ''}`} title="Italic" aria-label="Italic" onClick={() => state.setItalic(!state.italic)}>
          <em>I</em>
        </button>
      </div>

      <button className="icon-button" title="Undo" aria-label="Undo" onClick={state.undo} disabled={!state.history.length}>
        <Undo2 size={17} />
      </button>
      <button className="icon-button" title="Redo" aria-label="Redo" onClick={state.redo} disabled={!state.future.length}>
        <Redo2 size={17} />
      </button>
      <button className="icon-button" title="Upload image" aria-label="Upload image" onClick={() => imageInputRef.current?.click()} disabled={!canAddImage}>
        <ImagePlus size={17} />
      </button>
      <button className="icon-button" title="Save" aria-label="Save" onClick={state.saveCurrentProject}>
        <Save size={17} />
      </button>
      <button className="icon-button" title="Clear canvas" aria-label="Clear canvas" onClick={clearCanvas}>
        <Trash2 size={17} />
      </button>
      <button className="icon-button" title="Export PNG @3x" aria-label="Export PNG" onClick={() => exportImage('image/png')}>
        <Download size={17} />
      </button>
      <button className="icon-button" title="Export transparent PNG @3x" aria-label="Export transparent PNG" onClick={() => exportImage('image/png', true)}>
        <FileImage size={17} />
      </button>
      <button className="icon-button" title="Export JPEG @3x" aria-label="Export JPEG" onClick={() => exportImage('image/jpeg')}>
        <FileImage size={17} />
      </button>
      <button className="icon-button" title="Export PDF" aria-label="Export PDF" onClick={exportPdf}>
        <FileText size={17} />
      </button>
      <button className="icon-button" title="Export JSON" aria-label="Export JSON" onClick={() => downloadJson(state.toProject())}>
        <FileDown size={17} />
      </button>
      <button className="icon-button" title="Import JSON" aria-label="Import JSON" onClick={() => jsonInputRef.current?.click()}>
        <FileUp size={17} />
      </button>
      <button className="icon-button" title="Settings" aria-label="Settings" onClick={onOpenSettings}>
        <Settings size={17} />
      </button>

      <input ref={imageInputRef} className="hidden" type="file" accept="image/*" onChange={(event) => void uploadImage(event.target.files?.[0])} />
      <input ref={jsonInputRef} className="hidden" type="file" accept="application/json" onChange={(event) => void importJson(event.target.files?.[0])} />
    </header>
  );
}
