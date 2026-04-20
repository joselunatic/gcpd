import PoiMapPicker from './PoiMapPicker';

const PoiQuickCreateModal = ({
  open = false,
  draft,
  setDraft,
  onClose,
  onSave,
  onOpenFullEditor,
  saving = false,
  error = '',
  mapProps,
  labelRow,
  onClamp,
  mapGridStep,
}) => {
  if (!open) return null;

  return (
    <div className="dm-panel__modal">
      <div className="dm-panel__modal-backdrop" onClick={onClose} />
      <div className="dm-panel__modal-card dm-panel__modal-card--poi-quick">
        <div className="dm-panel__modal-header">
          <strong>Nuevo POI</strong>
          <button type="button" className="dm-panel__ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="dm-panel__form dm-panel__form--compact">
          <div className="dm-panel__form-grid dm-panel__form-grid--two">
            <label>
              {labelRow('Nombre', 'Nombre visible del POI.')}
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
              />
            </label>
            <label>
              {labelRow('Distrito', 'Zona general del mapa.')}
              <input
                type="text"
                value={draft.district}
                onChange={(e) => setDraft((prev) => ({ ...prev, district: e.target.value }))}
              />
            </label>
          </div>
          <label>
            {labelRow('Label mapa', 'Texto corto del marcador.')}
            <input
              type="text"
              value={draft.mapLabel}
              onChange={(e) => setDraft((prev) => ({ ...prev, mapLabel: e.target.value }))}
            />
          </label>

          <div className="dm-panel__map-picker dm-panel__map-picker--compact">
            <PoiMapPicker
              {...mapProps}
              values={{
                x: draft.mapX,
                y: draft.mapY,
                radius: draft.mapRadius,
                label: draft.mapLabel,
              }}
              onValueChange={(next = {}) =>
                setDraft((prev) => ({
                  ...prev,
                  mapX: next.mapX !== undefined ? next.mapX : prev.mapX,
                  mapY: next.mapY !== undefined ? next.mapY : prev.mapY,
                  mapRadius: next.mapRadius !== undefined ? next.mapRadius : prev.mapRadius,
                  mapLabel: next.mapLabel !== undefined ? next.mapLabel : prev.mapLabel,
                }))
              }
              onClamp={onClamp}
              mapGridStep={mapGridStep}
              mapFineOpen
              onToggleMapFine={() => {}}
              labelRow={labelRow}
              onClearCoords={() =>
                setDraft((prev) => ({
                  ...prev,
                  mapX: '',
                  mapY: '',
                  mapLabel: '',
                }))
              }
            />
          </div>

          {error ? <p className="dm-panel__error">{error}</p> : null}

          <div className="dm-panel__form-actions">
            <button type="button" className="dm-panel__ghost" onClick={() => onOpenFullEditor?.(draft)}>
              Abrir editor completo
            </button>
            <button type="button" className="dm-panel__ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="button" onClick={onSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar y usar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoiQuickCreateModal;
