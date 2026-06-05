/* Shell: header, nav rail, toasts, global search. Exports to window. */
const { useState, useEffect, useCallback, useRef } = React;

const NAV = {
  DATA:   [ ['cases','Casos'], ['pois','POIs'], ['villains','Villanos'], ['evidence','Evidencias'] ],
  OPS:    [ ['tracer','Tracer'], ['liveMap','Mapa Live'], ['rtEffects','Efectos RT'] ],
  CONFIG: [ ['access','Accesos'], ['campaign','Campaña'] ],
};

function Header({ onSearch, sync }) {
  return (
    <header className="dm__header">
      <span className="dm__brand">GCPD / Wayne Aux Node — Brother Eye Mk0</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button className="dm__kbd" onClick={onSearch}>⌕ Buscar · Ctrl K</button>
        <span className="dm__sync">Sync: {sync}</span>
      </div>
    </header>
  );
}

function NavRail({ active, onSelect }) {
  return (
    <nav className="dm__nav">
      {Object.entries(NAV).map(([group, tabs]) => (
        <div className="dm__nav-group" key={group}>
          <span className="dm__nav-group-label">{group}</span>
          <div className="dm__nav-buttons">
            {tabs.map(([id, label]) => (
              <button
                key={id}
                className={'dm__tab' + (active === id ? ' is-active' : '')}
                onClick={() => onSelect(id)}
              >{label}</button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  );
}

const TOAST_ICONS = { success: '✓', error: '✕', info: 'ℹ' };
function Toasts({ toasts, onDismiss }) {
  return (
    <div className="dm__toasts">
      {toasts.map(t => (
        <div key={t.id} className={`dm__toast dm__toast--${t.type}`} role="status">
          <span>{TOAST_ICONS[t.type]}</span>
          <span>{t.text}</span>
          <button className="dm__toast-x" onClick={() => onDismiss(t.id)}>×</button>
        </div>
      ))}
    </div>
  );
}

const SEARCH_ICONS = { case: '📋', poi: '📍', villain: '🎭' };
function GlobalSearch({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current && inputRef.current.focus(); }, []);

  const d = window.DM_DATA;
  const all = [
    ...d.cases.map(c => ({ type: 'case', label: c.title, sub: `Caso · #${c.id}`, dest: 'cases' })),
    ...d.pois.map(p => ({ type: 'poi', label: p.name, sub: `POI · ${p.district}`, dest: 'pois' })),
    ...d.villains.map(v => ({ type: 'villain', label: v.alias, sub: `Villano · Amenaza: ${v.threat}`, dest: 'villains' })),
  ];
  const results = q.trim()
    ? all.filter(r => r.label.toLowerCase().includes(q.toLowerCase()))
    : all.slice(0, 5);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="dm__search" onClick={onClose}>
      <div className="dm__search-head" onClick={e => e.stopPropagation()}>
        <input ref={inputRef} className="dm__search-input" placeholder="Buscar casos, POIs, villanos…"
          value={q} onChange={e => setQ(e.target.value)} />
        <div className="dm__search-hint">↑↓ navegar · ↵ abrir · esc cerrar</div>
      </div>
      <div className="dm__search-results" onClick={e => e.stopPropagation()}>
        {results.map((r, i) => (
          <button key={i} className={'dm__search-row' + (i === 0 ? ' is-active' : '')}
            onClick={() => onPick(r.dest)}>
            <span className="dm__search-icon">{SEARCH_ICONS[r.type]}</span>
            <span className="dm__search-col">
              <div className="dm__search-label">{r.label}</div>
              <div className="dm__search-sub">{r.sub}</div>
            </span>
          </button>
        ))}
        {!results.length && <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(180,255,228,.6)' }}>&gt; SIN REGISTROS EN ESTE CANAL.</div>}
      </div>
    </div>
  );
}

Object.assign(window, { Header, NavRail, Toasts, GlobalSearch, NAV });
