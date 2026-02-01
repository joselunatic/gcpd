import { print } from "/utils/io.js";
import { loadCampaignState } from "/utils/campaignState.js";
import { buildHeaderLines, titleLine } from "/utils/tui.js";

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

async function getStatusContext() {
  const [campaign, casesPayload] = await Promise.all([
    fetchCampaignState(),
    fetchCases(),
  ]);
  const unsynced = campaign.unsynced || casesPayload.unsynced;
  const state = campaign.state || {};
  const activeCaseId = state.activeCaseId || "";
  const activeCase =
    casesPayload.cases.find((entry) => entry.id === activeCaseId) || null;
  return {
    unsynced,
    state,
    cases: casesPayload.cases || [],
    activeCaseId,
    activeCase,
  };
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
  const {
    node = "WAYNE AUX NODE",
    view = "OS",
    status = "ONLINE",
    link = "SECURE",
    mode = "INVESTIGATION",
    title = "GCPD :: KNIGHTFALL",
  } = options || {};
  const { unsynced, state, activeCaseId, activeCase } = await getStatusContext();

  if (unsynced) {
    await print([
      "SYNC WARNING: API INACCESIBLE - DATA LOCAL",
    ], { semantic: "system", stopBlinking: true, ...options });
  }

  const headerLines = buildHeaderLines({
    node,
    view,
    status,
    link,
    mode,
    caseLabel: activeCase ? activeCase.title || activeCase.id : activeCaseId || "NONE",
    alert: formatAlert(state.alertLevel),
    flags: formatFlags(state.flags || []),
  });

  const lines = [
    ...headerLines,
    titleLine(title),
  ];

  await print(lines, { semantic: "log", stopBlinking: true, ...options });
}

export { getStatusContext };
