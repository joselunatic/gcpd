import { PHONE_MODE_CALL, PHONE_MODE_TRACER } from './hooks/useQuestSession';

const EMPTY_PHONE_STATE = {
  focusMode: false,
  mode: PHONE_MODE_CALL,
  activeMode: null,
  dialedDigits: '',
  lastDialedNumber: '',
  lineStatus: 'colgada',
  lastAction: '',
  tracerWsState: 'offline',
  hotspotLabel: '',
  activeAudioLabel: '',
};

const QuestPhoneOverlay = ({ session }) => {
  const phoneState = session?.phoneState || EMPTY_PHONE_STATE;
  const actions = session?.actions || {};

  if (!phoneState.focusMode) return null;

  const activeDigits = phoneState.dialedDigits || phoneState.lastDialedNumber || 'sin marcación';
  const modeLocked = Boolean(phoneState.activeMode);

  return (
    <div className="quest-phone-overlay">
      <div className="quest-phone-overlay__card">
        <span className="quest-phone-overlay__eyebrow">Wayne Auxiliary Phone</span>
        <h2>Control de línea</h2>
        <div className="quest-phone-overlay__mode-switch">
          <button
            type="button"
            className={phoneState.mode === PHONE_MODE_CALL ? 'is-active' : ''}
            onClick={() => actions.setPhoneMode?.(PHONE_MODE_CALL)}
            disabled={modeLocked}
          >
            Llamada
          </button>
          <button
            type="button"
            className={phoneState.mode === PHONE_MODE_TRACER ? 'is-active' : ''}
            onClick={() => actions.setPhoneMode?.(PHONE_MODE_TRACER)}
            disabled={modeLocked}
          >
            Traza
          </button>
        </div>
        <div className="quest-phone-overlay__stats">
          <span>modo {phoneState.mode === PHONE_MODE_TRACER ? 'traza' : 'llamada'}</span>
          <span>línea {phoneState.lineStatus}</span>
          <span>ws {phoneState.tracerWsState}</span>
        </div>
        <p className="quest-phone-overlay__primary">
          número {activeDigits}
        </p>
        {phoneState.activeAudioLabel ? (
          <p className="quest-phone-overlay__status">
            reproducción {phoneState.activeAudioLabel}
          </p>
        ) : null}
        {phoneState.hotspotLabel ? (
          <p className="quest-phone-overlay__status">
            hotspot {phoneState.hotspotLabel}
          </p>
        ) : null}
        <p className="quest-phone-overlay__status">
          {phoneState.lastAction || 'Usa CALL para iniciar o colgar.'}
        </p>
        <p className="quest-phone-overlay__hint">
          CALL inicia o cuelga. CLEAR limpia el buffer en reposo.
        </p>
      </div>
    </div>
  );
};

export default QuestPhoneOverlay;
