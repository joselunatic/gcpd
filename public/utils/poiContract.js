const DEFAULT_POI_HIERARCHY = {
  parentId: "",
  nodeType: "mixed",
  menuAlias: "",
  category: "map",
};

const DEFAULT_POI_CONTENT = {
  details: [],
  contacts: [],
  notes: [],
  brief: [],
  intel: [],
};

const DEFAULT_POI_ACCESS = {
  visibility: "listed",
  unlockMode: "none",
  password: "",
  phrase: "",
  prerequisites: [],
  requiredFlags: [],
  autoUnlockOn: "resolve",
  initialAccessStatus: "locked",
};

function toArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizePoiHierarchy(poi = {}) {
  const source = poi?.poiV2?.hierarchy || {};
  const commands = poi?.commands || {};
  return {
    parentId: source.parentId || commands.parentId || "",
    nodeType: source.nodeType || commands.nodeType || "mixed",
    menuAlias: source.menuAlias || commands.menuAlias || "",
    category: source.category || commands.category || "map",
  };
}

function normalizePoiGeo(poi = {}) {
  const source = poi?.poiV2?.geo || {};
  const mapMeta = poi?.commands?.mapMeta || {};
  const x = source.x ?? mapMeta.x;
  const y = source.y ?? mapMeta.y;
  const radius = source.radius ?? mapMeta.radius ?? 1.6;
  const label = source.label || mapMeta.label || poi.name || poi.id || "";
  const image = source.image || mapMeta.image || "";
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  return {
    mapId: source.mapId || "gotham",
    x: Number(x),
    y: Number(y),
    radius: Number(radius) || 1.6,
    label,
    image,
  };
}

function normalizePoiContent(poi = {}) {
  const source = poi?.poiV2?.content || {};
  return {
    details: toArray(source.details).length ? toArray(source.details) : toArray(poi.details),
    contacts: toArray(source.contacts).length ? toArray(source.contacts) : toArray(poi.contacts),
    notes: toArray(source.notes).length ? toArray(source.notes) : toArray(poi.notes),
    brief: toArray(source.brief).length ? toArray(source.brief) : toArray(poi?.commands?.brief),
    intel: toArray(source.intel).length ? toArray(source.intel) : toArray(poi?.commands?.intel),
  };
}

function normalizePoiAccess(poi = {}) {
  const source = poi?.poiV2?.access || poi?.unlockConditions || {};
  return {
    visibility: source.visibility || "listed",
    unlockMode: source.unlockMode || "none",
    password: source.password || poi.accessCode || "",
    phrase: source.phrase || "",
    prerequisites: toArray(source.prerequisites),
    requiredFlags: toArray(source.requiredFlags),
    autoUnlockOn: source.autoUnlockOn || "resolve",
    initialAccessStatus: source.initialAccessStatus || "locked",
  };
}

function normalizePoiClient(poi = {}) {
  const hierarchy = normalizePoiHierarchy(poi);
  const geo = normalizePoiGeo(poi);
  const content = normalizePoiContent(poi);
  const access = normalizePoiAccess(poi);
  return {
    ...poi,
    poiV2: {
      hierarchy: { ...DEFAULT_POI_HIERARCHY, ...hierarchy },
      geo,
      content: { ...DEFAULT_POI_CONTENT, ...content },
      access: { ...DEFAULT_POI_ACCESS, ...access },
      dm: poi?.poiV2?.dm || poi?.dm || { notes: "", spoilers: [] },
    },
  };
}

function normalizePoisClient(pois = []) {
  return (Array.isArray(pois) ? pois : []).map((poi) => normalizePoiClient(poi));
}

const getPoiHierarchy = (poi = {}) => normalizePoiClient(poi).poiV2.hierarchy;
const getPoiGeo = (poi = {}) => normalizePoiClient(poi).poiV2.geo;
const getPoiContent = (poi = {}) => normalizePoiClient(poi).poiV2.content;
const getPoiAccess = (poi = {}) => normalizePoiClient(poi).poiV2.access;
const getPoiName = (poi = {}) => poi?.name || poi?.id || "";

export {
  normalizePoiClient,
  normalizePoisClient,
  getPoiHierarchy,
  getPoiGeo,
  getPoiContent,
  getPoiAccess,
  getPoiName,
};
