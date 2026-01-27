import { print } from "/utils/io.js";
import { renderStatusHeader } from "/utils/status.js";
import { loadCampaignState } from "/utils/campaignState.js";

const CAMPAIGN_URL = "/api/campaign-state";

async function fetchCampaignState() {
  try {
    const response = await fetch(CAMPAIGN_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("API unavailable");
    }
    const data = await response.json();
    return { state: data.state || {}, unsynced: false };
  } catch (error) {
    return { state: loadCampaignState(), unsynced: true };
  }
}

export default async () => {
  await renderStatusHeader();
  const { state, unsynced } = await fetchCampaignState();
  if (unsynced) {
    await print(["API UNAVAILABLE - DATA UNSYNCED"], {
      semantic: "system",
      stopBlinking: true,
    });
  }
  const flags = state.flags || [];
  const lines = [
    " ",
    "ACTIVE FLAGS",
    "============",
    " ",
    ...(flags.length ? flags.map((flag) => `> ${flag}`) : ["NONE"]),
    " ",
  ];
  await print(lines, { semantic: "intel", stopBlinking: true });
};

