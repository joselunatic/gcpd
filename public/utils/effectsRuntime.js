// RT Effects Runtime — Agent side
// Connects to /ws/effects and applies DM-triggered effects over the terminal.

const EFFECTS_WS_PATH = '/ws/effects?role=agent';
const STYLE_TAG_ID = 'rt-effects-styles';
let _audioCtx = null;
let _reconnectTimer = null;
let _ws = null;
let _activeEffects = new Map(); // effectId -> { cleanup }
const _relativeHosts = new WeakMap();
let _historyPatched = false;
let _locationWatcherInstalled = false;

function isAgentViewPath(pathname = window.location.pathname || '/') {
  return pathname === '/' || pathname === '/index.html';
}

function getAudioCtx() {
  if (!_audioCtx || _audioCtx.state === 'closed') {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (_audioCtx.state === 'suspended') {
    _audioCtx.resume().catch(() => {});
  }
  return _audioCtx;
}

// ─── Audio synthesis ─────────────────────────────────────────────────────────

function playSiren(durationMs = 5000) {
  try {
    const ctx = getAudioCtx();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.28, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);
    gainNode.connect(ctx.destination);

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);

    // LFO that sweeps freq 880 <-> 1100 at 2 Hz
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 1.8;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 110;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    osc.connect(gainNode);
    osc.start(ctx.currentTime);
    lfo.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationMs / 1000);
    lfo.stop(ctx.currentTime + durationMs / 1000);
    return () => {
      try { osc.stop(); lfo.stop(); } catch (_) {}
    };
  } catch (_) {
    return () => {};
  }
}

function playGlitchNoise(durationMs = 400) {
  try {
    const ctx = getAudioCtx();
    const bufferSize = ctx.sampleRate * (durationMs / 1000);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * 0.15;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationMs / 1000);
    source.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start(ctx.currentTime);
    return () => { try { source.stop(); } catch (_) {} };
  } catch (_) {
    return () => {};
  }
}

function playAlertPing() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.4);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.4);
    return () => {};
  } catch (_) {
    return () => {};
  }
}

function playFlickerSound() {
  try {
    const ctx = getAudioCtx();
    [0, 0.08, 0.18, 0.28].forEach((t) => {
      const osc = ctx.createOscillator();
      osc.type = 'square';
      osc.frequency.value = 55 + Math.random() * 30;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.06);
    });
    return () => {};
  } catch (_) {
    return () => {};
  }
}

