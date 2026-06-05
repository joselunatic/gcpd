/* Tracer, Accesos, Campaña — faithfully recreated from DmPanel source.
   No invented fields. No invented flows. */
const { useState } = React;

/* VILLAIN_ATTRIBUTE_FIELDS exactly as defined in DmPanel.jsx line 86 */
var VILLAIN_ATTR_FIELDS = [
  { key: 'alias',           label: 'Alias',               group: 'Primarios' },
  { key: 'realName',        label: 'Nombre real',          group: 'Primarios' },
  { key: 'summary',         label: 'Resumen',              group: 'Primarios' },
  { key: 'status',          label: 'Estado',               group: 'Primarios' },
  { key: 'species',         label: 'Especie',              group: 'Opcionales' },
  { key: 'age',             label: 'Edad',                 group: 'Opcionales' },
  { key: 'height',          label: 'Altura',               group: 'Opcionales' },
  { key: 'weight',          label: 'Peso',                 group: 'Opcionales' },
  { key: 'threatLevel',     label: 'Nivel de amenaza',     group: 'Opcionales' },
  { key: 'lastSeen',        label: 'Ultima vez visto',     group: 'Opcionales' },
  { key: 'patterns',        label: 'Patrones',             group: 'Opcionales' },
  { key: 'knownAssociates', label: 'Asociados conocidos',  group: 'Opcionales' },
  { key: 'notes',           label: 'Notas',                group: 'Opcionales' },
];

function buildDefaultAccess() {
  var result = {};
  VILLAIN_ATTR_FIELDS.forEach(function(f) {
    result[f.key] = { visibility: 'listed', initialAccessStatus: 'unlocked', phrase: '', password: '', unlockMode: 'none' };
  });
  return result;
}

/* ── FieldLabel (inline to avoid cross-file scope issues) ── */
function FL({ label, hint }) {
  return (
    <span style={{ display:'block', fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4 }}>
      {label}<span style={{ color:'var(--bem-phosphor-mute)', marginLeft:6 }}>— {hint}</span>
    </span>
  );
}

/* ══ TRACER ═════════════════════════════════════════════════ */
var INIT_HOTSPOT = { id: '', label: '', poiId: '', x: '50', y: '50' };
var INIT_LINE    = { id: '', number: '', label: '', hotspotId: '', enabled: true };

