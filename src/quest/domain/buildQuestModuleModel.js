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

const compactLine = (value, max = 132) => {
  const text = Array.isArray(value) ? value.join(' ') : String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const listLines = (values = [], max = 5) =>
  (Array.isArray(values) ? values : [values])
    .flat()
    .filter(Boolean)
    .map((entry) => compactLine(entry))
    .filter(Boolean)
    .slice(0, max);

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

const inferResourceType = (entry = {}) => {
  const explicitType = String(entry.type || entry.kind || entry.mediaType || '').toLowerCase();
  if (['audio', 'video', 'image', 'imagen'].includes(explicitType)) {
    return explicitType === 'imagen' ? 'image' : explicitType;
  }

  const source = String(entry.src || entry.url || entry.path || entry.href || entry.file || '').toLowerCase();
  if (/\.(mp3|wav|ogg|m4a)(\?|#|$)/.test(source)) return 'audio';
  if (/\.(mp4|webm|mov|m4v)(\?|#|$)/.test(source)) return 'video';
  if (/\.(png|jpe?g|webp|gif|avif)(\?|#|$)/.test(source)) return 'image';
  return explicitType || 'document';
};

const normalizeMapResource = (entry = {}, index = 0, fallbackType = '') => {
  const src = entry.src || entry.url || entry.path || entry.href || entry.file || entry.originalSrc || '';
  const type = fallbackType || inferResourceType({ ...entry, src });
  return {
    ...entry,
    id: entry.id || entry.resourceId || entry.assetId || src || `poi-resource-${index + 1}`,
    type,
    label: entry.label || entry.title || entry.name || `${type || 'recurso'} ${index + 1}`,
    title: entry.title || entry.label || entry.name || `${type || 'recurso'} ${index + 1}`,
    description: entry.description || entry.summary || entry.caption || entry.notes || '',
    src,
    thumbnail: entry.thumbnail || entry.poster || entry.preview || '',
  };
};

const withResourceType = (entry, type) =>
  typeof entry === 'string' ? { src: entry, type } : { ...entry, type };

const listPoiResources = (poi = {}) => {
  const generic = [
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
  const typed = [
    ...(Array.isArray(poi.images) ? poi.images.map((entry) => withResourceType(entry, 'image')) : []),
    ...(Array.isArray(poi.videos) ? poi.videos.map((entry) => withResourceType(entry, 'video')) : []),
    ...(Array.isArray(poi.audios) ? poi.audios.map((entry) => withResourceType(entry, 'audio')) : []),
    ...(Array.isArray(poi.audio) ? poi.audio.map((entry) => withResourceType(entry, 'audio')) : []),
    ...(Array.isArray(poi.commands?.images) ? poi.commands.images.map((entry) => withResourceType(entry, 'image')) : []),
    ...(Array.isArray(poi.commands?.videos) ? poi.commands.videos.map((entry) => withResourceType(entry, 'video')) : []),
    ...(Array.isArray(poi.commands?.audios) ? poi.commands.audios.map((entry) => withResourceType(entry, 'audio')) : []),
  ];

  return [...generic, ...typed]
    .map((entry) => (typeof entry === 'string' ? { src: entry } : entry))
    .map((entry, index) => normalizeMapResource(entry, index))
    .filter((entry) => entry.id && (entry.src || entry.description || entry.title));
};

const FALLBACK_POI_GEO = {
  narrows: { x: 52, y: 46, radius: 1.8 },
  oldtown: { x: 55, y: 30, radius: 1.6 },
  arkham: { x: 67, y: 24, radius: 1.6 },
};

const getPoiGeo = (poi = {}) => {
  const geo = poi?.poiV2?.geo || {};
  const mapMeta = poi?.commands?.mapMeta || {};
  const fallback = FALLBACK_POI_GEO[poi.id] || {};
  const x = geo.x ?? mapMeta.x ?? fallback.x;
  const y = geo.y ?? mapMeta.y ?? fallback.y;
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return {};
  return {
    mapX: Number(x),
    mapY: Number(y),
    radius: Number(geo.radius ?? mapMeta.radius ?? fallback.radius) || 1.6,
  };
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
          originModule: QUEST_MODULE_CASOS,
        });
      }
    },
    workspaceLines: listLines(
      [
        caseBrief,
        caseIntel,
        selectedCase?.dm?.notes ? `DM: ${selectedCase.dm.notes}` : '',
        relatedPois.length
          ? `POIs: ${formatEntityList(relatedPois, (entry) => entry.name)}`
          : '',
        relatedProfiles.length
          ? `Perfiles: ${formatEntityList(relatedProfiles, (entry) => entry.alias)}`
          : '',
        unlockLine,
      ],
      7
    ),
    onBack: session.actions.goToOperacion,
    onHome: session.actions.goToOperacion,
  };
};

const buildMapaModel = ({ data, session }) => {
  const selectedPoi = session.selectedPoi;
  const context = session.questContext || {};
  const relatedCases = context.relatedCasesForPoi || [];
  const relatedProfiles = context.relatedProfilesForPoi || [];
  const mapResources = listPoiResources(selectedPoi);
  const selectedResourceId = session.selection?.mapa?.selectedResourceId;
  const selectedMapResource =
    mapResources.find((entry) => entry.id === selectedResourceId) || null;
  const resourceActions = mapResources.slice(0, 5).map((resource) => ({
    id: `map:resource:${resource.id}`,
    label: resource.label || resource.title,
    description: `${resource.type || 'recurso'}${resource.description ? ` · ${resource.description}` : ''}`,
    accent: resource.id === selectedMapResource?.id,
    resource,
  }));

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
            selectedMapResource ? `Recurso: ${selectedMapResource.title}` : '',
            selectedPoi.details || selectedPoi.contacts || selectedPoi.summary,
            `Expedientes: ${formatEntityList(relatedCases, (entry) => entry.title)}`,
            `Perfiles: ${formatEntityList(relatedProfiles, (entry) => entry.alias)}`,
          ].join(' · '),
          'Sin detalle espacial.'
        )
      : 'Sin punto de interés seleccionado.',
    hint: selectedPoi
      ? summarize(
          selectedMapResource?.description || selectedMapResource?.src || selectedPoi.details || selectedPoi.summary,
          'Ubicación sin detalle.'
        )
      : 'Selecciona un punto de interés para leer su contexto.',
    items: data.pois.slice(0, 6).map((entry) => ({
      id: entry.id,
      label: entry.name || entry.id,
      description: `${entry.district || 'sin distrito'} · ${summarize(entry.summary, 'Sin resumen.')}`,
      status: entry.status,
      summary: entry.summary,
      district: entry.district,
      accent: entry.id === selectedPoi?.id,
      ...getPoiGeo(entry),
    })),
    actions: [
      ...resourceActions,
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
      if (id.startsWith('map:resource:')) {
        session.actions.selectMapResource?.(id.slice('map:resource:'.length));
      }
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
    workspaceLines: listLines(
      [
        selectedPoi?.status ? `Estado: ${formatStatusLabel(selectedPoi.status)}` : '',
        mapResources.length ? `Recursos DM: ${mapResources.length}` : 'Recursos DM: sin adjuntos',
        selectedMapResource ? `Recurso activo: ${selectedMapResource.type} · ${selectedMapResource.title}` : '',
        selectedPoi?.details,
        selectedPoi?.contacts,
        selectedPoi?.notes,
        relatedCases.length
          ? `Expedientes vinculados: ${formatEntityList(relatedCases, (entry) => entry.title)}`
          : '',
        relatedProfiles.length
          ? `Perfiles vinculados: ${formatEntityList(relatedProfiles, (entry) => entry.alias)}`
          : '',
      ],
      6
    ),
    mapResources,
    selectedMapResource,
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
    workspaceLines: listLines(
      [
        selectedProfile?.lastSeen ? `Última vista: ${selectedProfile.lastSeen}` : '',
        selectedProfile?.patterns,
        selectedProfile?.knownAssociates?.length
          ? `Asociados: ${selectedProfile.knownAssociates.join(', ')}`
          : '',
        selectedProfile?.notes,
        relatedPois.length
          ? `Ubicaciones: ${formatEntityList(relatedPois, (entry) => entry.name)}`
          : '',
        relatedCases.length
          ? `Expedientes: ${formatEntityList(relatedCases, (entry) => entry.title)}`
          : '',
      ],
      7
    ),
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
    label: 'DIAL',
    description: 'Telefonía: líneas, escuchas y registros de llamada.',
  },
  {
    id: 'rastreo',
    label: 'TRAZA',
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
      lines: listLines([
        `Piezas: ${allEvidence.length} totales, ${builtInEvidence.length} built-in, ${evidence.length} desde API`,
        selectedEvidence ? `Selección: ${selectedEvidence.label || selectedEvidence.id}` : '',
        selectedEvidence?.stlPath ? `Ruta STL: ${selectedEvidence.stlPath}` : '',
        selectedEvidence?.source ? `Origen: ${selectedEvidence.source}` : '',
      ]),
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
      lines: listLines([
        `Pistas: ${audio.length} totales, ${audio.filter((entry) => entry.locked).length} bloqueadas`,
        selectedAudio ? `Activa: ${selectedAudio.title || selectedAudio.id}` : '',
        selectedAudio?.src ? `Fuente: ${selectedAudio.src}` : '',
        selectedAudio?.locked ? 'Estado: requiere desbloqueo' : 'Estado: reproducible',
      ]),
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
      lines: listLines([
        `Muestras DB: ${ballistics.length}`,
        `Assets PNG: ${ballisticsAssets.length}`,
        selectedBallistic ? `Muestra activa: ${selectedBallistic.label || selectedBallistic.id}` : '',
        selectedBallistic?.caseCode ? `Código de caso: ${selectedBallistic.caseCode}` : '',
        'Mantener minijuego MATCH por códigos izquierdo/derecho.',
      ]),
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
      lines: listLines([
        `Líneas: ${phoneLines.length}`,
        `Selección: ${formatPhoneLineState(selectedLine)}`,
        `Auricular: ${session.phoneState?.isOffHook ? 'levantado' : 'colgado'}`,
        `Estado línea: ${session.phoneState?.lineStatus || 'reposo'}`,
        `Buffer: ${session.phoneState?.dialedDigits || session.phoneState?.lastDialedNumber || 'vacío'}`,
      ]),
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
      lines: listLines([
        `WebSocket: ${session.phoneState?.tracerWsState || 'offline'}`,
        `Líneas trazables: ${tracerLines.length}`,
        `Hotspots: ${tracerHotspots.length}`,
        activeTraceNumber ? `Objetivo: ${activeTraceNumber}` : 'Objetivo: sin número activo',
        session.phoneState?.hotspotLabel ? `Hotspot: ${session.phoneState.hotspotLabel}` : '',
      ]),
    },
  };

  return summaries[activeTool] || summaries.evidencias;
};

