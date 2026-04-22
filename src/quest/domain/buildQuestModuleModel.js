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

const buildOperationItems = ({ session }) => {
  const focusItem = {
    id: 'operacion:casos',
    label: 'CASO EN FOCO',
    description: session.activeCase
      ? `${session.activeCase.title} · ${session.activeCase.status || 'sin estado'}`
      : 'Abrir expedientes disponibles',
    accent: true,
  };

  const leadItems = session.openLeads.slice(0, 2).map((lead) => ({
    id: `lead:${lead.id}`,
    label: `${formatLeadType(lead.tipo).toUpperCase()} ABIERTA`,
    description: `${lead.titulo} · ${summarize(lead.resumenBreve, 'Sin detalle.')}`,
    accent: false,
  }));

  const utilityItem = {
    id: 'operacion:herramientas',
    label: 'BAHÍA INSTRUMENTAL',
    description: 'Abrir herramientas contextualizadas sin perder el hilo del caso.',
    accent: false,
  };

  const changesItem = {
    id: 'operacion:cambios',
    label: 'CAMBIOS RECIENTES',
    description: session.recentChanges[0]?.detail || 'Sin deltas operativos relevantes.',
    accent: false,
  };

  return [focusItem, ...leadItems, utilityItem, changesItem].slice(0, 5);
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

    if (id === 'operacion:herramientas') {
      session.actions.goToHerramientas({
        tool: 'evidencias',
        originModule: QUEST_MODULE_OPERACION,
      });
      return;
    }

    if (id === 'operacion:cambios') {
      session.actions.goToCasos();
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
        description: session.selectedPoi?.name || 'Abrir despliegue espacial del caso',
      },
      {
        id: 'case:perfiles',
        label: 'VER PERFILES',
        description: session.selectedProfile?.alias || 'Consultar amenaza vinculada',
      },
      {
        id: 'case:herramientas',
        label: 'EVIDENCIAS',
        description: objectiveLine ? summarize(objectiveLine, 'Entrar en bahía de evidencias') : 'Entrar en bahía de evidencias',
      },
    ],
    onSelect: (id) => session.actions.selectCase(id),
    onAction: (id) => {
      if (id === 'case:mapa') session.actions.goToMapa({ poiId: session.selectedPoi?.id });
      if (id === 'case:perfiles') session.actions.goToPerfiles({ profileId: session.selectedProfile?.id });
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
          `${selectedPoi.district || 'Sin distrito'} · ${selectedPoi.details || selectedPoi.contacts || selectedPoi.summary}`,
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
        description: session.selectedCase?.title || 'Volver al expediente en foco',
      },
      {
        id: 'map:perfiles',
        label: 'VER PERFIL',
        description: session.selectedProfile?.alias || 'Consultar entidad vinculada',
      },
      {
        id: 'map:rastreo',
        label: 'RASTREO',
        description: 'Abrir rastreo contextual',
      },
    ],
    onSelect: (id) => session.actions.selectPoi(id),
    onAction: (id) => {
      if (id === 'map:casos') session.actions.goToCasos({ caseId: session.selectedCase?.id });
      if (id === 'map:perfiles') session.actions.goToPerfiles({ profileId: session.selectedProfile?.id });
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
          selectedProfile.patterns ||
            selectedProfile.knownAssociates ||
            selectedProfile.notes,
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
        description: session.selectedPoi?.name || 'Abrir última ubicación monitorizada',
      },
      {
        id: 'profile:casos',
        label: 'VER EXPEDIENTE',
        description: session.selectedCase?.title || 'Volver al caso en foco',
      },
      {
        id: 'profile:comms',
        label: 'COMUNICACIONES',
        description: 'Abrir línea contextual',
      },
    ],
    onSelect: (id) => session.actions.selectProfile(id),
    onAction: (id) => {
      if (id === 'profile:mapa') session.actions.goToMapa({ poiId: session.selectedPoi?.id });
      if (id === 'profile:casos') session.actions.goToCasos({ caseId: session.selectedCase?.id });
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

const buildHerramientasModel = ({ session }) => {
  const activeTool = session.selection.herramientas.activeTool || 'evidencias';
  const activeToolData = TOOLS.find((entry) => entry.id === activeTool) || TOOLS[0];
  const originModule =
    session.toolContext?.originModule || session.lastPrimaryModule || QUEST_MODULE_OPERACION;

  const toolDetailById = {
    evidencias: session.selectedCase
      ? `Caso ${session.selectedCase.title}. Bahía de inspección lista para abrir activos relacionados.`
      : 'Bahía de inspección preparada. Selecciona un expediente para precargar una pieza.',
    audio: session.selectedCase
      ? `Escucha forense asociada a ${session.selectedCase.title}. Transporte listo para reproducir una pista.`
      : 'Estación de escucha forense preparada para pistas de audio.',
    balistica: session.selectedCase
      ? `Comparación instrumental asociada a ${session.selectedCase.title}. Preparada para muestra A/B.`
      : 'Comparador balístico preparado para seleccionar dos muestras.',
    comunicaciones: session.selectedProfile
      ? `Línea contextual vinculada a ${session.selectedProfile.alias}. ${session.phoneState?.isOffHook ? `Estado ${session.phoneState.lineStatus}. Marcación ${session.phoneState.dialedDigits || session.phoneState.lastDialedNumber || 'vacía'}.` : 'Auricular colgado y consola en espera.'} Bridge ${session.phoneState?.tracerWsState || 'offline'}.`
      : `Consola de comunicaciones lista para operar una línea contextual. ${session.phoneState?.isOffHook ? `Estado ${session.phoneState.lineStatus}.` : 'Auricular colgado.'} Bridge ${session.phoneState?.tracerWsState || 'offline'}.`,
    rastreo: session.selectedPoi
      ? `Rastreo contextual sobre ${session.selectedPoi.name}. Triangulación preparada desde mapa operativo.`
      : 'Rastreo progresivo preparado para un objetivo activo.',
  };

  return {
    layout: 'instrument',
    title: 'HERRAMIENTAS',
    subtitle: `${activeToolData.label} · ${originModule}`,
    focusTitle: activeToolData.label,
    focusBody: activeToolData.description,
    detailTitle: 'CONSOLA ACTIVA',
    detailBody: toolDetailById[activeTool] || activeToolData.description,
    hint:
      activeTool === 'comunicaciones'
        ? `Línea ${session.phoneState?.lineStatus || 'colgada'} · ws ${session.phoneState?.tracerWsState || 'offline'} · buffer ${session.phoneState?.dialedDigits || session.phoneState?.lastDialedNumber || 'vacío'}${session.phoneState?.hotspotLabel ? ` · hotspot ${session.phoneState.hotspotLabel}` : ''} · volver conserva el contexto operativo.`
        : `Origen ${originModule} · volver conserva el contexto operativo.`,
    items: TOOLS.map((entry) => ({
      ...entry,
      accent: entry.id === activeTool,
    })),
    actions: [
      {
        id: 'tool:return',
        label: 'VOLVER',
        description: `Retornar a ${originModule}`,
      },
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
      {
        id: 'tool:perfiles',
        label: 'PERFIL',
        description: session.selectedProfile?.alias || 'Ir a perfil destacado',
      },
    ],
    onSelect: (id) =>
      session.actions.openTool(id, {
        originModule,
      }),
    onAction: (id) => {
      if (id === 'tool:return') session.actions.returnToOperationalContext();
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
