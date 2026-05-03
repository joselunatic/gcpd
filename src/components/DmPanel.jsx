import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../css/DmPanel.styles.css';
import PoiSelector from './dm/PoiList';
import PoiPreview from './dm/PoiPreview';
import PoiEditor from './dm/PoiEditor';
import PoiMapPicker from './dm/PoiMapPicker';
import PoiPicker from './dm/PoiPicker';
import PoiQuickCreateModal from './dm/PoiQuickCreateModal';
import PoiRelationEditor from './dm/PoiRelationEditor';

const CASES_ENDPOINT = '/api/cases-data';
const POIS_ENDPOINT = '/api/pois-data';
const VILLAINS_ENDPOINT = '/api/villains-data';
const AUTH_ENDPOINT = '/api/auth';
const CAMPAIGN_ENDPOINT = '/api/campaign-state';
const GLOBAL_COMMANDS_ENDPOINT = '/api/global-commands';
const EVIDENCE_ENDPOINT = '/api/evidence';
const EVIDENCE_UPLOAD_ENDPOINT = '/api/evidence-upload';
const BALLISTICS_ENDPOINT = '/api/ballistics';
const BALLISTICS_UPLOAD_ENDPOINT = '/api/ballistics-upload';
const BALLISTICS_ASSETS_ENDPOINT = '/api/ballistics-assets';
const AUDIO_ENDPOINT = '/api/audio';
const AUDIO_UPLOAD_ENDPOINT = '/api/audio-upload';
const PHONE_LINES_ENDPOINT = '/api/phone-lines';
const PHONE_LINES_UPLOAD_ENDPOINT = '/api/phone-lines-upload';
const POI_IMAGE_UPLOAD_ENDPOINT = '/api/poi-image-upload';
const POI_RESOURCE_UPLOAD_ENDPOINT = '/api/poi-resource-upload';
const TRACER_CONFIG_ENDPOINT = '/api/tracer-config';

const initialCaseForm = {
  id: '',
  title: '',
  status: 'active',
  summary: '',
  tags: '',
  accessVisibility: 'listed',
  accessUnlockMode: 'none',
  accessPassword: '',
  accessPrerequisites: '',
  accessFlags: '',
  accessAutoUnlockOn: 'resolve',
  accessInitialStatus: 'locked',
  menuAlias: '',
  nodeType: 'mixed',
  parentId: '',
  locationPoiId: '',
  relatedLocationPois: '',
  category: 'cases',
  brief: '',
  intel: '',
  puzzleType: 'sudoku',
  puzzleConfig: '{\n  "seed": 12345\n}',
  dmNotes: '',
  dmSpoilers: '',
};

const initialPoiQuickDraft = {
  name: '',
  district: '',
  mapX: '',
  mapY: '',
  mapRadius: '1.6',
  mapLabel: '',
};

const defaultAccessConfig = {
  visibility: 'listed',
  unlockMode: 'none',
  password: '',
  prerequisites: [],
  requiredFlags: [],
  autoUnlockOn: 'resolve',
  initialAccessStatus: 'locked',
};

const VILLAIN_ATTRIBUTE_FIELDS = [
  { key: 'alias', label: 'Alias', group: 'Primarios' },
  { key: 'realName', label: 'Nombre real', group: 'Primarios' },
  { key: 'summary', label: 'Resumen', group: 'Primarios' },
  { key: 'status', label: 'Estado', group: 'Primarios' },
  { key: 'species', label: 'Especie', group: 'Opcionales' },
  { key: 'age', label: 'Edad', group: 'Opcionales' },
  { key: 'height', label: 'Altura', group: 'Opcionales' },
  { key: 'weight', label: 'Peso', group: 'Opcionales' },
  { key: 'threatLevel', label: 'Nivel de amenaza', group: 'Opcionales' },
  { key: 'lastSeen', label: 'Ultima vez visto', group: 'Opcionales' },
  { key: 'patterns', label: 'Patrones', group: 'Opcionales' },
  { key: 'knownAssociates', label: 'Asociados conocidos', group: 'Opcionales' },
  { key: 'notes', label: 'Notas', group: 'Opcionales' },
];

const buildAttributeAccessForm = (attributes = {}) => {
  const result = {};
  VILLAIN_ATTRIBUTE_FIELDS.forEach(({ key }) => {
    const raw = attributes?.[key] || {};
    result[key] = {
      visibility: raw.visibility || defaultAccessConfig.visibility,
      unlockMode: raw.unlockMode || defaultAccessConfig.unlockMode,
      password: raw.password || '',
      phrase: raw.phrase || '',
      initialAccessStatus:
        raw.initialAccessStatus || defaultAccessConfig.initialAccessStatus,
    };
  });
  return result;
};

const buildAttributeAccessPayload = (formAttributes = {}, existing = {}) => {
  const result = {};
  VILLAIN_ATTRIBUTE_FIELDS.forEach(({ key }) => {
    const existingConfig =
      existing && typeof existing[key] === 'object' ? existing[key] : {};
    const formConfig = formAttributes[key] || {};
    const merged = {
      ...defaultAccessConfig,
      ...existingConfig,
      ...formConfig,
    };
    merged.password =
      merged.unlockMode === 'password' ? formConfig.password || merged.password : '';
    merged.phrase = formConfig.phrase || merged.phrase || '';
    result[key] = merged;
  });
  return result;
};

const normalizeAccessMatrix = (matrix = {}, existing = {}) => {
  const result = {};
  VILLAIN_ATTRIBUTE_FIELDS.forEach(({ key }) => {
    const current = matrix[key] || {};
    const previous = existing && typeof existing[key] === 'object' ? existing[key] : {};
    const visibility =
      current.visibility || previous.visibility || defaultAccessConfig.visibility;
    const initialAccessStatus =
      current.initialAccessStatus ||
      previous.initialAccessStatus ||
      defaultAccessConfig.initialAccessStatus;
    const password = current.password || '';
    const phrase = current.phrase || '';
    let unlockMode = current.unlockMode || previous.unlockMode || 'none';
    if (password) {
      unlockMode = 'password';
    } else if (unlockMode === 'password') {
      unlockMode = 'none';
    }
    result[key] = {
      ...previous,
      visibility,
      unlockMode,
      password,
      phrase,
      initialAccessStatus,
    };
  });
  return result;
};

const VISIBILITY_OPTIONS = [
  { value: 'hidden', label: 'Oculto' },
  { value: 'listed', label: 'Listado bloqueado' },
  { value: 'public', label: 'Visible publico' },
];

const UNLOCK_MODE_OPTIONS = [
  { value: 'none', label: 'Ninguno' },
  { value: 'password', label: 'Contraseña' },
  { value: 'puzzle', label: 'Puzzle' },
  { value: 'chain', label: 'Cadena' },
  { value: 'conditional', label: 'Condicion' },
];

const AUTO_UNLOCK_OPTIONS = [
  { value: 'resolve', label: 'Al resolver' },
  { value: 'view', label: 'Al ver' },
  { value: 'manual', label: 'Manual' },
];

const INITIAL_STATUS_OPTIONS = [
  { value: 'locked', label: 'Bloqueado' },
  { value: 'unlocked', label: 'Desbloqueado' },
];

const NODE_TYPE_OPTIONS = [
  { value: 'container', label: 'Contenedor (submenu)' },
  { value: 'mixed', label: 'Mixto (info + submenu)' },
  { value: 'leaf', label: 'Hoja (solo info)' },
];

const POI_RESOURCE_TYPES = ['image', 'video', 'audio', 'document'];
const POI_RESOURCE_VISIBILITIES = ['listed', 'public', 'hidden'];

const CASE_LOCATION_ROLE_OPTIONS = [
  { value: 'related', label: 'Relacionado' },
  { value: 'crime_scene', label: 'Escena del crimen' },
  { value: 'analysis', label: 'Análisis' },
  { value: 'last_seen', label: 'Último avistamiento' },
  { value: 'suspect_hideout', label: 'Refugio sospechoso' },
  { value: 'operation', label: 'Operación' },
];

const VILLAIN_LOCATION_ROLE_OPTIONS = [
  { value: 'related', label: 'Relacionado' },
  { value: 'hideout', label: 'Refugio' },
  { value: 'territory', label: 'Territorio' },
  { value: 'last_seen', label: 'Último avistamiento' },
  { value: 'operation', label: 'Operación' },
  { value: 'contact_point', label: 'Punto de contacto' },
];

const STORAGE_KEYS = {
  mode: 'dmPanelMode',
  activeView: 'dmPanelActiveView',
  selections: 'dmPanelSelections',
  preview: 'dmPanelPreview',
  help: 'dmPanelHelp',
  tree: 'dmPanelTree',
};

const readStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ?? fallback;
  } catch (error) {
    return fallback;
  }
};

const readJsonStorage = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const persistStorage = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.debug(`Storage unavailable for ${key}`, error);
  }
};

const initialPoiForm = {
  id: '',
  name: '',
  district: '',
  status: 'activo',
  summary: '',
  details: '',
  nodeType: 'mixed',
  parentId: '',
  category: 'map',
  mapX: '',
  mapY: '',
  mapRadius: '1.6',
  mapLabel: '',
  mapImage: '',
  resources: [],
};

const initialEvidenceForm = {
  id: '',
  label: '',
  command: '',
  stlPath: '',
};

const initialBallisticsForm = {
  id: '',
  label: '',
  assetId: '',
  pngPath: '',
  caliber: '',
  material: '',
  bulletId: '',
  caseId: '',
  caseCode: '',
  poiId: '',
  crime: '',
  location: '',
  status: '',
  closedBy: '',
};

const initialAudioForm = {
  id: '',
  title: '',
  originalSrc: '',
  garbledSrc: '',
  isGarbled: false,
  passwordHash: '',
};

const initialPhoneForm = {
  id: '',
  number: '',
  label: '',
  audioId: '',
  rellamable: false,
  llamado: false,
};

const initialTracerHotspotForm = {
  id: '',
  label: '',
  poiId: '',
  x: '50',
  y: '50',
};

const initialTracerLineForm = {
  id: '',
  number: '',
  label: '',
  hotspotId: '',
  enabled: true,
};

const initialVillainForm = {
  id: '',
  alias: '',
  realName: '',
  species: '',
  age: '',
  height: '',
  weight: '',
  threatLevel: '',
  status: '',
  summary: '',
  lastSeen: '',
  patterns: '',
  knownAssociates: '',
  notes: '',
  nodeType: 'mixed',
  parentId: '',
  locationPoiId: '',
  relatedLocationPois: '',
  category: 'villains',
  attributeAccess: buildAttributeAccessForm(),
};

const splitList = (value = '') =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const deriveAssetId = (pathValue = '') => {
  const trimmed = String(pathValue || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split('/').filter(Boolean);
  const file = parts[parts.length - 1] || '';
  return file.replace(/\.png$/i, '');
};

const drawBallisticsStriations = (ctx, width, height) => {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = 'rgba(120, 255, 180, 0.55)';
  ctx.lineWidth = 1;
  for (let y = -height; y < height * 2; y += 8) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y + width * 0.18);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.2;
  ctx.strokeStyle = 'rgba(70, 200, 120, 0.35)';
  for (let x = 0; x < width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - height * 0.25, height);
    ctx.stroke();
  }
  ctx.restore();
};

const renderBallisticsPreview = (canvas, img, side) => {
  if (!canvas || !img) return;
  const ctx = canvas.getContext('2d');
  const { width, height } = canvas;
  const halfWidth = img.width / 2;
  const sourceX = side === 'left' ? 0 : halfWidth;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#040907';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.drawImage(img, sourceX, 0, halfWidth, img.height, 0, 0, width, height);
  ctx.globalCompositeOperation = 'source-atop';
  drawBallisticsStriations(ctx, width, height);
  ctx.restore();

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#79ffb5';
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const splitLines = (value = '') =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

const VIEW_OPTIONS = [
  { id: 'cases', label: 'Casos' },
  { id: 'pois', label: 'POIs' },
  { id: 'villains', label: 'Villanos' },
  { id: 'evidence', label: 'Evidencias' },
  { id: 'tracer', label: 'Tracer' },
  { id: 'access', label: 'Accesos' },
  { id: 'campaign', label: 'Campaña' },
];

const MAP_IMAGE = '/mapa.png';
const MAP_ASPECT_RATIO = 0.744;
const MAP_GRID_STEP = 1;
const POI_IMAGE_ASPECT = 16 / 9;

const clampNumber = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num)) return '';
  return String(Math.max(0, Math.min(100, num)));
};

const accessToFormFields = (access = {}) => {
  const config = { ...defaultAccessConfig, ...(access || {}) };
  return {
    accessVisibility: config.visibility,
    accessUnlockMode: config.unlockMode,
    accessPassword: config.password || '',
    accessPrerequisites: (config.prerequisites || []).join(', '),
    accessFlags: (config.requiredFlags || []).join(', '),
    accessAutoUnlockOn: config.autoUnlockOn,
    accessInitialStatus: config.initialAccessStatus,
  };
};

const formFieldsToAccess = (form) => ({
  visibility: form.accessVisibility,
  unlockMode: form.accessUnlockMode,
  password: form.accessUnlockMode === 'password' ? form.accessPassword : '',
  prerequisites: splitList(form.accessPrerequisites),
  requiredFlags: splitList(form.accessFlags),
  autoUnlockOn: form.accessAutoUnlockOn,
  initialAccessStatus: form.accessInitialStatus,
});

const parseLocationRefsText = (value = '') =>
  String(value || '')
    .split('\n')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [rawPoiId, rawRole] = entry.split('|').map((part) => part.trim());
      if (!rawPoiId) return null;
      return {
        type: 'poi',
        poiId: rawPoiId,
        role: rawRole || 'related',
      };
    })
    .filter(Boolean);

const formatLocationRefsText = (refs = []) =>
  refs
    .filter((entry) => entry?.poiId && entry.role !== 'primary')
    .map((entry) => `${entry.poiId}${entry.role ? ` | ${entry.role}` : ''}`)
    .join('\n');

const commandsToFormFields = (commands = {}, defaults = { category: '' }) => ({
  brief: (commands?.brief || []).join('\n'),
  nodeType: commands?.nodeType || 'mixed',
  parentId: commands?.parentId || '',
  locationPoiId:
    (commands?.locationRefs || []).find((entry) => entry?.type === 'poi' && entry?.role === 'primary')
      ?.poiId ||
    (commands?.locationRefs || []).find((entry) => entry?.type === 'poi')?.poiId ||
    (commands?.locationRef?.type === 'poi' ? commands.locationRef.poiId || '' : ''),
  relatedLocationPois: formatLocationRefsText(commands?.locationRefs || []),
  category: commands?.category || defaults.category,
});

