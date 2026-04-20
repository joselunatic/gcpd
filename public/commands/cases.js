import { type, print, renderSelectableLines, parse, input } from "/utils/io.js";
import { listCases, getCasesSource } from "/utils/cases.js";
import { loadCampaignState, markSeen, refreshCampaignState } from "/utils/campaignState.js";
import clear from "/commands/clear.js";
import {
  evaluateAccess,
  getNodeType,
  getNodeLabel,
  getAccessLabel,
  getEntityStateLabel,
  getStateTone,
} from "/utils/access.js";
import { attemptEntityUnlock } from "/utils/accessFlow.js";
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
  const status = getEntityStateLabel(item, evaluation);
  const meta = [
    getAccessLabel(evaluation),
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
        { text: `[${status}]`, className: getStateTone(status) },
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
  const status = getEntityStateLabel(item, evaluation);
  const tools = indicatorsFor(item, evaluation, locations, hasChildren(cases, item.id));
  const lines = [
    { parts: [{ text: `${SYMBOLS.selected} ${trimInline(item.title || item.id, 42)}`, className: "tui-accent" }] },
    mergeLine(
      {
        parts: [
          { text: "STATE ", className: "tui-system" },
          { text: status, className: getStateTone(status) },
          { text: " | ", className: "tui-muted" },
          { text: getAccessLabel(evaluation), className: getStateTone(getAccessLabel(evaluation)) },
        ],
      },
      {
        parts: [{ text: trimInline(String(getNodeType(item) || "mixed").toUpperCase(), 18), className: "tui-muted tui-panel-right" }],
      }
    ),
  ];
  if (primary || tools.length) {
    lines.push(
      mergeLine(
        {
          parts: primary
            ? [
                { text: "POI ", className: "tui-system" },
                {
                  text: trimInline(primary.district ? `${primary.label} · ${primary.district}` : primary.label, 26),
                  className: "tui-primary",
                },
              ]
            : [{ text: "POI SIN INFORMACION", className: "tui-muted" }],
        },
        {
          parts: tools.length
            ? [{ text: trimInline(tools.join(" · "), 28), className: "tui-system tui-panel-right" }]
            : [{ text: "NO TOOLING", className: "tui-muted tui-panel-right" }],
        }
      )
    );
  }
  wrapLine(item.summary || "", COLUMN.right - 9).slice(0, 2).forEach((line, idx) => {
    lines.push({ parts: [{ text: idx === 0 ? "SUMMARY: " : "         ", className: "tui-system" }, { text: line, className: "tui-primary" }] });
  });
  if (Number(item.updatedAt || 0) > Number(campaignState?.lastSeen?.cases?.[item.id] || 0)) {
    lines.push(labelValueLine("DELTA", "UNREAD UPDATE", "tui-accent"));
  }
  return lines;
}