// ─── Style injection ──────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById(STYLE_TAG_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_TAG_ID;
  style.textContent = `
    .rt-effect-overlay {
      position: absolute;
      inset: 0;
      z-index: 80;
      pointer-events: none;
    }
    /* ── ALARM ── */
    .rt-effect--alarm {
      z-index: 82;
      border: 3px solid rgba(255, 30, 30, 0.0);
      animation: rtAlarmBorder 0.45s ease-in-out infinite;
    }
    .rt-effect--alarm::before {
      content: '';
      position: absolute;
      inset: 0;
      background: rgba(200, 0, 0, 0.07);
      animation: rtAlarmFlash 0.45s ease-in-out infinite;
    }
    .rt-effect--alarm .rt-alarm-message {
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 4px 18px;
      background: rgba(200,0,0,0.82);
      color: #fff;
      font-family: 'Share Tech Mono', monospace;
      font-size: 13px;
      letter-spacing: 0.14em;
      text-shadow: 0 0 8px rgba(255,80,80,0.9);
      white-space: nowrap;
      border: 1px solid rgba(255,100,100,0.6);
      animation: rtAlarmText 0.45s steps(1) infinite;
      max-width: calc(100% - 32px);
      overflow: hidden;
      text-overflow: ellipsis;
    }
    @keyframes rtAlarmBorder {
      0%, 100% { border-color: rgba(255,30,30,0.9); box-shadow: inset 0 0 40px rgba(200,0,0,0.18); }
      50%       { border-color: rgba(255,30,30,0.2); box-shadow: inset 0 0 8px rgba(200,0,0,0.04); }
    }
    @keyframes rtAlarmFlash {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.15; }
    }
    @keyframes rtAlarmText {
      0%, 49% { opacity: 1; }
      50%, 100% { opacity: 0; }
    }
    /* ── HACK / GLITCH ── */
    .rt-effect--hack {
      z-index: 83;
      overflow: hidden;
      mix-blend-mode: screen;
    }
    .rt-effect--hack canvas {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    .rt-effect--hack::after {
      content: 'INTRUSION DETECTED // SIGNAL COMPROMISED';
      position: absolute;
      bottom: 18px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'Share Tech Mono', monospace;
      font-size: 11px;
      letter-spacing: 0.22em;
      color: rgba(255, 60, 60, 0.9);
      text-shadow: 0 0 10px rgba(255,0,0,0.7);
      animation: rtGlitchText 0.12s steps(1) infinite;
      white-space: nowrap;
    }
    @keyframes rtGlitchText {
      0%   { transform: translateX(-50%) skewX(0deg); color: rgba(255,60,60,0.9); }
      20%  { transform: translateX(calc(-50% + 3px)) skewX(-6deg); color: rgba(0,255,180,0.9); }
      40%  { transform: translateX(calc(-50% - 2px)) skewX(4deg); }
      60%  { transform: translateX(-50%) skewX(0deg); }
      80%  { transform: translateX(calc(-50% + 1px)) skewX(2deg); color: rgba(255,60,60,0.9); }
      100% { transform: translateX(-50%); }
    }
    /* ── FOG / NIEBLA ── */
    .rt-effect--fog {
      z-index: 81;
      background: rgba(0, 6, 10, 0.72);
      backdrop-filter: blur(3px);
      animation: rtFogIn 2.2s ease forwards;
    }
    .rt-effect--fog::after {
      content: 'SEÑAL DEGRADADA';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px;
      letter-spacing: 0.3em;
      color: rgba(130, 200, 180, 0.45);
      text-shadow: 0 0 12px rgba(90,255,170,0.3);
      animation: rtFogTextPulse 3s ease-in-out infinite;
    }
    @keyframes rtFogIn {
      from { opacity: 0; backdrop-filter: blur(0); }
      to   { opacity: 1; backdrop-filter: blur(3px); }
    }
    @keyframes rtFogTextPulse {
      0%, 100% { opacity: 0.3; }
      50%       { opacity: 0.7; }
    }
    /* ── FLICKER ── */
    .rt-effect--flicker {
      z-index: 84;
      background: #000;
      animation: rtFlicker 0.6s steps(1) forwards;
    }
    @keyframes rtFlicker {
      0%   { opacity: 1; }
      15%  { opacity: 0; }
      30%  { opacity: 1; }
      45%  { opacity: 0; }
      60%  { opacity: 1; }
      75%  { opacity: 0; }
      90%  { opacity: 0.6; }
      100% { opacity: 0; }
    }
    /* ── MEDIA ── */
    .rt-effect--media {
      z-index: 90;
      pointer-events: all;
      background: rgba(0, 0, 0, 0.92);
      overflow: hidden;
      cursor: default;
    }
    .rt-effect--media img,
    .rt-effect--media video {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      max-width: none;
      max-height: none;
      object-fit: cover;
      object-position: center center;
      border: 0;
      box-shadow: none;
      background: #000;
    }
    .rt-effect--media .rt-media-caption {
      position: absolute;
      left: 50%;
      bottom: 18px;
      z-index: 2;
      transform: translateX(-50%);
      font-family: 'Share Tech Mono', monospace;
      font-size: 12px;
      letter-spacing: 0.14em;
      color: rgba(196, 255, 226, 0.75);
      text-align: center;
      max-width: 84%;
      padding: 4px 10px;
      background: rgba(0, 0, 0, 0.55);
      border: 1px solid rgba(124, 255, 178, 0.18);
      text-shadow: 0 0 8px rgba(0,0,0,0.9);
    }
    /* ── CRITICAL (alarma + hack combo) ── */
    .rt-effect--critical {
      z-index: 85;
      border: 2px solid rgba(255, 30, 30, 0);
      animation: rtCriticalPulse 0.3s ease-in-out infinite;
    }
    .rt-effect--critical::before {
      content: '';
      position: absolute;
      inset: 0;
      background: repeating-linear-gradient(
        0deg,
        rgba(255,0,0,0.04) 0, rgba(255,0,0,0.04) 2px,
        transparent 2px, transparent 4px
      );
    }
    .rt-effect--critical::after {
      content: '⚠  NIVEL CRÍTICO — INTRUSION EN CURSO  ⚠';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      padding: 8px 24px;
      background: rgba(180,0,0,0.88);
      color: #fff;
      font-family: 'Share Tech Mono', monospace;
      font-size: 14px;
      letter-spacing: 0.16em;
      text-shadow: 0 0 12px rgba(255,80,80,0.9);
      white-space: nowrap;
      border: 1px solid rgba(255,100,100,0.6);
      animation: rtAlarmText 0.3s steps(1) infinite;
    }
    @keyframes rtCriticalPulse {
      0%, 100% { border-color: rgba(255,30,30,0.95); box-shadow: inset 0 0 60px rgba(180,0,0,0.22); }
      50%       { border-color: rgba(255,30,30,0.1); box-shadow: none; }
    }
  `;
  document.head.appendChild(style);
}

