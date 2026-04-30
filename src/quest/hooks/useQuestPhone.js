import { useCallback, useEffect, useRef, useState } from 'react';

const AUDIO_ENDPOINT = '/api/audio';
const PHONE_LINES_ENDPOINT = '/api/phone-lines';
const PHONE_CALLED_ENDPOINT = '/api/phone-lines-called';
const PHONE_MODE_CALL = 'call';
const PHONE_MODE_TRACER = 'tracer';

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

const useQuestPhone = ({ currentModule, goToHerramientas }) => {
  const tracerSocketRef = useRef(null);
  const tracerReconnectRef = useRef(0);
  const phoneBridgeModeRef = useRef(PHONE_MODE_TRACER);
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
    keyTones: {},
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
    tracerAnsweredAt: 0,
    hotspot: null,
    hotspotLabel: '',
    activeAudioLabel: '',
  });

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

  const dismissPhoneFocus = useCallback(() => {
    setPhoneState((current) => ({
      ...current,
      focusMode: false,
      lastAction:
        current.lastAction === 'Teléfono enfocado.'
          ? 'Teléfono en espera.'
          : current.lastAction,
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

  const playPhoneKeyTone = useCallback((key) => {
    const normalizedKey = normalizePhoneKey(key);
    const digitTone = /^\d$/.test(normalizedKey)
      ? phoneAudioRef.current.keyTones?.[normalizedKey]
      : null;
    const audio = digitTone || phoneAudioRef.current.keypadTone;

    if (!audio) return;
    try {
      audio.loop = false;
      audio.currentTime = 0;
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
      keyTones: Object.fromEntries(
        Array.from({ length: 10 }, (_, digit) => [
          String(digit),
          new Audio(`/assets/sounds/telephone-key${digit}.mp3`),
        ])
      ),
    };

    phoneAudioRef.current.callTone.volume = 0.72;
    phoneAudioRef.current.pickupTone.volume = 0.82;
    phoneAudioRef.current.hangupTone.volume = 0.82;
    phoneAudioRef.current.keypadTone.volume = 0.4;
    phoneAudioRef.current.errorTone.volume = 0.6;
    Object.values(phoneAudioRef.current.keyTones).forEach((audio) => {
      audio.volume = 0.58;
    });

    return () => {
      stopQuestCallPlayback({
        playHangup: false,
        clearPressedKey: true,
      });
      [
        ...Object.values(phoneAudioRef.current).filter((audio) => audio instanceof Audio),
        ...Object.values(phoneAudioRef.current.keyTones || {}),
      ].forEach((audio) => {
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
            activeMode: phoneBridgeModeRef.current,
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
            activeMode: phoneBridgeModeRef.current,
            activeCallId: String(payload.callId || current.activeCallId || ''),
            tracerPhase: 'answered',
            tracerAnsweredAt: Number(payload.answeredAt) || Date.now(),
            lineStatus: phoneBridgeModeRef.current === PHONE_MODE_TRACER ? 'trazando' : 'conectada',
            hotspot: payload.hotspot || null,
            hotspotLabel: String(payload.hotspot?.label || ''),
            lastAction:
              phoneBridgeModeRef.current === PHONE_MODE_TRACER
                ? `Operador respondió.${payload.hotspot?.label ? ` Hotspot ${payload.hotspot.label}.` : ' Traza en curso.'}`
                : 'DM descolgó la línea.',
          }));
          return;
        }

        if (payload.type === 'tracer:hangup' || payload.type === 'tracer:auto_hangup') {
          stopPhoneTone('callTone');
          playPhoneTone('pickupTone', { restart: true });
          setPhoneState((current) => ({
            ...current,
            activeMode: null,
            activeCallId: '',
            tracerPhase: payload.type === 'tracer:auto_hangup' ? 'timeout' : 'hangup',
            tracerAnsweredAt: 0,
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
  }, []);

  const togglePhoneHandset = useCallback(() => {
    setPhoneState((current) => ({
      ...current,
      lastAction: 'Usa CALL para iniciar o colgar. El auricular es decorativo en VR.',
    }));
  }, []);

  const startPhoneBridgeCall = useCallback((digits, mode = PHONE_MODE_TRACER) => {
    phoneBridgeModeRef.current = mode;
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
        type: mode === PHONE_MODE_TRACER ? 'tracer:start' : 'phone:start',
        number: digits,
      }));
      playPhoneTone('callTone', { restart: true, loop: true });

      return {
        ...current,
        activeMode: mode,
        lastDialedNumber: digits,
        lineStatus: 'solicitando',
        tracerPhase: 'dialing',
        tracerAnsweredAt: 0,
        hotspot: null,
        hotspotLabel: '',
        lastAction:
          mode === PHONE_MODE_TRACER
            ? `Solicitando traza para ${digits}.`
            : `Llamando a ${digits}. Esperando respuesta DM.`,
        pressedKey: 'Call',
      };
    });

    goToHerramientas({
      tool: 'comunicaciones',
      originModule: currentModule,
      resourceId: mode === PHONE_MODE_TRACER ? 'phone-tracer' : 'phone-call',
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
    const socket = tracerSocketRef.current;

    if (socket && socket.readyState === 1 && phoneState.activeCallId) {
      socket.send(JSON.stringify({
        type: 'tracer:agent_hangup',
        callId: phoneState.activeCallId,
      }));
      return;
    }

    playPhoneTone('pickupTone', { restart: true });
    setPhoneState((current) => ({
      ...current,
      activeMode: null,
      activeCallId: '',
      tracerPhase: 'hangup',
      tracerAnsweredAt: 0,
      lineStatus: 'colgada',
      lastAction:
        phoneState.activeMode === PHONE_MODE_TRACER
          ? 'Traza cancelada por el agente.'
          : 'Llamada finalizada por el agente.',
      activeAudioLabel: '',
      pressedKey: 'Call',
    }));
  }, [phoneState.activeCallId, phoneState.activeMode, playPhoneTone, stopPhoneTone]);

  const pressPhoneKey = useCallback(async (key) => {
    const normalizedKey = normalizePhoneKey(key);

    if (normalizedKey === 'Call') {
      if (phoneState.activeMode === PHONE_MODE_CALL) {
        hangupTracerCall();
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
        startPhoneBridgeCall(digits, PHONE_MODE_TRACER);
        return;
      }

      startPhoneBridgeCall(digits, PHONE_MODE_CALL);
      return;
    }

    if (normalizedKey === 'Clear') {
      clearPhoneDial();
      return;
    }

    playPhoneKeyTone(normalizedKey);
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
    playPhoneKeyTone,
    playPhoneTone,
    startPhoneBridgeCall,
    startQuestCallPlayback,
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

  return {
    phoneState,
    phoneActions: {
      setPhoneMode,
      clearPhoneDial,
      enterPhoneFocus,
      exitPhoneFocus,
      dismissPhoneFocus,
      pressPhoneKey,
      togglePhoneHandset,
    },
  };
};

export { PHONE_MODE_CALL, PHONE_MODE_TRACER, useQuestPhone };
