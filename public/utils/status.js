import { print } from "/utils/io.js";
import { loadCampaignState } from "/utils/campaignState.js";

const CAMPAIGN_URL = "/api/campaign-state";
const CASES_URL = "/api/cases-data";
const FALLBACK_CASES = "/data/cases/cases.json";

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

async function fetchCases() {
  try {
    const data = await fetchJson(CASES_URL);
    return { cases: data.cases || data.modules || [], unsynced: false };
  } catch (error) {
    try {
      const fallback = await fetchJson(FALLBACK_CASES);
      return { cases: fallback.cases || fallback.modules || [], unsynced: true };
    } catch (fallbackError) {
      return { cases: [], unsynced: true };
    }
  }
}

function formatFlags(flags = []) {
  if (!flags.length) return "NONE";
  return flags.join(" | ");
}

function formatAlert(level) {
  if (!level) return "LOW";
  return String(level).toUpperCase();
}

export async function renderStatusHeader(options = {}) {
  const [campaign, casesPayload] = await Promise.all([
    fetchCampaignState(),
    fetchCases(),
  ]);
  const unsynced = campaign.unsynced || casesPayload.unsynced;
  const state = campaign.state || {};
  const activeCaseId = state.activeCaseId || "";
  const activeCase =
    casesPayload.cases.find((entry) => entry.id === activeCaseId) || null;

  if (unsynced) {
    await print(
      ["API UNAVAILABLE - DATA UNSYNCED"],
      { semantic: "system", stopBlinking: true, ...options }
    );
  }

  const lines = [
    "--------------------------------",
    "GCPD :: KNIGHTFALL",
    `CASE: ${activeCase ? activeCase.title || activeCase.id : activeCaseId || "NONE"}`,
    `ALERT: ${formatAlert(state.alertLevel)}`,
    `FLAGS: ${formatFlags(state.flags || [])}`,
    "--------------------------------",
  ];

  await print(lines, { semantic: "log", stopBlinking: true, ...options });
}