// ─── Screen host ──────────────────────────────────────────────────────────────

function getScreenHost() {
  return (
    document.querySelector('#monitor pre') ||
    document.querySelector('#screen-container') ||
    document.querySelector('#monitor') ||
    document.body
  );
}

function ensureRelative(host) {
  if (host === document.body) return () => {};
  const entry = _relativeHosts.get(host);
  if (entry) {
    entry.count += 1;
    return () => {
      entry.count -= 1;
      if (entry.count <= 0) {
        if (entry.changed) host.style.position = entry.previous;
        _relativeHosts.delete(host);
      }
    };
  }
  const previous = host.style.position;
  const changed = getComputedStyle(host).position === 'static';
  if (changed) {
    host.style.position = 'relative';
  }
  _relativeHosts.set(host, { count: 1, previous, changed });
  return () => {
    const current = _relativeHosts.get(host);
    if (!current) return;
    current.count -= 1;
    if (current.count <= 0) {
      if (current.changed) host.style.position = current.previous;
      _relativeHosts.delete(host);
    }
  };
}

// ─── Effect handlers ──────────────────────────────────────────────────────────

function createOverlay(effectClass, host) {
  const el = document.createElement('div');
  el.className = `rt-effect-overlay rt-effect--${effectClass}`;
  host.appendChild(el);
  return el;
}

function registerEffect(id, el, cleanupFn) {
  const existing = _activeEffects.get(id);
  if (existing) existing.cleanup();
  _activeEffects.set(id, {
    cleanup: () => {
      try { cleanupFn?.(); } catch (_) {}
      el?.remove();
      _activeEffects.delete(id);
    },
  });
}

function autoRemove(id, ms) {
  setTimeout(() => {
    _activeEffects.get(id)?.cleanup();
  }, ms);
}

// ── Alarm ─────────────────────────────────────────────────────────────────────
function triggerAlarm({ duration = 5000, message = 'ALERTA DE SEGURIDAD' } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('alarm', host);
  const alarmMessage = document.createElement('div');
  alarmMessage.className = 'rt-alarm-message';
  alarmMessage.textContent = `⚠  ${String(message || 'ALERTA DE SEGURIDAD').trim().slice(0, 96)}  ⚠`;
  overlay.appendChild(alarmMessage);
  const stopAudio = playSiren(duration);
  registerEffect('alarm', overlay, () => { stopAudio(); restorePos(); });
  if (duration > 0) autoRemove('alarm', duration);
}

