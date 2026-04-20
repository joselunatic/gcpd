const STORAGE_KEY = "campaignState";
const API_URL = "/api/campaign-state";
const DEFAULT_SCOPES = ["cases", "map", "villains"];

const DEFAULT_STATE = {
  unlocked: {
    cases: [],
    map: [],
    villains: [],
  },
  unlockedAttributes: {
    cases: {},
    map: {},
    villains: {},
  },
  flags: [],
  alertLevel: "low",
  activeCaseId: "",
  lastSeen: {
    cases: {},
    map: {},
    villains: {},
  },
};

let cachedState;
let refreshInFlight = false;
let pendingSave = null;
let saveTimer = null;
let lastRemoteUpdatedAt = 0;
let pollTimer = null;
const SAVE_DEBOUNCE_MS = 300;
const POLL_INTERVAL_MS = 8000;

function cloneState(state = DEFAULT_STATE) {
  const unlockedScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(state.unlocked || {}),
  ]);
  const attributeScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(state.unlockedAttributes || {}),
  ]);
  const seenScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(state.lastSeen || {}),
  ]);
  return {
    unlocked: Object.fromEntries(
      Array.from(unlockedScopes).map((scope) => [
        scope,
        [...(state.unlocked?.[scope] || [])],
      ])
    ),
    unlockedAttributes: Object.fromEntries(
      Array.from(attributeScopes).map((scope) => [
        scope,
        { ...(state.unlockedAttributes?.[scope] || {}) },
      ])
    ),
    flags: [...(state.flags || [])],
    alertLevel: state.alertLevel || "low",
    activeCaseId: state.activeCaseId || "",
    lastSeen: Object.fromEntries(
      Array.from(seenScopes).map((scope) => [
        scope,
        { ...(state.lastSeen?.[scope] || {}) },
      ])
    ),
  };
}

function normalizeState(state) {
  const unlocked = state?.unlocked || {};
  const legacyUnlocked = state?.unlocked?.modules || [];
  const legacyLastSeen = state?.lastSeen?.modules || {};
  const unlockedAttributes = state?.unlockedAttributes || {};
  const unlockedScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(unlocked || {}),
  ]);
  const attributeScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(unlockedAttributes || {}),
  ]);
  const lastSeenScopes = new Set([
    ...DEFAULT_SCOPES,
    ...Object.keys(state?.lastSeen || {}),
  ]);
  unlockedScopes.delete("modules");
  lastSeenScopes.delete("modules");
  return {
    unlocked: Object.fromEntries(
      Array.from(unlockedScopes).map((scope) => [
        scope,
        scope === "cases"
          ? Array.isArray(unlocked.cases)
            ? unlocked.cases
            : Array.isArray(legacyUnlocked)
              ? legacyUnlocked
              : []
          : Array.isArray(unlocked?.[scope])
            ? unlocked[scope]
            : [],
      ])
    ),
    unlockedAttributes: Object.fromEntries(
      Array.from(attributeScopes).map((scope) => [
        scope,
        typeof unlockedAttributes?.[scope] === "object" &&
        unlockedAttributes[scope]
          ? unlockedAttributes[scope]
          : {},
      ])
    ),
    flags: Array.isArray(state?.flags) ? state.flags : [],
    alertLevel: typeof state?.alertLevel === "string" ? state.alertLevel : "low",
    activeCaseId:
      typeof state?.activeCaseId === "string" ? state.activeCaseId : "",
    lastSeen: Object.fromEntries(
      Array.from(lastSeenScopes).map((scope) => [
        scope,
        scope === "cases"
          ? typeof state?.lastSeen?.cases === "object" && state.lastSeen.cases
            ? state.lastSeen.cases
            : typeof legacyLastSeen === "object" && legacyLastSeen
              ? legacyLastSeen
              : {}
          : typeof state?.lastSeen?.[scope] === "object" && state.lastSeen[scope]
            ? state.lastSeen[scope]
            : {},
      ])
    ),
  };
}

function loadCampaignState() {
  if (cachedState) return cloneState(cachedState);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedState = cloneState(DEFAULT_STATE);
      return cloneState(cachedState);
    }
    const parsed = normalizeState(JSON.parse(raw));
    cachedState = cloneState(parsed);
    return cloneState(cachedState);
  } catch (error) {
    console.warn("Campaign state invalid, resetting.", error);
    cachedState = cloneState(DEFAULT_STATE);
    return cloneState(cachedState);
  }
}

