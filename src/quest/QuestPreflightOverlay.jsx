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
  onPreviewDesktop,
  onRecenter,
}) => {
  const primaryLead = session.openLeads?.[0] || null;

  return (
    <div className="quest-preflight">
      <div className="quest-preflight__panel">
        <span className="quest-preflight__eyebrow">Wayne Auxiliary Node // Quest</span>
        <h1>Acceso previo a inmersión</h1>
        <p className="quest-preflight__summary">
          Nodo Quest sincronizado con el caso activo. El visor central queda
          preparado para continuar la operación en modo inmersivo.
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
            <button
              type="button"
              className="quest-preflight__enter"
              onClick={onPreviewDesktop}
            >
              {supportState === 'checking' ? 'Comprobando XR' : 'Vista previa escritorio'}
            </button>
          )}
          {supportState === 'supported' ? (
            <button
              type="button"
              className="quest-preflight__recenter"
              onClick={onPreviewDesktop}
            >
              Vista escritorio
            </button>
          ) : null}
          <button
            type="button"
            className="quest-preflight__recenter"
            onClick={onRecenter}
          >
            Recentrar vista
          </button>
        </div>

        <p className={`quest-preflight__message${data.error ? ' quest-preflight__message--error' : ''}`}>
          {message || (data.loading ? 'Sincronizando datasets...' : 'Sistema listo.')}
        </p>
      </div>
    </div>
  );
};

export default QuestPreflightOverlay;
