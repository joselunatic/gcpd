const EMPTY_DATA = {
  loading: true,
  error: '',
};

const EMPTY_SESSION = {
  activeCase: null,
  alertLevel: 'media',
  syncState: 'sincronizando',
  openLeads: [],
};

const QuestPreflightOverlay = ({
  data = EMPTY_DATA,
  session = EMPTY_SESSION,
  supportState = 'checking',
  message = '',
  onEnterVr,
}) => {
  const primaryLead = session.openLeads?.[0] || null;

  return (
    <div className="quest-preflight">
      <div className="quest-preflight__panel">
        <span className="quest-preflight__eyebrow">Wayne Auxiliary Node // Quest</span>
        <h1>Acceso previo a inmersión</h1>
        <p className="quest-preflight__summary">
          Esta pantalla confirma que la web ha cargado correctamente en Quest Browser
          antes de abrir la sesión inmersiva. El panel del visor se activará después
          del acceso manual a VR.
        </p>

        <div className="quest-preflight__stats">
          <span>caso {session.activeCase?.title || 'sin foco'}</span>
          <span>alerta {session.alertLevel}</span>
          <span>sincronía {session.syncState}</span>
        </div>

        {primaryLead ? (
          <div className="quest-preflight__lead">
            <strong>Lead sugerida</strong>
            <p>{primaryLead.titulo}</p>
          </div>
        ) : null}

        <div className="quest-preflight__actions">
          {supportState === 'supported' ? (
            <button type="button" className="quest-preflight__enter" onClick={onEnterVr}>
              Entrar en VR
            </button>
          ) : (
            <div className="quest-preflight__badge">
              {supportState === 'checking' ? 'Comprobando XR' : 'Vista previa escritorio'}
            </div>
          )}
        </div>

        <p className={`quest-preflight__message${data.error ? ' quest-preflight__message--error' : ''}`}>
          {message || (data.loading ? 'Sincronizando datasets...' : 'Sistema listo.')}
        </p>
      </div>
    </div>
  );
};

export default QuestPreflightOverlay;
