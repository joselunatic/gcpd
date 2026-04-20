import { print } from "/utils/io.js";
import { renderStatusHeader } from "/utils/status.js";
import { loadCampaignState } from "/utils/campaignState.js";
import { getDeltaMarker } from "/utils/delta.js";
import { normalizePoisClient, getPoiName } from "/utils/poiContract.js";

const CAMPAIGN_URL = "/api/campaign-state";
const CASES_URL = "/api/cases-data";
const POIS_URL = "/api/pois-data";
const VILLAINS_URL = "/api/villains-data";
const FALLBACK_CASES = "/data/cases/cases.json";
const FALLBACK_POIS = "/data/map/pois.json";
const FALLBACK_VILLAINS = "/data/villains/gallery.json";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

async function fetchCampaignState() {
  try {
    const data = await fetchJson(CAMPAIGN_URL);
    return { state: data.state || {}, unsynced: false };
  } catch (error) {
    return { state: loadCampaignState(), unsynced: true };
  }
}

async function fetchWithFallback(apiUrl, fallbackUrl, key) {
  try {
    const data = await fetchJson(apiUrl);
    const items = data[key] || (key === "cases" ? data.modules || [] : []) || [];
    return {
      items: key === "pois" ? normalizePoisClient(items) : items,
      unsynced: false,
    };
  } catch (error) {
    try {
      const fallback = await fetchJson(fallbackUrl);
      const items = fallback[key] || (key === "cases" ? fallback.modules || [] : []) || [];
      return {
        items: key === "pois" ? normalizePoisClient(items) : items,
        unsynced: true,
      };
    } catch (fallbackError) {
      return { items: [], unsynced: true };
    }
  }
}

function formatTimestamp(ts) {
  if (!ts) return "UNKNOWN";
  return new Date(ts).toISOString().replace("T", " ").replace("Z", "Z");
}

export default async () => {
  await renderStatusHeader();
  const [campaign, casesPayload, poisPayload, villainsPayload] =
    await Promise.all([
      fetchCampaignState(),
      fetchWithFallback(CASES_URL, FALLBACK_CASES, "cases"),
      fetchWithFallback(POIS_URL, FALLBACK_POIS, "pois"),
      fetchWithFallback(VILLAINS_URL, FALLBACK_VILLAINS, "villains"),
    ]);

  if (
    campaign.unsynced ||
    casesPayload.unsynced ||
    poisPayload.unsynced ||
    villainsPayload.unsynced
  ) {
    await print(["API UNAVAILABLE - DATA UNSYNCED"], {
      semantic: "system",
      stopBlinking: true,
    });
  }

  const state = campaign.state || {};
  const changes = [];

  casesPayload.items.forEach((entry) => {
    const marker = getDeltaMarker(entry, "cases", state);
    if (!marker) return;
    changes.push({
      label: entry.title || entry.id,
      scope: "CASE",
      updatedAt: Number(entry.updatedAt || 0),
      marker,
    });
  });

  poisPayload.items.forEach((entry) => {
    const marker = getDeltaMarker(entry, "map", state);
    if (!marker) return;
    changes.push({
      label: getPoiName(entry),
      scope: "POI",
      updatedAt: Number(entry.updatedAt || 0),
      marker,
    });
  });

  villainsPayload.items.forEach((entry) => {
    const marker = getDeltaMarker(entry, "villains", state);
    if (!marker) return;
    changes.push({
      label: entry.alias || entry.id,
      scope: "VILLAIN",
      updatedAt: Number(entry.updatedAt || 0),
      marker,
    });
  });

  changes.sort((a, b) => b.updatedAt - a.updatedAt);

  const lines = [" ", "LAST CHANGES", "============", " "];
  if (!changes.length) {
    lines.push("NO RECENT UPDATES.", " ");
    await print(lines, { semantic: "log", stopBlinking: true });
    return;
  }

  changes.slice(0, 10).forEach((entry) => {
    lines.push(
      `${entry.marker} [${entry.scope}] ${entry.label} (${formatTimestamp(entry.updatedAt)})`
    );
  });
  lines.push(" ");

  await print(lines, { semantic: "log", stopBlinking: true });
};
