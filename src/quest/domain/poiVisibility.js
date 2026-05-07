const HIDDEN_POI_STATUSES = new Set(['hidden', 'oculto', 'oculta', 'invisible']);

const normalizePoiVisibilityStatus = (value) => String(value || '').trim().toLowerCase();

const isVisiblePoi = (poi = {}) => {
  const status = normalizePoiVisibilityStatus(poi.status || poi.visibility || poi.state);
  if (!status) return true;
  return !HIDDEN_POI_STATUSES.has(status);
};

const filterVisiblePois = (pois = []) => (Array.isArray(pois) ? pois : []).filter(isVisiblePoi);

export { filterVisiblePois, isVisiblePoi, normalizePoiVisibilityStatus };
