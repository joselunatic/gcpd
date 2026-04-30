import {
  QUEST_MODULE_CASOS,
  QUEST_MODULE_HERRAMIENTAS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_PERFILES,
} from '../state/questModules';

const summarize = (value, fallback = 'Sin datos disponibles.') => {
  const source = Array.isArray(value) ? value.join(' ') : value;
  const text = String(source || fallback).trim();
  if (!text) return fallback;
  return text.length > 180 ? `${text.slice(0, 177)}...` : text;
};

const summarizeList = (value, fallback = 'Sin datos disponibles.') => {
  if (!Array.isArray(value) || !value.length) return fallback;
  return summarize(value.join(' '), fallback);
};

const formatStatusLabel = (status) => {
  if (status === 'active') return 'Activo';
  if (status === 'locked') return 'Restringido';
  if (status === 'resolved') return 'Resuelto';
  if (status === 'critical') return 'Crítico';
  return status || 'Sin estado';
};

const formatLeadType = (leadType) => {
  if (leadType === 'mapa') return 'Ubicación';
  if (leadType === 'perfil') return 'Perfil';
  if (leadType === 'herramienta') return 'Herramienta';
  return 'Lead';
};

const formatEntityList = (values, getLabel, fallback = 'sin vínculos directos') => {
  if (!Array.isArray(values) || !values.length) return fallback;
  return values.slice(0, 3).map(getLabel).filter(Boolean).join(', ') || fallback;
};

const buildOperationItems = ({ session }) => {
  const context = session.questContext || {};
  const focusItem = {
    id: 'operacion:casos',
    label: 'CASOS',
    description: session.activeCase
      ? `${session.activeCase.title} · ${session.activeCase.status || 'sin estado'}`
      : 'Abrir expedientes y seleccionar caso activo',
    accent: true,
  };

  const mapItem = {
    id: 'operacion:mapa',
    label: 'MAPA',
    description: context.recommendedPoi
      ? `${context.recommendedPoi.label || context.recommendedPoi.name || context.recommendedPoi.id} · vínculo del caso`
      : 'Abrir Gotham, POIs, líneas y zonas de rastreo',
    accent: false,
  };

  const profilesItem = {
    id: 'operacion:perfiles',
    label: 'PERFILES',
    description: context.recommendedProfile
      ? `${context.recommendedProfile.alias || context.recommendedProfile.id} · ficha vinculada`
      : 'Consultar sujetos, contactos y vínculos del caso',
    accent: false,
  };

  const utilityItem = {
    id: 'operacion:herramientas',
    label: 'HERRAMIENTAS',
    description: session.recentChanges[0]?.detail || 'Evidencias, archivos y utilidades operativas',
    accent: false,
  };

  return [focusItem, mapItem, profilesItem, utilityItem];
};

const buildOperacionModel = ({ session }) => ({
  layout: 'operations',
  title: 'OPERACIÓN ACTUAL',
  subtitle: session.activeCase
    ? `${session.activeCase.title} · alerta ${session.alertLevel} · sincronía ${session.syncState}`
    : `Sin caso activo · sincronía ${session.syncState}`,
  focusTitle: session.activeCase ? 'CASO ACTIVO' : 'SIN FOCO',
  focusBody: session.activeCase
    ? summarize(session.activeCase.summary, 'Sin resumen de caso.')
    : 'Selecciona un expediente para comenzar la sesión operativa.',
  detailTitle: session.openLeads[0]
    ? `${formatLeadType(session.openLeads[0].tipo).toUpperCase()} SUGERIDA`
    : 'LEAD SUGERIDA',
  detailBody: session.openLeads[0]
    ? `${session.openLeads[0].titulo} · ${summarize(session.openLeads[0].resumenBreve, 'Sin detalle.')}`
    : 'No hay leads abiertas todavía.',
  hint: session.activeCase
    ? summarize(
        `${session.activeCase.summary || 'Sin resumen.'} Lead recomendado: ${session.openLeads[0]?.titulo || 'abrir expedientes.'}`,
        'Selecciona un expediente para comenzar.'
      )
    : 'Selecciona un expediente para comenzar.',
  items: buildOperationItems({ session }),
  onSelect: (id) => {
    if (id === 'operacion:casos') {
      session.actions.goToCasos();
      return;
    }

    if (id === 'operacion:mapa') {
      session.actions.goToMapa({ poiId: session.selectedPoi?.id });
      return;
    }

    if (id === 'operacion:perfiles') {
      session.actions.goToPerfiles({ profileId: session.selectedProfile?.id });
      return;
    }

    if (id === 'operacion:herramientas') {
      session.actions.goToHerramientas({
        tool: 'evidencias',
        originModule: QUEST_MODULE_OPERACION,
      });
      return;
    }

    if (id.startsWith('lead:')) {
      const leadId = id.slice(5);
      const lead = session.openLeads.find((entry) => entry.id === leadId);
      if (!lead) return;

      if (lead.destino === QUEST_MODULE_MAPA) {
        session.actions.goToMapa({ poiId: lead.destinoId });
        return;
      }

      if (lead.destino === QUEST_MODULE_PERFILES) {
        session.actions.goToPerfiles({ profileId: lead.destinoId });
        return;
      }

      if (lead.destino === QUEST_MODULE_HERRAMIENTAS) {
        session.actions.goToHerramientas({
          tool: lead.destinoId || 'evidencias',
          originModule: QUEST_MODULE_OPERACION,
        });
      }
    }
  },
  onBack: null,
  onHome: null,
  actions: [],
  onAction: null,
});

