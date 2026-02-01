import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import '../css/DmPanel.styles.css';

const CASES_ENDPOINT = '/api/cases-data';
const POIS_ENDPOINT = '/api/pois-data';
const VILLAINS_ENDPOINT = '/api/villains-data';
const AUTH_ENDPOINT = '/api/auth';
const CAMPAIGN_ENDPOINT = '/api/campaign-state';
const GLOBAL_COMMANDS_ENDPOINT = '/api/global-commands';
const EVIDENCE_ENDPOINT = '/api/evidence';
const EVIDENCE_UPLOAD_ENDPOINT = '/api/evidence-upload';

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
  category: 'cases',
  brief: '',
  intel: '',
  puzzleType: 'sudoku',
  puzzleConfig: '{\n  "seed": 12345\n}',
  dmNotes: '',
  dmSpoilers: '',
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

const CATEGORY_OPTIONS = {
  cases: [{ value: 'cases', label: 'Casos' }],
  pois: [{ value: 'map', label: 'Mapa' }],
  villains: [{ value: 'villains', label: 'Villanos' }],
};

const MODE_OPTIONS = [
  { value: 'operation', label: 'Modo operativo' },
  { value: 'authoring', label: 'Modo autoria' },
];

const STORAGE_KEYS = {
  mode: 'dmPanelMode',
  activeView: 'dmPanelActiveView',
  selections: 'dmPanelSelections',
  preview: 'dmPanelPreview',
  selector: 'dmPanelSelector',
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
};

const initialEvidenceForm = {
  id: '',
  label: '',
  command: '',
  stlPath: '',
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
  category: 'villains',
  attributeAccess: buildAttributeAccessForm(),
};

const splitList = (value = '') =>
  value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

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
  { id: 'access', label: 'Accesos' },
  { id: 'campaign', label: 'Campaña' },
];

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

const commandsToFormFields = (commands = {}, defaults = { category: '' }) => ({
  brief: (commands?.brief || []).join('\n'),
  nodeType: commands?.nodeType || 'mixed',
  parentId: commands?.parentId || '',
  category: commands?.category || defaults.category,
});

const formFieldsToCommands = (form, defaults = { category: '' }, existing = {}) => ({
  ...existing,
  brief: splitLines(form.brief),
  nodeType: form.nodeType,
  parentId: form.parentId,
  category: form.category || defaults.category,
});

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
      <span className="dm-panel__tooltip" tabIndex="0" data-tooltip={tooltip}>
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
      <span className="dm-panel__tooltip" tabIndex="0" data-tooltip={tooltip}>
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
  item?.commands?.menuAlias || item.title || item.name || item.alias || item.id;

