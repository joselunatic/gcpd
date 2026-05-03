const RESOURCE_TYPES = [
  { value: 'image', label: 'Imagen' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'document', label: 'Documento' },
];

const VISIBILITY_OPTIONS = [
  { value: 'listed', label: 'Listado / visible' },
  { value: 'public', label: 'Publico' },
  { value: 'hidden', label: 'Oculto agentes' },
];

const RESOURCE_ACCEPT = '.png,.jpg,.jpeg,.webp,.gif,.avif,.mp4,.webm,.mov,.m4v,.mp3,.wav,.ogg,.m4a,.pdf';

const mediaPreview = (resource) => {
  if (!resource.src) return null;
  if (resource.type === 'image') {
    return <img src={resource.thumbnail || resource.src} alt={resource.label || 'Recurso POI'} />;
  }
  if (resource.type === 'video') {
    return <video src={resource.src} poster={resource.poster || resource.thumbnail || ''} controls />;
  }
  if (resource.type === 'audio') {
    return <audio src={resource.src} controls />;
  }
  return <span className="dm-panel__poi-resource-file">{resource.src.split('/').pop()}</span>;
};

const PoiResourceEditor = ({
  resources = [],
  onAdd,
  onChange,
  onRemove,
  onMove,
  onUpload,
  uploadingId = '',
  uploadError = '',
}) => {
  return (
    <div className="dm-panel__poi-resources">
      <div className="dm-panel__poi-resource-toolbar">
        <p className="dm-panel__hint">
          Recursos usados por Quest mapa. Guardar POI persiste el listado.
        </p>
        <button type="button" className="dm-panel__ghost" onClick={onAdd}>
          Añadir recurso
        </button>
      </div>
      {uploadError && <p className="dm-panel__error">{uploadError}</p>}

      {!resources.length && (
        <div className="dm-panel__map-media-card dm-panel__map-media-card--empty">
          <p className="dm-panel__hint">Sin recursos asociados.</p>
        </div>
      )}

      {resources.map((resource, index) => (
        <div key={resource.id} className="dm-panel__map-media-card dm-panel__poi-resource-card">
          <div className="dm-panel__poi-resource-header">
            <strong>{resource.label || resource.title || `Recurso ${index + 1}`}</strong>
            <div className="dm-panel__map-media-actions">
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={() => onMove(resource.id, -1)}
                disabled={index === 0}
              >
                ↑
              </button>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={() => onMove(resource.id, 1)}
                disabled={index === resources.length - 1}
              >
                ↓
              </button>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={() => onRemove(resource.id)}
              >
                Eliminar
              </button>
            </div>
          </div>

          <div className="dm-panel__poi-resource-preview">{mediaPreview(resource)}</div>

          <div className="dm-panel__form-grid dm-panel__form-grid--two dm-panel__form-grid--compact">
            <label className="dm-panel__field dm-panel__field--compact">
              <span>Label</span>
              <input
                type="text"
                value={resource.label || ''}
                onChange={(event) =>
                  onChange(resource.id, {
                    label: event.target.value,
                    title: event.target.value,
                  })
                }
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              <span>Tipo</span>
              <select
                value={resource.type || 'document'}
                onChange={(event) => onChange(resource.id, { type: event.target.value })}
              >
                {RESOURCE_TYPES.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              <span>URL / src</span>
              <input
                type="text"
                value={resource.src || ''}
                onChange={(event) => onChange(resource.id, { src: event.target.value })}
                placeholder="/api/uploads/poi-resources/archivo.mp4"
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              <span>Thumbnail / poster</span>
              <input
                type="text"
                value={resource.thumbnail || resource.poster || ''}
                onChange={(event) =>
                  onChange(resource.id, {
                    thumbnail: event.target.value,
                    poster: event.target.value,
                  })
                }
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              <span>Visibilidad</span>
              <select
                value={resource.visibility || 'listed'}
                onChange={(event) =>
                  onChange(resource.id, {
                    visibility: event.target.value,
                    visible: event.target.value !== 'hidden',
                  })
                }
              >
                {VISIBILITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              <span>Archivo</span>
              <input
                type="file"
                accept={RESOURCE_ACCEPT}
                disabled={uploadingId === resource.id}
                onChange={(event) => onUpload(resource.id, event.target.files?.[0] || null)}
              />
            </label>
          </div>

          <label className="dm-panel__field dm-panel__field--compact">
            <span>Descripcion</span>
            <textarea
              className="dm-panel__textarea--compact"
              value={resource.description || ''}
              onChange={(event) => onChange(resource.id, { description: event.target.value })}
            />
          </label>

          {uploadingId === resource.id && <p className="dm-panel__hint">Subiendo archivo...</p>}
        </div>
      ))}
    </div>
  );
};

export default PoiResourceEditor;
