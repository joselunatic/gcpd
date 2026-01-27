import clear from "/commands/clear.js";
import {
  parse,
  type,
  prompt,
  input,
  renderSelectableLines,
  setFastMode,
  isInputActive,
  submitInput,
  focusInput,
} from "/utils/io.js";
import pause from "/utils/pause.js";
import alert from "/utils/alert.js";
import say from "/utils/speak.js";
import showMap from "/commands/map.js";
import villainsGallery from "/commands/villains.js";
import casesCommand from "/commands/cases.js";
import { renderStatusHeader } from "/utils/status.js";
import {
  waitForSelection,
  moveSelection,
  activateSelection,
  clearSelectables,
  setSelectables,
  hasPendingSelection,
  getSelectedElement,
} from "/utils/selection.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";

const wrapLine = (text = "", limit = 80) => {
  const adjustedLimit = getWrapLimit(limit);
  const words = text.split(" ");
  const segments = [];
  let current = "";
  words.forEach((word) => {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length > adjustedLimit) {
      if (current) segments.push(current);
      current = word;
    } else {
      current = tentative;
    }
  });
  if (current) segments.push(current);
  return segments.length ? segments : [text];
};

function ensureSelectionState() {
  if (getSelectedElement()) return true;
  const hasSelectables = document.querySelector("[data-selectable='true']");
  if (!hasSelectables) return false;
  rehydrateSelectablesFromDom();
  return Boolean(getSelectedElement());
}

function triggerSelectedAction(element) {
  if (!element) return false;
  const action = element.dataset.action || "";
  const value = element.dataset.value || "";
  if (!action) return false;
  if (window.__woprDebugKeys) {
    console.log("[WOPR DEBUG selection action]", {
      action,
      value,
      screen: document.querySelector(".terminal")?.dataset?.screenStatus || null,
    });
  }
  const screen = document.querySelector(".terminal")?.dataset?.screenStatus || "";
  if (action === "input") {
    if (submitInput(value)) return true;
    const text = element.textContent || "";
    if (screen === "map" && /^[1-4]$/.test(value)) {
      runMapChoice(value);
      return true;
    }
    if (/RESUMEN DE PROTOCOLOS|MAP|CASES|VILLAIN GALLERY/i.test(text)) {
      const mapChoice = value || (text.match(/^\\s*(\\d)\\./)?.[1] || "");
      if (/^[1-4]$/.test(mapChoice)) {
        runMapChoice(mapChoice);
        return true;
      }
    }
    if (/HELP|CASES|MAP|VILLAINS/i.test(text)) {
      const mainMap = {
        1: "help",
        2: "cases",
        3: "map",
        4: "villains",
      };
      const mainChoice = value || (text.match(/^\\s*(\\d)\\./)?.[1] || "");
      if (mainMap[mainChoice]) {
        parse(mainMap[mainChoice]);
        return true;
      }
    }
    // No active input field; run the command directly.
    parse(value);
    return true;
  }
  if (action === "command") {
    parse(value);
    if (isInputActive()) {
      setTimeout(() => focusInput(), 0);
    }
    return true;
  }
  return false;
}

async function runMapChoice(value) {
  if (value === "1") {
    await type(
      [
        "RESUMEN HELP:",
        "- ESCRIBE 'HELP' EN CUALQUIER MOMENTO PARA VER LOS COMANDOS.",
        "- 'MAP' ABRE LOS DISTRITOS/POI.",
        "- 'CASES' LISTA LOS CASOS.",
        "- 'CASE <ID>' PROFUNDIZA EN UN EXPEDIENTE.",
        " ",
      ],
      { stopBlinking: true }
    );
    return main();
  }
  if (value === "2") {
    await showMap();
    return main();
  }
  if (value === "3") {
    await casesCommand();
    return main();
  }
  if (value === "4") {
    await villainsGallery();
    return main();
  }
  return main();
}

const TERMINAL_STATE_KEY = "terminalState";

function persistTerminalState(status, context = {}) {
  const payload = {
    status,
    context: context || {},
    updatedAt: Date.now(),
  };
  try {
    localStorage.setItem(TERMINAL_STATE_KEY, JSON.stringify(payload));
  } catch (e) {}
  try {
    sessionStorage.setItem(TERMINAL_STATE_KEY, JSON.stringify(payload));
  } catch (e) {}
}