const buildHerramientasModel = ({ session }) => {
  const activeTool = session.selection.herramientas.activeTool || null;
  const activeToolData = TOOLS.find((entry) => entry.id === activeTool) || TOOLS[0];
  const originModule =
    session.toolContext?.originModule || session.lastPrimaryModule || QUEST_MODULE_OPERACION;
  const inventory = activeTool
    ? buildToolInventory({ session, activeTool })
    : {
        focus: 'Selecciona una herramienta para abrir su estación XR: evidencias STL, audio, balística, dial o rastreo.',
        detail: TOOLS.map((entry) => entry.label).join(' · '),
        hint: 'Hub de herramientas activo. El visor STL solo se carga al seleccionar EVIDENCIAS.',
        lines: listLines([
          'EVIDENCIAS: visor STL operativo con piezas visibles por DM.',
          'AUDIO: escucha forense e inventario de pistas.',
          'BALÍSTICA: minijuego de match por códigos de bala.',
          'DIAL: telefonía y líneas de llamada.',
          'TRAZA: triangulación por WebSocket y hotspot.',
        ]),
      };
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
    activeTool && activeTool !== 'evidencias'
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
    subtitle: activeTool ? `${activeToolData.label} · ${originModule}` : `SELECCION DE UTILIDAD · ${originModule}`,
    focusTitle: activeTool ? activeToolData.label : 'SELECCIONAR HERRAMIENTA',
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
    workspaceLines: inventory.lines || [],
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
