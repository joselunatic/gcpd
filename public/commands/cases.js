import { prompt, type, print, renderSelectableLines, parse, input } from "/utils/io.js";
import { listCases, getCasesSource } from "/utils/cases.js";
import { loadCampaignState, markSeen, refreshCampaignState } from "/utils/campaignState.js";
import clear from "/commands/clear.js";
import { evaluateAccess, unlockEntity, getNodeType, getNodeLabel } from "/utils/access.js";
import { getStatusContext } from "/utils/status.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";
import { waitForSelection } from "/utils/selection.js";
import { paginateSelectableItems } from "/utils/pagination.js";
import { SYMBOLS, buildHeaderLines, buildFooterLines, titleLine, mergePartsLine, toParts, trimParts, padParts } from "/utils/tui.js";
import { normalizePoisClient, getPoiName } from "/utils/poiContract.js";

const fastRender = { wait: false, initialWait: false, finalWait: false };
const COLUMN = { left: 38, right: 51, divider: "│" };
const POIS_URL = "/api/pois-data";
let poisCachePromise;

async function loadPoisIndex() {
  if (!poisCachePromise) {
    poisCachePromise = fetch(POIS_URL, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { pois: [] }))
      .then((data) => new Map(normalizePoisClient(data?.pois).map((entry) => [entry.id, entry])))
      .catch(() => new Map());
  }
  return poisCachePromise;
}

const wrapLine = (text = "", limit = 80) => {
  const adjusted = getWrapLimit(limit);
  const words = String(text || "").split(" ");
  const out = [];
  let current = "";
  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > adjusted) {
      if (current) out.push(current);
      current = word;
    } else current = next;
  });
  if (current) out.push(current);
  return out.length ? out : [String(text || "")];
};

const mergeLine = (left = "", right = "") =>
  mergePartsLine(left, right, {
    leftWidth: COLUMN.left,
    rightWidth: COLUMN.right,
    divider: COLUMN.divider,
    dividerClass: "tui-sep",
    rightClass: "tui-panel-right",
  });

const labelValueLine = (label, value, valueClass = "tui-primary") => ({
  parts: [
    { text: `${label}: `, className: "tui-system" },
    { text: String(value || "NONE"), className: valueClass },
  ],
});

const trimInline = (value = "", limit = 48) => {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length <= limit ? text : `${text.slice(0, Math.max(0, limit - 1))}…`;
};

const getCaseLocationRefs = (item = {}) =>
  Array.isArray(item?.commands?.locationRefs) ? item.commands.locationRefs : [];

function resolveCaseLocations(item = {}, poisIndex = new Map()) {
  return getCaseLocationRefs(item)
    .map((entry) => {
      const poi = poisIndex.get(entry.poiId);
      if (!poi) return null;
      return {
        poiId: entry.poiId,
        role: entry.role || "related",
        label: getPoiName(poi),
        district: poi.district || "",
      };
    })
    .filter(Boolean);
}

const hasChildren = (cases, id) =>
  cases.some((entry) => (entry.commands?.parentId || "") === id);

const accessLabel = (evaluation = {}) =>
  !evaluation.visible ? "HIDDEN" : evaluation.unlocked || evaluation.config?.unlockMode === "none" ? "OPEN" : "LOCKED";

const stateLabel = (item = {}, evaluation = {}) => {
  if (!evaluation.visible) return "HIDDEN";
  if (!evaluation.unlocked && evaluation.config?.unlockMode !== "none") return "LOCKED";
  return String(item.status || "active").toUpperCase();
};

const stateClass = (label = "") => {
  const value = String(label || "").toUpperCase();
  if (value === "ACTIVE" || value === "OPEN") return "tui-ok";
  if (value === "LOCKED" || value === "HIDDEN") return "tui-warn";
  if (value === "RESOLVED" || value === "ARCHIVED") return "tui-muted";
  return "tui-primary";
};

function indicatorsFor(item = {}, evaluation = {}, locations = [], withChildren = false) {
  const out = [];
  if (withChildren) out.push("TREE");
  if (locations.length) out.push(`${locations.length} POI`);
  if (item.commands?.brief?.length) out.push("BRIEF");
  if (item.commands?.intel?.length) out.push("INTEL");
  if (item.commands?.puzzle?.type && item.commands.puzzle.type !== "none") {
    out.push(`PUZ:${String(item.commands.puzzle.type).toUpperCase()}`);
  }
  if (evaluation?.config?.prerequisites?.length) out.push("CHAIN");
  if (evaluation?.config?.requiredFlags?.length) out.push("FLAGS");
  return out;
}

