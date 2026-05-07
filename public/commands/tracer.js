import { type } from "/utils/io.js";

const OVERLAY_ID = "terminal-tracer-overlay";
const STYLE_ID = "terminal-tracer-style";
const MAP_IMAGE = "/mapa.png";
const FLAVOR_INTERVAL_MS = 1_900;
const ARMING_DELAY_MS = 280;

const FLAVOR_SYSTEMS = [
  "torres GSM",
  "backhaul LTE",
  "switch SS7",
  "nodos VoIP",
  "malla CCTV",
  "anillos de fibra",
  "routers perimetrales",
  "control de trafico urbano",
  "telemetria de alarmas",
  "sensores de acceso",
];

const FLAVOR_ACTIONS = [
  "inyectando baliza fantasma",
  "correlando handovers",
  "spoofing de IMSI",
  "rompiendo ACL heredadas",
  "reconstruyendo ruta de senal",
  "ajustando triangulacion pasiva",
  "sincronizando relojes NTP oscuros",
  "escaneando celdas adyacentes",
  "alineando firmas de roaming",
  "pivotando por camaras de cruce",
];

const FLAVOR_PATTERNS = [
  (system, action) => `[SIGINT] ${action} sobre ${system}.`,
  (system, action) => `[TRACE] ${system}: ${action}.`,
  (system, action) => `[OPS] BATCOM confirma ${action} (${system}).`,
  (system, action) => `[NET] ${action}; latencia estable en ${system}.`,
  (system, action) => `[FORENSICS] ${system} responde; ${action}.`,
];

function normalizeNumber(value = "") {
  return String(value || "").replace(/[^\d]/g, "");
}

function makeFlavorGenerator() {
  let cursor = 0;
  return () => {
    const pattern = FLAVOR_PATTERNS[cursor % FLAVOR_PATTERNS.length];
    const system = FLAVOR_SYSTEMS[cursor % FLAVOR_SYSTEMS.length];
    const action = FLAVOR_ACTIONS[(cursor * 3 + 2) % FLAVOR_ACTIONS.length];
    cursor += 1;
    return pattern(system, action);
  };
}

function flavorStamp() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");
  const ss = String(now.getSeconds()).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

function wait(ms = 0) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getStageTelemetry(stage = 0) {
  if (stage >= 3) {
    return {
      level: 3,
      lock: "EXACTO",
      area: "POSICION FIJADA",
      message: "POSICION EXACTA FIJADA",
    };
  }
  if (stage === 2) {
    return {
      level: 2,
      lock: "AVANZADO",
      area: "RADIO TACTICO",
      message: "TRIANGULACION AVANZADA",
    };
  }
  if (stage === 1) {
    return {
      level: 1,
      lock: "PARCIAL",
      area: "SECTOR URBANO",
      message: "LOCK PARCIAL",
    };
  }
  return {
    level: 0,
    lock: "SIN FIJACION",
    area: "NO RESUELTA",
    message: "SIN FIJACION",
  };
}

