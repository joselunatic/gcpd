import { print } from "/utils/io.js";
import { renderStatusHeader } from "/utils/status.js";
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

export default async () => {
  await renderStatusHeader();
  const [campaign, casesPayload] = await Promise.all([
    fetchCampaignState(),
    fetchCases(),
  ]);

  if (campaign.unsynced || casesPayload.unsynced) {
    await print(["API UNAVAILABLE - DATA UNSYNCED"], {
      semantic: "system",
      stopBlinking: true,
    });
  }

  const state = campaign.state || {};
  const cases = casesPayload.cases || [];
  const activeCaseId = state.activeCaseId || "";
  const activeCase = cases.find((entry) => entry.id === activeCaseId);
  const activeLabel = activeCase
    ? activeCase.title || activeCase.id
    : activeCaseId || "NONE";
  const activeSummary = activeCase?.summary || "";

  const lines = [
    " ",
    "OPERATION SUMMARY",
    "=================",
    " ",
    `ALERT LEVEL: ${(state.alertLevel || "low").toUpperCase()}`,
    `ACTIVE CASE: ${activeLabel}`,
  ];

  if (activeSummary) {
    lines.push(`CASE BRIEF: ${activeSummary}`);
  }

  const flags = state.flags || [];
  lines.push(`FLAGS: ${flags.length ? flags.join(" | ") : "NONE"}`);
  lines.push(
    `ACTIVE CASES: ${cases.filter((item) => (item.status || "").toLowerCase() === "active").length}`
  );
  lines.push(" ");

  await print(lines, { semantic: "log", stopBlinking: true });
};