function buildPath(item = {}, cases = []) {
  const byId = new Map(cases.map((entry) => [entry.id, entry]));
  const path = [];
  let current = item;
  let safety = 0;
  while (current && safety < 12) {
    path.unshift(getNodeLabel(current));
    const parentId = current?.commands?.parentId || "";
    if (!parentId || parentId === current.id) break;
    current = byId.get(parentId);
    safety += 1;
  }
  return path;
}

function formatNodeLine(item, evaluation, index, campaignState, cases, poisIndex) {
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const status = stateLabel(item, evaluation);
  const meta = [
    accessLabel(evaluation),
    primary?.label || "",
    indicatorsFor(item, evaluation, locations, hasChildren(cases, item.id)).join(" · "),
  ]
    .filter(Boolean)
    .join(" | ");
  const isFresh = Number(item.updatedAt || 0) > Number(campaignState?.lastSeen?.cases?.[item.id] || 0);
  return [
    {
      parts: [
        { text: `${String(index + 1).padStart(2, "0")} `, className: "tui-muted" },
        ...(item.commands?.parentId ? [{ text: `${SYMBOLS.relation} `, className: "tui-muted" }] : []),
        { text: trimInline(getNodeLabel(item), 23), className: "tui-primary" },
        { text: " ", className: "tui-muted" },
        { text: `[${status}]`, className: stateClass(status) },
        ...(isFresh ? [{ text: " NEW", className: "tui-accent" }] : []),
      ],
    },
    {
      parts: [
        { text: "   ", className: "tui-muted" },
        { text: trimInline(item.summary || "Sin resumen operativo.", 44), className: "tui-muted" },
        ...(meta ? [{ text: "  ", className: "tui-muted" }, { text: trimInline(meta, 42), className: "tui-system" }] : []),
      ],
    },
  ];
}

function buildPreviewLines(item, evaluation, campaignState, cases, poisIndex) {
  if (!item) return [{ parts: [{ text: "SIN CASO SELECCIONADO.", className: "tui-muted" }] }];
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const status = stateLabel(item, evaluation);
  const lines = [
    { parts: [{ text: `${SYMBOLS.selected} ${trimInline(item.title || item.id, 42)}`, className: "tui-accent" }] },
    labelValueLine("STATE", status, stateClass(status)),
    labelValueLine("ACCESS", accessLabel(evaluation), accessLabel(evaluation) === "OPEN" ? "tui-ok" : "tui-warn"),
    labelValueLine("NODE", String(getNodeType(item) || "mixed").toUpperCase(), "tui-muted"),
  ];
  if (buildPath(item, cases).length > 1) lines.push(labelValueLine("PATH", trimInline(buildPath(item, cases).join(" > "), 40), "tui-muted"));
  if (primary) lines.push(labelValueLine("POI", trimInline(primary.district ? `${primary.label} · ${primary.district}` : primary.label, 40), "tui-primary"));
  if (locations.length > 1) lines.push(labelValueLine("NETWORK", `${locations.length} POIS`, "tui-muted"));
  const tools = indicatorsFor(item, evaluation, locations, hasChildren(cases, item.id));
  if (tools.length) lines.push(labelValueLine("TOOLS", trimInline(tools.join(" · "), 40), "tui-system"));
  wrapLine(item.summary || "", COLUMN.right - 9).slice(0, 3).forEach((line, idx) => {
    lines.push({ parts: [{ text: idx === 0 ? "SUMMARY: " : "         ", className: "tui-system" }, { text: line, className: "tui-primary" }] });
  });
  if (item.commands?.brief?.[0]) {
    wrapLine(item.commands.brief[0], COLUMN.right - 9).slice(0, 2).forEach((line, idx) => {
      lines.push({ parts: [{ text: idx === 0 ? "BRIEF:   " : "         ", className: "tui-system" }, { text: line, className: "tui-muted" }] });
    });
  }
  if (Number(item.updatedAt || 0) > Number(campaignState?.lastSeen?.cases?.[item.id] || 0)) {
    lines.push(labelValueLine("DELTA", "UNREAD UPDATE", "tui-accent"));
  }
  return lines;
}

