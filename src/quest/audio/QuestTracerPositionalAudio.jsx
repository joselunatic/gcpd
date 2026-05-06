import { useEffect, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

import { PHONE_MODE_TRACER } from '../hooks/useQuestSession';
import { QUEST_MODULE_HERRAMIENTAS } from '../state/questModules';

const DEFAULT_AUDIO_CONFIG = {
  tracer: {
    idleLoop: '/audio/quest/tracer/tracer_idle_loop.ogg',
    activeLoop: '/audio/quest/tracer/tracer_active_loop.ogg',
    ping: '/audio/quest/tracer/tracer_signal_ping_01.ogg',
    lock: '/audio/quest/tracer/tracer_signal_lock.ogg',
  },
  credits: [
    {
      id: 'algorithm_runner',
      title: 'Algorithm Runner - Dark Cyberpunk Cinematic Music Loopable',
      author: 'JoelFazhari',
      source: 'https://pixabay.com/music/pulses-algorithm-runner-dark-cyberpunk-cinematic-music-loopable-185038/',
      license: 'Pixabay Content License',
      intendedUse: 'tracer_active_loop',
    },
    {
      id: 'dark_place_loop',
      title: 'Dark Place (loop)',
      author: 'SkyleTheFrench',
      source: 'https://opengameart.org/content/dark-place-loop',
      license: 'CC0',
      intendedUse: 'tracer_idle_loop',
    },
  ],
};

const AUDIO_CONFIG_URL = '/audio/quest/tracer/tracer-audio.json';
const ROOT_NAME = 'GCPD_Quest_TracerAudioRoot';
const LOOP_IDLE_NAME = 'GCPD_Quest_TracerIdleLoop';
const LOOP_ACTIVE_NAME = 'GCPD_Quest_TracerActiveLoop';
const PING_NAME = 'GCPD_Quest_TracerPing';
const LOCK_NAME = 'GCPD_Quest_TracerLock';
const ROOT_OFFSET = new THREE.Vector3(0.02, 0.08, 0.04);
const IDLE_VOLUME = 0.11;
const ACTIVE_VOLUME = 0.2;
const ACTIVE_LOCK_VOLUME = 0.07;
const PING_VOLUME = 0.28;
const LOCK_VOLUME = 0.44;
const VOLUME_EPSILON = 0.004;
const LOOP_FADE_SPEED = 5.5;
const ACTIVE_PHASES = new Set(['dialing', 'ringing', 'answered']);

const applyPositionalSettings = (audio) => {
  if (!audio?.panner) return;
  audio.setRefDistance(0.82);
  audio.setRolloffFactor(1.55);
  audio.setDistanceModel('inverse');
  audio.setMaxDistance(6.2);
  audio.panner.coneInnerAngle = 360;
  audio.panner.coneOuterAngle = 360;
  audio.panner.coneOuterGain = 0.9;
};

const mergeAudioConfig = (incoming) => ({
  tracer: {
    ...DEFAULT_AUDIO_CONFIG.tracer,
    ...(incoming?.tracer || {}),
  },
  credits: Array.isArray(incoming?.credits) ? incoming.credits : DEFAULT_AUDIO_CONFIG.credits,
});

const createLoopAudio = (listener, name) => {
  const audio = new THREE.PositionalAudio(listener);
  audio.name = name;
  audio.setLoop(true);
  audio.setVolume(0);
  applyPositionalSettings(audio);
  return audio;
};

const createOneShotAudio = (listener, name) => {
  const audio = new THREE.PositionalAudio(listener);
  audio.name = name;
  audio.setLoop(false);
  audio.setVolume(0);
  applyPositionalSettings(audio);
  return audio;
};

const QuestTracerPositionalAudio = ({
  anchorRef,
  phoneState,
  currentModule,
  activeTool,
}) => {
  const { camera, gl } = useThree();
  const [audioConfig, setAudioConfig] = useState(DEFAULT_AUDIO_CONFIG);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const createdListenerRef = useRef(false);
  const listenerRef = useRef(null);
  const sessionRef = useRef(null);
  const sessionUnlockHandlerRef = useRef(null);
  const warnedRef = useRef(new Set());
  const audioRootRef = useRef(null);
  const loopVolumesRef = useRef({
    idle: 0,
    active: 0,
  });
  const lastTraceStateRef = useRef({
    active: false,
    stage: 0,
    exact: false,
  });
  const buffersRef = useRef({
    idle: null,
    active: null,
    ping: null,
    lock: null,
  });
  const audioNodesRef = useRef({
    idle: null,
    active: null,
    ping: null,
    lock: null,
  });

  const warnOnce = (key, message, error = null) => {
    if (warnedRef.current.has(key)) return;
    warnedRef.current.add(key);
    if (error) {
      console.warn(message, error);
      return;
    }
    console.warn(message);
  };

  const unlockAudio = async () => {
    const listener = listenerRef.current;
    if (!listener) {
      warnOnce('listener-missing', '[Quest][TracerAudio] Audio listener unavailable.');
      return;
    }

    try {
      if (listener.context.state === 'suspended') {
        await listener.context.resume();
      }
      if (listener.context.state === 'running') {
        setAudioUnlocked(true);
      }
    } catch (error) {
      warnOnce('audio-resume-failed', '[Quest][TracerAudio] Unable to resume audio context.', error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadConfig = async () => {
      try {
        const response = await fetch(AUDIO_CONFIG_URL, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Config responded ${response.status}`);
        }
        const data = await response.json();
        if (!cancelled) {
          setAudioConfig(mergeAudioConfig(data));
        }
      } catch (error) {
        if (!cancelled) {
          setAudioConfig(DEFAULT_AUDIO_CONFIG);
        }
        warnOnce(
          'config-fallback',
          '[Quest][TracerAudio] Using default tracer audio config. Local JSON missing or invalid.',
          error
        );
      }
    };

    loadConfig();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!camera) return undefined;

    const existingListener = camera.children.find((child) => child?.type === 'AudioListener');
    if (existingListener) {
      listenerRef.current = existingListener;
    } else {
      const listener = new THREE.AudioListener();
      listener.name = 'GCPD_Quest_TracerAudioListener';
      camera.add(listener);
      listenerRef.current = listener;
      createdListenerRef.current = true;
    }

    const listener = listenerRef.current;
    if (!listener) return undefined;

    const root = new THREE.Group();
    root.name = ROOT_NAME;
    root.position.copy(ROOT_OFFSET);

    const idleLoop = createLoopAudio(listener, LOOP_IDLE_NAME);
    const activeLoop = createLoopAudio(listener, LOOP_ACTIVE_NAME);
    const ping = createOneShotAudio(listener, PING_NAME);
    const lock = createOneShotAudio(listener, LOCK_NAME);

    root.add(idleLoop);
    root.add(activeLoop);
    root.add(ping);
    root.add(lock);

    audioRootRef.current = root;
    audioNodesRef.current = {
      idle: idleLoop,
      active: activeLoop,
      ping,
      lock,
    };

    const anchor = anchorRef?.current || null;
    if (anchor) {
      anchor.add(root);
    } else {
      warnOnce('audio-anchor-missing', '[Quest][TracerAudio] Dialer anchor not available; positional audio disabled until anchor appears.');
    }

    return () => {
      const nodes = audioNodesRef.current;
      [nodes.idle, nodes.active, nodes.ping, nodes.lock].forEach((node) => {
        if (!node) return;
        try {
          if (node.isPlaying) node.stop();
        } catch {
          // noop
        }
        if (node.parent) {
          node.parent.remove(node);
        }
      });

      if (audioRootRef.current?.parent) {
        audioRootRef.current.parent.remove(audioRootRef.current);
      }

      audioRootRef.current = null;
      audioNodesRef.current = {
        idle: null,
        active: null,
        ping: null,
        lock: null,
      };

      if (createdListenerRef.current && listenerRef.current?.parent === camera) {
        camera.remove(listenerRef.current);
      }
      listenerRef.current = null;
      createdListenerRef.current = false;
    };
  }, [anchorRef, camera]);

  useEffect(() => {
    const root = audioRootRef.current;
    const anchor = anchorRef?.current || null;
    if (!root || !anchor) return;

    if (root.parent !== anchor) {
      anchor.add(root);
    }
  });

  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
    };

    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('touchstart', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });
    gl.domElement?.addEventListener('click', handleInteraction, { passive: true });

    return () => {
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      gl.domElement?.removeEventListener('click', handleInteraction);
    };
  }, [gl.domElement]);

  useEffect(() => {
    const listener = listenerRef.current;
    if (!listener) return;

    const loadBuffer = (key, url) =>
      new Promise((resolve) => {
        const loader = new THREE.AudioLoader();
        loader.load(
          url,
          (buffer) => resolve([key, buffer]),
          undefined,
          (error) => {
            warnOnce(
              `missing-${key}-${url}`,
              `[Quest][TracerAudio] Missing or unreadable asset for ${key}: ${url}`,
              error
            );
            resolve([key, null]);
          }
        );
      });

    let cancelled = false;

    const loadAll = async () => {
      const entries = [
        ['idle', audioConfig.tracer.idleLoop],
        ['active', audioConfig.tracer.activeLoop],
        ['ping', audioConfig.tracer.ping],
        ['lock', audioConfig.tracer.lock],
      ];

      const results = await Promise.all(entries.map(([key, url]) => loadBuffer(key, url)));
      if (cancelled) return;

      results.forEach(([key, buffer]) => {
        buffersRef.current[key] = buffer;
        const node = audioNodesRef.current[key];
        if (node && buffer) {
          node.setBuffer(buffer);
        }
      });
    };

    loadAll();

    return () => {
      cancelled = true;
    };
  }, [audioConfig]);

  useFrame((_, delta) => {
    const session = (() => {
      try {
        return gl.xr?.getSession?.() || null;
      } catch {
        return null;
      }
    })();

    if (session && sessionRef.current !== session) {
      if (sessionRef.current && sessionUnlockHandlerRef.current) {
        sessionRef.current.removeEventListener('selectstart', sessionUnlockHandlerRef.current);
        sessionRef.current.removeEventListener('squeezestart', sessionUnlockHandlerRef.current);
      }
      const handleSessionInteraction = () => {
        unlockAudio();
      };
      session.addEventListener('selectstart', handleSessionInteraction);
      session.addEventListener('squeezestart', handleSessionInteraction);
      sessionRef.current = session;
      sessionUnlockHandlerRef.current = handleSessionInteraction;
    }

    const listener = listenerRef.current;
    if (!listener || !audioUnlocked) {
      if (listener?.context?.state === 'running' && !audioUnlocked) {
        setAudioUnlocked(true);
      }
    }

    const nodes = audioNodesRef.current;
    const idleLoop = nodes.idle;
    const activeLoop = nodes.active;

    const tracerSelected =
      phoneState?.mode === PHONE_MODE_TRACER ||
      activeTool === 'rastreo' ||
      (currentModule === QUEST_MODULE_HERRAMIENTAS && activeTool === 'comunicaciones') ||
      (currentModule === QUEST_MODULE_HERRAMIENTAS && activeTool === 'rastreo') ||
      (phoneState?.focusMode && phoneState?.mode === PHONE_MODE_TRACER);
    const tracerActive =
      phoneState?.activeMode === PHONE_MODE_TRACER ||
      (phoneState?.mode === PHONE_MODE_TRACER && ACTIVE_PHASES.has(phoneState?.tracerPhase));
    const exactHotspot = Boolean(phoneState?.hotspot?.label || phoneState?.hotspotLabel);
    const tracerExact = tracerActive && Number(phoneState?.tracerStage || 0) >= 3 && exactHotspot;

    const idleTarget = audioUnlocked && tracerSelected && !tracerActive ? IDLE_VOLUME : 0;
    const activeTarget = audioUnlocked && tracerActive ? (tracerExact ? ACTIVE_LOCK_VOLUME : ACTIVE_VOLUME) : 0;

    const updateLoop = (node, key, targetVolume) => {
      if (!node || !buffersRef.current[key]) return;
      if (targetVolume > 0 && !node.isPlaying) {
        try {
          node.play();
        } catch (error) {
          warnOnce(
            `play-${key}-failed`,
            `[Quest][TracerAudio] Could not start ${key} loop.`,
            error
          );
        }
      }

      const currentVolume = loopVolumesRef.current[key];
      const nextVolume = THREE.MathUtils.damp(
        currentVolume,
        targetVolume,
        LOOP_FADE_SPEED,
        delta
      );
      loopVolumesRef.current[key] = nextVolume;
      node.setVolume(nextVolume);

      if (targetVolume <= 0 && nextVolume <= VOLUME_EPSILON && node.isPlaying) {
        try {
          node.stop();
        } catch {
          // noop
        }
      }
    };

    updateLoop(idleLoop, 'idle', idleTarget);
    updateLoop(activeLoop, 'active', activeTarget);

    const previous = lastTraceStateRef.current;
    const currentStage = Math.max(0, Number(phoneState?.tracerStage || 0));
    const currentActive = Boolean(tracerActive);
    const currentExact = Boolean(tracerExact);

    const playOneShot = (key, volume) => {
      const node = nodes[key];
      if (!audioUnlocked || !node || !buffersRef.current[key]) return;
      try {
        if (node.isPlaying) {
          node.stop();
        }
        node.setVolume(volume);
        node.play();
      } catch (error) {
        warnOnce(
          `oneshot-${key}-failed`,
          `[Quest][TracerAudio] Could not play ${key} one-shot.`,
          error
        );
      }
    };

    if (currentActive && !previous.active) {
      playOneShot('ping', PING_VOLUME);
    } else if (
      currentActive &&
      currentStage > previous.stage &&
      !currentExact
    ) {
      playOneShot('ping', Math.min(0.35, PING_VOLUME + currentStage * 0.02));
    }

    if (currentExact && !previous.exact) {
      playOneShot('lock', LOCK_VOLUME);
    }

    lastTraceStateRef.current = {
      active: currentActive,
      stage: currentStage,
      exact: currentExact,
    };
  });

  useEffect(() => () => {
    if (sessionRef.current && sessionUnlockHandlerRef.current) {
      sessionRef.current.removeEventListener('selectstart', sessionUnlockHandlerRef.current);
      sessionRef.current.removeEventListener('squeezestart', sessionUnlockHandlerRef.current);
    }
    sessionRef.current = null;
    sessionUnlockHandlerRef.current = null;
  }, []);

  return null;
};

export default QuestTracerPositionalAudio;