function getTerminalState() {
  const read = (storage) => {
    if (!storage) return null;
    try {
      const raw = storage.getItem(TERMINAL_STATE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  };
  return read(localStorage) || read(sessionStorage);
}

const dialerLines = [
  {
    number: "(311) 399-2364",
    label: "GARAJE DE LA BATCUEVA",
    action: "message",
    desktopLines: [
      "ESTADO: SIN SEÑALES VITALES",
      "",
      "Infraestructura vehicular primaria.",
      "Plataforma de resguardo del Batcoche (fase inicial).",
      "",
      "Sensores biometricos operativos.",
      "No se registran constantes vitales compatibles.",
      "",
      "Ultima lectura valida:",
      "  - Pulso: NO DETECTADO",
      "  - Actividad neurologica: NO RESPONDE",
      "",
      "El sistema no confirma ausencia.",
      "El operador no ha sido relevado.",
      "",
      "El vehiculo permanece inmovil.",
      "El garaje mantiene protocolo de espera.",
    ],
    mobileLines: [
      "ESTADO: SIN SEÑALES VITALES",
      "",
      "Garaje del Batcoche.",
      "Sensores activos.",
      "",
      "Pulso: NO DETECTADO",
      "Actividad: NO RESPONDE",
      "",
      "Ausencia no confirmada.",
      "Vehiculo inmovil.",
      "Protocolo en espera.",
    ],
  },
  {
    number: "(311) 399-3582",
    label: "FAILSAFE ZUR-EN-ARRH",
    action: "message",
    desktopLines: [
      "ESTADO: BLOQUEADO / LATENTE",
      "",
      "Subsistema de contingencia cognitiva.",
      "Diseñado para activarse en caso de colapso del operador.",
      "",
      "Protocolos intencionadamente fragmentados.",
      "Las rutinas no se ejecutan en secuencia lineal.",
      "No existe registro completo del comportamiento esperado.",
      "",
      "El sistema detecta condiciones parciales de activacion.",
      "La orden final no ha sido emitida.",
      "O no ha sido reconocida.",
      "",
      "Advertencia:",
      "La inicializacion puede generar respuestas no previstas.",
      "El sistema recomienda no continuar.",
      "El sistema continua observando.",
    ],
    mobileLines: [
      "ESTADO: BLOQUEADO",
      "",
      "Failsafe cognitivo.",
      "Protocolos incompletos.",
      "",
      "Condiciones parciales detectadas.",
      "Orden final ausente.",
      "",
      "Inicializacion no recomendada.",
      "El sistema observa.",
    ],
  },
  {
    number: "(311) 437-8739",
    label: "NODO AUX BROTHER-MK0",
    action: "activate",
  },
  {
    number: "(311) 437-1083",
    label: "CLOCKTOWER BACKUP",
    action: "message",
    desktopLines: [
      "ESTADO: SOLO LECTURA",
      "",
      "Nodo de respaldo urbano.",
      "Sincronizado con sensores distribuidos en la ciudad.",
      "",
      "Registros disponibles:",
      "  - Transito nocturno",
      "  - Actividad en azoteas",
      "  - Señales acusticas irregulares",
      "  - Eventos no catalogados",
      "",
      "Ultima sincronizacion completa:",
      "  ANTES DE LA CAIDA DEL SISTEMA CENTRAL",
      "",
      "Las camaras continuan observando.",
      "El nodo no recibe ordenes.",
      "La ciudad sigue moviendose.",
      "El vigilante no responde.",
    ],
    mobileLines: [
      "ESTADO: SOLO LECTURA",
      "",
      "Respaldo urbano.",
      "Sensores activos.",
      "",
      "Ultima sincronizacion:",
      "ANTES DE LA CAIDA",
      "",
      "La ciudad se mueve.",
      "El nodo observa.",
      "No hay ordenes.",
    ],
  },
  {
    number: "(311) 437-2977",
    label: "ALA SEGURA DE ARKHAM",
    action: "message",
    desktopLines: [
      "ESTADO: DESVINCULADO",
      "",
      "Canal de coordinacion con Arkham.",
      "Diseñado para incidentes fuera de control.",
      "",
      "Sujetos alojados:",
      "  Criminales de alta peligrosidad.",
      "  Perfiles reincidentes.",
      "  Casos que no admiten custodia ordinaria.",
      "",
      "Los protocolos de esta ala no buscan rehabilitacion.",
      "Buscan contencion prolongada.",
      "",
      "El sistema detecta actividad interna.",
      "No recibe confirmacion externa.",
      "Arkham sigue funcionando.",
      "El sistema prefiere no sincronizar.",
    ],
    mobileLines: [
      "ESTADO: DESVINCULADO",
      "",
      "Ala segura de Arkham.",
      "Contencion extrema.",
      "",
      "Actividad interna detectada.",
      "Sin confirmacion externa.",
      "",
      "Arkham sigue activo.",
      "Sincronizacion no recomendada.",
    ],
  },
  {
    number: "(311) 767-7305",
    label: "TRONCAL WAYNE GALA",
    action: "message",
    desktopLines: [
      "ESTADO: ARCHIVADO",
      "",
      "Linea troncal de cobertura civil.",
      "Eventos publicos, galas beneficas y actividad corporativa.",
      "",
      "Identidad asociada:",
      "  WAYNE, BRUCE",
      "  Perfil: filantropo / empresario",
      "",
      "Registros disponibles:",
      "  - Presencia social programada",
      "  - Donaciones estrategicas",
      "  - Accesos institucionales",
      "",
      "La identidad ha sido confirmada.",
      "No se esperan futuras apariciones.",
      "Los eventos continuan sin el anfitrion.",
      "La ciudad no solicita explicaciones.",
    ],
    mobileLines: [
      "ESTADO: ARCHIVADO",
      "",
      "Cobertura publica Wayne.",
      "Galas y actos civiles.",
      "",
      "Identidad confirmada.",
      "No se esperan apariciones.",
      "",
      "Los eventos continuan.",
      "El anfitrion no.",
    ],
  },
  {
    number: "(311) 767-3395",
    label: "HIBERNACULO BATMOVIL",
    action: "message",
    desktopLines: [
      "ESTADO: CONTACTO SUSPENDIDO",
      "",
      "Perfil civil.",
      "Activo irregular tolerado por criterio personal.",
      "",
      "Ultima interaccion registrada:",
      "  Comunicacion directa.",
      "  Canal abierto sin restricciones.",
      "",
      "Desde ese momento:",
      "  No se han emitido llamadas.",
      "  No se han aceptado respuestas.",
      "  Los intentos quedan sin registrar.",
      "",
      "El sistema interpreta silencio",
      "como instruccion valida.",
      "",
      "No se espera reanudacion.",
    ],
    mobileLines: [
      "ESTADO: CONTACTO SUSPENDIDO",
      "",
      "Selina Kyle.",
      "Activo irregular.",
      "",
      "Ultima comunicacion directa.",
      "Silencio sostenido.",
      "",
      "El sistema lo asume",
      "como orden.",
    ],
  },
  {
    number: "(311) 936-1493",
    label: "BELFRY (RETIRADO)",
    action: "message",
    desktopLines: [
      "ESTADO: INACTIVO",
      "",
      "Contacto institucional retirado.",
      "Ultimo cargo: Comisionado del GCPD.",
      "",
      "Situacion actual:",
      "  Jubilado.",
      "  Sin funciones operativas.",
      "  Fuera de cadena de mando.",
      "",
      "El canal permanece tecnicamente disponible.",
      "No se han emitido llamadas.",
      "",
      "La reactivacion no esta recomendada.",
      "El sistema prioriza estabilidad civil.",
      "Algunos aliados merecen descanso.",
    ],
    mobileLines: [
      "ESTADO: INACTIVO",
      "",
      "James W. Gordon",
      "Commissioner (retired)",
      "",
      "Canal disponible.",
      "No utilizado.",
      "",
      "Reactivar no recomendado.",
    ],
  },
  {
    number: "(311) 936-3923",
    label: "RELE ORBITAL WAYNE",
    action: "message",
    desktopLines: [
      "ESTADO: EN ESPERA",
      "",
      "Enlace fuera de jurisdiccion terrestre.",
      "Infraestructura autonoma de contingencia global.",
      "",
      "Diseñado para operar",
      "cuando los sistemas locales fallan.",
      "No responde a autoridad civil.",
      "No solicita confirmacion humana.",
      "",
      "Ultima ventana de enlace:",
      "  CERRADA",
      "",
      "El rele permanece activo.",
      "No se recomienda inicializacion.",
      "Algunas decisiones no deben tomarse",
      "desde la superficie.",
    ],
    mobileLines: [
      "ESTADO: EN ESPERA",
      "",
      "Rele orbital Wayne.",
      "Contingencia global.",
      "",
      "Ventana cerrada.",
      "Sistema activo.",
      "",
      "Inicializacion",
      "no recomendada.",
    ],
  },
];

function setScreenStatus(status, context = {}) {
  try {
    localStorage.setItem("screenStatus", status);
  } catch (e) {}
  try {
    sessionStorage.setItem("screenStatus", status);
  } catch (e) {}
  const terminal = document.querySelector(".terminal");
  if (terminal) {
    terminal.dataset.screenStatus = status;
  }
  persistTerminalState(status, context);
}

function snapshotTerminal() {
  const terminal = document.querySelector(".terminal");
  if (!terminal) return;
  const payload = {
    status: terminal.dataset?.screenStatus || null,
    html: terminal.innerHTML || "",
    updatedAt: Date.now(),
  };
  try {
    sessionStorage.setItem("terminalSnapshot", JSON.stringify(payload));
  } catch (e) {}
}

function restoreTerminalSnapshot(status) {
  let raw;
  try {
    raw = sessionStorage.getItem("terminalSnapshot");
  } catch (e) {
    return false;
  }
  if (!raw) return false;
  let payload;
  try {
    payload = JSON.parse(raw);
  } catch (e) {
    return false;
  }
  if (!payload?.html) return false;
  if (status && payload.status && status !== payload.status) return false;
  const terminal = document.querySelector(".terminal");
  if (!terminal) return false;
  terminal.innerHTML = payload.html;
  if (payload.status) {
    terminal.dataset.screenStatus = payload.status;
  }
  if (payload.status === "dialer") {
    document.body.classList.add("dialer-mode");
  } else {
    document.body.classList.remove("dialer-mode");
  }
  rehydrateSelectablesFromDom();
  ensureDialerKeyHandler();
  document.body.classList.add("resume-static");
  return true;
}

function rehydrateSelectablesFromDom() {
  const items = Array.from(
    document.querySelectorAll("[data-selectable='true']")
  );
  if (!items.length) {
    setSelectables([], {});
    return;
  }
  const selectedIndex = items.findIndex((el) =>
    el.classList.contains("is-selected")
  );
  const defaultIndex = selectedIndex >= 0 ? selectedIndex : 0;
  setSelectables(items, { defaultIndex });
  const selected = items[defaultIndex];
  if (selected) {
    activateSelection();
  }
}

function ensureDialerKeyHandler() {
  if (window.__dialerKeyHandler) return;
  const handler = (event) => {
    if (!document.body.classList.contains("dialer-mode")) return;
    if (event.__woprHandled) return;
    if (event.repeat) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      if (hasPendingSelection()) {
        activateSelection();
        return;
      }
      ensureSelectionState();
      const selected = getSelectedElement();
      if (triggerSelectedAction(selected)) return;
      if (selected) {
        const value = selected.dataset.value || "";
        const text = selected.textContent || "";
        if (value) {
          const mainMap = {
            "1": "help",
            "2": "cases",
            "3": "map",
            "4": "villains",
          };
          const terminal = document.querySelector(".terminal");
          if (terminal?.dataset?.screenStatus === "main" && mainMap[value]) {
            parse(mainMap[value]);
            return;
          }
          if (mainMap[value] && /HELP|CASES|MAP|VILLAINS/i.test(text)) {
            parse(mainMap[value]);
            return;
          }
        }
        handleDialerSelection(selected, isPortraitNarrow());
      }
      return;
    }
  };
  window.__dialerKeyHandler = handler;
  document.addEventListener("keydown", handler, { capture: true });
}

function ensureSelectableKeyHandler() {
  if (window.__selectableKeyHandler) return;
  const handler = (event) => {
    if (isInputActive()) return;
    if (event.__woprHandled) return;
    if (!hasPendingSelection()) {
      const hasSelectables = document.querySelector("[data-selectable='true']");
      if (!hasSelectables) return;
    }
    const hotkey = String(event.key || "").toUpperCase();
    if (hotkey && /^[A-Z]$/.test(hotkey)) {
      const target = document.querySelector(`[data-hotkey="${hotkey}"]`);
      if (target) {
        event.preventDefault();
        event.stopPropagation();
        event.__woprHandled = true;
        if (triggerSelectedAction(target)) return;
      }
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(1);
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      if (hasPendingSelection()) {
        activateSelection();
        return;
      }
      ensureSelectionState();
      const selected = getSelectedElement();
      if (triggerSelectedAction(selected)) return;
      const terminal = document.querySelector(".terminal");
      if (selected) {
        const value = selected.dataset.value || "";
        const text = selected.textContent || "";
        if (terminal?.dataset?.screenStatus === "main" && value) {
          const mainMap = {
            "1": "help",
            "2": "cases",
            "3": "map",
            "4": "villains",
          };
          if (mainMap[value]) {
            parse(mainMap[value]);
            return;
          }
        }
        if (value) {
          const mainMap = {
            "1": "help",
            "2": "cases",
            "3": "map",
            "4": "villains",
          };
          if (mainMap[value] && /HELP|CASES|MAP|VILLAINS/i.test(text)) {
            parse(mainMap[value]);
            return;
          }
        }
        if (terminal?.dataset?.screenStatus === "dialer") {
          handleDialerSelection(selected, isPortraitNarrow());
        }
      }
      return;
    }
  };
  window.__selectableKeyHandler = handler;
  document.addEventListener("keydown", handler, { capture: true });
}

ensureSelectableKeyHandler();

if (!window.__woprDebugKeyListener) {
  window.__woprDebugKeyListener = (event) => {
    if (!window.__woprDebugKeys) return;
    console.log("[WOPR DEBUG keydown]", {
      key: event.key,
      code: event.code,
      activeInput: isInputActive(),
      hasPendingSelection: hasPendingSelection(),
      selectedValue: getSelectedElement()?.dataset?.value || null,
      selectedAction: getSelectedElement()?.dataset?.action || null,
      selectedText: getSelectedElement()?.textContent || null,
      screen: document.querySelector(".terminal")?.dataset?.screenStatus || null,
      bodyClasses: document.body.className || "",
      selectableCount: document.querySelectorAll("[data-selectable='true']").length,
      target: event.target?.id || event.target?.className || event.target?.tagName,
    });
  };
  document.addEventListener("keydown", window.__woprDebugKeyListener, {
    capture: true,
  });
}

window.addEventListener("pagehide", snapshotTerminal);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    snapshotTerminal();
  }
});