function buildWorkspaceLines(item, evaluation, cases, poisIndex) {
  if (!item) return [mergeLine("DOSSIER", "SIN FOCO")];
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const status = stateLabel(item, evaluation);
  const tools = indicatorsFor(item, evaluation, locations, hasChildren(cases, item.id)).join(" · ");
  const lines = [
    mergeLine(
      { parts: [{ text: "DOSSIER / SNAPSHOT", className: "tui-system" }] },
      {
        parts: [
          { text: status, className: stateClass(status) },
          { text: " | ", className: "tui-muted" },
          { text: accessLabel(evaluation), className: accessLabel(evaluation) === "OPEN" ? "tui-ok" : "tui-warn" },
        ],
      }
    ),
    mergeLine(
      { parts: [{ text: trimInline(item.title || item.id, 36), className: "tui-primary" }] },
      { parts: [{ text: trimInline(buildPath(item, cases).join(" > "), 48), className: "tui-muted tui-panel-right" }] }
    ),
  ];
  if (item.summary) {
    wrapLine(item.summary, 82).slice(0, 2).forEach((line, idx) => {
      lines.push(
        mergeLine(
          { parts: [{ text: idx === 0 ? "SUMMARY" : "", className: "tui-system" }] },
          { parts: [{ text: line, className: "tui-primary tui-panel-right" }] }
        )
      );
    });
  }
  lines.push(
    mergeLine(
      { parts: [{ text: "MAP/POI", className: "tui-system" }, { text: primary ? ` ${trimInline(primary.label, 22)}` : " NONE", className: "tui-muted" }] },
      { parts: [{ text: trimInline(tools || "NO TOOLING", 48), className: "tui-system tui-panel-right" }] }
    )
  );
  if (item.commands?.brief?.[0]) {
    wrapLine(item.commands.brief[0], 82).slice(0, 2).forEach((line, idx) => {
      lines.push(
        mergeLine(
          { parts: [{ text: idx === 0 ? "BRIEF" : "", className: "tui-system" }] },
          { parts: [{ text: line, className: "tui-muted tui-panel-right" }] }
        )
      );
    });
  }
  if (!evaluation.unlocked && evaluation.config?.unlockMode !== "none") {
    const blockers = [
      ...(evaluation.config?.prerequisites?.length ? [`CHAIN ${evaluation.config.prerequisites.join(" · ")}`] : []),
      ...(evaluation.config?.requiredFlags?.length ? [`FLAGS ${evaluation.config.requiredFlags.join(" · ")}`] : []),
    ];
    blockers.slice(0, 2).forEach((entry, idx) => {
      lines.push(
        mergeLine(
          { parts: [{ text: idx === 0 ? "BLOCK" : "", className: "tui-warn" }] },
          { parts: [{ text: trimInline(entry, 48), className: "tui-warn tui-panel-right" }] }
        )
      );
    });
  }
  return lines;
}

function mergeItemsWithPreview(items, previewLines) {
  const totalLines = items.reduce((sum, item) => sum + (Array.isArray(item.lines) ? item.lines.length : 1), 0);
  const rightLines = previewLines.slice(0, totalLines);
  while (rightLines.length < totalLines) rightLines.push("");
  let rowIndex = 0;
  return items.map((item) => {
    const lines = Array.isArray(item.lines) ? item.lines : [item.lines];
    return {
      ...item,
      lines: lines.map((line) => {
        const right = rightLines[rowIndex] || "";
        rowIndex += 1;
        const leftParts = padParts(trimParts(toParts(line), COLUMN.left), COLUMN.left);
        const rightParts = padParts(trimParts(toParts(right), COLUMN.right), COLUMN.right).map((part) => ({
          ...part,
          className: `${part.className || ""} tui-panel-right`.trim(),
        }));
        return { parts: [...leftParts, { text: COLUMN.divider, className: "tui-sep" }, ...rightParts] };
      }),
    };
  });
}

