import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  QUEST_MODULE_CASOS,
  QUEST_MODULE_HERRAMIENTAS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_PERFILES,
} from '../state/questModules';

const STATUS_TO_ALERT = {
  active: 'alta',
  critical: 'alta',
  locked: 'restringida',
  resolved: 'estable',
};

const getInitialCaseId = (cases) => {
  const activeCase = cases.find((entry) => entry.status === 'active');
  return activeCase?.id || cases[0]?.id || '';
};

const buildSyncState = (data) => {
  if (data.loading) return 'sincronizando';
  if (data.error) return 'datos locales';
  return 'en línea';
};

const useQuestSession = (data) => {
  const [currentModule, setCurrentModule] = useState(QUEST_MODULE_OPERACION);
  const [lastPrimaryModule, setLastPrimaryModule] = useState(QUEST_MODULE_OPERACION);
  const [activeCaseId, setActiveCaseId] = useState('');
  const [selection, setSelection] = useState({
    operacion: {
      highlightedLeadId: null,
    },
    casos: {
      selectedCaseId: null,
      expandedCaseIds: [],
      activeTab: 'resumen',
    },
    mapa: {
      selectedPoiId: null,
      activeFilter: 'caso-activo',
      viewportMode: 'contexto',
    },
    perfiles: {
      selectedProfileId: null,
      activeSection: 'datos-tacticos',
    },
    herramientas: {
      activeTool: null,
      resourceId: null,
    },
  });
  const [toolContext, setToolContext] = useState(null);

  useEffect(() => {
    if (data.loading || activeCaseId || !data.cases.length) return;

    const initialCaseId = getInitialCaseId(data.cases);
    setActiveCaseId(initialCaseId);
    setSelection((current) => ({
      ...current,
      casos: {
        ...current.casos,
        selectedCaseId: initialCaseId,
      },
    }));
  }, [activeCaseId, data.cases, data.loading]);

  const setActiveCase = useCallback((caseId) => {
    if (!caseId) return;

    setActiveCaseId(caseId);
    setSelection((current) => ({
      ...current,
      casos: {
        ...current.casos,
        selectedCaseId: caseId,
      },
    }));
  }, []);

  const goToOperacion = useCallback(() => {
    setCurrentModule(QUEST_MODULE_OPERACION);
  }, []);

  const goToCasos = useCallback((options = {}) => {
    const nextCaseId = options.caseId || activeCaseId || selection.casos.selectedCaseId;

    if (nextCaseId) {
      setSelection((current) => ({
        ...current,
        casos: {
          ...current.casos,
          selectedCaseId: nextCaseId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_CASOS);
    setCurrentModule(QUEST_MODULE_CASOS);
  }, [activeCaseId, selection.casos.selectedCaseId]);

  const goToMapa = useCallback((options = {}) => {
    if (options.poiId) {
      setSelection((current) => ({
        ...current,
        mapa: {
          ...current.mapa,
          selectedPoiId: options.poiId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, []);

  const goToPerfiles = useCallback((options = {}) => {
    if (options.profileId) {
      setSelection((current) => ({
        ...current,
        perfiles: {
          ...current.perfiles,
          selectedProfileId: options.profileId,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_PERFILES);
    setCurrentModule(QUEST_MODULE_PERFILES);
  }, []);

  const goToHerramientas = useCallback((options = {}) => {
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool: options.tool || current.herramientas.activeTool || 'evidencias',
        resourceId: options.resourceId || current.herramientas.resourceId || null,
      },
    }));
    setToolContext({
      originModule: options.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool: options.tool || 'evidencias',
      resourceId: options.resourceId || null,
    });
    setCurrentModule(QUEST_MODULE_HERRAMIENTAS);
  }, [lastPrimaryModule]);

  const selectCase = useCallback((caseId) => {
    if (!caseId) return;
    setActiveCase(caseId);
    setLastPrimaryModule(QUEST_MODULE_CASOS);
    setCurrentModule(QUEST_MODULE_CASOS);
  }, [setActiveCase]);

  const selectPoi = useCallback((poiId) => {
    if (!poiId) return;
    setSelection((current) => ({
      ...current,
      mapa: {
        ...current.mapa,
        selectedPoiId: poiId,
      },
    }));
    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, []);

  const selectProfile = useCallback((profileId) => {
    if (!profileId) return;
    setSelection((current) => ({
      ...current,
      perfiles: {
        ...current.perfiles,
        selectedProfileId: profileId,
      },
    }));
    setLastPrimaryModule(QUEST_MODULE_PERFILES);
    setCurrentModule(QUEST_MODULE_PERFILES);
  }, []);

  const openTool = useCallback((tool, options = {}) => {
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool: tool,
        resourceId: options.resourceId || null,
      },
    }));
    setToolContext({
      originModule: options.originModule || currentModule,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool,
      resourceId: options.resourceId || null,
    });
    setCurrentModule(QUEST_MODULE_HERRAMIENTAS);
  }, [currentModule]);

  const returnToOperationalContext = useCallback(() => {
    const fallbackModule = toolContext?.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION;
    setCurrentModule(fallbackModule);
  }, [lastPrimaryModule, toolContext]);

  const activeCase = useMemo(
    () => data.cases.find((entry) => entry.id === activeCaseId) || null,
    [activeCaseId, data.cases]
  );

  const selectedCase = useMemo(() => {
    const selectedCaseId = selection.casos.selectedCaseId || activeCaseId;
    return data.cases.find((entry) => entry.id === selectedCaseId) || activeCase || null;
  }, [activeCase, activeCaseId, data.cases, selection.casos.selectedCaseId]);

  const selectedPoi = useMemo(
    () => data.pois.find((entry) => entry.id === selection.mapa.selectedPoiId) || data.pois[0] || null,
    [data.pois, selection.mapa.selectedPoiId]
  );

  const selectedProfile = useMemo(
    () => data.villains.find((entry) => entry.id === selection.perfiles.selectedProfileId) || data.villains[0] || null,
    [data.villains, selection.perfiles.selectedProfileId]
  );

  const openLeads = useMemo(() => {
    const poiLead = data.pois[0]
      ? {
          id: `poi:${data.pois[0].id}`,
          tipo: 'mapa',
          titulo: data.pois[0].name,
          destino: QUEST_MODULE_MAPA,
          destinoId: data.pois[0].id,
        }
      : null;
    const profileLead = data.villains[0]
      ? {
          id: `perfil:${data.villains[0].id}`,
          tipo: 'perfil',
          titulo: data.villains[0].alias,
          destino: QUEST_MODULE_PERFILES,
          destinoId: data.villains[0].id,
        }
      : null;
    const toolLead = {
      id: 'tool:evidencias',
      tipo: 'herramienta',
      titulo: 'Bahía de evidencias',
      destino: QUEST_MODULE_HERRAMIENTAS,
      destinoId: 'evidencias',
    };

    return [poiLead, profileLead, toolLead].filter(Boolean);
  }, [data.pois, data.villains]);

  const alertLevel = STATUS_TO_ALERT[activeCase?.status] || 'media';
  const syncState = buildSyncState(data);

  return {
    currentModule,
    lastPrimaryModule,
    activeCaseId,
    activeCase,
    selectedCase,
    selectedPoi,
    selectedProfile,
    selection,
    toolContext,
    syncState,
    alertLevel,
    openLeads,
    actions: {
      goToOperacion,
      goToCasos,
      goToMapa,
      goToPerfiles,
      goToHerramientas,
      setActiveCase,
      selectCase,
      selectPoi,
      selectProfile,
      openTool,
      returnToOperationalContext,
    },
  };
};

export { useQuestSession };
