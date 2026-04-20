import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: ['name'],
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true,
  distance: 50,
};

const PoiSelector = ({
  items = [],
  selection = '',
  onSelect,
  title = 'POIs',
  error = '',
  active = null,
  recents = [],
  isMobile = false,
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef(null);
  const overlayRef = useRef(null);

  const fuse = useMemo(() => {
    if (!items.length) return null;
    return new Fuse(items, fuseOptions);
  }, [items]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || !fuse) return [];
    return fuse.search(trimmed).slice(0, 20).map((result) => result.item);
  }, [fuse, query]);

  const displayRows =
    query.trim().length >= 2 ? searchResults : items;
  const showOverlay = open || query.trim().length > 0;

  useEffect(() => {
    if (!showOverlay) return;
    const handlePointer = (event) => {
      const root = rootRef.current;
      const overlay = overlayRef.current;
      if (!root || !overlay) return;
      if (overlay.contains(event.target) || root.contains(event.target)) return;
      setOpen(false);
      setQuery('');
    };
    document.addEventListener('mousedown', handlePointer);
    return () => document.removeEventListener('mousedown', handlePointer);
  }, [showOverlay]);

  useEffect(() => {
    if (showOverlay) setHighlightIndex(0);
  }, [showOverlay, query]);

  const handleSelect = (item) => {
    if (!item) return;
    onSelect(item.id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (!showOverlay) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setQuery('');
      return;
    }
    if (!displayRows.length) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.min(prev + 1, displayRows.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightIndex((prev) => Math.max(prev - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const picked = displayRows[highlightIndex];
      if (picked) handleSelect(picked);
    }
  };

  return (
    <div className="dm-panel__card dm-panel__poi-selector" ref={rootRef}>
      <div className="dm-panel__panel-title">{title}</div>
      {error && <p className="dm-panel__error">{error}</p>}

      <div className="dm-panel__poi-active">
        <div className="dm-panel__poi-active-label">POI activo</div>
        {active ? (
          <div className="dm-panel__poi-row dm-panel__poi-row--active">
            <span className="dm-panel__poi-row-title wopr-tooltip-anchor" data-tooltip={active.label || undefined}>
              {active.label}
            </span>
            <span className="dm-panel__poi-row-meta wopr-tooltip-anchor" data-tooltip={active.meta || undefined}>
              {active.meta}
            </span>
          </div>
        ) : (
          <p className="dm-panel__hint">Sin POI activo.</p>
        )}
      </div>

      <div className="dm-panel__poi-search">
        <input
          type="text"
          value={query}
          placeholder="Buscar POI..."
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          className="dm-panel__ghost dm-panel__poi-search-toggle"
          onClick={() => {
            setOpen((prev) => !prev);
            if (open) setQuery('');
          }}
        >
          ▾
        </button>
      </div>

      <div className="dm-panel__poi-recents">
        <div className="dm-panel__poi-recents-title">Recientes</div>
        <div className="dm-panel__poi-recents-list">
          {recents.length ? (
            recents.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`dm-panel__poi-row${selection === item.id ? ' active' : ''}`}
                onClick={() => handleSelect(item)}
              >
                <span className="dm-panel__poi-row-title wopr-tooltip-anchor" data-tooltip={item.label || undefined}>
                  {item.label}
                </span>
                <span className="dm-panel__poi-row-meta wopr-tooltip-anchor" data-tooltip={item.meta || undefined}>
                  {item.meta}
                </span>
              </button>
            ))
          ) : (
            <p className="dm-panel__hint">Sin recientes.</p>
          )}
        </div>
      </div>

      {showOverlay && (
        <div
          ref={overlayRef}
          className={`dm-panel__poi-overlay${showOverlay ? ' dm-panel__poi-overlay--open' : ''}${
            isMobile ? ' dm-panel__poi-overlay--mobile' : ''
          }`}
          role="dialog"
          aria-modal={isMobile ? 'true' : 'false'}
        >
          <div className="dm-panel__poi-overlay-header">
            <strong>Buscar POI</strong>
            <button type="button" className="dm-panel__ghost" onClick={() => {
              setOpen(false);
              setQuery('');
            }}>
              Cerrar
            </button>
          </div>
          {isMobile && (
            <div className="dm-panel__poi-search dm-panel__poi-search--overlay">
              <input
                type="text"
                value={query}
                placeholder="Buscar POI..."
                onChange={(event) => {
                  setQuery(event.target.value);
                  setOpen(true);
                }}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </div>
          )}
          <div className="dm-panel__poi-results">
            {displayRows.length ? (
              displayRows.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dm-panel__poi-row dm-panel__poi-row--overlay${index === highlightIndex ? ' dm-panel__poi-row--active' : ''}`}
                  onClick={() => handleSelect(item)}
                >
                  <span className="dm-panel__poi-row-title wopr-tooltip-anchor" data-tooltip={item.label || undefined}>
                    {item.label}
                  </span>
                  <span className="dm-panel__poi-row-meta wopr-tooltip-anchor" data-tooltip={item.meta || undefined}>
                    {item.meta}
                  </span>
                </button>
              ))
            ) : query.trim().length >= 2 ? (
              <p className="dm-panel__hint">Sin resultados.</p>
            ) : (
              <p className="dm-panel__hint">Sin POIs disponibles.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PoiSelector;