function buildDetailBody(item, evaluation, cases, poisIndex) {
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const status = stateLabel(item, evaluation);
  const lines = [
    { parts: [{ text: titleLine("CASE DOSSIER :: RAPID VIEW"), className: "tui-system" }] },
    labelValueLine("CASE FILE", item.title || item.id, "tui-accent"),
    labelValueLine("ID", item.id, "tui-muted"),
    labelValueLine("STATE", status, stateClass(status)),
    labelValueLine("ACCESS", accessLabel(evaluation), accessLabel(evaluation) === "OPEN" ? "tui-ok" : "tui-warn"),
    labelValueLine("NODE", String(getNodeType(item) || "mixed").toUpperCase(), "tui-muted"),
    labelValueLine("PATH", trimInline(buildPath(item, cases).join(" > "), 68), "tui-muted"),
  ];
  if (item.summary) {
    lines.push({ parts: [{ text: " ", className: "tui-pad" }] });
    lines.push({ parts: [{ text: "SUMMARY", className: "tui-system" }] });
    wrapLine(item.summary, 84).forEach((line) => lines.push({ parts: [{ text: `${SYMBOLS.bullet} `, className: "tui-muted" }, { text: line, className: "tui-primary" }] }));
  }
  if (primary || locations.length > 1) {
    lines.push({ parts: [{ text: " ", className: "tui-pad" }] });
    lines.push({ parts: [{ text: "MAP / POI LINKS", className: "tui-system" }] });
    if (primary) lines.push({ parts: [{ text: `${SYMBOLS.selected} PRIMARY `, className: "tui-accent" }, { text: primary.district ? `${primary.label} · ${primary.district}` : primary.label, className: "tui-primary" }] });
    locations.filter((entry) => !primary || entry.poiId !== primary.poiId).slice(0, 4).forEach((entry) => {
      lines.push({ parts: [{ text: `${SYMBOLS.relation} ${String(entry.role || "related").toUpperCase()} `, className: "tui-muted" }, { text: entry.district ? `${entry.label} · ${entry.district}` : entry.label, className: "tui-primary" }] });
    });
  }
  [["BRIEF", item.commands?.brief, "tui-primary", SYMBOLS.bullet], ["INTEL", item.commands?.intel, "tui-muted", SYMBOLS.bulletMuted]].forEach(([label, entries, textClass, bullet]) => {
    if (!entries?.length) return;
    lines.push({ parts: [{ text: " ", className: "tui-pad" }] });
    lines.push({ parts: [{ text: label, className: "tui-system" }] });
    entries.forEach((entry) => {
      wrapLine(entry, 84).forEach((line, idx) => lines.push({ parts: [{ text: idx === 0 ? `${bullet} ` : "  ", className: "tui-muted" }, { text: line, className: textClass }] }));
    });
  });
  if (item.commands?.puzzle?.type && item.commands.puzzle.type !== "none") {
    lines.push({ parts: [{ text: " ", className: "tui-pad" }] });
    lines.push(labelValueLine("PUZZLE", `${String(item.commands.puzzle.type).toUpperCase()} ${JSON.stringify(item.commands.puzzle.config || {})}`, "tui-system"));
  }
  return lines;
}

async function renderCaseDetails(item, evaluation, cases, poisIndex) {
  const canDescend = (getNodeType(item) === "container" || getNodeType(item) === "mixed") && hasChildren(cases, item.id);
  while (true) {
    clear();
    await renderSelectableLines(
      {
        lines: buildDetailBody(item, evaluation, cases, poisIndex),
        footerLines: [{ parts: [{ text: "ACTIONS: ", className: "tui-system" }, { text: "M", className: "tui-accent" }, { text: " mapa | ", className: "tui-muted" }, ...(canDescend ? [{ text: "S", className: "tui-accent" }, { text: " subcasos | ", className: "tui-muted" }] : []), { text: "B", className: "tui-accent" }, { text: " volver", className: "tui-muted" }] }],
        chips: [{ label: "MAPA", action: "input", value: "M" }, ...(canDescend ? [{ label: "SUBCASOS", action: "input", value: "S" }] : []), { label: "VOLVER", action: "input", value: "B" }],
        context: { backValue: "B", backAction: "input" },
        defaultIndex: 0,
      },
      fastRender
    );
    markSeen("cases", item.id, Number(item.updatedAt || Date.now()));
    const choice = isPortraitNarrow() ? (await waitForSelection())?.dataset?.value || "" : await input(false, { hint: canDescend ? "AUX-01 > M map | S subcases | B back" : "AUX-01 > M map | B back" });
    const normalized = String(choice || "").trim().toUpperCase();
    if (!normalized || normalized === "B" || normalized === "X") return { action: "back" };
    if (normalized === "M" || normalized === "MAP" || normalized === "MAPA") {
      await parse("map");
      continue;
    }
    if (canDescend && (normalized === "S" || normalized === "SUBCASOS")) return { action: "descend" };
    await type([" ", "COMANDO NO DISPONIBLE EN DOSSIER.", " "], { stopBlinking: true });
  }
}

