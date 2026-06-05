/* POIs authoring + Live Map token editor + Villanos — faithful to DmPanel source. */
const { useState: useP, useRef: useRP, useCallback: useCP, useEffect: useEP } = React;

/* Collapsible section — mirrors renderSection() in DmPanel */
function Section({ title, open, onToggle, children }) {
  return (
    <div className="dm__section-block">
      <button type="button" className="dm__section-head" onClick={onToggle}>
        <span>{title}</span>
        <span className="dm__section-chev">{open ? '▾' : '▸'}</span>
      </button>
      {open && <div className="dm__section-body">{children}</div>}
    </div>
  );
}

/* ── POIs ───────────────────────────────────────────────── */
const POI_STATUS = { active: ['dm__pill--ok', 'Activo'], hidden: ['dm__pill--locked', 'Hidden'] };

function PoisView({ toast }) {
  const pois = window.DM_DATA.pois;
  const [selId, setSelId] = useP(pois[0].id);
  const base = pois.find(p => p.id === selId);
  const [form, setForm] = useP({ ...base });
  const [sec, setSec] = useP({ identity: true, summary: true, map: true, resources: false, hidden: false });
  const [advanced, setAdvanced] = useP(false);
  const [saved, setSaved] = useP('GUARDADO');
  const [fineOpen, setFineOpen] = useP(false);
  const [expanded, setExpanded] = useP(false);
  const frameRef = useRP(null);
  const overlayRef = useRP(null);
  const [hover, setHover] = useP(null);

  const select = (p) => { setSelId(p.id); setForm({ ...p }); setSaved('GUARDADO'); };
  const upd = (patch) => { setForm(f => ({ ...f, ...patch })); setSaved('SIN GUARDAR'); };
  const toggle = (k) => setSec(s => ({ ...s, [k]: !s[k] }));
  const clamp = (v) => { const n = Number(v); return !isFinite(n) ? '' : String(Math.max(0, Math.min(100, n))); };

  const pickCoords = (frameEl, e) => {
    const r = frameEl.getBoundingClientRect();
    upd({ mapX: clamp(((e.clientX - r.left) / r.width) * 100), mapY: clamp(((e.clientY - r.top) / r.height) * 100) });
  };
  const trackHover = (frameEl, e) => {
    const r = frameEl.getBoundingClientRect();
    setHover({ x: (((e.clientX - r.left) / r.width) * 100).toFixed(1), y: (((e.clientY - r.top) / r.height) * 100).toFixed(1), px: e.clientX - r.left, py: e.clientY - r.top });
  };

  useEP(() => {
    if (!expanded) return;
    const h = (e) => { if (e.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [expanded]);

  const markerStyle = form.mapX !== '' && form.mapY != null
    ? { position: 'absolute', left: `${form.mapX}%`, top: `${form.mapY}%`, transform: 'translate(-50%,-50%)' }
    : null;
  const [pillCls, pillLabel] = POI_STATUS[form.status] || POI_STATUS.active;

  return (
    <div>
      <h1 className="dm__section-title">POIs</h1>
      <p className="dm__section-sub">&gt; Puntos de interés del mapa de Gotham — hotspots de la TUI</p>
      <div className="dm__cols">
        {/* List */}
        <div className="dm__card">
          <h2>Registro</h2>
          <div className="dm__list">
            {pois.map((p, i) => {
              const [pc, pl] = POI_STATUS[p.status] || POI_STATUS.active;
              return (
                <button key={p.id} className={'dm__list-item' + (p.id === selId ? ' is-active' : '')} onClick={() => select(p)}>
                  <span className="dm__list-meta" style={{ fontSize: 'var(--bem-text-2xs)', marginBottom: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                  <span className="dm__list-title">{p.name}</span>
                  <span className="dm__list-meta">{p.district} · {p.type.replace('_', ' ')}</span>
                  <span className={'dm__pill ' + pc} style={{ alignSelf: 'flex-start', marginTop: '.3rem' }}>{pl}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Editor */}
        <div className="dm__card">
          <div className="dm__actionbar">
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => { setForm({ id: '', name: '', district: '', status: 'active', summary: '', mapX: '', mapY: '', mapRadius: '', mapLabel: '', type: 'related' }); setSaved('SIN GUARDAR'); toast('info', 'Nuevo POI en blanco.'); }}>Nuevo</button>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => { upd({ summary: '', mapLabel: '' }); }}>Limpiar</button>
            <span className="dm__actionbar-spacer"></span>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => setAdvanced(a => !a)}>Avanzado {advanced ? '▾' : '▸'}</button>
            <button className="dm__btn dm__btn--primary dm__btn--sm" onClick={() => { setSaved('GUARDADO'); toast('success', `POI "${form.name || form.id}" sincronizado.`); }}>Guardar</button>
            <span className="dm__save-state">{saved}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="Identidad" open={sec.identity} onToggle={() => toggle('identity')}>
              <div className="dm__grid2">
                <div className="dm__field"><label>ID — Identificador único para la TUI.</label><input className="dm__input" value={form.id} readOnly={!!base.id} onChange={e => upd({ id: e.target.value })} /></div>
                <div className="dm__field"><label>Nombre — Visible para agentes.</label><input className="dm__input" value={form.name} onChange={e => upd({ name: e.target.value })} /></div>
                <div className="dm__field"><label>Distrito — Zona de Gotham.</label><input className="dm__input" value={form.district} onChange={e => upd({ district: e.target.value })} /></div>
                <div className="dm__field"><label>Estado — Visibilidad en la TUI.</label>
                  <select className="dm__select" value={form.status} onChange={e => upd({ status: e.target.value })}>
                    <option value="active">Activo</option><option value="hidden">Hidden</option>
                  </select></div>
              </div>
              <span className={'dm__pill ' + pillCls} style={{ alignSelf: 'flex-start' }}>{pillLabel}</span>
            </Section>

            <Section title="Información Pública" open={sec.summary} onToggle={() => toggle('summary')}>
              <div className="dm__field"><label>Resumen — Texto breve visible para agentes.</label>
                <textarea className="dm__textarea" rows={3} value={form.summary} onChange={e => upd({ summary: e.target.value })} /></div>
            </Section>

            <Section title="Mapa / Hotspot" open={sec.map} onToggle={() => toggle('map')}>
              {/* Thumbnail map picker */}
              <div className="dm__map-thumb" ref={frameRef}
                onClick={e => pickCoords(frameRef.current, e)}
                onPointerMove={e => trackHover(frameRef.current, e)}
                onPointerLeave={() => setHover(null)}>
                {markerStyle && (
                  <div className="dm__map-marker" style={markerStyle}>
                    {form.mapLabel && <span className="dm__map-marker-label">{form.mapLabel}</span>}
                  </div>
                )}
                {hover && <div className="dm__map-tooltip" style={{ left: hover.px + 10, top: Math.max(0, hover.py - 30) }}>X {hover.x}% · Y {hover.y}%</div>}
              </div>

              {/* X / Y / R + Expandir + Ajuste fino */}
              <div className="dm__map-xyz">
                <input className="dm__input" type="number" step="1" placeholder="X" value={form.mapX} onChange={e => upd({ mapX: e.target.value })} onBlur={e => upd({ mapX: clamp(e.target.value) })} />
                <input className="dm__input" type="number" step="1" placeholder="Y" value={form.mapY} onChange={e => upd({ mapY: e.target.value })} onBlur={e => upd({ mapY: clamp(e.target.value) })} />
                <input className="dm__input" type="number" step="0.1" placeholder="R" value={form.mapRadius || ''} onChange={e => upd({ mapRadius: e.target.value })} />
                <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => setExpanded(true)}>Expandir mapa</button>
                <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => setFineOpen(f => !f)}>Ajuste fino</button>
              </div>

              {/* Ajuste fino panel */}
              {fineOpen && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '10px', border: '1px solid var(--bem-border-faint)', borderRadius: 'var(--bem-radius-md)', background: 'rgba(124,255,178,.03)' }}>
                  <div className="dm__field"><label>Label — Texto corto para el hotspot.</label><input className="dm__input" value={form.mapLabel || ''} onChange={e => upd({ mapLabel: e.target.value })} placeholder="Texto corto" /></div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button type="button" className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => upd({ mapX: '', mapY: '', mapLabel: '' })}>Limpiar coordenadas</button>
                    <span className="dm__hint">Snap 1%.</span>
                  </div>
                </div>
              )}
              <p className="dm__hint">Click en el mapa para fijar coordenadas (snap 1%).</p>
            </Section>

            {/* Stub sections that exist in source but are backend-dependent */}
            <Section title="Recursos Quest / mapa" open={sec.resources} onToggle={() => toggle('resources')}>
              <p className="dm__hint">&gt; Recursos de quest y mapa — requiere API de recursos. No disponible en este kit.</p>
            </Section>
            <Section title="SHOW IMAGE / ocultas" open={sec.hidden} onToggle={() => toggle('hidden')}>
              <p className="dm__hint">&gt; Imágenes ocultas para agentes — requiere carga de archivos. No disponible en este kit.</p>
            </Section>

            {advanced && (
              <Section title="Estructura" open={true} onToggle={() => {}}>
                <div className="dm__field"><label>Nodo padre (ID) — Jerarquía en menús.</label><input className="dm__input" value={form.parentId || ''} onChange={e => upd({ parentId: e.target.value })} placeholder="Ej. poi_narrows" /></div>
                <div className="dm__field"><label>Tipo de nodo — Controla submenú.</label>
                  <select className="dm__select" value={form.type} onChange={e => upd({ type: e.target.value })}>
                    <option value="crime_scene">Escena del crimen</option>
                    <option value="operation">Operación</option>
                    <option value="territory">Territorio</option>
                    <option value="related">Relacionado</option>
                  </select></div>
                {base.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => toast('error', 'Eliminación requiere nivel 3.')}>Eliminar POI</button>}
              </Section>
            )}
          </div>
        </div>
      </div>

      {/* Expanded map overlay */}
      {expanded && (
        <div className="dm__modal">
          <div className="dm__modal-backdrop" onClick={() => setExpanded(false)} />
          <div className="dm__modal-card" style={{ width: 'min(860px, 94vw)', padding: 0, overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--bem-border-faint)' }}>
              <strong style={{ fontSize: 'var(--bem-text-sm)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--bem-phosphor-bright)' }}>Mapa / Hotspot</strong>
              <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => setExpanded(false)}>Cerrar</button>
            </div>
            <div style={{ padding: 12 }}>
              <div className="dm__map-thumb" ref={overlayRef} style={{ aspectRatio: 'var(--bem-map-aspect)' }}
                onClick={e => { pickCoords(overlayRef.current, e); setExpanded(false); }}>
                {markerStyle && <div className="dm__map-marker" style={markerStyle}>{form.mapLabel && <span className="dm__map-marker-label">{form.mapLabel}</span>}</div>}
              </div>
              <p className="dm__hint" style={{ marginTop: 8 }}>Click para fijar coordenadas. Esc para cerrar.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Live Map ───────────────────────────────────────────── */
function LiveMapView({ toast }) {
  const [tokens, setTokens] = useP(() => window.DM_DATA.liveTokens.map(t => ({ ...t })));
  const [selId, setSelId] = useP('');
  const [form, setForm] = useP({ agentLabel: '', dmLabel: '', kind: 'ally', visible: true });
  const surfRef = useRP(null);
  const dragRef = useRP(null);
  const idRef = useRP(100);
  const sel = tokens.find(t => t.id === selId) || null;

  const clamp = v => Math.max(0, Math.min(100, v));
  const onDown = (e, t) => { e.preventDefault(); dragRef.current = t.id; setSelId(t.id); e.currentTarget.setPointerCapture?.(e.pointerId); };
  const onMove = (e) => {
    if (!dragRef.current || !surfRef.current) return;
    const r = surfRef.current.getBoundingClientRect();
    setTokens(ts => ts.map(t => t.id === dragRef.current ? { ...t, x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) } : t));
  };
  const onUp = () => { dragRef.current = null; };

  const create = (e) => {
    e.preventDefault();
    if (!form.agentLabel.trim() && !form.dmLabel.trim()) { toast('error', 'Etiqueta obligatoria para crear token.'); return; }
    const id = 't' + (++idRef.current);
    setTokens(ts => [...ts, { id, agentLabel: form.agentLabel || form.dmLabel, dmLabel: form.dmLabel || form.agentLabel, kind: form.kind, visible: form.visible, x: 50, y: 50 }]);
    setForm({ agentLabel: '', dmLabel: '', kind: 'ally', visible: true });
    setSelId(id);
    toast('success', 'Token creado en el centro del plano.');
  };
  const patchSel = (patch) => setTokens(ts => ts.map(t => t.id === selId ? { ...t, ...patch } : t));
  const delSel = () => { setTokens(ts => ts.filter(t => t.id !== selId)); setSelId(''); toast('info', 'Token eliminado.'); };

  const selAgentLabel = sel?.agentLabel || '';
  const selDmLabel = sel?.dmLabel || '';

  return (
    <div>
      <h1 className="dm__section-title">Mapa Live</h1>
      <p className="dm__section-sub">&gt; Vista táctica — arrastra tokens para moverlos · SYNC: LIVE</p>
      <div className="lm">
        <div className="dm__card" style={{ padding: 12 }}>
          <div className="lm__surface" ref={surfRef} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}>
            {!tokens.length && <div className="lm__empty">FALLBACK MAP</div>}
            {tokens.map(t => (
              <div key={t.id}
                className={'lm__token' + (selId === t.id ? ' is-selected' : '') + (t.visible ? '' : ' is-hidden')}
                data-kind={t.kind}
                style={{ left: `${t.x}%`, top: `${t.y}%` }}
                onPointerDown={e => onDown(e, t)}
                onClick={() => setSelId(t.id)}
                title={`${t.dmLabel || t.agentLabel}`}>
                {t.dmLabel || t.agentLabel}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--bem-space-5)' }}>
          {/* Create token form */}
          <div className="dm__card">
            <div style={{ fontSize: 'var(--bem-text-xs)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bem-phosphor-bright)', marginBottom: 12 }}>Tokens</div>
            <form onSubmit={create} className="dm-panel__form dm-panel__form--compact live-map-token-form" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label className="dm__field">Etiqueta agente<input className="dm__input" value={form.agentLabel} onChange={e => setForm(f => ({ ...f, agentLabel: e.target.value }))} placeholder="Unidad GCPD" /></label>
              <label className="dm__field">Etiqueta DM<input className="dm__input" value={form.dmLabel} onChange={e => setForm(f => ({ ...f, dmLabel: e.target.value }))} placeholder="Unidad GCPD / alias privado" /></label>
              <label className="dm__field">Tipo
                <select className="dm__select" value={form.kind} onChange={e => setForm(f => ({ ...f, kind: e.target.value }))}>
                  <option value="ally">Aliado</option><option value="enemy">Enemigo</option>
                </select></label>
              <label className="dm__field dm__checkbox"><input type="checkbox" checked={form.visible} onChange={e => setForm(f => ({ ...f, visible: e.target.checked }))} /> Visible para agentes</label>
              <button className="dm__btn dm__btn--primary" type="submit">Crear token</button>
            </form>

            <div className="lm__list" style={{ marginTop: '1rem' }}>
              {tokens.map(t => (
                <button key={t.id} className={selId === t.id ? 'active' : ''} onClick={() => setSelId(t.id)}
                  title={`${t.dmLabel || t.agentLabel} · ${t.agentLabel} · X ${t.x.toFixed(1)} / Y ${t.y.toFixed(1)}`}>
                  <strong>{t.dmLabel || t.agentLabel}</strong>
                  <span>{t.agentLabel} · {t.kind === 'enemy' ? 'ENEMIGO' : 'ALIADO'} · {t.visible ? 'VISIBLE' : 'OCULTO'}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Selected token editor — only when a token is selected */}
          {sel && (
            <div className="dm__card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 'var(--bem-text-xs)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bem-phosphor-bright)' }}>Token seleccionado</div>
              <p className="dm__hint" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: 0 }}>
                <span>AGENTE: {selAgentLabel || 'SIN DATOS'}</span>
                <span>DM: {selDmLabel || 'SIN DATOS'}</span>
              </p>
              <label className="dm__field">Etiqueta agente
                <input className="dm__input" value={selAgentLabel} onChange={e => patchSel({ agentLabel: e.target.value })} placeholder="Visible para agentes" /></label>
              <label className="dm__field">Etiqueta DM
                <input className="dm__input" value={selDmLabel} onChange={e => patchSel({ dmLabel: e.target.value })} placeholder="Alias privado" /></label>
              <label className="dm__field">Tipo
                <select className="dm__select" value={sel.kind} onChange={e => patchSel({ kind: e.target.value })}>
                  <option value="ally">Aliado</option><option value="enemy">Enemigo</option>
                </select></label>
              <label className="dm__field dm__checkbox"><input type="checkbox" checked={sel.visible} onChange={e => patchSel({ visible: e.target.checked })} /> Visible para agentes</label>
              <button className="dm__btn dm__btn--danger" onClick={delSel}>Eliminar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Villanos ───────────────────────────────────────────── */
const INITIAL_VILLAIN = { id: '', alias: '', realName: '', status: '', species: '', age: '', height: '', weight: '', threatLevel: '', lastSeen: '', summary: '', patterns: '', knownAssociates: '', notes: '' };

function VillanosView({ toast }) {
  const data = window.DM_DATA.villains;
  const [sel, setSel] = useP(data[0]);
  const [form, setForm] = useP({ ...data[0] });
  const [base, setBase] = useP(JSON.stringify(data[0]));
  const [advanced, setAdvanced] = useP(false);
  const [sec, setSec] = useP({ identity: true, summary: true, details: true });
  const toggle = k => setSec(s => ({ ...s, [k]: !s[k] }));
  const upd = patch => setForm(f => ({ ...f, ...patch }));
  const isDirty = JSON.stringify(form) !== base;
  const saveState = isDirty ? 'SIN GUARDAR' : 'GUARDADO';

  const selectItem = (item) => { setSel(item); setForm({ ...item }); setBase(JSON.stringify(item)); };
  const reset = () => { selectItem(sel); };
  const clear = () => { setForm({ ...INITIAL_VILLAIN }); setSel(null); setBase(JSON.stringify(INITIAL_VILLAIN)); };

  return (
    <div>
      <h1 className="dm__section-title">Galería de villanos</h1>
      <p className="dm__section-sub">&gt; Perfiles de amenazas conocidas — Wayne Aux Node // Relay 03</p>
      <div className="dm__cols">
        {/* List */}
        <div className="dm__card">
          <div style={{ fontSize: 'var(--bem-text-xs)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--bem-phosphor-bright)', marginBottom: 12 }}>Listado de villanos</div>
          <div className="dm__list">
            {data.map((v, i) => (
              <button key={v.id} className={'dm__list-item' + (sel?.id === v.id ? ' is-active' : '')} onClick={() => selectItem(v)}>
                <span className="dm__list-meta" style={{ fontSize: 'var(--bem-text-2xs)', marginBottom: 2 }}>{String(i + 1).padStart(2, '0')}</span>
                <span className="dm__list-title">{v.alias}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="dm__card">
          <div className="dm__actionbar">
            <button className="dm__btn dm__btn--primary dm__btn--sm" onClick={() => { setBase(JSON.stringify(form)); toast('success', `Villano "${form.alias || form.id}" guardado.`); }}>Guardar</button>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={() => setAdvanced(a => !a)}>Avanzado {advanced ? '▾' : '▸'}</button>
            <span className="dm__actionbar-spacer"></span>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={reset}>Nuevo</button>
            <button className="dm__btn dm__btn--ghost dm__btn--sm" onClick={clear}>Limpiar</button>
            <span className="dm__save-state" style={{ color: isDirty ? 'var(--bem-warn)' : 'var(--bem-ok)' }}>{saveState}</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Section title="Identidad" open={sec.identity} onToggle={() => toggle('identity')}>
              <div className="dm__grid2">
                <div className="dm__field"><label>ID — Identificador único.</label><input className="dm__input" value={form.id} readOnly={!!sel?.id} onChange={e => upd({ id: e.target.value })} /></div>
                <div className="dm__field"><label>Alias — Nombre visible para agentes.</label><input className="dm__input" value={form.alias} onChange={e => upd({ alias: e.target.value })} /></div>
              </div>
            </Section>

            <Section title="Resumen" open={sec.summary} onToggle={() => toggle('summary')}>
              <div className="dm__field"><label>Resumen — Texto visible para agentes.</label>
                <textarea className="dm__textarea" rows={3} value={form.summary} onChange={e => upd({ summary: e.target.value })} /></div>
            </Section>

            {advanced && (
              <Section title="Detalles" open={sec.details} onToggle={() => toggle('details')}>
                <div className="dm__grid2">
                  <div className="dm__field"><label>Nombre real — Campo opcional.</label><input className="dm__input" value={form.realName} onChange={e => upd({ realName: e.target.value })} /></div>
                  <div className="dm__field"><label>Estado — Activo, detenido, etc.</label><input className="dm__input" value={form.status} onChange={e => upd({ status: e.target.value })} placeholder="Activo" /></div>
                  <div className="dm__field"><label>Especie — Humano, meta, etc.</label><input className="dm__input" value={form.species} onChange={e => upd({ species: e.target.value })} /></div>
                  <div className="dm__field"><label>Edad — Número o rango.</label><input className="dm__input" value={form.age} onChange={e => upd({ age: e.target.value })} /></div>
                  <div className="dm__field"><label>Altura — Ej. 1.85m.</label><input className="dm__input" value={form.height} onChange={e => upd({ height: e.target.value })} /></div>
                  <div className="dm__field"><label>Peso — Ej. 90kg.</label><input className="dm__input" value={form.weight} onChange={e => upd({ weight: e.target.value })} /></div>
                  <div className="dm__field"><label>Nivel de amenaza — Bajo/Medio/Alto.</label><input className="dm__input" value={form.threatLevel} onChange={e => upd({ threatLevel: e.target.value })} /></div>
                  <div className="dm__field"><label>Última vez visto — Fecha o lugar.</label><input className="dm__input" value={form.lastSeen} onChange={e => upd({ lastSeen: e.target.value })} /></div>
                </div>
                <div className="dm__field"><label>Patrones — Una línea por ítem.</label><textarea className="dm__textarea" rows={3} value={form.patterns} onChange={e => upd({ patterns: e.target.value })} /></div>
                <div className="dm__field"><label>Asociados conocidos — Una línea por ítem.</label><textarea className="dm__textarea" rows={2} value={form.knownAssociates} onChange={e => upd({ knownAssociates: e.target.value })} /></div>
                <div className="dm__field"><label>Notas — Una línea por ítem.</label><textarea className="dm__textarea" rows={2} value={form.notes} onChange={e => upd({ notes: e.target.value })} /></div>
                {sel?.id && <button type="button" className="dm__btn dm__btn--danger dm__btn--sm" style={{ alignSelf: 'flex-start', marginTop: 4 }} onClick={() => toast('error', 'Eliminación requiere confirmación de nivel 3.')}>Eliminar villano</button>}
              </Section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { PoisView, LiveMapView, VillanosView, Section });
