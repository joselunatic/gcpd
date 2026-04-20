import { prompt, type, parse } from "/utils/io.js";
import {
  getScope,
} from "/utils/access.js";
import {
  ensureEntityAccess as ensureRuntimeEntityAccess,
  ensureAttributeAccess as ensureRuntimeAttributeAccess,
} from "/utils/accessFlow.js";
import { listGlobalCommands } from "/utils/globalCommands.js";
import { resolveEntity, normalizeKey } from "/utils/entities.js";

const EXIT_COMMANDS = ["exit", "bye", "hangup"];
const HELP_COMMANDS = ["help", "ayuda", "?"];
const FIND_COMMANDS = ["find", "scan", "buscar"];
const INFO_COMMANDS = ["info"];
const SHOW_COMMANDS = ["show"];

const FIELD_ALIASES = {
  cases: {
    id: "id",
    titulo: "title",
    title: "title",
    estado: "status",
    status: "status",
    resumen: "summary",
    summary: "summary",
    tags: "tags",
    etiquetas: "tags",
  },
  map: {
    id: "id",
    nombre: "name",
    name: "name",
    distrito: "district",
    district: "district",
    estado: "status",
    status: "status",
    resumen: "summary",
    summary: "summary",
    detalles: "details",
    details: "details",
    contactos: "contacts",
    contacts: "contacts",
    notas: "notes",
    notes: "notes",
    accesscode: "accessCode",
    codigo: "accessCode",
  },
  villains: {
    id: "id",
    alias: "alias",
    nombre: "realName",
    realname: "realName",
    nombre_real: "realName",
    especie: "species",
    species: "species",
    edad: "age",
    age: "age",
    altura: "height",
    height: "height",
    peso: "weight",
    weight: "weight",
    amenaza: "threatLevel",
    threat: "threatLevel",
    threatlevel: "threatLevel",
    estado: "status",
    status: "status",
    resumen: "summary",
    summary: "summary",
    ultimavez: "lastSeen",
    lastseen: "lastSeen",
    patrones: "patterns",
    patterns: "patterns",
    asociados: "knownAssociates",
    knownassociates: "knownAssociates",
    notas: "notes",
    notes: "notes",
  },
};

function normalizeFieldKey(scope, rawField = "") {
  const normalized = String(rawField)
    .toLowerCase()
    .trim()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
  const aliases = FIELD_ALIASES[scope] || {};
  return aliases[normalized] || aliases[normalized.replace(/_/g, "")] || "";
}

function formatValue(value) {
  if (Array.isArray(value)) {
    return value.length ? value.map((entry) => String(entry)) : ["SIN REGISTROS."];
  }
  if (value == null || value === "") return ["SIN REGISTROS."];
  if (typeof value === "object") {
    return [JSON.stringify(value)];
  }
  return [String(value)];
}

async function ensureEntityAccess(entity) {
  return ensureRuntimeEntityAccess(entity, {
    passwordPrompt: "TOKEN: ",
    passwordMask: true,
    passwordFailureLines: ["ACCESO DENEGADO."],
    prerequisiteIntroLines: ["ACCESO RESTRINGIDO."],
    flagsIntroLines: ["ACCESO RESTRINGIDO."],
    puzzleLines: ["ACCESO RESTRINGIDO."],
  });
}

async function ensureAttributeAccess(entity, fieldKey) {
  return ensureRuntimeAttributeAccess(entity, fieldKey, {
    tokenPrompt: "TOKEN: ",
    invalidTokenLines: ["TOKEN INVALIDO."],
    hiddenFailureLines: ["NO HAY INFORMACION DISPONIBLE."],
    attributePrerequisiteIntroLines: ["ATRIBUTO BLOQUEADO."],
    attributeFlagsIntroLines: ["ATRIBUTO BLOQUEADO."],
    blockedLines: ["ATRIBUTO BLOQUEADO."],
  });
}

function parseScopeToken(token = "") {
  const normalized = token.toLowerCase();
  if (normalized === "case" || normalized === "cases") return "cases";
  if (normalized === "poi" || normalized === "pois" || normalized === "map") return "map";
  if (normalized === "villain" || normalized === "villains") return "villains";
  return "";
}

async function handleInfoCommand(tokens) {
  if (tokens.length < 3) {
    await type("USO: INFO <ENTIDAD> <ATRIBUTO>");
    return;
  }

  let scope = parseScopeToken(tokens[1]);
  let entityToken = tokens[1];
  let fieldToken = tokens.slice(2).join(" ");

  if (scope) {
    entityToken = tokens[2] || "";
    fieldToken = tokens.slice(3).join(" ");
  }

  if (!entityToken || !fieldToken) {
    await type("USO: INFO <ENTIDAD> <ATRIBUTO>");
    return;
  }

  const resolved = await resolveEntity(entityToken, {
    scope: scope || undefined,
    force: true,
  });
  if (!resolved?.item) {
    await type("ENTIDAD NO ENCONTRADA.");
    return;
  }

  const entity = resolved.item;
  const entityScope = resolved.scope || scope || getScope(entity);
  const fieldKey = normalizeFieldKey(entityScope, fieldToken);
  if (!fieldKey || !(fieldKey in entity)) {
    await type("ATRIBUTO NO DISPONIBLE.");
    return;
  }

  const entityOk = await ensureEntityAccess(entity);
  if (!entityOk) return;
  const attributeOk = await ensureAttributeAccess(entity, fieldKey);
  if (!attributeOk) return;

  const value = entity[fieldKey];
  await type([
    `${(entity.alias || entity.name || entity.title || entity.id || "").toUpperCase()} // ${fieldKey.toUpperCase()}`,
    "",
    ...formatValue(value),
  ]);
}

