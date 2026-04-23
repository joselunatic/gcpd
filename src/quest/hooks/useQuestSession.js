import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  QUEST_MODULE_CASOS,
  QUEST_MODULE_HERRAMIENTAS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_PERFILES,
} from '../state/questModules';

const STATUS_TO_ALERT = {
  active: 'alta',
  critical: 'alta',
  locked: 'restringida',
  resolved: 'estable',
};

const AUDIO_ENDPOINT = '/api/audio';
const PHONE_LINES_ENDPOINT = '/api/phone-lines';
const PHONE_CALLED_ENDPOINT = '/api/phone-lines-called';
const PHONE_MODE_CALL = 'call';
const PHONE_MODE_TRACER = 'tracer';

const getInitialCaseId = (cases) => {
  const activeCase = cases.find((entry) => entry.status === 'active');
  return activeCase?.id || cases[0]?.id || '';
};

const buildSyncState = (data) => {
  if (data.loading) return 'sincronizando';
  if (data.error) return 'datos locales';
  return 'en línea';
};

const summarizeText = (value, fallback = '') => {
  const source = Array.isArray(value) ? value.join(' ') : value;
  const text = String(source || fallback).trim();
  return text;
};

const getTracerSocketUrl = () => {
  if (typeof window === 'undefined') return '';
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}/ws/tracer?role=agent`;
};

const normalizePhoneKey = (key) => {
  if (key === 'Star') return '*';
  if (key === 'Hash') return '#';
  return String(key || '');
};

const normalizePhoneNumber = (value = '') => String(value || '').replace(/[^\d]/g, '');

const loadAudioModels = async () => {
  try {
    const response = await fetch(AUDIO_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.models) ? data.models : [];
  } catch (error) {
    console.debug('[Quest] phone audio models fetch failed', error);
    return [];
  }
};

const loadPhoneLines = async () => {
  try {
    const response = await fetch(PHONE_LINES_ENDPOINT, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.lines) ? data.lines : [];
  } catch (error) {
    console.debug('[Quest] phone lines fetch failed', error);
    return [];
  }
};

const markPhoneLineCalled = async (number) => {
  try {
    await fetch(PHONE_CALLED_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ number }),
    });
  } catch (error) {
    console.debug('[Quest] phone line called update failed', error);
  }
};

const getAudioSource = (entry) => entry?.originalSrc || entry?.garbledSrc || '';

const isTracerActive = (phoneState) =>
  phoneState.activeMode === PHONE_MODE_TRACER &&
  ['dialing', 'ringing', 'answered'].includes(phoneState.tracerPhase);

const useQuestSession = (data) => {
  const [currentModule, setCurrentModule] = useState(QUEST_MODULE_OPERACION);
  const [lastPrimaryModule, setLastPrimaryModule] = useState(QUEST_MODULE_OPERACION);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [selection, setSelection] = useState({
    operacion: {
      highlightedLeadId: null,
    },
    casos: {
      selectedCaseId: null,
      expandedCaseIds: [],
      activeTab: 'resumen',
    },
    mapa: {
      selectedPoiId: null,
      activeFilter: 'caso-activo',
      viewportMode: 'contexto',
    },
    perfiles: {
      selectedProfileId: null,
      activeSection: 'datos-tacticos',
    },
    herramientas: {
      activeTool: null,
      resourceId: null,
    },
  });
  const [toolContext, setToolContext] = useState(null);
  const tracerSocketRef = useRef(null);
  const tracerReconnectRef = useRef(0);
  const callPlaybackRef = useRef({
    audio: null,
    endedHandler: null,
  });
  const phoneAudioRef = useRef({
    callTone: null,
    pickupTone: null,
    hangupTone: null,
    keypadTone: null,
    errorTone: null,
  });
  const [phoneState, setPhoneState] = useState({
    focusMode: false,
    mode: PHONE_MODE_CALL,
    activeMode: null,
    isOffHook: false,
    dialedDigits: '',
    lastDialedNumber: '',
    lineStatus: 'colgada',
    lastAction: 'Teléfono en espera.',
    pressedKey: null,
    tracerWsState: 'offline',
    activeCallId: '',
    tracerPhase: 'idle',
    hotspotLabel: '',
    activeAudioLabel: '',
  });

  useEffect(() => {
    if (data.loading || activeCaseId || !data.cases.length) return;

    const initialCaseId = getInitialCaseId(data.cases);
    setActiveCaseId(initialCaseId);
    setSelection((current) => ({
      ...current,
      casos: {
        ...current.casos,
        selectedCaseId: initialCaseId,
      },
    }));
  }, [activeCaseId, data.cases, data.loading]);

  const setActiveCase = useCallback((caseId) => {
    if (!caseId) return;

    setActiveCaseId(caseId);
    setSelection((current) => ({
      ...current,
      casos: {
        ...current.casos,
        selectedCaseId: caseId,
      },
    }));
  }, []);

  const goToOperacion = useCallback(() => {
    setCurrentModule(QUEST_MODULE_OPERACION);
  }, []);

  const goToCasos = useCallback((options = {}) => {
    const nextCaseId = options.caseId || activeCaseId || selection.casos.selectedCaseId;

    if (nextCaseId) {
      setSelection((current) => ({
        ...current,
        casos: {
          ...current.casos,
          selectedCaseId: nextCaseId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_CASOS);
    setCurrentModule(QUEST_MODULE_CASOS);
  }, [activeCaseId, selection.casos.selectedCaseId]);

  const goToMapa = useCallback((options = {}) => {
    if (options.poiId) {
      setSelection((current) => ({
        ...current,
        mapa: {
          ...current.mapa,
          selectedPoiId: options.poiId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, []);

  const goToPerfiles = useCallback((options = {}) => {
    if (options.profileId) {
      setSelection((current) => ({
        ...current,
        perfiles: {
          ...current.perfiles,
          selectedProfileId: options.profileId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_PERFILES);
    setCurrentModule(QUEST_MODULE_PERFILES);
  }, []);

  const goToHerramientas = useCallback((options = {}) => {
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool: options.tool || current.herramientas.activeTool || 'evidencias',
        resourceId: options.resourceId || current.herramientas.resourceId || null,
      },
    }));
    setToolContext({
      originModule: options.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool: options.tool || 'evidencias',
      resourceId: options.resourceId || null,
    });
    setCurrentModule(QUEST_MODULE_HERRAMIENTAS);
  }, [lastPrimaryModule]);

  const selectCase = useCallback((caseId) => {
    if (!caseId) return;
    setActiveCase(caseId);
    setLastPrimaryModule(QUEST_MODULE_CASOS);
    setCurrentModule(QUEST_MODULE_CASOS);
  }, [setActiveCase]);

  const selectPoi = useCallback((poiId) => {
    if (!poiId) return;
    setSelection((current) => ({
      ...current,
      mapa: {
        ...current.mapa,
        selectedPoiId: poiId,
      },
    }));
    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, []);

  const selectProfile = useCallback((profileId) => {
    if (!profileId) return;
    setSelection((current) => ({
      ...current,
      perfiles: {
        ...current.perfiles,
        selectedProfileId: profileId,
      },
    }));
    setLastPrimaryModule(QUEST_MODULE_PERFILES);
    setCurrentModule(QUEST_MODULE_PERFILES);
  }, []);

  const openTool = useCallback((tool, options = {}) => {
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool: tool,
        resourceId: options.resourceId || null,
      },
    }));
    setToolContext({
      originModule: options.originModule || currentModule,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool,
      resourceId: options.resourceId || null,
    });
    setCurrentModule(QUEST_MODULE_HERRAMIENTAS);
  }, [currentModule]);

  const returnToOperationalContext = useCallback(() => {
    const fallbackModule = toolContext?.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION;
    setCurrentModule(fallbackModule);
  }, [lastPrimaryModule, toolContext]);

  const setPhoneMode = useCallback((mode) => {
    if (mode !== PHONE_MODE_CALL && mode !== PHONE_MODE_TRACER) return;

    setPhoneState((current) => {
      if (current.activeMode) {
        return {
          ...current,
          lastAction: 'CALL finaliza la sesión activa antes de cambiar de modo.',
        };
      }

      return {
        ...current,
        mode,
        lastAction:
          mode === PHONE_MODE_CALL
            ? 'Modo llamada preparado.'
            : 'Modo traza preparado.',
      };
    });
  }, []);

  const enterPhoneFocus = useCallback(() => {
    setPhoneState((current) => ({
      ...current,
      focusMode: true,
      lastAction:
        current.lastAction === 'Teléfono en espera.'
          ? 'Teléfono enfocado.'
          : current.lastAction,
    }));
  }, []);

  const exitPhoneFocus = useCallback(() => {
    setPhoneState((current) => ({
      ...current,
      focusMode: false,
    }));
  }, []);

  const stopPhoneTone = useCallback((toneKey) => {
    const audio = phoneAudioRef.current[toneKey];
    if (!audio) return;
    try {
      audio.pause();
      audio.currentTime = 0;
    } catch {
      // noop
    }
  }, []);

  const playPhoneTone = useCallback((toneKey, { restart = true, loop = false } = {}) => {
    const audio = phoneAudioRef.current[toneKey];
    if (!audio) return;
    try {
      audio.loop = loop;
      if (restart) audio.currentTime = 0;
      const playback = audio.play();
      if (playback && typeof playback.catch === 'function') {
        playback.catch(() => {});
      }
    } catch {
      // noop
    }
  }, []);

  const stopQuestCallPlayback = useCallback((options = {}) => {
    const {
      playHangup = false,
      keepDigits = true,
      message = 'Llamada finalizada.',
      clearPressedKey = false,
    } = options;
    const playback = callPlaybackRef.current;

    if (playback.audio && playback.endedHandler) {
      playback.audio.removeEventListener('ended', playback.endedHandler);
    }
    if (playback.audio) {
      try {
        playback.audio.pause();
        playback.audio.currentTime = 0;
      } catch {
        // noop
      }
    }

    callPlaybackRef.current = {
      audio: null,
      endedHandler: null,
    };

    if (playHangup) {
      playPhoneTone('hangupTone', { restart: true });
    }

    setPhoneState((current) => {
      if (current.activeMode !== PHONE_MODE_CALL) return current;
      return {
        ...current,
        activeMode: null,
        lineStatus: 'colgada',
        lastAction: message,
        dialedDigits: keepDigits ? current.dialedDigits : '',
        activeAudioLabel: '',
        pressedKey: clearPressedKey ? null : 'Call',
      };
    });
  }, [playPhoneTone]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    phoneAudioRef.current = {
      callTone: new Audio('/assets/sounds/call.mp3'),
      pickupTone: new Audio('/assets/sounds/pickup.mp3'),
      hangupTone: new Audio('/assets/sounds/hangup.mp3'),
      keypadTone: new Audio('/assets/sounds/dtmf-wopr.wav'),
      errorTone: new Audio('/assets/sounds/mistake.mp3'),
    };

    phoneAudioRef.current.callTone.volume = 0.72;
    phoneAudioRef.current.pickupTone.volume = 0.82;
    phoneAudioRef.current.hangupTone.volume = 0.82;
    phoneAudioRef.current.keypadTone.volume = 0.4;
    phoneAudioRef.current.errorTone.volume = 0.6;

    return () => {
      stopQuestCallPlayback({
        playHangup: false,
        clearPressedKey: true,
      });
      Object.values(phoneAudioRef.current).forEach((audio) => {
        try {
          audio?.pause?.();
          if (audio) audio.currentTime = 0;
        } catch {
          // noop
        }
      });
    };
  }, [stopQuestCallPlayback]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let cancelled = false;
    let reconnectTimeoutId = 0;

    const connect = () => {
      const socketUrl = getTracerSocketUrl();
      if (!socketUrl) return;

      const socket = new WebSocket(socketUrl);
      tracerSocketRef.current = socket;

      setPhoneState((current) => ({
        ...current,
        tracerWsState: 'connecting',
      }));

      socket.onopen = () => {
        if (cancelled) return;
        tracerReconnectRef.current = 0;
        setPhoneState((current) => ({
          ...current,
          tracerWsState: 'online',
          lastAction:
            current.lastAction === 'Teléfono en espera.'
              ? 'Bridge TRACER online.'
              : current.lastAction,
        }));
      };

      socket.onmessage = (event) => {
        let payload;
        try {
          payload = JSON.parse(String(event.data || '{}'));
        } catch {
          return;
        }

        if (payload.type === 'tracer:ringing') {
          playPhoneTone('callTone', { restart: true, loop: true });
          setPhoneState((current) => ({
            ...current,
            activeMode: PHONE_MODE_TRACER,
            activeCallId: String(payload.callId || ''),
            tracerPhase: 'ringing',
            lineStatus: 'ringing',
            lastDialedNumber: current.dialedDigits || current.lastDialedNumber,
            lastAction: `Llamada saliente a ${current.dialedDigits || current.lastDialedNumber || 'línea configurada'}.`,
          }));
          return;
        }

        if (payload.type === 'tracer:answered') {
          stopPhoneTone('callTone');
          playPhoneTone('pickupTone', { restart: true });
          setPhoneState((current) => ({
            ...current,
            activeMode: PHONE_MODE_TRACER,
            activeCallId: String(payload.callId || current.activeCallId || ''),
            tracerPhase: 'answered',
            lineStatus: 'trazando',
            hotspotLabel: String(payload.hotspot?.label || ''),
            lastAction: `Operador respondió.${payload.hotspot?.label ? ` Hotspot ${payload.hotspot.label}.` : ' Traza en curso.'}`,
          }));
          return;
        }

        if (payload.type === 'tracer:hangup' || payload.type === 'tracer:auto_hangup') {
          stopPhoneTone('callTone');
          playPhoneTone('hangupTone', { restart: true });
          setPhoneState((current) => ({
            ...current,
            activeMode: null,
            activeCallId: '',
            tracerPhase: payload.type === 'tracer:auto_hangup' ? 'timeout' : 'hangup',
            lineStatus: 'colgada',
            lastAction:
              payload.type === 'tracer:auto_hangup'
                ? String(payload.message || 'Llamada no atendida.')
                : current.hotspotLabel
                  ? `Traza congelada en ${current.hotspotLabel}.`
                  : 'Llamada finalizada.',
            activeAudioLabel: '',
          }));
          return;
        }

        if (payload.type === 'tracer:error') {
          stopPhoneTone('callTone');
          playPhoneTone('errorTone', { restart: true });
          setPhoneState((current) => ({
            ...current,
            activeMode: null,
            activeCallId: '',
            tracerPhase: 'error',
            lineStatus: 'colgada',
            lastAction: String(payload.message || 'Error operativo de tracer.'),
            activeAudioLabel: '',
          }));
        }
      };

      socket.onerror = () => {
        if (cancelled) return;
        setPhoneState((current) => ({
          ...current,
          tracerWsState: 'error',
        }));
      };

      socket.onclose = () => {
        if (cancelled) return;
        if (tracerSocketRef.current === socket) {
          tracerSocketRef.current = null;
        }
        stopPhoneTone('callTone');
        setPhoneState((current) => ({
          ...current,
          tracerWsState: 'offline',
        }));

        const nextDelay = Math.min(4000, 800 + tracerReconnectRef.current * 600);
        tracerReconnectRef.current += 1;
        reconnectTimeoutId = window.setTimeout(connect, nextDelay);
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (reconnectTimeoutId) window.clearTimeout(reconnectTimeoutId);
      if (tracerSocketRef.current) {
        tracerSocketRef.current.close(1000, 'cleanup');
        tracerSocketRef.current = null;
      }
      stopPhoneTone('callTone');
    };
  }, [playPhoneTone, stopPhoneTone]);

  const clearPhoneDial = useCallback(() => {
    playPhoneTone('keypadTone', { restart: true });
    setPhoneState((current) => {
      if (current.activeMode) {
        return {
          ...current,
          lastAction: 'CALL finaliza la sesión activa. CLEAR solo limpia la marcación en reposo.',
          pressedKey: 'Clear',
        };
      }

      return {
        ...current,
        dialedDigits: '',
        lineStatus: 'colgada',
        lastAction: 'Marcación limpiada.',
        pressedKey: 'Clear',
      };
    });
  }, [playPhoneTone]);

  const togglePhoneHandset = useCallback(() => {
    playPhoneTone('keypadTone', { restart: true });
    setPhoneState((current) => ({
      ...current,
      lastAction: 'Usa CALL para iniciar o colgar. El auricular es decorativo en VR.',
    }));
  }, [playPhoneTone]);

  const startTracerCall = useCallback((digits) => {
    setPhoneState((current) => {
      if (current.tracerWsState !== 'online') {
        playPhoneTone('errorTone', { restart: true });
        return {
          ...current,
          lineStatus: 'colgada',
          lastAction: 'Bridge TRACER offline.',
          pressedKey: 'Call',
        };
      }

      const socket = tracerSocketRef.current;
      if (!socket || socket.readyState !== 1) {
        playPhoneTone('errorTone', { restart: true });
        return {
          ...current,
          lineStatus: 'colgada',
          lastAction: 'No se pudo contactar con el bridge TRACER.',
          pressedKey: 'Call',
        };
      }

      socket.send(JSON.stringify({
        type: 'tracer:start',
        number: digits,
      }));
      playPhoneTone('callTone', { restart: true, loop: true });

      return {
        ...current,
        activeMode: PHONE_MODE_TRACER,
        lastDialedNumber: digits,
        lineStatus: 'solicitando',
        tracerPhase: 'dialing',
        hotspotLabel: '',
        lastAction: `Solicitando traza para ${digits}.`,
        pressedKey: 'Call',
      };
    });

    goToHerramientas({
      tool: 'comunicaciones',
      originModule: currentModule,
      resourceId: 'phone-tracer',
    });
  }, [currentModule, goToHerramientas, playPhoneTone]);

  const startQuestCallPlayback = useCallback(async (digits) => {
    const [lines, models] = await Promise.all([
      loadPhoneLines(),
      loadAudioModels(),
    ]);

    const line = lines.find((entry) => normalizePhoneNumber(entry.number) === digits);
    if (!line) {
      playPhoneTone('errorTone', { restart: true });
      setPhoneState((current) => ({
        ...current,
        lineStatus: 'colgada',
        lastAction: `Sin línea para ${digits}.`,
        pressedKey: 'Call',
      }));
      return;
    }

    const audioEntry = models.find((entry) => entry.id === line.audioId);
    const source = getAudioSource(audioEntry);
    if (!source) {
      playPhoneTone('errorTone', { restart: true });
      setPhoneState((current) => ({
        ...current,
        lineStatus: 'colgada',
        lastAction: `Sin audio para ${line.number || digits}.`,
        pressedKey: 'Call',
      }));
      return;
    }

    stopQuestCallPlayback({
      playHangup: false,
      keepDigits: true,
      clearPressedKey: true,
    });

    const audio = new Audio(source);
    audio.preload = 'auto';
    audio.volume = 0.85;

    const endedHandler = () => {
      stopQuestCallPlayback({
        playHangup: true,
        keepDigits: true,
        message: `Línea finalizada: ${line.label || line.number || digits}.`,
        clearPressedKey: true,
      });
    };

    audio.addEventListener('ended', endedHandler);
    callPlaybackRef.current = {
      audio,
      endedHandler,
    };

    playPhoneTone('pickupTone', { restart: true });
    setPhoneState((current) => ({
      ...current,
      activeMode: PHONE_MODE_CALL,
      lastDialedNumber: digits,
      lineStatus: 'conectada',
      lastAction: `Línea conectada: ${line.label || line.number || digits}.`,
      activeAudioLabel: line.label || line.number || digits,
      pressedKey: 'Call',
      tracerPhase: 'idle',
      hotspotLabel: '',
    }));

    goToHerramientas({
      tool: 'comunicaciones',
      originModule: currentModule,
      resourceId: 'phone-call',
    });

    const playback = audio.play();
    if (playback && typeof playback.catch === 'function') {
      playback.catch(() => {
        stopQuestCallPlayback({
          playHangup: false,
          keepDigits: true,
          message: 'No se pudo iniciar el audio de la línea.',
          clearPressedKey: true,
        });
      });
    }

    markPhoneLineCalled(line.number || digits);
  }, [currentModule, goToHerramientas, playPhoneTone, stopQuestCallPlayback]);

  const hangupTracerCall = useCallback(() => {
    stopPhoneTone('callTone');
    playPhoneTone('hangupTone', { restart: true });
    const socket = tracerSocketRef.current;

    if (socket && socket.readyState === 1 && phoneState.activeCallId) {
      socket.send(JSON.stringify({
        type: 'tracer:agent_hangup',
        callId: phoneState.activeCallId,
      }));
      return;
    }

    setPhoneState((current) => ({
      ...current,
      activeMode: null,
      activeCallId: '',
      tracerPhase: 'hangup',
      lineStatus: 'colgada',
      lastAction: 'Traza cancelada por el agente.',
      activeAudioLabel: '',
      pressedKey: 'Call',
    }));
  }, [phoneState.activeCallId, playPhoneTone, stopPhoneTone]);

  const pressPhoneKey = useCallback(async (key) => {
    const normalizedKey = normalizePhoneKey(key);

    if (normalizedKey === 'Call') {
      if (phoneState.activeMode === PHONE_MODE_CALL) {
        stopQuestCallPlayback({
          playHangup: true,
          keepDigits: true,
          message: 'Llamada finalizada por el agente.',
        });
        return;
      }

      if (isTracerActive(phoneState)) {
        hangupTracerCall();
        return;
      }

      const digits = normalizePhoneNumber(phoneState.dialedDigits || phoneState.lastDialedNumber);
      if (!digits) {
        playPhoneTone('errorTone', { restart: true });
        setPhoneState((current) => ({
          ...current,
          lineStatus: 'colgada',
          lastAction: 'Marca un número antes de llamar.',
          pressedKey: 'Call',
        }));
        return;
      }

      if (phoneState.mode === PHONE_MODE_TRACER) {
        startTracerCall(digits);
        return;
      }

      await startQuestCallPlayback(digits);
      return;
    }

    if (normalizedKey === 'Clear') {
      clearPhoneDial();
      return;
    }

    playPhoneTone('keypadTone', { restart: true });
    setPhoneState((current) => {
      if (current.activeMode) {
        return {
          ...current,
          lastAction: 'CALL finaliza la sesión actual. No se modifica la marcación en vivo.',
          pressedKey: normalizedKey,
        };
      }

      const nextDigits = `${current.dialedDigits}${normalizedKey}`.slice(0, 16);
      return {
        ...current,
        dialedDigits: nextDigits,
        lineStatus: 'marcando',
        lastAction: `Marcando ${nextDigits}.`,
        pressedKey: normalizedKey,
      };
    });
  }, [
    clearPhoneDial,
    hangupTracerCall,
    phoneState,
    playPhoneTone,
    startQuestCallPlayback,
    startTracerCall,
    stopQuestCallPlayback,
  ]);

  useEffect(() => {
    if (!phoneState.pressedKey) return undefined;

    const timeoutId = window.setTimeout(() => {
      setPhoneState((current) => ({
        ...current,
        pressedKey: null,
      }));
    }, 180);

    return () => window.clearTimeout(timeoutId);
  }, [phoneState.pressedKey]);

  const activeCase = useMemo(
    () => data.cases.find((entry) => entry.id === activeCaseId) || null,
    [activeCaseId, data.cases]
  );

  const selectedCase = useMemo(() => {
    const selectedCaseId = selection.casos.selectedCaseId || activeCaseId;
    return data.cases.find((entry) => entry.id === selectedCaseId) || activeCase || null;
  }, [activeCase, activeCaseId, data.cases, selection.casos.selectedCaseId]);

  const selectedPoi = useMemo(
    () => data.pois.find((entry) => entry.id === selection.mapa.selectedPoiId) || data.pois[0] || null,
    [data.pois, selection.mapa.selectedPoiId]
  );

  const selectedProfile = useMemo(
    () => data.villains.find((entry) => entry.id === selection.perfiles.selectedProfileId) || data.villains[0] || null,
    [data.villains, selection.perfiles.selectedProfileId]
  );

  const openLeads = useMemo(() => {
    const poiLead = data.pois[0]
      ? {
          id: `poi:${data.pois[0].id}`,
          tipo: 'mapa',
          titulo: data.pois[0].name,
          resumenBreve: summarizeText(data.pois[0].summary, 'Sin resumen de ubicación.'),
          destino: QUEST_MODULE_MAPA,
          destinoId: data.pois[0].id,
        }
      : null;
    const profileLead = data.villains[0]
      ? {
          id: `perfil:${data.villains[0].id}`,
          tipo: 'perfil',
          titulo: data.villains[0].alias,
          resumenBreve: summarizeText(data.villains[0].summary, 'Sin resumen de perfil.'),
          destino: QUEST_MODULE_PERFILES,
          destinoId: data.villains[0].id,
        }
      : null;
    const toolLead = {
      id: 'tool:evidencias',
      tipo: 'herramienta',
      titulo: 'Bahía de evidencias',
      resumenBreve: 'Inspección instrumental preparada para el caso en foco.',
      destino: QUEST_MODULE_HERRAMIENTAS,
      destinoId: 'evidencias',
    };

    return [poiLead, profileLead, toolLead].filter(Boolean);
  }, [data.pois, data.villains]);

  const recentChanges = useMemo(() => {
    const changes = [];

    if (activeCase) {
      changes.push({
        id: `case:${activeCase.id}`,
        label: 'Caso activo',
        detail: `${activeCase.title} · ${activeCase.status || 'sin estado'}`,
      });
    }

    if (selectedPoi) {
      changes.push({
        id: `poi:${selectedPoi.id}`,
        label: 'Ubicación monitorizada',
        detail: `${selectedPoi.name} · ${selectedPoi.district || 'sin distrito'}`,
      });
    }

    if (selectedProfile) {
      changes.push({
        id: `profile:${selectedProfile.id}`,
        label: 'Perfil destacado',
        detail: `${selectedProfile.alias} · ${selectedProfile.threatLevel || selectedProfile.status || 'sin nivel'}`,
      });
    }

    if (selection.herramientas.activeTool) {
      changes.push({
        id: `tool:${selection.herramientas.activeTool}`,
        label: 'Herramienta preparada',
        detail: selection.herramientas.activeTool,
      });
    }

    if (
      phoneState.dialedDigits ||
      phoneState.lastDialedNumber ||
      phoneState.activeMode ||
      phoneState.activeAudioLabel
    ) {
      changes.push({
        id: 'phone:line',
        label: 'Línea telefónica',
        detail: [
          phoneState.mode === PHONE_MODE_TRACER ? 'traza' : 'llamada',
          phoneState.lineStatus,
          phoneState.lastDialedNumber || phoneState.dialedDigits || 'sin marcación',
        ].join(' · '),
      });
    }

    return changes.slice(0, 4);
  }, [
    activeCase,
    phoneState.activeAudioLabel,
    phoneState.activeMode,
    phoneState.dialedDigits,
    phoneState.lastDialedNumber,
    phoneState.lineStatus,
    phoneState.mode,
    selectedPoi,
    selectedProfile,
    selection.herramientas.activeTool,
  ]);

  const alertLevel = STATUS_TO_ALERT[activeCase?.status] || 'media';
  const syncState = buildSyncState(data);

  return {
    currentModule,
    lastPrimaryModule,
    activeCaseId,
    activeCase,
    selectedCase,
    selectedPoi,
    selectedProfile,
    selection,
    toolContext,
    phoneState,
    syncState,
    alertLevel,
    openLeads,
    recentChanges,
    actions: {
      goToOperacion,
      goToCasos,
      goToMapa,
      goToPerfiles,
      goToHerramientas,
      setActiveCase,
      selectCase,
      selectPoi,
      selectProfile,
      openTool,
      returnToOperationalContext,
      setPhoneMode,
      clearPhoneDial,
      enterPhoneFocus,
      exitPhoneFocus,
      pressPhoneKey,
      togglePhoneHandset,
    },
  };
};

export { PHONE_MODE_CALL, PHONE_MODE_TRACER, useQuestSession };
