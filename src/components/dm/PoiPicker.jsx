import { useMemo, useState } from 'react';
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: ['name', 'label', 'district', 'meta', 'id'],
  threshold: 0.28,
  minMatchCharLength: 2,
  ignoreLocation: true,
  distance: 60,
};

const PoiPicker = ({
  value = '',
  pois = [],
  onChange,
  onCreate,
  onEdit,
  placeholder = 'Buscar POI...',
  allowClear = true,
  label = '',
  createLabel = 'Crear POI',
  emptyLabel = 'Sin POI seleccionado',
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      pois.map((poi) => ({
        id: poi.id,
        name: poi.name || poi.id,
        label: poi.name || poi.id,
        district: poi.district || '',
        meta: [poi.district, poi.poiV2?.hierarchy?.category === 'map' ? 'MAP' : '']
          .filter(Boolean)
          .join(' · '),
        poi,
      })),
    [pois]
  );

  const fuse = useMemo(() => (rows.length ? new Fuse(rows, fuseOptions) : null), [rows]);
  const results = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || !fuse) return rows.slice(0, 10);
    return fuse.search(trimmed).slice(0, 12).map((entry) => entry.item);
  }, [fuse, query, rows]);

  const selected = rows.find((row) => row.id === value) || null;

  const handleSelect = (poiId) => {
    onChange?.(poiId);
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="dm-panel__poi-picker">
      {label ? <div className="dm-panel__field-label">{label}</div> : null}
      <div className="dm-panel__poi-picker-shell">
        <div className="dm-panel__poi-picker-toolbar">
          <input
            type="text"
            value={query}
            placeholder={placeholder}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
          />
          {allowClear && value ? (
            <button type="button" className="dm-panel__ghost" onClick={() => handleSelect('')}>
              Limpiar
            </button>
          ) : null}
          <button type="button" className="dm-panel__ghost" onClick={() => onCreate?.()}>
            + {createLabel}
          </button>
          {selected && onEdit ? (
            <button type="button" className="dm-panel__ghost" onClick={() => onEdit(selected.id)}>
              Editar
            </button>
          ) : null}
        </div>

        <div className="dm-panel__poi-picker-current">
          {selected ? (
            <button
              type="button"
              className="dm-panel__poi-row dm-panel__poi-row--active"
              onClick={() => setOpen((prev) => !prev)}
            >
              <span className="dm-panel__poi-row-title">{selected.label}</span>
              <span className="dm-panel__poi-row-meta">{selected.meta || selected.id}</span>
            </button>
          ) : (
            <div className="dm-panel__poi-picker-empty">{emptyLabel}</div>
          )}
        </div>

        {open && (
          <div className="dm-panel__poi-picker-results">
            {results.length ? (
              results.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  className={`dm-panel__poi-row dm-panel__poi-row--overlay${row.id === value ? ' dm-panel__poi-row--active' : ''}`}
                  onClick={() => handleSelect(row.id)}
                >
                  <span className="dm-panel__poi-row-title">{row.label}</span>
                  <span className="dm-panel__poi-row-meta">{row.meta || row.id}</span>
                </button>
              ))
            ) : (
              <div className="dm-panel__poi-picker-empty">
                Sin resultados.{' '}
                <button type="button" className="dm-panel__ghost" onClick={() => onCreate?.()}>
                  {createLabel}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PoiPicker;