function formatElapsedLine(elapsedMs = 0) {
  return `${(Math.max(0, Number(elapsedMs) || 0) / 1000).toFixed(1)}s`;
}

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${OVERLAY_ID} {
      position: fixed;
      inset: 0;
      z-index: 1200;
      background: rgba(0, 6, 10, 0.86);
      display: grid;
      place-items: center;
      font-family: "WOPR", "Share Tech Mono", monospace;
      color: #baffde;
    }
    #${OVERLAY_ID} .tracer-shell {
      width: min(92vw, 1080px);
      border: 1px solid rgba(80, 220, 180, 0.45);
      background: rgba(1, 9, 12, 0.92);
      box-shadow: 0 0 0 1px rgba(45, 145, 120, 0.25) inset;
      padding: 14px;
    }
    #${OVERLAY_ID} .tracer-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      font-size: 0.75rem;
    }
    #${OVERLAY_ID} .tracer-meta {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-bottom: 10px;
    }
    #${OVERLAY_ID} .tracer-metric {
      border: 1px solid rgba(95, 220, 176, 0.32);
      background: rgba(2, 13, 17, 0.76);
      padding: 6px 8px;
      min-height: 50px;
    }
    #${OVERLAY_ID} .tracer-metric-label {
      font-size: 0.58rem;
      letter-spacing: 0.09em;
      text-transform: uppercase;
      color: rgba(170, 236, 212, 0.76);
    }
    #${OVERLAY_ID} .tracer-metric-value {
      margin-top: 4px;
      font-size: 0.85rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: #d8ffe9;
    }
    #${OVERLAY_ID} .tracer-resolution {
      margin-top: 10px;
      display: grid;
      gap: 6px;
    }
    #${OVERLAY_ID} .tracer-resolution-bar {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }
    #${OVERLAY_ID} .tracer-resolution-segment {
      height: 7px;
      border: 1px solid rgba(95, 220, 176, 0.28);
      background: rgba(4, 19, 24, 0.9);
      box-shadow: 0 0 0 1px rgba(17, 59, 48, 0.4) inset;
      transition: background 180ms ease, box-shadow 180ms ease, border-color 180ms ease;
    }
    #${OVERLAY_ID} .tracer-resolution-segment.is-active {
      border-color: rgba(132, 255, 206, 0.82);
      background: linear-gradient(90deg, rgba(44, 130, 108, 0.88), rgba(128, 255, 202, 0.92));
      box-shadow: 0 0 12px rgba(128, 255, 202, 0.42);
    }
    #${OVERLAY_ID} .tracer-resolution-caption {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      font-size: 0.6rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(174, 250, 211, 0.84);
    }
    #${OVERLAY_ID} .tracer-map {
      position: relative;
      width: 100%;
      aspect-ratio: 1 / 0.744;
      border: 1px solid rgba(80, 220, 180, 0.4);
      overflow: hidden;
      background: #050b0d;
    }
    #${OVERLAY_ID} .tracer-stage {
      position: absolute;
      inset: 0;
      transform-origin: var(--x, 50%) var(--y, 50%);
      transform: scale(var(--zoom, 1));
      transition: transform 640ms ease;
    }
    #${OVERLAY_ID} .tracer-map img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      object-position: center center;
      display: block;
      filter: saturate(0.8) contrast(1.1) brightness(0.84);
    }
    #${OVERLAY_ID} .tracer-mask {
      position: absolute;
      inset: 0;
      background: radial-gradient(circle var(--r, 0px) at var(--x, 50%) var(--y, 50%),
        rgba(0, 0, 0, 0.06) 0,
        rgba(0, 0, 0, 0.06) calc(var(--r, 0px) - 2px),
        rgba(0, 0, 0, 0.78) calc(var(--r, 0px) + 1px));
      pointer-events: none;
      transition: background 0.65s ease;
    }
    #${OVERLAY_ID} .tracer-ring {
      position: absolute;
      left: var(--x, 50%);
      top: var(--y, 50%);
      width: calc(var(--r, 0px) * 2);
      height: calc(var(--r, 0px) * 2);
      margin-left: calc(var(--r, 0px) * -1);
      margin-top: calc(var(--r, 0px) * -1);
      border-radius: 50%;
      border: 1px solid rgba(116, 255, 195, 0.85);
      box-shadow: 0 0 14px rgba(116, 255, 195, 0.3);
      pointer-events: none;
      transition: width 0.7s ease, height 0.7s ease, margin-left 0.7s ease, margin-top 0.7s ease;
    }
    #${OVERLAY_ID} .tracer-sweep {
      position: absolute;
      inset: 0;
      pointer-events: none;
      opacity: 0;
      transform: translateX(-112%);
      background: linear-gradient(
        90deg,
        rgba(115, 255, 194, 0) 0%,
        rgba(115, 255, 194, 0.18) 40%,
        rgba(115, 255, 194, 0.34) 52%,
        rgba(115, 255, 194, 0.16) 64%,
        rgba(115, 255, 194, 0) 100%
      );
    }
    #${OVERLAY_ID} .tracer-sweep.is-active {
      animation: tracerSweep 620ms ease-out;
    }
    @keyframes tracerSweep {
      0% { opacity: 0; transform: translateX(-112%); }
      12% { opacity: 0.8; }
      100% { opacity: 0; transform: translateX(112%); }
    }
    #${OVERLAY_ID} .tracer-pin {
      position: absolute;
      left: var(--x, 50%);
      top: var(--y, 50%);
      width: 10px;
      height: 10px;
      margin-left: -5px;
      margin-top: -5px;
      border-radius: 50%;
      background: #8affc9;
      box-shadow: 0 0 0 3px rgba(138, 255, 201, 0.3), 0 0 20px rgba(138, 255, 201, 0.8);
      opacity: 0;
      transition: opacity 0.24s ease;
      pointer-events: none;
    }
    #${OVERLAY_ID} .tracer-pin.is-visible {
      opacity: 1;
    }
    #${OVERLAY_ID} .tracer-hotspot-label {
      position: absolute;
      left: var(--label-left, var(--x, 50%));
      top: var(--label-top, var(--y, 50%));
      transform: translate(-50%, 0) scale(0.8);
      transform-origin: center center;
      background: linear-gradient(
        180deg,
        rgba(10, 40, 32, 0.92) 0%,
        rgba(4, 24, 18, 0.9) 100%
      );
      border: 1px solid rgba(128, 255, 202, 0.82);
      box-shadow:
        0 0 0 1px rgba(128, 255, 202, 0.25) inset,
        0 0 24px rgba(128, 255, 202, 0.38);
      color: #d8ffe9;
      text-shadow: 0 0 8px rgba(150, 255, 210, 0.5);
      font-size: 0.96rem;
      font-weight: 700;
      letter-spacing: 0.13em;
      text-transform: uppercase;
      padding: 6px 12px;
      white-space: nowrap;
      max-width: calc(100% - 16px);
      overflow: hidden;
      text-overflow: ellipsis;
      opacity: 0;
      pointer-events: none;
      transition:
        opacity 280ms ease,
        transform 380ms cubic-bezier(0.18, 0.8, 0.25, 1.2);
    }
    #${OVERLAY_ID} .tracer-hotspot-label::before,
    #${OVERLAY_ID} .tracer-hotspot-label::after {
      content: "";
      position: absolute;
      inset: 0;
      border: 1px solid rgba(128, 255, 202, 0.45);
      mix-blend-mode: screen;
      opacity: 0;
      pointer-events: none;
    }
    #${OVERLAY_ID} .tracer-hotspot-label::before {
      transform: translate(1px, -1px);
      border-color: rgba(120, 232, 255, 0.55);
    }
    #${OVERLAY_ID} .tracer-hotspot-label::after {
      transform: translate(-1px, 1px);
      border-color: rgba(190, 255, 170, 0.45);
    }
    #${OVERLAY_ID} .tracer-hotspot-label.is-visible {
      opacity: 1;
      transform: translate(-50%, 0) scale(1);
      animation: tracerLabelPulse 1200ms ease-in-out infinite;
    }
    #${OVERLAY_ID} .tracer-hotspot-label.is-visible::before {
      opacity: 0.42;
      animation: tracerLabelGhostA 900ms ease-in-out infinite;
    }
    #${OVERLAY_ID} .tracer-hotspot-label.is-visible::after {
      opacity: 0.36;
      animation: tracerLabelGhostB 740ms ease-in-out infinite;
    }
    @keyframes tracerLabelPulse {
      0% { box-shadow: 0 0 0 1px rgba(128, 255, 202, 0.25) inset, 0 0 16px rgba(128, 255, 202, 0.24); }
      50% { box-shadow: 0 0 0 1px rgba(128, 255, 202, 0.48) inset, 0 0 34px rgba(128, 255, 202, 0.48); }
      100% { box-shadow: 0 0 0 1px rgba(128, 255, 202, 0.25) inset, 0 0 16px rgba(128, 255, 202, 0.24); }
    }
    @keyframes tracerLabelGhostA {
      0%, 100% { transform: translate(1px, -1px); opacity: 0.32; }
      50% { transform: translate(2px, -2px); opacity: 0.55; }
    }
    @keyframes tracerLabelGhostB {
      0%, 100% { transform: translate(-1px, 1px); opacity: 0.28; }
      50% { transform: translate(-2px, 2px); opacity: 0.48; }
    }
    #${OVERLAY_ID} .tracer-popup {
      margin-top: 10px;
      padding: 7px 10px;
      border: 1px dashed rgba(130, 255, 201, 0.52);
      color: #aefad3;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      font-size: 0.72rem;
      min-height: 54px;
      display: grid;
      gap: 4px;
    }
    #${OVERLAY_ID} .tracer-hint {
      margin-top: 8px;
      color: rgba(160, 220, 200, 0.9);
      font-size: 0.62rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }
    #${OVERLAY_ID} .tracer-actions {
      margin-top: 10px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    #${OVERLAY_ID} .tracer-actions button {
      border: 1px solid rgba(130, 255, 201, 0.58);
      background: rgba(10, 34, 28, 0.94);
      color: #d7ffe8;
      font-family: inherit;
      font-size: 0.66rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 8px 10px;
      cursor: pointer;
    }
    #${OVERLAY_ID} .tracer-log {
      margin-top: 10px;
      border: 1px solid rgba(95, 220, 176, 0.36);
      background: rgba(2, 13, 17, 0.76);
      padding: 6px 8px;
      height: 5.2rem;
      overflow-y: auto;
      font-size: 0.65rem;
      line-height: 1.3rem;
      letter-spacing: 0.05em;
      color: rgba(184, 255, 222, 0.96);
      text-transform: uppercase;
      scrollbar-width: thin;
      scrollbar-color: rgba(116, 255, 195, 0.55) transparent;
    }
    #${OVERLAY_ID} .tracer-log::-webkit-scrollbar {
      width: 7px;
    }
    #${OVERLAY_ID} .tracer-log::-webkit-scrollbar-thumb {
      background: rgba(116, 255, 195, 0.42);
      border-radius: 8px;
    }
    #${OVERLAY_ID} .tracer-log-line {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.head.appendChild(style);
}

