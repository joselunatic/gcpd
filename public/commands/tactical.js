const API_URL = "/api/live-map";
const FALLBACK_MAP_PATH = "/assets/livemap/gcpd_live_map_fallback_unavailable.png";

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
  const backgroundImagePath =
    state.backgroundLoaded && state.backgroundImagePath
      ? state.backgroundImagePath
      : state.fallbackImagePath || FALLBACK_MAP_PATH;
  map.style.backgroundImage = `url(${backgroundImagePath})`;
  map.dataset.fallback = state.backgroundLoaded ? "false" : "true";
  sync.textContent = "SYNC: LIVE";

  const existing = new Map(
    Array.from(map.querySelectorAll(".tactical-token")).map((node) => [
      node.dataset.tokenId,
      node,
    ])
  );
  const visibleTokens = state.tokens.filter((token) => token.visible);
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

function renderTokenMove({ overlay, token }) {
  const map = overlay.querySelector(".tactical-map");
  if (!map || !token?.id) return;
  const node = Array.from(map.querySelectorAll(".tactical-token")).find(
    (entry) => entry.dataset.tokenId === token.id
  );
  if (!node) return;
  node.style.left = `${clampPercent(token.x)}%`;
  node.style.top = `${clampPercent(token.y)}%`;
  node.classList.remove("is-moving");
  void node.offsetWidth;
  node.classList.add("is-moving");
}

function injectStyles() {
  if (document.getElementById("tactical-live-map-styles")) return;
  const style = document.createElement("style");
  style.id = "tactical-live-map-styles";
  style.textContent = `
    .terminal-tactical-active .terminal { visibility: hidden; }
    .tactical-overlay {
      position: absolute;
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
    .tactical-map::after {
      content: "";
      position: absolute;
      inset: 0;
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
      z-index: 2;
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
  `;
  document.head.appendChild(style);
}

export async function startTactical() {
  injectStyles();
  const screenHost =
    document.getElementById("screen-container") || document.querySelector(".terminal");
  if (!screenHost) return;

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
    renderState({ overlay, state: await fetchLiveMapState() });
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
      renderState({ overlay, state: normalizeState(payload.state) });
      return;
    }
    if (payload.type === "live-map:token-move") {
      renderTokenMove({ overlay, token: payload.token });
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
