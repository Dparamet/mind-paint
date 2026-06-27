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
    <aside className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-line px-4 py-2.5">
        <h2 className="text-xs font-bold uppercase tracking-wide text-ink/50">Layers</h2>
        <button className="icon-button h-7 w-7" aria-label="Add layer" title="Add layer" onClick={addLayer}>
          <Plus size={14} />
        </button>
      </div>

      <div className="flex-1 space-y-1.5 overflow-auto p-2.5">
        {[...layers].reverse().map((layer) => (
          <div
            key={layer.id}
            className={`rounded-lg border p-2 transition-colors cursor-pointer ${
              activeLayerId === layer.id
                ? 'border-accent/40 bg-accent/5'
                : 'border-line bg-white hover:border-accent/30'
            }`}
            onClick={() => setActiveLayerId(layer.id)}
          >
            <div className="flex items-center gap-1">
              <input
                aria-label={`Rename ${layer.name}`}
                className="min-w-0 flex-1 rounded border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium outline-none focus:border-accent"
                value={layer.name}
                onChange={(e) => renameLayer(layer.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                className={`icon-button h-6 w-6 ${!layer.visible ? 'text-ink/30' : 'opacity-50 hover:opacity-100'}`}
                aria-label="Toggle visibility"
                onClick={(e) => { e.stopPropagation(); toggleLayerVisibility(layer.id); }}
              >
                {layer.visible ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
              <button
                className={`icon-button h-6 w-6 ${layer.locked ? 'border-coral/40 text-coral' : 'opacity-50 hover:opacity-100'}`}
                aria-label="Toggle lock"
                onClick={(e) => { e.stopPropagation(); toggleLayerLock(layer.id); }}
              >
                {layer.locked ? <Lock size={12} /> : <Unlock size={12} />}
              </button>
              <button
                className="icon-button h-6 w-6 opacity-50 hover:opacity-100"
                aria-label="Move layer up"
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'up'); }}
              >
                <ChevronUp size={12} />
              </button>
              <button
                className="icon-button h-6 w-6 opacity-50 hover:opacity-100"
                aria-label="Move layer down"
                onClick={(e) => { e.stopPropagation(); moveLayer(layer.id, 'down'); }}
              >
                <ChevronDown size={12} />
              </button>
              <button
                className="icon-button h-6 w-6 hover:border-coral hover:text-coral disabled:pointer-events-none"
                aria-label="Delete layer"
                onClick={(e) => { e.stopPropagation(); deleteLayer(layer.id); }}
                disabled={layers.length === 1}
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
