import { useCallback, useEffect, useRef, useState } from 'react';
import '../css/EfectosPage.styles.css';

const AUTH_ENDPOINT = '/api/auth';
const RT_MEDIA_ENDPOINT = '/api/rt-effects-media';
const DURATION_INFINITY_SEC = 60;

const EFFECT_LABELS = {
  alarm:    'ALARMA',
  hack:     'HACKEO SEVERO',
  fog:      'NIEBLA',
  critical: 'CRÍTICO',
  flicker:  'FLICKER',
  media:    'MEDIA',
  clear:    'CLEAR',
};

const toEffectLabel = (raw = '') =>
  EFFECT_LABELS[raw] ?? String(raw).toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────

const EfectosPage = () => {

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [sessionToken, setSessionToken] = useState(
    () => localStorage.getItem('dmSessionToken') || ''
  );
  const [authorized,    setAuthorized]   = useState(false);
  const [authChecked,   setAuthChecked]  = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError,     setAuthError]    = useState('');
  const [authLoading,   setAuthLoading]  = useState(false);

  // ── WebSocket ─────────────────────────────────────────────────────────────
  const wsRef = useRef(null);
  const [wsState,    setWsState]    = useState('offline');
  const [agentCount, setAgentCount] = useState(0);
  const [agentState, setAgentState] = useState({ label: 'SIN EMISIÓN', tone: 'idle' });

  // ── Effect draft ──────────────────────────────────────────────────────────
  const [durationSec, setDurationSec] = useState(8);
  const [draft,       setDraft]       = useState(null); // { effect, options }
  const [log,         setLog]         = useState([]);

  // ── Alarm modal ───────────────────────────────────────────────────────────
  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmDraft,     setAlarmDraft]     = useState('ALERTA DE SEGURIDAD');
  const alarmInputRef = useRef(null);

  // ── Media library ─────────────────────────────────────────────────────────
  const [library,        setLibrary]        = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState('');
  const [selectedId,     setSelectedId]     = useState('');

  // ── Upload ────────────────────────────────────────────────────────────────
  const [uploadFile,  setUploadFile]  = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc,  setUploadDesc]  = useState('');
  const [uploading,   setUploading]   = useState(false);
  const [uploadOpen,  setUploadOpen]  = useState(false);

  // ── Direct emit ───────────────────────────────────────────────────────────
  const [directUrl,     setDirectUrl]     = useState('');
  const [directType,    setDirectType]    = useState('video');
  const [directCaption, setDirectCaption] = useState('');

  // ── Navigation ────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('triggers');

  // ─── Auth: validate existing token on mount ───────────────────────────────
  useEffect(() => {
    if (!sessionToken) {
      setAuthChecked(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${AUTH_ENDPOINT}/session`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (res.ok) {
          setAuthorized(true);
        } else {
          localStorage.removeItem('dmSessionToken');
          setSessionToken('');
        }
      } catch {
        // network down — keep form visible
      } finally {
        setAuthChecked(true);
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Auth: login ──────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) return;
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${AUTH_ENDPOINT}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.token) {
        localStorage.setItem('dmSessionToken', data.token);
        setSessionToken(data.token);
        setAuthorized(true);
        setPasswordInput('');
      } else {
        setAuthError(data.message || 'Credenciales incorrectas.');
      }
    } catch {
      setAuthError('Error de conexión.');
    } finally {
      setAuthLoading(false);
    }
  }, [passwordInput]);

  // ─── WS: connect when authorized ─────────────────────────────────────────
  useEffect(() => {
    if (!authorized || !sessionToken) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/effects?role=dm&token=${encodeURIComponent(sessionToken)}`
    );
    wsRef.current = socket;
    setWsState('connecting');

    socket.onopen  = () => setWsState('online');
    socket.onerror = () => setWsState('error');
    socket.onclose = () => {
      if (wsRef.current === socket) wsRef.current = null;
      setWsState('offline');
    };
    socket.onmessage = (event) => {
      let payload;
      try { payload = JSON.parse(String(event.data || '{}')); } catch { return; }
      if (payload.type === 'effects:status') {
        setAgentCount(Number(payload.agents) || 0);
      }
      if (payload.type === 'effects:agent-state') {
        const effectLabel = toEffectLabel(payload.effect || '');
        const stateLabel  = String(payload.state || '').toUpperCase();
        const agents      = Number(payload.agents) || 0;
        setAgentState({
          label: effectLabel
            ? `${effectLabel} · ${stateLabel} · ${agents} AG`
            : `${stateLabel} · ${agents} AG`,
          tone: payload.state === 'cleared' ? 'idle' : 'active',
        });
      }
    };

    return () => {
      if (wsRef.current === socket) wsRef.current = null;
      socket.close();
    };
  }, [authorized, sessionToken]);

  // ─── Media library: load on auth ─────────────────────────────────────────
  const loadLibrary = useCallback(async () => {
    if (!sessionToken) return;
    setLibraryLoading(true);
    setLibraryMessage('');
    try {
      const res  = await fetch(RT_MEDIA_ENDPOINT, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data  = await res.json().catch(() => ({}));
      const media = Array.isArray(data.media) ? data.media : [];
      setLibrary(media);
      setSelectedId((cur) => cur || media[0]?.id || '');
    } catch {
      setLibraryMessage('No se pudo cargar la biblioteca.');
    } finally {
      setLibraryLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (authorized && sessionToken) loadLibrary();
  }, [authorized, sessionToken, loadLibrary]);

  // ─── Duration helpers ─────────────────────────────────────────────────────
  const getDurationMs = useCallback(() => {
    const seconds = Number(durationSec);
    if (!Number.isFinite(seconds)) return 8000;
    if (seconds >= DURATION_INFINITY_SEC) return 0;
    return Math.max(0, Math.min(300, seconds)) * 1000;
  }, [durationSec]);

  const durationIsInfinite = getDurationMs() === 0;
  const durationLabel      = durationIsInfinite ? '∞' : `${durationSec}s`;

  // ─── WS send ──────────────────────────────────────────────────────────────
  const wsSend = useCallback((payload) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try { socket.send(JSON.stringify(payload)); } catch { /* noop */ }
  }, []);

  // ─── Effect actions ───────────────────────────────────────────────────────
  const prepareDraft = useCallback((effect, options = {}) => {
    const durationMs  = getDurationMs();
    const fullOptions = effect === 'media'
      ? { ...options, loop: durationMs === 0, duration: durationMs }
      : { ...options, duration: durationMs };
    setDraft({ effect, options: fullOptions });
    setAgentState({ label: 'LISTO PARA LANZAR', tone: 'ready' });
  }, [getDurationMs]);

  const launchDraft = useCallback(() => {
    if (!draft) return;
    const durationMs  = getDurationMs();
    const fullOptions = draft.effect === 'media'
      ? { ...draft.options, loop: durationMs === 0, duration: durationMs }
      : { ...draft.options, duration: durationMs };
    wsSend({ type: 'effects:trigger', effect: draft.effect, options: fullOptions });
    const ts = new Date().toLocaleTimeString();
    setLog((prev) => [{ ts, effect: draft.effect, options: fullOptions }, ...prev.slice(0, 19)]);
    setAgentState({ label: 'ENVIADO · ESPERANDO AGENTE', tone: 'pending' });
  }, [draft, getDurationMs, wsSend]);

  const clearEffects = useCallback(() => {
    wsSend({ type: 'effects:clear' });
    const ts = new Date().toLocaleTimeString();
    setDraft(null);
    setAgentState({ label: 'SIN EMISIÓN', tone: 'idle' });
    setLog((prev) => [{ ts, effect: 'CLEAR', options: {} }, ...prev.slice(0, 19)]);
  }, [wsSend]);

  // ─── Alarm modal ──────────────────────────────────────────────────────────
  const openAlarmModal = useCallback(() => {
    setAlarmDraft((v) => v || 'ALERTA DE SEGURIDAD');
    setAlarmModalOpen(true);
    setTimeout(() => {
      alarmInputRef.current?.focus();
      alarmInputRef.current?.select();
    }, 80);
  }, []);

  const confirmAlarm = useCallback(() => {
    const msg = alarmDraft.trim() || 'ALERTA DE SEGURIDAD';
    setAlarmDraft(msg);
    setAlarmModalOpen(false);
    prepareDraft('alarm', { message: msg });
  }, [alarmDraft, prepareDraft]);

  // ─── Upload ───────────────────────────────────────────────────────────────
  const uploadMedia = useCallback(async () => {
    if (!uploadFile) {
      setLibraryMessage('Selecciona un archivo primero.');
      return;
    }
    if (!uploadTitle.trim()) {
      setLibraryMessage('Indica un nombre para el video.');
      return;
    }
    setUploading(true);
    setLibraryMessage('');
    try {
      const formData = new FormData();
      formData.append('file',        uploadFile);
      formData.append('title',       uploadTitle.trim());
      formData.append('description', uploadDesc.trim());
      const res  = await fetch(RT_MEDIA_ENDPOINT, {
        method:  'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body:    formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al subir.');
      const media = Array.isArray(data.media) ? data.media : [];
      setLibrary(media);
      setUploadFile(null);
      setUploadTitle('');
      setUploadDesc('');
      if (data.media?.id) setSelectedId(data.media.id);
      setLibraryMessage('Video guardado en biblioteca.');
      setUploadOpen(false);
    } catch (error) {
      setLibraryMessage(error.message || 'Error al subir el video.');
    } finally {
      setUploading(false);
    }
  }, [uploadFile, uploadTitle, uploadDesc, sessionToken]);

  const deleteMedia = useCallback(async (id) => {
    setLibraryLoading(true);
    try {
      const res  = await fetch(`${RT_MEDIA_ENDPOINT}/${encodeURIComponent(id)}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data  = await res.json().catch(() => ({}));
      const media = Array.isArray(data.media) ? data.media : [];
      setLibrary(media);
      if (selectedId === id) setSelectedId(media[0]?.id || '');
    } catch { /* noop */ }
    finally { setLibraryLoading(false); }
  }, [selectedId, sessionToken]);

  // ─────────────────────────────────────────────────────────────────────────
  const wsOnline  = wsState === 'online';
  const canLaunch = wsOnline && !!draft;

  // ─── Render: boot splash ──────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="ep-loading">
        <span>EFECTOS RT</span>
      </div>
    );
  }

  // ─── Render: auth gate ────────────────────────────────────────────────────
  if (!authorized) {
    return (
      <div className="ep-auth">
        <div className="ep-auth__card">
          <div className="ep-auth__logo">EFECTOS RT</div>
          <div className="ep-auth__sub">Consola DM · Acceso restringido</div>
          <form className="ep-auth__form" onSubmit={handleLogin}>
            <input
              className="ep-input"
              type="password"
              placeholder="Contraseña DM"
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              autoComplete="current-password"
            />
            {authError && (
              <div className="ep-auth__error">{authError}</div>
            )}
            <button
              className="ep-btn ep-btn--launch"
              type="submit"
              disabled={authLoading || !passwordInput.trim()}
            >
              {authLoading ? 'VERIFICANDO...' : 'ACCEDER'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ─── Render: main UI ──────────────────────────────────────────────────────
  const wsLabel = wsOnline
    ? '● ONLINE'
    : wsState === 'connecting'
      ? '◌ CONECT.'
      : '○ OFFLINE';

  return (
    <div className="ep-root">

      {/* ── Top bar ── */}
      <header className="ep-topbar">
        <span className="ep-topbar__title">EFECTOS RT</span>
        <span className={`ep-topbar__status ep-topbar__status--${wsState}`}>
          {wsLabel}
        </span>
        <span className="ep-topbar__agents">
          {agentCount} {agentCount === 1 ? 'agente' : 'agentes'}
        </span>
      </header>

      {/* ── Draft badge ── */}
      {draft && (
        <div className={`ep-draft ep-draft--${draft.effect}`}>
          <div className="ep-draft__left">
            <span className="ep-draft__effect">
              {toEffectLabel(draft.effect)}
            </span>
            <span className="ep-draft__duration">
              {durationIsInfinite ? '∞' : `${Math.round((draft.options?.duration || 0) / 1000)}s`}
            </span>
          </div>
          <span className={`ep-chip ep-chip--${agentState.tone}`}>
            {agentState.label}
          </span>
        </div>
      )}

      {/* ── Tab bar ── */}
      <nav className="ep-tabs">
        {[
          { id: 'triggers', label: 'DISPARADORES' },
          { id: 'library',  label: 'BIBLIOTECA' },
          { id: 'direct',   label: 'DIRECTO' },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`ep-tab${activeTab === tab.id ? ' ep-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <main className="ep-content">

        {/* DISPARADORES */}
        {activeTab === 'triggers' && (
          <div className="ep-triggers">
            <button
              className="ep-trigger ep-trigger--alarm"
              disabled={!wsOnline}
              onClick={openAlarmModal}
            >
              <span className="ep-trigger__name">ALARMA</span>
              <span className="ep-trigger__sub">Alerta + sirena · texto configurable</span>
            </button>
            <button
              className="ep-trigger ep-trigger--hack"
              disabled={!wsOnline}
              onClick={() => prepareDraft('hack', { intensity: 'heavy' })}
            >
              <span className="ep-trigger__name">HACKEO SEVERO</span>
              <span className="ep-trigger__sub">Glitch visual + ruido blanco</span>
            </button>
            <button
              className="ep-trigger ep-trigger--fog"
              disabled={!wsOnline}
              onClick={() => prepareDraft('fog')}
            >
              <span className="ep-trigger__name">NIEBLA</span>
              <span className="ep-trigger__sub">Señal degradada · blur</span>
            </button>
            <button
              className="ep-trigger ep-trigger--critical"
              disabled={!wsOnline}
              onClick={() => prepareDraft('critical')}
            >
              <span className="ep-trigger__name">CRÍTICO</span>
              <span className="ep-trigger__sub">Alarma + hackeo combinados</span>
            </button>
            <button
              className="ep-trigger ep-trigger--flicker"
              disabled={!wsOnline}
              onClick={() => prepareDraft('flicker')}
            >
              <span className="ep-trigger__name">FLICKER</span>
              <span className="ep-trigger__sub">Parpadeo de pantalla</span>
            </button>

            {/* Log (inline en triggers tab) */}
            {log.length > 0 && (
              <div className="ep-log">
                <div className="ep-log__label">HISTORIAL</div>
                {log.slice(0, 6).map((entry, i) => (
                  <div key={i} className="ep-log__entry">
                    <span className="ep-log__ts">[{entry.ts}]</span>
                    <span className="ep-log__effect">{toEffectLabel(entry.effect)}</span>
                    {entry.options?.duration > 0 && (
                      <span className="ep-log__opt">{entry.options.duration / 1000}s</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* BIBLIOTECA */}
        {activeTab === 'library' && (
          <div className="ep-library">
            {libraryLoading && (
              <div className="ep-empty">Cargando...</div>
            )}
            {!libraryLoading && library.length === 0 && (
              <div className="ep-empty">No hay videos guardados.</div>
            )}

            {library.map((media) => {
              const isSel = media.id === selectedId;
              return (
                <div
                  key={media.id}
                  className={`ep-media-item${isSel ? ' ep-media-item--selected' : ''}`}
                >
                  <div className="ep-media-item__info">
                    <strong className="ep-media-item__title">{media.title}</strong>
                    {media.description && (
                      <span className="ep-media-item__desc">{media.description}</span>
                    )}
                  </div>
                  <div className="ep-media-item__actions">
                    <button
                      className="ep-btn ep-btn--sm ep-btn--media"
                      disabled={!wsOnline}
                      onClick={() => {
                        setSelectedId(media.id);
                        prepareDraft('media', {
                          url:       media.url,
                          mediaType: media.kind === 'video' ? 'video' : 'image',
                          caption:   media.title || media.description || '',
                        });
                      }}
                    >
                      PREPARAR
                    </button>
                    <button
                      className="ep-btn ep-btn--sm ep-btn--danger"
                      onClick={() => deleteMedia(media.id)}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}

            {libraryMessage && (
              <div className="ep-empty">{libraryMessage}</div>
            )}

            {/* Upload toggle */}
            <button
              className="ep-btn ep-btn--ghost ep-library__upload-toggle"
              onClick={() => setUploadOpen((v) => !v)}
            >
              {uploadOpen ? '▲ Cerrar' : '⬆ Subir video a biblioteca'}
            </button>

            {uploadOpen && (
              <div className="ep-upload-form">
                <label className="ep-upload-zone">
                  <input
                    type="file"
                    accept="video/*"
                    className="ep-file-input"
                    onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  />
                  <span className="ep-upload-zone__label">
                    {uploadFile
                      ? `${uploadFile.name} · ${(uploadFile.size / 1024 / 1024).toFixed(1)} MB`
                      : 'Toca para seleccionar video (MP4, WEBM, MOV)'}
                  </span>
                </label>
                <input
                  className="ep-input"
                  type="text"
                  placeholder="Nombre del video"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                />
                <textarea
                  className="ep-input ep-input--textarea"
                  rows="2"
                  placeholder="Descripción (opcional)"
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                />
                <button
                  className="ep-btn ep-btn--media"
                  disabled={!uploadFile || uploading}
                  onClick={uploadMedia}
                >
                  {uploading ? 'SUBIENDO...' : 'GUARDAR EN BIBLIOTECA'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* DIRECTO */}
        {activeTab === 'direct' && (
          <div className="ep-direct">
            <label className="ep-label">URL del recurso (relativa al servidor)</label>
            <input
              className="ep-input"
              type="text"
              placeholder="/uploads/rt-effects-media/videos/mi-video.mp4"
              value={directUrl}
              onChange={(e) => setDirectUrl(e.target.value)}
            />

            <div className="ep-radio-group">
              <label className="ep-radio">
                <input
                  type="radio"
                  name="directType"
                  value="image"
                  checked={directType === 'image'}
                  onChange={() => setDirectType('image')}
                />
                Imagen
              </label>
              <label className="ep-radio">
                <input
                  type="radio"
                  name="directType"
                  value="video"
                  checked={directType === 'video'}
                  onChange={() => setDirectType('video')}
                />
                Video
              </label>
            </div>

            <label className="ep-label">Pie de pantalla (opcional)</label>
            <input
              className="ep-input"
              type="text"
              placeholder="Expediente #X — Clasificado"
              value={directCaption}
              onChange={(e) => setDirectCaption(e.target.value)}
            />

            <button
              className="ep-btn ep-btn--media"
              disabled={!wsOnline || !directUrl.trim()}
              onClick={() => prepareDraft('media', {
                url:       directUrl.trim(),
                mediaType: directType,
                caption:   directCaption.trim(),
              })}
            >
              PREPARAR MEDIA
            </button>

            <div className="ep-note">
              La pestaña de agente no puede cerrar ni anular efectos.
              Control exclusivo del DM.
            </div>
          </div>
        )}

      </main>

      {/* ── Bottom action bar ── */}
      <footer className="ep-bottom">
        <div className="ep-duration">
          <span className="ep-duration__val">{durationLabel}</span>
          <input
            type="range"
            className="ep-duration__slider"
            min="1"
            max={DURATION_INFINITY_SEC}
            step="1"
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value))}
          />
          <span className={`ep-duration__inf${durationIsInfinite ? ' is-active' : ''}`}>
            ∞
          </span>
        </div>
        <div className="ep-bottom__actions">
          <button
            className="ep-btn ep-btn--launch"
            disabled={!canLaunch}
            onClick={launchDraft}
          >
            LANZAR
          </button>
          <button
            className="ep-btn ep-btn--clear"
            disabled={!wsOnline}
            onClick={clearEffects}
          >
            LIMPIAR
          </button>
        </div>
      </footer>

      {/* ── Alarm modal (bottom sheet) ── */}
      {alarmModalOpen && (
        <div
          className="ep-sheet-backdrop"
          onClick={() => setAlarmModalOpen(false)}
        >
          <div
            className="ep-sheet"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Configurar alarma"
          >
            <div className="ep-sheet__handle" />
            <div className="ep-sheet__header">
              <strong>CONFIGURAR ALARMA</strong>
              <button
                className="ep-sheet__close"
                onClick={() => setAlarmModalOpen(false)}
              >
                ✕
              </button>
            </div>
            <form
              className="ep-sheet__body"
              onSubmit={(e) => { e.preventDefault(); confirmAlarm(); }}
            >
              <label className="ep-label">Texto en pantalla del agente</label>
              <input
                ref={alarmInputRef}
                className="ep-input"
                type="text"
                maxLength={96}
                value={alarmDraft}
                onChange={(e) => setAlarmDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setAlarmModalOpen(false);
                }}
              />
              <div className="ep-note">
                Se mostrará en primer plano en la TUI del agente hasta limpiar.
              </div>
              <div className="ep-sheet__actions">
                <button
                  type="button"
                  className="ep-btn ep-btn--sm"
                  onClick={() => setAlarmModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="ep-btn ep-btn--alarm">
                  PREPARAR ALARMA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default EfectosPage;
