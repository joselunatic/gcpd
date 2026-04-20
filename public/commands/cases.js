import {
  prompt,
  type,
  print,
  renderSelectableLines,
  parse,
  input,
} from "/utils/io.js";
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
import { getStatusContext } from "/utils/status.js";
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

const fastRender = { wait: false, initialWait: false, finalWait: false };
const COLUMN = { left: 38, right: 51, divider: "│" };
const POIS_URL = "/api/pois-data";

let poisCachePromise;

async function loadPoisIndex() {
  if (!poisCachePromise) {
    poisCachePromise = fetch(POIS_URL, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { pois: [] }))
      .then((data) => {
        const pois = Array.isArray(data?.pois) ? data.pois : [];
        return new Map(pois.map((entry) => [entry.id, entry]));
      })
      .catch(() => new Map());
  }
  return poisCachePromise;
}

function getCaseLocationRefs(item = {}) {
  return Array.isArray(item?.commands?.locationRefs) ? item.commands.locationRefs : [];
}

function resolveCaseLocations(item = {}, poisIndex = new Map()) {
  return getCaseLocationRefs(item)
    .map((entry) => {
      const poi = poisIndex.get(entry.poiId);
      if (!poi) return null;
      return {
        poiId: entry.poiId,
        role: entry.role || "related",
        label: poi.name || poi.id,
        district: poi.district || "",
      };
    })
    .filter(Boolean);
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

const mergeLine = (left = "", right = "") =>
  mergePartsLine(left, right, {
    leftWidth: COLUMN.left,
    rightWidth: COLUMN.right,
    divider: COLUMN.divider,
    dividerClass: "tui-sep",
    rightClass: "tui-panel-right",
  });


const renderCaseDetails = async (item, poisIndex = new Map()) => {
  const locations = resolveCaseLocations(item, poisIndex);
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

  if (locations.length) {
    await print(["LOCALIZACIONES:"], { semantic: "log", stopBlinking: true });
    const locationLines = [];
    locations.forEach((entry) => {
      const roleLabel = (entry.role || "related").replace(/_/g, " ").toUpperCase();
      const suffix = entry.district ? ` · ${entry.district}` : "";
      locationLines.push(`> ${roleLabel}: ${entry.label}${suffix}`);
    });
    await print(locationLines, { semantic: "intel", stopBlinking: true });
  }

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

const formatNodeLine = (item, _evaluation, index) => {
  const label = getNodeLabel(item);
  const parentId = item.commands?.parentId || "";
  const isSubcase = parentId && parentId !== item.id;
  const line = {
    parts: [
      { text: `${String(index + 1).padStart(2, "0")} `, className: "tui-muted" },
      ...(isSubcase
        ? [{ text: `${SYMBOLS.relation} `, className: "tui-muted" }]
        : []),
      { text: label, className: "tui-primary" },
    ],
  };
  return [line];
};

const buildPreviewLines = (item, _evaluation, _campaignState, _breadcrumb = [], poisIndex = new Map()) => {
  if (!item) {
    return [
      { parts: [{ text: "SIN CASO SELECCIONADO.", className: "tui-muted" }] },
      { parts: [{ text: "REVISA LOS FILTROS.", className: "tui-muted" }] },
    ];
  }
  const parentId = item.commands?.parentId || "";
  const isSubcase = parentId && parentId !== item.id;
  const locations = resolveCaseLocations(item, poisIndex);
  const primaryLocation =
    locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const focus = `${SYMBOLS.selected} ${item.title || item.id}`;
  const lines = [
    {
      parts: [
        { text: focus, className: "tui-accent" },
        ...(isSubcase
          ? [{ text: "  › subcaso", className: "tui-muted" }]
          : []),
      ],
    },
  ];
  if (item.summary) {
    const summaryLines = wrapLine(item.summary, COLUMN.right - 2).slice(0, 5);
    summaryLines.forEach((line, idx) => {
      lines.push({
        parts: [
          { text: idx === 0 ? "RESUMEN: " : "         ", className: "tui-system" },
          { text: line, className: "tui-primary" },
        ],
      });
    });
  }
  if (primaryLocation) {
    lines.push({
      parts: [
        { text: "POI: ", className: "tui-system" },
        { text: primaryLocation.label, className: "tui-primary" },
      ],
    });
  }
  if (locations.length > 1) {
    lines.push({
      parts: [
        { text: "RED: ", className: "tui-system" },
        { text: `${locations.length} POIS`, className: "tui-muted" },
      ],
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
      const rightStyled = rightParts.map((part) => ({
        ...part,
        className: `${part.className || ""} tui-panel-right`.trim(),
      }));
      return {
        parts: [
          ...leftParts,
          { text: COLUMN.divider, className: "tui-sep" },
          ...rightStyled,
        ],
      };
    });
    return { ...item, lines: merged };
  });
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
  const poisIndex = await loadPoisIndex();

  while (stack.length) {
    campaignState = loadCampaignState();
    const statusContext = await getStatusContext();
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
    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const activeIndex = nodes.findIndex(({ item }) => item.id === activeCaseId);
    const defaultIndex = activeIndex >= 0 ? activeIndex : 0;
    const items = nodes.map(({ item, evaluation }, index) => ({
      lines: formatNodeLine(item, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
      _item: item,
      _evaluation: evaluation,
    }));

    const headerLines = [
      ...buildHeaderLines({
        node: "WAYNE AUX NODE",
        view: "CASES",
        status: "ONLINE",
        link: "SECURE",
        mode: "INVESTIGATION",
        caseLabel: statusContext?.activeCase
          ? statusContext.activeCase.title || statusContext.activeCase.id
          : activeCaseId || "NONE",
        alert: statusContext?.state?.alertLevel || "LOW",
        flags: (statusContext?.state?.flags || []).join(" | ") || "NONE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-system" }] })),
      { parts: [{ text: titleLine("CASOS :: INVESTIGACION OPERATIVA"), className: "tui-system" }] },
      mergePartsLine(
        { parts: [{ text: "LISTA / INDEX", className: "tui-system" }] },
        { parts: [{ text: "FOCUS / PREVIEW", className: "tui-system" }] },
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: COLUMN.divider, dividerClass: "tui-sep", rightClass: "tui-panel-right" }
      ),
      mergePartsLine(
        { text: "─".repeat(COLUMN.left), className: "tui-sep" },
        { text: "─".repeat(COLUMN.right), className: "tui-sep" },
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: "┼", dividerClass: "tui-sep", rightClass: "tui-panel-right" }
      ),
    ];
    if (statusContext?.unsynced) {
      headerLines.push(
        mergePartsLine(
          { parts: [{ text: "SYNC: DATA LOCAL", className: "tui-warn" }] },
          { parts: [{ text: "API OFFLINE", className: "tui-warn" }] },
          { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: COLUMN.divider, dividerClass: "tui-sep", rightClass: "tui-panel-right" }
        )
      );
    }

    const baseFooterLines = [
      mergePartsLine(
        {
          parts: [
            { text: "HINTS: ", className: "tui-system" },
            { text: "ENTER", className: "tui-accent" },
            { text: " abrir | ", className: "tui-muted" },
            { text: "/", className: "tui-accent" },
            { text: " buscar | ", className: "tui-muted" },
            { text: "F", className: "tui-accent" },
            { text: " filtrar | ", className: "tui-muted" },
            { text: "B", className: "tui-accent" },
            { text: " back", className: "tui-muted" },
          ],
        },
        "",
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: COLUMN.divider, dividerClass: "tui-sep", rightClass: "tui-panel-right" }
      ),
      ...buildFooterLines({
        mode: "INVESTIGATION",
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
    const pageDefaultIndexRaw = pageItems.findIndex(
      (item) => item.value === String(defaultIndex + 1)
    );
    const pageDefaultIndex = pageDefaultIndexRaw >= 0 ? pageDefaultIndexRaw : 0;
    const focusItem = pageItems[pageDefaultIndex] || pageItems[0] || null;
    const previewLines = buildPreviewLines(
      focusItem?._item,
      focusItem?._evaluation,
      campaignState,
      crumbs,
      poisIndex
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
        hint: "AUX-01 > open case 3 | / filter status:active | back",
      });
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
    await renderCaseDetails(item, poisIndex);

    const nodeType = getNodeType(item);
    if (
      (nodeType === "container" || nodeType === "mixed") &&
      hasChildren(cases, item.id)
    ) {
      let answer = "";
      if (isPortraitNarrow()) {
        await renderSelectableLines({
          lines: ["DESCENDER A SUBCASOS?"],
          chips: [
            { label: "SI", action: "select", value: "Y" },
            { label: "NO", action: "select", value: "N" },
          ],
        });
        const selected = await waitForSelection();
        answer = selected?.dataset?.value || "";
      } else {
        answer = await input(false, { hint: "AUX-01 > descend Y/N" });
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
  await refreshCampaignState();
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