const buildCasosModel = ({ data, session }) => {
  const selectedCase = session.selectedCase;
  const context = session.questContext || {};
  const relatedPois = context.relatedPoisForCase || [];
  const relatedProfiles = context.relatedProfilesForCase || [];
  const caseBrief = selectedCase?.commands?.brief || [];
  const caseIntel = selectedCase?.commands?.intel || [];
  const objectiveLine =
    caseBrief.find((entry) => String(entry).toUpperCase().includes('OBJETIVO')) ||
    caseBrief[0] ||
    selectedCase?.summary;
  const incidentLine =
    caseBrief.find((entry) => String(entry).toUpperCase().includes('INCIDENTE')) ||
    caseBrief[1] ||
    selectedCase?.summary;
  const intelLead = caseIntel[0] || selectedCase?.summary;
  const unlockLine = selectedCase?.unlockConditions?.length
    ? `Acceso ${selectedCase.unlockConditions.join(', ')}`
    : null;
  const dossierSummary = [
    objectiveLine,
    intelLead,
    selectedCase?.dm?.notes,
  ]
    .filter(Boolean)
    .join(' ');

  const caseItems = data.cases.slice(0, 6).map((entry) => ({
    id: entry.id,
    label: entry.title || entry.id,
    description: `${formatStatusLabel(entry.status)} · ${(entry.tags || []).slice(0, 2).join(', ') || 'sin tags'} · ${summarize(
      entry.commands?.brief?.[0] || entry.summary,
      'Sin resumen.'
    )}`,
    accent: entry.id === selectedCase?.id,
  }));

  return {
    layout: 'dossier',
    title: 'CASOS',
    subtitle: selectedCase
      ? `${selectedCase.title} · ${formatStatusLabel(selectedCase.status)} · ${selectedCase.tags?.join(', ') || 'sin tags'}`
      : `${data.cases.length} expedientes disponibles`,
    focusTitle: selectedCase?.title || 'SIN EXPEDIENTE',
    focusBody: selectedCase
      ? summarize(
          [selectedCase.summary, objectiveLine, incidentLine].filter(Boolean).join(' '),
          'Expediente sin resumen.'
        )
      : 'Selecciona un expediente para fijarlo como foco operativo.',
    detailTitle: selectedCase?.commands?.brief?.[0]?.replace('CASE ID: ', '') || 'DOSSIER ACTIVO',
    detailBody: selectedCase
      ? summarize(
          [
            `Estado ${formatStatusLabel(selectedCase.status)}.`,
            incidentLine,
            summarizeList(caseIntel, ''),
            unlockLine,
          ]
            .filter(Boolean)
            .join(' '),
          'Sin inteligencia adicional para este expediente.'
        )
      : 'Sin expediente seleccionado.',
    hint: selectedCase
      ? summarize(
          dossierSummary || selectedCase.summary,
          'Expediente sin resumen.'
        )
      : 'Selecciona un expediente para fijarlo como foco operativo.',
    items: caseItems,
    actions: [
      {
        id: 'case:mapa',
        label: 'VER MAPA',
        description: formatEntityList(relatedPois, (entry) => entry.name, 'Abrir despliegue espacial del caso'),
      },
      {
        id: 'case:perfiles',
        label: 'VER PERFILES',
        description: formatEntityList(relatedProfiles, (entry) => entry.alias, 'Consultar amenaza vinculada'),
      },
      {
        id: 'case:herramientas',
        label: 'EVIDENCIAS',
        description: objectiveLine ? summarize(objectiveLine, 'Entrar en bahía de evidencias') : 'Entrar en bahía de evidencias',
      },
    ],
    onSelect: (id) => session.actions.selectCase(id),
    onAction: (id) => {
      if (id === 'case:mapa') {
        session.actions.goToMapa({ poiId: relatedPois[0]?.id || session.selectedPoi?.id });
      }
      if (id === 'case:perfiles') {
        session.actions.goToPerfiles({
          profileId: relatedProfiles[0]?.id || session.selectedProfile?.id,
        });
      }
      if (id === 'case:herramientas') {
        session.actions.goToHerramientas({
          tool: 'evidencias',
          originModule: QUEST_MODULE_CASOS,
        });
      }
    },
    onBack: session.actions.goToOperacion,
    onHome: session.actions.goToOperacion,
  };
};

