import { prompt, type, print, renderSelectableLines, parse } from "/utils/io.js";
import { listCases, getCasesSource } from "/utils/cases.js";
import {
  loadCampaignState,
  markSeen,
  refreshCampaignState,
} from "/utils/campaignState.js";
import clear from "/commands/clear.js";
import {
  evaluateAccess,
  unlockEntity,
  getNodeType,
  getNodeLabel,
} from "/utils/access.js";
import { renderStatusHeader } from "/utils/status.js";
import { getDeltaMarker } from "/utils/delta.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";
import { waitForSelection } from "/utils/selection.js";
import { paginateSelectableItems } from "/utils/pagination.js";

const output = [
  " ",
  "INTERFAZ DE CASOS KNIGHTFALL",
  "============================",
  "MARCAS: * NUEVO  ~ ACTUALIZADO  ! CRITICO",
  " ",
];
const fastRender = { wait: false, initialWait: false, finalWait: false };

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

const renderCaseDetails = async (item, evaluation) => {
  const detailLine = (text) => wrapLine(text, 80);
  const lines = [
    " ",
    ...detailLine(`CASE FILE: ${item.title || item.id}`),
    ...detailLine(`ID: ${item.id}`),
    ...(item.summary ? detailLine(`RESUMEN: ${item.summary}`) : []),
    ...(item.tags?.length ? detailLine(`TAGS: ${item.tags.join(", ")}`) : []),
  ].filter(Boolean);

  lines.push(" ");
  await type(lines, { stopBlinking: true });

  if (item.commands?.brief?.length) {
    await print(["BRIEF:"], { semantic: "log", stopBlinking: true });
    const briefLines = [];
    item.commands.brief.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        briefLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    await print(briefLines, { semantic: "intel", stopBlinking: true });
  }
  if (item.commands?.intel?.length) {
    await print(["INTEL:"], { semantic: "log", stopBlinking: true });
    const intelLines = [];
    item.commands.intel.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        intelLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    await print(intelLines, { semantic: "intel", stopBlinking: true });
  }
  if (item.commands?.puzzle?.type && item.commands.puzzle.type !== "none") {
    await print(
      [`PUZZLE: ${(item.commands.puzzle.type || "").toUpperCase()}`],
      { semantic: "log", stopBlinking: true }
    );
    if (item.commands.puzzle.config) {
      await print(
        [`CONFIG: ${JSON.stringify(item.commands.puzzle.config)}`],
        { semantic: "log", stopBlinking: true }
      );
    }
  }
  await type([" "], { stopBlinking: true });
  markSeen("cases", item.id, Number(item.updatedAt || Date.now()));
};

const hasChildren = (cases, id) =>
  cases.some((entry) => (entry.commands?.parentId || "") === id);

const statusLabel = (evaluation) => {
  if (!evaluation.visible) return "OCULTO";
  return evaluation.unlocked ? "ONLINE" : "LOCKED";
};

const formatNodeLine = (item, evaluation, index, campaignState) => {
  const marker = getDeltaMarker(item, "cases", campaignState);
  const label = getNodeLabel(item);
  if (isPortraitNarrow()) {
    const lines = [
      `${index + 1}. ${label}`,
      `STATUS: ${statusLabel(evaluation)}${marker ? ` ${marker}` : ""}`,
    ];
    if (item.summary) {
      lines.push(`${item.summary}`);
    }
    return [lines.join("\n")];
  }
  const summary = item.summary ? ` - ${item.summary}` : "";
  const base = `${index + 1}. [${statusLabel(evaluation)}] ${marker ? marker + " " : ""}${label}${summary}`;
  return wrapLine(base, 80);
};

