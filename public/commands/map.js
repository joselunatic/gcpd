import { prompt, type, print, renderSelectableLines, parse } from "/utils/io.js";
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

const API_URL = "/api/pois-data";
const FALLBACK_URL = "/data/map/pois.json";
let cache;
let dataSource = "api";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

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

const fetchPois = async () => {
  if (!cache) {
    cache = fetchJson(API_URL)
      .then((data) => {
        if (Array.isArray(data.pois) && data.pois.length) {
          dataSource = "api";
          return data;
        }
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL).catch(() => ({ pois: [] }));
      })
      .catch((error) => {
        console.error("Map data error", error);
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL).catch(() => ({ pois: [] }));
      });
  }
  return cache;
};

const output = [
  " ",
  "MATRIZ CARTOGRAFICA DE GOTHAM",
  "=============================",
  "MARCAS: * NUEVO  ~ ACTUALIZADO  ! CRITICO",
  " ",
];
const fastRender = { wait: false, initialWait: false, finalWait: false };

const statusLabel = (evaluation) => {
  if (!evaluation.visible) return "OCULTO";
  return evaluation.unlocked ? "ONLINE" : "LOCKED";
};

const formatNodeLine = (node, evaluation, index, campaignState) => {
  const marker = getDeltaMarker(node, "map", campaignState);
  const label = getNodeLabel(node);
  if (isPortraitNarrow()) {
    const lines = [
      `${index + 1}. ${label}`,
      `ACCESS: ${statusLabel(evaluation)}${marker ? ` ${marker}` : ""}`,
    ];
    if (node.summary) {
      lines.push(`${node.summary}`);
    }
    return [lines.join("\n")];
  }
  const summary = node.summary ? ` - ${node.summary}` : "";
  const base = `${index + 1}. [${statusLabel(evaluation)}] ${marker ? marker + " " : ""}${label}${summary}`;
  return wrapLine(base, 80).map((segment, idx) =>
    idx === 0 ? segment : `    ${segment}`
  );
};

