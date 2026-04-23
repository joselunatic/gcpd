import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../css/PhonePanel.styles.css';

const DEFAULT_STEP_MS = 15_000;
const DEFAULT_EXACT_MS = 45_000;

const clampMs = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n;
};

const stageFromElapsed = (elapsedMs, timeline = {}) => {
  const stepMs = clampMs(timeline.stepMs) || DEFAULT_STEP_MS;
  const exactMs = clampMs(timeline.exactMs) || DEFAULT_EXACT_MS;
  if (elapsedMs >= exactMs) return 3;
  if (elapsedMs >= stepMs * 2) return 2;
  if (elapsedMs >= stepMs) return 1;
  return 0;
};

const formatClock = (elapsedMs) => {
  const totalMs = clampMs(elapsedMs);
  return `T+${(totalMs / 1000).toFixed(1)}s`;
};

const phaseLabel = (stage) => {
  if (stage >= 3) return 'Fase 3 · Posicion exacta';
  if (stage === 2) return 'Fase 2 · Triangulacion avanzada';
  if (stage === 1) return 'Fase 1 · Radio reducido';
  return 'Fase 0 · Cobertura total';
};

const normalizeCall = (entry = {}) => ({
  ...entry,
  callId: String(entry.callId || ''),
  state: String(entry.state || 'incoming'),
  answeredAt: entry.answeredAt ? Number(entry.answeredAt) : null,
  createdAt: entry.createdAt ? Number(entry.createdAt) : Date.now(),
  timeoutMs: clampMs(entry.timeoutMs),
  timeline: {
    stepMs: clampMs(entry.timeline?.stepMs) || DEFAULT_STEP_MS,
    exactMs: clampMs(entry.timeline?.exactMs) || DEFAULT_EXACT_MS,
  },
});

