import { type } from "/utils/io.js";

const OVERLAY_ID = "terminal-tracer-overlay";
const STYLE_ID = "terminal-tracer-style";
const MAP_IMAGE = "/mapa.png";
const STEP_MS = 15_000;
const EXACT_MS = 45_000;
const FLAVOR_INTERVAL_MS = 1_900;

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
      min-height: 34px;
    }
    #${OVERLAY_ID} .tracer-hint {
      margin-top: 8px;
      color: rgba(160, 220, 200, 0.9);
      font-size: 0.62rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
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
        <div class="tracer-status">TRACER // DIALING...</div>
        <div class="tracer-clock">T+00.0s</div>
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
      <div class="tracer-popup">INICIANDO TRAZADOR DE LLAMADAS...</div>
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

function stageFromElapsed(elapsedMs) {
  if (elapsedMs >= EXACT_MS) return 3;
  if (elapsedMs >= STEP_MS * 2) return 2;
  if (elapsedMs >= STEP_MS) return 1;
  return 0;
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
    appendFlavor("traza activada // interceptando handovers.");
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
  };

  const onResize = () => {
    if (!hotspot) return;
    geometry = computeGeometry(mapEl, hotspot);
    if (!tracing && !frozen) return;
    const elapsed = Math.max(0, Date.now() - answeredAt);
    const stage = tracing ? stageFromElapsed(elapsed) : lastStage;
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
  appendFlavor("sistema a la espera de iniciar traza.");
  popupEl.textContent = `INICIANDO TRAZA AL #${normalized}...`;

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
        statusEl.textContent = "TRACER // ESPERANDO OPERADOR";
        popupEl.textContent = "Llamada entrante enviada al DM...";
        hintEl.textContent = "Sistema a la espera de iniciar traza";
        return;
      }

      if (payload.type === "tracer:answered") {
        callId = payload.callId || callId;
        hotspot = payload.hotspot || { x: 50, y: 50 };
        answeredAt = Number(payload.answeredAt) || Date.now();
        geometry = computeGeometry(mapEl, hotspot);
        tracing = true;
        frozen = false;
        lastStage = 0;

        statusEl.textContent = "TRACER // MODO TRAZAR LLAMADA";
        popupEl.textContent = "Operador DM descolgo // iniciando triangulacion.";
        hintEl.textContent = "ESC para abortar llamada";
        stopSound(callTone);
        playSound(pickupTone, { restart: true });

        runSweep();
        applyStage(0);
        startFlavorFeed();

        if (traceTick) clearInterval(traceTick);
        traceTick = setInterval(() => {
          const elapsed = Math.max(0, Date.now() - answeredAt);
          const stage = stageFromElapsed(elapsed);
          if (stage !== lastStage) {
            lastStage = stage;
            runSweep();
            if (stage === 1) {
              appendFlavor("etapa 1 completada // radio tactico reducido.");
            } else if (stage === 2) {
              appendFlavor("etapa 2 completada // triangulacion avanzada.");
            } else if (stage >= 3) {
              appendFlavor("etapa final completada // posicion exacta fijada.");
            }
          }

          applyStage(stage);
          clockEl.textContent = `T+${(elapsed / 1000).toFixed(1)}s`;

          if (stage >= 3) {
            popupEl.textContent = `TRAZA RESUELTA // HOTSPOT EXACTO: ${hotspotRevealLabel()}`;
          } else if (stage === 2) {
            popupEl.textContent = "TRAZA AVANZADA // CIRCULO TACTICO REDUCIDO.";
          } else if (stage === 1) {
            popupEl.textContent = "TRAZA MEDIA // REFINANDO RADIO OBJETIVO.";
          }
        }, 120);
        return;
      }

      if (payload.type === "tracer:auto_hangup") {
        const message = String(payload.message || "linea no atendida").toUpperCase();
        stopSound(callTone);
        statusEl.textContent = "TRACER // AUTO-HANGUP";
        popupEl.textContent = message;
        hintEl.textContent = "Volviendo a REMOTE>";
        stopFlavorFeed(`traza finalizada // ${message}.`);
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
            : stageFromElapsed(elapsedMs);
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
        if (stage >= 3) {
          popupEl.textContent = `DM COLGO // TRAZA EXACTA: ${hotspotRevealLabel()}`;
        } else {
          popupEl.textContent = "DM COLGO // TRAZA CONGELADA";
        }
        hintEl.textContent = "ENTER o ESC para volver a REMOTE>";
        stopFlavorFeed(`traza finalizada // nivel ${stage}.`);
        return;
      }

      if (payload.type === "tracer:error") {
        stopSound(callTone);
        statusEl.textContent = "TRACER // ERROR";
        popupEl.textContent = String(payload.message || "error tracer");
        hintEl.textContent = "Volviendo a REMOTE>";
        stopFlavorFeed(`error operativo // ${String(payload.message || "error tracer")}.`);
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
      popupEl.textContent = "No se pudo establecer WebSocket.";
      stopFlavorFeed("websocket fuera de servicio.");
      setTimeout(async () => {
        await settle();
      }, 1200);
    });
  });
}

export { startTracer };
export default startTracer;