function saveCampaignState(state) {
  cachedState = cloneState(state);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
  } catch (error) {
    console.error("Failed to persist campaign state", error);
  }
  scheduleSync(cachedState);
}

function scheduleSync(state) {
  pendingSave = cloneState(state);
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    flushSync();
  }, SAVE_DEBOUNCE_MS);
}

async function flushSync() {
  const state = pendingSave;
  pendingSave = null;
  if (!state) return;
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ state }),
      keepalive: true,
    });
  } catch (error) {
    // Keep local state if API is unavailable.
  }
}

async function refreshCampaignState() {
  if (refreshInFlight) return;
  refreshInFlight = true;
  try {
    const response = await fetch(API_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to refresh campaign state");
    const data = await response.json();
    const updatedAt = Number(data.updatedAt) || 0;
    if (updatedAt && updatedAt <= lastRemoteUpdatedAt) {
      return;
    }
    const normalized = normalizeState(data.state || {});
    cachedState = cloneState(normalized);
    lastRemoteUpdatedAt = updatedAt || Date.now();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedState));
    } catch (error) {}
  } catch (error) {
    // Ignore network errors; fall back to local state.
  } finally {
    refreshInFlight = false;
  }
}

function ensureScopeArray(state, scope) {
  if (!state.unlocked) {
    state.unlocked = {};
  }
  if (!state.unlocked[scope]) {
    state.unlocked[scope] = [];
  }
}

function markUnlocked(scope, id) {
  if (!id) return;
  const state = loadCampaignState();
  ensureScopeArray(state, scope);
  if (!state.unlocked[scope].includes(id)) {
    state.unlocked[scope].push(id);
    saveCampaignState(state);
  }
  return state;
}

function markUnlockedBulk(scope, ids = []) {
  const state = loadCampaignState();
  ensureScopeArray(state, scope);
  let updated = false;
  ids.forEach((id) => {
    if (id && !state.unlocked[scope].includes(id)) {
      state.unlocked[scope].push(id);
      updated = true;
    }
  });
  if (updated) {
    saveCampaignState(state);
  }
  return state;
}

function isUnlocked(scope, id, state = loadCampaignState()) {
  if (!id) return false;
  ensureScopeArray(state, scope);
  return state.unlocked[scope].includes(id);
}

function ensureAttributeScope(state, scope) {
  if (!state.unlockedAttributes) {
    state.unlockedAttributes = {};
  }
  if (!state.unlockedAttributes[scope]) {
    state.unlockedAttributes[scope] = {};
  }
}

function markAttributeUnlocked(scope, id, attribute) {
  if (!id || !attribute) return;
  const state = loadCampaignState();
  ensureAttributeScope(state, scope);
  const bucket = state.unlockedAttributes[scope];
  const list = Array.isArray(bucket[id]) ? bucket[id] : [];
  if (!list.includes(attribute)) {
    bucket[id] = [...list, attribute];
    saveCampaignState(state);
  }
  return state;
}

function isAttributeUnlocked(scope, id, attribute, state = loadCampaignState()) {
  if (!id || !attribute) return false;
  ensureAttributeScope(state, scope);
  const bucket = state.unlockedAttributes[scope];
  const list = Array.isArray(bucket[id]) ? bucket[id] : [];
  return list.includes(attribute);
}

function addFlag(flag) {
  if (!flag) return;
  const state = loadCampaignState();
  if (!state.flags.includes(flag)) {
    state.flags.push(flag);
    saveCampaignState(state);
  }
  return state;
}

function hasFlag(flag, state = loadCampaignState()) {
  return state.flags.includes(flag);
}

function markSeen(scope, id, updatedAt = Date.now()) {
  if (!id) return;
  const state = loadCampaignState();
  if (!state.lastSeen) {
    state.lastSeen = {};
  }
  if (!state.lastSeen[scope]) {
    state.lastSeen[scope] = {};
  }
  const previous = Number(state.lastSeen[scope][id] || 0);
  if (updatedAt > previous) {
    state.lastSeen[scope][id] = updatedAt;
    saveCampaignState(state);
  }
  return state;
}

export {
  loadCampaignState,
  saveCampaignState,
  refreshCampaignState,
  markUnlocked,
  markUnlockedBulk,
  isUnlocked,
  markAttributeUnlocked,
  isAttributeUnlocked,
  addFlag,
  hasFlag,
  markSeen,
  DEFAULT_STATE,
};

setTimeout(() => {
  refreshCampaignState();
}, 0);

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    refreshCampaignState();
  }, POLL_INTERVAL_MS);
}

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    refreshCampaignState();
  }
});

startPolling();