async function attemptUnlock(item, evaluation) {
  const { config, prerequisitesMet, flagsMet } = evaluation;
  if (evaluation.unlocked) return true;
  if (config.unlockMode === "password") {
    const code = await prompt("CLAVE DE CASO: ", false, false, { hint: "INPUT REQUIRED" });
    if (code && config.password && code.trim().toLowerCase() === config.password.trim().toLowerCase()) {
      unlockEntity(item);
      await type(["ACCESO A CASO AUTORIZADO.", " "], { stopBlinking: true });
      return true;
    }
    await type(["CLAVE INCORRECTA.", " "], { stopBlinking: true });
    return false;
  }
  if (config.unlockMode === "chain") {
    if (!prerequisitesMet) {
      await type([" ", "CADENA INCOMPLETA.", ...(config.prerequisites || []).map((id) => `> Necesario: ${id}`), " "], { stopBlinking: true });
      return false;
    }
    unlockEntity(item);
    await type(["SECUENCIA COMPUESTA. CASO ABIERTO.", " "], { stopBlinking: true });
    return true;
  }
  if (config.unlockMode === "conditional") {
    if (!flagsMet) {
      await type([" ", "FALTAN BANDERAS DE OPERACION:", ...(config.requiredFlags || []).map((flag) => `> ${flag}`), " "], { stopBlinking: true });
      return false;
    }
    unlockEntity(item);
    await type(["FLAGS ACTIVADAS. CASO ABIERTO.", " "], { stopBlinking: true });
    return true;
  }
  if (config.unlockMode === "puzzle") {
    await type([" ", "ACTIVA EL PUZZLE DESDE EL PANEL DM.", "Modo puzzle no disponible aun en la TUI.", " "], { stopBlinking: true });
    return false;
  }
  unlockEntity(item);
  return true;
}

