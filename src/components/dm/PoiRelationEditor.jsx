import { useEffect, useMemo, useRef, useState } from 'react';
import PoiPicker from './PoiPicker';

const defaultRow = { poiId: '', role: 'related' };

const normalizeRows = (rows = []) =>
  (Array.isArray(rows) ? rows : []).map((entry) => ({
    poiId: entry?.poiId || '',
    role: entry?.role || 'related',
    type: 'poi',
  }));

const serializeRows = (rows = []) =>
  JSON.stringify(
    normalizeRows(rows).map((entry) => ({
      poiId: entry.poiId,
      role: entry.role,
    }))
  );

const PoiRelationEditor = ({
  value = [],
  onChange,
  pois = [],
  roleOptions = [],
  onCreatePoi,
  onEditPoi,
  label = 'POIs relacionados',
}) => {
  const externalRows = useMemo(() => normalizeRows(value), [value]);
  const externalSignature = useMemo(() => serializeRows(externalRows), [externalRows]);
  const lastExternalSignatureRef = useRef(externalSignature);
  const [rows, setRows] = useState(externalRows);

  useEffect(() => {
    if (externalSignature === lastExternalSignatureRef.current) return;
    lastExternalSignatureRef.current = externalSignature;
    setRows(externalRows);
  }, [externalRows, externalSignature]);

  const emit = (nextRows) => {
    setRows(nextRows);
    onChange?.(nextRows.filter((entry) => entry.poiId));
  };

  const updateRow = (index, patch) => {
    const next = rows.map((entry, rowIndex) =>
      rowIndex === index ? { ...entry, ...patch } : entry
    );
    emit(next);
  };

  const addRow = () => {
    emit([...rows, { ...defaultRow }]);
  };

  const removeRow = (index) => {
    emit(rows.filter((_, rowIndex) => rowIndex !== index));
  };

  return (
    <div className="dm-panel__relation-editor">
      <div className="dm-panel__field-label">{label}</div>
      <div className="dm-panel__relation-list">
        {rows.length ? (
          rows.map((entry, index) => (
            <div key={`${entry.poiId || 'draft'}-${index}`} className="dm-panel__relation-row">
              <PoiPicker
                value={entry.poiId}
                pois={pois}
                onChange={(poiId) => updateRow(index, { poiId })}
                onCreate={onCreatePoi}
                onEdit={onEditPoi}
                allowClear
                emptyLabel="Selecciona POI"
              />
              <label>
                <span className="dm-panel__field-label">Rol</span>
                <select
                  value={entry.role || 'related'}
                  onChange={(e) => updateRow(index, { role: e.target.value })}
                >
                  {roleOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="danger" onClick={() => removeRow(index)}>
                Eliminar
              </button>
            </div>
          ))
        ) : (
          <p className="dm-panel__hint">Sin POIs relacionados.</p>
        )}
      </div>
      <div className="dm-panel__form-actions">
        <button type="button" className="dm-panel__ghost" onClick={addRow}>
          + Añadir POI
        </button>
      </div>
    </div>
  );
};

export default PoiRelationEditor;
