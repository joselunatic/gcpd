import { useEffect, useMemo, useRef, useState } from 'react';
import Fuse from 'fuse.js';

const fuseOptions = {
  keys: ['label'],
  threshold: 0.3,
  minMatchCharLength: 2,
  ignoreLocation: true,
  distance: 50,
};

const typeIcons = {
  case: '📋',
  poi: '📍',
  villain: '🎭',
  evidence: '🔍',
};

const typeLabels = {
  case: 'Caso',
  poi: 'POI',
  villain: 'Villano',
  evidence: 'Evidencia',
};

const GlobalSearch = ({
  cases = [],
  pois = [],
  villains = [],
  evidence = [],
  onNavigate = () => {},
}) => {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const rootRef = useRef(null);
  const overlayRef = useRef(null);
  const inputRef = useRef(null);

  // Build searchable index from all data sources
  const indexedItems = useMemo(() => {
    const items = [];

    cases.forEach((item) => {
      items.push({
        id: item.id,
        label: item.title || item.name || item.id,
        meta: item.tag || '',
        view: 'cases',
        type: 'case',
        originalItem: item,
      });
    });

    pois.forEach((item) => {
      items.push({
        id: item.id,
        label: item.name,
        meta: item.label || item.district || '',
        view: 'pois',
        type: 'poi',
        originalItem: item,
      });
    });

    villains.forEach((item) => {
      items.push({
        id: item.id,
        label: item.name,
        meta: item.alias || item.threat || '',
        view: 'villains',
        type: 'villain',
        originalItem: item,
      });
    });

    evidence.forEach((item) => {
      items.push({
        id: item.id,
        label: item.title || item.label || item.id,
        meta: item.caseId ? `Caso: ${item.caseId}` : '',
        view: 'evidence',
        type: 'evidence',
        originalItem: item,
      });
    });

    return items.filter((item) => item.id && item.label);
  }, [cases, pois, villains, evidence]);

  const fuse = useMemo(() => {
    if (!indexedItems.length) return null;
    return new Fuse(indexedItems, fuseOptions);
  }, [indexedItems]);

  const searchResults = useMemo(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2 || !fuse) return [];
    return fuse.search(trimmed).slice(0, 25).map((result) => result.item);
  }, [fuse, query]);

  const displayRows = query.trim().length >= 2 ? searchResults : [];
  const showOverlay = open && query.trim().length > 0;

  // Global keyboard listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleGlobalKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault();
        setOpen(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  // Reset highlight on query change
  useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  const handleSelect = (item) => {
    if (!item) return;
    onNavigate(item.view, item.id);
    setQuery('');
    setOpen(false);
  };

  const handleKeyDown = (event) => {
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
    <div className="dm-panel__global-search" ref={rootRef}>
      {open && (
        <div
          className="dm-panel__global-search-overlay"
          ref={overlayRef}
          role="dialog"
          aria-modal="true"
          aria-label="Búsqueda global"
        >
          <div className="dm-panel__global-search-header">
            <input
              ref={inputRef}
              type="text"
              className="dm-panel__global-search-input"
              placeholder="Buscar casos, POIs, villanos, evidencias... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              aria-label="Búsqueda global"
              aria-autocomplete="list"
              aria-haspopup="listbox"
              aria-expanded={showOverlay}
            />
            <span className="dm-panel__global-search-hint" aria-live="polite">ESC para cerrar</span>
          </div>

          {showOverlay && (
            <div className="dm-panel__global-search-results" role="listbox" aria-label="Resultados de búsqueda">
              {displayRows.length ? (
                displayRows.map((item, index) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    role="option"
                    aria-selected={index === highlightIndex}
                    aria-label={`${typeLabels[item.type]}: ${item.label}${item.meta ? ` — ${item.meta}` : ''}`}
                    className={`dm-panel__global-search-row${
                      index === highlightIndex ? ' dm-panel__global-search-row--active' : ''
                    }`}
                    onClick={() => handleSelect(item)}
                  >
                    <span className="dm-panel__global-search-type">
                      {typeIcons[item.type]}
                    </span>
                    <div className="dm-panel__global-search-content">
                      <div className="dm-panel__global-search-label">{item.label}</div>
                      {item.meta && (
                        <div className="dm-panel__global-search-meta">{item.meta}</div>
                      )}
                    </div>
                    <span className="dm-panel__global-search-badge">{typeLabels[item.type]}</span>
                  </button>
                ))
              ) : query.trim().length >= 2 ? (
                <div className="dm-panel__global-search-empty">
                  <p>Sin resultados para &quot;{query}&quot;</p>
                </div>
              ) : null}
            </div>
          )}
        </div>
      )}

      {open && !showOverlay && (
        <div className="dm-panel__global-search-overlay dm-panel__global-search-overlay--empty" ref={overlayRef}>
          <div className="dm-panel__global-search-header">
            <input
              ref={inputRef}
              type="text"
              className="dm-panel__global-search-input"
              placeholder="Buscar casos, POIs, villanos, evidencias... (Ctrl+K)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <span className="dm-panel__global-search-hint">ESC para cerrar</span>
          </div>
          <div className="dm-panel__global-search-tip">
            <p>Escribe para buscar...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;
