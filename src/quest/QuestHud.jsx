const EMPTY_DATA = {
  loading: true,
  error: '',
  cases: [],
  pois: [],
  villains: [],
};

const EMPTY_SESSION = {
  activeCase: null,
  alertLevel: 'media',
  syncState: 'sincronizando',
  currentModule: 'operacion',
  phoneState: {
    focusMode: false,
    isOffHook: false,
    dialedDigits: '',
    lastDialedNumber: '',
    lineStatus: 'colgada',
    tracerWsState: 'offline',
  },
  actions: {
    goToOperacion: () => {},
    goToCasos: () => {},
    goToMapa: () => {},
    goToPerfiles: () => {},
    goToHerramientas: () => {},
  },
};

const QuestHud = ({ data = EMPTY_DATA, session = EMPTY_SESSION }) => {
  const primaryLead = session.openLeads?.[0] || null;

  return (
    <div className="quest-hud">
      <div className="quest-hud__card">
        <span className="quest-hud__eyebrow">Nodo auxiliar Wayne / Quest</span>
        <h1>Operación en curso</h1>
        <p className="quest-hud__summary">
          El monitor central lleva la interacción principal. Este HUD mantiene
          foco de caso, lead sugerida y acceso rápido en escritorio.
        </p>
        <div className="quest-hud__stats">
          <span>caso {session.activeCase?.title || 'sin foco'}</span>
          <span>alerta {session.alertLevel}</span>
          <span>sincronía {session.syncState}</span>
        </div>
        {primaryLead ? (
          <p className="quest-hud__status">
            lead {primaryLead.titulo}
          </p>
        ) : null}
        <p className="quest-hud__status">
          línea {session.phoneState?.lineStatus || 'colgada'} · {session.phoneState?.dialedDigits || session.phoneState?.lastDialedNumber || 'sin marcación'}
        </p>
        <p className="quest-hud__status">
          tracer ws {session.phoneState?.tracerWsState || 'offline'}
        </p>
        {session.phoneState?.focusMode ? (
          <p className="quest-hud__status">
            teléfono enfocado
          </p>
        ) : null}
        <div className="quest-hud__nav">
          <button type="button" onClick={session.actions.goToOperacion}>
            Operación
          </button>
          <button type="button" onClick={session.actions.goToCasos}>
            Casos
          </button>
          <button type="button" onClick={session.actions.goToMapa}>
            Mapa
          </button>
          <button type="button" onClick={session.actions.goToPerfiles}>
            Perfiles
          </button>
          <button type="button" onClick={() => session.actions.goToHerramientas({ tool: 'evidencias' })}>
            Herramientas
          </button>
        </div>
        {data.error ? (
          <p className="quest-hud__status quest-hud__status--error">
            datos locales activos: {data.error}
          </p>
        ) : (
          <p className="quest-hud__status">
            {data.loading ? 'sincronizando datasets...' : `módulo activo: ${session.currentModule}`}
          </p>
        )}
      </div>
    </div>
  );
};

export default QuestHud;