function TracerView({ toast }) {
  var pois = window.DM_DATA.pois;
  const [hotspots, setHotspots] = useState([]);
  const [lines,    setLines]    = useState([]);
  const [hForm, setHForm] = useState(Object.assign({}, INIT_HOTSPOT));
  const [lForm, setLForm] = useState(Object.assign({}, INIT_LINE));
  const frameRef = React.useRef(null);
  const [hover, setHover] = useState(null);

  var selPoi = pois.find(function(p) { return p.id === hForm.poiId; }) || null;

  function pickCoords(e) {
    if (!frameRef.current) return;
    var r = frameRef.current.getBoundingClientRect();
    var x = Math.max(0, Math.min(100, ((e.clientX - r.left) / r.width) * 100)).toFixed(1);
    var y = Math.max(0, Math.min(100, ((e.clientY - r.top) / r.height) * 100)).toFixed(1);
    setHForm(function(f) { return Object.assign({}, f, { x: x, y: y }); });
  }

  function saveHotspot(e) {
    e.preventDefault();
    if (!hForm.id.trim()) { toast('error', 'Hotspot ID obligatorio.'); return; }
    if (!hForm.poiId.trim()) { toast('error', 'Selecciona un POI base para el hotspot.'); return; }
    var next = Object.assign({}, hForm, { label: hForm.label.trim() || hForm.id.trim() });
    setHotspots(function(hs) { return hs.filter(function(h) { return h.id !== next.id; }).concat([next]); });
    setHForm(Object.assign({}, INIT_HOTSPOT));
    toast('success', 'Hotspot "' + next.label + '" guardado.');
  }
  function deleteHotspot(id) {
    setHotspots(function(hs) { return hs.filter(function(h) { return h.id !== id; }); });
    setLines(function(ls) { return ls.map(function(l) { return l.hotspotId === id ? Object.assign({}, l, { hotspotId: '' }) : l; }); });
    setHForm(Object.assign({}, INIT_HOTSPOT));
    toast('info', 'Hotspot eliminado.');
  }

  function saveLine(e) {
    e.preventDefault();
    if (!lForm.number.trim()) { toast('error', 'Linea tracer: el número es obligatorio.'); return; }
    if (!lForm.hotspotId.trim()) { toast('error', 'Selecciona un hotspot para la línea.'); return; }
    var id = lForm.number.trim();
    var next = Object.assign({}, lForm, { id: id, label: lForm.label.trim() || id });
    setLines(function(ls) { return ls.filter(function(l) { return l.id !== id; }).concat([next]); });
    setLForm(Object.assign({}, INIT_LINE));
    toast('success', 'Línea "' + next.label + '" guardada.');
  }
  function deleteLine(id) {
    setLines(function(ls) { return ls.filter(function(l) { return l.id !== id; }); });
    setLForm(Object.assign({}, INIT_LINE));
    toast('info', 'Línea eliminada.');
  }

  return (
    <div>
      <h1 className="dm__section-title">Tracer</h1>
      <div className="dm__card" style={{ marginBottom:'var(--bem-space-5)' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12, marginBottom:12 }}>
          <div>
            <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)' }}>Líneas DM y hotspots de traza</div>
            <p className="dm__hint" style={{ margin:'4px 0 0' }}>{lines.length} líneas DM / {hotspots.length} hotspots / operador en vivo delegado a <code>/phone</code></p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={function() { setLForm(Object.assign({}, INIT_LINE)); }}>Nueva línea</button>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={function() { setHForm(Object.assign({}, INIT_HOTSPOT)); }}>Nuevo hotspot</button>
          </div>
        </div>

        {!lines.length && <p className="dm__hint">Sin líneas tracer. Crea una línea y asígnale hotspot.</p>}
        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom: lines.length ? 16 : 0 }}>
          {lines.map(function(line) {
            var spot = hotspots.find(function(h) { return h.id === line.hotspotId; });
            return (
              <button key={line.id}
                className={'dm__list-item' + (lForm.id === line.id ? ' is-active' : '')}
                style={{ width: 200, textAlign:'left' }}
                onClick={function() {
                  setLForm(Object.assign({}, line));
                  if (spot) setHForm(Object.assign({}, spot));
                }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                  <strong style={{ fontSize:'var(--bem-text-sm)', color:'var(--bem-phosphor-soft)' }}>{line.label || line.number}</strong>
                  <span style={{ fontSize:'var(--bem-text-micro)', padding:'2px 6px', borderRadius:'var(--bem-radius-pill)', border:'1px solid', borderColor: line.enabled ? 'var(--bem-ok)' : 'var(--bem-danger)', color: line.enabled ? 'var(--bem-ok)' : 'var(--bem-danger)' }}>{line.enabled ? 'ON' : 'OFF'}</span>
                </div>
                <div className="dm__list-meta">Número: {line.number}</div>
                <div className="dm__list-meta">Hotspot: {spot ? (spot.label || spot.id) : 'Sin hotspot'}</div>
              </button>
            );
          })}
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--bem-space-5)' }}>
          {/* Hotspot form */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)' }}>Hotspot (visible para agentes)</div>
            {!hotspots.length && <p className="dm__hint">Sin hotspots tracer.</p>}
            <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:4 }}>
              {hotspots.map(function(spot) {
                return (
                  <button key={spot.id} className={'dm__pill dm__pill--ok' + (hForm.id === spot.id ? '' : ' dm__pill--locked')}
                    style={{ cursor:'pointer', fontFamily:'inherit' }}
                    onClick={function() { setHForm(Object.assign({}, spot)); }}>
                    {spot.label || spot.id}
                  </button>
                );
              })}
            </div>
            <form style={{ display:'flex', flexDirection:'column', gap:10 }} onSubmit={saveHotspot}>
              <div className="dm__field"><FL label="ID hotspot" hint="Identificador tracer independiente de POIs." /><input className="dm__input" value={hForm.id} onChange={function(e) { setHForm(function(f) { return Object.assign({}, f, { id: e.target.value }); }); }} /></div>
              <div className="dm__field"><FL label="Label hotspot" hint="Texto que se mostrará al agente al resolver la traza." /><input className="dm__input" value={hForm.label} onChange={function(e) { setHForm(function(f) { return Object.assign({}, f, { label: e.target.value }); }); }} /></div>
              <div className="dm__field"><FL label="POI base" hint="El hotspot usa las coordenadas del POI base." />
                <select className="dm__select" value={hForm.poiId}
                  onChange={function(e) {
                    var pid = e.target.value;
                    var poi = pois.find(function(p) { return p.id === pid; });
                    setHForm(function(f) { return Object.assign({}, f, { poiId: pid, x: poi && poi.mapX !== '' ? String(poi.mapX) : f.x, y: poi && poi.mapY !== '' ? String(poi.mapY) : f.y }); });
                  }}>
                  <option value="">Sin POI vinculado</option>
                  {pois.map(function(p) { return <option key={p.id} value={p.id}>{p.name}</option>; })}
                </select></div>

              {/* Map thumbnail */}
              <div className="dm__map-thumb" ref={frameRef} onClick={pickCoords}
                onPointerMove={function(e) {
                  if (!frameRef.current) return;
                  var r = frameRef.current.getBoundingClientRect();
                  setHover({ x: (((e.clientX-r.left)/r.width)*100).toFixed(1), y: (((e.clientY-r.top)/r.height)*100).toFixed(1), px: e.clientX-r.left, py: e.clientY-r.top });
                }}
                onPointerLeave={function() { setHover(null); }}>
                {hForm.x !== '' && hForm.y !== '' && (
                  <div className="dm__map-marker" style={{ position:'absolute', left: hForm.x+'%', top: hForm.y+'%', transform:'translate(-50%,-50%)' }}>
                    {hForm.label && <span className="dm__map-marker-label">{hForm.label}</span>}
                  </div>
                )}
                {hover && <div className="dm__map-tooltip" style={{ left: hover.px+10, top: Math.max(0, hover.py-30) }}>X {hover.x}% · Y {hover.y}%</div>}
              </div>
              <p className="dm__hint">El hotspot usa siempre las coordenadas del POI base. El mapa aquí es solo preview.</p>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar hotspot</button>
                {hForm.id && hotspots.find(function(h) { return h.id === hForm.id; }) && (
                  <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { deleteHotspot(hForm.id); }}>Eliminar</button>
                )}
              </div>
            </form>
          </div>

          {/* Line form */}
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)' }}>Línea asociada al hotspot</div>
            <form style={{ display:'flex', flexDirection:'column', gap:10 }} onSubmit={saveLine}>
              <div className="dm__field"><FL label="Número" hint="Identificador único de la línea (DB) y usado por TRACER #TELEFONO." /><input className="dm__input" value={lForm.number} onChange={function(e) { setLForm(function(f) { return Object.assign({}, f, { number: e.target.value }); }); }} /></div>
              <div className="dm__field"><FL label="Label línea (DM)" hint="Alias operativo para el DM (no es ID técnico)." /><input className="dm__input" value={lForm.label} onChange={function(e) { setLForm(function(f) { return Object.assign({}, f, { label: e.target.value }); }); }} /></div>
              <div className="dm__field"><FL label="Hotspot" hint="Hotspot custom donde trazar." />
                <select className="dm__select" value={lForm.hotspotId} onChange={function(e) { setLForm(function(f) { return Object.assign({}, f, { hotspotId: e.target.value }); }); }}>
                  <option value="">-- Selecciona hotspot --</option>
                  {hotspots.map(function(spot) { return <option key={spot.id} value={spot.id}>{spot.label || spot.id}</option>; })}
                </select></div>
              <div className="dm__field"><FL label="Activa" hint="Si está OFF, TRACER devolverá línea no válida." />
                <label style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
                  <input type="checkbox" checked={Boolean(lForm.enabled)} onChange={function(e) { setLForm(function(f) { return Object.assign({}, f, { enabled: e.target.checked }); }); }} />
                  <span style={{ fontSize:'var(--bem-text-sm)', color:'var(--bem-phosphor-text)' }}>{lForm.enabled ? 'Línea activa' : 'Línea inválida para TRACER'}</span>
                </label>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar línea</button>
                {(lForm.id || lForm.number) && lines.find(function(l) { return l.id === (lForm.id || lForm.number); }) && (
                  <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { deleteLine(lForm.id || lForm.number); }}>Eliminar</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══ ACCESOS ════════════════════════════════════════════════ */
function AccesosView({ toast }) {
  var villains = window.DM_DATA.villains;
  const [villainId, setVillainId] = useState(villains[0] ? villains[0].id : '');
  const [matrix, setMatrix] = useState(buildDefaultAccess());

  function setCell(key, patch) {
    setMatrix(function(m) {
      var prev = m[key] || {};
      return Object.assign({}, m, { [key]: Object.assign({}, prev, patch) });
    });
  }

  return (
    <div>
      <h1 className="dm__section-title">Accesos por atributo</h1>
      <p className="dm__section-sub">&gt; Controla qué atributos de cada villano están bloqueados, visibles o desbloqueables en la TUI</p>
      <div className="dm__card">
        <form style={{ display:'flex', flexDirection:'column', gap:16 }}
          onSubmit={function(e) { e.preventDefault(); toast('success', 'Accesos guardados.'); }}>

          <div className="dm__field" style={{ maxWidth:320 }}>
            <FL label="Villano" hint="Selecciona el perfil a editar." />
            <select className="dm__select" value={villainId} onChange={function(e) { setVillainId(e.target.value); setMatrix(buildDefaultAccess()); }}>
              {villains.map(function(v) { return <option key={v.id} value={v.id}>{v.alias || v.id}</option>; })}
            </select>
          </div>

          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'var(--bem-text-xs)' }}>
              <thead>
                <tr style={{ borderBottom:'1px solid var(--bem-border)', color:'var(--bem-phosphor-mute)', letterSpacing:'.1em', textTransform:'uppercase' }}>
                  <th style={{ textAlign:'left', padding:'6px 12px 6px 0', minWidth:140 }}>Atributo</th>
                  <th style={{ padding:'6px 12px', textAlign:'center' }}>Locked</th>
                  <th style={{ padding:'6px 12px', textAlign:'center' }}>Visible</th>
                  <th style={{ padding:'6px 12px', textAlign:'center' }}>Runtime</th>
                  <th style={{ padding:'6px 12px', textAlign:'left', minWidth:110 }}>Frase</th>
                  <th style={{ padding:'6px 12px', textAlign:'left', minWidth:100 }}>Token</th>
                </tr>
              </thead>
              <tbody>
                {VILLAIN_ATTR_FIELDS.map(function(field) {
                  var access = matrix[field.key] || buildDefaultAccess()[field.key];
                  var locked = access.initialAccessStatus !== 'unlocked';
                  var visible = access.visibility !== 'hidden';
                  return (
                    <tr key={field.key} style={{ borderBottom:'1px solid var(--bem-border-faint)' }}>
                      <td style={{ padding:'7px 12px 7px 0', color:'var(--bem-phosphor-text)' }}>
                        <span style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.04em' }}>{field.label}</span>
                        <span style={{ display:'block', fontSize:'var(--bem-text-micro)', color:'var(--bem-phosphor-mute)', letterSpacing:'.06em', textTransform:'uppercase' }}>{field.group}</span>
                      </td>
                      <td style={{ padding:'7px 12px', textAlign:'center' }}>
                        <input type="checkbox" checked={locked} onChange={function(e) { setCell(field.key, { initialAccessStatus: e.target.checked ? 'locked' : 'unlocked' }); }} style={{ accentColor:'var(--bem-phosphor)' }} />
                      </td>
                      <td style={{ padding:'7px 12px', textAlign:'center' }}>
                        <input type="checkbox" checked={visible} onChange={function(e) { setCell(field.key, { visibility: e.target.checked ? 'listed' : 'hidden' }); }} style={{ accentColor:'var(--bem-phosphor)' }} />
                      </td>
                      <td style={{ padding:'7px 12px', textAlign:'center' }}>
                        <input type="checkbox" checked={false} readOnly style={{ accentColor:'var(--bem-phosphor)', opacity:.5 }} title="Runtime — requiere servidor activo" />
                      </td>
                      <td style={{ padding:'7px 12px' }}>
                        <input className="dm__input" style={{ fontSize:'var(--bem-text-xs)', padding:'4px 8px', minWidth:0 }} value={access.phrase || ''} placeholder="Frase" onChange={function(e) { setCell(field.key, { phrase: e.target.value }); }} />
                      </td>
                      <td style={{ padding:'7px 12px' }}>
                        <input className="dm__input" style={{ fontSize:'var(--bem-text-xs)', padding:'4px 8px', minWidth:0 }} value={access.password || ''} placeholder="Token" onChange={function(e) { setCell(field.key, { password: e.target.value, unlockMode: e.target.value ? 'password' : 'none' }); }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ display:'flex', gap:8 }}>
            <button type="submit" className="dm__btn dm__btn--primary">Guardar accesos</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ══ CAMPAÑA ════════════════════════════════════════════════ */
var INIT_CAMPAIGN = { flags: '', alertLevel: 'low', activeCaseId: '', unlockedModules: '', unlockedMap: '', unlockedVillains: '' };
var INIT_GLOBAL_CMD = '[{"id":"oracle","triggers":["oracle","ora"],"response":["Linea 1","Linea 2"]}]';

function CampanaView({ toast }) {
  const [form, setForm] = useState(Object.assign({}, INIT_CAMPAIGN));
  const [cmdText, setCmdText] = useState('[]');
  const upd = function(p) { setForm(function(f) { return Object.assign({}, f, p); }); };

  return (
    <div>
      <h1 className="dm__section-title">Estado de campaña</h1>
      <p className="dm__section-sub">Controla flags y desbloqueos para sincronizar con los agentes.</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'var(--bem-space-5)' }}>

        <div className="dm__card">
          <form style={{ display:'flex', flexDirection:'column', gap:18 }}
            onSubmit={function(e) { e.preventDefault(); toast('success', 'Estado de campaña guardado.'); }}>

            <div>
              <div style={{ fontSize:'var(--bem-text-sm)', fontWeight:'bold', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:10 }}>Flags globales</div>
              <div className="dm__field">
                <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>Flags (una por línea)</label>
                <textarea className="dm__textarea" rows={4} value={form.flags} onChange={function(e) { upd({ flags: e.target.value }); }} />
              </div>
            </div>

            <div>
              <div style={{ fontSize:'var(--bem-text-sm)', fontWeight:'bold', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:10 }}>Contexto operativo</div>
              <div className="dm__grid2">
                <div className="dm__field">
                  <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>Nivel de alerta</label>
                  <select className="dm__select" value={form.alertLevel} onChange={function(e) { upd({ alertLevel: e.target.value }); }}>
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                    <option value="critical">Crítico</option>
                  </select>
                </div>
                <div className="dm__field">
                  <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>Caso activo (ID)</label>
                  <input className="dm__input" value={form.activeCaseId} onChange={function(e) { upd({ activeCaseId: e.target.value }); }} />
                </div>
              </div>
            </div>

            <div>
              <div style={{ fontSize:'var(--bem-text-sm)', fontWeight:'bold', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:10 }}>Desbloqueos</div>
              <div className="dm__field" style={{ marginBottom:10 }}>
                <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>Casos desbloqueados (IDs)</label>
                <textarea className="dm__textarea" rows={3} value={form.unlockedModules} onChange={function(e) { upd({ unlockedModules: e.target.value }); }} />
              </div>
              <div className="dm__field" style={{ marginBottom:10 }}>
                <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>POIs desbloqueados (IDs)</label>
                <textarea className="dm__textarea" rows={3} value={form.unlockedMap} onChange={function(e) { upd({ unlockedMap: e.target.value }); }} />
              </div>
              <div className="dm__field">
                <label style={{ fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4, display:'block' }}>Villanos desbloqueados (IDs)</label>
                <textarea className="dm__textarea" rows={3} value={form.unlockedVillains} onChange={function(e) { upd({ unlockedVillains: e.target.value }); }} />
              </div>
            </div>

            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" className="dm__btn dm__btn--primary">Guardar estado</button>
              <button type="button" className="dm__btn dm__btn--ghost" onClick={function() { setForm(Object.assign({}, INIT_CAMPAIGN)); toast('info', 'Estado recargado (mock).'); }}>Recargar</button>
            </div>
          </form>
        </div>

        <div className="dm__card">
          <form style={{ display:'flex', flexDirection:'column', gap:12 }}
            onSubmit={function(e) { e.preventDefault(); toast('success', 'Comandos globales guardados.'); }}>
            <div style={{ fontSize:'var(--bem-text-sm)', fontWeight:'bold', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)' }}>Comandos globales</div>
            <p className="dm__hint">JSON con lista de comandos. Cada entrada debe incluir <code>triggers</code> y <code>response</code>.</p>
            <textarea className="dm__textarea"
              style={{ fontFamily:'var(--bem-font-output)', fontSize:'var(--bem-text-xs)', minHeight:280 }}
              value={cmdText}
              onChange={function(e) { setCmdText(e.target.value); }}
              placeholder={INIT_GLOBAL_CMD} />
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" className="dm__btn dm__btn--primary">Guardar comandos</button>
              <button type="button" className="dm__btn dm__btn--ghost" onClick={function() { setCmdText('[]'); toast('info', 'Comandos recargados (mock).'); }}>Recargar</button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}

Object.assign(window, { TracerView, AccesosView, CampanaView });
