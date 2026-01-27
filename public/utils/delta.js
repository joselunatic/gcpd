import { loadCampaignState } from "/utils/campaignState.js";

function isCritical(entity) {
  const status = (entity?.status || "").toLowerCase();
  if (status.includes("critical") || status.includes("urgent")) {
    return true;
  }
  const tags = entity?.tags || [];
  if (Array.isArray(tags)) {
    return tags.some((tag) => String(tag).toLowerCase().includes("critical"));
  }
  return false;
}

function getLastSeenFor(scope, id, campaignState) {
  const map = campaignState?.lastSeen?.[scope] || {};
  return Number(map[id] || 0);
}

function getUpdatedAt(entity) {
  return Number(entity?.updatedAt || 0);
}

function getDeltaMarker(entity, scope, campaignState = loadCampaignState()) {
  if (isCritical(entity)) return "!";
  const updatedAt = getUpdatedAt(entity);
  if (!updatedAt) return "";
  const lastSeen = getLastSeenFor(scope, entity.id, campaignState);
  if (!lastSeen) return "*";
  if (updatedAt > lastSeen) return "~";
  return "";
}

export { getDeltaMarker };

