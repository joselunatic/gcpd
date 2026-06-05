/* Views: Cases authoring, RT Effects ops board, Live Map, and stubs. */
const { useState: useStateV } = React;

const STATUS_PILL = {
  active:   ['dm__pill--ok', 'Activo'],
  resolved: ['dm__pill--warn', 'Resuelto'],
  locked:   ['dm__pill--locked', 'Bloqueado'],
};

function CasesView({ toast }) {
  const cases = window.DM_DATA.cases;
  const [sel, setSel] = useStateV(cases[0].id);
  const current = cases.find(c => c.id === sel);
  const [pill, label] = STATUS_PILL[current.status];

  return (
    <div>
      <h1 className="dm__section-title">Casos</h1>
      <p className="dm__section-sub">&gt; Canal de casos activos — Wayne Aux Node // Relay 03</p>
      <div className="dm__cols">
        <div className="dm__card">
          <h2>Registro</h2>
          <div className="dm__list">
            {cases.map(c => {
              const [p] = STATUS_PILL[c.status];
              return (
                <button key={c.id} className={'dm__list-item' + (c.id === sel ? ' is-active' : '')} onClick={() => setSel(c.id)}>
                  <span className="dm__list-title">{c.title}</span>
                  <span className="dm__list-meta">#{c.id} · {c.code}</span>
                  <span className={'dm__pill ' + p} style={{ alignSelf: 'flex-start', marginTop: '.3rem' }}>{STATUS_PILL[c.status][1]}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="dm__card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', marginBottom: '.8rem' }}>
            <h2 style={{ margin: 0 }}>{current.title}</h2>
            <span className={'dm__pill ' + pill}>{label}</span>
          </div>
          <div className="dm__fieldset" style={{ marginBottom: '1rem' }}>
            <div className="dm__grid2">
              <div className="dm__field"><label>Identificador</label><input className="dm__input" defaultValue={current.id} /></div>
              <div className="dm__field"><label>Protocolo</label><input className="dm__input" defaultValue={current.code} /></div>
            </div>
            <div className="dm__field"><label>Brief operativo</label>
              <textarea className="dm__textarea" rows={4} defaultValue={current.brief} /></div>
          </div>
          <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
            {current.tags.map(t => <span key={t} className="dm__badge">{t}</span>)}
          </div>
          <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
            <button className="dm__btn dm__btn--primary" onClick={() => toast('success', 'Caso publicado en el canal.')}>Publicar</button>
            <button className="dm__btn" onClick={() => toast('info', 'Borrador guardado.')}>Guardar</button>
            <button className="dm__btn dm__btn--danger" onClick={() => toast('error', 'Eliminación requiere nivel 3.')}>Eliminar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const RT_GROUPS = [
  { label: 'Alarmas', btns: [ ['alarm','Sirena'], ['critical','Código Rojo'] ] },
  { label: 'Ambiente', btns: [ ['hack','Hackeo'], ['fog','Niebla'], ['flicker','Parpadeo'] ] },
  { label: 'Media', btns: [ ['media','Transmisión'], ['media','Estática'] ] },
];
const RT_MSG = {
  alarm: 'Sirena emitida a todas las pantallas.', critical: 'CÓDIGO ROJO — pantallas en alerta.',
  hack: 'Secuencia de hackeo proyectada.', fog: 'Niebla aplicada al mapa táctico.',
  flicker: 'Parpadeo de luces enviado.', media: 'Media difundida al canal.',
};

function RtEffectsView({ toast }) {
  return (
    <div>
      <h1 className="dm__section-title">Efectos RT</h1>
      <p className="dm__section-sub">&gt; Atmósfera en tiempo real — empujada a las pantallas de los jugadores</p>
      <div className="rt dm__card">
        <div className="rt__header">
          <span className="rt__title">Tablero de Operaciones</span>
          <span className="rt__status rt__status--online">ONLINE</span>
          <span className="rt__agents">3 AGENTES CONECTADOS</span>
        </div>
        {RT_GROUPS.map(g => (
          <div className="rt__group" key={g.label}>
            <span className="rt__group-label">{g.label}</span>
            <div className="rt__row">
              {g.btns.map(([k, lbl], i) => (
                <button key={i} className={`rt__btn rt__btn--${k}`} onClick={() => toast(k === 'critical' || k === 'alarm' ? 'error' : 'info', RT_MSG[k])}>{lbl}</button>
              ))}
            </div>
          </div>
        ))}
        <button className="rt__btn rt__btn--clear" onClick={() => toast('success', 'Todos los efectos despejados.')}>Despejar Todos Los Efectos</button>
      </div>
    </div>
  );
}

function StubView({ title, sub }) {
  return (
    <div>
      <h1 className="dm__section-title">{title}</h1>
      <p className="dm__section-sub">{sub}</p>
      <div className="dm__card" style={{ color: 'var(--bem-phosphor-dim)', fontSize: '.85rem' }}>
        &gt; MÓDULO EN RECREACIÓN — este panel del UI kit demuestra el chrome compartido.
      </div>
    </div>
  );
}

Object.assign(window, { CasesView, RtEffectsView, StubView });