const formFieldsToCommands = (form, defaults = { category: '' }, existing = {}) => {
  const next = {
    ...existing,
    brief: splitLines(form.brief),
    nodeType: form.nodeType,
    parentId: form.parentId,
    category: form.category || defaults.category,
  };
  if ((form.category || defaults.category) === 'cases' || (form.category || defaults.category) === 'villains') {
    const primary = form.locationPoiId
      ? [{ type: 'poi', poiId: form.locationPoiId, role: 'primary' }]
      : [];
    const related = parseLocationRefsText(form.relatedLocationPois);
    const locationRefs = [...primary, ...related].filter(Boolean);
    const seen = new Set();
    next.locationRefs = locationRefs.filter((entry) => {
      const key = `${entry.type}:${entry.poiId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    next.locationRef = null;
    return next;
  }
  next.locationRef = form.locationPoiId
    ? {
        type: 'poi',
        poiId: form.locationPoiId,
      }
    : null;
  return next;
};

const stateToFormFields = (state) => ({
  flags: (state?.flags || []).join('\n'),
  unlockedModules: (state?.unlocked?.cases || []).join('\n'),
  unlockedMap: (state?.unlocked?.map || []).join('\n'),
  unlockedVillains: (state?.unlocked?.villains || []).join('\n'),
  alertLevel: state?.alertLevel || 'low',
  activeCaseId: state?.activeCaseId || '',
});

const formFieldsToState = (form, baseState = {}) => ({
  ...baseState,
  flags: splitLines(form.flags),
  unlocked: {
    cases: splitLines(form.unlockedModules),
    map: splitLines(form.unlockedMap),
    villains: splitLines(form.unlockedVillains),
  },
  alertLevel: form.alertLevel || 'low',
  activeCaseId: form.activeCaseId || '',
});

const getPoiHierarchy = (poi = {}) => poi?.poiV2?.hierarchy || {};

const getPoiGeo = (poi = {}) => poi?.poiV2?.geo || null;

const getPoiContent = (poi = {}) => poi?.poiV2?.content || {};

const inferPoiResourceType = (resource = {}) => {
  const explicit = String(resource.type || '').toLowerCase();
  if (POI_RESOURCE_TYPES.includes(explicit)) return explicit;
  const src = String(resource.src || resource.url || resource.path || '').toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(src)) return 'image';
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/.test(src)) return 'video';
  if (/\.(mp3|wav|ogg|m4a)(\?|#|$)/.test(src)) return 'audio';
  return 'document';
};

const normalizePoiResourceVisibility = (visibility = '', visible = true) => {
  if (visible === false) return 'hidden';
  const value = String(visibility || '').toLowerCase();
  return POI_RESOURCE_VISIBILITIES.includes(value) ? value : 'listed';
};

const buildPoiResourceId = () => `poi-resource-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const normalizePoiResourceForForm = (entry = {}, index = 0) => {
  const src = entry.src || entry.url || entry.path || entry.href || entry.file || '';
  const type = inferPoiResourceType({ ...entry, src });
  const visibility = normalizePoiResourceVisibility(entry.visibility, entry.visible);
  const label =
    entry.label ||
    entry.title ||
    entry.name ||
    (src ? src.split('/').pop() : `${type} ${index + 1}`);
  const sortValue = entry.sort ?? entry.order ?? index;
  const sort = Number(sortValue);
  return {
    id: entry.id || entry.resourceId || entry.assetId || buildPoiResourceId(),
    type,
    label,
    title: entry.title || label,
    description: entry.description || entry.summary || entry.caption || entry.notes || '',
    src,
    thumbnail: entry.thumbnail || entry.poster || entry.preview || '',
    poster: entry.poster || entry.thumbnail || '',
    visibility,
    visible: visibility !== 'hidden',
    sort: Number.isFinite(sort) ? sort : index,
  };
};

const getPoiResources = (poi = {}) => {
  const resources = [
    poi.resources,
    poi.media,
    poi.attachments,
    poi.assets,
    poi.commands?.resources,
    poi.commands?.media,
    poi.poiV2?.resources,
    poi.poiV2?.media,
  ]
    .flat()
    .filter(Boolean);

  const seen = new Set();
  return resources
    .map((entry) => (typeof entry === 'string' ? { src: entry } : entry))
    .map((entry, index) => normalizePoiResourceForForm(entry, index))
    .filter((entry) => {
      const key = entry.id || entry.src;
      if (!key) return false;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(a.sort ?? 0) - Number(b.sort ?? 0));
};

const formResourcesToPoiResources = (resources = []) =>
  resources
    .map((entry, index) => normalizePoiResourceForForm(entry, index))
    .filter((entry) => entry.src || entry.label || entry.description)
    .map((entry, index) => {
      const visibility = normalizePoiResourceVisibility(entry.visibility, entry.visible);
      return {
        id: entry.id,
        type: inferPoiResourceType(entry),
        label: entry.label || entry.title || `Recurso ${index + 1}`,
        title: entry.title || entry.label || `Recurso ${index + 1}`,
        description: entry.description || '',
        src: entry.src || '',
        thumbnail: entry.thumbnail || '',
        poster: entry.poster || entry.thumbnail || '',
        visibility,
        visible: visibility !== 'hidden',
        sort: index,
        order: index,
      };
    });

const poiToFormFields = (data) => {
  const hierarchy = getPoiHierarchy(data);
  const geo = getPoiGeo(data) || {};
  const content = getPoiContent(data);
  return {
    id: data?.id || '',
    name: data?.name || '',
    district: data?.district || '',
    status: data?.status || 'activo',
    summary: data?.summary || '',
    details: (content.details || []).join('\n'),
    nodeType: hierarchy.nodeType || 'mixed',
    parentId: hierarchy.parentId || '',
    category: hierarchy.category || 'map',
    mapX: geo.x != null ? String(geo.x) : '',
    mapY: geo.y != null ? String(geo.y) : '',
    mapRadius: geo.radius != null ? String(geo.radius) : '1.6',
    mapLabel: geo.label || '',
    mapImage: geo.image || '',
    resources: getPoiResources(data),
  };
};

const formFieldsToPoiV2 = (form, existing = null) => {
  const previous = existing && typeof existing === 'object' ? existing : {};
  const previousContent =
    previous.content && typeof previous.content === 'object' ? previous.content : {};
  return {
    hierarchy: {
      ...(previous.hierarchy && typeof previous.hierarchy === 'object' ? previous.hierarchy : {}),
      nodeType: form.nodeType,
      parentId: form.parentId,
      category: form.category || 'map',
    },
    geo:
      form.mapX !== '' || form.mapY !== '' || form.mapLabel || form.mapImage
        ? {
            mapId:
              previous.geo && typeof previous.geo === 'object' && previous.geo?.mapId
                ? previous.geo.mapId
                : 'gotham',
            x: form.mapX !== '' ? Number(form.mapX) : null,
            y: form.mapY !== '' ? Number(form.mapY) : null,
            radius: form.mapRadius !== '' ? Number(form.mapRadius) : 1.6,
            label: form.mapLabel || form.name || '',
            image: form.mapImage || '',
          }
        : null,
    content: {
      details: splitLines(form.details),
      contacts: Array.isArray(previousContent.contacts) ? previousContent.contacts : [],
      notes: Array.isArray(previousContent.notes) ? previousContent.notes : [],
      brief: Array.isArray(previousContent.brief) ? previousContent.brief : [],
      intel: Array.isArray(previousContent.intel) ? previousContent.intel : [],
    },
    access:
      previous.access && typeof previous.access === 'object' ? previous.access : null,
    dm: previous.dm && typeof previous.dm === 'object' ? previous.dm : null,
    resources: formResourcesToPoiResources(form.resources),
    media: formResourcesToPoiResources(form.resources),
  };
};

const normalizeUnlockedAttributes = (state = {}) => {
  const unlockedAttributes = state?.unlockedAttributes || {};
  return {
    cases:
      typeof unlockedAttributes?.cases === 'object' && unlockedAttributes.cases
        ? unlockedAttributes.cases
        : {},
    map:
      typeof unlockedAttributes?.map === 'object' && unlockedAttributes.map
        ? unlockedAttributes.map
        : {},
    villains:
      typeof unlockedAttributes?.villains === 'object' && unlockedAttributes.villains
        ? unlockedAttributes.villains
        : {},
  };
};

const labelRow = (label, tooltip) => (
  <span className="dm-panel__label-row">
    <span>{label}</span>
    {tooltip && (
      <span className="dm-panel__tooltip wopr-tooltip-anchor" tabIndex="0" data-tooltip={tooltip}>
        ?
      </span>
    )}
    {tooltip && <span className="dm-panel__help-inline">{tooltip}</span>}
  </span>
);

const basicLabel = (label, tooltip) => (
  <span className="dm-panel__label-row dm-panel__label-row--basic">
    <span>{label}</span>
    {tooltip && (
      <span className="dm-panel__tooltip wopr-tooltip-anchor" tabIndex="0" data-tooltip={tooltip}>
        ?
      </span>
    )}
  </span>
);

const renderSection = ({ id, title, open, onToggle, help, children }) => (
  <div className={`dm-panel__accordion ${open ? 'open' : ''}`} key={id}>
    <button type="button" className="dm-panel__accordion-toggle" onClick={onToggle}>
      <span>{title}</span>
      <span className="dm-panel__accordion-icon">{open ? '▾' : '▸'}</span>
    </button>
    {open && (
      <div className="dm-panel__accordion-body">
        {help && <div className="dm-panel__callout">{help}</div>}
        {children}
      </div>
    )}
  </div>
);

const getNodeLabel = (item) =>
  item?.poiV2?.hierarchy?.menuAlias ||
  item.title ||
  item.name ||
  item.alias ||
  item.id;

const resolveParentId = (item, scope) => {
  const explicit = item?.poiV2?.hierarchy?.parentId;
  if (explicit) return explicit;
  const prefixMap = {
    cases: 'case:',
    map: 'poi:',
    villains: 'villain:',
  };
  const prefix = prefixMap[scope] || 'case:';
  const prefixes = scope === 'cases' ? [prefix, 'module:'] : [prefix];
  const prereq = (item?.unlockConditions?.prerequisites || []).find((entry) =>
    typeof entry === 'string' ? prefixes.some((candidate) => entry.startsWith(candidate)) : false
  );
  if (prereq) {
    const matched = prefixes.find((candidate) => prereq.startsWith(candidate));
    return matched ? prereq.replace(matched, '') : prereq.replace(prefix, '');
  }
  return '';
};

const buildNavigationTree = (items, scope = 'cases') => {
  const grouped = items.reduce((acc, item) => {
    const parentId = resolveParentId(item, scope);
    if (!acc[parentId]) acc[parentId] = [];
    acc[parentId].push(item);
    return acc;
  }, {});

  const build = (parentId = '', depth = 0, visited = new Set()) => {
    if (depth > 25 || visited.has(parentId)) return [];
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
};

const DmPanel = () => {
  const [passwordInput, setPasswordInput] = useState('');
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionToken, setSessionToken] = useState(
    () => localStorage.getItem('dmSessionToken') || ''
  );
  const [sessionInfo, setSessionInfo] = useState(null);
  const [activeView, setActiveView] = useState(
    () => readStorage(STORAGE_KEYS.activeView, 'cases')
  );
  const [editorMode] = useState(() => readStorage(STORAGE_KEYS.mode, 'operation'));
  const [openSections, setOpenSections] = useState({});
  const [previewByView, setPreviewByView] = useState(
    () => readJsonStorage(STORAGE_KEYS.preview, {})
  );
  const [advancedByView, setAdvancedByView] = useState({});
  const [helpMode] = useState(() => readStorage(STORAGE_KEYS.help, 'off') === 'on');
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1280)
  );
  const [selectionState, setSelectionState] = useState(
    () => readJsonStorage(STORAGE_KEYS.selections, {})
  );
  const setSelection = (view, id) => {
    setSelectionState((prev) => ({
      ...prev,
      [view]: id || '',
    }));
  };
  const [previewBriefOpen, setPreviewBriefOpen] = useState(false);
  const [caseTypeOverride, setCaseTypeOverride] = useState(null);

  const [cases, setCases] = useState([]);
  const [casesError, setCasesError] = useState('');
  const [selectedCase, setSelectedCase] = useState(null);
  const [caseForm, setCaseForm] = useState(initialCaseForm);
  const [caseMessage, setCaseMessage] = useState('');
  const [caseBaseline, setCaseBaseline] = useState(JSON.stringify(initialCaseForm));
  const [caseSaveState, setCaseSaveState] = useState({ status: 'idle', at: null });
  const [caseDraftActive, setCaseDraftActive] = useState(false);

  const [pois, setPois] = useState([]);
  const [poisError, setPoisError] = useState('');
  const [selectedPoi, setSelectedPoi] = useState(null);
  const [poiForm, setPoiForm] = useState(initialPoiForm);
  const [poiMessage, setPoiMessage] = useState('');
  const [poiBaseline, setPoiBaseline] = useState(JSON.stringify(initialPoiForm));
  const [poiSaveState, setPoiSaveState] = useState({ status: 'idle', at: null });
  const [poiRecents, setPoiRecents] = useState([]);
  const [poiImageFile, setPoiImageFile] = useState(null);
  const [poiImageUploading, setPoiImageUploading] = useState(false);
  const [poiImagePreview, setPoiImagePreview] = useState('');
  const [poiImageError, setPoiImageError] = useState('');
  const [poiResourceUploadingId, setPoiResourceUploadingId] = useState('');
  const [poiResourceUploadError, setPoiResourceUploadError] = useState('');
  const [poiCropZoom, setPoiCropZoom] = useState(1.2);
  const [poiCropOffset, setPoiCropOffset] = useState({ x: 0, y: 0 });
  const [poiCropDragging, setPoiCropDragging] = useState(false);
  const [poiCropOpen, setPoiCropOpen] = useState(false);
  const [poiQuickCreateOpen, setPoiQuickCreateOpen] = useState(false);
  const [poiQuickCreateDraft, setPoiQuickCreateDraft] = useState(initialPoiQuickDraft);
  const [poiQuickCreateSaving, setPoiQuickCreateSaving] = useState(false);
  const [poiQuickCreateError, setPoiQuickCreateError] = useState('');
  const poiImageInputRef = useRef(null);
  const cropFrameRef = useRef(null);
  const cropImageRef = useRef(null);

  const [villains, setVillains] = useState([]);
  const [villainsError, setVillainsError] = useState('');
  const [selectedVillain, setSelectedVillain] = useState(null);
  const [villainForm, setVillainForm] = useState(initialVillainForm);
  const [villainMessage, setVillainMessage] = useState('');
  const [villainBaseline, setVillainBaseline] = useState(
    JSON.stringify(initialVillainForm)
  );
  const [villainSaveState, setVillainSaveState] = useState({ status: 'idle', at: null });
  const [accessVillainId, setAccessVillainId] = useState(
    () => readJsonStorage(STORAGE_KEYS.selections, {}).access || ''
  );
  const [accessMatrix, setAccessMatrix] = useState(buildAttributeAccessForm());
  const [accessBaseline, setAccessBaseline] = useState(
    JSON.stringify(buildAttributeAccessForm())
  );
  const [accessMessage, setAccessMessage] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);

  const [campaignSnapshot, setCampaignSnapshot] = useState(null);
  const [campaignForm, setCampaignForm] = useState({
    flags: '',
    unlockedModules: '',
    unlockedMap: '',
    unlockedVillains: '',
    alertLevel: 'low',
    activeCaseId: '',
  });
  const [campaignMessage, setCampaignMessage] = useState('');
  const [campaignLoading, setCampaignLoading] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [globalCommandsText, setGlobalCommandsText] = useState('[]');
  const [globalCommandsMessage, setGlobalCommandsMessage] = useState('');
  const [globalCommandsLoading, setGlobalCommandsLoading] = useState(false);
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [evidenceForm, setEvidenceForm] = useState(initialEvidenceForm);
  const [evidenceProfile, setEvidenceProfile] = useState('default');
  const [evidencePreviewNonce, setEvidencePreviewNonce] = useState(0);
  const [evidenceMessage, setEvidenceMessage] = useState('');
  const [evidenceLoading, setEvidenceLoading] = useState(false);
  const [evidenceUploading, setEvidenceUploading] = useState(false);
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [evidenceTab, setEvidenceTab] = useState('stl');
  const [ballisticsModels, setBallisticsModels] = useState([]);
  const [ballisticsForm, setBallisticsForm] = useState(initialBallisticsForm);
  const [ballisticsMessage, setBallisticsMessage] = useState('');
  const [ballisticsLoading, setBallisticsLoading] = useState(false);
  const [ballisticsAssets, setBallisticsAssets] = useState([]);
  const [ballisticsAssetsLoading, setBallisticsAssetsLoading] = useState(false);
  const [ballisticsUploading, setBallisticsUploading] = useState(false);
  const [ballisticsFile, setBallisticsFile] = useState(null);
  const [audioModels, setAudioModels] = useState([]);
  const [audioForm, setAudioForm] = useState(initialAudioForm);
  const [audioMessage, setAudioMessage] = useState('');
  const [audioLoading, setAudioLoading] = useState(false);
  const [audioUploading, setAudioUploading] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [audioGarble, setAudioGarble] = useState(false);
  const [audioPassword, setAudioPassword] = useState('');
  const [phoneLines, setPhoneLines] = useState([]);
  const [phoneForm, setPhoneForm] = useState(initialPhoneForm);
  const [phoneMessage, setPhoneMessage] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneUploading, setPhoneUploading] = useState(false);
  const [phoneFile, setPhoneFile] = useState(null);
  const [tracerLines, setTracerLines] = useState([]);
  const [tracerHotspots, setTracerHotspots] = useState([]);
  const [tracerLineForm, setTracerLineForm] = useState(initialTracerLineForm);
  const [tracerHotspotForm, setTracerHotspotForm] = useState(initialTracerHotspotForm);
  const [tracerLoading, setTracerLoading] = useState(false);
  const [tracerMessage, setTracerMessage] = useState('');
  const [tracerMapExpanded, setTracerMapExpanded] = useState(false);
  const evidencePreviewRef = useRef(null);
  const evidenceViewerRef = useRef(null);
  const evidenceMeshRef = useRef(null);
  const evidenceMaterialRef = useRef(null);
  const evidenceAxisCleanupRef = useRef(null);
  const ballisticsPreviewLeftRef = useRef(null);
  const ballisticsPreviewRightRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [transientNotice, setTransientNotice] = useState(null);
  const noticeTrackerRef = useRef({});

  const caseTree = useMemo(() => buildNavigationTree(cases, 'cases'), [cases]);
  const caseTreeWithDraft = useMemo(() => {
    if (!caseDraftActive) return caseTree;
    const draftItem = {
      id: '__draft__',
      title:
        caseForm.title || (caseForm.parentId ? 'Nuevo subcaso' : 'Nuevo caso raiz'),
      status: caseForm.status || 'active',
      unlockConditions: {
        visibility: caseForm.accessVisibility,
        unlockMode: caseForm.accessUnlockMode,
        initialAccessStatus: caseForm.accessInitialStatus,
      },
      commands: {
        parentId: caseForm.parentId || '',
        menuAlias: '',
        nodeType: 'mixed',
        category: 'cases',
      },
    };
    return buildNavigationTree([...cases, draftItem], 'cases');
  }, [
    caseDraftActive,
    caseForm.title,
    caseForm.status,
    caseForm.accessVisibility,
    caseForm.accessUnlockMode,
    caseForm.accessInitialStatus,
    caseForm.parentId,
    cases,
    caseTree,
  ]);
  const poiTree = useMemo(() => buildNavigationTree(pois, 'map'), [pois]);
  const villainTree = useMemo(() => buildNavigationTree(villains, 'villains'), [villains]);

  const [treeState, setTreeState] = useState(
    () => readJsonStorage(STORAGE_KEYS.tree, { cases: {}, pois: {}, villains: {} })
  );

  const caseParentOptions = useMemo(
    () =>
      cases.map((item) => ({
        id: item.id,
        label: getNodeLabel(item),
      })),
    [cases]
  );
  const poiParentOptions = useMemo(
    () =>
      pois.map((item) => ({
        id: item.id,
        label: getNodeLabel(item),
      })),
    [pois]
  );
  const poiLocationOptions = useMemo(
    () =>
      pois.map((item) => ({
        id: item.id,
        label: `${getNodeLabel(item)}${item.district ? ` · ${item.district}` : ''}`,
      })),
    [pois]
  );
  const poiIndex = useMemo(() => new Map(pois.map((item) => [item.id, item])), [pois]);

  const buildPoiIdFromName = useCallback((name = '') => {
    const base = String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40);
    const candidateBase = base || `poi_${Date.now().toString(36)}`;
    let candidate = candidateBase;
    let counter = 2;
    while (poiIndex.has(candidate)) {
      candidate = `${candidateBase}_${counter}`;
      counter += 1;
    }
    return candidate;
  }, [poiIndex]);

  const buildPoiRow = useCallback(
    (item) => ({
      id: item.id,
      label: getNodeLabel(item),
      name: item.name || item.id || '',
      meta: item.district || item.status || '',
    }),
    []
  );

  const addPoiRecent = useCallback((item) => {
    if (!item?.id) return;
    const row = buildPoiRow(item);
    setPoiRecents((prev) => {
      const next = [row, ...prev.filter((entry) => entry.id !== row.id)];
      return next.slice(0, 6);
    });
  }, [buildPoiRow]);

  const openPoiQuickCreate = useCallback((draft = {}) => {
    setPoiQuickCreateDraft({
      ...initialPoiQuickDraft,
      ...draft,
      mapRadius: draft.mapRadius || initialPoiQuickDraft.mapRadius,
    });
    setPoiQuickCreateError('');
    setPoiQuickCreateOpen(true);
  }, []);
  const villainParentOptions = useMemo(
    () =>
      villains.map((item) => ({
        id: item.id,
        label: getNodeLabel(item),
      })),
    [villains]
  );

  const persistToken = useCallback((token) => {
    if (token) {
      localStorage.setItem('dmSessionToken', token);
      setSessionToken(token);
    } else {
      localStorage.removeItem('dmSessionToken');
      setSessionToken('');
    }
  }, []);

  const verifySession = useCallback(
    async (token) => {
      if (!token) {
        setAuthorized(false);
        setSessionInfo(null);
        return;
      }
      try {
        const res = await fetch(`${AUTH_ENDPOINT}/session`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) {
          throw new Error('Sesion no valida');
        }
        const data = await res.json();
        setAuthorized(true);
        setSessionInfo(data);
      } catch (error) {
        setAuthorized(false);
        setSessionInfo(null);
        persistToken('');
      }
    },
    [persistToken]
  );

  useEffect(() => {
    if (sessionToken) {
      verifySession(sessionToken);
    } else {
      setAuthorized(false);
      setSessionInfo(null);
    }
  }, [sessionToken, verifySession]);

  useEffect(() => {
    if (!authorized || !sessionToken) return;
    fetch(CASES_ENDPOINT, { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setCases(data.cases || []);
        setCasesError('');
      })
      .catch((error) => {
        console.error('Load cases error', error);
        setCasesError('No se pudo cargar la lista de casos.');
      });
  }, [authorized, sessionToken]);

  useEffect(() => {
    if (!cases.length) return;
    const storedId = selectionState.cases;
    if (!storedId) return;
    if (selectedCase?.id === storedId) return;
    const match = cases.find((entry) => entry.id === storedId);
    if (match) {
      setSelectedCase(match);
      resetCaseForm(match);
    }
  }, [cases, selectionState.cases, selectedCase?.id]);

  useEffect(() => {
    setPreviewBriefOpen(false);
    setCaseTypeOverride(null);
  }, [caseForm.id]);

  useEffect(() => {
    if (caseForm.parentId) {
      setCaseTypeOverride(null);
    }
  }, [caseForm.parentId]);

  useEffect(() => {
    if (!authorized || !sessionToken) return;
    fetch(`${POIS_ENDPOINT}?includeHidden=1`, { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setPois(data.pois || []);
        setPoisError('');
      })
      .catch((error) => {
        console.error('Load POIs error', error);
        setPoisError('No se pudo cargar la matriz de POIs.');
      });
  }, [authorized, sessionToken]);

  useEffect(() => {
    if (!pois.length) return;
    const storedId = selectionState.pois;
    if (!storedId) return;
    if (selectedPoi?.id === storedId) return;
    const match = pois.find((entry) => entry.id === storedId);
    if (match) {
      setSelectedPoi(match);
      resetPoiForm(match);
      addPoiRecent(match);
    }
  }, [pois, selectionState.pois, selectedPoi?.id]);

  useEffect(() => {
    if (!authorized || !sessionToken) return;
    fetch(VILLAINS_ENDPOINT, { headers: { Authorization: `Bearer ${sessionToken}` } })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        setVillains(data.villains || []);
        setVillainsError('');
      })
      .catch((error) => {
        console.error('Load villains error', error);
        setVillainsError('No se pudo cargar la galeria.');
      });
  }, [authorized, sessionToken]);

  useEffect(() => {
    if (!villains.length) return;
    const storedId = selectionState.villains;
    if (!storedId) return;
    if (selectedVillain?.id === storedId) return;
    const match = villains.find((entry) => entry.id === storedId);
    if (match) {
      setSelectedVillain(match);
      resetVillainForm(match);
    }
  }, [villains, selectionState.villains, selectedVillain?.id]);

  useEffect(() => {
    if (!villains.length) return;
    const storedAccessId = selectionState.access;
    const fallbackId = villains[0]?.id || '';
    const nextId = storedAccessId || accessVillainId || fallbackId;
    if (!nextId) return;
    if (nextId !== accessVillainId) {
      setAccessVillainId(nextId);
    }
  }, [villains, selectionState.access, accessVillainId]);

  useEffect(() => {
    if (!accessVillainId) return;
    const target = villains.find((item) => item.id === accessVillainId);
    if (!target) return;
    const matrix = buildAttributeAccessForm(target.unlockConditions?.attributes || {});
    setAccessMatrix(matrix);
    setAccessBaseline(JSON.stringify(matrix));
  }, [accessVillainId, villains]);

  useEffect(() => {
    if (!accessVillainId) return;
    setSelection('access', accessVillainId);
  }, [accessVillainId]);

  useEffect(() => {
    if (!authorized || !sessionToken) return;
    fetch(CAMPAIGN_ENDPOINT)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const state = data.state || {};
        setCampaignSnapshot(state);
        setCampaignForm(stateToFormFields(state));
      })
      .catch((error) => {
        console.error('Load campaign state error', error);
        setCampaignMessage('No se pudo cargar el estado de campaña.');
      });
  }, [authorized, sessionToken]);

  useEffect(() => {
    if (!authorized || !sessionToken) return;
    fetch(GLOBAL_COMMANDS_ENDPOINT, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const commands = Array.isArray(data?.commands) ? data.commands : [];
        setGlobalCommandsText(JSON.stringify(commands, null, 2));
        setGlobalCommandsMessage('');
      })
      .catch((error) => {
        console.error('Load global commands error', error);
        setGlobalCommandsMessage('No se pudieron cargar los comandos globales.');
      });
  }, [authorized, sessionToken]);

  useEffect(() => {
    if (activeView !== 'evidence') return;
    const container = evidencePreviewRef.current;
    if (!container) return;
    if (!evidenceForm.stlPath) {
      if (evidenceViewerRef.current) {
        evidenceViewerRef.current.dispose();
        evidenceViewerRef.current = null;
      }
      if (evidenceMeshRef.current) {
        evidenceMeshRef.current.geometry.dispose();
        evidenceMeshRef.current = null;
      }
      if (evidenceMaterialRef.current) {
        evidenceMaterialRef.current.dispose();
        evidenceMaterialRef.current = null;
      }
      container.innerHTML = '';
      return;
    }

    let cancelled = false;
    const setup = async () => {
      try {
        const getThemeColors = () => {
          const source =
            document.getElementById('terminal-container') ||
            document.documentElement ||
            document.body;
          if (!source || typeof getComputedStyle !== 'function') return null;
          const styles = getComputedStyle(source);
          const fg =
            styles.getPropertyValue('--fg-primary')?.trim() ||
            styles.getPropertyValue('--color')?.trim();
          const bg =
            styles.getPropertyValue('--bg')?.trim() ||
            styles.getPropertyValue('--background-color')?.trim();
          return { fg, bg };
        };
        const [{ loadThreeModules }, { createAsciiViewer }] = await Promise.all([
          import('../three/AssetManager.js'),
          import('../three/asciiViewer.js'),
        ]);
        const { THREE, AsciiEffect, STLLoader, OrbitControls } = await loadThreeModules();
        if (cancelled) return;

        if (evidenceViewerRef.current) {
          evidenceViewerRef.current.dispose();
          evidenceViewerRef.current = null;
        }
        if (evidenceMeshRef.current) {
          evidenceMeshRef.current.geometry.dispose();
          evidenceMeshRef.current = null;
        }
        if (evidenceMaterialRef.current) {
          evidenceMaterialRef.current.dispose();
          evidenceMaterialRef.current = null;
        }
        container.innerHTML = '';

        const viewer = createAsciiViewer({
          THREE,
          AsciiEffect,
          OrbitControls,
          container,
          profiles: {
            default: {
              label: 'Default',
              characters: ' .:-+*=%@#',
              resolution: 0.2,
              mode: 'ascii',
              flatShading: true,
              roughness: 0.35,
              metalness: 0.1,
              toneMapping: null,
              exposure: 1,
            },
            normal: {
              label: 'Normal',
              characters: ' .:-+*=%@#',
              resolution: 0.2,
              mode: 'render',
              flatShading: true,
              roughness: 0.35,
              metalness: 0.1,
              toneMapping: null,
              exposure: 1,
            },
            wayne90x30: {
              label: 'Wayne 90x30',
              characters: ' .:-+*=%@#',
              resolution: 0.2,
              mode: 'ascii',
              flatShading: false,
              roughness: 0.95,
              metalness: 0,
              toneMapping: 'ACES',
              exposure: 1.0,
            },
          },
          initialProfileKey: evidenceProfile,
          themeSource: document.getElementById('terminal-container') || document.body,
          controlsConfig: {
            enableDamping: true,
            dampingFactor: 0.08,
            enableZoom: true,
            enablePan: true,
            enableRotate: true,
            autoRotate: false,
          },
          onFrame: () => {},
        });
        evidenceViewerRef.current = viewer;
        if (evidenceAxisCleanupRef.current) {
          evidenceAxisCleanupRef.current();
          evidenceAxisCleanupRef.current = null;
        }
        viewer.setProfile(evidenceProfile);

        const { scene, camera, renderer } = viewer;
        camera.position.set(0, 0, 160);

        const ambient = new THREE.AmbientLight(0xffffff, 0.55);
        scene.add(ambient);
        const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(120, 160, 200);
        scene.add(keyLight);
        const fillLight = new THREE.PointLight(0xffffff, 0.9);
        fillLight.position.set(-120, -80, 100);
        scene.add(fillLight);

        const material = new THREE.MeshStandardMaterial({
          color: 0xffffff,
          roughness: 0.35,
          metalness: 0.1,
          flatShading: true,
          side: THREE.DoubleSide,
        });
        evidenceMaterialRef.current = material;
        const applyThemeColors = () => {
          const colors = getThemeColors();
          if (!colors) return;
          if (colors.fg) {
            viewer.setAsciiColor(colors.fg);
            material.color.set(colors.fg);
            ambient.color.set(colors.fg);
            keyLight.color.set(colors.fg);
            fillLight.color.set(colors.fg);
          }
          if (colors.bg) {
            viewer.setBackgroundColor(colors.bg);
          }
        };
        applyThemeColors();
        const handleThemeChange = () => {
          applyThemeColors();
        };
        window.addEventListener('wopr-theme-change', handleThemeChange);

        const loader = new STLLoader();
        const resolvedPath = evidenceForm.stlPath.startsWith('/uploads/')
          ? `/api${evidenceForm.stlPath}`
          : evidenceForm.stlPath;
        loader.load(
          resolvedPath,
          (geometry) => {
            if (cancelled) return;
            geometry.computeVertexNormals();
            geometry.center();
            geometry.computeBoundingBox();
            const mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.set(Math.PI, 0, 0);
            scene.add(mesh);
            evidenceMeshRef.current = mesh;
          },
          undefined,
          () => {
            if (cancelled) return;
            const fallback = new THREE.TorusKnotGeometry(28, 9, 120, 16);
            fallback.computeVertexNormals();
            fallback.center();
            const mesh = new THREE.Mesh(fallback, material);
            mesh.rotation.set(Math.PI, 0, 0);
            scene.add(mesh);
            evidenceMeshRef.current = mesh;
          }
        );

        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        viewer.start();

        const targetEl = viewer.getEffect()?.domElement || renderer.domElement;
        const setupAxisRotate = (el) => {
          if (!el) return () => {};
          let dragging = false;
          let lastX = 0;
          let lastY = 0;
          const speed = 0.005;
          const onPointerDown = (event) => {
            dragging = true;
            lastX = event.clientX;
            lastY = event.clientY;
          };
          const onPointerMove = (event) => {
            if (!dragging || !evidenceMeshRef.current) return;
            const axis = event.ctrlKey ? 'x' : event.shiftKey ? 'y' : event.altKey ? 'z' : '';
            if (!axis) return;
            const dx = event.clientX - lastX;
            const dy = event.clientY - lastY;
            lastX = event.clientX;
            lastY = event.clientY;
            if (axis === 'x') evidenceMeshRef.current.rotation.x += dy * speed;
            if (axis === 'y') evidenceMeshRef.current.rotation.y += dx * speed;
            if (axis === 'z') evidenceMeshRef.current.rotation.z += dx * speed;
            const controls = viewer.getControls();
            if (controls) controls.enableRotate = false;
            event.preventDefault();
            event.stopPropagation();
          };
          const onPointerUp = () => {
            dragging = false;
            const controls = viewer.getControls();
            if (controls) controls.enableRotate = true;
          };
          el.addEventListener('pointerdown', onPointerDown);
          el.addEventListener('pointermove', onPointerMove);
          el.addEventListener('pointerup', onPointerUp);
          el.addEventListener('pointerleave', onPointerUp);
          return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', onPointerUp);
            el.removeEventListener('pointerleave', onPointerUp);
          };
        };

        evidenceAxisCleanupRef.current = setupAxisRotate(targetEl);
        viewer.__themeCleanup = () => {
          window.removeEventListener('wopr-theme-change', handleThemeChange);
        };
      } catch (error) {
        console.error('Evidence preview error', error);
      }
    };

    setup();

    return () => {
      cancelled = true;
      if (evidenceViewerRef.current) {
        if (evidenceViewerRef.current.__themeCleanup) {
          evidenceViewerRef.current.__themeCleanup();
        }
        evidenceViewerRef.current.dispose();
        evidenceViewerRef.current = null;
      }
      if (evidenceMeshRef.current) {
        evidenceMeshRef.current.geometry.dispose();
        evidenceMeshRef.current = null;
      }
      if (evidenceMaterialRef.current) {
        evidenceMaterialRef.current.dispose();
        evidenceMaterialRef.current = null;
      }
      if (evidenceAxisCleanupRef.current) {
        evidenceAxisCleanupRef.current();
        evidenceAxisCleanupRef.current = null;
      }
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [activeView, evidenceForm.stlPath, evidenceProfile, evidencePreviewNonce]);

  useEffect(() => {
    if (activeView !== 'evidence') return;
    if (!evidenceViewerRef.current) return;
    evidenceViewerRef.current.setProfile(evidenceProfile);
    if (evidenceAxisCleanupRef.current) {
      evidenceAxisCleanupRef.current();
      evidenceAxisCleanupRef.current = null;
    }
    const viewer = evidenceViewerRef.current;
    const targetEl = viewer.getEffect()?.domElement || viewer.renderer?.domElement;
    if (targetEl) {
      const setupAxisRotate = (el) => {
        if (!el) return () => {};
        let dragging = false;
        let lastX = 0;
        let lastY = 0;
        const speed = 0.005;
        const onPointerDown = (event) => {
          dragging = true;
          lastX = event.clientX;
          lastY = event.clientY;
        };
        const onPointerMove = (event) => {
          if (!dragging || !evidenceMeshRef.current) return;
          const axis = event.ctrlKey ? 'x' : event.shiftKey ? 'y' : event.altKey ? 'z' : '';
          if (!axis) return;
          const dx = event.clientX - lastX;
          const dy = event.clientY - lastY;
          lastX = event.clientX;
          lastY = event.clientY;
          if (axis === 'x') evidenceMeshRef.current.rotation.x += dy * speed;
          if (axis === 'y') evidenceMeshRef.current.rotation.y += dx * speed;
          if (axis === 'z') evidenceMeshRef.current.rotation.z += dx * speed;
          const controls = viewer.getControls();
          if (controls) controls.enableRotate = false;
          event.preventDefault();
          event.stopPropagation();
        };
        const onPointerUp = () => {
          dragging = false;
          const controls = viewer.getControls();
          if (controls) controls.enableRotate = true;
        };
        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', onPointerUp);
        el.addEventListener('pointerleave', onPointerUp);
        return () => {
          el.removeEventListener('pointerdown', onPointerDown);
          el.removeEventListener('pointermove', onPointerMove);
          el.removeEventListener('pointerup', onPointerUp);
          el.removeEventListener('pointerleave', onPointerUp);
        };
      };
      evidenceAxisCleanupRef.current = setupAxisRotate(targetEl);
    }
  }, [activeView, evidenceProfile]);

  const handleAuthorize = async (event) => {
    event.preventDefault();
    setAuthLoading(true);
    setAuthError('');
    try {
      const res = await fetch(`${AUTH_ENDPOINT}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: passwordInput }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'Error al iniciar sesion.');
      }
      persistToken(data.token);
      setSessionInfo({ valid: true, expiresAt: data.expiresAt });
      setPasswordInput('');
      setAuthError('');
    } catch (error) {
      setAuthError(error.message || 'No se pudo iniciar sesion.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = useCallback(async () => {
    if (!sessionToken) {
      persistToken('');
      setAuthorized(false);
      setSessionInfo(null);
      return;
    }
    try {
      await fetch(`${AUTH_ENDPOINT}/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
    } catch (error) {
      console.debug('Logout cleanup failed', error);
    }
    persistToken('');
    setAuthorized(false);
    setSessionInfo(null);
  }, [persistToken, sessionToken]);

  const resetCaseForm = (data) => {
    if (!data) {
      setCaseForm(initialCaseForm);
      setSelectedCase(null);
      setCaseBaseline(JSON.stringify(initialCaseForm));
      setCaseDraftActive(false);
      return;
    }
    const commandFields = commandsToFormFields(data.commands, { category: 'cases' });
    const nextForm = {
      id: data.id || '',
      title: data.title || '',
      status: data.status || 'active',
      summary: data.summary || '',
      tags: (data.tags || []).join(', '),
      ...accessToFormFields(data.unlockConditions),
      ...commandFields,
      dmNotes: data.dm?.notes || '',
      dmSpoilers: (data.dm?.spoilers || []).join('\n'),
    };
    setCaseForm(nextForm);
    setCaseBaseline(JSON.stringify(nextForm));
    setCaseDraftActive(false);
  };

  const startNewCase = (parentId = '') => {
    const nextForm = {
      ...initialCaseForm,
      parentId: parentId || '',
    };
    setSelectedCase(null);
    setCaseForm(nextForm);
    setCaseBaseline(JSON.stringify(nextForm));
    setCaseDraftActive(true);
  };

  const resetPoiForm = (data) => {
    if (!data) {
      setPoiForm(initialPoiForm);
      setPoiImageFile(null);
      setPoiImagePreview('');
      setPoiImageError('');
      setPoiResourceUploadingId('');
      setPoiResourceUploadError('');
      setPoiCropOffset({ x: 0, y: 0 });
      setPoiCropZoom(1.2);
      setPoiCropOpen(false);
      setSelectedPoi(null);
      setPoiBaseline(JSON.stringify(initialPoiForm));
      return;
    }
    const nextForm = poiToFormFields(data);
    setPoiForm(nextForm);
    setPoiImageFile(null);
    setPoiImagePreview('');
    setPoiImageError('');
    setPoiResourceUploadingId('');
    setPoiResourceUploadError('');
    setPoiCropOffset({ x: 0, y: 0 });
    setPoiCropZoom(1.2);
    setPoiCropOpen(false);
    setPoiBaseline(JSON.stringify(nextForm));
  };

  const handlePoiQuickCreateSave = useCallback(async () => {
    const name = poiQuickCreateDraft.name.trim();
    if (!name) {
      setPoiQuickCreateError('El nombre del POI es obligatorio.');
      return null;
    }
    const x = Number(poiQuickCreateDraft.mapX);
    const y = Number(poiQuickCreateDraft.mapY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      setPoiQuickCreateError('Selecciona una posición válida en el mapa.');
      return null;
    }
    setPoiQuickCreateSaving(true);
    setPoiQuickCreateError('');
    const payload = {
      id: buildPoiIdFromName(name),
      name,
      district: poiQuickCreateDraft.district.trim(),
      status: 'draft',
      summary: '',
      poiV2: {
        hierarchy: {
          nodeType: 'leaf',
          parentId: '',
          menuAlias: '',
          category: 'map',
        },
        geo: {
          mapId: 'gotham',
          x,
          y,
          radius: poiQuickCreateDraft.mapRadius !== '' ? Number(poiQuickCreateDraft.mapRadius) : 1.6,
          label: poiQuickCreateDraft.mapLabel.trim() || name,
          image: '',
        },
        content: {
          details: [],
          contacts: [],
          notes: [],
          brief: [],
          intel: [],
        },
        access: { ...defaultAccessConfig },
        dm: { notes: '', spoilers: [] },
      },
    };
    try {
      const res = await fetch(POIS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo crear el POI.');
      const saved = await res.json();
      setPois((prev) => {
        const others = prev.filter((item) => item.id !== saved.id);
        return [...others, saved];
      });
      setSelectedPoi(saved);
      setSelection('pois', saved.id);
      addPoiRecent(saved);
      setPoiQuickCreateOpen(false);
      setPoiQuickCreateDraft(initialPoiQuickDraft);
      return saved;
    } catch (error) {
      setPoiQuickCreateError(error.message || 'No se pudo crear el POI.');
      return null;
    } finally {
      setPoiQuickCreateSaving(false);
    }
  }, [
    addPoiRecent,
    buildPoiIdFromName,
    poiQuickCreateDraft,
    sessionToken,
    setSelection,
  ]);

  const openPoiFullEditorFromDraft = useCallback((draft = initialPoiQuickDraft) => {
    setPoiQuickCreateOpen(false);
    setActiveView('pois');
    setSelectedPoi(null);
    setSelection('pois', '');
    const nextForm = {
      ...initialPoiForm,
      name: draft.name || '',
      district: draft.district || '',
      mapX: draft.mapX || '',
      mapY: draft.mapY || '',
      mapRadius: draft.mapRadius || '1.6',
      mapLabel: draft.mapLabel || '',
    };
    setPoiForm(nextForm);
    setPoiBaseline(JSON.stringify(nextForm));
  }, [setSelection]);

  const resetVillainForm = (data) => {
    if (!data) {
      setVillainForm(initialVillainForm);
      setSelectedVillain(null);
      setVillainBaseline(JSON.stringify(initialVillainForm));
      return;
    }
    const nextForm = {
      id: data.id || '',
      alias: data.alias || '',
      realName: data.realName || '',
      species: data.species || '',
      age: data.age || '',
      height: data.height || '',
      weight: data.weight || '',
      threatLevel: data.threatLevel || '',
      status: data.status || '',
      summary: data.summary || '',
      lastSeen: data.lastSeen || '',
      patterns: (data.patterns || []).join('\n'),
      knownAssociates: (data.knownAssociates || []).join('\n'),
      notes: (data.notes || []).join('\n'),
      ...commandsToFormFields(data.commands, { category: 'villains' }),
      attributeAccess: buildAttributeAccessForm(data.unlockConditions?.attributes || {}),
    };
    setVillainForm(nextForm);
    setVillainBaseline(JSON.stringify(nextForm));
  };

  const saveCase = async (event) => {
    event.preventDefault();
    setCaseMessage('');
    const existingCommands =
      selectedCase?.commands && typeof selectedCase.commands === 'object'
        ? selectedCase.commands
        : {};
    const existingTags = Array.isArray(selectedCase?.tags) ? selectedCase.tags : [];
    const existingDm =
      selectedCase?.dm && typeof selectedCase.dm === 'object'
        ? selectedCase.dm
        : { notes: '', spoilers: [] };
    const existingUnlock = selectedCase?.unlockConditions || { ...defaultAccessConfig };
    const mergedUnlock = {
      ...existingUnlock,
      ...formFieldsToAccess(caseForm),
    };
    if (existingUnlock?.attributes) {
      mergedUnlock.attributes = existingUnlock.attributes;
    }
    const payload = {
      id: caseForm.id.trim() || `case_${Date.now().toString(36)}`,
      title: caseForm.title,
      status: caseForm.status,
      summary: caseForm.summary,
      tags: existingTags,
      unlockConditions: mergedUnlock,
      commands: formFieldsToCommands(caseForm, { category: 'cases' }, existingCommands),
      dm: existingDm,
    };
    try {
      const res = await fetch(CASES_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo guardar el caso');
      const saved = await res.json();
      setCaseMessage('Caso guardado');
      setCaseSaveState({ status: 'saved', at: Date.now() });
      resetCaseForm(saved);
      setSelectedCase(saved);
      setCases((prev) => {
        const others = prev.filter((c) => c.id !== saved.id);
        return [...others, saved];
      });
    } catch (error) {
      setCaseMessage(error.message);
      setCaseSaveState({ status: 'error', at: Date.now() });
    }
  };

  const deleteCase = async () => {
    if (!selectedCase?.id) return;
    const collectDescendants = (rootId) => {
      const map = new Map();
      cases.forEach((item) => {
        const parentId = item?.commands?.parentId || '';
        if (!parentId) return;
        if (!map.has(parentId)) map.set(parentId, []);
        map.get(parentId).push(item.id);
      });
      const result = new Set();
      const walk = (nodeId) => {
        if (!nodeId || result.has(nodeId)) return;
        result.add(nodeId);
        const children = map.get(nodeId) || [];
        children.forEach((childId) => walk(childId));
      };
      walk(rootId);
      return result;
    };
    const ids = collectDescendants(selectedCase.id);
    const subcaseCount = Math.max(ids.size - 1, 0);
    const confirmLabel = subcaseCount
      ? `Eliminar caso y ${subcaseCount} subcaso(s) de forma permanente?`
      : 'Eliminar caso de forma permanente?';
    if (!window.confirm(confirmLabel)) return;
    try {
      const res = await fetch(`${CASES_ENDPOINT}/${selectedCase.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo eliminar el caso.');
      const deletedIds = Array.isArray(data.deletedIds)
        ? data.deletedIds
        : Array.from(ids);
      const deletedSet = new Set(deletedIds);
      setCases((prev) => prev.filter((item) => !deletedSet.has(item.id)));
      resetCaseForm(null);
      setSelectedCase(null);
      setCaseMessage('Caso eliminado.');
    } catch (error) {
      setCaseMessage(error.message || 'No se pudo eliminar el caso.');
    }
  };

  const savePoi = async (event) => {
    event.preventDefault();
    setPoiMessage('');
    const existingPoiV2 =
      selectedPoi?.poiV2 && typeof selectedPoi.poiV2 === 'object'
        ? selectedPoi.poiV2
        : {
            hierarchy: { nodeType: 'mixed', parentId: '', category: 'map' },
            geo: null,
            content: { details: [], contacts: [], notes: [], brief: [], intel: [] },
            access: { ...defaultAccessConfig },
            dm: { notes: '', spoilers: [] },
          };
    const poiV2 = formFieldsToPoiV2(poiForm, existingPoiV2);
    const payload = {
      id: poiForm.id.trim() || `poi_${Date.now().toString(36)}`,
      name: poiForm.name,
      district: poiForm.district,
      status: poiForm.status,
      summary: poiForm.summary,
      poiV2,
    };
    try {
      const res = await fetch(POIS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo guardar el POI');
      const saved = await res.json();
      setPoiMessage('POI guardado');
      setPoiSaveState({ status: 'saved', at: Date.now() });
      resetPoiForm(saved);
      setSelectedPoi(saved);
      addPoiRecent(saved);
      setPois((prev) => {
        const others = prev.filter((p) => p.id !== saved.id);
        return [...others, saved];
      });
    } catch (error) {
      setPoiMessage(error.message);
      setPoiSaveState({ status: 'error', at: Date.now() });
    }
  };

  const deletePoi = async () => {
    if (!selectedPoi?.id) return;
    if (!window.confirm('Eliminar POI definitivamente?')) return;
    try {
      await fetch(`${POIS_ENDPOINT}/${selectedPoi.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setPois((prev) => prev.filter((item) => item.id !== selectedPoi.id));
      resetPoiForm(null);
      setSelectedPoi(null);
      setPoiMessage('POI eliminado.');
    } catch (error) {
      setPoiMessage('No se pudo eliminar el POI.');
    }
  };

  const handleMapPick = useCallback((rawX, rawY) => {
    const x = Number(rawX);
    const y = Number(rawY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));
    const snap = (value) =>
      MAP_GRID_STEP > 0
        ? Math.round(value / MAP_GRID_STEP) * MAP_GRID_STEP
        : value;
    const snappedX = snap(clampedX);
    const snappedY = snap(clampedY);
    setPoiForm((prev) => ({
      ...prev,
      mapX: snappedX.toFixed(2),
      mapY: snappedY.toFixed(2),
    }));
  }, []);

  const mapMarkerStyle = useMemo(() => {
    const x = Number(poiForm.mapX);
    const y = Number(poiForm.mapY);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { display: 'none' };
    }
    const radius = Number(poiForm.mapRadius) || 1.6;
    return {
      left: `${x}%`,
      top: `${y}%`,
      width: `${radius * 2}%`,
      height: `${radius * 2}%`,
    };
  }, [poiForm.mapX, poiForm.mapY, poiForm.mapRadius]);

  const mapMarkerLabel = useMemo(() => {
    return (
      poiForm.mapLabel?.trim() ||
      poiForm.name?.trim() ||
      poiForm.id?.trim() ||
      ''
    );
  }, [poiForm.mapLabel, poiForm.name, poiForm.id]);

  const resolvePoiMapMeta = useCallback(
    (poiId = '') => {
      if (!poiId) return null;
      return getPoiGeo(poiIndex.get(poiId)) || null;
    },
    [poiIndex]
  );

  const openPoiEditorById = useCallback((poiId = '') => {
    const poi = poiIndex.get(poiId);
    if (!poi) return;
    setActiveView('pois');
    setSelectedPoi(poi);
    setSelection('pois', poi.id);
    resetPoiForm(poi);
  }, [poiIndex, setSelection]);

  const applyPoiLocationToBallistics = useCallback(
    (poiId = '') => {
      const poi = poiIndex.get(poiId);
      setBallisticsForm((prev) => ({
        ...prev,
        poiId,
        location: poiId ? poi?.name || poi?.id || '' : '',
      }));
    },
    [poiIndex]
  );

  const applyPoiLocationToTracerHotspot = useCallback(
    (poiId = '') => {
      const poi = poiIndex.get(poiId);
      const mapMeta = resolvePoiMapMeta(poiId);
      setTracerHotspotForm((prev) => ({
        ...prev,
        poiId,
        label:
          poiId && mapMeta?.label
            ? mapMeta.label
            : poiId && poi?.name
              ? poi.name
              : prev.label,
        x: poiId && mapMeta?.x != null ? String(mapMeta.x) : prev.x,
        y: poiId && mapMeta?.y != null ? String(mapMeta.y) : prev.y,
      }));
    },
    [poiIndex, resolvePoiMapMeta]
  );

  const tracerMarkerStyle = useMemo(() => {
    const x = Number(tracerHotspotForm.x);
    const y = Number(tracerHotspotForm.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      return { display: 'none' };
    }
    return {
      left: `${x}%`,
      top: `${y}%`,
      width: '4%',
      height: '4%',
    };
  }, [tracerHotspotForm.x, tracerHotspotForm.y]);

  const tracerMarkerLabel = useMemo(
    () => tracerHotspotForm.label?.trim() || tracerHotspotForm.id?.trim() || '',
    [tracerHotspotForm.label, tracerHotspotForm.id]
  );

  const resetTracerHotspotForm = useCallback(() => {
    setTracerHotspotForm({ ...initialTracerHotspotForm });
  }, []);

  const fillTracerHotspotForm = useCallback((spot) => {
    if (!spot) {
      setTracerHotspotForm({ ...initialTracerHotspotForm });
      return;
    }
    setTracerHotspotForm({
      id: spot.id || '',
      label: spot.label || '',
      poiId: spot.poiId || '',
      x: String(spot.x ?? ''),
      y: String(spot.y ?? ''),
    });
  }, []);

  const fillTracerLineForm = useCallback((line) => {
    if (!line) {
      setTracerLineForm({ ...initialTracerLineForm });
      return;
    }
    setTracerLineForm({
      id: line.id || '',
      number: line.number || '',
      label: line.label || '',
      hotspotId: line.hotspotId || '',
      enabled: line.enabled !== false,
    });
  }, []);

  const handlePoiImageUpload = useCallback(async () => {
    if (!poiImageFile) return;
    setPoiImageUploading(true);
    try {
      const croppedBlob = await buildPoiCroppedBlob();
      const formData = new FormData();
      if (croppedBlob) {
        formData.append('file', croppedBlob, poiImageFile.name || 'poi.png');
      } else {
        formData.append('file', poiImageFile);
      }
      const res = await fetch(POI_IMAGE_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'No se pudo subir la imagen.');
      setPoiForm((prev) => ({ ...prev, mapImage: data.url || '' }));
      setPoiImageFile(null);
      setPoiImagePreview('');
      setPoiCropOffset({ x: 0, y: 0 });
      setPoiCropZoom(1.2);
      setPoiCropOpen(false);
    } catch (error) {
      setPoiMessage(error.message || 'No se pudo subir la imagen.');
    } finally {
      setPoiImageUploading(false);
    }
  }, [poiImageFile, sessionToken]);

  const handlePoiImageSelect = useCallback((file) => {
    setPoiImageError('');
    if (!file) {
      setPoiImageFile(null);
      setPoiImagePreview('');
      return;
    }
    if (!/image\/(png|jpeg|jpg|webp)/.test(file.type)) {
      setPoiImageError('Solo PNG/JPG/WEBP.');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setPoiImageError('Max 8MB.');
      return;
    }
    setPoiImageFile(file);
    setPoiImagePreview(URL.createObjectURL(file));
    setPoiCropOffset({ x: 0, y: 0 });
    setPoiCropZoom(1.2);
    setPoiCropOpen(true);
  }, []);

  const addPoiResource = useCallback(() => {
    const nextResource = normalizePoiResourceForForm({
      id: buildPoiResourceId(),
      type: 'image',
      label: 'Nuevo recurso',
      title: 'Nuevo recurso',
      description: '',
      src: '',
      visibility: 'listed',
      visible: true,
    });
    setPoiForm((prev) => ({
      ...prev,
      resources: [...(prev.resources || []), nextResource].map((entry, index) => ({
        ...entry,
        sort: index,
      })),
    }));
  }, []);

  const updatePoiResource = useCallback((resourceId, patch) => {
    setPoiForm((prev) => ({
      ...prev,
      resources: (prev.resources || []).map((entry) => {
        if (entry.id !== resourceId) return entry;
        const next = { ...entry, ...patch };
        if (patch.visibility) {
          next.visible = patch.visibility !== 'hidden';
        }
        return normalizePoiResourceForForm(next);
      }),
    }));
  }, []);

  const removePoiResource = useCallback((resourceId) => {
    setPoiForm((prev) => ({
      ...prev,
      resources: (prev.resources || [])
        .filter((entry) => entry.id !== resourceId)
        .map((entry, index) => ({ ...entry, sort: index })),
    }));
  }, []);

  const movePoiResource = useCallback((resourceId, direction) => {
    setPoiForm((prev) => {
      const resources = [...(prev.resources || [])];
      const index = resources.findIndex((entry) => entry.id === resourceId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= resources.length) return prev;
      const [resource] = resources.splice(index, 1);
      resources.splice(nextIndex, 0, resource);
      return {
        ...prev,
        resources: resources.map((entry, sort) => ({ ...entry, sort })),
      };
    });
  }, []);

  const handlePoiResourceUpload = useCallback(async (resourceId, file) => {
    setPoiResourceUploadError('');
    if (!file) return;
    setPoiResourceUploadingId(resourceId);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const poiId = poiForm.id.trim() || selectedPoi?.id || '';
      if (poiId) formData.append('poiId', poiId);
      const res = await fetch(POI_RESOURCE_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { Authorization: `Bearer ${sessionToken}` },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          data.message ||
            'No se pudo subir el recurso. Endpoint esperado: /api/poi-resource-upload.'
        );
      }
      const uploadedResource =
        data.resource && typeof data.resource === 'object' ? data.resource : {};
      updatePoiResource(resourceId, {
        id: uploadedResource.id || resourceId,
        src: uploadedResource.src || data.url || data.src || '',
        type: uploadedResource.type || data.type || undefined,
        label: uploadedResource.label || data.label || data.originalName || file.name,
        title: uploadedResource.title || data.title || data.originalName || file.name,
        thumbnail: uploadedResource.thumbnail || data.thumbnail || data.poster || '',
        poster: uploadedResource.poster || data.poster || data.thumbnail || '',
        visibility: uploadedResource.visibility || 'listed',
        visible: uploadedResource.visible !== false,
      });
    } catch (error) {
      setPoiResourceUploadError(
        error.message || 'No se pudo subir el recurso. Usa URL manual o revisa backend.'
      );
    } finally {
      setPoiResourceUploadingId('');
    }
  }, [poiForm.id, selectedPoi?.id, sessionToken, updatePoiResource]);

  const buildPoiCroppedBlob = useCallback(async () => {
    if (!poiImagePreview || !cropFrameRef.current || !cropImageRef.current) return null;
    const img = cropImageRef.current;
    const canvas = document.createElement('canvas');
    const targetW = 720;
    const targetH = Math.round(targetW / POI_IMAGE_ASPECT);
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const scale = poiCropZoom;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const baseScale = Math.max(targetW / imgW, targetH / imgH);
    const drawW = imgW * baseScale * scale;
    const drawH = imgH * baseScale * scale;
    const offsetX = (targetW - drawW) / 2 + poiCropOffset.x;
    const offsetY = (targetH - drawH) / 2 + poiCropOffset.y;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, targetW, targetH);
    ctx.drawImage(img, offsetX, offsetY, drawW, drawH);
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/png', 0.92);
    });
  }, [poiImagePreview, poiCropOffset.x, poiCropOffset.y, poiCropZoom]);

  const handleCropPointerDown = useCallback((event) => {
    if (!poiImagePreview) return;
    setPoiCropDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [poiImagePreview]);

  const handleCropPointerMove = useCallback((event) => {
    if (!poiCropDragging) return;
    setPoiCropOffset((prev) => ({
      x: prev.x + event.movementX,
      y: prev.y + event.movementY,
    }));
  }, [poiCropDragging]);

  const handleCropPointerUp = useCallback((event) => {
    setPoiCropDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, []);

  const saveVillain = async (event) => {
    event.preventDefault();
    setVillainMessage('');
    const existing = selectedVillain && typeof selectedVillain === 'object' ? selectedVillain : {};
    const existingUnlock = existing.unlockConditions || { ...defaultAccessConfig };
    const existingDm = existing.dm || { notes: '', spoilers: [] };
    const existingCommands =
      existing.commands && typeof existing.commands === 'object' ? existing.commands : {};
    const mergedAttributes = buildAttributeAccessPayload(
      villainForm.attributeAccess,
      existingUnlock.attributes || {}
    );
    const mergedUnlock = {
      ...existingUnlock,
      attributes: mergedAttributes,
    };
    const payload = {
      id: villainForm.id.trim() || `villain_${Date.now().toString(36)}`,
      alias: villainForm.alias,
      realName: villainForm.realName || '',
      species: villainForm.species || '',
      age: villainForm.age || '',
      height: villainForm.height || '',
      weight: villainForm.weight || '',
      threatLevel: villainForm.threatLevel || '',
      status: villainForm.status || 'active',
      summary: villainForm.summary,
      lastSeen: villainForm.lastSeen || '',
      patterns: splitLines(villainForm.patterns),
      knownAssociates: splitLines(villainForm.knownAssociates),
      notes: splitLines(villainForm.notes),
      unlockConditions: mergedUnlock,
      dm: existingDm,
      commands: formFieldsToCommands(villainForm, { category: 'villains' }, existingCommands),
    };
    try {
      const res = await fetch(VILLAINS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo guardar el perfil');
      const saved = await res.json();
      setVillainMessage('Perfil guardado');
      setVillainSaveState({ status: 'saved', at: Date.now() });
      resetVillainForm(saved);
      setSelectedVillain(saved);
      setVillains((prev) => {
        const others = prev.filter((v) => v.id !== saved.id);
        return [...others, saved];
      });
    } catch (error) {
      setVillainMessage(error.message);
      setVillainSaveState({ status: 'error', at: Date.now() });
    }
  };

  const saveAccessMatrix = async (event) => {
    event.preventDefault();
    if (!accessVillainId) {
      setAccessMessage('Selecciona un villano.');
      return;
    }
    const target = villains.find((item) => item.id === accessVillainId);
    if (!target) {
      setAccessMessage('No se encontro el villano.');
      return;
    }
    setAccessLoading(true);
    setAccessMessage('');
    const existingUnlock = target.unlockConditions || { ...defaultAccessConfig };
    const attributes = normalizeAccessMatrix(
      accessMatrix,
      existingUnlock.attributes || {}
    );
    const payload = {
      id: target.id,
      alias: target.alias || '',
      realName: target.realName || '',
      species: target.species || '',
      age: target.age || '',
      height: target.height || '',
      weight: target.weight || '',
      threatLevel: target.threatLevel || '',
      status: target.status || 'active',
      summary: target.summary || '',
      lastSeen: target.lastSeen || '',
      patterns: Array.isArray(target.patterns) ? target.patterns : [],
      knownAssociates: Array.isArray(target.knownAssociates)
        ? target.knownAssociates
        : [],
      notes: Array.isArray(target.notes) ? target.notes : [],
      unlockConditions: {
        ...existingUnlock,
        attributes,
      },
      dm: target.dm || { notes: '', spoilers: [] },
      commands:
        target.commands && typeof target.commands === 'object'
          ? target.commands
          : {},
    };
    try {
      const res = await fetch(VILLAINS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('No se pudo guardar accesos.');
      const saved = await res.json();
      setAccessMessage('Accesos guardados.');
      setAccessBaseline(JSON.stringify(accessMatrix));
      setVillains((prev) => {
        const others = prev.filter((v) => v.id !== saved.id);
        return [...others, saved];
      });
      if (selectedVillain?.id === saved.id) {
        resetVillainForm(saved);
        setSelectedVillain(saved);
      }
    } catch (error) {
      setAccessMessage(error.message || 'No se pudo guardar accesos.');
    } finally {
      setAccessLoading(false);
    }
  };

  const resetAccessMatrix = () => {
    if (!accessVillainId) return;
    const target = villains.find((item) => item.id === accessVillainId);
    if (!target) return;
    const matrix = buildAttributeAccessForm(target.unlockConditions?.attributes || {});
    setAccessMatrix(matrix);
    setAccessBaseline(JSON.stringify(matrix));
    setAccessMessage('');
  };

  const updateRuntimeUnlock = async (fieldKey, enabled) => {
    if (!accessVillainId) return;
    const baseState = campaignSnapshot || {};
    const unlockedAttributes = normalizeUnlockedAttributes(baseState);
    const currentList = Array.isArray(unlockedAttributes.villains[accessVillainId])
      ? unlockedAttributes.villains[accessVillainId]
      : [];
    const nextList = enabled
      ? Array.from(new Set([...currentList, fieldKey]))
      : currentList.filter((entry) => entry !== fieldKey);
    const nextState = {
      ...baseState,
      unlockedAttributes: {
        ...unlockedAttributes,
        villains: {
          ...unlockedAttributes.villains,
          [accessVillainId]: nextList,
        },
      },
    };
    setCampaignSnapshot(nextState);
    try {
      const res = await fetch(CAMPAIGN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ state: nextState }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo guardar el estado.');
      }
      setCampaignSnapshot(data.state || nextState);
    } catch (error) {
      setAccessMessage(error.message || 'No se pudo guardar el estado.');
    }
  };

  const deleteVillain = async () => {
    if (!selectedVillain?.id) return;
    if (!window.confirm('Eliminar villano de la galeria?')) return;
    try {
      await fetch(`${VILLAINS_ENDPOINT}/${selectedVillain.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setVillains((prev) => prev.filter((item) => item.id !== selectedVillain.id));
      resetVillainForm(null);
      setSelectedVillain(null);
      setVillainMessage('Villano eliminado.');
    } catch (error) {
      setVillainMessage('No se pudo eliminar el perfil.');
    }
  };

  useEffect(() => {
    persistStorage(STORAGE_KEYS.activeView, activeView);
  }, [activeView]);

  useEffect(() => {
    persistStorage(STORAGE_KEYS.mode, editorMode);
  }, [editorMode]);

  useEffect(() => {
    persistStorage(STORAGE_KEYS.preview, JSON.stringify(previewByView));
  }, [previewByView]);

  useEffect(() => {
    persistStorage(STORAGE_KEYS.help, helpMode ? 'on' : 'off');
  }, [helpMode]);

  useEffect(() => {
    persistStorage(STORAGE_KEYS.selections, JSON.stringify(selectionState));
  }, [selectionState]);

  useEffect(() => {
    persistStorage(STORAGE_KEYS.tree, JSON.stringify(treeState));
  }, [treeState]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDefaultPreviewOpen = () => viewportWidth >= 980;
  const previewOpen = previewByView[activeView] ?? getDefaultPreviewOpen();
  const advancedOpen = advancedByView[activeView] ?? false;

  const togglePreview = () => {
    setPreviewByView((prev) => ({ ...prev, [activeView]: !previewOpen }));
  };

  const toggleAdvanced = () => {
    setAdvancedByView((prev) => ({ ...prev, [activeView]: !advancedOpen }));
  };

  const defaultSections = (view, mode) => {
    if (mode === 'authoring') {
      return {
        identity: true,
        summary: true,
        map: false,
        resources: false,
        quick: true,
        content: false,
        dm: false,
        engine: false,
        preview: true,
      };
    }
    return {
      identity: true,
      summary: true,
      map: false,
      resources: false,
      quick: true,
      content: false,
      dm: false,
      engine: false,
      preview: true,
    };
  };

  useEffect(() => {
    setOpenSections((prev) => ({
      ...prev,
      [activeView]: defaultSections(activeView, editorMode),
    }));
  }, [activeView, editorMode]);

  const toggleSection = (view, section) => {
    setOpenSections((prev) => ({
      ...prev,
      [view]: {
        ...prev[view],
        [section]: !prev[view]?.[section],
      },
    }));
  };

  const resetCampaignForm = (state) => {
    setCampaignSnapshot(state || null);
    setCampaignForm(stateToFormFields(state || {}));
  };

  const refreshCampaign = async () => {
    setCampaignLoading(true);
    setCampaignMessage('');
    try {
      const res = await fetch(CAMPAIGN_ENDPOINT);
      if (!res.ok) throw new Error('No se pudo cargar el estado');
      const data = await res.json();
      resetCampaignForm(data.state || {});
    } catch (error) {
      setCampaignMessage(error.message || 'No se pudo cargar el estado.');
    } finally {
      setCampaignLoading(false);
    }
  };

  const saveCampaign = async (event) => {
    event.preventDefault();
    setCampaignLoading(true);
    setCampaignMessage('');
    try {
      const payload = { state: formFieldsToState(campaignForm, campaignSnapshot || {}) };
      const res = await fetch(CAMPAIGN_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo guardar el estado.');
      }
      resetCampaignForm(data.state || payload.state);
      setCampaignMessage('Estado de campaña guardado.');
    } catch (error) {
      setCampaignMessage(error.message || 'No se pudo guardar el estado.');
    } finally {
      setCampaignLoading(false);
    }
  };

  const refreshGlobalCommands = async () => {
    setGlobalCommandsLoading(true);
    setGlobalCommandsMessage('');
    try {
      const res = await fetch(GLOBAL_COMMANDS_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar los comandos.');
      const data = await res.json();
      const commands = Array.isArray(data?.commands) ? data.commands : [];
      setGlobalCommandsText(JSON.stringify(commands, null, 2));
    } catch (error) {
      setGlobalCommandsMessage(error.message || 'No se pudieron cargar los comandos.');
    } finally {
      setGlobalCommandsLoading(false);
    }
  };

  const saveGlobalCommands = async (event) => {
    event.preventDefault();
    setGlobalCommandsLoading(true);
    setGlobalCommandsMessage('');
    let parsed;
    try {
      parsed = JSON.parse(globalCommandsText || '[]');
    } catch (error) {
      setGlobalCommandsLoading(false);
      setGlobalCommandsMessage('JSON invalido. Revisa el formato.');
      return;
    }
    try {
      const res = await fetch(GLOBAL_COMMANDS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ commands: parsed }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudieron guardar los comandos.');
      }
      const commands = Array.isArray(data?.commands) ? data.commands : parsed;
      setGlobalCommandsText(JSON.stringify(commands, null, 2));
      setGlobalCommandsMessage('Comandos globales guardados.');
    } catch (error) {
      setGlobalCommandsMessage(error.message || 'No se pudieron guardar los comandos.');
    } finally {
      setGlobalCommandsLoading(false);
    }
  };

  const loadEvidenceModels = useCallback(async () => {
    setEvidenceLoading(true);
    setEvidenceMessage('');
    try {
      const res = await fetch(EVIDENCE_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las evidencias.');
      const data = await res.json();
      const models = Array.isArray(data?.models) ? data.models : [];
      setEvidenceModels(models);
      // keep "Nuevo" as default state; do not auto-select first model
    } catch (error) {
      setEvidenceMessage(error.message || 'No se pudieron cargar las evidencias.');
    } finally {
      setEvidenceLoading(false);
    }
  }, [evidenceForm.id]);

  const loadBallisticsModels = useCallback(async () => {
    setBallisticsLoading(true);
    setBallisticsMessage('');
    try {
      const res = await fetch(BALLISTICS_ENDPOINT);
      if (!res.ok) throw new Error('No se pudieron cargar las balisticas.');
      const data = await res.json();
      const models = Array.isArray(data?.models) ? data.models : [];
      setBallisticsModels(models);
    } catch (error) {
      setBallisticsMessage(error.message || 'No se pudieron cargar las balisticas.');
    } finally {
      setBallisticsLoading(false);
    }
  }, []);

  const loadBallisticsAssets = useCallback(async () => {
    setBallisticsAssetsLoading(true);
    try {
      const res = await fetch(BALLISTICS_ASSETS_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar los PNGs.');
      const data = await res.json();
      const assets = Array.isArray(data?.assets) ? data.assets : [];
      setBallisticsAssets(assets);
    } catch (error) {
      console.error('Load ballistics assets error', error);
    } finally {
      setBallisticsAssetsLoading(false);
    }
  }, []);

  const loadAudioModels = useCallback(async () => {
    setAudioLoading(true);
    setAudioMessage('');
    try {
      const res = await fetch(AUDIO_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar los audios.');
      const data = await res.json();
      const models = Array.isArray(data?.models) ? data.models : [];
      setAudioModels(models);
    } catch (error) {
      setAudioMessage(error.message || 'No se pudieron cargar los audios.');
    } finally {
      setAudioLoading(false);
    }
  }, []);

  const loadPhoneLines = useCallback(async () => {
    setPhoneLoading(true);
    setPhoneMessage('');
    try {
      const res = await fetch(PHONE_LINES_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudieron cargar las lineas.');
      const data = await res.json();
      const lines = Array.isArray(data?.lines) ? data.lines : [];
      setPhoneLines(lines);
    } catch (error) {
      setPhoneMessage(error.message || 'No se pudieron cargar las lineas.');
    } finally {
      setPhoneLoading(false);
    }
  }, []);

  const savePhoneLines = useCallback(
    async (payload = []) => {
      if (!authorized || !sessionToken) {
        setPhoneMessage('Necesitas sesion activa para guardar.');
        return;
      }
      setPhoneLoading(true);
      setPhoneMessage('');
      try {
        const res = await fetch(PHONE_LINES_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ lines: payload }),
        });
        if (!res.ok) throw new Error('No se pudieron guardar las lineas.');
        const data = await res.json();
        const lines = Array.isArray(data?.lines) ? data.lines : [];
        setPhoneLines(lines);
        setPhoneMessage('Linea guardada.');
      } catch (error) {
        setPhoneMessage(error.message || 'No se pudieron guardar las lineas.');
      } finally {
        setPhoneLoading(false);
      }
    },
    [authorized, sessionToken]
  );

  const loadTracerConfig = useCallback(async () => {
    setTracerLoading(true);
    setTracerMessage('');
    try {
      const res = await fetch(TRACER_CONFIG_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('No se pudo cargar TRACER.');
      const data = await res.json();
      const lines = Array.isArray(data?.lines) ? data.lines : [];
      const hotspots = Array.isArray(data?.hotspots) ? data.hotspots : [];
      setTracerLines(lines);
      setTracerHotspots(hotspots);
    } catch (error) {
      setTracerMessage(error.message || 'No se pudo cargar TRACER.');
    } finally {
      setTracerLoading(false);
    }
  }, []);

  const saveTracerConfig = useCallback(
    async (payload = { lines: [], hotspots: [] }) => {
      if (!authorized || !sessionToken) {
        setTracerMessage('Necesitas sesion activa para guardar TRACER.');
        return;
      }
      setTracerLoading(true);
      setTracerMessage('');
      try {
        const res = await fetch(TRACER_CONFIG_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('No se pudo guardar TRACER.');
        const data = await res.json();
        const lines = Array.isArray(data?.lines) ? data.lines : [];
        const hotspots = Array.isArray(data?.hotspots) ? data.hotspots : [];
        setTracerLines(lines);
        setTracerHotspots(hotspots);
        setTracerMessage('Tracer guardado.');
      } catch (error) {
        setTracerMessage(error.message || 'No se pudo guardar TRACER.');
      } finally {
        setTracerLoading(false);
      }
    },
    [authorized, sessionToken]
  );

  const saveAudioModels = useCallback(
    async (payload = []) => {
      if (!authorized || !sessionToken) {
        setAudioMessage('Necesitas sesion activa para guardar.');
        return;
      }
      setAudioLoading(true);
      setAudioMessage('');
      try {
        const res = await fetch(AUDIO_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ models: payload }),
        });
        if (!res.ok) throw new Error('No se pudieron guardar los audios.');
        const data = await res.json();
        const models = Array.isArray(data?.models) ? data.models : [];
        setAudioModels(models);
        setAudioMessage('Audio guardado.');
      } catch (error) {
        setAudioMessage(error.message || 'No se pudieron guardar los audios.');
      } finally {
        setAudioLoading(false);
      }
    },
    [authorized, sessionToken]
  );

  const saveBallisticsModels = useCallback(
    async (payload = []) => {
      if (!authorized || !sessionToken) {
        setBallisticsMessage('Necesitas sesion activa para guardar.');
        return;
      }
      setBallisticsLoading(true);
      setBallisticsMessage('');
      try {
        const res = await fetch(BALLISTICS_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ models: payload }),
        });
        if (!res.ok) throw new Error('No se pudieron guardar las balisticas.');
        const data = await res.json();
        const models = Array.isArray(data?.models) ? data.models : [];
        setBallisticsModels(models);
        setBallisticsMessage('Balistica guardada.');
      } catch (error) {
        setBallisticsMessage(error.message || 'No se pudieron guardar las balisticas.');
      } finally {
        setBallisticsLoading(false);
      }
    },
    [authorized, sessionToken]
  );

  const saveEvidenceModels = useCallback(
    async (models) => {
      if (!authorized || !sessionToken) {
        setEvidenceMessage('Necesitas sesion activa para guardar.');
        return;
      }
      setEvidenceLoading(true);
      setEvidenceMessage('');
      try {
        const res = await fetch(EVIDENCE_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({ models }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'No se pudieron guardar las evidencias.');
        }
        const saved = Array.isArray(data?.models) ? data.models : models;
        setEvidenceModels(saved);
        setEvidenceMessage('Evidencias guardadas.');
      } catch (error) {
        setEvidenceMessage(error.message || 'No se pudieron guardar las evidencias.');
      } finally {
        setEvidenceLoading(false);
      }
    },
    [authorized, sessionToken]
  );

  const handleEvidenceUpload = useCallback(async () => {
    if (!evidenceFile) {
      setEvidenceMessage('Selecciona un archivo STL.');
      return;
    }
    if (!authorized || !sessionToken) {
      setEvidenceMessage('Necesitas sesion activa para subir archivos.');
      return;
    }
    setEvidenceUploading(true);
    setEvidenceMessage('');
    const formData = new FormData();
    formData.append('file', evidenceFile);
    try {
      const res = await fetch(EVIDENCE_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo subir el STL.');
      }
      setEvidenceForm((prev) => ({
        ...prev,
        stlPath: data.url || prev.stlPath,
      }));
      setEvidenceMessage('STL cargado.');
    } catch (error) {
      setEvidenceMessage(error.message || 'No se pudo subir el STL.');
    } finally {
      setEvidenceUploading(false);
    }
  }, [authorized, evidenceFile, sessionToken]);

  const handleBallisticsUpload = useCallback(async () => {
    if (!ballisticsFile) {
      setBallisticsMessage('Selecciona un PNG.');
      return;
    }
    if (!authorized || !sessionToken) {
      setBallisticsMessage('Necesitas sesion activa para subir PNGs.');
      return;
    }
    setBallisticsUploading(true);
    setBallisticsMessage('');
    const formData = new FormData();
    formData.append('file', ballisticsFile);
    try {
      const res = await fetch(BALLISTICS_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo subir el PNG.');
      }
      const url = data.url || '';
      setBallisticsForm((prev) => ({
        ...prev,
        pngPath: url || prev.pngPath,
        assetId: prev.assetId || deriveAssetId(url),
      }));
      await loadBallisticsAssets();
      setBallisticsMessage('PNG cargado.');
    } catch (error) {
      setBallisticsMessage(error.message || 'No se pudo subir el PNG.');
    } finally {
      setBallisticsUploading(false);
    }
  }, [authorized, ballisticsFile, sessionToken, loadBallisticsAssets]);

  const handleAudioUpload = useCallback(async () => {
    if (!audioFile) {
      setAudioMessage('Selecciona un MP3.');
      return;
    }
    if (!authorized || !sessionToken) {
      setAudioMessage('Necesitas sesion activa para subir audio.');
      return;
    }
    if (audioGarble && !audioPassword.trim()) {
      setAudioMessage('Ingresa un password para cifrar.');
      return;
    }
    if (audioGarble && (audioPassword.trim().length < 4 || audioPassword.trim().length > 8)) {
      setAudioMessage('El password debe tener 4-8 caracteres.');
      return;
    }
    setAudioUploading(true);
    setAudioMessage('');
    const formData = new FormData();
    formData.append('file', audioFile);
    formData.append('garble', audioGarble ? 'true' : 'false');
    if (audioGarble) {
      formData.append('password', audioPassword.trim());
    }
    try {
      const res = await fetch(AUDIO_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo subir el MP3.');
      }
      setAudioForm((prev) => ({
        ...prev,
        id: data.id || prev.id,
        originalSrc: data.originalSrc || prev.originalSrc,
        garbledSrc: data.garbledSrc || '',
        isGarbled: Boolean(data.isGarbled),
        passwordHash: data.passwordHash || prev.passwordHash,
        title: prev.title || (data.id ? data.id.toUpperCase() : prev.title),
      }));
      setAudioMessage('MP3 cargado.');
    } catch (error) {
      setAudioMessage(error.message || 'No se pudo subir el MP3.');
    } finally {
      setAudioUploading(false);
    }
  }, [authorized, audioFile, audioGarble, audioPassword, sessionToken]);

  const handleEvidenceSave = useCallback(
    async (event) => {
      event.preventDefault();
      if (!evidenceForm.id || !evidenceForm.stlPath) {
        setEvidenceMessage('ID y STL son obligatorios.');
        return;
      }
      const entry = {
        id: evidenceForm.id.trim(),
        label: evidenceForm.label.trim(),
        command: evidenceForm.command.trim(),
        stlPath: evidenceForm.stlPath.trim(),
      };
      const next = [
        entry,
        ...evidenceModels.filter((item) => item.id !== entry.id),
      ];
      await saveEvidenceModels(next);
    },
    [evidenceForm, evidenceModels, saveEvidenceModels]
  );

  const handleEvidenceDelete = useCallback(
    async (id) => {
      if (!id) return;
      const next = evidenceModels.filter((item) => item.id !== id);
      await saveEvidenceModels(next);
      if (evidenceForm.id === id) {
        setEvidenceForm(initialEvidenceForm);
      }
    },
    [evidenceForm.id, evidenceModels, saveEvidenceModels]
  );

  const handleBallisticsSave = useCallback(async () => {
    const id = ballisticsForm.id.trim();
    const pngPath = ballisticsForm.pngPath.trim();
    if (!id || !pngPath) {
      setBallisticsMessage('ID y PNG son obligatorios.');
      return;
    }
    if (!ballisticsForm.poiId.trim()) {
      setBallisticsMessage('Balística requiere un POI vinculado.');
      return;
    }
    if (!/\.png(\?.*)?$/i.test(pngPath)) {
      setBallisticsMessage('La ruta del PNG debe terminar en .png.');
      return;
    }
    const derivedAssetId = deriveAssetId(pngPath);
    const statusValue = ballisticsForm.status.trim();
    const isClosed = /cerrado/i.test(statusValue);
    if (isClosed && !ballisticsForm.closedBy.trim()) {
      setBallisticsMessage('Si el caso está cerrado, indica el agente encargado.');
      return;
    }
    const entry = {
      ...ballisticsForm,
      id,
      label: ballisticsForm.label.trim(),
      assetId: ballisticsForm.assetId.trim() || derivedAssetId,
      pngPath,
      caliber: ballisticsForm.caliber.trim(),
      material: ballisticsForm.material.trim(),
      bulletId: ballisticsForm.bulletId.trim(),
      caseId: ballisticsForm.caseId.trim(),
      caseCode: ballisticsForm.caseCode.trim(),
      poiId: ballisticsForm.poiId.trim(),
      crime: ballisticsForm.crime.trim(),
      location: '',
      status: statusValue,
      closedBy: ballisticsForm.closedBy.trim(),
    };
    const next = [
      entry,
      ...ballisticsModels.filter((item) => item.id !== entry.id),
    ];
    await saveBallisticsModels(next);
  }, [ballisticsForm, ballisticsModels, saveBallisticsModels]);

  const handleBallisticsDelete = useCallback(
    async (id) => {
      const next = ballisticsModels.filter((item) => item.id !== id);
      await saveBallisticsModels(next);
      if (ballisticsForm.id === id) {
        setBallisticsForm({ ...initialBallisticsForm });
      }
    },
    [ballisticsForm.id, ballisticsModels, saveBallisticsModels]
  );

  const handleAudioSave = useCallback(
    async (event) => {
      event.preventDefault();
      if (!audioForm.id.trim() || !audioForm.originalSrc.trim()) {
        setAudioMessage('ID y MP3 son obligatorios.');
        return;
      }
      if (audioForm.isGarbled && !audioForm.passwordHash) {
        setAudioMessage('Falta hash de password para audio cifrado.');
        return;
      }
      const entry = {
        ...audioForm,
        id: audioForm.id.trim(),
        title: audioForm.title.trim(),
        originalSrc: audioForm.originalSrc.trim(),
        garbledSrc: audioForm.garbledSrc.trim(),
        number: audioForm.number.trim(),
      };
      const next = [
        entry,
        ...audioModels.filter((item) => item.id !== entry.id),
      ];
      await saveAudioModels(next);
    },
    [audioForm, audioModels, saveAudioModels]
  );

  const handleAudioDelete = useCallback(
    async (id) => {
      if (!id) return;
      const next = audioModels.filter((item) => item.id !== id);
      await saveAudioModels(next);
      if (audioForm.id === id) {
        setAudioForm({ ...initialAudioForm });
      }
    },
    [audioForm.id, audioModels, saveAudioModels]
  );

  const handlePhoneSave = useCallback(
    async (event) => {
      event.preventDefault();
      if (!phoneForm.id.trim() || !phoneForm.number.trim()) {
        setPhoneMessage('ID y numero son obligatorios.');
        return;
      }
      const entry = {
        id: phoneForm.id.trim(),
        number: phoneForm.number.trim(),
        label: phoneForm.label.trim(),
        audioId: phoneForm.audioId.trim(),
        rellamable: Boolean(phoneForm.rellamable),
        llamado: Boolean(phoneForm.llamado),
      };
      const next = [
        entry,
        ...phoneLines.filter((item) => item.id !== entry.id),
      ];
      await savePhoneLines(next);
      setPhoneForm({ ...initialPhoneForm });
    },
    [phoneForm, phoneLines, savePhoneLines]
  );

  const handlePhoneDelete = useCallback(
    async (id) => {
      if (!id) return;
      const next = phoneLines.filter((item) => item.id !== id);
      await savePhoneLines(next);
      if (phoneForm.id === id) {
        setPhoneForm({ ...initialPhoneForm });
      }
    },
    [phoneForm.id, phoneLines, savePhoneLines]
  );

  const handlePhoneUpload = useCallback(async () => {
    if (!phoneFile) {
      setPhoneMessage('Selecciona un MP3.');
      return;
    }
    if (!authorized || !sessionToken) {
      setPhoneMessage('Necesitas sesion activa para subir audio.');
      return;
    }
    setPhoneUploading(true);
    setPhoneMessage('');
    const formData = new FormData();
    formData.append('file', phoneFile);
    try {
      const res = await fetch(PHONE_LINES_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionToken}`,
        },
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.message || 'No se pudo subir el MP3.');
      }
      setAudioModels((prev) => {
        const exists = prev.some((item) => item.id === data.audioId);
        if (exists) return prev;
        return [
          {
            id: data.audioId,
            title: data.audioId?.toUpperCase?.() || data.audioId,
            originalSrc: data.originalSrc || '',
            garbledSrc: '',
            isGarbled: false,
            passwordHash: '',
          },
          ...prev,
        ];
      });
      setPhoneForm((prev) => ({
        ...prev,
        id: data.id || prev.id,
        audioId: data.audioId || prev.audioId,
      }));
      setPhoneMessage('MP3 cargado.');
    } catch (error) {
      setPhoneMessage(error.message || 'No se pudo subir el MP3.');
    } finally {
      setPhoneUploading(false);
    }
  }, [authorized, phoneFile, sessionToken]);

  const handleTracerHotspotSave = useCallback(
    async (event) => {
      event.preventDefault();
      const id = tracerHotspotForm.id.trim();
      if (!id) {
        setTracerMessage('Hotspot ID obligatorio.');
        return;
      }
      const poiId = tracerHotspotForm.poiId.trim();
      if (!poiId) {
        setTracerMessage('Selecciona un POI base para el hotspot.');
        return;
      }
      const poiGeo = resolvePoiMapMeta(poiId);
      if (!poiGeo || poiGeo.x == null || poiGeo.y == null) {
        setTracerMessage('El POI seleccionado no tiene coordenadas de mapa validas.');
        return;
      }
      const nextHotspot = {
        id,
        label: tracerHotspotForm.label.trim() || id,
        poiId,
      };
      const nextHotspots = [
        nextHotspot,
        ...tracerHotspots.filter((item) => item.id !== nextHotspot.id),
      ];
      await saveTracerConfig({ lines: tracerLines, hotspots: nextHotspots });
      setTracerHotspotForm({ ...initialTracerHotspotForm });
    },
    [resolvePoiMapMeta, saveTracerConfig, tracerHotspotForm, tracerHotspots, tracerLines]
  );

  const handleTracerHotspotDelete = useCallback(
    async (id) => {
      if (!id) return;
      const nextHotspots = tracerHotspots.filter((item) => item.id !== id);
      const nextLines = tracerLines.map((line) =>
        line.hotspotId === id ? { ...line, hotspotId: '' } : line
      );
      await saveTracerConfig({ lines: nextLines, hotspots: nextHotspots });
      if (tracerHotspotForm.id === id) {
        resetTracerHotspotForm();
      }
      if (tracerLineForm.hotspotId === id) {
        setTracerLineForm((prev) => ({ ...prev, hotspotId: '' }));
      }
    },
    [
      resetTracerHotspotForm,
      saveTracerConfig,
      tracerHotspotForm.id,
      tracerHotspots,
      tracerLineForm.hotspotId,
      tracerLines,
    ]
  );

  const handleTracerLineSave = useCallback(
    async (event) => {
      event.preventDefault();
      const number = tracerLineForm.number.trim();
      if (!number) {
        setTracerMessage('Linea tracer: el numero es obligatorio.');
        return;
      }
      const id = number;
      const previousId = tracerLineForm.id.trim();
      if (!tracerLineForm.hotspotId.trim()) {
        setTracerMessage('Selecciona un hotspot para la linea.');
        return;
      }
      const entry = {
        id,
        number,
        label: tracerLineForm.label.trim() || id,
        hotspotId: tracerLineForm.hotspotId.trim(),
        enabled: Boolean(tracerLineForm.enabled),
      };
      const nextLines = [
        entry,
        ...tracerLines.filter((item) => item.id !== id && (!previousId || item.id !== previousId)),
      ];
      await saveTracerConfig({ lines: nextLines, hotspots: tracerHotspots });
      setTracerLineForm({ ...initialTracerLineForm });
    },
    [tracerLineForm, tracerLines, tracerHotspots, saveTracerConfig]
  );

  const handleTracerLineDelete = useCallback(
    async (id) => {
      if (!id) return;
      const nextLines = tracerLines.filter((item) => item.id !== id);
      await saveTracerConfig({ lines: nextLines, hotspots: tracerHotspots });
      if (tracerLineForm.id === id) {
        setTracerLineForm({ ...initialTracerLineForm });
      }
    },
    [tracerLineForm.id, tracerLines, tracerHotspots, saveTracerConfig]
  );

  useEffect(() => {
    if (activeView !== 'evidence') return;
    if (evidenceForm.id) return;
    setEvidenceForm({ ...initialEvidenceForm });
    setEvidenceFile(null);
    setEvidenceMessage('');
    setEvidenceProfile('default');
    setEvidencePreviewNonce((prev) => prev + 1);
  }, [activeView, evidenceForm.id]);

  useEffect(() => {
    if (activeView !== 'evidence') return;
    setEvidenceTab('stl');
  }, [activeView]);

  useEffect(() => {
    if (!authorized) return;
    if (activeView !== 'evidence') return;
    if (evidenceTab === 'stl') {
      loadEvidenceModels();
    } else if (evidenceTab === 'ballistics') {
      loadBallisticsModels();
      loadBallisticsAssets();
    } else if (evidenceTab === 'audio') {
      loadAudioModels();
    } else {
      loadPhoneLines();
      loadAudioModels();
    }
  }, [
    authorized,
    activeView,
    evidenceTab,
    loadEvidenceModels,
    loadBallisticsModels,
    loadBallisticsAssets,
    loadAudioModels,
    loadPhoneLines,
  ]);

  useEffect(() => {
    if (!authorized) return;
    if (activeView !== 'tracer') return;
    loadTracerConfig();
  }, [authorized, activeView, loadTracerConfig]);

  useEffect(() => {
    const leftCanvas = ballisticsPreviewLeftRef.current;
    const rightCanvas = ballisticsPreviewRightRef.current;
    const pngPath = ballisticsForm.pngPath?.trim();
    if (!leftCanvas || !rightCanvas) return;
    if (!pngPath) {
      const leftCtx = leftCanvas.getContext('2d');
      const rightCtx = rightCanvas.getContext('2d');
      [leftCtx, rightCtx].forEach((ctx) => {
        if (!ctx) return;
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fillStyle = '#040907';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      });
      return;
    }
    const img = new Image();
    img.onload = () => {
      renderBallisticsPreview(leftCanvas, img, 'left');
      renderBallisticsPreview(rightCanvas, img, 'right');
    };
    img.onerror = () => {
      const ctx = leftCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, leftCanvas.width, leftCanvas.height);
        ctx.fillStyle = '#040907';
        ctx.fillRect(0, 0, leftCanvas.width, leftCanvas.height);
      }
    };
    img.src = pngPath;
  }, [ballisticsForm.pngPath]);

  const renderNav = () => (
    <div className="dm-panel__nav" data-workspace={activeView}>
      {VIEW_OPTIONS.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => setActiveView(option.id)}
          className={activeView === option.id ? 'active' : ''}
        >
          {option.label}
        </button>
      ))}
      <a
        href="/docs#panel"
        target="_blank"
        rel="noreferrer"
        className="dm-panel__nav-link"
      >
        Ayuda
      </a>
    </div>
  );

  const resolveNoticeTone = (text = '') => {
    const normalized = String(text || '').toLowerCase();
    if (
      normalized.includes('error') ||
      normalized.includes('no se pudo') ||
      normalized.includes('fallo') ||
      normalized.includes('incorrecta')
    ) {
      return 'error';
    }
    if (
      normalized.includes('sin guardar') ||
      normalized.includes('pendiente') ||
      normalized.includes('cuidado')
    ) {
      return 'warning';
    }
    return 'success';
  };

  useEffect(() => {
    const noticeSources = {
      authError,
      passwordError,
      passwordStatus,
      caseMessage,
      poiMessage,
      villainMessage,
      evidenceMessage,
      ballisticsMessage,
      audioMessage,
      phoneMessage,
      tracerMessage,
      accessMessage,
      campaignMessage,
      globalCommandsMessage,
    };

    Object.entries(noticeSources).forEach(([key, value]) => {
      const current = value || '';
      const previous = noticeTrackerRef.current[key] || '';
      if (current && current !== previous) {
        setTransientNotice({
          id: `${key}-${Date.now()}`,
          text: current,
          tone: resolveNoticeTone(current),
        });
      }
      noticeTrackerRef.current[key] = current;
    });
  }, [
    authError,
    passwordError,
    passwordStatus,
    caseMessage,
    poiMessage,
    villainMessage,
    evidenceMessage,
    ballisticsMessage,
    audioMessage,
    phoneMessage,
    tracerMessage,
    accessMessage,
    campaignMessage,
    globalCommandsMessage,
  ]);

  useEffect(() => {
    if (!transientNotice?.id) return undefined;
    const timeoutId = window.setTimeout(() => {
      setTransientNotice(null);
    }, 4200);
    return () => window.clearTimeout(timeoutId);
  }, [transientNotice?.id]);

  const flattenTree = (nodes, level = 0, acc = []) => {
    nodes.forEach(({ item, children }) => {
      if (item.id !== '__draft__') {
        acc.push({ item, level });
      }
      if (children?.length) {
        flattenTree(children, level + 1, acc);
      }
    });
    return acc;
  };

  const renderCampaignView = () => (
    <section className="dm-panel__section">
      <div className="dm-panel__header">
        <h2>Estado de campaña</h2>
        <p>Controla flags y desbloqueos para sincronizar con los agentes.</p>
      </div>
      <div className="dm-panel__grid">
        <div className="dm-panel__card">
          <form onSubmit={saveCampaign} className="dm-panel__form">
            <div className="dm-panel__form-group">
              <h4>Flags globales</h4>
              <label>
                Flags (una por linea)
                <textarea
                  className="dm-panel__textarea--sm"
                  value={campaignForm.flags}
                  onChange={(e) => setCampaignForm({ ...campaignForm, flags: e.target.value })}
                />
              </label>
            </div>

            <div className="dm-panel__form-group">
              <h4>Contexto operativo</h4>
              <div className="dm-panel__form-grid dm-panel__form-grid--two">
                <label>
                  Nivel de alerta
                  <select
                    value={campaignForm.alertLevel}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, alertLevel: e.target.value })
                    }
                  >
                    <option value="low">Bajo</option>
                    <option value="medium">Medio</option>
                    <option value="high">Alto</option>
                    <option value="critical">Critico</option>
                  </select>
                </label>
                <label>
                  Caso activo (ID)
                  <input
                    type="text"
                    value={campaignForm.activeCaseId}
                    onChange={(e) =>
                      setCampaignForm({ ...campaignForm, activeCaseId: e.target.value })
                    }
                  />
                </label>
              </div>
            </div>

            <div className="dm-panel__form-group">
              <h4>Desbloqueos</h4>
              <label>
                Casos desbloqueados (IDs)
                <textarea
                  className="dm-panel__textarea--sm"
                  value={campaignForm.unlockedModules}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, unlockedModules: e.target.value })
                  }
                />
              </label>
              <label>
                POIs desbloqueados (IDs)
                <textarea
                  className="dm-panel__textarea--sm"
                  value={campaignForm.unlockedMap}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, unlockedMap: e.target.value })
                  }
                />
              </label>
              <label>
                Villanos desbloqueados (IDs)
                <textarea
                  className="dm-panel__textarea--sm"
                  value={campaignForm.unlockedVillains}
                  onChange={(e) =>
                    setCampaignForm({ ...campaignForm, unlockedVillains: e.target.value })
                  }
                />
              </label>
            </div>

            {campaignMessage && <p className="dm-panel__hint">{campaignMessage}</p>}
            <div className="dm-panel__actions">
              <button type="submit" disabled={campaignLoading}>
                {campaignLoading ? 'Guardando...' : 'Guardar estado'}
              </button>
              <button type="button" onClick={refreshCampaign} disabled={campaignLoading}>
                Recargar
              </button>
            </div>
          </form>
        </div>
        <div className="dm-panel__card">
          <form onSubmit={saveGlobalCommands} className="dm-panel__form">
            <div className="dm-panel__form-group">
              <h4>Comandos globales</h4>
              <p className="dm-panel__hint">
                JSON con lista de comandos. Cada entrada debe incluir
                <code>triggers</code> y <code>response</code>.
              </p>
              <textarea
                className="dm-panel__textarea--lg"
                value={globalCommandsText}
                onChange={(e) => setGlobalCommandsText(e.target.value)}
                placeholder='[{"id":"oracle","triggers":["oracle","ora"],"response":["linea 1","linea 2"]}]'
              />
            </div>
            {globalCommandsMessage && (
              <p className="dm-panel__hint">{globalCommandsMessage}</p>
            )}
            <div className="dm-panel__actions">
              <button type="submit" disabled={globalCommandsLoading}>
                {globalCommandsLoading ? 'Guardando...' : 'Guardar comandos'}
              </button>
              <button
                type="button"
                onClick={refreshGlobalCommands}
                disabled={globalCommandsLoading}
              >
                Recargar
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );

  const formatDateTime = (timestamp, fallback = 'Sin dato') => {
    if (!timestamp) return fallback;
    const parsed = Number(timestamp);
    const date = Number.isNaN(parsed) ? new Date(timestamp) : new Date(parsed);
    if (Number.isNaN(date.getTime())) return fallback;
    return new Intl.DateTimeFormat('es-ES', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(date);
  };

  const formatUpdatedAt = (timestamp) => formatDateTime(timestamp, 'No guardado');

  const formatSaveState = (dirty, updatedAt, saveState) => {
    if (dirty) {
      return { label: '● Cambios sin guardar', status: 'dirty' };
    }
    if (saveState?.status === 'saved') {
      return { label: `✓ Guardado ${formatUpdatedAt(saveState.at)}`, status: 'saved' };
    }
    if (saveState?.status === 'error') {
      return { label: '⚠ Error al guardar', status: 'error' };
    }
    return { label: `✓ Guardado ${formatUpdatedAt(updatedAt)}`, status: 'saved' };
  };

  const caseMap = useMemo(() => {
    const map = new Map();
    cases.forEach((item) => map.set(item.id, item));
    return map;
  }, [cases]);

  const getCaseLabel = (caseId) => {
    const item = caseMap.get(caseId);
    return item ? getNodeLabel(item) : caseId;
  };

  const buildCaseIdPath = (nodeId) => {
    const path = [];
    let currentId = nodeId;
    let safety = 0;
    while (currentId && safety < 10) {
      const item = caseMap.get(currentId);
      if (!item) break;
      path.unshift(item.id);
      currentId = resolveParentId(item, 'cases');
      safety += 1;
    }
    return path;
  };

  const expandCaseParents = useCallback(
    (item) => {
      if (!item) return;
      const parentIds = [];
      let currentParent = resolveParentId(item, 'cases');
      let safety = 0;
      while (currentParent && safety < 10) {
        parentIds.push(currentParent);
        const parentItem = caseMap.get(currentParent);
        if (!parentItem) break;
        currentParent = resolveParentId(parentItem, 'cases');
        safety += 1;
      }
      if (!parentIds.length) return;
      setTreeState((prev) => {
        const next = { ...prev, cases: { ...(prev.cases || {}) } };
        parentIds.forEach((id) => {
          next.cases[id] = true;
        });
        return next;
      });
    },
    [caseMap]
  );

  const buildCasePreview = () => {
    const parentId =
      caseForm.parentId || (selectedCase ? resolveParentId(selectedCase, 'cases') : '');
    const primaryPoiLabel = caseForm.locationPoiId
      ? poiLocationOptions.find((option) => option.id === caseForm.locationPoiId)?.label || caseForm.locationPoiId
      : '';
    const relatedCount = parseLocationRefsText(caseForm.relatedLocationPois).length;
    return {
      title: caseForm.title?.trim() || 'Sin titulo',
      summary: caseForm.summary?.trim() || 'Sin resumen.',
      parentLabel: parentId ? getCaseLabel(parentId) : '',
      brief: caseForm.brief?.trim() || '',
      meta: primaryPoiLabel,
      state: relatedCount ? `${relatedCount} POIs relacionados` : '',
    };
  };

  const buildPoiPreview = () => {
    return {
      title: poiForm.name?.trim() || 'Sin nombre',
      summary: poiForm.summary?.trim() || 'Sin resumen.',
      meta: poiForm.district?.trim() ? poiForm.district.trim() : '',
      state: poiForm.status?.trim() ? poiForm.status.trim() : '',
      image: poiForm.mapImage || '',
    };
  };

  const buildVillainPreview = () => {
    const primaryPoiLabel = villainForm.locationPoiId
      ? poiLocationOptions.find((option) => option.id === villainForm.locationPoiId)?.label || villainForm.locationPoiId
      : '';
    const relatedCount = parseLocationRefsText(villainForm.relatedLocationPois).length;
    return {
      title: villainForm.alias?.trim() || 'Sin alias',
      summary: villainForm.summary?.trim() || 'Sin resumen.',
      meta: primaryPoiLabel,
      state: relatedCount ? `${relatedCount} POIs relacionados` : '',
    };
  };

  const renderCaseView = () => {
    const updatedAt = selectedCase?.updatedAt;
    const previewData = buildCasePreview();
    const parentId =
      caseForm.parentId || (selectedCase ? resolveParentId(selectedCase, 'cases') : '');
    const caseType = caseTypeOverride || (parentId ? 'subcase' : 'case');
    const isSubcase = caseType === 'subcase';
    const isDraft = caseDraftActive && !selectedCase;
    const parentPathIds = parentId ? buildCaseIdPath(parentId) : [];
    const parentPathLabels = parentPathIds.map(getCaseLabel);
    const pathParts = (() => {
      if (selectedCase?.id) {
        return buildCaseIdPath(selectedCase.id).map(getCaseLabel);
      }
      if (isDraft) {
        if (parentPathLabels.length) {
          return [...parentPathLabels, '(Nuevo subcaso)'];
        }
        return ['(Nuevo caso raiz)'];
      }
      return [caseForm.title || 'NUEVO CASO'];
    })();
    const breadcrumbValue = `CASOS > ${pathParts.join(' > ')}`;
    const selectedCasePath = selectedCase?.id ? buildCaseIdPath(selectedCase.id) : [];
    const ancestorIds = new Set(selectedCasePath.slice(0, -1));
    if (!selectedCase && isDraft && parentPathIds.length) {
      parentPathIds.forEach((id) => ancestorIds.add(id));
    }
    const saveState = formatSaveState(
      JSON.stringify(caseForm) !== caseBaseline,
      updatedAt,
      caseSaveState
    );
    const saveStateCompact =
      saveState.status === 'dirty'
        ? 'Cambios sin guardar'
        : saveState.status === 'error'
          ? 'Error al guardar'
          : 'Guardado';
    const availableParents = caseParentOptions.filter(
      (option) => option.id !== caseForm.id
    );
    const showBrief = Boolean(previewData.brief);
    const caseList = flattenTree(caseTreeWithDraft);

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Casos Knightfall</h2>
        {casesError && <p className="dm-panel__error">{casesError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector dm-panel__selector--cases">
            <div className="dm-panel__panel-title">Listado de casos</div>
            <div className="dm-panel__case-list">
              {caseList.map(({ item, level }, index) => {
                const parentId = item.commands?.parentId || '';
                const isSubcase = Boolean(parentId);
                const isActive = selectedCase?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`dm-panel__case-item ${isActive ? 'active' : ''}`}
                    style={level ? { paddingLeft: '12px' } : undefined}
                    title={`${isSubcase ? '› ' : ''}${getNodeLabel(item)}`}
                    onClick={() => {
                      setCaseDraftActive(false);
                      setSelectedCase(item);
                      setSelection('cases', item.id);
                      resetCaseForm(item);
                      expandCaseParents(item);
                    }}
                  >
                    <span className="dm-panel__case-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="dm-panel__case-title">
                      {isSubcase ? '› ' : ''}
                      {getNodeLabel(item)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dm-panel__details">
            <div className="dm-panel__breadcrumb">{breadcrumbValue}</div>
            <div
              className={`dm-panel__editor-layout ${
                previewOpen ? 'dm-panel__editor-layout--preview' : ''
              }`}
            >
              <div className="dm-panel__editor-main">
                <form onSubmit={saveCase} className="dm-panel__form">
                  <div className="dm-panel__editor-actions">
                    <button type="submit" className="dm-panel__primary">
                      Guardar
                    </button>
                    <button type="button" className="dm-panel__ghost" onClick={toggleAdvanced}>
                      {advancedOpen ? 'Avanzado ▾' : 'Avanzado ▸'}
                    </button>
                    <button
                      type="button"
                      className="dm-panel__ghost dm-panel__ghost--utility"
                      onClick={togglePreview}
                    >
                      {previewOpen ? 'Vista ▾' : 'Vista ▸'}
                    </button>
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveStateCompact}
                    </span>
                    <div className="dm-panel__editor-shortcuts">
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        onClick={() => {
                          setSelection('cases', '');
                          startNewCase('');
                        }}
                      >
                        Nuevo caso
                      </button>
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        disabled={!selectedCase}
                        onClick={() => {
                          if (!selectedCase) return;
                          setSelection('cases', '');
                          startNewCase(selectedCase.id);
                        }}
                      >
                        Nuevo subcaso
                      </button>
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        onClick={() => {
                          setSelectedCase(null);
                          setSelection('cases', '');
                          resetCaseForm(null);
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="dm-panel__editor-card">
                    <label>
                      {basicLabel('Tipo de nodo')}
                      <div className="dm-panel__segmented" role="group" aria-label="Tipo de nodo">
                        <button
                          type="button"
                          className={!isSubcase ? 'active' : ''}
                          aria-pressed={!isSubcase}
                          onClick={() => {
                            setCaseTypeOverride('case');
                            setCaseForm({ ...caseForm, parentId: '' });
                          }}
                        >
                          Caso
                        </button>
                        <button
                          type="button"
                          className={isSubcase ? 'active' : ''}
                          aria-pressed={isSubcase}
                          onClick={() => setCaseTypeOverride('subcase')}
                        >
                          Subcaso
                        </button>
                      </div>
                    </label>

                    {isSubcase && (
                      <label className="dm-panel__field-inline">
                        {basicLabel('Caso padre')}
                        <select
                          value={caseForm.parentId}
                          onChange={(e) =>
                            setCaseForm({ ...caseForm, parentId: e.target.value })
                          }
                          required
                        >
                          <option value="">Selecciona caso padre</option>
                          {availableParents.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <PoiPicker
                      label="POI principal"
                      value={caseForm.locationPoiId}
                      pois={pois}
                      onChange={(poiId) => setCaseForm({ ...caseForm, locationPoiId: poiId })}
                      onCreate={() => openPoiQuickCreate()}
                      onEdit={openPoiEditorById}
                      emptyLabel="Sin POI principal"
                    />

                    <PoiRelationEditor
                      label="POIs relacionados"
                      value={parseLocationRefsText(caseForm.relatedLocationPois)}
                      pois={pois}
                      roleOptions={CASE_LOCATION_ROLE_OPTIONS}
                      onCreatePoi={() => openPoiQuickCreate()}
                      onEditPoi={openPoiEditorById}
                      onChange={(refs) =>
                        setCaseForm({
                          ...caseForm,
                          relatedLocationPois: formatLocationRefsText(refs),
                        })
                      }
                    />

                    <label>
                      {basicLabel('Titulo')}
                      <input
                        type="text"
                        value={caseForm.title}
                        onChange={(e) =>
                          setCaseForm({ ...caseForm, title: e.target.value })
                        }
                        placeholder="Titulo del caso"
                        required
                      />
                    </label>

                    <label>
                      {basicLabel('Resumen', 'Visible para agentes. 2-5 lineas.')}
                      <textarea
                        className="dm-panel__textarea--md"
                        value={caseForm.summary}
                        onChange={(e) =>
                          setCaseForm({ ...caseForm, summary: e.target.value })
                        }
                        placeholder="Visible para agentes. 2-5 lineas."
                      />
                    </label>

                    <label>
                      {basicLabel('Brief', 'Texto libre interno del caso (mas extenso).')}
                      <textarea
                        className="dm-panel__textarea--lg"
                        value={caseForm.brief}
                        onChange={(e) =>
                          setCaseForm({ ...caseForm, brief: e.target.value })
                        }
                        placeholder="Texto libre interno del caso (mas extenso)."
                      />
                    </label>
                  </div>

                  {advancedOpen && (
                    <div className="dm-panel__advanced">
                      <div className="dm-panel__form-group">
                        <h4>Visibilidad / Acceso</h4>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {basicLabel('Visibilidad')}
                            <select
                              value={caseForm.accessVisibility}
                              onChange={(e) =>
                                setCaseForm({
                                  ...caseForm,
                                  accessVisibility: e.target.value,
                                })
                              }
                            >
                              {VISIBILITY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {basicLabel('Modo de desbloqueo')}
                            <select
                              value={caseForm.accessUnlockMode}
                              onChange={(e) =>
                                setCaseForm({
                                  ...caseForm,
                                  accessUnlockMode: e.target.value,
                                })
                              }
                            >
                              {UNLOCK_MODE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {caseForm.accessUnlockMode === 'password' && (
                          <label>
                            {basicLabel('Contraseña')}
                            <input
                              type="text"
                              value={caseForm.accessPassword}
                              onChange={(e) =>
                                setCaseForm({
                                  ...caseForm,
                                  accessPassword: e.target.value,
                                })
                              }
                            />
                          </label>
                        )}
                        <label>
                          {basicLabel('Prerrequisitos (IDs)')}
                          <input
                            type="text"
                            value={caseForm.accessPrerequisites}
                            onChange={(e) =>
                              setCaseForm({
                                ...caseForm,
                                accessPrerequisites: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {basicLabel('Flags requeridos')}
                          <input
                            type="text"
                            value={caseForm.accessFlags}
                            onChange={(e) =>
                              setCaseForm({
                                ...caseForm,
                                accessFlags: e.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {basicLabel('Auto unlock')}
                            <select
                              value={caseForm.accessAutoUnlockOn}
                              onChange={(e) =>
                                setCaseForm({
                                  ...caseForm,
                                  accessAutoUnlockOn: e.target.value,
                                })
                              }
                            >
                              {AUTO_UNLOCK_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label>
                            {basicLabel('Estado inicial')}
                            <select
                              value={caseForm.accessInitialStatus}
                              onChange={(e) =>
                                setCaseForm({
                                  ...caseForm,
                                  accessInitialStatus: e.target.value,
                                })
                              }
                            >
                              {INITIAL_STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>

                      <div className="dm-panel__form-group">
                        <h4>Metadatos</h4>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {basicLabel('Estado')}
                            <select
                              value={caseForm.status}
                              onChange={(e) =>
                                setCaseForm({ ...caseForm, status: e.target.value })
                              }
                            >
                              <option value="active">active</option>
                              <option value="locked">locked</option>
                              <option value="resolved">resolved</option>
                              <option value="archived">archived</option>
                            </select>
                          </label>
                          <label>
                            {basicLabel('Tipo de nodo')}
                            <select
                              value={caseForm.nodeType}
                              onChange={(e) =>
                                setCaseForm({ ...caseForm, nodeType: e.target.value })
                              }
                            >
                              {NODE_TYPE_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        <label>
                          {basicLabel('ID')}
                          <input
                            type="text"
                            value={caseForm.id}
                            readOnly={Boolean(selectedCase?.id)}
                            onChange={(e) =>
                              setCaseForm({ ...caseForm, id: e.target.value })
                            }
                          />
                        </label>
                      </div>

                      <div className="dm-panel__form-group">
                        <h4>Debug</h4>
                        <div className="dm-panel__debug-grid">
                          <div>
                            <span className="dm-panel__debug-label">Ruta</span>
                            <span className="dm-panel__debug-value">{breadcrumbValue}</span>
                          </div>
                          <div>
                            <span className="dm-panel__debug-label">Ultima actualizacion</span>
                            <span className="dm-panel__debug-value">
                              {formatUpdatedAt(updatedAt)}
                            </span>
                          </div>
                        </div>
                        {selectedCase && (
                          <button
                            type="button"
                            className="dm-panel__delete dm-panel__delete--compact"
                            onClick={deleteCase}
                          >
                            Eliminar caso
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {caseMessage && <p className="dm-panel__hint">{caseMessage}</p>}
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Vista agente</div>
                  {previewData.parentLabel && (
                    <div className="dm-panel__preview-meta">
                      › Subcaso de: {previewData.parentLabel}
                    </div>
                  )}
                  <div className="dm-panel__preview-title">{previewData.title}</div>
                  <div className="dm-panel__preview-summary">{previewData.summary}</div>
                  {showBrief && (
                    <div className="dm-panel__preview-brief">
                      <button
                        type="button"
                        className="dm-panel__preview-toggle"
                        onClick={() => setPreviewBriefOpen((prev) => !prev)}
                      >
                        {previewBriefOpen ? 'BRIEF ▾' : 'BRIEF ▸'}
                      </button>
                      {previewBriefOpen && (
                        <div className="dm-panel__preview-brief-body">
                          {previewData.brief}
                        </div>
                      )}
                    </div>
                  )}
                </aside>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderPoiView = () => {
    const sections = openSections.pois || defaultSections('pois', editorMode);
    const updatedAt = selectedPoi?.updatedAt;
    const previewData = buildPoiPreview();
    const isOperation = editorMode === 'operation';
    const saveState = formatSaveState(
      JSON.stringify(poiForm) !== poiBaseline,
      updatedAt,
      poiSaveState
    );
    const poiList = flattenTree(poiTree);
    const isDesktop = viewportWidth >= 980;
    const isMobile = viewportWidth <= 700;
    const saveStateCompact =
      saveState.status === 'dirty'
        ? 'Cambios sin guardar'
        : saveState.status === 'error'
          ? 'Error al guardar'
          : 'Guardado';
    const activeRow = selectedPoi?.id
      ? buildPoiRow(selectedPoi)
      : poiForm.id || poiForm.name
        ? {
            id: poiForm.id || 'draft',
            label: poiForm.name || poiForm.id || 'Nuevo POI',
            meta: poiForm.district || poiForm.status || '',
          }
        : null;
    const handlePoiSelect = (id) => {
      const match = poiList.find(({ item }) => item.id === id)?.item;
      if (!match) return;
      setSelectedPoi(match);
      setSelection('pois', match.id);
      resetPoiForm(match);
      addPoiRecent(match);
    };

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Puntos de interes</h2>
        {poisError && <p className="dm-panel__error">{poisError}</p>}
        <div className="dm-panel__grid dm-panel__grid--poi-editor">
          <div className="dm-panel__poi-left">
            <PoiSelector
              items={poiList.map(({ item }) => buildPoiRow(item))}
              selection={selectedPoi?.id || ''}
              error={poisError}
              onSelect={handlePoiSelect}
              active={activeRow}
              recents={poiRecents}
              isMobile={isMobile}
            />

            <div className="dm-panel__details dm-panel__poi-editor-shell">
              <div className="dm-panel__editor-layout dm-panel__editor-layout--poi">
                <PoiEditor
                  poiForm={poiForm}
                  setPoiForm={setPoiForm}
                  sections={sections}
                  toggleSection={toggleSection}
                  renderSection={renderSection}
                  labelRow={labelRow}
                  savePoi={savePoi}
                  advancedOpen={advancedOpen}
                  toggleAdvanced={toggleAdvanced}
                  previewOpen={previewOpen}
                  togglePreview={togglePreview}
                  saveState={saveState}
                  saveStateCompact={saveStateCompact}
                  resetPoi={() => resetPoiForm(null)}
                  clearPoi={() => {
                    setSelectedPoi(null);
                    setSelection('pois', '');
                    resetPoiForm(null);
                  }}
                  selectedPoi={selectedPoi}
                  deletePoi={deletePoi}
                  poiMessage={poiMessage}
                  isOperation={isOperation}
                  mapProps={{
                    aspectRatio: MAP_ASPECT_RATIO,
                    imageUrl: MAP_IMAGE,
                    markerStyle: mapMarkerStyle,
                    markerLabel: mapMarkerLabel,
                    onPick: handleMapPick,
                  }}
                  mapFineOpen={Boolean(advancedByView.poiFineTune)}
                  onToggleMapFine={() =>
                    setAdvancedByView((prev) => ({
                      ...prev,
                      poiFineTune: !prev.poiFineTune,
                    }))
                  }
                  imageCardProps={{
                    imageUrl: poiForm.mapImage,
                    previewUrl: poiImagePreview,
                    uploading: poiImageUploading,
                    error: poiImageError,
                    onReplaceClick: () => poiImageInputRef.current?.click(),
                    onClear: () => setPoiForm((prev) => ({ ...prev, mapImage: '' })),
                    onFileChange: (e) =>
                      handlePoiImageSelect(e.target.files?.[0] || null),
                    onDrop: (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('is-dragging');
                      const file = e.dataTransfer.files?.[0];
                      handlePoiImageSelect(file || null);
                    },
                    onDragOver: (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('is-dragging');
                    },
                    onDragLeave: (e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('is-dragging');
                    },
                    onOpenCrop: () => setPoiCropOpen(true),
                    fileInputRef: poiImageInputRef,
                  }}
                  resourceEditorProps={{
                    resources: poiForm.resources || [],
                    onAdd: addPoiResource,
                    onChange: updatePoiResource,
                    onRemove: removePoiResource,
                    onMove: movePoiResource,
                    onUpload: handlePoiResourceUpload,
                    uploadingId: poiResourceUploadingId,
                    uploadError: poiResourceUploadError,
                  }}
                  mapGridStep={MAP_GRID_STEP}
                  onClamp={clampNumber}
                  nodeTypeOptions={NODE_TYPE_OPTIONS}
                  parentOptions={poiParentOptions}
                  updatedAtLabel={formatUpdatedAt(updatedAt)}
                />
              </div>
            </div>
          </div>
          <div className="dm-panel__poi-right">
            <PoiPreview
              open={isDesktop ? previewOpen : previewOpen && !helpMode}
              onToggle={togglePreview}
              data={previewData}
              title="Vista agente"
            />
          </div>
        </div>
        {poiCropOpen && (
          <div className="dm-panel__modal">
            <div className="dm-panel__modal-backdrop" onClick={() => setPoiCropOpen(false)} />
            <div className="dm-panel__modal-card">
              <div className="dm-panel__modal-header">
                <strong>Recortar imagen POI</strong>
                <button
                  type="button"
                  className="dm-panel__ghost"
                  onClick={() => setPoiCropOpen(false)}
                >
                  Cerrar
                </button>
              </div>
              {poiImagePreview ? (
                <div className="dm-panel__map-crop">
                  <div
                    className="dm-panel__map-crop-frame"
                    ref={cropFrameRef}
                    style={{ aspectRatio: POI_IMAGE_ASPECT }}
                    onPointerDown={handleCropPointerDown}
                    onPointerMove={handleCropPointerMove}
                    onPointerUp={handleCropPointerUp}
                    onPointerLeave={handleCropPointerUp}
                  >
                    <img
                      ref={cropImageRef}
                      src={poiImagePreview}
                      alt="Recorte"
                      style={{
                        transform: `translate(-50%, -50%) translate(${poiCropOffset.x}px, ${poiCropOffset.y}px) scale(${poiCropZoom})`,
                      }}
                    />
                  </div>
                  <label>
                    {labelRow('Zoom', 'Ajusta el recorte antes de subir.')}
                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.05"
                      value={poiCropZoom}
                      onChange={(e) => setPoiCropZoom(Number(e.target.value))}
                    />
                  </label>
                  <div className="dm-panel__map-upload">
                    <button
                      type="button"
                      className="dm-panel__ghost"
                      onClick={handlePoiImageUpload}
                      disabled={poiImageUploading}
                    >
                      {poiImageUploading ? 'Subiendo...' : 'Subir imagen'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="dm-panel__hint">Selecciona una imagen para recortar.</p>
              )}
            </div>
          </div>
        )}
      </section>
    );
  };

  const renderVillainView = () => {
    const sections = openSections.villains || defaultSections('villains', editorMode);
    const updatedAt = selectedVillain?.updatedAt;
    const previewData = buildVillainPreview();
    const isOperation = editorMode === 'operation';
    const saveState = formatSaveState(
      JSON.stringify(villainForm) !== villainBaseline,
      updatedAt,
      villainSaveState
    );
    const villainList = flattenTree(villainTree);
    const saveStateCompact =
      saveState.status === 'dirty'
        ? 'Cambios sin guardar'
        : saveState.status === 'error'
          ? 'Error al guardar'
          : 'Guardado';

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Galeria de villanos</h2>
        {villainsError && <p className="dm-panel__error">{villainsError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector dm-panel__selector--cases">
            <div className="dm-panel__panel-title">Listado de villanos</div>
            <div className="dm-panel__case-list">
              {villainList.map(({ item, level }, index) => {
                const parentId = item.commands?.parentId || '';
                const isSubcase = Boolean(parentId);
                const isActive = selectedVillain?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`dm-panel__case-item ${isActive ? 'active' : ''}`}
                    style={level ? { paddingLeft: '12px' } : undefined}
                    title={`${isSubcase ? '› ' : ''}${getNodeLabel(item)}`}
                    onClick={() => {
                      setSelectedVillain(item);
                      setSelection('villains', item.id);
                      resetVillainForm(item);
                    }}
                  >
                    <span className="dm-panel__case-index">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="dm-panel__case-title">
                      {isSubcase ? '› ' : ''}
                      {getNodeLabel(item)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="dm-panel__details">
            <div
              className={`dm-panel__editor-layout ${
                previewOpen ? 'dm-panel__editor-layout--preview' : ''
              }`}
            >
              <div className="dm-panel__editor-main">
                <form onSubmit={saveVillain} className="dm-panel__form">
                  <div className="dm-panel__editor-actions">
                    <button type="submit" className="dm-panel__primary">
                      Guardar
                    </button>
                    <button type="button" className="dm-panel__ghost" onClick={toggleAdvanced}>
                      {advancedOpen ? 'Avanzado ▾' : 'Avanzado ▸'}
                    </button>
                    <button
                      type="button"
                      className="dm-panel__ghost dm-panel__ghost--utility"
                      onClick={togglePreview}
                    >
                      {previewOpen ? 'Vista ▾' : 'Vista ▸'}
                    </button>
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveStateCompact}
                    </span>
                    <div className="dm-panel__editor-shortcuts">
                      <button type="button" className="dm-panel__ghost" onClick={() => resetVillainForm(null)}>
                        Nuevo
                      </button>
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        onClick={() => {
                          setSelectedVillain(null);
                          setSelection('villains', '');
                          resetVillainForm(null);
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                  {renderSection({
                    id: 'villain-identity',
                    title: 'Identidad',
                    open: sections.identity,
                    onToggle: () => toggleSection('villains', 'identity'),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('ID', 'Identificador unico.')}
                            <input
                              type="text"
                              value={villainForm.id}
                              readOnly={Boolean(selectedVillain?.id)}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  id: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Alias', 'Nombre visible para agentes.')}
                            <input
                              type="text"
                              value={villainForm.alias}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  alias: e.target.value,
                                })
                              }
                              required
                            />
                          </label>
                        </div>
                      </div>
                    ),
                  })}

                  {renderSection({
                    id: 'villain-summary',
                    title: 'Agent-facing Summary',
                    open: sections.summary,
                    onToggle: () => toggleSection('villains', 'summary'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Resumen', 'Resumen visible.')}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={villainForm.summary}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                summary: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {renderSection({
                    id: 'villain-details',
                    title: 'Detalles de perfil',
                    open: sections.content,
                    onToggle: () => toggleSection('villains', 'content'),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('Nombre real', 'Campo opcional.')}
                            <input
                              type="text"
                              value={villainForm.realName}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  realName: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Estado', 'Activo, detenido, etc.')}
                            <input
                              type="text"
                              value={villainForm.status}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  status: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Especie', 'Humano, meta, etc.')}
                            <input
                              type="text"
                              value={villainForm.species}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  species: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Edad', 'Numero o rango.')}
                            <input
                              type="text"
                              value={villainForm.age}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  age: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Altura', 'Ej. 1.85m.')}
                            <input
                              type="text"
                              value={villainForm.height}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  height: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Peso', 'Ej. 90kg.')}
                            <input
                              type="text"
                              value={villainForm.weight}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  weight: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Nivel de amenaza', 'Bajo/Medio/Alto.')}
                            <input
                              type="text"
                              value={villainForm.threatLevel}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  threatLevel: e.target.value,
                                })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Ultima vez visto', 'Fecha o lugar.')}
                            <input
                              type="text"
                              value={villainForm.lastSeen}
                              onChange={(e) =>
                                setVillainForm({
                                  ...villainForm,
                                  lastSeen: e.target.value,
                                })
                              }
                            />
                          </label>
                          <PoiPicker
                            label="POI principal"
                            value={villainForm.locationPoiId}
                            pois={pois}
                            onChange={(poiId) =>
                              setVillainForm({
                                ...villainForm,
                                locationPoiId: poiId,
                              })
                            }
                            onCreate={() => openPoiQuickCreate()}
                            onEdit={openPoiEditorById}
                            emptyLabel="Sin POI principal"
                          />
                        </div>
                        <PoiRelationEditor
                          label="POIs relacionados"
                          value={parseLocationRefsText(villainForm.relatedLocationPois)}
                          pois={pois}
                          roleOptions={VILLAIN_LOCATION_ROLE_OPTIONS}
                          onCreatePoi={() => openPoiQuickCreate()}
                          onEditPoi={openPoiEditorById}
                          onChange={(refs) =>
                            setVillainForm({
                              ...villainForm,
                              relatedLocationPois: formatLocationRefsText(refs),
                            })
                          }
                        />
                        <label>
                          {labelRow('Patrones', 'Una linea por item.')}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={villainForm.patterns}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                patterns: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {labelRow('Asociados conocidos', 'Una linea por item.')}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={villainForm.knownAssociates}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                knownAssociates: e.target.value,
                              })
                            }
                          />
                        </label>
                        <label>
                          {labelRow('Notas', 'Una linea por item.')}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={villainForm.notes}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                notes: e.target.value,
                              })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {advancedOpen && !isOperation && renderSection({
                    id: 'villain-structure',
                    title: 'Estructura',
                    open: sections.engine,
                    onToggle: () => toggleSection('villains', 'engine'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Nodo padre (ID)', 'Jerarquia en menus.')}
                          <input
                            type="text"
                            list="villain-parent-options"
                            value={villainForm.parentId}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                parentId: e.target.value,
                              })
                            }
                            placeholder="Ej. vill_rogues"
                          />
                        </label>
                        <datalist id="villain-parent-options">
                          {villainParentOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </datalist>
                        <label>
                          {labelRow('Tipo de nodo', 'Controla submenu.')}
                          <select
                            value={villainForm.nodeType}
                            onChange={(e) =>
                              setVillainForm({
                                ...villainForm,
                                nodeType: e.target.value,
                              })
                            }
                          >
                            {NODE_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ),
                  })}

                  {advancedOpen && (
                    <div className="dm-panel__form-group">
                      <h4>Acceso por atributo</h4>
                      {VILLAIN_ATTRIBUTE_FIELDS.map((field, index) => {
                        const access = villainForm.attributeAccess?.[field.key] || {
                          visibility: defaultAccessConfig.visibility,
                          unlockMode: defaultAccessConfig.unlockMode,
                          password: '',
                          initialAccessStatus: defaultAccessConfig.initialAccessStatus,
                        };
                        const previousGroup =
                          index > 0 ? VILLAIN_ATTRIBUTE_FIELDS[index - 1].group : null;
                        const showGroup = field.group && field.group !== previousGroup;
                        return (
                          <div key={field.key} className="dm-panel__attribute-row">
                            {showGroup && (
                              <div className="dm-panel__attribute-group">{field.group}</div>
                            )}
                            <div className="dm-panel__attribute-title">{field.label}</div>
                            <div className="dm-panel__form-grid dm-panel__form-grid--two">
                              <label>
                                Visibilidad
                                <select
                                  value={access.visibility}
                                  onChange={(e) =>
                                    setVillainForm({
                                      ...villainForm,
                                      attributeAccess: {
                                        ...villainForm.attributeAccess,
                                        [field.key]: {
                                          ...access,
                                          visibility: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                >
                                  {VISIBILITY_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Modo de desbloqueo
                                <select
                                  value={access.unlockMode}
                                  onChange={(e) =>
                                    setVillainForm({
                                      ...villainForm,
                                      attributeAccess: {
                                        ...villainForm.attributeAccess,
                                        [field.key]: {
                                          ...access,
                                          unlockMode: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                >
                                  {UNLOCK_MODE_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              <label>
                                Estado inicial
                                <select
                                  value={access.initialAccessStatus}
                                  onChange={(e) =>
                                    setVillainForm({
                                      ...villainForm,
                                      attributeAccess: {
                                        ...villainForm.attributeAccess,
                                        [field.key]: {
                                          ...access,
                                          initialAccessStatus: e.target.value,
                                        },
                                      },
                                    })
                                  }
                                >
                                  {INITIAL_STATUS_OPTIONS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                      {option.label}
                                    </option>
                                  ))}
                                </select>
                              </label>
                              {access.unlockMode === 'password' && (
                                <label>
                                  Contraseña
                                  <input
                                    type="text"
                                    value={access.password}
                                    onChange={(e) =>
                                      setVillainForm({
                                        ...villainForm,
                                        attributeAccess: {
                                          ...villainForm.attributeAccess,
                                          [field.key]: {
                                            ...access,
                                            password: e.target.value,
                                          },
                                        },
                                      })
                                    }
                                  />
                                </label>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {advancedOpen && selectedVillain && (
                    <div className="dm-panel__form-group">
                      <h4>Debug</h4>
                      <div className="dm-panel__debug-grid">
                        <div>
                          <span className="dm-panel__debug-label">Ultima actualizacion</span>
                          <span className="dm-panel__debug-value">
                            {formatUpdatedAt(updatedAt)}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="dm-panel__delete dm-panel__delete--compact"
                        onClick={deleteVillain}
                      >
                        Eliminar villano
                      </button>
                    </div>
                  )}

                  {villainMessage && <p className="dm-panel__hint">{villainMessage}</p>}
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Vista agente</div>
                  <div className="dm-panel__preview-title">{previewData.title}</div>
                  <div className="dm-panel__preview-summary">{previewData.summary}</div>
                </aside>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  const renderEvidenceView = () => (
    <section className="dm-panel__section">
      <h2 className="dm-panel__section-title">Evidencias</h2>
      <div className="dm-panel__subtabs">
        <button
          type="button"
          className={evidenceTab === 'stl' ? 'active' : ''}
          onClick={() => setEvidenceTab('stl')}
        >
          STL
        </button>
        <button
          type="button"
          className={evidenceTab === 'ballistics' ? 'active' : ''}
          onClick={() => setEvidenceTab('ballistics')}
        >
          Balistica
        </button>
        <button
          type="button"
          className={evidenceTab === 'audio' ? 'active' : ''}
          onClick={() => setEvidenceTab('audio')}
        >
          Audio
        </button>
        <button
          type="button"
          className={evidenceTab === 'phones' ? 'active' : ''}
          onClick={() => setEvidenceTab('phones')}
        >
          Telefonos
        </button>
      </div>
      {evidenceTab === 'stl' ? (
        <div key="evidence-stl" className="dm-panel__grid dm-panel__grid--evidence">
          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Modelos</div>
            {evidenceLoading && <p className="dm-panel__hint">Cargando evidencias...</p>}
            {!evidenceLoading && !evidenceModels.length && (
              <p className="dm-panel__hint">No hay evidencias registradas.</p>
            )}
            <div className="dm-panel__list">
              {evidenceModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`dm-panel__list-item${
                    evidenceForm.id === model.id ? ' active' : ''
                  }`}
                  onClick={() =>
                    setEvidenceForm({
                      id: model.id || '',
                      label: model.label || '',
                      command: model.command || '',
                      stlPath: model.stlPath || '',
                    })
                  }
                >
                  <strong>{model.label || model.id}</strong>
                  <span>{model.command ? `SHOW ${model.command}` : model.id}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setEvidenceForm({ ...initialEvidenceForm });
                setEvidenceFile(null);
                setEvidenceMessage('');
                setEvidenceProfile('default');
                setEvidencePreviewNonce((prev) => prev + 1);
              }}
            >
              Nuevo
            </button>
          </div>

          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Detalle / Upload</div>
            <form onSubmit={handleEvidenceSave} className="dm-panel__form">
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('ID', 'Identificador interno para la evidencia.')}
                  <input
                    type="text"
                    value={evidenceForm.id}
                    onChange={(e) =>
                      setEvidenceForm((prev) => ({ ...prev, id: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Etiqueta', 'Texto mostrado en el visor ASCII.')}
                  <input
                    type="text"
                    value={evidenceForm.label}
                    onChange={(e) =>
                      setEvidenceForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Comando SHOW', 'Alias para invocar el modelo (SHOW <alias>).')}
                  <input
                    type="text"
                    value={evidenceForm.command}
                    onChange={(e) =>
                      setEvidenceForm((prev) => ({ ...prev, command: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Perfil ASCII', 'Selecciona el perfil de render en el preview.')}
                  <select
                    value={evidenceProfile}
                    onChange={(e) => setEvidenceProfile(e.target.value)}
                  >
                    <option value="default">Default</option>
                    <option value="wayne90x30">Wayne 90x30</option>
                    <option value="normal">Normal</option>
                  </select>
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Ruta STL', 'Ruta generada tras subir el archivo.')}
                  <input type="text" value={evidenceForm.stlPath} readOnly />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Subir STL', 'Solo .stl (max 20MB).')}
                  <input
                    type="file"
                    accept=".stl"
                    onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="dm-panel__form-actions">
                <button type="button" onClick={handleEvidenceUpload} disabled={evidenceUploading}>
                  {evidenceUploading ? 'Subiendo...' : 'Subir STL'}
                </button>
                <button type="submit" disabled={evidenceLoading}>
                  Guardar evidencia
                </button>
                {evidenceForm.id && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleEvidenceDelete(evidenceForm.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {evidenceMessage && <p className="dm-panel__hint">{evidenceMessage}</p>}
            </form>
            <div className="dm-panel__preview dm-panel__preview--evidence">
              <div className="dm-panel__panel-title">Preview ASCII</div>
              <div className="dm-panel__evidence-preview" ref={evidencePreviewRef} />
            </div>
          </div>
        </div>
      ) : evidenceTab === 'ballistics' ? (
        <div key="evidence-ballistics" className="dm-panel__grid dm-panel__grid--evidence">
          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">PNG Balistica</div>
            {ballisticsLoading && <p className="dm-panel__hint">Cargando balistica...</p>}
            {!ballisticsLoading && !ballisticsModels.length && (
              <p className="dm-panel__hint">No hay entradas balisticas registradas.</p>
            )}
            <div className="dm-panel__list">
              {ballisticsModels.map((model) => (
                <button
                  key={model.id}
                  type="button"
                  className={`dm-panel__list-item${
                    ballisticsForm.id === model.id ? ' active' : ''
                  }`}
                  onClick={() =>
                    setBallisticsForm({
                      id: model.id || '',
                      label: model.label || '',
                      assetId: model.assetId || '',
                      pngPath: model.pngPath || '',
                      caliber: model.caliber || '',
                      material: model.material || '',
                      bulletId: model.bulletId || '',
                      caseId: model.caseId || model.caseNumber || '',
                      caseCode: model.caseCode || '',
                      poiId: model.poiId || '',
                      crime: model.crime || '',
                      location: model.location || '',
                      status: model.status || '',
                      closedBy: model.closedBy || '',
                    })
                  }
                >
                  <strong>{model.label || model.id}</strong>
                  <span>
                    {model.caseCode || model.caseId
                      ? `${model.caseCode || ''}${model.caseCode && model.caseId ? ' · ' : ''}${model.caseId || ''}`
                      : model.location || model.id}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setBallisticsForm({ ...initialBallisticsForm });
                setBallisticsMessage('');
                setBallisticsFile(null);
              }}
            >
              Nuevo
            </button>
          </div>

          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Metadatos Balistica</div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                handleBallisticsSave();
              }}
              className="dm-panel__form dm-panel__form--compact"
            >
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('ID', 'Identificador interno para la entrada balistica.')}
                  <input
                    type="text"
                    value={ballisticsForm.id || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, id: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('PNG', 'Ruta del PNG (ej: /assets/ballistics/b01.png).')}
                  <input
                    type="text"
                    value={ballisticsForm.pngPath || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, pngPath: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('PNG existente', 'Selecciona un PNG ya cargado.')}
                  <select
                    value={ballisticsForm.pngPath || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setBallisticsForm((prev) => ({
                        ...prev,
                        pngPath: value,
                        assetId: prev.assetId || deriveAssetId(value),
                      }));
                    }}
                  >
                    <option value="">-- Seleccionar PNG --</option>
                    {ballisticsAssets.map((asset) => (
                      <option key={asset.id} value={asset.url}>
                        {asset.filename}
                      </option>
                    ))}
                  </select>
                </label>
                {ballisticsAssetsLoading && (
                  <p className="dm-panel__hint">Cargando PNGs...</p>
                )}
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Subir PNG', 'Solo .png (max 8MB).')}
                  <input
                    type="file"
                    accept=".png"
                    onChange={(e) => setBallisticsFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Case ID', 'ID de caso (ej: gcpd-XYZ-JKL).')}
                  <input
                    type="text"
                    value={ballisticsForm.caseId || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, caseId: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Codigo', 'Codigo de 3 letras asociado al caso.')}
                  <input
                    type="text"
                    value={ballisticsForm.caseCode || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, caseCode: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <PoiPicker
                  label="POI"
                  value={ballisticsForm.poiId || ''}
                  pois={pois}
                  onChange={applyPoiLocationToBallistics}
                  onCreate={() => openPoiQuickCreate()}
                  onEdit={openPoiEditorById}
                  emptyLabel="Sin POI vinculado"
                />
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Localizacion', 'Derivada del POI vinculado.')}
                  <input
                    type="text"
                    value={ballisticsForm.location || ''}
                    readOnly
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Crimen', 'Tipo de crimen asociado.')}
                  <input
                    type="text"
                    value={ballisticsForm.crime || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, crime: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Estado', 'Estado del caso (ej: ABIERTO).')}
                  <input
                    type="text"
                    value={ballisticsForm.status || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, status: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Cerrado por', 'Agente que cerró el caso (solo si está cerrado).')}
                  <input
                    type="text"
                    value={ballisticsForm.closedBy || ''}
                    onChange={(e) =>
                      setBallisticsForm((prev) => ({ ...prev, closedBy: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-actions">
                <button
                  type="button"
                  onClick={handleBallisticsUpload}
                  disabled={ballisticsUploading}
                >
                  {ballisticsUploading ? 'Subiendo...' : 'Subir PNG'}
                </button>
                <button type="submit" disabled={ballisticsLoading}>
                  Guardar balistica
                </button>
                {ballisticsForm.id && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleBallisticsDelete(ballisticsForm.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {ballisticsMessage && <p className="dm-panel__hint">{ballisticsMessage}</p>}
            </form>
            <div className="dm-panel__preview dm-panel__preview--ballistics">
              <div className="dm-panel__panel-title">Preview PNG</div>
              <div className="dm-panel__ballistics-preview-grid">
                <div className="dm-panel__ballistics-preview-cell">
                  <div className="dm-panel__ballistics-preview-label">Mitad izquierda</div>
                  <canvas
                    ref={ballisticsPreviewLeftRef}
                    width={320}
                    height={160}
                    className="dm-panel__ballistics-preview-canvas"
                  />
                </div>
                <div className="dm-panel__ballistics-preview-cell">
                  <div className="dm-panel__ballistics-preview-label">Mitad derecha</div>
                  <canvas
                    ref={ballisticsPreviewRightRef}
                    width={320}
                    height={160}
                    className="dm-panel__ballistics-preview-canvas"
                  />
                </div>
              </div>
              {!ballisticsForm.pngPath && (
                <p className="dm-panel__hint">Selecciona un PNG para previsualizar.</p>
              )}
            </div>
          </div>
        </div>
      ) : evidenceTab === 'audio' ? (
        <div key="evidence-audio" className="dm-panel__grid dm-panel__grid--evidence">
          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Audios</div>
            {audioLoading && <p className="dm-panel__hint">Cargando audios...</p>}
            {!audioLoading && !audioModels.length && (
              <p className="dm-panel__hint">No hay audios registrados.</p>
            )}
            <div className="dm-panel__list">
              {audioModels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dm-panel__list-item${
                    audioForm.id === item.id ? ' active' : ''
                  }`}
                  onClick={() => {
                    setAudioForm({
                      id: item.id || '',
                      title: item.title || '',
                      originalSrc: item.originalSrc || '',
                      garbledSrc: item.garbledSrc || '',
                      isGarbled: Boolean(item.isGarbled),
                      passwordHash: item.passwordHash || '',
                    });
                    setAudioGarble(Boolean(item.isGarbled));
                    setAudioPassword('');
                  }}
                >
                  <strong>{item.title || item.id}</strong>
                  <span>{item.isGarbled ? 'Cifrado' : 'Libre'}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setAudioForm({ ...initialAudioForm });
                setAudioMessage('');
                setAudioFile(null);
                setAudioGarble(false);
                setAudioPassword('');
              }}
            >
              Nuevo
            </button>
          </div>

          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Audio / Upload</div>
            <form onSubmit={handleAudioSave} className="dm-panel__form dm-panel__form--compact">
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('ID', 'Identificador interno del audio.')}
                  <input
                    type="text"
                    value={audioForm.id}
                    placeholder="Se genera al subir"
                    readOnly
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Titulo', 'Nombre visible para el audio.')}
                  <input
                    type="text"
                    value={audioForm.title}
                    onChange={(e) =>
                      setAudioForm((prev) => ({ ...prev, title: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('MP3', 'Ruta generada tras subir el audio.')}
                  <input type="text" value={audioForm.originalSrc} readOnly />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Cifrar', 'Genera version garbled del audio.')}
                  <select
                    value={audioGarble ? 'yes' : 'no'}
                    onChange={(e) => setAudioGarble(e.target.value === 'yes')}
                  >
                    <option value="no">No</option>
                    <option value="yes">Si</option>
                  </select>
                </label>
              </div>
              {audioGarble && (
                <div className="dm-panel__form-group">
                  <label>
                    {labelRow('Password', 'Clave para desbloqueo en terminal.')}
                    <input
                      type="password"
                      value={audioPassword}
                      onChange={(e) => setAudioPassword(e.target.value)}
                    />
                  </label>
                </div>
              )}
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Subir MP3', 'Solo .mp3 (max 20MB).')}
                  <input
                    type="file"
                    accept=".mp3"
                    onChange={(e) => setAudioFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Garbled', 'Ruta del audio cifrado (si aplica).')}
                  <input type="text" value={audioForm.garbledSrc} readOnly />
                </label>
              </div>
              <div className="dm-panel__form-actions">
                <button type="button" onClick={handleAudioUpload} disabled={audioUploading}>
                  {audioUploading ? 'Subiendo...' : 'Subir MP3'}
                </button>
                <button type="submit" disabled={audioLoading}>
                  Guardar audio
                </button>
                {audioForm.id && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleAudioDelete(audioForm.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {audioMessage && <p className="dm-panel__hint">{audioMessage}</p>}
            </form>
          </div>
        </div>
      ) : (
        <div key="evidence-phones" className="dm-panel__grid dm-panel__grid--evidence">
          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Telefonos</div>
            {phoneLoading && <p className="dm-panel__hint">Cargando lineas...</p>}
            {!phoneLoading && !phoneLines.length && (
              <p className="dm-panel__hint">No hay lineas registradas.</p>
            )}
            <div className="dm-panel__list">
              {phoneLines.map((line) => (
                <button
                  key={line.id}
                  type="button"
                  className={`dm-panel__list-item${
                    phoneForm.id === line.id ? ' active' : ''
                  }`}
                  onClick={() =>
                    setPhoneForm({
                      id: line.id || '',
                      number: line.number || '',
                      label: line.label || '',
                      audioId: line.audioId || '',
                      rellamable: Boolean(line.rellamable),
                      llamado: Boolean(line.llamado),
                    })
                  }
                >
                  <strong>{line.label || line.id}</strong>
                  <span>{line.number || line.audioId}</span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setPhoneForm({ ...initialPhoneForm });
                setPhoneMessage('');
              }}
            >
              Nuevo
            </button>
          </div>

          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Linea / Audio</div>
            <form onSubmit={handlePhoneSave} className="dm-panel__form dm-panel__form--compact">
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('ID', 'Identificador interno de la linea.')}
                  <input
                    type="text"
                    value={phoneForm.id}
                    placeholder="Se genera al subir"
                    readOnly
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Numero', 'Numero para DIAL (ej: 311-399-2364).')}
                  <input
                    type="text"
                    value={phoneForm.number}
                    onChange={(e) =>
                      setPhoneForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Etiqueta', 'Solo para uso interno del DM.')}
                  <input
                    type="text"
                    value={phoneForm.label}
                    onChange={(e) =>
                      setPhoneForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Audio', 'Selecciona el audio asociado.')}
                  <select
                    value={phoneForm.audioId}
                    onChange={(e) =>
                      setPhoneForm((prev) => ({ ...prev, audioId: e.target.value }))
                    }
                  >
                    <option value="">-- Sin audio --</option>
                    {audioModels.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.title || item.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Rellamable', 'Permite repetir llamadas.')}
                  <input
                    type="checkbox"
                    checked={phoneForm.rellamable}
                    onChange={(e) =>
                      setPhoneForm((prev) => ({ ...prev, rellamable: e.target.checked }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Llamado', 'Se activa al primer DIAL.')}
                  <input
                    type="checkbox"
                    checked={phoneForm.llamado}
                    onChange={(e) =>
                      setPhoneForm((prev) => ({ ...prev, llamado: e.target.checked }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Audio ID', 'ID auto generado tras subir MP3.')}
                  <input type="text" value={phoneForm.audioId} readOnly />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Subir MP3', 'Solo .mp3 (max 20MB).')}
                  <input
                    type="file"
                    accept=".mp3"
                    onChange={(e) => setPhoneFile(e.target.files?.[0] || null)}
                  />
                </label>
              </div>
              <div className="dm-panel__form-actions">
                <button type="button" onClick={handlePhoneUpload} disabled={phoneUploading}>
                  {phoneUploading ? 'Subiendo...' : 'Subir MP3'}
                </button>
                <button type="submit" disabled={phoneLoading}>
                  Guardar linea
                </button>
                {phoneForm.id && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handlePhoneDelete(phoneForm.id)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
              {phoneMessage && <p className="dm-panel__hint">{phoneMessage}</p>}
            </form>
          </div>
        </div>
      )}
    </section>
  );

  const renderTracerView = () => (
    <section className="dm-panel__section">
      <h2 className="dm-panel__section-title">Tracer</h2>
      <div className="dm-panel__card dm-panel__tracer-shell">
        <div className="dm-panel__tracer-head">
          <div>
            <div className="dm-panel__panel-title">Lineas DM y hotspots de traza</div>
            <p className="dm-panel__hint dm-panel__tracer-headline">
              {tracerLines.length} lineas DM / {tracerHotspots.length} hotspots / operador en vivo
              {' '}delegado a <code>/phone</code>
            </p>
          </div>
          <div className="dm-panel__form-actions dm-panel__tracer-quick-actions">
            <button
              type="button"
              onClick={() => {
                fillTracerLineForm();
                setTracerMessage('');
              }}
            >
              Nueva linea
            </button>
            <button
              type="button"
              onClick={() => {
                resetTracerHotspotForm();
                setTracerMessage('');
              }}
            >
              Nuevo hotspot
            </button>
          </div>
        </div>
        {tracerLoading && <p className="dm-panel__hint">Cargando tracer...</p>}
        {!tracerLoading && !tracerLines.length && (
          <p className="dm-panel__hint">Sin lineas tracer. Crea una linea y asignale hotspot.</p>
        )}
        <div className="dm-panel__tracer-lines-grid">
          {tracerLines.map((line) => {
            const linkedSpot = tracerHotspots.find((spot) => spot.id === line.hotspotId);
            return (
              <button
                key={line.id}
                type="button"
                className={`dm-panel__list-item dm-panel__tracer-line-item${
                  tracerLineForm.id === line.id ? ' active' : ''
                }`}
                onClick={() => {
                  fillTracerLineForm(line);
                  fillTracerHotspotForm(linkedSpot);
                }}
              >
                <div className="dm-panel__tracer-line-top">
                  <strong>{line.label || line.number || line.id}</strong>
                  <span
                    className={`dm-panel__tracer-state ${
                      line.enabled === false ? 'dm-panel__tracer-state--off' : ''
                    }`}
                  >
                    {line.enabled === false ? 'OFF' : 'ON'}
                  </span>
                </div>
                <div className="dm-panel__tracer-line-meta">
                  <span className="dm-panel__tracer-line-label">Numero</span>
                  <span>{line.number || line.id}</span>
                </div>
                <div className="dm-panel__tracer-line-meta">
                  <span className="dm-panel__tracer-line-label">Hotspot agente</span>
                  <span>{linkedSpot?.label || line.hotspotId || 'Sin hotspot'}</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="dm-panel__tracer-workspace">
          <div className="dm-panel__card dm-panel__tracer-map-card">
            <div className="dm-panel__panel-title">Hotspot (visible para Agentes)</div>
            {!tracerHotspots.length && !tracerLoading && (
              <p className="dm-panel__hint">Sin hotspots tracer.</p>
            )}
            <div className="dm-panel__tracer-hotspot-strip">
              {tracerHotspots.map((spot) => (
                <button
                  key={spot.id}
                  type="button"
                  className={`dm-panel__pill${
                    tracerHotspotForm.id === spot.id ? ' active' : ''
                  }`}
                  onClick={() => fillTracerHotspotForm(spot)}
                >
                  {spot.label || spot.id}
                </button>
              ))}
            </div>
            <form
              onSubmit={handleTracerHotspotSave}
              className="dm-panel__form dm-panel__form--compact dm-panel__form--tracer-hotspot"
            >
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('ID hotspot', 'Identificador tracer independiente de POIs.')}
                  <input
                    type="text"
                    value={tracerHotspotForm.id}
                    onChange={(e) =>
                      setTracerHotspotForm((prev) => ({ ...prev, id: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Label hotspot', 'Texto que se mostrara al agente al resolver la traza.')}
                  <input
                    type="text"
                    value={tracerHotspotForm.label}
                    onChange={(e) =>
                      setTracerHotspotForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <PoiPicker
                  label="POI base"
                  value={tracerHotspotForm.poiId}
                  pois={pois}
                  onChange={applyPoiLocationToTracerHotspot}
                  onCreate={() =>
                    openPoiQuickCreate({
                      name: tracerHotspotForm.label || tracerHotspotForm.id || '',
                      mapLabel: tracerHotspotForm.label || tracerHotspotForm.id || '',
                      mapX: tracerHotspotForm.x || '',
                      mapY: tracerHotspotForm.y || '',
                    })
                  }
                  onEdit={openPoiEditorById}
                  emptyLabel="Sin POI vinculado"
                />
              </div>
              <div className="dm-panel__map-picker dm-panel__map-picker--compact">
                <PoiMapPicker
                  aspectRatio={MAP_ASPECT_RATIO}
                  imageUrl={MAP_IMAGE}
                  markerStyle={tracerMarkerStyle}
                  markerLabel={tracerMarkerLabel}
                  values={{
                    x: tracerHotspotForm.x,
                    y: tracerHotspotForm.y,
                    radius: '',
                    label: tracerHotspotForm.label,
                  }}
                  onValueChange={(next = {}) =>
                    setTracerHotspotForm((prev) => ({
                      ...prev,
                      x: next.mapX !== undefined ? next.mapX : prev.x,
                      y: next.mapY !== undefined ? next.mapY : prev.y,
                      label: next.mapLabel !== undefined ? next.mapLabel : prev.label,
                    }))
                  }
                  onClamp={clampNumber}
                  mapGridStep={MAP_GRID_STEP}
                  mapFineOpen={false}
                  showFineButton={false}
                  showExpandButton={false}
                  expanded={tracerMapExpanded}
                  onExpandedChange={setTracerMapExpanded}
                  afterPreview={
                    <div className="dm-panel__form-actions dm-panel__tracer-map-actions">
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        onClick={() => setTracerMapExpanded(true)}
                      >
                        Expandir mapa
                      </button>
                      <button type="submit" disabled={tracerLoading}>
                        Guardar hotspot
                      </button>
                      {tracerHotspotForm.id && (
                        <button
                          type="button"
                          className="danger"
                          onClick={() => handleTracerHotspotDelete(tracerHotspotForm.id)}
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  }
                  labelRow={labelRow}
                  onClearCoords={() =>
                    setTracerHotspotForm((prev) => ({
                      ...prev,
                      poiId: '',
                      x: '',
                      y: '',
                    }))
                  }
                  onPick={() => {}}
                />
                <p className="dm-panel__hint">
                  El hotspot usa siempre las coordenadas del POI base. El mapa aquí es solo preview.
                </p>
              </div>
            </form>
          </div>

          <div className="dm-panel__card">
            <div className="dm-panel__panel-title">Linea asociada al hotspot</div>
            <form
              onSubmit={handleTracerLineSave}
              className="dm-panel__form dm-panel__form--compact dm-panel__form--tracer-line"
            >
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Numero', 'Identificador unico de la linea (DB) y usado por TRACER #TELEFONO.')}
                  <input
                    type="text"
                    value={tracerLineForm.number}
                    onChange={(e) =>
                      setTracerLineForm((prev) => ({ ...prev, number: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Label linea (DM)', 'Alias operativo para el DM (no es ID tecnico).')}
                  <input
                    type="text"
                    value={tracerLineForm.label}
                    onChange={(e) =>
                      setTracerLineForm((prev) => ({ ...prev, label: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Hotspot', 'Hotspot custom donde trazar.')}
                  <select
                    value={tracerLineForm.hotspotId}
                    onChange={(e) =>
                      setTracerLineForm((prev) => ({ ...prev, hotspotId: e.target.value }))
                    }
                  >
                    <option value="">-- Selecciona hotspot --</option>
                    {tracerHotspots.map((spot) => (
                      <option key={spot.id} value={spot.id}>
                        {spot.label || spot.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Activa', 'Si esta OFF, TRACER devolvera linea no valida.')}
                  <span className="dm-panel__tracer-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(tracerLineForm.enabled)}
                      onChange={(e) =>
                        setTracerLineForm((prev) => ({ ...prev, enabled: e.target.checked }))
                      }
                    />
                    <span>{tracerLineForm.enabled ? 'Linea activa' : 'Linea invalida para TRACER'}</span>
                  </span>
                </label>
              </div>
              <div className="dm-panel__form-actions">
                <button type="submit" disabled={tracerLoading}>
                  Guardar linea
                </button>
                {(tracerLineForm.id || tracerLineForm.number) && (
                  <button
                    type="button"
                    className="danger"
                    onClick={() => handleTracerLineDelete(tracerLineForm.id || tracerLineForm.number)}
                  >
                    Eliminar
                  </button>
                )}
              </div>
            </form>
            {tracerMessage && <p className="dm-panel__hint">{tracerMessage}</p>}
          </div>
        </div>
      </div>
    </section>
  );

  const renderAccessView = () => {
    const target = villains.find((item) => item.id === accessVillainId);
    const accessDirty = JSON.stringify(accessMatrix) !== accessBaseline;
    const runtimeUnlocked =
      campaignSnapshot?.unlockedAttributes?.villains?.[accessVillainId] || [];
    return (
      <section className="dm-panel__section">
        <h2 className="dm-panel__section-title">Accesos por atributo (Villanos)</h2>
        {!villains.length && (
          <p className="dm-panel__hint">No hay villanos cargados.</p>
        )}
        <div className="dm-panel__grid">
          <div className="dm-panel__card">
            <form onSubmit={saveAccessMatrix} className="dm-panel__form">
              <div className="dm-panel__form-group">
                <label>
                  {labelRow('Villano', 'Selecciona el perfil a editar.')}
                  <select
                    value={accessVillainId}
                    onChange={(e) => setAccessVillainId(e.target.value)}
                  >
                    {villains.map((villain) => (
                      <option key={villain.id} value={villain.id}>
                        {villain.alias || villain.id}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {target && (
                <div className="dm-panel__form-group">
                <div className="dm-panel__access-table">
                    <div className="dm-panel__access-row dm-panel__access-row--header">
                      <div>Atributo</div>
                      <div>Locked</div>
                      <div>Visible</div>
                      <div>Runtime</div>
                      <div>Frase</div>
                      <div>Token</div>
                    </div>
                    {VILLAIN_ATTRIBUTE_FIELDS.map((field) => {
                      const access = accessMatrix[field.key] || {
                        visibility: defaultAccessConfig.visibility,
                        unlockMode: defaultAccessConfig.unlockMode,
                        password: '',
                        phrase: '',
                        initialAccessStatus: defaultAccessConfig.initialAccessStatus,
                      };
                      const locked = access.initialAccessStatus !== 'unlocked';
                      const visible = access.visibility !== 'hidden';
                      const runtime = runtimeUnlocked.includes(field.key);
                      return (
                        <div key={field.key} className="dm-panel__access-row">
                          <div className="dm-panel__access-cell dm-panel__access-cell--name">
                            <span>{field.label}</span>
                          </div>
                          <div className="dm-panel__access-cell">
                            <input
                              type="checkbox"
                              checked={locked}
                              onChange={(e) =>
                                setAccessMatrix((prev) => ({
                                  ...prev,
                                  [field.key]: {
                                    ...access,
                                    initialAccessStatus: e.target.checked
                                      ? 'locked'
                                      : 'unlocked',
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="dm-panel__access-cell">
                            <input
                              type="checkbox"
                              checked={visible}
                              onChange={(e) =>
                                setAccessMatrix((prev) => ({
                                  ...prev,
                                  [field.key]: {
                                    ...access,
                                    visibility: e.target.checked ? 'listed' : 'hidden',
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="dm-panel__access-cell">
                            <input
                              type="checkbox"
                              checked={runtime}
                              onChange={(e) =>
                                updateRuntimeUnlock(field.key, e.target.checked)
                              }
                            />
                          </div>
                          <div className="dm-panel__access-cell">
                            <input
                              type="text"
                              value={access.phrase || ''}
                              placeholder="Frase"
                              onChange={(e) =>
                                setAccessMatrix((prev) => ({
                                  ...prev,
                                  [field.key]: {
                                    ...access,
                                    phrase: e.target.value,
                                  },
                                }))
                              }
                            />
                          </div>
                          <div className="dm-panel__access-cell">
                            <input
                              type="text"
                              value={access.password || ''}
                              placeholder="Token"
                              onChange={(e) => {
                                const nextPassword = e.target.value;
                                const nextUnlockMode = nextPassword
                                  ? 'password'
                                  : access.unlockMode === 'password'
                                    ? 'none'
                                    : access.unlockMode;
                                setAccessMatrix((prev) => ({
                                  ...prev,
                                  [field.key]: {
                                    ...access,
                                    password: nextPassword,
                                    unlockMode: nextUnlockMode,
                                  },
                                }));
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {accessMessage && <p className="dm-panel__hint">{accessMessage}</p>}
              <div className="dm-panel__actions">
                <button type="submit" disabled={accessLoading}>
                  {accessLoading ? 'Guardando...' : 'Guardar accesos'}
                </button>
                <button type="button" onClick={resetAccessMatrix} disabled={accessLoading}>
                  Recargar
                </button>
                <span className="dm-panel__save-state">
                  {accessDirty ? 'Cambios sin guardar' : 'Sin cambios'}
                </span>
              </div>
            </form>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div
      className={`dm-panel${activeView === 'cases' ? ' dm-panel--workspace' : ''}${
        authorized ? ' dm-panel--authorized' : ''
      }`}
    >
      <div className="dm-panel__inner">
        <section className="dm-panel__section dm-panel__auth">
          <div className="dm-panel__header">
            <h1>DM Control / Brother-MK0</h1>
          </div>
          {!authorized ? (
            <form onSubmit={handleAuthorize} className="dm-panel__card dm-panel__card--auth">
              <label>
                Introduce la contraseña de operador:
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••"
                />
              </label>
              {authError && <p className="dm-panel__error">{authError}</p>}
              <button type="submit" className="dm-panel__primary" disabled={authLoading}>
                {authLoading ? 'Verificando...' : 'Desbloquear panel'}
              </button>
              <p className="dm-panel__hint">
                La contraseña inicial se define en <code>DM_DEFAULT_PASSWORD</code> del
                servidor. Cambiala al entrar.
              </p>
            </form>
          ) : (
            <div className="dm-panel__card dm-panel__card--unlocked dm-panel__session-strip">
              <div className="dm-panel__session-copy">
                <p>Panel desbloqueado. Gestiona los casos activos.</p>
                {sessionInfo?.expiresAt && (
                  <p className="dm-panel__hint">
                    Sesion expira: {formatDateTime(sessionInfo.expiresAt, 'sin dato')}
                  </p>
                )}
              </div>
              <div className="dm-panel__session-actions">
                <a
                  href="/docs"
                  target="_blank"
                  rel="noreferrer"
                  className="dm-panel__ghost dm-panel__ghost--utility dm-panel__link-button"
                >
                  Ayuda / Docs
                </a>
                <button
                  type="button"
                  className="dm-panel__ghost dm-panel__ghost--utility"
                  aria-expanded={accountOpen}
                  onClick={() => setAccountOpen((prev) => !prev)}
                >
                  {accountOpen ? 'Ocultar seguridad' : 'Cuenta / Seguridad'}
                </button>
                <button
                  type="button"
                  className="dm-panel__ghost dm-panel__ghost--danger"
                  onClick={handleLogout}
                >
                  Cerrar sesion
                </button>
              </div>
            </div>
          )}

          {authorized && accountOpen && (
            <div className="dm-panel__accordion open">
              <div className="dm-panel__accordion-body">
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setPasswordStatus('');
                    setPasswordError('');
                    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
                      setPasswordError('Las nuevas contraseñas no coinciden.');
                      return;
                    }
                    try {
                      setPasswordLoading(true);
                      const res = await fetch(`${AUTH_ENDPOINT}/password`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          Authorization: `Bearer ${sessionToken}`,
                        },
                        body: JSON.stringify({
                          currentPassword: passwordForm.currentPassword,
                          newPassword: passwordForm.newPassword,
                        }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.message || 'No se pudo actualizar.');
                      setPasswordStatus('Contraseña actualizada. Vuelve a iniciar sesion.');
                      setPasswordForm({
                        currentPassword: '',
                        newPassword: '',
                        confirmPassword: '',
                      });
                      await handleLogout();
                    } catch (error) {
                      setPasswordError(error.message);
                    } finally {
                      setPasswordLoading(false);
                    }
                  }}
                  className="dm-panel__card"
                >
                  <h2>Actualizar contraseña</h2>
                  <label>
                    Contraseña actual
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          currentPassword: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Nueva contraseña
                    <input
                      type="password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          newPassword: e.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Repite la nueva contraseña
                    <input
                      type="password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({
                          ...prev,
                          confirmPassword: e.target.value,
                        }))
                      }
                    />
                  </label>
                  {passwordError && <p className="dm-panel__error">{passwordError}</p>}
                  {passwordStatus && <p className="dm-panel__hint">{passwordStatus}</p>}
                  <button type="submit" disabled={passwordLoading}>
                    {passwordLoading ? 'Actualizando...' : 'Guardar nueva contraseña'}
                  </button>
                </form>
              </div>
            </div>
          )}

        </section>

        {authorized && (
          <>
            <div className="dm-panel__workspace-top">
              {renderNav()}
              {transientNotice && (
                <div
                  className={`dm-panel__flash dm-panel__flash--${transientNotice.tone}`}
                  role="status"
                  aria-live="polite"
                >
                  {transientNotice.text}
                </div>
              )}
            </div>
            {activeView === 'cases' && renderCaseView()}
            {activeView === 'pois' && renderPoiView()}
            {activeView === 'villains' && renderVillainView()}
            {activeView === 'evidence' && renderEvidenceView()}
            {activeView === 'tracer' && renderTracerView()}
            {activeView === 'access' && renderAccessView()}
            {activeView === 'campaign' && renderCampaignView()}
            <PoiQuickCreateModal
              open={poiQuickCreateOpen}
              draft={poiQuickCreateDraft}
              setDraft={setPoiQuickCreateDraft}
              onClose={() => {
                setPoiQuickCreateOpen(false);
                setPoiQuickCreateError('');
              }}
              onSave={handlePoiQuickCreateSave}
              onOpenFullEditor={openPoiFullEditorFromDraft}
              saving={poiQuickCreateSaving}
              error={poiQuickCreateError}
              mapProps={{
                aspectRatio: MAP_ASPECT_RATIO,
                imageUrl: MAP_IMAGE,
                markerStyle: {
                  left: poiQuickCreateDraft.mapX ? `${poiQuickCreateDraft.mapX}%` : '-9999px',
                  top: poiQuickCreateDraft.mapY ? `${poiQuickCreateDraft.mapY}%` : '-9999px',
                  width: `${(Number(poiQuickCreateDraft.mapRadius) || 1.6) * 2}%`,
                  height: `${(Number(poiQuickCreateDraft.mapRadius) || 1.6) * 2}%`,
                  display:
                    Number.isFinite(Number(poiQuickCreateDraft.mapX)) &&
                    Number.isFinite(Number(poiQuickCreateDraft.mapY))
                      ? undefined
                      : 'none',
                },
                markerLabel: poiQuickCreateDraft.mapLabel || poiQuickCreateDraft.name || '',
                onPick: (rawX, rawY) => {
                  const x = Number(rawX);
                  const y = Number(rawY);
                  if (!Number.isFinite(x) || !Number.isFinite(y)) return;
                  const snappedX = (Math.round(x / MAP_GRID_STEP) * MAP_GRID_STEP).toFixed(2);
                  const snappedY = (Math.round(y / MAP_GRID_STEP) * MAP_GRID_STEP).toFixed(2);
                  setPoiQuickCreateDraft((prev) => ({
                    ...prev,
                    mapX: snappedX,
                    mapY: snappedY,
                  }));
                },
              }}
              labelRow={labelRow}
              onClamp={clampNumber}
              mapGridStep={MAP_GRID_STEP}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default DmPanel;