async function attemptUnlock(item, evaluation) {
  const { config, prerequisitesMet, flagsMet } = evaluation;
  if (evaluation.unlocked) return true;

  if (config.unlockMode === "password") {
    const code = await prompt("CLAVE DE CASO: ", false, false, {
      hint: "INPUT REQUIRED",
    });
    if (
      code &&
      config.password &&
      code.trim().toLowerCase() === config.password.trim().toLowerCase()
    ) {
      unlockEntity(item);
      await type(["ACCESO A CASO AUTORIZADO.", " "], { stopBlinking: true });
      return true;
    }
    await type(["CLAVE INCORRECTA.", " "], { stopBlinking: true });
    return false;
  }

  if (config.unlockMode === "chain") {
    if (!prerequisitesMet) {
      await type(
        [
          " ",
          "CADENA INCOMPLETA.",
          ...(config.prerequisites || []).map((id) => `> Necesario: ${id}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(item);
    await type(["SECUENCIA COMPUESTA. CASO ABIERTO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "conditional") {
    if (!flagsMet) {
      await type(
        [
          " ",
          "FALTAN BANDERAS DE OPERACION:",
          ...(config.requiredFlags || []).map((flag) => `> ${flag}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(item);
    await type(["FLAGS ACTIVADAS. CASO ABIERTO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "puzzle") {
    await type(
      [
        " ",
        "ACTIVA EL PUZZLE DESDE EL PANEL DM.",
        "Modo puzzle no disponible aun en la TUI.",
        " ",
      ],
      { stopBlinking: true }
    );
    return false;
  }

  unlockEntity(item);
  return true;
}

async function browseCases(cases) {
  let campaignState = loadCampaignState();
  const stack = [{ parentId: "", crumbs: ["CASES"], pageIndex: 0 }];

  while (stack.length) {
    campaignState = loadCampaignState();
    const { parentId, crumbs } = stack[stack.length - 1];
    const nodes = cases
      .filter((item) => (item.commands?.parentId || "") === parentId)
      .map((item) => ({
        item,
        evaluation: evaluateAccess(item, campaignState),
      }))
      .filter(({ evaluation }) => evaluation.visible || evaluation.listed);

    if (!nodes.length) {
      if (stack.length > 1) {
        await type([" ", "NO HAY SUBCASOS EN ESTA RUTA.", " "], {
          stopBlinking: true,
        });
        stack.pop();
        continue;
      }
      await type([" ", "NO HAY CASOS ACTIVOS.", " "], { stopBlinking: true });
      return;
    }

    const breadcrumb = crumbs.join(" / ");
    const items = nodes.map(({ item, evaluation }, index) => ({
      lines: formatNodeLine(item, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
    }));

    const headerLines = [" ", `/${breadcrumb}`];
    const baseFooterLines = [" ", "Selecciona caso.", " "];
    const baseChips = [
      { label: "MAPA", action: "command", value: "map" },
      { label: "CASOS", action: "command", value: "cases" },
      { label: "VILLANOS", action: "command", value: "villains" },
      { label: "DIALER", action: "command", value: "dialer" },
    ];
    const { pages, pageCount } = paginateSelectableItems({
      lines: headerLines,
      items,
      footerLines: baseFooterLines,
      chips: baseChips,
    });
    const pageIndex = Math.max(
      0,
      Math.min(stack[stack.length - 1].pageIndex || 0, pageCount - 1)
    );
    stack[stack.length - 1].pageIndex = pageIndex;
    const pageItems = pages[pageIndex] || [];
    const footerLines =
      pageCount > 1
        ? [
            " ",
            "Selecciona caso.",
            `PAGINA ${pageIndex + 1}/${pageCount} (N/P)`,
            " ",
          ]
        : baseFooterLines;
    const chips =
      pageCount > 1 && isPortraitNarrow()
        ? [
            ...baseChips,
            { label: "PREV", action: "select", value: "P" },
            { label: "NEXT", action: "select", value: "N" },
          ]
        : baseChips;

    clear();
    await renderSelectableLines({
      lines: headerLines,
      items: pageItems,
      footerLines,
      chips,
      context: { backValue: "B", backAction: "input" },
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
      choice = await prompt("SELECCION: ");
    }
    if (!choice) continue;
    const normalized = choice.trim().toUpperCase();
    if (normalized === "X") {
      await type([" ", "CIERRE DEL PANEL DE CASOS.", " "], {
        stopBlinking: true,
      });
      clear();
      return;
    }
    if (normalized === "B") {
      if (stack.length > 1) {
        stack.pop();
      } else {
        await type([" ", "YA ESTAS EN LA RAIZ.", " "], {
          stopBlinking: true,
        });
      }
      continue;
    }
    if (normalized === "R") {
      stack.length = 1;
      continue;
    }
    if (normalized === "N" && pageCount > 1) {
      stack[stack.length - 1].pageIndex = (pageIndex + 1) % pageCount;
      continue;
    }
    if (normalized === "P" && pageCount > 1) {
      stack[stack.length - 1].pageIndex = (pageIndex - 1 + pageCount) % pageCount;
      continue;
    }

    const index = Number(choice) - 1;
    if (Number.isNaN(index) || index < 0 || index >= nodes.length) {
      await type([" ", "SELECCION NO VALIDA.", " "], { stopBlinking: true });
      continue;
    }

    const { item, evaluation } = nodes[index];
    if (!evaluation.unlocked) {
      const unlocked = await attemptUnlock(item, evaluation);
      if (!unlocked) continue;
      campaignState = loadCampaignState();
    }

    clear();
    await renderStatusHeader(fastRender);
    await renderCaseDetails(item, evaluation);

    const nodeType = getNodeType(item);
    if (
      (nodeType === "container" || nodeType === "mixed") &&
      hasChildren(cases, item.id)
    ) {
      let answer = "";
      if (isPortraitNarrow()) {
        await renderSelectableLines({
          lines: ["?Descender a subcasos?"],
          chips: [
            { label: "SI", action: "select", value: "Y" },
            { label: "NO", action: "select", value: "N" },
          ],
        });
        const selected = await waitForSelection();
        answer = selected?.dataset?.value || "";
      } else {
        answer = await prompt("?Descender a subcasos? (Y/N): ");
      }
      if (answer && answer.trim().toLowerCase().startsWith("y")) {
        stack.push({
          parentId: item.id,
          crumbs: [...crumbs, getNodeLabel(item)],
          pageIndex: 0,
        });
        continue;
      }
    }
    clear();
  }
}

export default async () => {
  await renderStatusHeader(fastRender);
  await refreshCampaignState();
  await type(output, { stopBlinking: true, ...fastRender });
  const cases = await listCases();
  if (getCasesSource() !== "api") {
    await print(["FALLBACK DATA IN USE."], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
  }
  if (!cases.length) {
    await print(["SIN CASOS DESPLEGADOS.", " "], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
    return;
  }
  await browseCases(cases);
};