// ── Hack / Glitch ─────────────────────────────────────────────────────────────
function triggerHack({ duration = 8000, intensity = 'medium' } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('hack', host);

  const canvas = document.createElement('canvas');
  overlay.appendChild(canvas);

  let rafId = null;
  let stopped = false;
  const intensityMap = { light: 0.35, medium: 0.65, heavy: 1.0 };
  const intensityFactor = intensityMap[intensity] || 0.65;

  function resize() {
    canvas.width = overlay.clientWidth || 400;
    canvas.height = overlay.clientHeight || 300;
  }
  resize();
  window.addEventListener('resize', resize);

  const stopGlitchAudio = playGlitchNoise(300);
  const glitchAudioInterval = setInterval(() => {
    if (stopped) { clearInterval(glitchAudioInterval); return; }
    if (Math.random() < 0.4) playGlitchNoise(150);
  }, 600);

  function drawGlitch() {
    if (stopped) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (Math.random() < 0.3 * intensityFactor) {
      ctx.fillStyle = 'rgba(0,0,0,0.85)';
      ctx.fillRect(0, 0, w, h);
    }

    const sliceCount = Math.floor(4 + Math.random() * 8 * intensityFactor);
    for (let i = 0; i < sliceCount; i++) {
      const y = Math.random() * h;
      const sliceH = 1 + Math.random() * 12;
      const shift = (Math.random() - 0.5) * 60 * intensityFactor;
      const alpha = 0.08 + Math.random() * 0.25;
      const hue = Math.random() < 0.5 ? `rgba(0,255,160,${alpha})` : `rgba(255,40,40,${alpha})`;
      ctx.fillStyle = hue;
      ctx.fillRect(shift, y, w, sliceH);
    }

    // Chromatic aberration stripe
    if (Math.random() < 0.45 * intensityFactor) {
      const y = Math.random() * h;
      const stripeH = 2 + Math.random() * 6;
      ctx.fillStyle = `rgba(255,0,60,0.12)`;
      ctx.fillRect(4, y, w, stripeH);
      ctx.fillStyle = `rgba(0,200,255,0.12)`;
      ctx.fillRect(-4, y + 1, w, stripeH);
    }

    // Occasional full-brightness flash
    if (Math.random() < 0.04 * intensityFactor) {
      ctx.fillStyle = `rgba(0,255,160,0.06)`;
      ctx.fillRect(0, 0, w, h);
    }

    rafId = requestAnimationFrame(drawGlitch);
  }

  drawGlitch();

  registerEffect('hack', overlay, () => {
    stopped = true;
    cancelAnimationFrame(rafId);
    clearInterval(glitchAudioInterval);
    window.removeEventListener('resize', resize);
    stopGlitchAudio();
    restorePos();
  });

  if (duration > 0) autoRemove('hack', duration);
}

// ── Fog ───────────────────────────────────────────────────────────────────────
function triggerFog({ duration = 12000 } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('fog', host);
  registerEffect('fog', overlay, restorePos);
  if (duration > 0) autoRemove('fog', duration);
}

// ── Flicker ───────────────────────────────────────────────────────────────────
function triggerFlicker({ count = 3, duration = 0 } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('flicker', host);
  playFlickerSound();
  const shouldAutoRemove = Number(duration) > 0 || Number(count) > 0;
  const totalMs = Number(duration) > 0 ? Number(duration) : 600 + (count - 1) * 200;
  registerEffect('flicker', overlay, restorePos);
  if (shouldAutoRemove) autoRemove('flicker', totalMs);
}

// ── Critical ──────────────────────────────────────────────────────────────────
function triggerCritical({ duration = 6000 } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('critical', host);
  const stopAudio = playSiren(duration);
  playAlertPing();
  setTimeout(playAlertPing, 300);
  registerEffect('critical', overlay, () => { stopAudio(); restorePos(); });
  if (duration > 0) autoRemove('critical', duration);
}