const PhonePanel = () => {
  const [wsState, setWsState] = useState('offline');
  const [message, setMessage] = useState('');
  const [calls, setCalls] = useState([]);
  const [clockNow, setClockNow] = useState(Date.now());
  const socketRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setClockNow(Date.now());
    }, 250);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${protocol}://${window.location.host}/ws/tracer?role=phone`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;
    setWsState('connecting');
    setMessage('');

    socket.onopen = () => setWsState('online');

    socket.onclose = () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setWsState('offline');
    };

    socket.onerror = () => setWsState('error');

    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(String(event.data || '{}'));
      } catch {
        return;
      }

      if (payload.type === 'tracer:snapshot') {
        const next = Array.isArray(payload.calls) ? payload.calls.map(normalizeCall) : [];
        setCalls(next);
        return;
      }

      if (payload.type === 'tracer:incoming') {
        const call = payload.call;
        if (!call?.callId) return;
        const normalizedCall = normalizeCall({
          ...call,
          state: 'incoming',
        });
        setCalls((prev) => [
          normalizedCall,
          ...prev.filter((entry) => entry.callId !== normalizedCall.callId),
        ]);
        return;
      }

      if (payload.type === 'tracer:answered') {
        const callId = payload.callId;
        if (!callId) return;
        setCalls((prev) =>
          prev.map((entry) =>
            entry.callId === callId
              ? normalizeCall({
                  ...entry,
                  state: 'answered',
                  answeredAt: payload.answeredAt || Date.now(),
                  line: payload.line || entry.line,
                  hotspot: payload.hotspot || entry.hotspot,
                  timeline: payload.timeline || entry.timeline,
                })
              : entry
          )
        );
        return;
      }

      if (payload.type === 'tracer:ended') {
        const callId = payload.callId;
        if (!callId) return;
        setCalls((prev) => prev.filter((entry) => entry.callId !== callId));
        return;
      }

      if (payload.type === 'tracer:error') {
        if (payload.message) setMessage(String(payload.message));
      }
    };

    return () => {
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      socket.close(1000, 'cleanup');
    };
  }, []);

  const sendAction = useCallback((type, callId) => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== 1) {
      setMessage('WebSocket tracer offline.');
      return;
    }
    socket.send(JSON.stringify({ type, callId }));
  }, []);

  const prioritizedCall = useMemo(() => {
    const incoming = calls
      .filter((call) => call.state !== 'answered')
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
    if (incoming) return incoming;
    return calls
      .filter((call) => call.state === 'answered')
      .sort((a, b) => Number(b.answeredAt || 0) - Number(a.answeredAt || 0))[0];
  }, [calls]);

  const lineStatus = useMemo(() => {
    if (wsState !== 'online') return { id: 'offline', label: 'linea no disponible' };
    if (calls.some((call) => call.state !== 'answered')) {
      return { id: 'incoming', label: 'llamada entrante' };
    }
    if (calls.some((call) => call.state === 'answered')) {
      return { id: 'active', label: 'llamada en curso' };
    }
    return { id: 'available', label: 'linea disponible' };
  }, [wsState, calls]);

  const tracerTelemetry = useMemo(() => {
    if (!prioritizedCall) {
      return {
        clock: 'T+00.0s',
        stage: 0,
        phase: 'Fase 0 · En espera de llamada',
        ringCountdown: null,
      };
    }

    if (prioritizedCall.state === 'answered' && prioritizedCall.answeredAt) {
      const elapsedMs = Math.max(0, clockNow - Number(prioritizedCall.answeredAt || 0));
      const stage = stageFromElapsed(elapsedMs, prioritizedCall.timeline);
      return {
        clock: formatClock(elapsedMs),
        stage,
        phase: phaseLabel(stage),
        ringCountdown: null,
      };
    }

    const timeoutMs = clampMs(prioritizedCall.timeoutMs) || 60_000;
    const createdAt = Number(prioritizedCall.createdAt || clockNow);
    const remaining = Math.max(0, timeoutMs - (clockNow - createdAt));
    return {
      clock: 'T+00.0s',
      stage: 0,
      phase: 'Esperando descolgar para iniciar traza',
      ringCountdown: `Autocuelgue en ${(remaining / 1000).toFixed(1)}s`,
    };
  }, [clockNow, prioritizedCall]);

  const shouldGuideAnswer = Boolean(
    prioritizedCall && prioritizedCall.state !== 'answered' && wsState === 'online'
  );

  return (
    <div className="phone-panel">
      <div className="phone-panel__inner">
        <header className="phone-panel__header">
          <h1>TRACER / Phone Bridge</h1>
          <p>Control rápido para operador DM en móvil.</p>
        </header>

        <section className="phone-panel__card">
          <div className="phone-panel__status-row">
            <span className={`phone-panel__pill phone-panel__pill--${lineStatus.id}`}>
              {lineStatus.label}
            </span>
            <span className={`phone-panel__pill phone-panel__pill--ws-${wsState}`}>
              ws {wsState}
            </span>
          </div>
        </section>

        <section className="phone-panel__card phone-panel__card--telemetry">
          <div className="phone-panel__telemetry-grid">
            <div>
              <div className="phone-panel__telemetry-label">Reloj TRACER</div>
              <div className="phone-panel__telemetry-value">{tracerTelemetry.clock}</div>
            </div>
            <div>
              <div className="phone-panel__telemetry-label">Fase agente</div>
              <div className="phone-panel__telemetry-value">{tracerTelemetry.phase}</div>
            </div>
          </div>
          {tracerTelemetry.ringCountdown && (
            <div className="phone-panel__hint phone-panel__hint--warn">
              {tracerTelemetry.ringCountdown}
            </div>
          )}
        </section>

        <section className="phone-panel__card phone-panel__card--call">
          {!prioritizedCall && <p className="phone-panel__empty">Esperando llamadas TRACER.</p>}

          {prioritizedCall && (
            <>
              {shouldGuideAnswer && (
                <div className="phone-panel__incoming-guide">
                  LLAMADA ENTRANTE · Pulsa el boton verde <strong>DESCOLGAR</strong> para iniciar la
                  traza.
                </div>
              )}
              <div className="phone-panel__call-title">
                #{prioritizedCall.number} · {prioritizedCall.label || 'Sin etiqueta'}
              </div>
              <div className="phone-panel__call-meta">
                hotspot: {prioritizedCall.hotspotLabel || prioritizedCall.hotspotId || 'n/a'}
              </div>

              {prioritizedCall.state !== 'answered' ? (
                <div className="phone-panel__actions">
                  <button
                    type="button"
                    className={`phone-panel__btn phone-panel__btn--accept${
                      shouldGuideAnswer ? ' phone-panel__btn--guide' : ''
                    }`}
                    onClick={() => sendAction('tracer:answer', prioritizedCall.callId)}
                  >
                    Descolgar
                  </button>
                  <button
                    type="button"
                    className="phone-panel__btn phone-panel__btn--hang"
                    onClick={() => sendAction('tracer:hangup', prioritizedCall.callId)}
                  >
                    Colgar
                  </button>
                </div>
              ) : (
                <div className="phone-panel__actions">
                  <button
                    type="button"
                    className="phone-panel__btn phone-panel__btn--hang"
                    onClick={() => sendAction('tracer:hangup', prioritizedCall.callId)}
                  >
                    Colgar
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {message && <p className="phone-panel__error">{message}</p>}
      </div>
    </div>
  );
};

export default PhonePanel;
