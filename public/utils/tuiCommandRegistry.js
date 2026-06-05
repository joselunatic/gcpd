const TUI_COMMANDS = [
  { command: "map", label: "MAP", category: "Navegacion", description: "Matriz cartografica" },
  { command: "cases", label: "CASES", category: "Navegacion", description: "Expedientes activos" },
  { command: "case", label: "CASE <ID>", category: "Navegacion", description: "Abre un expediente" },
  { command: "villains", label: "VILLAINS", category: "Navegacion", description: "Galeria de objetivos" },
  { command: "tactical", label: "TACTICAL", category: "Navegacion", description: "Mapa tactico en vivo" },
  { command: "show", label: "SHOW", category: "Visual / media", description: "Muestra evidencias o imagenes" },
  { command: "audio", label: "AUDIO", category: "Visual / media", description: "Reproduce archivo de audio" },
  { command: "ballistica", label: "BALLISTICA", category: "Visual / media", description: "Analisis balistico" },
  { command: "dial", label: "DIAL", category: "Comunicaciones", description: "Llama a una linea directa" },
  { command: "dialer", label: "DIALER", category: "Comunicaciones", description: "Panel telefonico" },
  { command: "tracer", label: "TRACER", category: "Comunicaciones", description: "Rastreo telefonico" },
  { command: "help", label: "HELP", category: "Sistema", description: "Directorio de ordenes" },
  { command: "status", label: "STATUS", category: "Sistema", description: "Estado del nodo" },
  { command: "touch", label: "TOUCH", category: "Sistema", description: "Modo tactil" },
  { command: "logout", label: "LOGOUT", category: "Sistema", description: "Cierra sesion remota" },
  { command: "exit", label: "EXIT", category: "Sistema", description: "Vuelve al dialer" },
  { command: "quit", label: "QUIT", category: "Sistema", description: "Sale del modulo activo" },
  { command: "clear", label: "CLEAR", category: "Sistema", description: "Limpia terminal" },
  { command: "hello", label: "HELLO", category: "Sistema", description: "Handshake basico" },
  { command: "flags", label: "FLAGS", category: "Sistema", description: "Flags de campana" },
  { command: "last", label: "LAST", category: "Sistema", description: "Ultima consulta" },
  { command: "summary", label: "SUMMARY", category: "Sistema", description: "Resumen operativo" },
  { command: "modules", label: "MODULES", category: "Sistema", description: "Modulos disponibles" },
  { command: "matrix", label: "MATRIX", category: "Sistema", description: "Rutina visual legacy" },
];

const COMMAND_ALIASES = {
  mapa: "map",
  casos: "cases",
  modulos: "modules",
  modulo: "modules",
  caso: "case",
  villanos: "villains",
  villano: "villains",
  ayuda: "help",
  salir: "exit",
  limpiar: "clear",
  estado: "status",
};

function normalizeCommandToken(value = "") {
  const token = String(value || "").trim().toLowerCase();
  return COMMAND_ALIASES[token] || token;
}

function normalizeTuiCommandLocks(value = {}) {
  const raw = value && typeof value === "object" ? value : {};
  return TUI_COMMANDS.reduce((acc, item) => {
    acc[item.command] = Boolean(raw[item.command]);
    return acc;
  }, {});
}

function getTuiCommandMeta(command) {
  const normalized = normalizeCommandToken(command);
  return TUI_COMMANDS.find((item) => item.command === normalized) || null;
}

function isTuiCommandLocked(command, locks = {}) {
  const meta = getTuiCommandMeta(command);
  if (!meta) return false;
  return Boolean(normalizeTuiCommandLocks(locks)[meta.command]);
}

export {
  COMMAND_ALIASES,
  TUI_COMMANDS,
  getTuiCommandMeta,
  isTuiCommandLocked,
  normalizeCommandToken,
  normalizeTuiCommandLocks,
};