// ── Media ─────────────────────────────────────────────────────────────────────
function triggerMedia({ url, mediaType = 'image', caption = '', loop = false, duration = 0 } = {}) {
  if (!url) return;
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('media', host);

  const safeUrl = String(url).replace(/['"]/g, '');
  const mediaEl = mediaType === 'video'
    ? Object.assign(document.createElement('video'), { src: safeUrl, autoplay: true, loop: Boolean(loop), controls: true })
    : Object.assign(document.createElement('img'), { src: safeUrl, alt: caption || 'GCPD MEDIA' });
  if (mediaType === 'video') {
    mediaEl.muted = false;
    mediaEl.playsInline = true;
    mediaEl.preload = 'auto';
  }
  overlay.appendChild(mediaEl);

  if (caption) {
    const cap = document.createElement('div');
    cap.className = 'rt-media-caption';
    cap.textContent = caption;
    overlay.appendChild(cap);
  }

  registerEffect('media', overlay, () => {
    restorePos();
  });
  if (Number(duration) > 0) autoRemove('media', Number(duration));
}

// ── Clear all ─────────────────────────────────────────────────────────────────
function clearAllEffects() {
  for (const [, entry] of _activeEffects) {
    try { entry.cleanup(); } catch (_) {}
  }
  _activeEffects.clear();
  // Remove any stray overlay nodes
  document.querySelectorAll('.rt-effect-overlay').forEach((el) => el.remove());
}

// ─── Dispatch incoming payload ────────────────────────────────────────────────

function applyEffect(payload) {
  const { effect, options = {} } = payload;
  let applied = true;
  switch (effect) {
    case 'alarm':    triggerAlarm(options); break;
    case 'hack':     triggerHack(options); break;
    case 'fog':      triggerFog(options); break;
    case 'flicker':  triggerFlicker(options); break;
    case 'critical': triggerCritical(options); break;
    case 'media':    triggerMedia(options); break;
    default: applied = false; break;
  }
  if (applied) {
    sendAgentEffectState({ state: 'running', effect });
  }
}

function sendAgentEffectState(payload) {
  if (!_ws || _ws.readyState !== WebSocket.OPEN) return;
  try {
    _ws.send(JSON.stringify({ type: 'effects:agent-state', ...payload }));
  } catch (_) {}
}

// ─── WebSocket connection ─────────────────────────────────────────────────────

function getWsUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}${EFFECTS_WS_PATH}`;
}

function connect() {
  if (_ws && (_ws.readyState === WebSocket.OPEN || _ws.readyState === WebSocket.CONNECTING)) return;
  clearTimeout(_reconnectTimer);
  try {
    _ws = new WebSocket(getWsUrl());
    _ws.onmessage = (event) => {
      let payload;
      try { payload = JSON.parse(String(event.data || '{}')); } catch (_) { return; }
      if (payload.type === 'effects:trigger') applyEffect(payload);
      if (payload.type === 'effects:clear') {
        clearAllEffects();
        sendAgentEffectState({ state: 'cleared', effect: 'clear' });
      }
    };
    _ws.onclose = () => {
      _ws = null;
      _reconnectTimer = setTimeout(connect, 5000);
    };
    _ws.onerror = () => {
      _ws?.close();
    };
  } catch (_) {
    _reconnectTimer = setTimeout(connect, 8000);
  }
}

function disconnect() {
  clearTimeout(_reconnectTimer);
  _reconnectTimer = null;
  if (_ws) {
    try {
      _ws.onclose = null;
      _ws.onerror = null;
      _ws.onmessage = null;
      _ws.close(1000, 'route-change');
    } catch (_) {}
    _ws = null;
  }
  clearAllEffects();
}

function syncRuntimeForLocation() {
  if (isAgentViewPath(window.location.pathname || '/')) {
    injectStyles();
    connect();
    return;
  }
  disconnect();
}

function installLocationWatcher() {
  if (_locationWatcherInstalled) return;
  _locationWatcherInstalled = true;

  if (!_historyPatched) {
    const { pushState, replaceState } = window.history;
    window.history.pushState = function (...args) {
      const result = pushState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };
    window.history.replaceState = function (...args) {
      const result = replaceState.apply(this, args);
      window.dispatchEvent(new Event('locationchange'));
      return result;
    };
    window.addEventListener('popstate', () => {
      window.dispatchEvent(new Event('locationchange'));
    });
    _historyPatched = true;
  }

  window.addEventListener('locationchange', syncRuntimeForLocation);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startEffectsRuntime() {
  installLocationWatcher();
  syncRuntimeForLocation();
}
