import { useCallback, useEffect, useRef, useState } from 'react';
import '../css/EfectosMobile.styles.css';

const AUTH_ENDPOINT = '/api/auth';
const RT_MEDIA_ENDPOINT = '/api/rt-effects-media';
const DURATION_INFINITY_SEC = 60;

const EFFECT_LABELS = {
  alarm: 'ALARMA',
  hack: 'HACKEO SEVERO',
  fog: 'NIEBLA',
  critical: 'CRITICO',
  flicker: 'FLICKER',
  media: 'MEDIA',
  clear: 'CLEAR',
};

const getMediaTitle = (media = {}) =>
  String(media.title || media.originalName || media.filename || media.id || 'VIDEO SIN NOMBRE').trim();

const getMediaDescription = (media = {}) =>
  String(media.description || media.url || 'Sin descripción').trim();

const toEffectLabel = (raw = '') => EFFECT_LABELS[raw] ?? String(raw || '').toUpperCase();

const EfectosMobile = () => {
  const [sessionToken, setSessionToken] = useState(() => localStorage.getItem('dmSessionToken') || '');
  const [authorized, setAuthorized] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const wsRef = useRef(null);
  const [wsState, setWsState] = useState('offline');
  const [agentCount, setAgentCount] = useState(0);
  const [agentState, setAgentState] = useState({ label: 'SIN EMISION', tone: 'idle' });

  const [durationSec, setDurationSec] = useState(8);
  const [draft, setDraft] = useState(null);
  const [log, setLog] = useState([]);

  const [alarmModalOpen, setAlarmModalOpen] = useState(false);
  const [alarmDraft, setAlarmDraft] = useState('ALERTA DE SEGURIDAD');
  const alarmInputRef = useRef(null);

  const [library, setLibrary] = useState([]);
  const [libraryLoading, setLibraryLoading] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState('');
  const [selectedId, setSelectedId] = useState('');

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [directUrl, setDirectUrl] = useState('');
  const [directType, setDirectType] = useState('video');
  const [directCaption, setDirectCaption] = useState('');

  const [activeTab, setActiveTab] = useState('triggers');

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
        // Keep auth form available on network failure.
      } finally {
        setAuthChecked(true);
      }
    })();
  }, [sessionToken]);

  const handleLogin = useCallback(async (event) => {
    event.preventDefault();
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
      setAuthError('Error de conexion.');
    } finally {
      setAuthLoading(false);
    }
  }, [passwordInput]);

  useEffect(() => {
    if (!authorized || !sessionToken) return undefined;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const socket = new WebSocket(
      `${protocol}://${window.location.host}/ws/effects?role=dm&token=${encodeURIComponent(sessionToken)}`
    );
    wsRef.current = socket;
    setWsState('connecting');

    socket.onopen = () => setWsState('online');
    socket.onerror = () => setWsState('error');
    socket.onclose = () => {
      if (wsRef.current === socket) wsRef.current = null;
      setWsState('offline');
    };
    socket.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(String(event.data || '{}'));
      } catch {
        return;
      }
      if (payload.type === 'effects:status') {
        setAgentCount(Number(payload.agents) || 0);
      }
      if (payload.type === 'effects:agent-state') {
        const effectLabel = toEffectLabel(payload.effect || '');
        const stateLabel = String(payload.state || '').toUpperCase();
        const agents = Number(payload.agents) || 0;
        setAgentState({
          label: effectLabel
            ? `${effectLabel} · ${stateLabel || 'ACK'} · ${agents} AG`
            : `${stateLabel || 'ACK'} · ${agents} AG`,
          tone: payload.state === 'cleared' ? 'idle' : 'active',
        });
      }
    };

    return () => {
      if (wsRef.current === socket) wsRef.current = null;
      socket.close();
    };
  }, [authorized, sessionToken]);

  const loadLibrary = useCallback(async () => {
    if (!sessionToken) return;
    setLibraryLoading(true);
    setLibraryMessage('');
    try {
      const res = await fetch(RT_MEDIA_ENDPOINT, {
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo cargar la biblioteca.');
      }
      const media = Array.isArray(data.media) ? data.media : [];
      setLibrary(media);
      setSelectedId((current) => current || media[0]?.id || '');
    } catch (error) {
      setLibraryMessage(error.message || 'No se pudo cargar la biblioteca.');
    } finally {
      setLibraryLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (authorized && sessionToken) {
      loadLibrary();
    }
  }, [authorized, sessionToken, loadLibrary]);

  const getDurationMs = useCallback(() => {
    const seconds = Number(durationSec);
    if (!Number.isFinite(seconds)) return 8000;
    if (seconds >= DURATION_INFINITY_SEC) return 0;
    return Math.max(0, Math.min(300, seconds)) * 1000;
  }, [durationSec]);

  const durationIsInfinite = getDurationMs() === 0;
  const durationLabel = durationIsInfinite ? '∞' : `${durationSec}s`;

  const wsSend = useCallback((payload) => {
    const socket = wsRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    try {
      socket.send(JSON.stringify(payload));
    } catch {
      // noop
    }
  }, []);

  const prepareDraft = useCallback((effect, options = {}) => {
    const durationMs = getDurationMs();
    const fullOptions = effect === 'media'
      ? { ...options, loop: durationMs === 0, duration: durationMs }
      : { ...options, duration: durationMs };
    setDraft({ effect, options: fullOptions });
    setAgentState({ label: 'LISTO PARA LANZAR', tone: 'ready' });
  }, [getDurationMs]);

  const launchDraft = useCallback(() => {
    if (!draft) return;
    const durationMs = getDurationMs();
    const fullOptions = draft.effect === 'media'
      ? { ...draft.options, loop: durationMs === 0, duration: durationMs }
      : { ...draft.options, duration: durationMs };
    wsSend({ type: 'effects:trigger', effect: draft.effect, options: fullOptions });
    const ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLog((prev) => [{ ts, effect: draft.effect, options: fullOptions }, ...prev.slice(0, 19)]);
    setAgentState({ label: 'ENVIADO · ESPERANDO AGENTE', tone: 'pending' });
  }, [draft, getDurationMs, wsSend]);

  const clearEffects = useCallback(() => {
    wsSend({ type: 'effects:clear' });
    const ts = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setDraft(null);
    setAgentState({ label: 'SIN EMISION', tone: 'idle' });
    setLog((prev) => [{ ts, effect: 'CLEAR', options: {} }, ...prev.slice(0, 19)]);
  }, [wsSend]);

  const openAlarmModal = useCallback(() => {
    setAlarmDraft((value) => value || 'ALERTA DE SEGURIDAD');
    setAlarmModalOpen(true);
    setTimeout(() => {
      alarmInputRef.current?.focus();
      alarmInputRef.current?.select();
    }, 80);
  }, []);

  const confirmAlarm = useCallback(() => {
    const message = alarmDraft.trim() || 'ALERTA DE SEGURIDAD';
    setAlarmDraft(message);
    setAlarmModalOpen(false);
    prepareDraft('alarm', { message });
  }, [alarmDraft, prepareDraft]);

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
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle.trim());
      formData.append('description', uploadDesc.trim());
      const res = await fetch(RT_MEDIA_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Error al subir el video.');
      const media = Array.isArray(data.mediaList) ? data.mediaList : Array.isArray(data.media) ? data.media : [];
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
  }, [sessionToken, uploadDesc, uploadFile, uploadTitle]);

  const deleteMedia = useCallback(async (id) => {
    setLibraryLoading(true);
    setLibraryMessage('');
    try {
      const res = await fetch(`${RT_MEDIA_ENDPOINT}/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo borrar el video.');
      const media = Array.isArray(data.media) ? data.media : [];
      setLibrary(media);
      if (selectedId === id) setSelectedId(media[0]?.id || '');
    } catch (error) {
      setLibraryMessage(error.message || 'No se pudo borrar el video.');
    } finally {
      setLibraryLoading(false);
    }
  }, [selectedId, sessionToken]);

  const wsLabel = wsState === 'online' ? '● ONLINE' : wsState === 'connecting' ? '◌ CONECT.' : '○ OFFLINE';
  const canLaunch = wsState === 'online' && Boolean(draft);

  if (!authChecked) {
    return (
      <div className="effects-mobile-shell">
        <div className="effects-mobile-shell__loading">EFECTOS RT</div>
      </div>
    );
  }

  return (
    <div className="effects-mobile-shell">
      <div className="effects-mobile-shell__frame">
        <div className="effects-mobile-shell__notch" aria-hidden="true" />
        <div className="effects-mobile-shell__inner">
          <div className="effects-mobile-shell__statusbar">
            <span className="effects-mobile-shell__time">
              {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <div className="effects-mobile-shell__icons">
              <span>SECURE</span>
              <span>MK0</span>
            </div>
          </div>

          {!authorized ? (
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
                    onChange={(event) => setPasswordInput(event.target.value)}
                    autoComplete="current-password"
                  />
                  {authError && <div className="ep-auth__error">{authError}</div>}
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
          ) : (
            <div className="ep-root">
              <header className="ep-topbar">
                <span className="ep-topbar__title">EFECTOS RT</span>
                <span className={`ep-topbar__status ep-topbar__status--${wsState}`}>{wsLabel}</span>
                <span className="ep-topbar__agents">
                  {agentCount} {agentCount === 1 ? 'agente' : 'agentes'}
                </span>
              </header>

              {draft && (
                <div className={`ep-draft ep-draft--${draft.effect}`}>
                  <div className="ep-draft__left">
                    <span className="ep-draft__effect">{toEffectLabel(draft.effect)}</span>
                    <span className="ep-draft__duration">
                      {durationIsInfinite ? '∞' : `${Math.round((draft.options?.duration || 0) / 1000)}s`}
                    </span>
                  </div>
                  <span className={`ep-chip ep-chip--${agentState.tone}`}>{agentState.label}</span>
                </div>
              )}

              <nav className="ep-tabs">
                {[
                  { id: 'triggers', label: 'DISPARADORES' },
                  { id: 'library', label: 'BIBLIOTECA' },
                  { id: 'direct', label: 'EMISION' },
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

              <main className="ep-content">
                {activeTab === 'triggers' && (
                  <div className="ep-triggers">
                    <button className="ep-trigger ep-trigger--alarm" disabled={wsState !== 'online'} onClick={openAlarmModal}>
                      <span className="ep-trigger__name">ALARMA</span>
                      <span className="ep-trigger__sub">Alerta + sirena · texto configurable</span>
                    </button>
                    <button className="ep-trigger ep-trigger--hack" disabled={wsState !== 'online'} onClick={() => prepareDraft('hack', { intensity: 'heavy' })}>
                      <span className="ep-trigger__name">HACKEO SEVERO</span>
                      <span className="ep-trigger__sub">Glitch visual + ruido blanco</span>
                    </button>
                    <button className="ep-trigger ep-trigger--fog" disabled={wsState !== 'online'} onClick={() => prepareDraft('fog')}>
                      <span className="ep-trigger__name">NIEBLA</span>
                      <span className="ep-trigger__sub">Señal degradada · blur</span>
                    </button>
                    <button className="ep-trigger ep-trigger--critical" disabled={wsState !== 'online'} onClick={() => prepareDraft('critical')}>
                      <span className="ep-trigger__name">CRITICO</span>
                      <span className="ep-trigger__sub">Alarma + hackeo combinados</span>
                    </button>
                    <button className="ep-trigger ep-trigger--flicker" disabled={wsState !== 'online'} onClick={() => prepareDraft('flicker')}>
                      <span className="ep-trigger__name">FLICKER</span>
                      <span className="ep-trigger__sub">Parpadeo de pantalla</span>
                    </button>

                    {log.length > 0 && (
                      <div className="ep-log">
                        <div className="ep-log__label">HISTORIAL</div>
                        {log.slice(0, 6).map((entry, index) => (
                          <div key={`${entry.ts}-${entry.effect}-${index}`} className="ep-log__entry">
                            <span className="ep-log__ts">[{entry.ts}]</span>
                            <span className="ep-log__effect">{toEffectLabel(entry.effect)}</span>
                            {entry.options?.duration > 0 && <span className="ep-log__opt">{entry.options.duration / 1000}s</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'library' && (
                  <div className="ep-library">
                    {libraryLoading && <div className="ep-empty">Cargando...</div>}
                    {!libraryLoading && library.length === 0 && <div className="ep-empty">No hay videos guardados.</div>}

                    {library.map((media) => {
                      const isSelected = media.id === selectedId;
                      return (
                        <div key={media.id} className={`ep-media-item${isSelected ? ' ep-media-item--selected' : ''}`}>
                          <div className="ep-media-item__info">
                            <div className="ep-media-item__eyebrow">
                              {media.kind === 'video' ? 'VIDEO GUARDADO' : 'RECURSO GUARDADO'}
                            </div>
                            <strong className="ep-media-item__title">{getMediaTitle(media)}</strong>
                            <span className="ep-media-item__desc">{getMediaDescription(media)}</span>
                          </div>
                          <div className="ep-media-item__actions">
                            <button
                              className="ep-btn ep-btn--sm ep-btn--media"
                              disabled={wsState !== 'online'}
                              onClick={() => {
                                setSelectedId(media.id);
                                prepareDraft('media', {
                                  url: media.url,
                                  mediaType: media.kind === 'video' ? 'video' : 'image',
                                  caption: media.title || media.description || '',
                                });
                              }}
                            >
                              PREPARAR
                            </button>
                            <button className="ep-btn ep-btn--sm ep-btn--danger" onClick={() => deleteMedia(media.id)}>
                              ✕
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    {libraryMessage && <div className="ep-empty">{libraryMessage}</div>}

                    <button className="ep-btn ep-btn--ghost ep-library__upload-toggle" onClick={() => setUploadOpen((value) => !value)}>
                      {uploadOpen ? '▲ CERRAR SUBIDA' : '⬆ SUBIR VIDEO'}
                    </button>

                    {uploadOpen && (
                      <div className="ep-upload-form">
                        <label className="ep-upload-zone">
                          <input
                            type="file"
                            accept="video/*"
                            className="ep-file-input"
                            onChange={(event) => setUploadFile(event.target.files?.[0] || null)}
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
                          onChange={(event) => setUploadTitle(event.target.value)}
                        />
                        <textarea
                          className="ep-input ep-input--textarea"
                          rows="2"
                          placeholder="Descripción (opcional)"
                          value={uploadDesc}
                          onChange={(event) => setUploadDesc(event.target.value)}
                        />
                        <button className="ep-btn ep-btn--media" disabled={!uploadFile || uploading} onClick={uploadMedia}>
                          {uploading ? 'SUBIENDO...' : 'GUARDAR EN BIBLIOTECA'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'direct' && (
                  <div className="ep-direct">
                    <div className="ep-section-kicker">EMISION DIRECTA</div>
                    <label className="ep-label">URL del recurso (relativa al servidor)</label>
                    <input
                      className="ep-input"
                      type="text"
                      placeholder="/uploads/rt-effects-media/videos/mi-video.mp4"
                      value={directUrl}
                      onChange={(event) => setDirectUrl(event.target.value)}
                    />

                    <div className="ep-radio-group">
                      <label className="ep-radio">
                        <input type="radio" name="directType" value="image" checked={directType === 'image'} onChange={() => setDirectType('image')} />
                        Imagen
                      </label>
                      <label className="ep-radio">
                        <input type="radio" name="directType" value="video" checked={directType === 'video'} onChange={() => setDirectType('video')} />
                        Video
                      </label>
                    </div>

                    <label className="ep-label">Pie de pantalla (opcional)</label>
                    <input
                      className="ep-input"
                      type="text"
                      placeholder="Expediente #X — Clasificado"
                      value={directCaption}
                      onChange={(event) => setDirectCaption(event.target.value)}
                    />

                    <button
                      className="ep-btn ep-btn--media"
                      disabled={wsState !== 'online' || !directUrl.trim()}
                      onClick={() => prepareDraft('media', {
                        url: directUrl.trim(),
                        mediaType: directType,
                        caption: directCaption.trim(),
                      })}
                    >
                      PREPARAR MEDIA
                    </button>

                    <div className="ep-note">
                      Envía una imagen o vídeo del servidor al monitor del agente. El control de limpieza sigue siendo exclusivo del DM.
                    </div>
                  </div>
                )}
              </main>

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
                    onChange={(event) => setDurationSec(Number(event.target.value))}
                  />
                  <span className={`ep-duration__inf${durationIsInfinite ? ' is-active' : ''}`}>∞</span>
                </div>
                <div className="ep-bottom__actions">
                  <button className="ep-btn ep-btn--launch" disabled={!canLaunch} onClick={launchDraft}>
                    LANZAR
                  </button>
                  <button className="ep-btn ep-btn--clear" disabled={wsState !== 'online'} onClick={clearEffects}>
                    LIMPIAR
                  </button>
                </div>
              </footer>

              {alarmModalOpen && (
                <div className="ep-sheet-backdrop" onClick={() => setAlarmModalOpen(false)}>
                  <div
                    className="ep-sheet"
                    onClick={(event) => event.stopPropagation()}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Configurar alarma"
                  >
                    <div className="ep-sheet__handle" />
                    <div className="ep-sheet__header">
                      <strong>CONFIGURAR ALARMA</strong>
                      <button className="ep-sheet__close" onClick={() => setAlarmModalOpen(false)}>
                        ✕
                      </button>
                    </div>
                    <form
                      className="ep-sheet__body"
                      onSubmit={(event) => {
                        event.preventDefault();
                        confirmAlarm();
                      }}
                    >
                      <label className="ep-label">Texto en pantalla del agente</label>
                      <input
                        ref={alarmInputRef}
                        className="ep-input"
                        type="text"
                        maxLength={96}
                        value={alarmDraft}
                        onChange={(event) => setAlarmDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Escape') setAlarmModalOpen(false);
                        }}
                      />
                      <div className="ep-note">
                        Se mostrará en primer plano en la TUI del agente hasta limpiar.
                      </div>
                      <div className="ep-sheet__actions">
                        <button type="button" className="ep-btn ep-btn--sm" onClick={() => setAlarmModalOpen(false)}>
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
          )}
        </div>
      </div>
    </div>
  );
};

export default EfectosMobile;
