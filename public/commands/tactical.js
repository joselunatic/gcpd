const API_URL = "/api/live-map";
const FALLBACK_MAP_PATH = "/assets/livemap/gcpd_live_map_fallback_unavailable.png";
const TRAIL_TTL_MS = 10000;
const mapAspectRatioCache = new Map();

const clampPercent = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};

const normalizeToken = (token = {}) => ({
  id: String(token.id || ""),
  label: String(token.agentLabel || token.label || token.dmLabel || ""),
  agentLabel: String(token.agentLabel || token.label || token.dmLabel || ""),
  dmLabel: String(token.dmLabel || token.label || token.agentLabel || ""),
  x: clampPercent(token.x),
  y: clampPercent(token.y),
  visible: token.visible !== false,
  kind: normalizeTokenKind(token.kind),
  trail: token.trail
    ? {
        fromX: clampPercent(token.trail.fromX),
        fromY: clampPercent(token.trail.fromY),
        toX: clampPercent(token.trail.toX ?? token.x),
        toY: clampPercent(token.trail.toY ?? token.y),
        updatedAt: Number(token.trail.updatedAt) || Number(token.updatedAt) || 0,
      }
    : null,
  updatedAt: Number(token.updatedAt) || 0,
});

function normalizeTokenKind(kind = "") {
  const normalized = String(kind || "").trim().toLowerCase();
  if (["enemy", "enemigo", "hostile", "target", "objetivo"].includes(normalized)) {
    return "enemy";
  }
  return "ally";
}

const normalizeState = (state = {}) => ({
  backgroundImagePath:
    state.backgroundLoaded === true ? String(state.backgroundImagePath || "") : "",
  backgroundLoaded: state.backgroundLoaded === true,
  backgroundLabel: String(state.backgroundLabel || ""),
  fallbackImagePath: String(state.fallbackImagePath || FALLBACK_MAP_PATH),
  tokens: Array.isArray(state.tokens)
    ? state.tokens.map(normalizeToken).filter((token) => token.id && token.label)
    : [],
  updatedAt: Number(state.updatedAt) || 0,
});

function applyMapAspectRatio(map, imagePath) {
  if (!map) return;
  const targetPath = String(imagePath || "").trim();
  if (!targetPath) return;

  map.dataset.backgroundPath = targetPath;
  const cached = mapAspectRatioCache.get(targetPath);
  if (cached && cached.width > 0 && cached.height > 0) {
    map.style.aspectRatio = `${cached.width} / ${cached.height}`;
    return;
  }

  const img = new Image();
  img.onload = () => {
    const width = Number(img.naturalWidth) || 0;
    const height = Number(img.naturalHeight) || 0;
    if (!width || !height) return;
    mapAspectRatioCache.set(targetPath, { width, height });
    if (map.dataset.backgroundPath === targetPath) {
      map.style.aspectRatio = `${width} / ${height}`;
    }
  };
  img.onerror = () => {
    mapAspectRatioCache.set(targetPath, { width: 1, height: 1 });
  };
  img.src = targetPath;
}

