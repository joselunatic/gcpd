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

const buildOperacionModel = ({ session }) => ({
  title: 'OPERACIÓN ACTUAL',
  subtitle: session.activeCase
    ? `${session.activeCase.title} · alerta ${session.alertLevel}`
    : 'Sin caso activo',
  hint: session.activeCase
    ? summarize(session.activeCase.summary, 'Selecciona un expediente para comenzar.')
    : 'Selecciona un expediente para comenzar.',
  items: [
    {
      id: 'operacion:casos',
      label: 'CASOS',
      description: session.activeCase
        ? `Abrir ${session.activeCase.title}`
        : 'Abrir expedientes disponibles',
      accent: true,
    },
    {
      id: 'operacion:mapa',
      label: 'MAPA',
      description: session.openLeads[0]?.titulo || 'Revisar ubicaciones activas',
    },
    {
      id: 'operacion:perfiles',
      label: 'PERFILES',
      description: session.openLeads[1]?.titulo || 'Consultar perfiles de amenaza',
    },
    {
      id: 'operacion:herramientas',
      label: 'HERRAMIENTAS',
      description: 'Abrir bahías instrumentales y modos de análisis',
    },
  ],
  onSelect: (id) => {
    if (id === 'operacion:casos') session.actions.goToCasos();
    if (id === 'operacion:mapa') session.actions.goToMapa();
    if (id === 'operacion:perfiles') session.actions.goToPerfiles();
    if (id === 'operacion:herramientas') {
      session.actions.goToHerramientas({
        tool: 'evidencias',
        originModule: QUEST_MODULE_OPERACION,
      });
    }
  },
  onBack: null,
  onHome: null,
});

const buildCasosModel = ({ data, session }) => ({
  title: 'CASOS',
  subtitle: session.selectedCase
    ? `${session.selectedCase.title} · ${session.selectedCase.status || 'sin estado'}`
    : `${data.cases.length} expedientes disponibles`,
  hint: session.selectedCase
    ? summarize(session.selectedCase.summary, 'Expediente sin resumen.')
    : 'Selecciona un expediente para fijarlo como foco operativo.',
  items: data.cases.slice(0, 6).map((entry) => ({
    id: entry.id,
    label: entry.title || entry.id,
    description: `${entry.status || 'sin estado'} · ${summarize(entry.summary, 'Sin resumen.')}`,
    accent: entry.id === session.selectedCase?.id,
  })),
  onSelect: (id) => session.actions.selectCase(id),
  onBack: session.actions.goToOperacion,
  onHome: session.actions.goToOperacion,
});

const buildMapaModel = ({ data, session }) => ({
  title: 'MAPA',
  subtitle: session.selectedPoi
    ? `${session.selectedPoi.name} · ${session.selectedPoi.district || 'sin distrito'}`
    : `${data.pois.length} ubicaciones indexadas`,
  hint: session.selectedPoi
    ? summarize(session.selectedPoi.details || session.selectedPoi.summary, 'Ubicación sin detalle.')
    : 'Selecciona un punto de interés para leer su contexto.',
  items: data.pois.slice(0, 6).map((entry) => ({
    id: entry.id,
    label: entry.name || entry.id,
    description: `${entry.district || 'sin distrito'} · ${summarize(entry.summary, 'Sin resumen.')}`,
    accent: entry.id === session.selectedPoi?.id,
  })),
  onSelect: (id) => session.actions.selectPoi(id),
  onBack: session.actions.goToOperacion,
  onHome: session.actions.goToOperacion,
});

const buildPerfilesModel = ({ data, session }) => ({
  title: 'PERFILES',
  subtitle: session.selectedProfile
    ? `${session.selectedProfile.alias} · ${session.selectedProfile.threatLevel || session.selectedProfile.status || 'sin nivel'}`
    : `${data.villains.length} perfiles cargados`,
  hint: session.selectedProfile
    ? summarize(
        session.selectedProfile.summary ||
          session.selectedProfile.patterns ||
          session.selectedProfile.notes,
        'Perfil sin detalle.'
      )
    : 'Selecciona un perfil para consultar su amenaza.',
  items: data.villains.slice(0, 6).map((entry) => ({
    id: entry.id,
    label: entry.alias || entry.id,
    description: `${entry.threatLevel || entry.status || 'sin nivel'} · ${summarize(entry.summary, 'Sin resumen.')}`,
    accent: entry.id === session.selectedProfile?.id,
  })),
  onSelect: (id) => session.actions.selectProfile(id),
  onBack: session.actions.goToOperacion,
  onHome: session.actions.goToOperacion,
});

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

  return {
    title: 'HERRAMIENTAS',
    subtitle: `${activeToolData.label} · ${session.toolContext?.originModule || session.lastPrimaryModule}`,
    hint: activeToolData.description,
    items: TOOLS.map((entry) => ({
      ...entry,
      accent: entry.id === activeTool,
    })),
    onSelect: (id) =>
      session.actions.openTool(id, {
        originModule: session.toolContext?.originModule || session.lastPrimaryModule || QUEST_MODULE_OPERACION,
      }),
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
