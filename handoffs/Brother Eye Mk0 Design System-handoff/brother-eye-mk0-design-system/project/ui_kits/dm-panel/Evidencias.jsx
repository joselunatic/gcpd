/* Evidencias view — 4 sub-tabs: STL, Balística, Audio, Teléfonos.
   Fields and layout copied verbatim from renderEvidenceView() in DmPanel.jsx. */
const { useState } = React;

const INIT_EVIDENCE   = { id: '', label: '', command: '', stlPath: '' };
const INIT_BALLISTICS = { id: '', label: '', pngPath: '', caliber: '', material: '', bulletId: '', caseId: '', caseCode: '', poiId: '', crime: '', location: '', status: '', closedBy: '' };
const INIT_AUDIO      = { id: '', title: '', originalSrc: '', garbledSrc: '', isGarbled: false, passwordHash: '' };
const INIT_PHONE      = { id: '', number: '', label: '', audioId: '', rellamable: false, llamado: false };

function FieldLabel({ label, hint }) {
  return (
    <span style={{ display:'block', fontSize:'var(--bem-text-2xs)', letterSpacing:'.08em', textTransform:'uppercase', color:'var(--bem-phosphor-dim)', marginBottom:4 }}>
      {label} <span style={{ color:'var(--bem-phosphor-mute)', fontStyle:'normal' }}>— {hint}</span>
    </span>
  );
}

/* ── STL sub-tab ──────────────────────────────────────────── */
function StlTab({ toast }) {
  const [models, setModels] = useState(window.DM_DATA.evidence.slice());
  const [form, setForm] = useState(Object.assign({}, INIT_EVIDENCE));
  const [profile, setProfile] = useState('default');
  const upd = function(p) { setForm(function(f) { return Object.assign({}, f, p); }); };

  return (
    <div className="dm__cols">
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Modelos</div>
        {!models.length && <p className="dm__hint">No hay evidencias registradas.</p>}
        <div className="dm__list">
          {models.map(function(m) {
            return (
              <button key={m.id} className={'dm__list-item' + (form.id === m.id ? ' is-active' : '')}
                onClick={function() { setForm({ id: m.id||'', label: m.label||'', command: m.command||'', stlPath: m.stlPath||'' }); }}>
                <strong className="dm__list-title">{m.label || m.id}</strong>
                <span className="dm__list-meta">{m.command ? 'SHOW ' + m.command : m.id}</span>
              </button>
            );
          })}
        </div>
        <button className="dm__btn dm__btn--ghost dm__btn--sm" style={{ marginTop:10 }} onClick={function() { setForm(Object.assign({}, INIT_EVIDENCE)); }}>Nuevo</button>
      </div>

      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Detalle / Upload</div>
        <form style={{ display:'flex', flexDirection:'column', gap:12 }}
          onSubmit={function(e) {
            e.preventDefault();
            setModels(function(ms) {
              var i = ms.findIndex(function(m) { return m.id === form.id; });
              return i >= 0 ? ms.map(function(m,j) { return j===i ? Object.assign({}, form) : m; }) : ms.concat([Object.assign({}, form)]);
            });
            toast('success', 'Evidencia "' + (form.label || form.id) + '" guardada.');
          }}>
          <div className="dm__field"><FieldLabel label="ID" hint="Identificador interno para la evidencia." /><input className="dm__input" value={form.id} onChange={function(e) { upd({ id: e.target.value }); }} /></div>
          <div className="dm__field"><FieldLabel label="Etiqueta" hint="Texto mostrado en el visor ASCII." /><input className="dm__input" value={form.label} onChange={function(e) { upd({ label: e.target.value }); }} /></div>
          <div className="dm__field"><FieldLabel label="Comando SHOW" hint="Alias para invocar el modelo (SHOW alias)." /><input className="dm__input" value={form.command} onChange={function(e) { upd({ command: e.target.value }); }} /></div>
          <div className="dm__field"><FieldLabel label="Perfil ASCII" hint="Selecciona el perfil de render en el preview." />
            <select className="dm__select" value={profile} onChange={function(e) { setProfile(e.target.value); }}>
              <option value="default">Default</option>
              <option value="wayne90x30">Wayne 90x30</option>
              <option value="normal">Normal</option>
            </select></div>
          <div className="dm__field"><FieldLabel label="Ruta STL" hint="Ruta generada tras subir el archivo." /><input className="dm__input" value={form.stlPath} readOnly /></div>
          <div className="dm__field"><FieldLabel label="Subir STL" hint="Solo .stl (max 20MB)." /><input className="dm__input" type="file" accept=".stl" /></div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
            <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={function() { toast('info','Subida requiere servidor activo.'); }}>Subir STL</button>
            <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar evidencia</button>
            {form.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { setModels(function(ms) { return ms.filter(function(m) { return m.id !== form.id; }); }); setForm(Object.assign({}, INIT_EVIDENCE)); toast('info','Evidencia eliminada.'); }}>Eliminar</button>}
          </div>
        </form>
        <div style={{ marginTop:16 }}>
          <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:8 }}>Preview ASCII</div>
          <div className="dm__stl-stub">&gt; PREVIEW ASCII — STL no disponible en este kit</div>
        </div>
      </div>
    </div>
  );
}