const buildMapaModel = ({ data, session }) => {
  const selectedPoi = session.selectedPoi;
  const context = session.questContext || {};
  const relatedCases = context.relatedCasesForPoi || [];
  const relatedProfiles = context.relatedProfilesForPoi || [];

  return {
    layout: 'dossier',
    title: 'MAPA',
    subtitle: selectedPoi
      ? `${selectedPoi.name} · ${selectedPoi.district || 'sin distrito'}`
      : `${data.pois.length} ubicaciones indexadas`,
    focusTitle: selectedPoi?.name || 'SIN UBICACIÓN',
    focusBody: selectedPoi
      ? summarize(selectedPoi.summary, 'Ubicación sin resumen.')
      : 'Selecciona un punto de interés para leer su contexto.',
    detailTitle: 'CONTEXTO ESPACIAL',
    detailBody: selectedPoi
      ? summarize(
          [
            selectedPoi.district || 'Sin distrito',
            selectedPoi.details || selectedPoi.contacts || selectedPoi.summary,
            `Expedientes: ${formatEntityList(relatedCases, (entry) => entry.title)}`,
            `Perfiles: ${formatEntityList(relatedProfiles, (entry) => entry.alias)}`,
          ].join(' · '),
          'Sin detalle espacial.'
        )
      : 'Sin punto de interés seleccionado.',
    hint: selectedPoi
      ? summarize(selectedPoi.details || selectedPoi.summary, 'Ubicación sin detalle.')
      : 'Selecciona un punto de interés para leer su contexto.',
    items: data.pois.slice(0, 6).map((entry) => ({
      id: entry.id,
      label: entry.name || entry.id,
      description: `${entry.district || 'sin distrito'} · ${summarize(entry.summary, 'Sin resumen.')}`,
      accent: entry.id === selectedPoi?.id,
    })),
    actions: [
      {
        id: 'map:casos',
        label: 'VER CASO',
        description: relatedCases[0]?.title || session.selectedCase?.title || 'Volver al expediente en foco',
      },
      {
        id: 'map:perfiles',
        label: 'VER PERFIL',
        description: relatedProfiles[0]?.alias || session.selectedProfile?.alias || 'Consultar entidad vinculada',
      },
      {
        id: 'map:rastreo',
        label: 'RASTREO',
        description: 'Abrir rastreo contextual',
      },
    ],
    onSelect: (id) => session.actions.selectPoi(id),
    onAction: (id) => {
      if (id === 'map:casos') {
        session.actions.goToCasos({ caseId: relatedCases[0]?.id || session.selectedCase?.id });
      }
      if (id === 'map:perfiles') {
        session.actions.goToPerfiles({
          profileId: relatedProfiles[0]?.id || session.selectedProfile?.id,
        });
      }
      if (id === 'map:rastreo') {
        session.actions.goToHerramientas({
          tool: 'rastreo',
          originModule: QUEST_MODULE_MAPA,
          originEntityType: 'poi',
          originEntityId: selectedPoi?.id || null,
        });
      }
    },
    onBack: session.actions.goToOperacion,
    onHome: session.actions.goToOperacion,
  };
};

