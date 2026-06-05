/* App: auth gate → workspace with nav, views, toasts, Ctrl+K search. */
const { useState: useS, useEffect: useE, useCallback: useC, useRef: useR } = React;

const AUTH_LINES = [
  ['WAYNE INDUSTRIES AUXILIARY NODE // BUILD 79-A', false],
  ['PROTOCOL: KNIGHTFALL-C (CONTINGENCIA POST-BATMAN)', false],
  ['SUBSYSTEM: BROTHER-MK0 // PROTOTYPE BROTHER EYE', false],
  ['CHANNEL: GCPD BACKDOOR RELAY 03', false],
  ['SYSLOG: BATSIGNAL OFFLINE | ORACLE RELAY: STANDBY', false],
  ['', false],
  ['NOTA DE ARCHIVO:', true],
  ['> SI HAS ENCONTRADO ESTE TERMINAL, BRUCE NO ESTA.', true],
  ['> TE TOCA A TI, AGENTE. INTRODUCE LA CLAVE.', true],
];

function AuthGate({ onAuth }) {
  const [val, setVal] = useS('');
  const submit = (e) => { e.preventDefault(); onAuth(); };
  return (
    <div className="dm dm__auth">
      <form className="dm__auth-card" onSubmit={submit}>
        <pre className="dm__auth-log">{AUTH_LINES.map(([l, hi], i) =>
          <div key={i} className={hi ? 'x' : ''}>{l || '\u00a0'}</div>)}</pre>
        <div className="dm__field">
          <label>Clave de acceso</label>
          <input className="dm__input" type="password" placeholder="INPUT REQUIRED"
            value={val} onChange={e => setVal(e.target.value)} autoFocus />
        </div>
        <button className="dm__btn dm__btn--primary" type="submit" style={{ alignSelf: 'flex-start' }}>Autorizar ▸</button>
        <span style={{ fontSize: '.7rem', color: 'rgba(180,255,228,.4)' }}>READ ONLY CHANNEL · cualquier clave abre la demo</span>
      </form>
    </div>
  );
}

function Workspace() {
  const [tab, setTab] = useS('cases');
  const [toasts, setToasts] = useS([]);
  const [search, setSearch] = useS(false);
  const idRef = useR(0);

  const toast = useC((type, text) => {
    const id = ++idRef.current;
    setToasts(t => [...t, { id, type, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  const dismiss = useC((id) => setToasts(t => t.filter(x => x.id !== id)), []);

  useE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setSearch(true); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const view = () => {
    switch (tab) {
      case 'cases': return <CasesView toast={toast} />;
      case 'rtEffects': return <RtEffectsView toast={toast} />;
      case 'liveMap': return <LiveMapView toast={toast} />;
      case 'pois': return <PoisView toast={toast} />;
      case 'villains': return <VillanosView toast={toast} />;
      case 'evidence': return <EvidenciasView toast={toast} />;
      case 'tracer': return <TracerView toast={toast} />;
      case 'access': return <AccesosView toast={toast} />;
      case 'campaign': return <CampanaView toast={toast} />;
      default: return <CasesView toast={toast} />;
    }
  };

  return (
    <div className="dm">
      <div className="dm__inner">
        <Header sync="LIVE" onSearch={() => setSearch(true)} />
        <NavRail active={tab} onSelect={setTab} />
        {view()}
      </div>
      <Toasts toasts={toasts} onDismiss={dismiss} />
      {search && <GlobalSearch onClose={() => setSearch(false)} onPick={(dest) => { setTab(dest); setSearch(false); }} />}
    </div>
  );
}

function App() {
  const [authed, setAuthed] = useS(false);
  return authed ? <Workspace /> : <AuthGate onAuth={() => setAuthed(true)} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
