import { listCases, getCaseById } from "/utils/cases.js";
import { normalizePoisClient } from "/utils/poiContract.js";

const POIS_URL = "/api/pois-data";
const VILLAINS_URL = "/api/villains-data";
const FALLBACK_POIS = "/data/map/pois.json";
const FALLBACK_VILLAINS = "/data/villains/gallery.json";

let poisCache;
let villainsCache;

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function listPois({ force = false } = {}) {
  if (force) {
    poisCache = null;
  }
  if (!poisCache) {
    try {
      const data = await fetchJson(POIS_URL);
      poisCache = normalizePoisClient(data.pois);
    } catch (error) {
      console.error("Error loading POIs", error);
      const fallback = await fetchJson(FALLBACK_POIS).catch(() => ({ pois: [] }));
      poisCache = normalizePoisClient(fallback.pois);
    }
  }
  return poisCache;
}

async function listVillains({ force = false } = {}) {
  if (force) {
    villainsCache = null;
  }
  if (!villainsCache) {
    try {
      const data = await fetchJson(VILLAINS_URL);
      villainsCache = data.villains || [];
    } catch (error) {
      console.error("Error loading villains", error);
      const fallback = await fetchJson(FALLBACK_VILLAINS).catch(() => ({
        villains: [],
      }));
      villainsCache = fallback.villains || [];
    }
  }
  return villainsCache;
}

function normalizeKey(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function scoreMatch(query, candidate) {
  if (!candidate) return 0;
  if (candidate === query) return 100;
  if (candidate.startsWith(query)) return 70;
  if (candidate.includes(query)) return 40;
  return 0;
}

async function resolveEntity(query, { scope, force = false } = {}) {
  if (!query) return null;
  const normalized = normalizeKey(query);
  const scopes = scope ? [scope] : ["cases", "map", "villains"];
  let best = null;

  for (const currentScope of scopes) {
    let items = [];
    if (currentScope === "cases") {
      items = await listCases();
    } else if (currentScope === "map") {
      items = await listPois({ force });
    } else if (currentScope === "villains") {
      items = await listVillains({ force });
    }

    for (const item of items) {
      const candidates = [
        item.id,
        item.title,
        item.name,
        item.alias,
        item.realName,
      ]
        .filter(Boolean)
        .map(normalizeKey);
      let score = 0;
      candidates.forEach((candidate) => {
        score = Math.max(score, scoreMatch(normalized, candidate));
      });
      if (score > 0 && (!best || score > best.score)) {
        best = { score, item, scope: currentScope };
      }
    }
  }

  if (!best) return null;
  if (best.scope === "cases") {
    const full = await getCaseById(best.item.id);
    return { item: full || best.item, scope: best.scope };
  }
  return best;
}

export { listCases, listPois, listVillains, resolveEntity, normalizeKey };