const buildPerfilesModel = ({ data, session }) => {
  const selectedProfile = session.selectedProfile;
  const context = session.questContext || {};
  const relatedPois = context.relatedPoisForProfile || [];
  const relatedCases = context.relatedCasesForProfile || [];

  return {
    layout: 'dossier',
    title: 'PERFILES',
    subtitle: selectedProfile
      ? `${selectedProfile.alias} · ${selectedProfile.threatLevel || selectedProfile.status || 'sin nivel'}`
      : `${data.villains.length} perfiles cargados`,
    focusTitle: selectedProfile?.alias || 'SIN PERFIL',
    focusBody: selectedProfile
      ? summarize(selectedProfile.summary, 'Perfil sin detalle.')
      : 'Selecciona un perfil para consultar su amenaza.',
    detailTitle: 'PATRONES',
    detailBody: selectedProfile
      ? summarize(
          [
            selectedProfile.patterns ||
              selectedProfile.knownAssociates ||
              selectedProfile.notes,
            `Ubicaciones: ${formatEntityList(relatedPois, (entry) => entry.name)}`,
            `Expedientes: ${formatEntityList(relatedCases, (entry) => entry.title)}`,
          ].join(' '),
          'Sin patrones registrados.'
        )
      : 'Sin perfil seleccionado.',
    hint: selectedProfile
      ? summarize(
          selectedProfile.summary ||
            selectedProfile.patterns ||
            selectedProfile.notes,
          'Perfil sin detalle.'
        )
      : 'Selecciona un perfil para consultar su amenaza.',
    items: data.villains.slice(0, 6).map((entry) => ({
      id: entry.id,
      label: entry.alias || entry.id,
      description: `${entry.threatLevel || entry.status || 'sin nivel'} · ${summarize(entry.summary, 'Sin resumen.')}`,
      accent: entry.id === selectedProfile?.id,
    })),
    actions: [
      {
        id: 'profile:mapa',
        label: 'VER MAPA',
        description: relatedPois[0]?.name || session.selectedPoi?.name || 'Abrir última ubicación monitorizada',
      },
      {
        id: 'profile:casos',
        label: 'VER EXPEDIENTE',
        description: relatedCases[0]?.title || session.selectedCase?.title || 'Volver al caso en foco',
      },
      {
        id: 'profile:comms',
        label: 'COMUNICACIONES',
        description: 'Abrir línea contextual',
      },
    ],
    onSelect: (id) => session.actions.selectProfile(id),
    onAction: (id) => {
      if (id === 'profile:mapa') {
        session.actions.goToMapa({ poiId: relatedPois[0]?.id || session.selectedPoi?.id });
      }
      if (id === 'profile:casos') {
        session.actions.goToCasos({ caseId: relatedCases[0]?.id || session.selectedCase?.id });
      }
      if (id === 'profile:comms') {
        session.actions.goToHerramientas({
          tool: 'comunicaciones',
          originModule: QUEST_MODULE_PERFILES,
          originEntityType: 'profile',
          originEntityId: selectedProfile?.id || null,
        });
      }
    },
    onBack: session.actions.goToOperacion,
    onHome: session.actions.goToOperacion,
  };
};

const TOOLS = [
  {
    id: 'evidencias',
    label: 'EVIDENCIAS',
    description: 'Inspección de piezas y activos asociados al caso.',
  },
  {
    id: 'audio',
    label: 'AUDIO',
    description: 'Escucha forense y revisión de pistas sonoras.',
  },
  {
    id: 'balistica',
    label: 'BALÍSTICA',
    description: 'Comparación de muestras y coincidencias instrumentales.',
  },
  {
    id: 'comunicaciones',
    label: 'COMUNICACIONES',
    description: 'Gestión de líneas, escuchas y registros de llamada.',
  },
  {
    id: 'rastreo',
    label: 'RASTREO',
    description: 'Seguimiento de objetivos y triangulación progresiva.',
  },
];