export { restoreTerminalSnapshot };

// var woprsound = new Audio("/assets/sounds/wopr-humming.mp3");
// woprsound.loop = true;
// woprsound.addEventListener(
//   "stopwoprsound",
//   (event) => {
//     event.preventDefault();
//     woprsound.pause();
//     woprsound.remove();
//   },
//   false
// );

/** Login screen */
async function login() {
  console.log("Login");
  document.body.classList.remove("dialer-mode");
  //await pause(2);
  clear();
  setScreenStatus("login");

  console.log("Play wopr sound");
  //woprsound.play();
  const event = new CustomEvent("playwoprsound");
  window.dispatchEvent(event);
  await type(
    [
      " ",
      ...wrapLine("WAYNE INDUSTRIES AUXILIARY NODE // BUILD 79-A"),
      ...wrapLine("PROTOCOL: KNIGHTFALL-C (CONTINGENCIA POST-BATMAN)"),
      ...wrapLine("SUBSYSTEM: BROTHER-MK0  // PROTOTYPE BROTHER EYE"),
      ...wrapLine("CHANNEL: GCPD BACKDOOR RELAY 03"),
      ...wrapLine("SYSLOG: BATSIGNAL OFFLINE | ORACLE RELAY: STANDBY"),
      ...wrapLine("ENLACE CON BATMAN: PERDIDO  |  CONTROL GCPD: SOLICITADO"),
      " ",
      "NOTA DE ARCHIVO:",
      ...wrapLine("> SI HAS ENCONTRADO ESTE TERMINAL, BRUCE NO ESTA."),
      ...wrapLine("> TE TOCA A TI, AGENTE. INTRODUCE LA CLAVE DE AUTORIZACION."),
      " ",
    ],
    { wait: false, initialWait: false, finalWait: false, speak: false }
  );

  let logon = await prompt("CLAVE DE ACCESO: ", false, false, {
    hint: "INPUT REQUIRED",
  });

  const stringHasAll = (s, query) =>
    // convert the query to array of "words" & checks EVERY item is contained in the string
    query.split(" ").every((q) => new RegExp("\\b" + q + "\\b", "i").test(s));

  if (stringHasAll(logon, "help logon")) {
    await type(
      [
        " ",
        "BATMAN WOULD NEVER WRITE A HINT.",
        "CHECK COMMISSIONER GORDON'S DOSSIER FOR AUTH CUES.",
        " ",
      ]
    );
    await pause(3);
    clear();
    return login();
  }

  if (
    stringHasAll(logon, "help games") ||
    stringHasAll(logon, "help map")
  ) {
    await type([
      " ",
      "'MAP' ABRE LA MATRIZ CARTOGRAFICA QUE GESTIONA BROTHER-MK0.",
      "USALA PARA CONTROLAR DISTRITOS, REFUGIOS Y RESERVAS SECRETAS.",
      " ",
    ]);
    await pause(2);
    clear();
    return login();
  }

  if (
    stringHasAll(logon, "list games") ||
    stringHasAll(logon, "list map")
  ) {
    await type([
      " ",
      "CAPAS DISPONIBLES:",
      "- DISTRITOS (NARROWS, TRI-CORN, OLD GOTHAM)",
      "- PUNTOS DE INTERES (REFUGIOS, NODOS FERROVIARIOS, PUESTOS)",
      "- ZONAS PROTEGIDAS (CLAVE NECESARIA)",
      " ",
    ]);
    await pause(2);
    clear();
    return login();
  }

  const allowedKeys = ["joshua", "oracle", "brothereye", "wayne"];
  if (allowedKeys.includes(logon)) {
    await pause();
    await alert("ACCESS GRANTED - CONTINGENCY CHANNEL OPEN");
    clear();
    //return main();
    return mapConsole();
  } else {
    await type([
      " ",
      "FALLO DE AUTORIZACION. LAS MEDIDAS DE BATMAN SIGUEN BLOQUEADAS.",
      "--BACKDOOR RESET--",
    ]);
    await pause(2);
    clear();
    return login();
  }
}

