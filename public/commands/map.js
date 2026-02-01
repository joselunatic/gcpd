import { prompt, type, print, renderSelectableLines, parse, input } from "/utils/io.js";
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
import { getStatusContext } from "/utils/status.js";
import { getDeltaMarker } from "/utils/delta.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";
import { waitForSelection } from "/utils/selection.js";
import { paginateSelectableItems } from "/utils/pagination.js";
import {
  SYMBOLS,
  buildHeaderLines,
  buildFooterLines,
  titleLine,
  mergePartsLine,
  toParts,
  trimParts,
  padParts,
} from "/utils/tui.js";

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

const fastRender = { wait: false, initialWait: false, finalWait: false };
const COLUMN = { left: 38, right: 51, divider: "│" };

const mergeLine = (left = "", right = "") =>
  mergePartsLine(left, right, {
    leftWidth: COLUMN.left,
    rightWidth: COLUMN.right,
    divider: COLUMN.divider,
    dividerClass: "tui-sep",
  });

const labelValueLine = (label, value, valueClass = "tui-primary") => ({
  parts: [
    { text: `${label}: `, className: "tui-system" },
    { text: String(value || ""), className: valueClass },
  ],
});

const statusLabel = (evaluation) => {
  if (!evaluation.visible) return "OCULTO";
  return evaluation.unlocked ? "ONLINE" : "LOCKED";
};

const formatNodeLine = (node, evaluation, index, campaignState) => {
  const label = getNodeLabel(node);
  const parentId = node.commands?.parentId || "";
  const isSub = parentId && parentId !== node.id;
  const line1 = {
    parts: [
      { text: `${String(index + 1).padStart(2, "0")} `, className: "tui-muted" },
      ...(isSub ? [{ text: `${SYMBOLS.relation} `, className: "tui-muted" }] : []),
      { text: label, className: "tui-primary" },
    ],
  };
  return [line1];
};

