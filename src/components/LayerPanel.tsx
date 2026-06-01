import { ChevronDown, ChevronUp, Eye, EyeOff, Lock, Plus, Trash2, Unlock } from 'lucide-react';
import { useEditorStore } from '../store/useEditorStore';

export function LayerPanel() {
  const {
    layers,
    activeLayerId,
    addLayer,
    renameLayer,
    deleteLayer,
    toggleLayerLock,
    toggleLayerVisibility,
    moveLayer,
    setActiveLayerId,
  } = useEditorStore();

  return (
    <aside className="flex w-72 flex-col border-l border-line bg-panel">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-ink">Layers</h2>
        <button className="icon-button" aria-label="Add layer" title="Add layer" onClick={addLayer}>
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 space-y-2 overflow-auto p-3">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className={`rounded-md border bg-white p-2 ${activeLayerId === layer.id ? 'border-accent' : 'border-line'}`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <div className="flex items-center gap-2">
              <input
                aria-label={`Rename ${layer.name}`}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-1 text-sm font-medium outline-none focus:border-accent"
                value={layer.name}
                onChange={(event) => renameLayer(layer.id, event.target.value)}
              />
              <button className="icon-button h-8 w-8" aria-label="Toggle layer visibility" onClick={() => toggleLayerVisibility(layer.id)}>
                {layer.visible ? <Eye size={15} /> : <EyeOff size={15} />}
              </button>
              <button className="icon-button h-8 w-8" aria-label="Toggle layer lock" onClick={() => toggleLayerLock(layer.id)}>
                {layer.locked ? <Lock size={15} /> : <Unlock size={15} />}
              </button>
            </div>
            <div className="mt-2 flex justify-end gap-1">
              <button className="icon-button h-8 w-8" aria-label="Move layer up" onClick={() => moveLayer(layer.id, 'up')}>
                <ChevronUp size={15} />
              </button>
              <button className="icon-button h-8 w-8" aria-label="Move layer down" onClick={() => moveLayer(layer.id, 'down')}>
                <ChevronDown size={15} />
              </button>
              <button className="icon-button h-8 w-8" aria-label="Delete layer" onClick={() => deleteLayer(layer.id)} disabled={layers.length === 1}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