async function handleFindCommand(tokens) {
  if (tokens.length < 2) {
    await type("USO: SCAN <ENTIDAD>");
    return;
  }
  const query = tokens.slice(1).join(" ");
  const resolved = await resolveEntity(query, { force: true });
  if (!resolved?.item) {
    await type("SIN COINCIDENCIAS.");
    return;
  }
  const item = resolved.item;
  const label = item.title || item.name || item.alias || item.id;
  await type([
    "COINCIDENCIA:",
    `${label} [${resolved.scope}]`,
    "",
    "USA: INFO <ENTIDAD> <ATRIBUTO>",
  ]);
}

async function handleCustomCommand(input) {
  const commands = await listGlobalCommands();
  if (!commands.length) return false;
  const normalizedInput = normalizeKey(input);
  const match = commands.find((entry) =>
    (entry.triggers || []).some(
      (trigger) => normalizeKey(trigger) === normalizedInput
    )
  );
  if (!match) return false;
  const response = Array.isArray(match.response)
    ? match.response
    : [String(match.response || "")];
  await type(response);
  return true;
}

async function handleHelp() {
  await type([
    "COMANDOS DISPONIBLES:",
    "MAP - Matriz cartografica",
    "CASES - Expedientes",
    "CASE <ID> - Detalle de expediente",
    "VILLAINS - Rogue gallery",
    "STATUS / FLAGS / SUMMARY / LAST / MATRIX / CLEAR",
    "SHOW - Batescaner 3D",
    "BALISTICA - Comparador balistico grafico",
    "AUDIO - Audioregistros",
    "DIAL - Linea telefonica externa",
    "TRACER #TELEFONO - Trazado remoto con operador DM",
    "HELP - Lista comandos disponibles",
    "EXIT - Cierra la sesion",
    "LOGOUT - Cierra sesion principal",
  ]);
}

async function handleOsCommand(rawInput) {
  const input = String(rawInput || "").trim();
  if (!input) return { exit: false };
  const tokens = input.split(/\s+/);
  const command = tokens[0].toLowerCase();

  if (EXIT_COMMANDS.includes(command)) {
    return { exit: true };
  }
  if (HELP_COMMANDS.includes(command)) {
    await handleHelp();
    return { exit: false };
  }
  if (INFO_COMMANDS.includes(command)) {
    await handleInfoCommand(tokens);
    return { exit: false };
  }
  if (SHOW_COMMANDS.includes(command)) {
    const target = String(tokens[1] || "").toLowerCase();
    const module = await import("/commands/show.js");
    if (target === "joker" && module?.showJoker) {
      await module.showJoker({ returnToMain: false, label: "JOKER", stlPath: "/joker.stl" });
      return { exit: false };
    }
    if (target === "bala" && module?.showBala) {
      await module.showBala({ returnToMain: false });
      return { exit: false };
    }
    if (module?.default) {
      await module.default(target);
      return { exit: false };
    }
  }
  if (command === "balistica" || command === "ballistics") {
    const module = await import("/commands/ballistica.js");
    if (module?.startBallistica) {
      await module.startBallistica();
      return { exit: false };
    }
  }
  if (command === "audio") {
    const target = String(tokens[1] || "").toLowerCase();
    const module = await import("/commands/audio.js");
    if (module?.startAudio) {
      const id = target || "dkb";
      await module.startAudio({ id });
      return { exit: false };
    }
  }
  if (command === "dial") {
    const number = input.slice(command.length).trim();
    const module = await import("/commands/dial.js");
    if (module?.startDial) {
      await module.startDial({ number });
      return { exit: false };
    }
  }
  if (command === "tracer") {
    const number = input.slice(command.length).trim();
    const module = await import("/commands/tracer.js");
    if (module?.startTracer) {
      await module.startTracer({ number });
      return { exit: false };
    }
  }

  if (FIND_COMMANDS.includes(command)) {
    await handleFindCommand(tokens);
    return { exit: false };
  }

  const customMatched = await handleCustomCommand(input);
  if (customMatched) return { exit: false };

  await parse(input);
  return { exit: false };
}

async function remoteOsShell({ banner = [] } = {}) {
  if (banner.length) {
    await type(banner, { wait: false, initialWait: false, finalWait: false });
  }

  let exitRequested = false;
  while (!exitRequested) {
    const command = await prompt("REMOTE> ");
    const result = await handleOsCommand(command);
    exitRequested = Boolean(result?.exit);
  }
  await type(["LINEA CERRADA.", ""]);
}

export { remoteOsShell };