/** Connecting screen */
const DIAL_ANIMATION_SEQUENCE = [
  [
    " ",
    "RUTEANDO... BANCO DE MODEMS WAYNETECH // SECTOR 13",
    "REGISTRO PROYECTO BROTHER // ALIMENTACION OMAC: INACTIVA",
    " ",
    " (311) 699-7305  // RELE DEL COMISARIO",
    "==========================================",
    " ",
  ],
  [
    " ",
    "(311) 767-8739  // NODO CLOCKTOWER (LEGADO DE ORACLE)",
    "(311) 936-2364  // SUBSUELO WAYNE FOUNDATION",
    "ESTADO: HACE FALTA HANDSHAKE DE HARDWARE RETRO",
    "==========================================",
    "FSK >> CAPAS DE CIFRADO 'OCTOBER SURPRISE'",
    "DIAG SISTEMA: SENSORES OMAC AL 22%",
    "CPU AUTH RV-345-AX8         PUERTOS: LISTENING",
    " ",
  ],
  [
    " ",
    "ANCLA FIJADA: BATCAVE SUB-NIVEL SIETE",
    "(311) 767-1083  // ENTRADA DE EMERGENCIA ARKHAM",
    "RED ELECTRICA 33% | REFRIGERACION ESTABLE",
    " ",
  ],
  [
    " ",
    "TABLA DE RELES WAYNETECH:",
    "FL342  TK01  BM93  RG01  PY90  GJ62  FP03  ZW00  JM89",
    "NOTA: \"BROTHER-MK0 NUNCA DEBE QUEDARSE SOLO.\"",
    "DIAG SISTEMA: TODOS LOS PUERTOS ACTIVOS, ESPERANDO USUARIO",
    " ",
  ],
];

