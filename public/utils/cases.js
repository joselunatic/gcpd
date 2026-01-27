const MANIFEST_URL = "/api/cases-data";
const FALLBACK_MANIFEST_URL = "/data/cases/cases.json";

let apiCache;
let lastSource = "api";
let fallbackManifestPromise;
const fallbackCaseCache = new Map();

async function fetchJson(url) {
  const response = await fetch(url, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
}

async function loadApiCases() {
  if (!apiCache) {
    const data = await fetchJson(MANIFEST_URL).catch((error) => {
      console.error("Error loading case manifest", error);
      lastSource = "fallback";
      return { cases: [] };
    });
    apiCache = data.cases || data.modules || [];
    if (apiCache.length) {
      lastSource = "api";
    }
  }
  return apiCache;
}

async function loadFallbackManifest() {
  if (!fallbackManifestPromise) {
    fallbackManifestPromise = fetchJson(FALLBACK_MANIFEST_URL).catch(() => ({
      cases: [],
    }));
  }
  return fallbackManifestPromise;
}

async function listCases() {
  const cases = await loadApiCases();
  if (cases.length) {
    return cases;
  }
  lastSource = "fallback";
  const fallback = await loadFallbackManifest();
  return fallback.cases || fallback.modules || [];
}

async function loadFallbackCaseFile(filePath) {
  const normalized = filePath.replace(/^\//, '/');
  if (!fallbackCaseCache.has(normalized)) {
    const data = await fetchJson(normalized);
    fallbackCaseCache.set(normalized, data);
    lastSource = "fallback";
  }
  return fallbackCaseCache.get(normalized);
}

async function getCaseById(id) {
  const cases = await listCases();
  const entry = cases.find((item) => item.id === id);
  if (!entry) return null;
  if (entry.commands || !entry.file) {
    return entry;
  }
  try {
    const data = await loadFallbackCaseFile(entry.file);
    return data;
  } catch (error) {
    console.error(`Failed to load case ${id}`, error);
    return entry;
  }
}

async function getActiveCases() {
  const cases = await listCases();
  return cases.filter(
    (item) => (item.status || "").toLowerCase() === "active"
  );
}

function getCasesSource() {
  return lastSource;
}

export { listCases, getCaseById, getActiveCases, getCasesSource };
