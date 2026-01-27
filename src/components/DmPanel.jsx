import { useCallback, useEffect, useMemo, useState } from 'react';
import '../css/DmPanel.styles.css';

const CASES_ENDPOINT = '/api/cases-data';
const POIS_ENDPOINT = '/api/pois-data';
const VILLAINS_ENDPOINT = '/api/villains-data';
const AUTH_ENDPOINT = '/api/auth';
const CAMPAIGN_ENDPOINT = '/api/campaign-state';

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

const initialVillainForm = {
  id: '',
  alias: '',
  summary: '',
  nodeType: 'mixed',
  parentId: '',
  category: 'villains',
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

const labelRow = (label, tooltip, impact) => (
  <span className="dm-panel__label-row">
    <span>{label}</span>
    {impact && <span className="dm-panel__impact">Affects: {impact}</span>}
    {tooltip && (
      <span className="dm-panel__tooltip" tabIndex="0" data-tooltip={tooltip}>
        ?
      </span>
    )}
    {tooltip && <span className="dm-panel__help-inline">{tooltip}</span>}
  </span>
);

const renderSection = ({ id, title, open, onToggle, impact, help, children }) => (
  <div className={`dm-panel__accordion ${open ? 'open' : ''}`} key={id}>
    <button type="button" className="dm-panel__accordion-toggle" onClick={onToggle}>
      <span>{title}</span>
      {impact && <span className="dm-panel__impact">Affects: {impact}</span>}
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
    const payload = {
      id: caseForm.id.trim() || `case_${Date.now().toString(36)}`,
      title: caseForm.title,
      status: caseForm.status,
      summary: caseForm.summary,
      tags: existingTags,
      unlockConditions: formFieldsToAccess(caseForm),
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
    if (!window.confirm('Eliminar caso de forma permanente?')) return;
    try {
      await fetch(`${CASES_ENDPOINT}/${selectedCase.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      setCases((prev) => prev.filter((item) => item.id !== selectedCase.id));
      resetCaseForm(null);
      setSelectedCase(null);
      setCaseMessage('Caso eliminado.');
    } catch (error) {
      setCaseMessage('No se pudo eliminar el caso.');
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
    const payload = {
      id: villainForm.id.trim() || `villain_${Date.now().toString(36)}`,
      alias: villainForm.alias,
      realName: existing.realName || '',
      species: existing.species || '',
      age: existing.age || '',
      height: existing.height || '',
      weight: existing.weight || '',
      threatLevel: existing.threatLevel || '',
      status: existing.status || 'active',
      summary: villainForm.summary,
      lastSeen: existing.lastSeen || '',
      patterns: Array.isArray(existing.patterns) ? existing.patterns : [],
      knownAssociates: Array.isArray(existing.knownAssociates)
        ? existing.knownAssociates
        : [],
      notes: Array.isArray(existing.notes) ? existing.notes : [],
      unlockConditions: existingUnlock,
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

  const togglePreview = () => {
    setPreviewByView((prev) => ({ ...prev, [activeView]: !previewOpen }));
  };

  const toggleSelector = () => {
    setSelectorByView((prev) => ({ ...prev, [activeView]: !selectorOpen }));
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

  const renderNav = () => (
    <div className="dm-panel__nav">
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
    const access = resolvePreviewAccess(caseForm, 'cases');
    const commands = [];
    if (caseForm.brief?.trim()) commands.push('BRIEF');
    const parentId =
      caseForm.parentId || (selectedCase ? resolveParentId(selectedCase, 'cases') : '');
    const isDraft = caseDraftActive && !selectedCase;
    const parentPathIds = parentId ? buildCaseIdPath(parentId) : [];
    const parentPathLabels = parentPathIds.map(getCaseLabel);
    const location = parentPathLabels.length
      ? `CASOS > ${parentPathLabels.join(' > ')}`
      : 'CASOS';
    const depth = parentPathLabels.length;
    const depthLabel = depth === 0 ? 'CASO RAIZ' : 'SUBCASO';
    return [
      'VISTA AGENTE :: CASO',
      'ACCESO: ESTIMADO',
      `UBICACION: ${location}`,
      `PROFUNDIDAD: NIVEL ${depth} (${depthLabel})`,
      ...(isDraft ? ['ESTADO: BORRADOR (sin guardar)'] : []),
      `TITULO: ${caseForm.title || 'SIN TITULO'}`,
      `ID: ${caseForm.id || 'SIN ID'}`,
      `ESTADO: ${(caseForm.status || 'desconocido').toUpperCase()}`,
      `ACCESO: ${access.unlocked ? 'DESBLOQUEADO' : 'BLOQUEADO'}`,
      `VISIBILIDAD: ${(caseForm.accessVisibility || 'listed').toUpperCase()}`,
      `MODO DESBLOQUEO: ${(caseForm.accessUnlockMode || 'none').toUpperCase()}`,
      `RESUMEN: ${caseForm.summary || 'SIN RESUMEN'}`,
      `COMANDOS: ${commands.length ? commands.join(' | ') : 'NINGUNO'}`,
    ];
  };

  const buildPoiPreview = () => {
    return [
      'VISTA AGENTE :: POI',
      `NOMBRE: ${poiForm.name || 'SIN NOMBRE'}`,
      `ID: ${poiForm.id || 'SIN ID'}`,
      `DISTRITO: ${poiForm.district || 'SIN DISTRITO'}`,
      `ESTADO: ${(poiForm.status || 'desconocido').toUpperCase()}`,
      `RESUMEN: ${poiForm.summary || 'SIN RESUMEN'}`,
      `DETALLES: ${poiForm.details?.trim() ? 'SI' : 'NO'}`,
    ];
  };

  const buildVillainPreview = () => {
    return [
      'VISTA AGENTE :: VILLANO',
      `ALIAS: ${villainForm.alias || 'SIN ALIAS'}`,
      `ID: ${villainForm.id || 'SIN ID'}`,
      `RESUMEN: ${villainForm.summary || 'SIN RESUMEN'}`,
    ];
  };

  const renderCaseView = () => {
    const sections = openSections.cases || defaultSections('cases', editorMode);
    const updatedAt = selectedCase?.updatedAt;
    const previewLines = buildCasePreview();
    const isOperation = editorMode === 'operation';
    const parentId =
      caseForm.parentId || (selectedCase ? resolveParentId(selectedCase, 'cases') : '');
    const nodeTypeLabel = parentId ? 'Subcaso' : 'Caso raiz';
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
    const breadcrumb = `RUTA: CASOS > ${pathParts.join(' > ')}`;
    const selectedCasePath = selectedCase?.id ? buildCaseIdPath(selectedCase.id) : [];
    const ancestorIds = new Set(selectedCasePath.slice(0, -1));
    if (!selectedCase && isDraft && parentPathIds.length) {
      parentPathIds.forEach((id) => ancestorIds.add(id));
    }
    const selectedLabel = selectedCase ? getCaseLabel(selectedCase.id) : '';
    const newRootLabel = '+ Nuevo caso raiz';
    const newSubcaseLabel = selectedLabel
      ? `+ Nuevo subcaso de ${selectedLabel}`
      : '+ Nuevo subcaso';
    const subcaseHelper = selectedCase
      ? ''
      : 'Selecciona un caso para crear un subcaso.';
    const saveState = formatSaveState(
      JSON.stringify(caseForm) !== caseBaseline,
      updatedAt,
      caseSaveState
    );

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Casos Knightfall</h2>
        {casesError && <p className="dm-panel__error">{casesError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector">
            <div className="dm-panel__panel-title">Selecciona caso</div>
            <button
              type="button"
              className="dm-panel__selector-toggle"
              onClick={toggleSelector}
            >
              {selectorOpen ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
            {selectorOpen && (
              <div className="dm-panel__tree-wrapper">
                {renderTree(
                  caseTreeWithDraft,
                  selectedCase?.id || (caseDraftActive ? '__draft__' : ''),
                  (node) => {
                    if (node.id === '__draft__') return;
                    setCaseDraftActive(false);
                    setSelectedCase(node);
                    setSelection('cases', node.id);
                    resetCaseForm(node);
                    expandCaseParents(node);
                  },
                  'cases',
                  0,
                  { highlightIds: ancestorIds }
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedCase(null);
                setSelection('cases', '');
                resetCaseForm(null);
              }}
            >
              Limpiar seleccion
            </button>
            <div className="dm-panel__sidebar-block">
              <div className="dm-panel__panel-title">Crear caso</div>
              <button
                type="button"
                onClick={() => {
                  setSelection('cases', '');
                  startNewCase('');
                }}
              >
                {newRootLabel}
              </button>
              <button
                type="button"
                disabled={!selectedCase}
                className={!selectedCase ? 'dm-panel__ghost dm-panel__ghost--disabled' : ''}
                onClick={() => {
                  if (!selectedCase) return;
                  setSelection('cases', '');
                  startNewCase(selectedCase.id);
                }}
              >
                {newSubcaseLabel}
              </button>
              {!selectedCase && (
                <span className="dm-panel__helper">{subcaseHelper}</span>
              )}
            </div>
            <div className="dm-panel__sidebar-block">
              <div className="dm-panel__panel-title">Modo</div>
              <div className="dm-panel__mode-toggle">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={editorMode === option.value ? 'active' : ''}
                    onClick={() => setEditorMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`dm-panel__ghost ${helpMode ? 'active' : ''}`}
                onClick={() => setHelpMode((prev) => !prev)}
              >
                Ayuda {helpMode ? 'ACTIVADA' : 'DESACTIVADA'}
              </button>
            </div>
            <div className="dm-panel__quick-actions">
              <div className="dm-panel__panel-title">Acciones rapidas</div>
              <div className="dm-panel__pill-group">
                {['active', 'locked', 'resolved', 'archived'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`dm-panel__pill ${
                      caseForm.status === status ? 'active' : ''
                    }`}
                    onClick={() => setCaseForm({ ...caseForm, status })}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="dm-panel__quick-meta">
                <span>Ultima actualizacion: {formatUpdatedAt(updatedAt)}</span>
                <button
                  type="button"
                  className="dm-panel__ghost"
                  onClick={() => {
                    setActiveView('campaign');
                    setCampaignForm((prev) => ({
                      ...prev,
                      activeCaseId: caseForm.id || '',
                    }));
                  }}
                >
                  Abrir campaña
                </button>
              </div>
            </div>
          </div>
          <div className="dm-panel__details">
            <div className="dm-panel__breadcrumb">{breadcrumb}</div>
            <div className="dm-panel__editor-head">
              <div className="dm-panel__panel-title">Editar / Crear</div>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={togglePreview}
              >
                {previewOpen ? 'Ocultar previsualizacion' : 'Ver previsualizacion'}
              </button>
            </div>
            <div
              className={`dm-panel__editor-layout ${
                previewOpen ? 'dm-panel__editor-layout--preview' : ''
              }`}
            >
              <div className="dm-panel__editor-main">
                <form onSubmit={saveCase} className="dm-panel__form">
                  {renderSection({
                    id: 'case-identity',
                    title: 'Identidad',
                    open: sections.identity,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('cases', 'identity'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow(
                          'Tipo de nodo',
                          'Determina donde aparece en la navegacion del terminal.',
                            'TUI routing'
                          )}
                          <input type="text" value={nodeTypeLabel} readOnly />
                        </label>
                        <div className="dm-panel__form-grid dm-panel__form-grid--identification">
                          <label>
                            {labelRow(
                              'ID',
                              'Identificador unico usado por la TUI (se bloquea al guardar).',
                              'TUI routing'
                            )}
                            <input
                              type="text"
                              value={caseForm.id}
                              readOnly={Boolean(selectedCase?.id)}
                              onChange={(e) =>
                                setCaseForm({ ...caseForm, id: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Titulo', 'Nombre visible para agentes.', 'TUI output')}
                            <input
                              type="text"
                              value={caseForm.title}
                              onChange={(e) =>
                                setCaseForm({ ...caseForm, title: e.target.value })
                              }
                              required
                            />
                          </label>
                        </div>
                        <label>
                          {labelRow('Estado', 'Controla visibilidad narrativa.', 'TUI output')}
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
                      </div>
                    ),
                  })}

                  {renderSection({
                    id: 'case-summary',
                    title: 'Agent-facing Summary',
                    open: sections.summary,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('cases', 'summary'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow(
                            'Resumen',
                            'Texto breve mostrado a agentes.',
                            'TUI output'
                          )}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={caseForm.summary}
                            onChange={(e) =>
                              setCaseForm({ ...caseForm, summary: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {!isOperation && renderSection({
                    id: 'case-content',
                    title: 'Contenido',
                    open: sections.content,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('cases', 'content'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow(
                            'Brief',
                            'Bloques cortos visibles en el caso.',
                            'TUI output'
                          )}
                          <textarea
                            className="dm-panel__textarea--sm"
                            value={caseForm.brief}
                            onChange={(e) =>
                              setCaseForm({ ...caseForm, brief: e.target.value })
                            }
                          />
                        </label>
                      </div>
                    ),
                  })}

                  {!isOperation && renderSection({
                    id: 'case-engine',
                    title: 'Acceso',
                    open: sections.engine,
                    impact: 'Unlock logic',
                    onToggle: () => toggleSection('cases', 'engine'),
                    help: (
                      <>
                        <p>Controla visibilidad, desbloqueo y navegacion en la TUI.</p>
                        <pre className="dm-panel__code">{`{ "visibility": "listed", "unlockMode": "password" }`}</pre>
                      </>
                    ),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow(
                              'Visibilidad',
                              'Controla si se lista o se oculta.',
                              'Unlock logic'
                            )}
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
                            {labelRow(
                              'Modo de desbloqueo',
                              'Define como se desbloquea.',
                              'Unlock logic'
                            )}
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
                            {labelRow(
                              'Contraseña',
                              'Clave requerida para abrir el caso.',
                              'Unlock logic'
                            )}
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
                          {labelRow(
                            'Prerrequisitos (IDs)',
                            'IDs requeridos para desbloquear.',
                            'Unlock logic'
                          )}
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
                          {labelRow(
                            'Flags requeridos',
                            'Flags de campaña necesarios.',
                            'Unlock logic'
                          )}
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
                            {labelRow(
                              'Auto unlock',
                              'Cuando se activa automaticamente.',
                              'Unlock logic'
                            )}
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
                            {labelRow(
                              'Estado inicial',
                              'Estado inicial de acceso.',
                              'Unlock logic'
                            )}
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
                        <label>
                          {labelRow(
                            'Nodo padre (ID)',
                            'Define jerarquia en menus.',
                            'TUI output'
                          )}
                          <input
                            type="text"
                            list="case-parent-options"
                            value={caseForm.parentId}
                            onChange={(e) =>
                              setCaseForm({ ...caseForm, parentId: e.target.value })
                            }
                            placeholder="Ej. case_principal"
                          />
                        </label>
                        <datalist id="case-parent-options">
                          {caseParentOptions.map((option) => (
                            <option key={option.id} value={option.id}>
                              {option.label}
                            </option>
                          ))}
                        </datalist>
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow(
                              'Tipo de nodo',
                              'Controla si muestra submenu o info.',
                              'TUI output'
                            )}
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
                      </div>
                    ),
                  })}

                  {caseMessage && <p className="dm-panel__hint">{caseMessage}</p>}
                  <div className="dm-panel__actions dm-panel__actions--sticky">
                    <button type="submit">Guardar caso</button>
                    {selectedCase && (
                      <button type="button" className="dm-panel__delete" onClick={deleteCase}>
                        Eliminar
                      </button>
                    )}
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveState.label}
                    </span>
                  </div>
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Previsualizacion vista agente</div>
                  <pre>
                    {previewLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </pre>
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
    const previewLines = buildPoiPreview();
    const isOperation = editorMode === 'operation';
    const saveState = formatSaveState(
      JSON.stringify(poiForm) !== poiBaseline,
      updatedAt,
      poiSaveState
    );

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Puntos de interes</h2>
        {poisError && <p className="dm-panel__error">{poisError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector">
            <div className="dm-panel__panel-title">Selecciona POI</div>
            <button
              type="button"
              className="dm-panel__selector-toggle"
              onClick={toggleSelector}
            >
              {selectorOpen ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
            {selectorOpen && (
              <div className="dm-panel__tree-wrapper">
                {renderTree(
                  poiTree,
                  selectedPoi?.id,
                  (node) => {
                    setSelectedPoi(node);
                    setSelection('pois', node.id);
                    resetPoiForm(node);
                  },
                  'pois'
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedPoi(null);
                setSelection('pois', '');
                resetPoiForm(null);
              }}
            >
              Limpiar seleccion
            </button>
            <div className="dm-panel__sidebar-block">
              <div className="dm-panel__panel-title">Modo</div>
              <div className="dm-panel__mode-toggle">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={editorMode === option.value ? 'active' : ''}
                    onClick={() => setEditorMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`dm-panel__ghost ${helpMode ? 'active' : ''}`}
                onClick={() => setHelpMode((prev) => !prev)}
              >
                Ayuda {helpMode ? 'ACTIVADA' : 'DESACTIVADA'}
              </button>
            </div>
            <div className="dm-panel__quick-actions">
              <div className="dm-panel__panel-title">Acciones rapidas</div>
              <div className="dm-panel__pill-group">
                {['active', 'secured', 'critical', 'locked'].map((status) => (
                  <button
                    key={status}
                    type="button"
                    className={`dm-panel__pill ${
                      poiForm.status === status ? 'active' : ''
                    }`}
                    onClick={() => setPoiForm({ ...poiForm, status })}
                  >
                    {status}
                  </button>
                ))}
              </div>
              <div className="dm-panel__quick-meta">
                <span>Ultima actualizacion: {formatUpdatedAt(updatedAt)}</span>
                <button
                  type="button"
                  className="dm-panel__ghost"
                  onClick={() => {
                    setActiveView('campaign');
                    setCampaignForm((prev) => ({
                      ...prev,
                      activeCaseId: poiForm.id || '',
                    }));
                  }}
                >
                  Abrir campaña
                </button>
              </div>
            </div>
          </div>
          <div className="dm-panel__details">
            <div className="dm-panel__editor-head">
              <div className="dm-panel__panel-title">Editar / Crear</div>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={togglePreview}
              >
                {previewOpen ? 'Ocultar previsualizacion' : 'Ver previsualizacion'}
              </button>
            </div>
            <div
              className={`dm-panel__editor-layout ${
                previewOpen ? 'dm-panel__editor-layout--preview' : ''
              }`}
            >
              <div className="dm-panel__editor-main">
                <form onSubmit={savePoi} className="dm-panel__form">
                  {renderSection({
                    id: 'poi-identity',
                    title: 'Identidad',
                    open: sections.identity,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('pois', 'identity'),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('ID', 'Identificador unico para la TUI.', 'TUI')}
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
                            {labelRow('Nombre', 'Nombre visible para agentes.', 'TUI output')}
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
                            {labelRow('Distrito', 'Zona de Gotham.', 'TUI output')}
                            <input
                              type="text"
                              value={poiForm.district}
                              onChange={(e) =>
                                setPoiForm({ ...poiForm, district: e.target.value })
                              }
                            />
                          </label>
                          <label>
                            {labelRow('Estado', 'Estado operativo.', 'TUI output')}
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
                    impact: 'TUI output',
                    onToggle: () => toggleSection('pois', 'summary'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Resumen', 'Texto breve visible para agentes.', 'TUI output')}
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

                  {!isOperation && renderSection({
                    id: 'poi-content',
                    title: 'Detalles',
                    open: sections.content,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('pois', 'content'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Detalles', 'Intel visible en la TUI.', 'TUI output')}
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

                  {!isOperation && renderSection({
                    id: 'poi-structure',
                    title: 'Estructura',
                    open: sections.engine,
                    impact: 'TUI routing',
                    onToggle: () => toggleSection('pois', 'engine'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Nodo padre (ID)', 'Jerarquia en menus.', 'TUI output')}
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
                            {labelRow('Tipo de nodo', 'Controla submenu.', 'TUI output')}
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

                  {poiMessage && <p className="dm-panel__hint">{poiMessage}</p>}
                  <div className="dm-panel__actions dm-panel__actions--sticky">
                    <button type="submit">Guardar POI</button>
                    <button type="button" onClick={() => resetPoiForm(null)}>
                      Nuevo
                    </button>
                    {selectedPoi && (
                      <button type="button" className="dm-panel__delete" onClick={deletePoi}>
                        Eliminar
                      </button>
                    )}
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveState.label}
                    </span>
                  </div>
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Previsualizacion vista agente</div>
                  <pre>
                    {previewLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </pre>
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
    const previewLines = buildVillainPreview();
    const isOperation = editorMode === 'operation';
    const saveState = formatSaveState(
      JSON.stringify(villainForm) !== villainBaseline,
      updatedAt,
      villainSaveState
    );

    return (
      <section className={`dm-panel__section ${helpMode ? 'dm-panel__help-on' : ''}`}>
        <h2 className="dm-panel__section-title">Galeria de villanos</h2>
        {villainsError && <p className="dm-panel__error">{villainsError}</p>}
        <div className="dm-panel__grid dm-panel__grid--split">
          <div className="dm-panel__selector">
            <div className="dm-panel__panel-title">Selecciona villano</div>
            <button
              type="button"
              className="dm-panel__selector-toggle"
              onClick={toggleSelector}
            >
              {selectorOpen ? 'Ocultar lista' : 'Mostrar lista'}
            </button>
            {selectorOpen && (
              <div className="dm-panel__tree-wrapper">
                {renderTree(
                  villainTree,
                  selectedVillain?.id,
                  (node) => {
                    setSelectedVillain(node);
                    setSelection('villains', node.id);
                    resetVillainForm(node);
                  },
                  'villains'
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedVillain(null);
                setSelection('villains', '');
                resetVillainForm(null);
              }}
            >
              Limpiar seleccion
            </button>
            <div className="dm-panel__sidebar-block">
              <div className="dm-panel__panel-title">Modo</div>
              <div className="dm-panel__mode-toggle">
                {MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={editorMode === option.value ? 'active' : ''}
                    onClick={() => setEditorMode(option.value)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                className={`dm-panel__ghost ${helpMode ? 'active' : ''}`}
                onClick={() => setHelpMode((prev) => !prev)}
              >
                Ayuda {helpMode ? 'ACTIVADA' : 'DESACTIVADA'}
              </button>
            </div>
            <div className="dm-panel__quick-actions">
              <div className="dm-panel__panel-title">Acciones rapidas</div>
              <div className="dm-panel__quick-meta">
                <span>Ultima actualizacion: {formatUpdatedAt(updatedAt)}</span>
                <button
                  type="button"
                  className="dm-panel__ghost"
                  onClick={() => {
                    setActiveView('campaign');
                    setCampaignForm((prev) => ({
                      ...prev,
                      activeCaseId: villainForm.id || '',
                    }));
                  }}
                >
                  Abrir campaña
                </button>
              </div>
            </div>
          </div>
          <div className="dm-panel__details">
            <div className="dm-panel__editor-head">
              <div className="dm-panel__panel-title">Editar / Crear</div>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={togglePreview}
              >
                {previewOpen ? 'Ocultar previsualizacion' : 'Ver previsualizacion'}
              </button>
            </div>
            <div
              className={`dm-panel__editor-layout ${
                previewOpen ? 'dm-panel__editor-layout--preview' : ''
              }`}
            >
              <div className="dm-panel__editor-main">
                <form onSubmit={saveVillain} className="dm-panel__form">
                  {renderSection({
                    id: 'villain-identity',
                    title: 'Identidad',
                    open: sections.identity,
                    impact: 'TUI output',
                    onToggle: () => toggleSection('villains', 'identity'),
                    children: (
                      <div className="dm-panel__form-group">
                        <div className="dm-panel__form-grid dm-panel__form-grid--two">
                          <label>
                            {labelRow('ID', 'Identificador unico.', 'TUI')}
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
                            {labelRow('Alias', 'Nombre visible para agentes.', 'TUI output')}
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
                    impact: 'TUI output',
                    onToggle: () => toggleSection('villains', 'summary'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Resumen', 'Resumen visible.', 'TUI output')}
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

                  {!isOperation && renderSection({
                    id: 'villain-structure',
                    title: 'Estructura',
                    open: sections.engine,
                    impact: 'TUI routing',
                    onToggle: () => toggleSection('villains', 'engine'),
                    children: (
                      <div className="dm-panel__form-group">
                        <label>
                          {labelRow('Nodo padre (ID)', 'Jerarquia en menus.', 'TUI output')}
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
                          {labelRow('Tipo de nodo', 'Controla submenu.', 'TUI output')}
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

                  {villainMessage && <p className="dm-panel__hint">{villainMessage}</p>}
                  <div className="dm-panel__actions dm-panel__actions--sticky">
                    <button type="submit">Guardar villano</button>
                    <button type="button" onClick={() => resetVillainForm(null)}>
                      Nuevo
                    </button>
                    {selectedVillain && (
                      <button type="button" className="dm-panel__delete" onClick={deleteVillain}>
                        Eliminar
                      </button>
                    )}
                    <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
                      {saveState.label}
                    </span>
                  </div>
                </form>
              </div>
              {previewOpen && (
                <aside className="dm-panel__preview">
                  <div className="dm-panel__panel-title">Previsualizacion vista agente</div>
                  <pre>
                    {previewLines.map((line, idx) => (
                      <div key={idx}>{line}</div>
                    ))}
                  </pre>
                </aside>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="dm-panel">
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
            {activeView === 'campaign' && renderCampaignView()}
          </>
        )}
      </div>
    </div>
  );
};

export default DmPanel;