const renderDetails = async (poi, evaluation) => {
  const detailLine = (text) => wrapLine(text, 80);
  const lines = [
    " ",
    ...detailLine(`POI: ${poi.name}`),
    ...(poi.district ? detailLine(`DISTRITO: ${poi.district}`) : []),
    ...(poi.status
      ? detailLine(`ESTADO: ${(poi.status || "").toUpperCase()}`)
      : []),
    ...(poi.summary ? detailLine(`RESUMEN: ${poi.summary}`) : []),
  ].filter(Boolean);
  lines.push(" ");
  await type(lines, { stopBlinking: true });

  if (poi.details?.length) {
    await type(["INTEL"], { stopBlinking: true });
    const intelLines = [];
    poi.details.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        intelLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    await type(intelLines, { stopBlinking: true });
  }
  if (poi.contacts?.length) {
    await type(["CONTACTOS"], { stopBlinking: true });
    await type(poi.contacts.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  if (poi.notes?.length) {
    await type(["NOTAS"], { stopBlinking: true });
    await type(poi.notes.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  await type([" "], { stopBlinking: true });
  markSeen("map", poi.id, Number(poi.updatedAt || Date.now()));
};

const hasChildren = (pois, id) =>
  pois.some((poi) => (poi.commands?.parentId || "") === id);

async function attemptUnlock(node, evaluation) {
  const { config, prerequisitesMet, flagsMet } = evaluation;
  if (evaluation.unlocked) {
    return true;
  }

  if (config.unlockMode === "password") {
    const code = await prompt("CODIGO DE ACCESO: ");
    if (
      code &&
      config.password &&
      code.trim().toLowerCase() === config.password.trim().toLowerCase()
    ) {
      unlockEntity(node);
      await type(["ACCESO CONCEDIDO", " "], { stopBlinking: true });
      return true;
    }
    await type(["ACCESO DENEGADO", " "], { stopBlinking: true });
    return false;
  }

  if (config.unlockMode === "chain") {
    if (!prerequisitesMet) {
      await type(
        [
          " ",
          "ACCESO BLOQUEADO.",
          "PREREQUISITOS PENDIENTES:",
          ...(config.prerequisites || []).map((id) => `> ${id}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(node);
    await type(["CADENA COMPLETA. ACCESO HABILITADO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "conditional") {
    if (!flagsMet) {
      await type(
        [
          " ",
          "SE NECESITAN FLAGS ACTIVAS:",
          ...(config.requiredFlags || []).map((flag) => `> ${flag}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(node);
    await type(["CONDICIONES SATISFECHAS. ACCESO HABILITADO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "puzzle") {
    await type(
      [
        " ",
        "PUZZLE REQUERIDO: EJECUTA EL MODULO DESDE EL PANEL DM.",
        "El modo puzzle aun no esta operativo en la TUI.",
        " ",
      ],
      { stopBlinking: true }
    );
    return false;
  }

  // Fallback for 'none'
  unlockEntity(node);
  return true;
}

async function browsePois(pois) {
  let campaignState = loadCampaignState();
  const stack = [{ parentId: "", crumbs: ["MAP"], pageIndex: 0 }];

  while (stack.length) {
    const { parentId, crumbs } = stack[stack.length - 1];
    campaignState = loadCampaignState();
    const nodes = pois
      .filter((poi) => (poi.commands?.parentId || "") === parentId)
      .map((poi) => ({
        poi,
        evaluation: evaluateAccess(poi, campaignState),
      }))
      .filter(({ evaluation }) => evaluation.visible || evaluation.listed);

    if (!nodes.length) {
      if (stack.length > 1) {
        await type([" ", "SIN ENTRADAS EN ESTE SUBMENU.", " "], {
          stopBlinking: true,
        });
        stack.pop();
        continue;
      }
      await type(
        [" ", "NO HAY POIs CONFIGURADOS PARA ESTE NIVEL.", " "],
        { stopBlinking: true }
      );
      return;
    }

    const breadcrumb = crumbs.join(" / ");
    const items = nodes.map(({ poi, evaluation }, index) => ({
      lines: formatNodeLine(poi, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
    }));

    const headerLines = [" ", `/${breadcrumb}`];
    const baseFooterLines = [" ", "Selecciona numero para acceder.", " "];
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
            "Selecciona numero para acceder.",
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
      await type([" ", "CERRANDO MATRIZ CARTOGRAFICA.", " "], {
        stopBlinking: true,
      });
      clear();
      return;
    }
    if (normalized === "B") {
      if (stack.length > 1) {
        stack.pop();
      } else {
        await type([" ", "YA ESTAS EN LA RAIZ DEL MAPA.", " "], {
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

    const { poi, evaluation } = nodes[index];
    if (!evaluation.unlocked) {
      const unlocked = await attemptUnlock(poi, evaluation);
      if (!unlocked) {
        continue;
      }
      campaignState = loadCampaignState();
    }

    clear();
    await renderStatusHeader(fastRender);
    await renderDetails(poi, evaluation);

    const nodeType = getNodeType(poi);
    if (
      (nodeType === "container" || nodeType === "mixed") &&
      hasChildren(pois, poi.id)
    ) {
      let answer = "";
      if (isPortraitNarrow()) {
        await renderSelectableLines({
          lines: ["Entrar en submenu?"],
          chips: [
            { label: "SI", action: "select", value: "Y" },
            { label: "NO", action: "select", value: "N" },
          ],
        });
        const selected = await waitForSelection();
        answer = selected?.dataset?.value || "";
      } else {
        answer = await prompt("Entrar en submenu (Y/N): ");
      }
      if (answer && answer.trim().toLowerCase().startsWith("y")) {
        stack.push({
          parentId: poi.id,
          crumbs: [...crumbs, getNodeLabel(poi)],
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
  const data = await fetchPois();
  if (dataSource !== "api") {
    await print(["FALLBACK DATA IN USE."], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
  }
  const pois = data.pois || [];
  if (!pois.length) {
    await print(["NO HAY POIs CONFIGURADOS.", " "], {
      semantic: "system",
      stopBlinking: true,
    });
    return;
  }
  await browsePois(pois);
};
