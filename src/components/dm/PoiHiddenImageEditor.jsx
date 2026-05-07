const PoiHiddenImageEditor = ({
  poiId = '',
  images = [],
  form,
  onSelect,
  onReset,
  onChange,
  onUpload,
  onSave,
  onDelete,
  loading = false,
  uploading = false,
  message = '',
  labelRow,
}) => {
  if (!poiId) {
    return (
      <div className="dm-panel__map-media-card dm-panel__map-media-card--empty">
        <p className="dm-panel__hint">Guarda el POI primero para asociar imagenes ocultas.</p>
      </div>
    );
  }

  return (
    <div className="dm-panel__poi-resources">
      <div className="dm-panel__poi-resource-toolbar">
        <p className="dm-panel__hint">
          Imagenes ocultas solo accesibles con <code>SHOW IMAGE &lt;CODIGO&gt;</code>.
        </p>
        <button type="button" className="dm-panel__ghost" onClick={onReset}>
          Nueva imagen oculta
        </button>
      </div>

      {!!images.length && (
        <div className="dm-panel__poi-resource-list">
          {images.map((image) => {
            const active = image.id && form.id === image.id;
            return (
              <div key={image.id} className="dm-panel__map-media-card dm-panel__poi-resource-card">
                <div className="dm-panel__poi-resource-header">
                  <button
                    type="button"
                    className="dm-panel__ghost"
                    onClick={() => onSelect(image)}
                  >
                    {active ? 'Editando' : 'Editar'}
                  </button>
                  <div className="dm-panel__map-media-actions">
                    <strong>{image.label || image.command}</strong>
                    <span className="dm-panel__hint">
                      {image.command} · {image.enabled ? 'ON' : 'OFF'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!images.length && (
        <div className="dm-panel__map-media-card dm-panel__map-media-card--empty">
          <p className="dm-panel__hint">No hay imagenes ocultas para este POI.</p>
        </div>
      )}

      <div className="dm-panel__map-media-card dm-panel__poi-resource-card">
        <div className="dm-panel__poi-resource-header">
          <strong>{form.id ? 'Editar imagen oculta' : 'Nueva imagen oculta'}</strong>
          {form.command ? <span className="dm-panel__hint">{form.command}</span> : null}
        </div>

        {form.imagePath ? (
          <div className="dm-panel__poi-resource-preview">
            <img src={form.imagePath} alt={form.label || 'Imagen oculta'} />
          </div>
        ) : null}

        <div className="dm-panel__form-grid dm-panel__form-grid--two dm-panel__form-grid--compact">
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Label DM', 'Etiqueta visible solo en panel DM.')}
            <input
              type="text"
              value={form.label}
              onChange={(event) => onChange({ label: event.target.value })}
            />
          </label>
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Codigo exacto', 'Token que el jugador usara en SHOW IMAGE <CODIGO>.')}
            <input
              type="text"
              value={form.command}
              onChange={(event) => onChange({ command: event.target.value })}
              placeholder="Bank011435"
            />
          </label>
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Ruta imagen', 'Se rellena al subir o puede pegarse manualmente.')}
            <input
              type="text"
              value={form.imagePath}
              onChange={(event) => onChange({ imagePath: event.target.value })}
              placeholder="/api/uploads/poi-resources/hidden-image-....png"
            />
          </label>
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Activa', 'Si esta OFF, SHOW IMAGE no revelara la imagen.')}
            <span className="dm-panel__tracer-toggle">
              <input
                type="checkbox"
                checked={Boolean(form.enabled)}
                onChange={(event) => onChange({ enabled: event.target.checked })}
              />
              <span>{form.enabled ? 'Visible por codigo' : 'Deshabilitada'}</span>
            </span>
          </label>
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Archivo', 'Solo PNG/JPG/WEBP.')}
            <input
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              disabled={uploading}
              onChange={(event) => onUpload(event.target.files?.[0] || null)}
            />
          </label>
        </div>

        <label className="dm-panel__field dm-panel__field--compact">
          {labelRow('Notas DM', 'Notas internas no visibles para jugador.')}
          <textarea
            className="dm-panel__textarea--compact"
            value={form.notes}
            onChange={(event) => onChange({ notes: event.target.value })}
          />
        </label>

        <div className="dm-panel__form-actions">
          <button type="button" onClick={onSave} disabled={loading || uploading}>
            {loading ? 'Guardando...' : 'Guardar imagen oculta'}
          </button>
          <button type="button" className="dm-panel__ghost" onClick={onReset}>
            Limpiar
          </button>
          {form.id ? (
            <button type="button" className="danger" onClick={() => onDelete(form.id)} disabled={loading}>
              Eliminar
            </button>
          ) : null}
        </div>

        {message ? <p className="dm-panel__hint">{message}</p> : null}
      </div>
    </div>
  );
};

export default PoiHiddenImageEditor;
