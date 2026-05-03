import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  QUEST_MODULE_CASOS,
  QUEST_MODULE_HERRAMIENTAS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_PERFILES,
} from '../state/questModules';
import { buildQuestContext, rankRelated } from '../domain/buildQuestContext';
import { PHONE_MODE_CALL, PHONE_MODE_TRACER, useQuestPhone } from './useQuestPhone';

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

const summarizeText = (value, fallback = '') => {
  const source = Array.isArray(value) ? value.join(' ') : value;
  const text = String(source || fallback).trim();
  return text;
};

const normalizeQuestToolId = (tool) => {
  if (tool === 'dial' || tool === 'telefonia' || tool === 'phone') return 'comunicaciones';
  if (tool === 'traza' || tool === 'tracer') return 'rastreo';
  return tool || null;
};

const useQuestSession = (data, toolData = null) => {
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
      selectedResourceId: null,
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
    const currentSelectedCaseId = selection.casos.selectedCaseId || activeCaseId;
    const currentSelectedCase =
      data.cases.find((entry) => entry.id === currentSelectedCaseId) ||
      data.cases.find((entry) => entry.id === activeCaseId) ||
      null;
    const relatedPoi = rankRelated(currentSelectedCase, data.pois)[0];
    const nextPoiId =
      options.poiId ||
      selection.mapa.selectedPoiId ||
      relatedPoi?.id ||
      data.pois[0]?.id ||
      null;

    if (nextPoiId) {
      setSelection((current) => ({
        ...current,
        mapa: {
          ...current.mapa,
          selectedPoiId: nextPoiId,
          selectedResourceId: options.resourceId || current.mapa.selectedResourceId || null,
        },
      }));
    }

    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, [
    activeCaseId,
    data.cases,
    data.pois,
    selection.casos.selectedCaseId,
    selection.mapa.selectedPoiId,
  ]);

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
    const hasExplicitTool = Object.prototype.hasOwnProperty.call(options, 'tool');
    const activeTool = hasExplicitTool ? normalizeQuestToolId(options.tool) : null;
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool,
        resourceId: hasExplicitTool ? options.resourceId || null : null,
      },
    }));
    setToolContext({
      originModule: options.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool: activeTool,
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
          selectedResourceId: null,
        },
      }));
    setLastPrimaryModule(QUEST_MODULE_MAPA);
    setCurrentModule(QUEST_MODULE_MAPA);
  }, []);

  const selectMapResource = useCallback((resourceId) => {
    setSelection((current) => ({
      ...current,
      mapa: {
        ...current.mapa,
        selectedResourceId: resourceId || null,
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
    const activeTool = normalizeQuestToolId(tool);
    setSelection((current) => ({
      ...current,
      herramientas: {
        activeTool,
        resourceId: options.resourceId || null,
      },
    }));
    setToolContext({
      originModule: options.originModule || currentModule,
      originEntityType: options.originEntityType || null,
      originEntityId: options.originEntityId || null,
      tool: activeTool,
      resourceId: options.resourceId || null,
    });
    setCurrentModule(QUEST_MODULE_HERRAMIENTAS);
  }, [currentModule]);

  const returnToOperationalContext = useCallback(() => {
    const fallbackModule = toolContext?.originModule || lastPrimaryModule || QUEST_MODULE_OPERACION;
    setCurrentModule(fallbackModule);
  }, [lastPrimaryModule, toolContext]);

  const { phoneState, phoneActions } = useQuestPhone({
    currentModule,
    goToHerramientas,
  });

  const goBack = useCallback(() => {
    if (phoneState.focusMode) {
      phoneActions.dismissPhoneFocus();
      return;
    }

    if (currentModule === QUEST_MODULE_HERRAMIENTAS) {
      returnToOperationalContext();
      return;
    }

    if (currentModule !== QUEST_MODULE_OPERACION) {
      setCurrentModule(QUEST_MODULE_OPERACION);
    }
  }, [currentModule, phoneActions, phoneState.focusMode, returnToOperationalContext]);

  const activeCase = useMemo(
    () => data.cases.find((entry) => entry.id === activeCaseId) || null,
    [activeCaseId, data.cases]
  );

  const selectedCase = useMemo(() => {
    const selectedCaseId = selection.casos.selectedCaseId || activeCaseId;
    return data.cases.find((entry) => entry.id === selectedCaseId) || activeCase || null;
  }, [activeCase, activeCaseId, data.cases, selection.casos.selectedCaseId]);

  const relatedPoisForCase = useMemo(
    () => rankRelated(selectedCase || activeCase, data.pois),
    [activeCase, data.pois, selectedCase]
  );

  const relatedProfilesForCase = useMemo(
    () => rankRelated(selectedCase || activeCase, data.villains),
    [activeCase, data.villains, selectedCase]
  );

  const selectedPoi = useMemo(
    () =>
      data.pois.find((entry) => entry.id === selection.mapa.selectedPoiId) ||
      relatedPoisForCase[0] ||
      data.pois[0] ||
      null,
    [data.pois, relatedPoisForCase, selection.mapa.selectedPoiId]
  );

  const selectedProfile = useMemo(
    () =>
      data.villains.find((entry) => entry.id === selection.perfiles.selectedProfileId) ||
      relatedProfilesForCase[0] ||
      data.villains[0] ||
      null,
    [data.villains, relatedProfilesForCase, selection.perfiles.selectedProfileId]
  );

  const questContext = useMemo(
    () =>
      buildQuestContext({
        activeCase,
        selectedCase,
        selectedPoi,
        selectedProfile,
        cases: data.cases,
        pois: data.pois,
        villains: data.villains,
      }),
    [activeCase, data.cases, data.pois, data.villains, selectedCase, selectedPoi, selectedProfile]
  );

  const openLeads = useMemo(() => {
    const poiLead = questContext.recommendedPoi
      ? {
          id: `poi:${questContext.recommendedPoi.id}`,
          tipo: 'mapa',
          titulo: questContext.recommendedPoi.name,
          resumenBreve: summarizeText(
            questContext.recommendedPoi.summary,
            'Sin resumen de ubicación.'
          ),
          destino: QUEST_MODULE_MAPA,
          destinoId: questContext.recommendedPoi.id,
        }
      : null;
    const profileLead = questContext.recommendedProfile
      ? {
          id: `perfil:${questContext.recommendedProfile.id}`,
          tipo: 'perfil',
          titulo: questContext.recommendedProfile.alias,
          resumenBreve: summarizeText(
            questContext.recommendedProfile.summary,
            'Sin resumen de perfil.'
          ),
          destino: QUEST_MODULE_PERFILES,
          destinoId: questContext.recommendedProfile.id,
        }
      : null;
    const toolLead = {
      id: 'tool:evidencias',
      tipo: 'herramienta',
      titulo: 'Bahía de evidencias',
      resumenBreve: 'Inspección instrumental preparada para el caso en foco.',
      destino: QUEST_MODULE_HERRAMIENTAS,
      destinoId: 'evidencias',
    };

    return [poiLead, profileLead, toolLead].filter(Boolean);
  }, [questContext.recommendedPoi, questContext.recommendedProfile]);

  const recentChanges = useMemo(() => {
    const changes = [];

    if (activeCase) {
      changes.push({
        id: `case:${activeCase.id}`,
        label: 'Caso activo',
        detail: `${activeCase.title} · ${activeCase.status || 'sin estado'}`,
      });
    }

    if (selectedPoi) {
      changes.push({
        id: `poi:${selectedPoi.id}`,
        label: 'Ubicación monitorizada',
        detail: `${selectedPoi.name} · ${selectedPoi.district || 'sin distrito'}`,
      });
    }

    if (selectedProfile) {
      changes.push({
        id: `profile:${selectedProfile.id}`,
        label: 'Perfil destacado',
        detail: `${selectedProfile.alias} · ${selectedProfile.threatLevel || selectedProfile.status || 'sin nivel'}`,
      });
    }

    if (selection.herramientas.activeTool) {
      changes.push({
        id: `tool:${selection.herramientas.activeTool}`,
        label: 'Herramienta preparada',
        detail: selection.herramientas.activeTool,
      });
    }

    if (
      phoneState.dialedDigits ||
      phoneState.lastDialedNumber ||
      phoneState.activeMode ||
      phoneState.activeAudioLabel
    ) {
      changes.push({
        id: 'phone:line',
        label: 'Línea telefónica',
        detail: [
          phoneState.mode === PHONE_MODE_TRACER ? 'traza' : 'llamada',
          phoneState.lineStatus,
          phoneState.lastDialedNumber || phoneState.dialedDigits || 'sin marcación',
        ].join(' · '),
      });
    }

    return changes.slice(0, 4);
  }, [
    activeCase,
    phoneState.activeAudioLabel,
    phoneState.activeMode,
    phoneState.dialedDigits,
    phoneState.lastDialedNumber,
    phoneState.lineStatus,
    phoneState.mode,
    selectedPoi,
    selectedProfile,
    selection.herramientas.activeTool,
  ]);

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
    questContext,
    toolData,
    selection,
    toolContext,
    phoneState,
    syncState,
    alertLevel,
    openLeads,
    recentChanges,
    actions: {
      goToOperacion,
      goToCasos,
      goToMapa,
      goToPerfiles,
      goToHerramientas,
      setActiveCase,
      selectCase,
      selectPoi,
      selectMapResource,
      selectProfile,
      openTool,
      returnToOperationalContext,
      goBack,
      setPhoneMode: phoneActions.setPhoneMode,
      clearPhoneDial: phoneActions.clearPhoneDial,
      enterPhoneFocus: phoneActions.enterPhoneFocus,
      exitPhoneFocus: phoneActions.exitPhoneFocus,
      dialPhoneNumber: phoneActions.dialPhoneNumber,
      pressPhoneKey: phoneActions.pressPhoneKey,
      togglePhoneHandset: phoneActions.togglePhoneHandset,
    },
  };
};

export { PHONE_MODE_CALL, PHONE_MODE_TRACER, useQuestSession };
