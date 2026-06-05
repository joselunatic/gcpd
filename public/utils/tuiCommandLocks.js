import { isTuiCommandLocked, normalizeTuiCommandLocks } from "/utils/tuiCommandRegistry.js";

const ENDPOINT = "/api/tui-command-locks";
const CACHE_MS = 750;

let cache = null;
let cacheAt = 0;

async function loadTuiCommandLockState({ force = false } = {}) {
  const now = Date.now();
  if (!force && cache && now - cacheAt < CACHE_MS) {
    return cache;
  }
  try {
    const response = await fetch(ENDPOINT, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    cache = {
      commands: Array.isArray(data?.commands) ? data.commands : [],
      locks: normalizeTuiCommandLocks(data?.locks || {}),
    };
  } catch (error) {
    console.error("Failed to load TUI command locks", error);
    cache = {
      commands: [],
      locks: normalizeTuiCommandLocks({}),
    };
  }
  cacheAt = now;
  return cache;
}

async function isRuntimeCommandLocked(command) {
  const state = await loadTuiCommandLockState();
  return isTuiCommandLocked(command, state.locks);
}

export { isRuntimeCommandLocked, loadTuiCommandLockState };