/* ── Balística sub-tab ────────────────────────────────────── */
function BallisticaTab({ toast }) {
  const [form, setForm] = useState(Object.assign({}, INIT_BALLISTICS));
  const upd = function(p) { setForm(function(f) { return Object.assign({}, f, p); }); };
  return (
    <div className="dm__cols">
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>PNG Balística</div>
        <p className="dm__hint">No hay entradas balísticas registradas.</p>
        <button className="dm__btn dm__btn--ghost dm__btn--sm" style={{ marginTop:10 }} onClick={function() { setForm(Object.assign({}, INIT_BALLISTICS)); }}>Nuevo</button>
      </div>
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Metadatos Balística</div>
        <form style={{ display:'flex', flexDirection:'column', gap:12 }}
          onSubmit={function(e) { e.preventDefault(); toast('success','Entrada balística guardada.'); }}>
          <div className="dm__grid2">
            <div className="dm__field"><FieldLabel label="ID" hint="Identificador interno." /><input className="dm__input" value={form.id} onChange={function(e) { upd({ id: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Etiqueta" hint="Nombre descriptivo." /><input className="dm__input" value={form.label} onChange={function(e) { upd({ label: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Calibre" hint="Ej. 9mm." /><input className="dm__input" value={form.caliber} onChange={function(e) { upd({ caliber: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Material" hint="Plomo, acero, etc." /><input className="dm__input" value={form.material} onChange={function(e) { upd({ material: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="ID Bala" hint="Referencia del proyectil." /><input className="dm__input" value={form.bulletId} onChange={function(e) { upd({ bulletId: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="ID Caso" hint="Caso vinculado." /><input className="dm__input" value={form.caseId} onChange={function(e) { upd({ caseId: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Código caso" hint="Ej. KNIGHTFALL-C." /><input className="dm__input" value={form.caseCode} onChange={function(e) { upd({ caseCode: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="ID POI" hint="POI de la escena." /><input className="dm__input" value={form.poiId} onChange={function(e) { upd({ poiId: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Crimen" hint="Tipo de crimen." /><input className="dm__input" value={form.crime} onChange={function(e) { upd({ crime: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Lugar" hint="Ubicación." /><input className="dm__input" value={form.location} onChange={function(e) { upd({ location: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Estado" hint="Activo, cerrado, etc." /><input className="dm__input" value={form.status} onChange={function(e) { upd({ status: e.target.value }); }} /></div>
            <div className="dm__field"><FieldLabel label="Cerrado por" hint="Agente responsable." /><input className="dm__input" value={form.closedBy} onChange={function(e) { upd({ closedBy: e.target.value }); }} /></div>
          </div>
          <div className="dm__field"><FieldLabel label="PNG" hint="Ruta del PNG." /><input className="dm__input" value={form.pngPath} onChange={function(e) { upd({ pngPath: e.target.value }); }} placeholder="/assets/ballistics/b01.png" /></div>
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar entrada</button>
            {form.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { setForm(Object.assign({}, INIT_BALLISTICS)); toast('info','Entrada eliminada.'); }}>Eliminar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Audio sub-tab ────────────────────────────────────────── */
function AudioTab({ toast }) {
  const [models, setModels] = useState(window.DM_DATA.audio.slice());
  const [form, setForm] = useState(Object.assign({}, INIT_AUDIO));
  const [garble, setGarble] = useState(false);
  const [pwd, setPwd] = useState('');
  const upd = function(p) { setForm(function(f) { return Object.assign({}, f, p); }); };

  function selectItem(item) {
    setForm({ id: item.id||'', title: item.title||'', originalSrc: item.originalSrc||'', garbledSrc: item.garbledSrc||'', isGarbled: Boolean(item.isGarbled), passwordHash: item.passwordHash||'' });
    setGarble(Boolean(item.isGarbled));
    setPwd('');
  }

  return (
    <div className="dm__cols">
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Audios</div>
        {!models.length && <p className="dm__hint">No hay audios registrados.</p>}
        <div className="dm__list">
          {models.map(function(m) {
            return (
              <button key={m.id} className={'dm__list-item' + (form.id === m.id ? ' is-active' : '')} onClick={function() { selectItem(m); }}>
                <strong className="dm__list-title">{m.title || m.id}</strong>
                <span className="dm__list-meta">{m.isGarbled ? 'Cifrado' : 'Libre'}</span>
              </button>
            );
          })}
        </div>
        <button className="dm__btn dm__btn--ghost dm__btn--sm" style={{ marginTop:10 }}
          onClick={function() { setForm(Object.assign({}, INIT_AUDIO)); setGarble(false); setPwd(''); }}>Nuevo</button>
      </div>
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Audio / Upload</div>
        <form style={{ display:'flex', flexDirection:'column', gap:12 }}
          onSubmit={function(e) {
            e.preventDefault();
            var updated = Object.assign({}, form, { isGarbled: garble });
            setModels(function(ms) {
              var i = ms.findIndex(function(m) { return m.id === form.id; });
              return i >= 0 ? ms.map(function(m,j) { return j===i ? updated : m; }) : ms.concat([Object.assign({}, updated, { id: form.id || 'aud_' + Date.now().toString(36) })]);
            });
            toast('success', 'Audio "' + (form.title || form.id) + '" guardado.');
          }}>
          <div className="dm__field"><FieldLabel label="ID" hint="Identificador interno del audio." /><input className="dm__input" value={form.id} placeholder="Se genera al subir" readOnly /></div>
          <div className="dm__field"><FieldLabel label="Titulo" hint="Nombre visible para el audio." /><input className="dm__input" value={form.title} onChange={function(e) { upd({ title: e.target.value }); }} /></div>
          <div className="dm__field"><FieldLabel label="MP3" hint="Ruta generada tras subir el audio." /><input className="dm__input" value={form.originalSrc} readOnly /></div>
          <div className="dm__field"><FieldLabel label="Cifrar" hint="Genera versión garbled del audio." />
            <select className="dm__select" value={garble ? 'yes' : 'no'} onChange={function(e) { setGarble(e.target.value === 'yes'); }}>
              <option value="no">No</option><option value="yes">Si</option>
            </select></div>
          {garble && (
            <div className="dm__field"><FieldLabel label="Password" hint="Clave para desbloqueo en terminal." /><input className="dm__input" type="password" value={pwd} onChange={function(e) { setPwd(e.target.value); }} /></div>
          )}
          <div className="dm__field"><FieldLabel label="Subir MP3" hint="Solo .mp3 (max 20MB)." /><input className="dm__input" type="file" accept=".mp3" /></div>
          <div className="dm__field"><FieldLabel label="Garbled" hint="Ruta del audio cifrado (si aplica)." /><input className="dm__input" value={form.garbledSrc} readOnly /></div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
            <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={function() { toast('info','Subida requiere servidor activo.'); }}>Subir MP3</button>
            <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar audio</button>
            {form.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { setModels(function(ms) { return ms.filter(function(m) { return m.id !== form.id; }); }); setForm(Object.assign({}, INIT_AUDIO)); toast('info','Audio eliminado.'); }}>Eliminar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Teléfonos sub-tab ────────────────────────────────────── */
function TelefonosTab({ toast }) {
  var audioModels = window.DM_DATA.audio;
  const [lines, setLines] = useState(window.DM_DATA.phoneLines.slice());
  const [form, setForm] = useState(Object.assign({}, INIT_PHONE));
  const upd = function(p) { setForm(function(f) { return Object.assign({}, f, p); }); };

  return (
    <div className="dm__cols">
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Teléfonos</div>
        {!lines.length && <p className="dm__hint">No hay líneas registradas.</p>}
        <div className="dm__list">
          {lines.map(function(l) {
            return (
              <button key={l.id} className={'dm__list-item' + (form.id === l.id ? ' is-active' : '')}
                onClick={function() { setForm({ id: l.id||'', number: l.number||'', label: l.label||'', audioId: l.audioId||'', rellamable: Boolean(l.rellamable), llamado: Boolean(l.llamado) }); }}>
                <strong className="dm__list-title">{l.label || l.id}</strong>
                <span className="dm__list-meta">{l.number || l.audioId}</span>
              </button>
            );
          })}
        </div>
        <button className="dm__btn dm__btn--ghost dm__btn--sm" style={{ marginTop:10 }} onClick={function() { setForm(Object.assign({}, INIT_PHONE)); }}>Nuevo</button>
      </div>
      <div className="dm__card">
        <div style={{ fontSize:'var(--bem-text-xs)', letterSpacing:'.1em', textTransform:'uppercase', color:'var(--bem-phosphor-bright)', marginBottom:12 }}>Línea / Audio</div>
        <form style={{ display:'flex', flexDirection:'column', gap:12 }}
          onSubmit={function(e) {
            e.preventDefault();
            setLines(function(ls) {
              var i = ls.findIndex(function(l) { return l.id === form.id; });
              return i >= 0 ? ls.map(function(l,j) { return j===i ? Object.assign({}, form) : l; }) : ls.concat([Object.assign({}, form, { id: 'line_' + Date.now().toString(36) })]);
            });
            toast('success', 'Línea "' + (form.label || form.number) + '" guardada.');
          }}>
          <div className="dm__field"><FieldLabel label="ID" hint="Identificador interno de la línea." /><input className="dm__input" value={form.id} placeholder="Se genera al subir" readOnly /></div>
          <div className="dm__field"><FieldLabel label="Número" hint="Número para DIAL (ej: 311-399-2364)." /><input className="dm__input" value={form.number} onChange={function(e) { upd({ number: e.target.value }); }} placeholder="311-399-2364" /></div>
          <div className="dm__field"><FieldLabel label="Etiqueta" hint="Solo para uso interno del DM." /><input className="dm__input" value={form.label} onChange={function(e) { upd({ label: e.target.value }); }} /></div>
          <div className="dm__field"><FieldLabel label="Audio" hint="Selecciona el audio asociado." />
            <select className="dm__select" value={form.audioId} onChange={function(e) { upd({ audioId: e.target.value }); }}>
              <option value="">-- Sin audio --</option>
              {audioModels.map(function(a) { return <option key={a.id} value={a.id}>{a.title || a.id}</option>; })}
            </select></div>
          <div className="dm__field">
            <FieldLabel label="Rellamable" hint="Permite repetir llamadas." />
            <label className="dm__checkbox" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.rellamable} onChange={function(e) { upd({ rellamable: e.target.checked }); }} />
              <span style={{ fontSize:'var(--bem-text-sm)', color:'var(--bem-phosphor-text)' }}>Rellamable</span>
            </label>
          </div>
          <div className="dm__field">
            <FieldLabel label="Llamado" hint="Se activa al primer DIAL." />
            <label className="dm__checkbox" style={{ display:'flex', alignItems:'center', gap:8, cursor:'pointer' }}>
              <input type="checkbox" checked={form.llamado} onChange={function(e) { upd({ llamado: e.target.checked }); }} />
              <span style={{ fontSize:'var(--bem-text-sm)', color:'var(--bem-phosphor-text)' }}>Llamado</span>
            </label>
          </div>
          <div className="dm__field"><FieldLabel label="Subir MP3" hint="Solo .mp3 (max 20MB)." /><input className="dm__input" type="file" accept=".mp3" /></div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
            <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={function() { toast('info','Subida requiere servidor activo.'); }}>Subir MP3</button>
            <button type="submit" className="dm__btn dm__btn--primary dm__btn--sm">Guardar línea</button>
            {form.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" onClick={function() { setLines(function(ls) { return ls.filter(function(l) { return l.id !== form.id; }); }); setForm(Object.assign({}, INIT_PHONE)); toast('info','Línea eliminada.'); }}>Eliminar</button>}
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Top-level Evidencias ─────────────────────────────────── */
const EVIDENCE_TABS = [
  { id: 'stl', label: 'STL' },
  { id: 'ballistics', label: 'Balística' },
  { id: 'audio', label: 'Audio' },
  { id: 'phones', label: 'Teléfonos' },
];

function EvidenciasView({ toast }) {
  const [tab, setTab] = useState('stl');
  return (
    <div>
      <h1 className="dm__section-title">Evidencias</h1>
      <div className="dm__subtabs">
        {EVIDENCE_TABS.map(function(t) {
          return (
            <button key={t.id} className={tab === t.id ? 'active' : ''} onClick={function() { setTab(t.id); }}>{t.label}</button>
          );
        })}
      </div>
      {tab === 'stl'        && <StlTab toast={toast} />}
      {tab === 'ballistics' && <BallisticaTab toast={toast} />}
      {tab === 'audio'      && <AudioTab toast={toast} />}
      {tab === 'phones'     && <TelefonosTab toast={toast} />}
    </div>
  );
}

Object.assign(window, { EvidenciasView });