async function playDialAnimation() {
  for (const section of DIAL_ANIMATION_SEQUENCE) {
    clear();
    await type(section, {
      wait: false,
      initialWait: false,
      finalWait: false,
      speak: false,
    });
  }
}

async function connecting() {
  console.log("Connecting");
  await playDialAnimation();
}

// Dialer screen
async function dialer() {
  console.log("Dialer");
  clear();
  setScreenStatus("dialer");
  document.body.classList.add("dialer-mode");
  const existingInput = document.querySelector("#input");
  if (existingInput) existingInput.remove();

  const dialerItems = [
    {
      number: "(311) 399-2364",
      label: "GARAJE DEL BATSIGNAL",
    },
    {
      number: "(311) 399-3582",
      label: "FAILSAFE ZUR-EN-ARRH",
    },
    {
      number: "(311) 437-8739",
      label: "NODO AUX BROTHER-MK0",
    },
    {
      number: "(311) 437-1083",
      label: "CLOCKTOWER BACKUP",
    },
    {
      number: "(311) 437-2977",
      label: "ALA SEGURA DE ARKHAM",
    },
    {
      number: "(311) 767-7305",
      label: "TRONCAL WAYNE GALA",
    },
    {
      number: "(311) 767-3395",
      label: "HIBERNACULO BATMOVIL",
    },
    {
      number: "(311) 936-1493",
      label: "BELFRY (RETIRADO)",
    },
    {
      number: "(311) 936-3923",
      label: "RELE ORBITAL WAYNE",
    },
  ];

  const isPortrait = isPortraitNarrow();
  setFastMode(false);
  const items = dialerLines.map((entry, index) => {
    if (isPortrait) {
      return {
        lines: `${entry.label}\n${entry.number}  // LINEA ${index + 1}`,
        value: String(index),
      };
    }
    return {
      lines: `${entry.number}   // ${entry.label}`,
      value: String(index),
    };
  });

  await renderSelectableLines(
    {
      lines: [
        " ",
        " ",
        " ",
        " ",
        " ",
        "        LINEAS WAYNETECH CON TONO VERIFICADO:",
        ...wrapLine("Selecciona la linea de salida con ▲/▼ y confirma con RETURN."),
        " ",
      ],
      items,
      footerLines: [" ", " "],
      defaultIndex: 0,
    },
    { wait: false, initialWait: false, finalWait: false, speak: false }
  );

  const keydownHandler = (event) => {
    if (!document.body.classList.contains("dialer-mode")) return;
    if (event.__woprHandled) return;
    if (event.repeat) return;
    if (event.key === "ArrowUp") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(-1);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      event.stopPropagation();
      event.__woprHandled = true;
      moveSelection(1);
      return;
    }
  };
  document.addEventListener("keydown", keydownHandler, { capture: true });
  const selected = await waitForSelection();
  document.removeEventListener("keydown", keydownHandler);
  console.log("dial...");
  return handleDialerSelection(selected, isPortrait);
}