function getSocketUrl(role = "agent") {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  const host = window.location.host;
  return `${protocol}://${host}/ws/tracer?role=${encodeURIComponent(role)}`;
}

function ensureOverlay() {
  const existing = document.getElementById(OVERLAY_ID);
  if (existing) return existing;
  const root = document.createElement("div");
  root.id = OVERLAY_ID;
  root.innerHTML = `
    <div class="tracer-shell">
      <div class="tracer-head">
        <div class="tracer-status">TRACER // BOOTSTRAP</div>
        <div class="tracer-clock">T+00.0s</div>
      </div>
      <div class="tracer-meta">
        <div class="tracer-metric">
          <div class="tracer-metric-label">Lock</div>
          <div class="tracer-metric-value" data-tracer-lock>SIN FIJACION</div>
        </div>
        <div class="tracer-metric">
          <div class="tracer-metric-label">Area</div>
          <div class="tracer-metric-value" data-tracer-area>NO RESUELTA</div>
        </div>
        <div class="tracer-metric">
          <div class="tracer-metric-label">Canal</div>
          <div class="tracer-metric-value" data-tracer-channel>SIN PORTADORA</div>
        </div>
      </div>
      <div class="tracer-map">
        <div class="tracer-stage">
          <img src="${MAP_IMAGE}" alt="Mapa Gotham tracer" />
          <div class="tracer-mask"></div>
          <div class="tracer-ring"></div>
          <div class="tracer-sweep"></div>
          <div class="tracer-pin"></div>
          <div class="tracer-hotspot-label"></div>
        </div>
      </div>
      <div class="tracer-resolution">
        <div class="tracer-resolution-bar">
          <div class="tracer-resolution-segment" data-stage-segment="0"></div>
          <div class="tracer-resolution-segment" data-stage-segment="1"></div>
          <div class="tracer-resolution-segment" data-stage-segment="2"></div>
          <div class="tracer-resolution-segment" data-stage-segment="3"></div>
        </div>
        <div class="tracer-resolution-caption">
          <span data-tracer-resolution>LOCK: SIN FIJACION</span>
          <span data-tracer-area-caption>AREA: NO RESUELTA</span>
        </div>
      </div>
      <div class="tracer-popup">INICIANDO MODULO DE TRAZA...</div>
      <div class="tracer-hint">ESC para abortar la llamada</div>
      <div class="tracer-log" aria-live="polite"></div>
    </div>
  `;
  document.body.appendChild(root);
  return root;
}