function applyTokenMove(state, token = {}) {
  const normalized = normalizeState(state);
  const tokenId = String(token.id || "").trim();
  if (!tokenId) return normalized;
  const targetX = clampPercent(token.x);
  const targetY = clampPercent(token.y);
  const sourceToken =
    normalized.tokens.find((entry) => entry.id === tokenId) || normalizeToken(token) || null;
  const explicitTrail =
    token.trail && typeof token.trail === "object"
      ? {
          fromX: clampPercent(token.trail.fromX),
          fromY: clampPercent(token.trail.fromY),
          toX: clampPercent(token.trail.toX ?? targetX),
          toY: clampPercent(token.trail.toY ?? targetY),
          updatedAt: Number(token.trail.updatedAt) || Number(token.updatedAt) || Date.now(),
        }
      : null;
  const nextTokens = normalized.tokens.some((entry) => entry.id === tokenId)
    ? normalized.tokens.map((entry) => {
        if (entry.id !== tokenId) return entry;
        const moved = entry.x !== targetX || entry.y !== targetY;
        return {
          ...entry,
          x: targetX,
          y: targetY,
          trail: explicitTrail
            ? explicitTrail
            : moved
            ? {
                fromX: entry.x,
                fromY: entry.y,
                toX: targetX,
                toY: targetY,
                updatedAt: Number(token.updatedAt) || Date.now(),
              }
            : entry.trail || null,
          updatedAt: Number(token.updatedAt) || Date.now(),
        };
      })
    : [
        ...normalized.tokens,
        {
          ...(sourceToken || {}),
          id: tokenId,
          x: targetX,
          y: targetY,
          visible: token.visible !== false,
          kind: normalizeTokenKind(token.kind || sourceToken?.kind || ""),
          agentLabel: String(
            token.agentLabel ||
              token.label ||
              sourceToken?.agentLabel ||
              sourceToken?.label ||
              sourceToken?.dmLabel ||
              tokenId
          ).trim(),
          dmLabel: String(
            token.dmLabel ||
              sourceToken?.dmLabel ||
              sourceToken?.label ||
              sourceToken?.agentLabel ||
              token.label ||
              tokenId
          ).trim(),
          label: String(
            token.agentLabel ||
              token.label ||
              sourceToken?.agentLabel ||
              sourceToken?.label ||
              sourceToken?.dmLabel ||
              tokenId
          ).trim(),
          trail: explicitTrail || null,
          updatedAt: Number(token.updatedAt) || Date.now(),
        },
      ];
  return { ...normalized, tokens: nextTokens };
}