async function displayLineMessage(line, isPortrait, index = 0) {
  setScreenStatus("line", { lineIndex: index });
  clear();
  await alert(`CONTACTING LINE ${line.number}`);
  const lines = isPortrait ? line.mobileLines : line.desktopLines;
  if (!lines?.length) {
    return dialer();
  }
  await pause(0.4);
  clear();
  await type(
    [
      " ",
      line.label,
      "",
      ...lines,
      "",
      "Pulse RETURN para volver al dialer.",
      " ",
    ],
    {
      stopBlinking: true,
      wait: false,
      initialWait: false,
      finalWait: false,
    }
  );
  document.body.classList.add("line-message-active");
  try {
    await waitForReturnKey({ allowDoubleTap: isPortrait });
  } finally {
    document.body.classList.remove("line-message-active");
  }
  return dialer();
}

function waitForReturnKey({ allowDoubleTap = false } = {}) {
  return new Promise((resolve) => {
    const options = { capture: true };
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener("keydown", keyHandler, options);
      if (allowDoubleTap) {
        document.removeEventListener(
          "line-return-double-tap",
          doubleTapHandler
        );
        document.removeEventListener("pointerdown", tapHandler, options);
      }
    };

    const keyHandler = (event) => {
      const key = event?.key || event?.code || "";
      if (key === "Enter" || key === "Return" || key === "NumpadEnter") {
        event.preventDefault();
        cleanup();
        resolve();
      }
    };

    const doubleTapHandler = () => {
      cleanup();
      resolve();
    };

    document.addEventListener("keydown", keyHandler, options);
    if (allowDoubleTap) {
      document.addEventListener(
        "line-return-double-tap",
        doubleTapHandler,
        options
      );
      const tapHandler = (event) => {
        if (event.pointerType !== "touch") return;
        event.preventDefault();
        cleanup();
        resolve();
      };
      document.addEventListener("pointerdown", tapHandler, options);
    }
  });
}

async function handleDialerSelection(selected, isPortrait = isPortraitNarrow()) {
  if (!selected) return;
  const index = Number(selected?.dataset?.value);
  const line = dialerLines[index] || dialerLines[2];

  // DEVELOPMENT & TESTING SHORT CUTS
  //return main();
  //return mapConsole();

  var dialupsound = new Audio("/assets/sounds/dtmf-wopr.wav");
  dialupsound.playbackRate = 2.0;
  dialupsound.muted = true;
  dialupsound.volume = 0;
  var modemupsound = new Audio("/assets/sounds/modem.wav");
  modemupsound.playbackRate = 3.0;
  modemupsound.muted = true;
  modemupsound.volume = 0;

  if (line.action === "activate") {
    const dialNumber = line.number;
    await alert(`CONTACTING LINE ${dialNumber}`);
    dialupsound.play();
    dialupsound.onended = function () {
      modemupsound.play();
      modemupsound.onended = async function () {
        await connecting();
        return login();
      };
    };
    return;
  }

  return displayLineMessage(line, isPortrait, index);
}

