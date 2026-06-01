const API_URL = "/api/global-commands";

let cache;
let lastUpdated = 0;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function listGlobalCommands({ force = false } = {}) {
  if (cache && !force) return cache;
  try {
    const data = await fetchJson(API_URL);
    cache = Array.isArray(data?.commands) ? data.commands : [];
    lastUpdated = Date.now();
  } catch (error) {
    console.error("Failed to load global commands", error);
    cache = [];
  }
  return cache;
}

function getGlobalCommandsCache() {
  return cache || [];
}

function getGlobalCommandsUpdatedAt() {
  return lastUpdated || 0;
}

export { listGlobalCommands, getGlobalCommandsCache, getGlobalCommandsUpdatedAt };