async function fetchLiveMapState() {
  const response = await fetch(API_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("LIVE MAP UNAVAILABLE");
  return normalizeState(await response.json());
}

function getWsUrl() {
  const protocol = window.location.protocol === "https:" ? "wss" : "ws";
  return `${protocol}://${window.location.host}/ws/live-map?role=agent`;
}

function renderState({ overlay, state }) {
  const map = overlay.querySelector(".tactical-map");
  const sync = overlay.querySelector(".tactical-sync");
  if (!map || !sync) return;
  let trails = map.querySelector(".tactical-trails");
  if (!trails) {
    trails = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    trails.classList.add("tactical-trails");
    trails.setAttribute("viewBox", "0 0 100 100");
    trails.setAttribute("preserveAspectRatio", "none");
    trails.setAttribute("aria-hidden", "true");
    map.insertBefore(trails, map.firstChild);
  }
  trails.innerHTML = "";
  const backgroundImagePath =
    state.backgroundLoaded && state.backgroundImagePath
      ? state.backgroundImagePath
      : state.fallbackImagePath || FALLBACK_MAP_PATH;
  map.style.backgroundImage = `url(${backgroundImagePath})`;
  applyMapAspectRatio(map, backgroundImagePath);
  map.dataset.fallback = state.backgroundLoaded ? "false" : "true";
  sync.textContent = "SYNC: LIVE";

  const existing = new Map(
    Array.from(map.querySelectorAll(".tactical-token")).map((node) => [
      node.dataset.tokenId,
      node,
    ])
  );
  const visibleTokens = state.tokens.filter((token) => token.visible);
  const now = Date.now();
  visibleTokens.forEach((token) => {
    if (!token.trail) return;
    const age = Math.max(0, now - Number(token.trail.updatedAt || token.updatedAt || 0));
    if (age > TRAIL_TTL_MS) return;
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${token.trail.fromX}`);
    line.setAttribute("y1", `${token.trail.fromY}`);
    line.setAttribute("x2", `${token.x}`);
    line.setAttribute("y2", `${token.y}`);
    line.setAttribute("stroke", token.kind === "enemy" ? "rgba(255,90,90,0.92)" : "rgba(92,181,255,0.92)");
    line.setAttribute("stroke-width", "0.85");
    line.setAttribute("stroke-linecap", "round");
    line.style.animationDuration = `${TRAIL_TTL_MS}ms`;
    line.style.animationDelay = `-${Math.min(age, TRAIL_TTL_MS)}ms`;
    trails.appendChild(line);
  });
  visibleTokens.forEach((token) => {
    let node = existing.get(token.id);
    if (!node) {
      node = document.createElement("div");
      node.className = "tactical-token";
      node.dataset.tokenId = token.id;
      map.appendChild(node);
    }
    node.textContent = token.agentLabel || token.label || token.dmLabel;
    node.dataset.kind = token.kind || "";
    node.style.left = `${token.x}%`;
    node.style.top = `${token.y}%`;
    existing.delete(token.id);
  });
  existing.forEach((node) => node.remove());
}

function injectStyles() {
  if (document.getElementById("tactical-live-map-styles")) return;
  const style = document.createElement("style");
  style.id = "tactical-live-map-styles";
  style.textContent = `
    .terminal-tactical-active .terminal { visibility: hidden; }
    .tactical-overlay {
      position: fixed;
      inset: 0;
      z-index: 75;
      display: grid;
      grid-template-rows: auto 1fr auto;
      gap: 8px;
      padding: 14px;
      background: #020807;
      color: #8fffc6;
      font-family: var(--output-font-family), monospace;
      text-shadow: 0 0 8px rgba(124,255,178,0.7);
      overflow: hidden;
    }
    .tactical-hud {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      border: 1px solid rgba(124,255,178,0.22);
      background: rgba(2,18,14,0.72);
      padding: 6px 8px;
      font-size: 14px;
      letter-spacing: 0.08em;
    }
    .tactical-map {
      position: relative;
      aspect-ratio: 1.5 / 1;
      width: 100%;
      border: 1px solid rgba(124,255,178,0.28);
      background-color: rgba(1,10,12,0.92);
      background-image:
        radial-gradient(circle at 50% 50%, rgba(124,255,178,0.1), transparent 42%),
        linear-gradient(rgba(90,180,223,0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(90,180,223,0.12) 1px, transparent 1px);
      background-position: center;
      background-repeat: no-repeat, repeat, repeat;
      background-size: contain, 32px 32px, 32px 32px;
      overflow: hidden;
      box-shadow: inset 0 0 36px rgba(0,0,0,0.95);
    }
    .tactical-trails {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }
    .tactical-trails line {
      filter: drop-shadow(0 0 8px rgba(124,255,178,0.42));
      opacity: 0.98;
      stroke-dasharray: 1.15 0.7;
      stroke-width: 1.2;
      vector-effect: non-scaling-stroke;
      animation-name: tacticalTrailFade;
      animation-timing-function: linear;
      animation-fill-mode: forwards;
    }
    .tactical-trails line[stroke*="255,90,90"] {
      filter: drop-shadow(0 0 6px rgba(255,90,90,0.25));
    }
    .tactical-map::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
      background: repeating-linear-gradient(
        0deg,
        rgba(255,255,255,0.035) 0,
        rgba(255,255,255,0.035) 1px,
        transparent 2px,
        transparent 4px
      );
      mix-blend-mode: screen;
      opacity: 0.45;
    }
    .tactical-map[data-fallback="true"] {
      filter: saturate(0.9) brightness(0.92);
    }
    .tactical-map[data-fallback="true"]::before {
      content: "NO TACTICAL BLUEPRINT LOADED";
      position: absolute;
      left: 14px;
      bottom: 14px;
      z-index: 1;
      padding: 4px 7px;
      border: 1px solid rgba(124,255,178,0.24);
      background: rgba(2,18,14,0.74);
      color: rgba(196,255,226,0.78);
      font-size: 10px;
      letter-spacing: 0.12em;
    }
    .tactical-token {
      position: absolute;
      transform: translate(-50%, -50%);
      min-width: 0;
      max-width: 124px;
      padding: 3px 6px;
      border: 1px solid rgba(92,181,255,0.86);
      background: rgba(5,19,35,0.88);
      color: #c8e8ff;
      font-size: 10px;
      line-height: 1.1;
      text-transform: uppercase;
      text-align: center;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      box-shadow: 0 0 12px rgba(92,181,255,0.24);
      transition: left 160ms linear, top 160ms linear, box-shadow 160ms ease;
      z-index: 3;
    }
    .tactical-token[data-kind="enemy"] {
      border-color: rgba(255,90,90,0.88);
      background: rgba(42,9,12,0.88);
      color: #ffcaca;
      box-shadow: 0 0 12px rgba(255,90,90,0.25);
    }
    .tactical-token::before {
      content: "";
      position: absolute;
      inset: -5px;
      border: 1px solid rgba(124,255,178,0.22);
      animation: tacticalPulse 1.8s ease-in-out infinite;
    }
    .tactical-token.is-moving {
      box-shadow: 0 0 22px rgba(124,180,252,0.5);
    }
    .tactical-footer {
      display: flex;
      justify-content: space-between;
      border-top: 1px solid rgba(124,255,178,0.25);
      padding-top: 6px;
      font-size: 13px;
      color: rgba(196,255,226,0.82);
    }
    @keyframes tacticalPulse {
      0%, 100% { opacity: 0.25; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(1.08); }
    }
    @keyframes tacticalTrailFade {
      0% { opacity: 0.8; stroke-dashoffset: 0; }
      100% { opacity: 0; stroke-dashoffset: -4; }
    }
  `;
  document.head.appendChild(style);
}

export async function startTactical() {
  injectStyles();
  const screenHost = document.body;

  const overlay = document.createElement("div");
  overlay.className = "tactical-overlay";
  overlay.innerHTML = `
    <div class="tactical-hud">
      <span>GCPD / WAYNE AUX NODE — TACTICAL LIVE MAP</span>
      <span class="tactical-sync">SYNC: ACQUIRING</span>
    </div>
    <div class="tactical-map" aria-label="TACTICAL LIVE MAP"></div>
    <div class="tactical-footer">
      <span>READ ONLY CHANNEL</span>
      <span>ESC: VOLVER</span>
    </div>
  `;

  document.body.classList.add("terminal-tactical-active");
  screenHost.appendChild(overlay);

  let socket = null;
  let closed = false;
  let currentState = null;

  const cleanup = () => {
    if (closed) return;
    closed = true;
    document.removeEventListener("keydown", keyHandler, { capture: true });
    if (socket) socket.close();
    overlay.remove();
    document.body.classList.remove("terminal-tactical-active");
    const input = document.querySelector("#input[contenteditable='true']");
    if (input) input.focus();
  };

  const keyHandler = (event) => {
    if (event.key === "Escape" || event.code === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      cleanup();
    }
  };

  document.addEventListener("keydown", keyHandler, { capture: true });

  try {
    currentState = await fetchLiveMapState();
    renderState({ overlay, state: currentState });
  } catch (error) {
    const sync = overlay.querySelector(".tactical-sync");
    if (sync) sync.textContent = "SYNC: CACHE UNAVAILABLE";
  }

  socket = new WebSocket(getWsUrl());
  socket.onopen = () => {
    const sync = overlay.querySelector(".tactical-sync");
    if (sync) sync.textContent = "SYNC: LIVE";
  };
  socket.onerror = () => {
    const sync = overlay.querySelector(".tactical-sync");
    if (sync) sync.textContent = "SYNC: DEGRADED";
  };
  socket.onclose = () => {
    const sync = overlay.querySelector(".tactical-sync");
    if (sync && !closed) sync.textContent = "SYNC: LINK LOST";
  };
  socket.onmessage = (event) => {
    let payload;
    try {
      payload = JSON.parse(String(event.data || "{}"));
    } catch {
      return;
    }
    if (payload.type === "live-map:state") {
      currentState = normalizeState(payload.state);
      renderState({ overlay, state: currentState });
      return;
    }
    if (payload.type === "live-map:token-move") {
      currentState = applyTokenMove(currentState, payload.token);
      renderState({ overlay, state: currentState });
    }
  };

  await new Promise((resolve) => {
    const wait = () => {
      if (closed) resolve();
      else requestAnimationFrame(wait);
    };
    wait();
  });
}

export default async () => startTactical();
