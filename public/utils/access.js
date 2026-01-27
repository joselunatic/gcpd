import {
  loadCampaignState,
  markUnlocked,
  isUnlocked as isUnlockedInState,
  hasFlag,
} from "/utils/campaignState.js";

const DEFAULT_ACCESS = {
  visibility: "listed",
  unlockMode: "none",
  password: "",
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
  const category = entity?.commands?.category;
  return SCOPE_MAP[category] || "cases";
}

function getAccessConfig(entity) {
  if (!entity || !entity.unlockConditions) {
    return { ...DEFAULT_ACCESS };
  }
  const config = {
    ...DEFAULT_ACCESS,
    ...(typeof entity.unlockConditions === "object"
      ? entity.unlockConditions
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

function unlockEntity(entity) {
  const scope = getScope(entity);
  return markUnlocked(scope, entity.id);
}

function getNodeType(entity) {
  return entity?.commands?.nodeType || "mixed";
}

function getNodeLabel(entity) {
  return (
    entity?.commands?.menuAlias ||
    entity.title ||
    entity.name ||
    entity.alias ||
    entity.id
  );
}

function resolveAutoParent(entity) {
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
  evaluateAccess,
  unlockEntity,
  getNodeType,
  getNodeLabel,
  buildNavigationTree,
  getScope,
  DEFAULT_ACCESS,
};