/** Gotham map access */
async function mapConsole() {
  console.log("Map console");
  document.body.classList.remove("dialer-mode");
  clear();
  setScreenStatus("map");
  const fastRender = { wait: false, initialWait: false, finalWait: false };

  console.log("Play wopr sound");
  const event = new CustomEvent("playwoprsound");
  window.dispatchEvent(event);

  await renderStatusHeader(fastRender);
  await type(
    [
      ...wrapLine("SALUDOS, DETECTIVE. BROTHER-MK0 CUBRE LA AUSENCIA DE BATMAN."),
      ...wrapLine("ULTIMA DIRECTIVA DEL MURCIELAGO: \"CONOCE CADA CALLE Y A CADA ENEMIGO.\""),
      " ",
      "MENU DE SERVICIO KNIGHTFALL",
    ],
    {
      speak: true,
      ...fastRender,
    }
  );

  const isPortrait = isPortraitNarrow();
  setFastMode(false);
  await renderSelectableLines({
    items: [
      {
        lines: isPortrait ? "1. HELP" : "1. HELP / RESUMEN DE PROTOCOLOS",
        action: "input",
        value: "1",
      },
      {
        lines: isPortrait ? "2. MAP" : "2. MAP (DISTRITOS Y POI)",
        action: "input",
        value: "2",
      },
      {
        lines: isPortrait ? "3. CASES" : "3. CASES (CASOS)",
        action: "input",
        value: "3",
      },
      {
        lines: isPortrait ? "4. VILLAINS" : "4. VILLAIN GALLERY (ROGUE'S GALLERY)",
        action: "input",
        value: "4",
      },
    ],
    chips: [
      {
        label: "MAPA",
        labelHtml: "<span class=\"hotkey-underline\">M</span>APA",
        action: "input",
        value: "2",
        hotkey: "M",
      },
      {
        label: "CASOS",
        labelHtml: "<span class=\"hotkey-underline\">C</span>ASOS",
        action: "input",
        value: "3",
        hotkey: "C",
      },
      {
        label: "VILLANOS",
        labelHtml: "<span class=\"hotkey-underline\">V</span>ILLANOS",
        action: "input",
        value: "4",
        hotkey: "V",
      },
      {
        label: "DIALER",
        labelHtml: "<span class=\"hotkey-underline\">D</span>IALER",
        action: "command",
        value: "dialer",
        hotkey: "D",
      },
      { label: "STATUS", action: "command", value: "status" },
    ],
    footerLines: [" "],
  });

  let choice = "";
  if (isPortraitNarrow()) {
    const selected = await waitForSelection();
    const action = selected?.dataset?.action || "";
    const value = selected?.dataset?.value || "";
    if (action === "command" && value) {
      await parse(value);
      return;
    }
    choice = value || "";
  } else {
    let resolved = false;
    const resolveChoice = (value) => {
      if (resolved) return;
      resolved = true;
      choice = value || "";
      document.removeEventListener("keydown", keydownHandler, { capture: true });
    };

    const keydownHandler = (event) => {
      if (event.__woprHandled) return;
      if (isInputActive()) return;
      if (event.repeat) return;
      const key = event.key;
      if (key === "ArrowUp") {
        event.preventDefault();
        event.stopPropagation();
        event.__woprHandled = true;
        moveSelection(-1);
        return;
      }
      if (key === "ArrowDown") {
        event.preventDefault();
        event.stopPropagation();
        event.__woprHandled = true;
        moveSelection(1);
        return;
      }
      if (/^[1-4]$/.test(key)) {
        event.preventDefault();
        event.stopPropagation();
        event.__woprHandled = true;
        resolveChoice(key);
      }
    };
    document.addEventListener("keydown", keydownHandler, { capture: true });

    while (!resolved) {
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  if (choice === "1") {
    await type(
      [
        "RESUMEN HELP:",
        "- ESCRIBE 'HELP' EN CUALQUIER MOMENTO PARA VER LOS COMANDOS.",
        "- 'MAP' ABRE LOS DISTRITOS/POI.",
        "- 'CASES' LISTA LOS CASOS.",
        "- 'CASE <ID>' PROFUNDIZA EN UN EXPEDIENTE.",
        " ",
      ],
      { stopBlinking: true }
    );
    return main();
  }
  if (choice === "2") {
    await showMap();
    return main();
  }
  if (choice === "3") {
    await casesCommand();
    return main();
  }
  if (choice === "4") {
    await villainsGallery();
    return main();
  }
  await type(
    [
      " ",
      "OPCION NO VALIDA. REGRESANDO AL TERMINAL.",
      " ",
    ],
    { stopBlinking: true }
  );
  return main();
}


/** Main input terminal, recursively calls itself */
async function main_with_info() {
  document.body.classList.remove("dialer-mode");
  setScreenStatus("main");

  console.log("Play wopr sound");
  //woprsound.play();
  const event = new CustomEvent("playwoprsound");
  window.dispatchEvent(event);
  await renderStatusHeader();
  await type(
    [
      " ",
      ...wrapLine("WAYNE INDUSTRIES AUX NODE // BROTHER-MK0"),
      ...wrapLine("STATUS: KNIGHTFALL CONTINGENCY ACTIVE"),
      ...wrapLine("BATMAN: UNRESPONSIVE | BATSIGNAL: DARK"),
      " ",
      ...wrapLine("ESTE TERMINAL RESPONDE AL GCPD. TRABAJA LIMPIO Y EN SILENCIO."),
      " ",
    ],
    { wait: false, initialWait: false, finalWait: false, speak: false }
  );

  const isPortrait = isPortraitNarrow();
  setFastMode(false);
  await renderSelectableLines({
    items: [
      {
        lines: isPortrait
          ? "1. HELP"
          : "1. 'HELP' => PROTOCOLOS Y LISTA DE COMANDOS.",
        action: "input",
        value: "help",
      },
      {
        lines: isPortrait
          ? "2. CASES"
          : "2. 'CASES' => EXPEDIENTES DE LA CONTINGENCIA.",
        action: "input",
        value: "cases",
      },
      {
        lines: isPortrait
          ? "3. MAP"
          : "3. 'MAP' => DISTRITOS/POI (CLAVES SI HACE FALTA).",
        action: "input",
        value: "map",
      },
      {
        lines: isPortrait
          ? "4. VILLAINS"
          : "4. 'VILLAINS' => GALERIA DE LA ROGUE'S GALLERY.",
        action: "input",
        value: "villains",
      },
    ],
    footerLines: [
      isPortrait
        ? "5. ESCRIBE CUALQUIER ORDEN PARA OPERAR."
        : "5. OTEA, PREGUNTA, EMITE ORDENES Y MANTIEN GOTHAM ESTABLE.",
      " ",
    ],
  });

  // Intentionally omit active case summary for a cleaner home screen.

  if (isPortraitNarrow()) {
    const selected = await waitForSelection();
    const command = selected?.dataset?.value || "";
    if (command) {
      try {
        await parse(command);
      } catch (e) {
        if (e.message) await type(e.message);
      }
    }
    return main();
  }
  let command = await input();
  try {
    await parse(command);
  } catch (e) {
    if (e.message) await type(e.message);
  }
  main();
}

/** Main input terminal, recursively calls itself */
async function main() {
  document.body.classList.remove("dialer-mode");
  setScreenStatus("main");
  console.log("Play wopr sound");
  //woprsound.play();
  const event = new CustomEvent("playwoprsound");
  window.dispatchEvent(event);

  // type(" ", { wait: 0, initialWait: 0, finalWait: 0, stopBlinking: true });
  if (isPortraitNarrow()) {
    return main_with_info();
  }
  let command = await input();
  try {
    await parse(command);
  } catch (e) {
    if (e.message) await type(e.message);
  }
  if (window.EXIT_TO_DIALER) {
    window.EXIT_TO_DIALER = false;
    return dialer();
  }
  main();
}

async function restoreTerminalState(saved = {}) {
  const status = saved?.status;
  if (!status) return false;
  switch (status) {
    case "login":
      await login();
      return true;
    case "dialer":
      await dialer();
      return true;
    case "map":
      await mapConsole();
      return true;
    case "main":
      await main_with_info();
      return true;
    case "line": {
      const index = Number(saved.context?.lineIndex);
      const resolvedIndex =
        Number.isFinite(index) && index >= 0 && index < dialerLines.length
          ? index
          : 2;
      const line = dialerLines[resolvedIndex] || dialerLines[2];
      const isPortrait = isPortraitNarrow();
      await displayLineMessage(line, isPortrait, resolvedIndex);
      return true;
    }
    default:
      return false;
  }
}

function addClasses(el, ...cls) {
  let list = [...cls].filter(Boolean);
  el.classList.add(...list);
}

function getScreen(...cls) {
  let div = document.createElement("div");
  addClasses(div, "fullscreen", ...cls);
  document.querySelector("#crt").appendChild(div);
  return div;
}

function toggleFullscreen(isFullscreen) {
  document.body.classList.toggle("fullscreen", isFullscreen);
}

/** Attempts to load template HTML from the given path and includes them in the <head>. */
async function loadTemplates(path) {
  let txt = await fetch(path).then((res) => res.text());
  let html = new DOMParser().parseFromString(txt, "text/html");
  let templates = html.querySelectorAll("template");

  templates.forEach((template) => {
    document.head.appendChild(template);
  });
}

/** Clones the template and adds it to the container. */
async function addTemplate(id, container, options = {}) {
  let template = document.querySelector(`template#${id}`);
  if (!template) {
    throw Error("Template not found");
  }
  // Clone is the document fragment of the template
  let clone = document.importNode(template.content, true);

  if (template.dataset.type) {
    await type(clone.textContent, options, container);
  } else {
    container.appendChild(clone);
  }

  // We cannot return clone here
  // https://stackoverflow.com/questions/27945721/how-to-clone-and-modify-from-html5-template-tag
  return container.childNodes;
}

/** Creates a new screen and loads the given template into it. */
async function showTemplateScreen(id) {
  let screen = getScreen(id);
  await addTemplate(id, screen);
  return screen;
}

function el(type, container = document.querySelector(".terminal"), cls = "") {
  let el = document.createElement(type);
  addClasses(el, cls);

  container.appendChild(el);
  return el;
}

function div(...args) {
  return el("div", ...args);
}

export {
  login,
  main,
  main_with_info,
  mapConsole,
  dialer,
  handleDialerSelection,
  restoreTerminalState,
  getTerminalState,
  // woprsound,
  getScreen,
  toggleFullscreen,
  div,
  el,
  loadTemplates,
  addTemplate,
  showTemplateScreen,
};