const resolveParentId = (item, scope) => {
  const explicit = item?.commands?.parentId;
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

const getNodeStatusVariant = (item) => {
  const visibility = item?.unlockConditions?.visibility || 'listed';
  if (visibility === 'hidden') return 'hidden';
  const unlockMode = item?.unlockConditions?.unlockMode || 'none';
  const initialStatus = item?.unlockConditions?.initialAccessStatus || 'locked';
  if (unlockMode !== 'none' && initialStatus !== 'unlocked') {
    return 'locked';
  }
  return 'active';
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
  const [editorMode, setEditorMode] = useState(
    () => readStorage(STORAGE_KEYS.mode, 'operation')
  );
  const [openSections, setOpenSections] = useState({});
  const [previewByView, setPreviewByView] = useState(
    () => readJsonStorage(STORAGE_KEYS.preview, {})
  );
  const [advancedByView, setAdvancedByView] = useState({});
  const [selectorByView, setSelectorByView] = useState(
    () => readJsonStorage(STORAGE_KEYS.selector, {})
  );
  const [helpMode, setHelpMode] = useState(
    () => readStorage(STORAGE_KEYS.help, 'off') === 'on'
  );
  const [viewportWidth, setViewportWidth] = useState(
    () => (typeof window !== 'undefined' ? window.innerWidth : 1280)
  );
  const [selectionState, setSelectionState] = useState(
    () => readJsonStorage(STORAGE_KEYS.selections, {})
  );
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
  const evidencePreviewRef = useRef(null);
  const evidenceViewerRef = useRef(null);
  const evidenceMeshRef = useRef(null);
  const evidenceMaterialRef = useRef(null);
  const evidenceAxisCleanupRef = useRef(null);

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

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

  const toggleTreeNode = useCallback((scope, nodeId) => {
    setTreeState((prev) => ({
      ...prev,
      [scope]: {
        ...prev[scope],
        [nodeId]: !(prev[scope]?.[nodeId] ?? true),
      },
    }));
  }, []);

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
    fetch(POIS_ENDPOINT, { headers: { Authorization: `Bearer ${sessionToken}` } })
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
    } catch (error) {}
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
      setSelectedPoi(null);
      setPoiBaseline(JSON.stringify(initialPoiForm));
      return;
    }
    const nextForm = {
      id: data.id || '',
      name: data.name || '',
      district: data.district || '',
      status: data.status || '',
      summary: data.summary || '',
      nodeType: data.commands?.nodeType || 'mixed',
      parentId: data.commands?.parentId || '',
      category: data.commands?.category || 'map',
      details: (data.details || []).join('\n'),
    };
    setPoiForm(nextForm);
    setPoiBaseline(JSON.stringify(nextForm));
  };

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
      nodeType: data.commands?.nodeType || 'mixed',
      parentId: data.commands?.parentId || '',
      category: data.commands?.category || 'villains',
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
    const existingAccessCode = selectedPoi?.accessCode || undefined;
    const existingUnlock = selectedPoi?.unlockConditions || { ...defaultAccessConfig };
    const existingContacts = Array.isArray(selectedPoi?.contacts) ? selectedPoi.contacts : [];
    const existingNotes = Array.isArray(selectedPoi?.notes) ? selectedPoi.notes : [];
    const existingDm =
      selectedPoi?.dm && typeof selectedPoi.dm === 'object'
        ? selectedPoi.dm
        : { notes: '', spoilers: [] };
    const existingCommands =
      selectedPoi?.commands && typeof selectedPoi.commands === 'object'
        ? selectedPoi.commands
        : {};
    const payload = {
      id: poiForm.id.trim() || `poi_${Date.now().toString(36)}`,
      name: poiForm.name,
      district: poiForm.district,
      status: poiForm.status,
      summary: poiForm.summary,
      accessCode: existingAccessCode,
      unlockConditions: existingUnlock,
      details: splitLines(poiForm.details),
      contacts: existingContacts,
      notes: existingNotes,
      dm: existingDm,
      commands: {
        ...existingCommands,
        nodeType: poiForm.nodeType,
        parentId: poiForm.parentId,
        category: poiForm.category || 'map',
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
      if (!res.ok) throw new Error('No se pudo guardar el POI');
      const saved = await res.json();
      setPoiMessage('POI guardado');
      setPoiSaveState({ status: 'saved', at: Date.now() });
      resetPoiForm(saved);
      setSelectedPoi(saved);
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
      commands: {
        ...existingCommands,
        nodeType: villainForm.nodeType,
        parentId: villainForm.parentId,
        category: villainForm.category || 'villains',
      },
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
    try {
      localStorage.setItem(STORAGE_KEYS.activeView, activeView);
    } catch (error) {}
  }, [activeView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.mode, editorMode);
    } catch (error) {}
  }, [editorMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.preview, JSON.stringify(previewByView));
    } catch (error) {}
  }, [previewByView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.selector, JSON.stringify(selectorByView));
    } catch (error) {}
  }, [selectorByView]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.help, helpMode ? 'on' : 'off');
    } catch (error) {}
  }, [helpMode]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.selections, JSON.stringify(selectionState));
    } catch (error) {}
  }, [selectionState]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.tree, JSON.stringify(treeState));
    } catch (error) {}
  }, [treeState]);

  useEffect(() => {
    const handleResize = () => setViewportWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDefaultPreviewOpen = () => viewportWidth >= 1024;
  const getDefaultSelectorOpen = () => viewportWidth >= 640;

  const previewOpen = previewByView[activeView] ?? getDefaultPreviewOpen();
  const selectorOpen = selectorByView[activeView] ?? getDefaultSelectorOpen();
  const advancedOpen = advancedByView[activeView] ?? false;

  const togglePreview = () => {
    setPreviewByView((prev) => ({ ...prev, [activeView]: !previewOpen }));
  };

  const toggleSelector = () => {
    setSelectorByView((prev) => ({ ...prev, [activeView]: !selectorOpen }));
  };

  const toggleAdvanced = () => {
    setAdvancedByView((prev) => ({ ...prev, [activeView]: !advancedOpen }));
  };

  const defaultSections = (view, mode) => {
    if (mode === 'authoring') {
      return {
        identity: true,
        summary: true,
        quick: true,
        content: true,
        dm: false,
        engine: false,
        preview: true,
      };
    }
    return {
      identity: true,
      summary: true,
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

  const setSelection = (view, id) => {
    setSelectionState((prev) => ({
      ...prev,
      [view]: id || '',
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
    if (!authorized) return;
    if (activeView !== 'evidence') return;
    loadEvidenceModels();
  }, [authorized, activeView, loadEvidenceModels]);

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
    </div>
  );

  const renderTree = (nodes, selectedId, onSelect, scope, level = 0, options = {}) => (
    <ul className="dm-panel__tree">
      {nodes.map(({ item, children }, index) => {
        const hasChildren = children.length > 0;
        const expanded = treeState[scope]?.[item.id] ?? true;
        const updated = isRecentlyUpdated(item.updatedAt);
        const isCaseTree = scope === 'cases';
        const isRoot = level === 0;
        const isDraftNode = item.id === '__draft__';
        const nodeLabel = isDraftNode
          ? `${getNodeLabel(item)} (borrador)`
          : getNodeLabel(item);
        const isAncestor = options?.highlightIds?.has(item.id);
        const isLast = index === nodes.length - 1;
        const showToggle = hasChildren && (!isCaseTree || isRoot);
        return (
          <li key={item.id}>
            <div
              className="dm-panel__tree-row"
              style={{ paddingLeft: `calc(var(--dm-tree-indent, 16px) * ${level})` }}
            >
              {showToggle ? (
                <button
                  type="button"
                  className="dm-panel__tree-toggle"
                  onClick={() => toggleTreeNode(scope, item.id)}
                  aria-label={expanded ? 'Colapsar' : 'Expandir'}
                >
                  {expanded ? '▾' : '▸'}
                </button>
              ) : (
                <span className="dm-panel__tree-placeholder" />
              )}
              <button
                type="button"
                className={`dm-panel__tree-node ${
                  selectedId === item.id ? 'active' : ''
                } ${isAncestor ? 'ancestor' : ''}`}
                onClick={() => onSelect(item)}
              >
                {isCaseTree && (
                  <span
                    className={`dm-panel__tree-badge dm-panel__tree-badge--${
                      isRoot ? 'root' : 'subcase'
                    }`}
                  >
                    {isRoot ? 'R' : 'S'}
                  </span>
                )}
                <span
                  className={`dm-panel__tree-status dm-panel__tree-status--${getNodeStatusVariant(item)}`}
                  title={`Visibilidad: ${item.unlockConditions?.visibility || 'listed'}`}
                />
                {isCaseTree && level > 0 && (
                  <span className="dm-panel__tree-connector">
                    {isLast ? '└─' : '├─'}
                  </span>
                )}
                {updated && <span className="dm-panel__tree-update">~</span>}
                <span
                  className={`dm-panel__tree-label ${
                    isDraftNode ? 'dm-panel__tree-label--draft' : ''
                  }`}
                >
                  {nodeLabel}
                </span>
              </button>
            </div>
            {hasChildren && expanded &&
              renderTree(children, selectedId, onSelect, scope, level + 1, options)}
          </li>
        );
      })}
    </ul>
  );

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

  const formatUpdatedAt = (timestamp) => {
    if (!timestamp) return 'No guardado';
    return new Date(timestamp).toLocaleString();
  };

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

  const isRecentlyUpdated = (timestamp) => {
    if (!timestamp) return false;
    const now = Date.now();
    return now - Number(timestamp) < 1000 * 60 * 60 * 24;
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

  const resolvePreviewAccess = (form, scope) => {
    if (form.accessUnlockMode === 'none' || form.accessInitialStatus === 'unlocked') {
      return { unlocked: true, reason: 'default' };
    }
    const unlocked = campaignSnapshot?.unlocked?.[scope] || [];
    if (form.id && unlocked.includes(form.id)) {
      return { unlocked: true, reason: 'campaign' };
    }
    return { unlocked: false, reason: 'conditions' };
  };

  const buildCasePreview = () => {
    const parentId =
      caseForm.parentId || (selectedCase ? resolveParentId(selectedCase, 'cases') : '');
    return {
      title: caseForm.title?.trim() || 'Sin titulo',
      summary: caseForm.summary?.trim() || 'Sin resumen.',
      parentLabel: parentId ? getCaseLabel(parentId) : '',
      brief: caseForm.brief?.trim() || '',
    };
  };

  const buildPoiPreview = () => {
    return {
      title: poiForm.name?.trim() || 'Sin nombre',
      summary: poiForm.summary?.trim() || 'Sin resumen.',
      meta: poiForm.district?.trim() ? `Distrito: ${poiForm.district.trim()}` : '',
    };
  };

  const buildVillainPreview = () => {
    return {
      title: villainForm.alias?.trim() || 'Sin alias',
      summary: villainForm.summary?.trim() || 'Sin resumen.',
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
                    data-tooltip={`${isSubcase ? '› ' : ''}${getNodeLabel(item)}`}
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
                    <button type="button" className="dm-panel__ghost" onClick={togglePreview}>
                      {previewOpen ? 'Preview ▾' : 'Preview ▸'}
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
                  <div className="dm-panel__panel-title">Preview agente</div>
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
    const saveStateCompact =
      saveState.status === 'dirty'
        ? 'Cambios sin guardar'
        : saveState.status === 'error'
          ? 'Error al guardar'
          : 'Guardado';

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Puntos de interes</h2>
        {poisError && <p className="dm-panel__error">{poisError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector dm-panel__selector--cases">
            <div className="dm-panel__panel-title">Listado de POIs</div>
            <div className="dm-panel__case-list">
              {poiList.map(({ item, level }, index) => {
                const parentId = item.commands?.parentId || '';
                const isSubcase = Boolean(parentId);
                const isActive = selectedPoi?.id === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`dm-panel__case-item ${isActive ? 'active' : ''}`}
                    style={level ? { paddingLeft: '12px' } : undefined}
                    data-tooltip={`${isSubcase ? '› ' : ''}${getNodeLabel(item)}`}
                    onClick={() => {
                      setSelectedPoi(item);
                      setSelection('pois', item.id);
                      resetPoiForm(item);
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
                <form onSubmit={savePoi} className="dm-panel__form">
                  <div className="dm-panel__editor-actions">
                    <button type="submit" className="dm-panel__primary">
                      Guardar
                    </button>
                    <button type="button" className="dm-panel__ghost" onClick={toggleAdvanced}>
                      {advancedOpen ? 'Avanzado ▾' : 'Avanzado ▸'}
                    </button>
                    <button type="button" className="dm-panel__ghost" onClick={togglePreview}>
                      {previewOpen ? 'Preview ▾' : 'Preview ▸'}
                    </button>
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveStateCompact}
                    </span>
                    <div className="dm-panel__editor-shortcuts">
                      <button type="button" className="dm-panel__ghost" onClick={() => resetPoiForm(null)}>
                        Nuevo
                      </button>
                      <button
                        type="button"
                        className="dm-panel__ghost"
                        onClick={() => {
                          setSelectedPoi(null);
                          setSelection('pois', '');
                          resetPoiForm(null);
                        }}
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                  {renderSection({
                    id: 'poi-identity',
                    title: 'Identidad',
                    open: sections.identity,
                    onToggle: () => toggleSection('pois', 'identity'),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('ID', 'Identificador unico para la TUI.')}
                            <input
                              type="text"
                              value={poiForm.id}
                              readOnly={Boolean(selectedPoi?.id)}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, id: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Nombre', 'Nombre visible para agentes.')}
                            <input
                              type="text"
                              value={poiForm.name}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, name: e.target.value })
                              }
                            />
                          </label>
                        </div>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('Distrito', 'Zona de Gotham.')}
                            <input
                              type="text"
                              value={poiForm.district}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, district: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Estado', 'Estado operativo.')}
                            <input
                              type="text"
                              value={poiForm.status}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, status: e.target.value })
                              }
                            />
                          </label>
                        </div>
                      </div>
                    ),
                  })}

                  {renderSection({
                    id: 'poi-summary',
                    title: 'Agent-facing Summary',
                    open: sections.summary,
                    onToggle: () => toggleSection('pois', 'summary'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Resumen', 'Texto breve visible para agentes.')}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={poiForm.summary}
                            onChange={(e) =>
                              setPoiForm({ ...poiForm, summary: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {advancedOpen && !isOperation && renderSection({
                    id: 'poi-content',
                    title: 'Detalles',
                    open: sections.content,
                    onToggle: () => toggleSection('pois', 'content'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Detalles', 'Intel visible en la TUI.')}
                          <textarea
                            className="dm-panel__textarea--md"
                            value={poiForm.details}
                            onChange={(e) =>
                              setPoiForm({ ...poiForm, details: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {advancedOpen && !isOperation && renderSection({
                    id: 'poi-structure',
                    title: 'Estructura',
                    open: sections.engine,
                    onToggle: () => toggleSection('pois', 'engine'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Nodo padre (ID)', 'Jerarquia en menus.')}
                          <input
                            type="text"
                            list="poi-parent-options"
                            value={poiForm.parentId}
                            onChange={(e) =>
                              setPoiForm({ ...poiForm, parentId: e.target.value })
                            }
                            placeholder="Ej. poi_narrows"
                          />
                        </label>
                        <datalist id="poi-parent-options">
                          {poiParentOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </datalist>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('Tipo de nodo', 'Controla submenu.')}
                            <select
                              value={poiForm.nodeType}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, nodeType: e.target.value })
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
                      </div>
                    ),
                  })}

                  {advancedOpen && selectedPoi && (
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
                        onClick={deletePoi}
                      >
                        Eliminar POI
                      </button>
                    </div>
                  )}

                  {poiMessage && <p className="dm-panel__hint">{poiMessage}</p>}
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Preview agente</div>
                  {previewData.meta && (
                    <div className="dm-panel__preview-meta">{previewData.meta}</div>
                  )}
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
                    data-tooltip={`${isSubcase ? '› ' : ''}${getNodeLabel(item)}`}
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
                    <button type="button" className="dm-panel__ghost" onClick={togglePreview}>
                      {previewOpen ? 'Preview ▾' : 'Preview ▸'}
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
                        </div>
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
                  <div className="dm-panel__panel-title">Preview agente</div>
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
      <h2 className="dm-panel__section-title">Evidencias STL</h2>
      <div className="dm-panel__grid dm-panel__grid--evidence">
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
            <form onSubmit={handleAuthorize} className="dm-panel__card">
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
              <button type="submit" disabled={authLoading}>
                {authLoading ? 'Verificando...' : 'Desbloquear panel'}
              </button>
              <p className="dm-panel__hint">
                El servidor Node inicializa la contraseña con <code>DM_DEFAULT_PASSWORD</code>
                (por defecto: <code>brother</code>). Puedes cambiarla una vez estes dentro.
              </p>
            </form>
          ) : (
            <div className="dm-panel__card dm-panel__card--unlocked">
              <p>Panel desbloqueado. Gestiona los casos activos.</p>
              {sessionInfo?.expiresAt && (
                <p className="dm-panel__hint">
                  Sesion expira: {new Date(Number(sessionInfo.expiresAt)).toLocaleString()}
                </p>
              )}
              <button type="button" onClick={handleLogout}>
                Cerrar sesion
              </button>
            </div>
          )}

          {authorized && (
            <div className={`dm-panel__accordion ${accountOpen ? 'open' : ''}`}>
              <button
                type="button"
                className="dm-panel__accordion-toggle"
                onClick={() => setAccountOpen((prev) => !prev)}
              >
                <span>Cuenta / Seguridad</span>
                <span className="dm-panel__accordion-icon">{accountOpen ? '▾' : '▸'}</span>
              </button>
              {accountOpen && (
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
              )}
            </div>
          )}
        </section>

        {authorized && (
          <>
            {renderNav()}
            {activeView === 'cases' && renderCaseView()}
            {activeView === 'pois' && renderPoiView()}
            {activeView === 'villains' && renderVillainView()}
            {activeView === 'evidence' && renderEvidenceView()}
            {activeView === 'access' && renderAccessView()}
            {activeView === 'campaign' && renderCampaignView()}
          </>
        )}
      </div>
    </div>
  );
};

export default DmPanel;
