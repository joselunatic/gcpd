import {
  loadCampaignState,
  markUnlocked,
  isUnlocked as isUnlockedInState,
  hasFlag,
  isAttributeUnlocked as isAttributeUnlockedInState,
} from "/utils/campaignState.js";

const DEFAULT_ACCESS = {
  visibility: "listed",
  unlockMode: "none",
  password: "",
  phrase: "",
  prerequisites: [],
  requiredFlags: [],
  autoUnlockOn: "resolve",
  initialAccessStatus: "locked",
};

const SCOPE_MAP = {
  cases: "cases",
  modules: "cases",
  map: "map",
  villains: "villains",
};

function getScope(entity) {
  const category = entity?.poiV2?.hierarchy?.category || entity?.commands?.category;
  return SCOPE_MAP[category] || "cases";
}

function getAccessConfig(entity) {
  const rawConfig = entity?.poiV2?.access || entity?.unlockConditions;
  if (!entity || !rawConfig) {
    return { ...DEFAULT_ACCESS };
  }
  const config = {
    ...DEFAULT_ACCESS,
    ...(typeof rawConfig === "object"
      ? rawConfig
      : {}),
  };
  config.prerequisites = Array.isArray(config.prerequisites)
    ? config.prerequisites.filter(Boolean)
    : [];
  config.requiredFlags = Array.isArray(config.requiredFlags)
    ? config.requiredFlags.filter(Boolean)
    : [];
  return config;
}

function getAttributeAccessConfig(entity, attribute) {
  const fallback = { ...DEFAULT_ACCESS };
  if (!entity || !attribute) return fallback;
  const attributes = entity?.unlockConditions?.attributes || {};
  const config =
    typeof attributes === "object" && attributes
      ? attributes[attribute]
      : null;
  if (!config || typeof config !== "object") return fallback;
  const merged = { ...DEFAULT_ACCESS, ...config };
  merged.prerequisites = Array.isArray(merged.prerequisites)
    ? merged.prerequisites.filter(Boolean)
    : [];
  merged.requiredFlags = Array.isArray(merged.requiredFlags)
    ? merged.requiredFlags.filter(Boolean)
    : [];
  return merged;
}

function evaluateAccess(entity, campaignState = loadCampaignState()) {
  const scope = getScope(entity);
  const config = getAccessConfig(entity);
  const unlocked =
    config.unlockMode === "none" ||
    config.initialAccessStatus === "unlocked" ||
    isUnlockedInState(scope, entity.id, campaignState);
  const prerequisitesMet = config.prerequisites.every((id) =>
    isUnlockedInState(scope, id, campaignState)
  );
  const flagsMet = config.requiredFlags.every((flag) =>
    hasFlag(flag, campaignState)
  );
  const status = (entity.status || "").toLowerCase();
  const visibleStatus = status !== "archived";
  const visible =
    visibleStatus &&
    (config.visibility !== "hidden" || unlocked || config.unlockMode === "none");
  const listed = visibleStatus && config.visibility !== "hidden";
  return {
    scope,
    config,
    unlocked,
    prerequisitesMet,
    flagsMet,
    visible,
    listed,
  };
}

function evaluateAttributeAccess(
  entity,
  attribute,
  campaignState = loadCampaignState()
) {
  const scope = getScope(entity);
  const config = getAttributeAccessConfig(entity, attribute);
  const unlockedInState = isAttributeUnlockedInState(
    scope,
    entity.id,
    attribute,
    campaignState
  );
  const unlocked =
    config.visibility === "hidden"
      ? config.initialAccessStatus === "unlocked" || unlockedInState
      : config.unlockMode === "none" ||
        config.initialAccessStatus === "unlocked" ||
        unlockedInState;
  const prerequisitesMet = config.prerequisites.every((id) =>
    isUnlockedInState(scope, id, campaignState)
  );
  const flagsMet = config.requiredFlags.every((flag) =>
    hasFlag(flag, campaignState)
  );
  const visible =
    config.visibility !== "hidden" || unlocked || config.unlockMode === "none";
  const listed = config.visibility !== "hidden";
  return {
    scope,
    config,
    unlocked,
    prerequisitesMet,
    flagsMet,
    visible,
    listed,
  };
}

function unlockEntity(entity) {
  const scope = getScope(entity);
  return markUnlocked(scope, entity.id);
}

function getNodeType(entity) {
  return entity?.poiV2?.hierarchy?.nodeType || entity?.commands?.nodeType || "mixed";
}

function getNodeLabel(entity) {
  return (
    entity?.poiV2?.hierarchy?.menuAlias ||
    entity?.commands?.menuAlias ||
    entity.title ||
    entity.name ||
    entity.alias ||
    entity.id
  );
}

function resolveAutoParent(entity) {
  if (entity?.poiV2?.hierarchy?.parentId) return entity.poiV2.hierarchy.parentId;
  if (entity?.commands?.parentId) return entity.commands.parentId;
  const scope = getScope(entity);
  const prefixMap = {
    cases: "case:",
    map: "poi:",
    villains: "villain:",
  };
  const prefix = prefixMap[scope] || "case:";
  const prefixes = scope === "cases" ? [prefix, "module:"] : [prefix];
  const prereq = (entity?.unlockConditions?.prerequisites || []).find((entry) =>
    prefixes.some((candidate) => (entry || "").startsWith(candidate))
  );
  if (prereq) {
    const matched = prefixes.find((candidate) => prereq.startsWith(candidate));
    return matched ? prereq.replace(matched, "") : prereq.replace(prefix, "");
  }
  return "";
}

function buildNavigationTree(entities = []) {
  const grouped = entities.reduce((acc, entity) => {
    const parent = resolveAutoParent(entity);
    if (!acc[parent]) acc[parent] = [];
    acc[parent].push(entity);
    return acc;
  }, {});

  const build = (parentId = "", depth = 0, visited = new Set()) => {
    if (depth > 20 || visited.has(parentId)) return [];
    const nodes = grouped[parentId] || [];
    const nextVisited = new Set(visited);
    if (parentId) nextVisited.add(parentId);
    return nodes
      .sort((a, b) => getNodeLabel(a).localeCompare(getNodeLabel(b)))
      .map((node) => ({
        item: node,
        children: build(node.id, depth + 1, nextVisited),
      }));
  };

  return build();
}

export {
  getAccessConfig,
  getAttributeAccessConfig,
  evaluateAccess,
  evaluateAttributeAccess,
  unlockEntity,
  getNodeType,
  getNodeLabel,
  buildNavigationTree,
  getScope,
  DEFAULT_ACCESS,
};