function buildWorkspaceLines(item, evaluation, cases, poisIndex) {
  if (!item) return [mergeLine("FOCO", "SIN CASO")];
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const markers = indicatorsFor(item, evaluation, locations, hasChildren(cases, item.id)).join(" · ");
  const leadText = item.commands?.intel?.[0] || item.commands?.brief?.[0] || item.summary || "";
  const pathText = trimInline(buildPath(item, cases).join(" > "), 48);
  const poiText = primary
    ? trimInline(primary.district ? `${primary.label} · ${primary.district}` : primary.label, 48)
    : locations.length
      ? `${locations.length} POIS RELACIONADOS`
      : "SIN INFORMACION";
  const status = getEntityStateLabel(item, evaluation);
  const lines = [
    mergeLine(
      { parts: [{ text: trimInline(item.title || item.id, 36), className: "tui-primary" }] },
      {
        parts: [
          { text: status, className: getStateTone(status) },
          { text: " | ", className: "tui-muted" },
          { text: item.id || "NO ID", className: "tui-muted" },
        ],
      }
    ),
    mergeLine(
      { parts: [{ text: "RUTA", className: "tui-system" }] },
      { parts: [{ text: pathText || "ROOT", className: "tui-muted tui-panel-right" }] }
    ),
    mergeLine(
      { parts: [{ text: "POI", className: "tui-system" }] },
      { parts: [{ text: poiText, className: primary ? "tui-primary tui-panel-right" : "tui-muted tui-panel-right" }] }
    )
  ];
  if (leadText) {
    wrapLine(leadText, 82).slice(0, 2).forEach((line, idx) => {
      lines.push(
        mergeLine(
          { parts: [{ text: idx === 0 ? "CLAVE" : "", className: "tui-system" }] },
          { parts: [{ text: line, className: "tui-primary tui-panel-right" }] }
        )
      );
    });
  }
  if (markers) {
    lines.push(
      mergeLine(
        { parts: [{ text: "TIPOS", className: "tui-system" }] },
        { parts: [{ text: trimInline(markers, 48), className: "tui-muted tui-panel-right" }] }
      )
    );
  }
  if (!evaluation.unlocked && evaluation.config?.unlockMode !== "none") {
    const blockers = [
      ...(evaluation.config?.prerequisites?.length ? [`CHAIN ${evaluation.config.prerequisites.join(" · ")}`] : []),
      ...(evaluation.config?.requiredFlags?.length ? [`FLAGS ${evaluation.config.requiredFlags.join(" · ")}`] : []),
    ];
    blockers.slice(0, 2).forEach((entry, idx) => {
      lines.push(
        mergeLine(
          { parts: [{ text: idx === 0 ? "BLOQUEO" : "", className: "tui-warn" }] },
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

function countRenderedItemLines(items = []) {
  return items.reduce(
    (sum, item) => sum + (Array.isArray(item.lines) ? item.lines.length : 1),
    0
  );
}

function fillLineNode(node, lineInput = "") {
  if (!node) return;
  const existingClasses = Array.from(node.classList);
  node.textContent = "";
  existingClasses.forEach((cls) => {
    if (cls.startsWith("tui-")) node.classList.remove(cls);
  });
  let plainText = "";
  if (typeof lineInput === "string" || typeof lineInput === "number") {
    plainText = String(lineInput ?? "");
    node.textContent = plainText;
  } else if (lineInput && typeof lineInput === "object") {
    if (lineInput.className) {
      String(lineInput.className)
        .split(" ")
        .filter(Boolean)
        .forEach((cls) => node.classList.add(cls));
    }
    if (lineInput.semantic) {
      node.classList.add(`tui-${String(lineInput.semantic)}`);
    }
    if (Array.isArray(lineInput.parts)) {
      lineInput.parts.forEach((part) => {
        const span = document.createElement("span");
        const text = String(part?.text || "");
        plainText += text;
        span.textContent = text;
        if (part?.className) {
          String(part.className)
            .split(" ")
            .filter(Boolean)
            .forEach((cls) => span.classList.add(cls));
        }
        node.appendChild(span);
      });
    } else {
      plainText = String(lineInput.text || "");
      node.textContent = plainText;
    }
  }
  node.dataset.text = plainText;
}

function flashPanelNode(node) {
  if (!node) return;
  node.classList.remove("cases-live-refresh");
  void node.offsetWidth;
  node.classList.add("cases-live-refresh");
}

function installCasesLivePreview({
  headerLines,
  pageItems,
  footerPrefixLines,
  footerSuffixLines,
  chips,
  terminal,
  cases,
  campaignState,
  poisIndex,
}) {
  const itemLineCount = countRenderedItemLines(pageItems);
  const chipsOffset = chips.length ? 1 : 0;
  const headerCount = headerLines.length;
  const footerStart = headerCount + itemLineCount + chipsOffset;

  return ({ index }) => {
    const liveTerminal = terminal || document.querySelector(".terminal");
    if (!liveTerminal) return;

    const terminalLines = Array.from(
      liveTerminal.querySelectorAll(".terminal-line")
    );
    const itemNodes = terminalLines.slice(
      headerCount,
      headerCount + itemLineCount
    );
    const selected = pageItems[index] || pageItems[0] || null;
    if (!selected) return;
    const footerLines = [
      ...footerPrefixLines,
      ...buildWorkspaceLines(
        selected?._item,
        selected?._evaluation,
        cases,
        poisIndex
      ),
      ...footerSuffixLines,
    ];
    const footerNodes = terminalLines.slice(footerStart);

    if (!itemNodes.length || !footerNodes.length) return;
    const mergedItems = mergeItemsWithPreview(
      pageItems,
      buildPreviewLines(selected._item, selected._evaluation, campaignState, cases, poisIndex)
    );
    const nextFooterLines = footerLines.slice();
    while (nextFooterLines.length < footerNodes.length) nextFooterLines.push("");
    if (nextFooterLines.length > footerNodes.length) {
      nextFooterLines.length = footerNodes.length;
    }

    let itemCursor = 0;
    mergedItems.forEach((item) => {
      const lines = Array.isArray(item.lines) ? item.lines : [item.lines];
      lines.forEach((line) => {
        fillLineNode(itemNodes[itemCursor], line);
        flashPanelNode(itemNodes[itemCursor]);
        itemCursor += 1;
      });
    });
    nextFooterLines.forEach((line, footerIndex) => {
      fillLineNode(footerNodes[footerIndex], line);
      flashPanelNode(footerNodes[footerIndex]);
    });
  };
}

function buildDetailBody(item, evaluation, cases, poisIndex) {
  const locations = resolveCaseLocations(item, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const status = getEntityStateLabel(item, evaluation);
  const lines = [
    { parts: [{ text: titleLine("CASE DOSSIER :: RAPID VIEW"), className: "tui-system" }] },
    labelValueLine("CASE FILE", item.title || item.id, "tui-accent"),
    labelValueLine("ID", item.id, "tui-muted"),
    labelValueLine("STATE", status, getStateTone(status)),
    labelValueLine("ACCESS", getAccessLabel(evaluation), getStateTone(getAccessLabel(evaluation))),
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
      const relatedPoiIds = resolveCaseLocations(item, poisIndex).map((entry) => entry.poiId);
      await parse(relatedPoiIds.length ? `map ${relatedPoiIds.join(" ")}` : "map sininfo");
      continue;
    }
    if (canDescend && (normalized === "S" || normalized === "SUBCASOS")) return { action: "descend" };
    await type([" ", "COMANDO NO DISPONIBLE EN DOSSIER.", " "], { stopBlinking: true });
  }
}

async function attemptUnlock(item, evaluation) {
  return attemptEntityUnlock(item, evaluation, {
    passwordPrompt: "CLAVE DE CASO: ",
    passwordHint: "INPUT REQUIRED",
    passwordSuccessLines: ["ACCESO A CASO AUTORIZADO.", " "],
    passwordFailureLines: ["CLAVE INCORRECTA.", " "],
    prerequisiteIntroLines: ["CADENA INCOMPLETA."],
    prerequisiteFormatter: (id) => `> Necesario: ${id}`,
    chainSuccessLines: ["SECUENCIA COMPUESTA. CASO ABIERTO.", " "],
    flagsIntroLines: ["FALTAN BANDERAS DE OPERACION:"],
    conditionalSuccessLines: ["FLAGS ACTIVADAS. CASO ABIERTO.", " "],
    puzzleLines: [" ", "ACTIVA EL PUZZLE DESDE EL PANEL DM.", "Modo puzzle no disponible aun en la TUI.", " "],
  });
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

    const baseChips = [];
    const footerHintLine = mergeLine(
      {
        parts: [
          { text: "HINTS: ", className: "tui-system" },
          { text: "ENTER", className: "tui-accent" },
          { text: " dossier | ", className: "tui-muted" },
          { text: "B", className: "tui-accent" },
          { text: " salir", className: "tui-muted" },
        ],
      },
      { parts: [{ text: "CASESPACE", className: "tui-muted tui-panel-right" }] }
    );

    const paginationProbeFooter = [
      ...buildWorkspaceLines(nodes[defaultIndex]?.item || nodes[0]?.item, nodes[defaultIndex]?.evaluation || nodes[0]?.evaluation, cases, poisIndex),
      footerHintLine,
    ];

    const { pages, pageCount } = paginateSelectableItems({ lines: headerLines, items, footerLines: paginationProbeFooter, chips: baseChips });
    const pageIndex = Math.max(0, Math.min(stack[stack.length - 1].pageIndex || 0, pageCount - 1));
    stack[stack.length - 1].pageIndex = pageIndex;
    const pageItems = pages[pageIndex] || [];
    const pageDefaultIndexRaw = pageItems.findIndex((entry) => entry.value === String(defaultIndex + 1));
    const pageDefaultIndex = pageDefaultIndexRaw >= 0 ? pageDefaultIndexRaw : 0;
    const focusItem = pageItems[pageDefaultIndex] || pageItems[0] || null;
    const finalHintLine = mergeLine(
      {
        parts: [
          { text: "HINTS: ", className: "tui-system" },
          { text: "ENTER", className: "tui-accent" },
          { text: " dossier | ", className: "tui-muted" },
          { text: "B", className: "tui-accent" },
          { text: " salir", className: "tui-muted" },
        ],
      },
      {
        parts: pageCount > 1
          ? [
              { text: "N/P", className: "tui-accent tui-panel-right" },
              { text: " pagina", className: "tui-muted tui-panel-right" },
            ]
          : [{ text: "CASESPACE", className: "tui-muted tui-panel-right" }],
      }
    );
    const footerLines = [
      ...(pageCount > 1 ? [mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, "")] : []),
      ...buildWorkspaceLines(focusItem?._item, focusItem?._evaluation, cases, poisIndex),
      finalHintLine,
    ];
    const footerPrefixLines = pageCount > 1 ? [mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, "")] : [];
    const footerSuffixLines = [finalHintLine];
    clear();
    await renderSelectableLines(
      {
        lines: headerLines,
        items: mergeItemsWithPreview(pageItems, buildPreviewLines(focusItem?._item, focusItem?._evaluation, campaignState, cases, poisIndex)),
        footerLines,
        chips: baseChips,
        context: {
          backValue: "B",
          backAction: "input",
          onSelectionChange: installCasesLivePreview({
            headerLines,
            pageItems,
            footerPrefixLines,
            footerSuffixLines,
            chips: baseChips,
            terminal: document.querySelector(".terminal"),
            cases,
            campaignState,
            poisIndex,
          }),
        },
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
      value = await input(false, { hint: "AUX-01 > open case 3 | B exit | N/P page" });
    }
    if (!value) continue;
    const normalized = String(value).trim().toUpperCase();
    if (normalized === "X") return;
    if (normalized === "B") {
      if (stack.length > 1) stack.pop();
      else return;
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
