import { type, print } from "/utils/io.js";
import { getCaseById, getCasesSource } from "/utils/cases.js";
import {
  loadCampaignState,
  markSeen,
  refreshCampaignState,
} from "/utils/campaignState.js";
import { evaluateAccess } from "/utils/access.js";
import { renderStatusHeader } from "/utils/status.js";

const formatHeader = (module) => {
  const status = (module.status || "unknown").toUpperCase();
  const lines = [
    " ",
    `CASE FILE: ${module.title || module.id}`,
    `ID: ${module.id}`,
    `STATUS: ${status}`,
  ];
  if (module.summary) {
    lines.push(`SUMMARY: ${module.summary}`);
  }
  if (module.tags?.length) {
    lines.push(`TAGS: ${module.tags.join(", ")}`);
  }
  return lines;
};

const formatConditions = (config = {}) => {
  const lines = [
    " ",
    "CONTROL DE ACCESO:",
    `> Visibilidad: ${(config.visibility || "listed").toUpperCase()}`,
    `> Modo: ${(config.unlockMode || "none").toUpperCase()}`,
  ];
  if (config.unlockMode === "password" && config.password) {
    lines.push("> Requiere contrasena DM.");
  }
  if (config.prerequisites?.length) {
    lines.push("> Prerrequisitos:", ...config.prerequisites.map((id) => `   - ${id}`));
  }
  if (config.requiredFlags?.length) {
    lines.push("> Flags requeridos:", ...config.requiredFlags.map((flag) => `   - ${flag}`));
  }
  return lines;
};

const formatPuzzle = (puzzle) => {
  if (!puzzle) return [];
  const lines = [
    " ",
    `PUZZLE INTERFACE: ${puzzle.type || "custom"}`.toUpperCase(),
  ];
  if (puzzle.config && Object.keys(puzzle.config).length) {
    lines.push(
      `CONFIG: ${JSON.stringify(puzzle.config)}`
    );
  }
  return lines;
};

const lockedNotice = [
  " ",
  "CASE LOCKED.",
  "DM MUST AUTHORIZE ACCESS. CHECK UNLOCK CONDITIONS.",
];

export default async (args = "") => {
  await renderStatusHeader();
  await refreshCampaignState();
  if (!args) {
    await print(
      [
        " ",
        "USO: CASE <ID>",
        "EJEMPLO: CASE case_lockdown_protocol",
        " ",
    "CONSEJO: LISTA LOS CASOS CON 'CASES'.",
      ],
      { semantic: "system", stopBlinking: true }
    );
    return;
  }

  const module = await getCaseById(args.trim().toLowerCase());
  if (getCasesSource() !== "api") {
    await print(["FALLBACK DATA IN USE."], {
      semantic: "system",
      stopBlinking: true,
    });
  }
  if (!module) {
    await print(
      [" ", `NO SE ENCONTRO EL CASO '${args}'.`, "VERIFICA EL MANIFIESTO."],
      { semantic: "system", stopBlinking: true }
    );
    return;
  }

  const state = loadCampaignState();
  const evaluation = evaluateAccess(module, state);
  const status = (module.status || "").toLowerCase();
  const lines = [...formatHeader(module), ...formatConditions(evaluation.config)];

  if (!evaluation.visible || (!evaluation.unlocked && evaluation.config.unlockMode !== "none")) {
    lines.push(...lockedNotice);
    await type([...lines, " "], { stopBlinking: true });
    return;
  }

  await type([...lines, " "], { stopBlinking: true });

  const brief = module.commands?.brief || [];
  if (brief.length) {
    await print(["BRIEF:"], { semantic: "log", stopBlinking: true });
    await print(brief.map((entry) => `> ${entry}`), {
      semantic: "intel",
      stopBlinking: true,
    });
  }

  const intel = module.commands?.intel || [];
  if (intel.length) {
    await print(["INTEL:"], { semantic: "log", stopBlinking: true });
    await print(intel.map((entry) => `> ${entry}`), {
      semantic: "intel",
      stopBlinking: true,
    });
  }

  const puzzleLines = formatPuzzle(module.commands?.puzzle);
  if (puzzleLines.length) {
    await print(puzzleLines, { semantic: "log", stopBlinking: true });
  }

  if (status === "resolved") {
    await print(["STATUS NOTE: ARCHIVED SCENARIO."], {
      semantic: "system",
      stopBlinking: true,
    });
  }

  await type([" "], { stopBlinking: true });
  markSeen("cases", module.id, Number(module.updatedAt || Date.now()));
};