async function browseCases(cases) {
  const stack = [{ parentId: "", crumbs: ["CASES"], pageIndex: 0 }];
  const poisIndex = await loadPoisIndex();
  while (stack.length) {
    const campaignState = loadCampaignState();
    const statusContext = await getStatusContext();
    const { parentId, crumbs } = stack[stack.length - 1];
    const nodes = cases
      .filter((item) => (item.commands?.parentId || "") === parentId)
      .map((item) => ({ item, evaluation: evaluateAccess(item, campaignState) }))
      .filter(({ evaluation }) => evaluation.visible || evaluation.listed);
    if (!nodes.length) {
      if (stack.length > 1) {
        await type([" ", "NO HAY SUBCASOS EN ESTA RUTA.", " "], { stopBlinking: true });
        stack.pop();
        continue;
      }
      await type([" ", "NO HAY CASOS ACTIVOS.", " "], { stopBlinking: true });
      return;
    }

    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const activeIndex = nodes.findIndex(({ item }) => item.id === activeCaseId);
    const defaultIndex = activeIndex >= 0 ? activeIndex : 0;
    const items = nodes.map(({ item, evaluation }, index) => ({
      lines: formatNodeLine(item, evaluation, index, campaignState, cases, poisIndex),
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
        caseLabel: statusContext?.activeCase ? statusContext.activeCase.title || statusContext.activeCase.id : activeCaseId || "NONE",
        alert: statusContext?.state?.alertLevel || "LOW",
        flags: (statusContext?.state?.flags || []).join(" | ") || "NONE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-system" }] })),
      { parts: [{ text: titleLine("CASOS :: INVESTIGACION OPERATIVA"), className: "tui-system" }] },
      mergePartsLine(
        { parts: [{ text: "QUEUE / INDEX", className: "tui-system" }] },
        { parts: [{ text: "LIVE PREVIEW", className: "tui-system" }] },
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

    const baseChips = [
      { label: "MAPA", action: "command", value: "map" },
      { label: "CASOS", action: "command", value: "cases" },
      { label: "VILLANOS", action: "command", value: "villains" },
      { label: "DIALER", action: "command", value: "dialer" },
    ];
    const baseFooterLines = [
      ...buildWorkspaceLines(nodes[defaultIndex]?.item || nodes[0]?.item, nodes[defaultIndex]?.evaluation || nodes[0]?.evaluation, cases, poisIndex),
      mergePartsLine(
        { parts: [{ text: "HINTS: ", className: "tui-system" }, { text: "ENTER", className: "tui-accent" }, { text: " dossier | ", className: "tui-muted" }, { text: "B", className: "tui-accent" }, { text: " back | ", className: "tui-muted" }, { text: "N/P", className: "tui-accent" }, { text: " pagina", className: "tui-muted" }] },
        "",
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: COLUMN.divider, dividerClass: "tui-sep", rightClass: "tui-panel-right" }
      ),
      ...buildFooterLines({ mode: "INVESTIGATION", link: "SECURE" }).map((line) => ({ parts: [{ text: line, className: "tui-muted" }] })),
    ];

    const { pages, pageCount } = paginateSelectableItems({ lines: headerLines, items, footerLines: baseFooterLines, chips: baseChips });
    const pageIndex = Math.max(0, Math.min(stack[stack.length - 1].pageIndex || 0, pageCount - 1));
    stack[stack.length - 1].pageIndex = pageIndex;
    const pageItems = pages[pageIndex] || [];
    const pageDefaultIndexRaw = pageItems.findIndex((entry) => entry.value === String(defaultIndex + 1));
    const pageDefaultIndex = pageDefaultIndexRaw >= 0 ? pageDefaultIndexRaw : 0;
    const focusItem = pageItems[pageDefaultIndex] || pageItems[0] || null;
    const footerLines = [
      ...(pageCount > 1 ? [mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, "")] : []),
      ...buildWorkspaceLines(focusItem?._item, focusItem?._evaluation, cases, poisIndex),
      ...baseFooterLines.slice(baseFooterLines.length - 2),
    ];
    clear();
    await renderSelectableLines(
      {
        lines: headerLines,
        items: mergeItemsWithPreview(pageItems, buildPreviewLines(focusItem?._item, focusItem?._evaluation, campaignState, cases, poisIndex)),
        footerLines,
        chips: pageCount > 1 && isPortraitNarrow() ? [...baseChips, { label: "PREV", action: "select", value: "P" }, { label: "NEXT", action: "select", value: "N" }] : baseChips,
        context: { backValue: "B", backAction: "input" },
        defaultIndex: pageDefaultIndex,
      },
      fastRender
    );

    let value = "";
    if (isPortraitNarrow()) {
      const node = await waitForSelection();
      if (node?.dataset?.action === "command" && node?.dataset?.value) {
        await parse(node.dataset.value);
        return;
      }
      value = node?.dataset?.value || "";
    } else {
      value = await input(false, { hint: "AUX-01 > open case 3 | B back | N/P page" });
    }
    if (!value) continue;
    const normalized = String(value).trim().toUpperCase();
    if (normalized === "X") return;
    if (normalized === "B") {
      if (stack.length > 1) stack.pop();
      else await type([" ", "YA ESTAS EN LA RAIZ.", " "], { stopBlinking: true });
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
    const index = Number(value) - 1;
    if (Number.isNaN(index) || index < 0 || index >= nodes.length) {
      await type([" ", "SELECCION NO VALIDA.", " "], { stopBlinking: true });
      continue;
    }
    const { item, evaluation } = nodes[index];
    if (!evaluation.unlocked && !(await attemptUnlock(item, evaluation))) continue;
    const detail = await renderCaseDetails(item, evaluateAccess(item, loadCampaignState()), cases, poisIndex);
    if (detail?.action === "descend") stack.push({ parentId: item.id, crumbs: [...crumbs, getNodeLabel(item)], pageIndex: 0 });
  }
}

export default async () => {
  await refreshCampaignState();
  const cases = await listCases();
  if (getCasesSource() !== "api") {
    await print(["FALLBACK DATA IN USE."], { semantic: "system", stopBlinking: true, ...fastRender });
  }
  if (!cases.length) {
    await print(["SIN CASOS DESPLEGADOS.", " "], { semantic: "system", stopBlinking: true, ...fastRender });
    return;
  }
  await browseCases(cases);
};