function computeGeometry(mapEl, hotspot = { x: 50, y: 50 }) {
  const rect = mapEl.getBoundingClientRect();
  const xPct = Number(hotspot.x) || 50;
  const yPct = Number(hotspot.y) || 50;
  const cx = (rect.width * xPct) / 100;
  const cy = (rect.height * yPct) / 100;
  const corners = [
    { x: 0, y: 0 },
    { x: rect.width, y: 0 },
    { x: 0, y: rect.height },
    { x: rect.width, y: rect.height },
  ];
  const maxRadius = Math.max(
    ...corners.map((corner) => Math.hypot(corner.x - cx, corner.y - cy))
  );
  return { cx, cy, maxRadius };
}

function radiusForStage(stage, maxRadius) {
  if (stage >= 3) return 10;
  if (stage === 2) return maxRadius / 3;
  if (stage === 1) return (maxRadius * 2) / 3;
  return maxRadius;
}

function playSound(audio, { restart = true } = {}) {
  if (!audio) return;
  try {
    if (restart) audio.currentTime = 0;
    const maybePromise = audio.play();
    if (maybePromise && typeof maybePromise.catch === "function") {
      maybePromise.catch(() => {});
    }
  } catch {
    // noop
  }
}

function stopSound(audio) {
  if (!audio) return;
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // noop
  }
}