const buildSectorSummary = (pois = []) => {
  const counts = new Map();
  pois.forEach((poi) => {
    const key = poi.district || "UNKNOWN";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([district, count]) => `${district}: ${count}`);
};

const buildPreviewLines = (poi, evaluation, campaignState, allPois = [], breadcrumb = []) => {
  if (!poi) {
    return [
      { parts: [{ text: "SIN SECTOR SELECCIONADO.", className: "tui-muted" }] },
      { parts: [{ text: "REVISA LOS FILTROS.", className: "tui-muted" }] },
    ];
  }
  const marker = getDeltaMarker(poi, "map", campaignState);
  const access = statusLabel(evaluation);
  const status = poi.status ? String(poi.status).toUpperCase() : "UNKNOWN";
  const lines = [
    {
      parts: [
        { text: "FOCUS ", className: "tui-system" },
        { text: `${SYMBOLS.selected} ${poi.name || poi.id}`, className: "tui-accent" },
        ...(marker
          ? [
              {
                text: ` ${marker === "!" ? SYMBOLS.critical : marker}`,
                className: marker === "!" ? "tui-alert" : "tui-warn",
              },
            ]
          : []),
      ],
    },
    labelValueLine("ID", poi.id, "tui-muted"),
    labelValueLine("STATUS", status, status === "CRITICAL" ? "tui-alert" : "tui-muted"),
    labelValueLine("ACCESS", access, access === "ONLINE" ? "tui-ok" : "tui-warn"),
  ];
  if (poi.district) {
    lines.push(labelValueLine("DISTRICT", poi.district, "tui-muted"));
  }
  if (poi.summary) {
    lines.push({ parts: [{ text: "SUMMARY:", className: "tui-system" }] });
    wrapLine(poi.summary, COLUMN.right - 2).forEach((line) => {
      lines.push({
        parts: [
          { text: "  ", className: "tui-muted" },
          { text: line, className: "tui-primary" },
        ],
      });
    });
  }
  const sectors = buildSectorSummary(allPois);
  if (sectors.length) {
    lines.push({ parts: [{ text: "SECTORS:", className: "tui-system" }] });
    sectors.forEach((entry) => {
      lines.push({
        parts: [
          { text: "  ", className: "tui-muted" },
          { text: SYMBOLS.bullet + " ", className: "tui-muted" },
          { text: entry, className: "tui-primary" },
        ],
      });
    });
  }
  if (poi.details?.length) {
    lines.push({ parts: [{ text: "FEED:", className: "tui-system" }] });
    poi.details.slice(0, 2).forEach((entry) => {
      wrapLine(entry, COLUMN.right - 4).forEach((line) => {
        lines.push({
          parts: [
            { text: "  ", className: "tui-muted" },
            { text: SYMBOLS.bulletMuted + " ", className: "tui-muted" },
            { text: line, className: "tui-muted" },
          ],
        });
      });
    });
  }
  return lines;
};

const mergeItemsWithPreview = (items, previewLines) => {
  const totalLines = items.reduce((sum, item) => {
    const list = Array.isArray(item.lines) ? item.lines : [item.lines];
    return sum + list.length;
  }, 0);
  const rightLines = previewLines.slice(0, totalLines);
  while (rightLines.length < totalLines) rightLines.push("");
  let rowIndex = 0;
  return items.map((item) => {
    const lines = Array.isArray(item.lines) ? item.lines : [item.lines];
    const merged = lines.map((line) => {
      const right = rightLines[rowIndex] || "";
      rowIndex += 1;
      const leftParts = padParts(
        trimParts(toParts(line), COLUMN.left),
        COLUMN.left
      );
      const rightParts = padParts(
        trimParts(toParts(right), COLUMN.right),
        COLUMN.right
      );
      return {
        parts: [
          ...leftParts,
          { text: COLUMN.divider, className: "tui-sep" },
          ...rightParts,
        ],
      };
    });
    return { ...item, lines: merged };
  });
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
    const statusContext = await getStatusContext();
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
    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const items = nodes.map(({ poi, evaluation }, index) => ({
      lines: formatNodeLine(poi, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
      _poi: poi,
      _evaluation: evaluation,
    }));

    const headerLines = [
      ...buildHeaderLines({
        node: "WAYNE AUX NODE",
        view: "MAPA",
        status: "ONLINE",
        link: "SECURE",
        mode: "SITUATION",
        caseLabel: statusContext?.activeCase
          ? statusContext.activeCase.title || statusContext.activeCase.id
          : activeCaseId || "NONE",
        alert: statusContext?.state?.alertLevel || "LOW",
        flags: (statusContext?.state?.flags || []).join(" | ") || "NONE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-system" }] })),
      { parts: [{ text: titleLine("MAPA :: CONCIENCIA SITUACIONAL"), className: "tui-system" }] },
      mergeLine(
        { parts: [{ text: "SECTORES / HOTSPOTS", className: "tui-system" }] },
        { parts: [{ text: "SITUACION / FEED", className: "tui-system" }] }
      ),
      mergePartsLine(
        { text: "─".repeat(COLUMN.left), className: "tui-sep" },
        { text: "─".repeat(COLUMN.right), className: "tui-sep" },
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: "┼", dividerClass: "tui-sep" }
      ),
    ];
    if (statusContext?.unsynced) {
      headerLines.push(
        mergeLine(
          { parts: [{ text: "SYNC: DATA LOCAL", className: "tui-warn" }] },
          { parts: [{ text: "API OFFLINE", className: "tui-warn" }] }
        )
      );
    }

    const baseFooterLines = [
      mergeLine(
        {
          parts: [
            { text: "HINTS: ", className: "tui-system" },
            { text: "ENTER", className: "tui-accent" },
            { text: " abrir | ", className: "tui-muted" },
            { text: "/", className: "tui-accent" },
            { text: " buscar | ", className: "tui-muted" },
            { text: "B", className: "tui-accent" },
            { text: " back", className: "tui-muted" },
          ],
        },
        ""
      ),
      ...buildFooterLines({
        mode: "SITUATION",
        link: "SECURE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-muted" }] })),
    ];
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
    const pageDefaultIndex = pageItems.length ? 0 : -1;
    const focusItem = pageItems[pageDefaultIndex] || pageItems[0] || null;
    const previewLines = buildPreviewLines(
      focusItem?._poi,
      focusItem?._evaluation,
      campaignState,
      pois,
      crumbs
    );
    const pageItemsMerged = mergeItemsWithPreview(pageItems, previewLines);
    const footerLines =
      pageCount > 1
        ? [
            mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, ""),
            ...baseFooterLines,
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
      items: pageItemsMerged,
      footerLines,
      chips,
      context: { backValue: "B", backAction: "input" },
      defaultIndex: pageDefaultIndex,
    }, fastRender);

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
      choice = await input(false, {
        hint: "AUX-01 > open sector 2 | / filter status:critical | back",
      });
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
  await refreshCampaignState();
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