const countLabel = (count, singular, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

const firstAvailable = (...values) => values.find((value) => String(value || '').trim()) || '';

const formatPhoneLineState = (line) => {
  if (!line) return 'sin líneas configuradas';
  const recallState = line.rellamable === false && line.llamado ? 'ya llamada' : 'disponible';
  return `${line.label || line.number || 'línea'} · ${line.number || 'sin número'} · ${recallState}`;
};

const getEvidenceItems = (toolData = {}) => [
  ...(toolData.builtInEvidence || []),
  ...(toolData.evidence || []),
].filter((entry) => entry?.stlPath);

const getNextEvidenceId = (session) => {
  const items = getEvidenceItems(session.toolData);
  if (!items.length) return null;

  const currentId = session.selection.herramientas.resourceId;
  const currentIndex = items.findIndex((entry) => entry.id === currentId);
  const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % items.length : 1 % items.length;
  return items[nextIndex]?.id || items[0]?.id || null;
};

const buildToolInventory = ({ session, activeTool }) => {
  const toolData = session.toolData || {};
  const evidence = toolData.evidence || [];
  const builtInEvidence = toolData.builtInEvidence || [];
  const allEvidence = getEvidenceItems(toolData);
  const ballistics = toolData.ballistics || [];
  const ballisticsAssets = toolData.ballisticsAssets || [];
  const audio = toolData.audio || [];
  const phoneLines = toolData.phoneLines || [];
  const tracerLines = toolData.tracerConfig?.lines || [];
  const tracerHotspots = toolData.tracerConfig?.hotspots || [];
  const selectedResourceId = session.selection.herramientas.resourceId;
  const selectedEvidence =
    allEvidence.find((entry) => entry.id === selectedResourceId) ||
    allEvidence.find((entry) => entry.id === session.selectedCase?.id) ||
    allEvidence[0];
  const selectedBallistic =
    ballistics.find((entry) => entry.id === selectedResourceId) ||
    ballistics[0];
  const selectedAudio =
    audio.find((entry) => entry.id === selectedResourceId) ||
    audio[0];
  const selectedLine =
    phoneLines.find((entry) => entry.normalizedNumber === session.phoneState?.lastDialedNumber) ||
    phoneLines.find((entry) => entry.normalizedNumber === session.phoneState?.dialedDigits) ||
    phoneLines[0];
  const activeTraceNumber =
    session.phoneState?.lastDialedNumber || session.phoneState?.dialedDigits || '';

  const summaries = {
    evidencias: {
      focus: 'Inspección STL compatible con SHOW W, SHOW JOKER, SHOW BALA y evidencias subidas por DM.',
      detail: [
        countLabel(allEvidence.length, 'pieza'),
        `${builtInEvidence.length} built-in`,
        evidence.length ? `${evidence.length} desde /api/evidence` : 'sin STL de DM cargados',
        selectedEvidence
          ? `selección ${selectedEvidence.label || selectedEvidence.id}`
          : 'sin pieza seleccionada',
      ].join(' · '),
      hint: selectedEvidence?.stlPath
        ? `STL ${selectedEvidence.stlPath} · origen ${selectedEvidence.source || 'api'}`
        : 'Los STL built-in siguen disponibles aunque el catálogo de DM esté vacío.',
    },
    audio: {
      focus: 'Escucha forense del comando AUDIO con soporte para pistas bloqueadas por contraseña.',
      detail: [
        countLabel(audio.length, 'pista'),
        `${audio.filter((entry) => entry.locked).length} bloqueadas`,
        selectedAudio
          ? `siguiente ${selectedAudio.title || selectedAudio.id}`
          : 'sin pistas cargadas',
      ].join(' · '),
      hint: selectedAudio?.src
        ? `Fuente ${selectedAudio.src}${selectedAudio.locked ? ' · requiere unlock' : ''}`
        : 'El transporte XR aún no reproduce audio; este bloque precarga el inventario real.',
    },
    balistica: {
      focus: 'Comparador de muestras del comando BALLISTICA: código izquierdo/derecho y lectura MATCH.',
      detail: [
        ballistics.length
          ? countLabel(ballistics.length, 'muestra')
          : `${countLabel(ballisticsAssets.length, 'asset')} disponible${ballisticsAssets.length === 1 ? '' : 's'}`,
        selectedBallistic
          ? `muestra ${selectedBallistic.label || selectedBallistic.id}`
          : 'sin modelos balísticos de DM',
        selectedBallistic?.caseCode ? `código ${selectedBallistic.caseCode}` : 'sin código activo',
      ].join(' · '),
      hint: ballistics.length
        ? firstAvailable(selectedBallistic?.pngPath, selectedBallistic?.assetId, 'dataset listo para comparar')
        : 'Hay assets PNG en /assets/ballistics; falta dataset de comparación en /api/ballistics.',
    },
    comunicaciones: {
      focus: 'Consola DIAL: líneas registradas, audio asociado y estado de rellamada.',
      detail: [
        countLabel(phoneLines.length, 'línea'),
        formatPhoneLineState(selectedLine),
        `auricular ${session.phoneState?.isOffHook ? 'levantado' : 'colgado'}`,
        `estado ${session.phoneState?.lineStatus || 'reposo'}`,
      ].join(' · '),
      hint: `buffer ${session.phoneState?.dialedDigits || session.phoneState?.lastDialedNumber || 'vacío'} · audio ${selectedLine?.audioId || 'sin audio asociado'}`,
    },
    rastreo: {
      focus: 'TRACER usa el bridge WebSocket de agente y progresa fases sobre hotspot de mapa.',
      detail: [
        `ws ${session.phoneState?.tracerWsState || 'offline'}`,
        countLabel(tracerLines.length, 'línea trazable'),
        countLabel(tracerHotspots.length, 'hotspot'),
        activeTraceNumber ? `objetivo ${activeTraceNumber}` : 'sin objetivo activo',
      ].join(' · '),
      hint: session.phoneState?.hotspotLabel
        ? `hotspot ${session.phoneState.hotspotLabel} · fase ${session.phoneState.tracerStage || 0}`
        : 'La traza exacta requiere que el operador DM conteste desde /phone.',
    },
  };

  return summaries[activeTool] || summaries.evidencias;
};

const buildHerramientasModel = ({ session }) => {
  const activeTool = session.selection.herramientas.activeTool || 'evidencias';
  const activeToolData = TOOLS.find((entry) => entry.id === activeTool) || TOOLS[0];
  const originModule =
    session.toolContext?.originModule || session.lastPrimaryModule || QUEST_MODULE_OPERACION;
  const inventory = buildToolInventory({ session, activeTool });
  const actions = [
    {
      id: 'tool:return',
      label: 'VOLVER',
      description: `Retornar a ${originModule}`,
    },
    activeTool === 'evidencias'
      ? {
          id: 'tool:next-evidence',
          label: 'SIG STL',
          description: 'Ciclar pieza 3D',
        }
      : null,
    {
      id: 'tool:casos',
      label: 'CASO',
      description: session.selectedCase?.title || 'Ir a expediente en foco',
    },
    {
      id: 'tool:mapa',
      label: 'MAPA',
      description: session.selectedPoi?.name || 'Ir a ubicación monitorizada',
    },
    activeTool !== 'evidencias'
      ? {
          id: 'tool:perfiles',
          label: 'PERFIL',
          description: session.selectedProfile?.alias || 'Ir a perfil destacado',
        }
      : null,
  ].filter(Boolean);

  return {
    layout: 'instrument',
    title: 'HERRAMIENTAS',
    subtitle: `${activeToolData.label} · ${originModule}`,
    focusTitle: activeToolData.label,
    focusBody: inventory.focus,
    detailTitle: 'CONSOLA ACTIVA',
    detailBody: inventory.detail,
    hint: `${inventory.hint} · origen ${originModule}`,
    items: TOOLS.map((entry) => ({
      ...entry,
      description:
        buildToolInventory({ session, activeTool: entry.id }).detail ||
        entry.description,
      accent: entry.id === activeTool,
    })),
    actions,
    onSelect: (id) =>
      session.actions.openTool(id, {
        originModule,
      }),
    onAction: (id) => {
      if (id === 'tool:return') session.actions.returnToOperationalContext();
      if (id === 'tool:next-evidence') {
        const nextEvidenceId = getNextEvidenceId(session);
        if (nextEvidenceId) {
          session.actions.openTool('evidencias', {
            originModule,
            resourceId: nextEvidenceId,
          });
        }
      }
      if (id === 'tool:casos') session.actions.goToCasos({ caseId: session.selectedCase?.id });
      if (id === 'tool:mapa') session.actions.goToMapa({ poiId: session.selectedPoi?.id });
      if (id === 'tool:perfiles') session.actions.goToPerfiles({ profileId: session.selectedProfile?.id });
    },
    onBack: session.actions.returnToOperationalContext,
    onHome: session.actions.goToOperacion,
  };
};

const buildQuestModuleModel = ({ data, session }) => {
  switch (session.currentModule) {
    case QUEST_MODULE_CASOS:
      return buildCasosModel({ data, session });
    case QUEST_MODULE_MAPA:
      return buildMapaModel({ data, session });
    case QUEST_MODULE_PERFILES:
      return buildPerfilesModel({ data, session });
    case QUEST_MODULE_HERRAMIENTAS:
      return buildHerramientasModel({ session });
    case QUEST_MODULE_OPERACION:
    default:
      return buildOperacionModel({ session });
  }
};

export { buildQuestModuleModel };