async function startTracer({ number = "" } = {}) {
  const normalized = normalizeNumber(number);
  if (!normalized) {
    await type("TRACER: usa TRACER #TELEFONO.");
    return;
  }

  ensureStyles();
  const overlay = ensureOverlay();
  const mapEl = overlay.querySelector(".tracer-map");
  const statusEl = overlay.querySelector(".tracer-status");
  const clockEl = overlay.querySelector(".tracer-clock");
  const popupEl = overlay.querySelector(".tracer-popup");
  const hintEl = overlay.querySelector(".tracer-hint");
  const pinEl = overlay.querySelector(".tracer-pin");
  const sweepEl = overlay.querySelector(".tracer-sweep");
  const logEl = overlay.querySelector(".tracer-log");
  const hotspotLabelEl = overlay.querySelector(".tracer-hotspot-label");
  const lockEl = overlay.querySelector("[data-tracer-lock]");
  const areaEl = overlay.querySelector("[data-tracer-area]");
  const channelEl = overlay.querySelector("[data-tracer-channel]");
  const resolutionEl = overlay.querySelector("[data-tracer-resolution]");
  const areaCaptionEl = overlay.querySelector("[data-tracer-area-caption]");
  const stageSegments = Array.from(
    overlay.querySelectorAll("[data-stage-segment]")
  );

  let socket = null;
  let callId = "";
  let resolved = false;
  let tracing = false;
  let frozen = false;
  let answeredAt = 0;
  let hotspot = null;
  let traceTick = null;
  let flavorTimer = null;
  let geometry = null;
  let lastStage = 0;
  let resolveSession = null;
  const callTone = new Audio("/assets/sounds/call.mp3");
  callTone.loop = true;
  callTone.volume = 0.9;
  const pickupTone = new Audio("/assets/sounds/pickup.mp3");
  pickupTone.volume = 0.9;
  const hangupTone = new Audio("/assets/sounds/hangup.mp3");
  hangupTone.volume = 0.9;

  const nextFlavor = makeFlavorGenerator();
  const hotspotRevealLabel = () =>
    String(hotspot?.label || hotspot?.id || "SIN IDENTIFICADOR")
      .toUpperCase()
      .trim();

  const appendFlavor = (line = "") => {
    if (!logEl) return;
    const row = document.createElement("div");
    row.className = "tracer-log-line";
    row.textContent = `[${flavorStamp()}] ${String(line || "").toUpperCase()}`;
    logEl.appendChild(row);
    while (logEl.childNodes.length > 120) {
      logEl.removeChild(logEl.firstChild);
    }
    logEl.scrollTop = logEl.scrollHeight;
  };

  const startFlavorFeed = () => {
    if (flavorTimer) return;
    appendFlavor("canal de voz establecido.");
    flavorTimer = setInterval(() => {
      appendFlavor(nextFlavor());
    }, FLAVOR_INTERVAL_MS);
  };

  const stopFlavorFeed = (finalLine = "") => {
    if (flavorTimer) {
      clearInterval(flavorTimer);
      flavorTimer = null;
    }
    if (finalLine) appendFlavor(finalLine);
  };

  const runSweep = () => {
    if (!sweepEl) return;
    sweepEl.classList.remove("is-active");
    void sweepEl.offsetWidth;
    sweepEl.classList.add("is-active");
  };

  const runDoubleSweep = () => {
    runSweep();
    setTimeout(() => runSweep(), 220);
  };

  const cleanup = () => {
    if (traceTick) {
      clearInterval(traceTick);
      traceTick = null;
    }
    if (flavorTimer) {
      clearInterval(flavorTimer);
      flavorTimer = null;
    }
    window.removeEventListener("keydown", onKeyDown, true);
    window.removeEventListener("resize", onResize);
    if (socket && socket.readyState === 1) {
      socket.close(1000, "done");
    }
    stopSound(callTone);
    if (overlay?.parentNode) overlay.remove();
  };

  const settle = async () => {
    if (resolved) return;
    resolved = true;
    cleanup();
    if (resolveSession) resolveSession();
  };

  const placeHotspotLabel = () => {
    if (!hotspotLabelEl || !geometry) return;
    const mapWidth = mapEl.clientWidth;
    const mapHeight = mapEl.clientHeight;
    if (!mapWidth || !mapHeight) return;

    const margin = 8;
    const gap = 16;
    const labelWidth = Math.min(
      Math.max(hotspotLabelEl.offsetWidth || hotspotLabelEl.scrollWidth || 180, 120),
      Math.max(120, mapWidth - margin * 2)
    );
    const labelHeight = Math.max(hotspotLabelEl.offsetHeight || 34, 28);

    const leftMin = margin + labelWidth / 2;
    const leftMax = mapWidth - margin - labelWidth / 2;
    const labelLeft = Math.min(Math.max(geometry.cx, leftMin), leftMax);

    const topAbove = geometry.cy - labelHeight - gap;
    const topBelow = geometry.cy + gap;
    const canPlaceAbove = topAbove >= margin;
    const canPlaceBelow = topBelow + labelHeight <= mapHeight - margin;

    let labelTop = canPlaceAbove ? topAbove : topBelow;
    if (!canPlaceAbove && !canPlaceBelow) {
      labelTop = Math.min(
        Math.max(geometry.cy - labelHeight / 2, margin),
        mapHeight - margin - labelHeight
      );
    } else {
      labelTop = Math.min(Math.max(labelTop, margin), mapHeight - margin - labelHeight);
    }

    mapEl.style.setProperty("--label-left", `${labelLeft}px`);
    mapEl.style.setProperty("--label-top", `${labelTop}px`);
  };

  const setPopupLines = (...lines) => {
    popupEl.innerHTML = lines
      .filter(Boolean)
      .map((line) => `<div>${String(line).toUpperCase()}</div>`)
      .join("");
  };

  const updateResolutionTelemetry = (stage) => {
    const telemetry = getStageTelemetry(stage);
    if (lockEl) lockEl.textContent = telemetry.lock;
    if (areaEl) areaEl.textContent = telemetry.area;
    if (resolutionEl) resolutionEl.textContent = `LOCK: ${telemetry.lock}`;
    if (areaCaptionEl) areaCaptionEl.textContent = `AREA: ${telemetry.area}`;
    stageSegments.forEach((segment, index) => {
      const level = Number(segment.dataset.stageSegment || 0);
      segment.classList.toggle("is-active", level <= telemetry.level);
      if (telemetry.level === 0 && level > 0) {
        segment.classList.remove("is-active");
      }
    });
  };

  const applyStage = (stage) => {
    if (!geometry) return;
    const radius = radiusForStage(stage, geometry.maxRadius);
    const zoom = stage >= 3 ? 1.14 : stage === 2 ? 1.09 : stage === 1 ? 1.045 : 1;
    mapEl.style.setProperty("--x", `${geometry.cx}px`);
    mapEl.style.setProperty("--y", `${geometry.cy}px`);
    mapEl.style.setProperty("--r", `${radius}px`);
    mapEl.style.setProperty("--zoom", String(zoom));
    if (hotspotLabelEl) {
      if (stage >= 3) {
        hotspotLabelEl.textContent = hotspotRevealLabel();
        placeHotspotLabel();
        hotspotLabelEl.classList.add("is-visible");
      } else {
        hotspotLabelEl.classList.remove("is-visible");
      }
    }
    if (stage >= 3) {
      pinEl.classList.add("is-visible");
    } else {
      pinEl.classList.remove("is-visible");
    }
    updateResolutionTelemetry(stage);
  };

  const onResize = () => {
    if (!hotspot) return;
    geometry = computeGeometry(mapEl, hotspot);
    if (!tracing && !frozen) return;
    const elapsed = Math.max(0, Date.now() - answeredAt);
    const stage = lastStage;
    applyStage(stage);
  };

  const onKeyDown = async (event) => {
    if (event.key !== "Escape" && event.key !== "Enter") return;
    if (!frozen && event.key === "Enter") return;
    event.preventDefault();
    if (socket && socket.readyState === 1 && callId && !frozen) {
      socket.send(JSON.stringify({ type: "tracer:agent_hangup", callId }));
    }
    await settle();
  };

  window.addEventListener("keydown", onKeyDown, true);
  window.addEventListener("resize", onResize);
  updateResolutionTelemetry(0);
  if (channelEl) channelEl.textContent = "ARMANDO ENLACE";
  setPopupLines(
    "BATCOM RELAY: ONLINE",
    "SS7 GHOST ROUTE: OPEN",
    "VOICE CHANNEL: ARMING",
    "CALL TRACE: READY"
  );
  appendFlavor("batcom relay online.");
  appendFlavor("ss7 ghost route open.");
  await wait(ARMING_DELAY_MS);
  appendFlavor("voice channel arming.");
  await wait(ARMING_DELAY_MS);
  appendFlavor("call trace ready.");
  await wait(ARMING_DELAY_MS);
  runSweep();
  statusEl.textContent = "TRACER // ESPERANDO RESPUESTA";
  if (channelEl) channelEl.textContent = "CANAL PENDIENTE";
  setPopupLines(
    "TRACER // ESPERANDO RESPUESTA",
    "CANAL DE VOZ PENDIENTE",
    "SIN PORTADORA ACTIVA"
  );
  hintEl.textContent = "ESC para cancelar intento";

  await type([
    "",
    `TRACER ${number}: iniciando traza al #${normalized}...`,
    "",
  ]);
  playSound(callTone, { restart: true });

  await new Promise((resolve) => {
    resolveSession = resolve;

    const url = getSocketUrl("agent");
    socket = new WebSocket(url);

    socket.addEventListener("open", () => {
      socket.send(
        JSON.stringify({
          type: "tracer:start",
          number: normalized,
        })
      );
    });

    socket.addEventListener("message", async (event) => {
      let payload;
      try {
        payload = JSON.parse(String(event.data || "{}"));
      } catch {
        return;
      }

      if (payload.type === "tracer:ringing") {
        callId = payload.callId || "";
        statusEl.textContent = "TRACER // ESPERANDO RESPUESTA";
        if (channelEl) channelEl.textContent = "CANAL PENDIENTE";
        setPopupLines(
          "TRACER // ESPERANDO RESPUESTA",
          "CANAL DE VOZ PENDIENTE",
          "SIN PORTADORA ACTIVA"
        );
        hintEl.textContent = "ESC para cancelar intento";
        appendFlavor("esperando respuesta del objetivo.");
        return;
      }

      if (payload.type === "tracer:answered") {
        callId = payload.callId || callId;
        hotspot = payload.hotspot || { x: 50, y: 50 };
        answeredAt = Number(payload.answeredAt) || Date.now();
        geometry = computeGeometry(mapEl, hotspot);
        tracing = true;
        frozen = false;
        lastStage = 1;

        statusEl.textContent = "TRACER // LLAMADA ACTIVA";
        if (channelEl) channelEl.textContent = "PORTADORA ABIERTA";
        setPopupLines(
          "TRACER // LLAMADA ACTIVA",
          "PORTADORA ABIERTA",
          "CANAL DE TRAZA ACTIVO",
          "MANTENER CONVERSACION"
        );
        hintEl.textContent = "ESC para cancelar intento";
        stopSound(callTone);
        playSound(pickupTone, { restart: true });

        runSweep();
        applyStage(1);
        startFlavorFeed();
        appendFlavor("lock parcial alcanzado.");

        if (traceTick) clearInterval(traceTick);
        traceTick = setInterval(() => {
          const elapsed = Math.max(0, Date.now() - answeredAt);
          clockEl.textContent = `T+${(elapsed / 1000).toFixed(1)}s`;
        }, 120);
        applyStage(1);
        return;
      }

      if (payload.type === "tracer:stage") {
        lastStage = Number(payload.stage) || 0;
        applyStage(lastStage);
        if (lastStage === 1) {
          runSweep();
          appendFlavor("lock parcial alcanzado.");
          setPopupLines(
            "LOCK PARCIAL",
            "SECTOR URBANO RESUELTO",
            "RADIO DE BUSQUEDA REDUCIDO"
          );
        } else if (lastStage === 2) {
          runDoubleSweep();
          appendFlavor("triangulacion avanzada.");
          setPopupLines(
            "TRIANGULACION AVANZADA",
            "LOCK AVANZADO",
            "RADIO TACTICO REDUCIDO"
          );
        } else if (lastStage >= 3) {
          runDoubleSweep();
          appendFlavor("posicion exacta fijada.");
          setPopupLines(
            "POSICION EXACTA FIJADA",
            `HOTSPOT: ${hotspotRevealLabel()}`,
            "CACHE LOCAL ACTUALIZADA"
          );
        }
        return;
      }

      if (payload.type === "tracer:auto_hangup") {
        const message = String(payload.message || "linea no atendida").toUpperCase();
        stopSound(callTone);
        statusEl.textContent = "TRACER // LINEA NO ESTABLECIDA";
        if (channelEl) channelEl.textContent = "CANAL CERRADO";
        setPopupLines(
          "LINEA NO ESTABLECIDA",
          "EL OBJETIVO NO RESPONDE",
          "CANAL DE VOZ CERRADO",
          "TRAZA NO INICIADA"
        );
        hintEl.textContent = "Volviendo a REMOTE>";
        stopFlavorFeed(`canal de voz cerrado // ${message}.`);
        setTimeout(async () => {
          await settle();
        }, 3000);
        return;
      }

      if (payload.type === "tracer:hangup") {
        stopSound(callTone);
        playSound(hangupTone, { restart: true });
        const elapsedMs = Number(payload.elapsedMs) || 0;
        const stage =
          Number.isFinite(Number(payload.stage)) && payload.stage !== null
            ? Number(payload.stage)
            : lastStage;
        lastStage = stage;

        if (traceTick) {
          clearInterval(traceTick);
          traceTick = null;
        }
        if (tracing && geometry) {
          applyStage(stage);
        }

        frozen = true;
        tracing = false;
        statusEl.textContent = "TRACER // LLAMADA FINALIZADA";
        if (channelEl) channelEl.textContent = "CANAL CERRADO";
        const elapsedText = formatElapsedLine(elapsedMs);
        if (stage >= 3) {
          setPopupLines(
            "TRACE RESULT",
            "NIVEL: 3 / POSICION EXACTA",
            `HOTSPOT: ${hotspotRevealLabel()}`,
            `TIEMPO DE LINEA: ${elapsedText}`,
            "ESTADO: FIJADO EN CACHE LOCAL"
          );
          appendFlavor("canal de voz cerrado.");
        } else {
          setPopupLines(
            "TRACE RESULT",
            `NIVEL: ${Math.max(0, stage)} / TRAZA INCOMPLETA`,
            "HOTSPOT EXACTO: NO RESUELTO",
            `TIEMPO DE LINEA: ${elapsedText}`,
            "ESTADO: ULTIMA AREA PRESERVADA"
          );
          appendFlavor("traza congelada.");
        }
        hintEl.textContent = "ENTER o ESC para volver a REMOTE>";
        stopFlavorFeed("canal de voz cerrado.");
        return;
      }

      if (payload.type === "tracer:error") {
        stopSound(callTone);
        statusEl.textContent = "TRACER // ERROR";
        if (channelEl) channelEl.textContent = "ENLACE FALLIDO";
        setPopupLines(
          "LINEA NO ESTABLECIDA",
          "CANAL DE VOZ CERRADO",
          "ANOMALIA DE ENLACE DETECTADA"
        );
        hintEl.textContent = "Volviendo a REMOTE>";
        stopFlavorFeed("anomalia de enlace detectada.");
        setTimeout(async () => {
          await settle();
        }, 1600);
      }
    });

    socket.addEventListener("close", async () => {
      if (resolved) return;
      if (!frozen) {
        await settle();
      }
    });

    socket.addEventListener("error", async () => {
      stopSound(callTone);
      statusEl.textContent = "TRACER // OFFLINE";
      if (channelEl) channelEl.textContent = "ENLACE FALLIDO";
      setPopupLines(
        "LINEA NO ESTABLECIDA",
        "CANAL DE VOZ CERRADO",
        "NO SE PUDO ESTABLECER ENLACE"
      );
      stopFlavorFeed("enlace de senal fuera de servicio.");
      setTimeout(async () => {
        await settle();
      }, 1200);
    });
  });
}

export { startTracer };
export default startTracer;
