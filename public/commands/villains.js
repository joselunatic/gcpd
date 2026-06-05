import { prompt, type, print, renderSelectableLines, parse, input } from "/utils/io.js";
import {
  loadCampaignState,
  markSeen,
  refreshCampaignState,
} from "/utils/campaignState.js";
import clear from "/commands/clear.js";
import {
  evaluateAccess,
  getNodeType,
  getNodeLabel,
  getAccessLabel,
  getStateTone,
} from "/utils/access.js";
import { attemptEntityUnlock } from "/utils/accessFlow.js";
import { getStatusContext } from "/utils/status.js";
import { getDeltaMarker } from "/utils/delta.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";
import { waitForSelection } from "/utils/selection.js";
import { paginateSelectableItems, getTerminalLineCapacity, countVisualLines } from "/utils/pagination.js";
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
import { normalizePoisClient, getPoiName } from "/utils/poiContract.js";

const API_URL = "/api/villains-data";
const FALLBACK_URL = "/data/villains/gallery.json";
const POIS_URL = "/api/pois-data";
const EXIT_CONTEXT_COMMANDS = ["EXIT", "BYE", "HANGUP"];
let cache;
let dataSource = "api";
let poisCachePromise;

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

async function loadPoisIndex() {
  if (!poisCachePromise) {
    poisCachePromise = fetchJson(POIS_URL)
      .then((data) => {
        const pois = normalizePoisClient(data?.pois);
        return new Map(pois.map((entry) => [entry.id, entry]));
      })
      .catch(() => new Map());
  }
  return poisCachePromise;
}

function getVillainLocationRefs(villain = {}) {
  return Array.isArray(villain?.commands?.locationRefs) ? villain.commands.locationRefs : [];
}

function resolveVillainLocations(villain = {}, poisIndex = new Map()) {
  return getVillainLocationRefs(villain)
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

const fetchGallery = async () => {
  if (!cache) {
    cache = fetchJson(API_URL)
      .then((data) => {
        if (Array.isArray(data.villains) && data.villains.length) {
          dataSource = "api";
          return data;
        }
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL).catch(() => ({ villains: [] }));
      })
      .catch((error) => {
        console.error("Villain data error", error);
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL).catch(() => ({ villains: [] }));
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

const buildDetailLines = (villain, evaluation, poisIndex = new Map()) => {
  const locations = resolveVillainLocations(villain, poisIndex);
  const detailLine = (text) => wrapLine(text, 80);
  const hasValue = (value) =>
    value !== null && value !== undefined && String(value).trim() !== "";
  const lines = [
    " ",
    ...detailLine(`ARCHIVO: ${villain.id}`),
    ...detailLine(`ALIAS: ${villain.alias}`),
    ...detailLine(`ACCESO: ${statusLabel(evaluation)}`),
    ...(villain.threatLevel ? detailLine(`AMENAZA: ${villain.threatLevel}`) : []),
    ...(villain.lastSeen
      ? detailLine(`ULTIMO AVISTAMIENTO: ${villain.lastSeen}`)
      : []),
    ...(villain.summary ? detailLine(`RESUMEN: ${villain.summary}`) : []),
  ].filter(Boolean);
  lines.push(" ");

  const profileLines = [];
  if (hasValue(villain.realName)) {
    profileLines.push(...detailLine(`NOMBRE REAL: ${villain.realName}`));
  }
  if (hasValue(villain.species)) {
    profileLines.push(...detailLine(`ESPECIE: ${villain.species}`));
  }
  if (hasValue(villain.age)) {
    profileLines.push(...detailLine(`EDAD: ${villain.age}`));
  }
  if (hasValue(villain.height)) {
    profileLines.push(...detailLine(`ALTURA: ${villain.height}`));
  }
  if (hasValue(villain.weight)) {
    profileLines.push(...detailLine(`PESO: ${villain.weight}`));
  }
  if (hasValue(villain.status)) {
    profileLines.push(
      ...detailLine(`ESTADO: ${String(villain.status).toUpperCase()}`)
    );
  }
  if (profileLines.length) {
    lines.push("PERFIL", " ", ...profileLines, " ");
  }

  if (locations.length) {
    const locationLines = ["RED OPERATIVA"];
    locations.forEach((entry) => {
      const roleLabel = (entry.role || "related").replace(/_/g, " ").toUpperCase();
      const suffix = entry.district ? ` · ${entry.district}` : "";
      locationLines.push(`> ${roleLabel}: ${entry.label}${suffix}`);
    });
    lines.push(...locationLines, " ");
  }

  if (villain.patterns?.length) {
    lines.push("PATRONES");
    const patternLines = [];
    villain.patterns.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        patternLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    lines.push(...patternLines, " ");
  }
  if (villain.knownAssociates?.length) {
    lines.push("ASOCIADOS", ...villain.knownAssociates.map((entry) => `> ${entry}`), " ");
  }
  if (villain.notes?.length) {
    lines.push("ANALISIS", ...villain.notes.map((entry) => `> ${entry}`), " ");
  }
  lines.push(" ");
  return lines;
};

function waitForVillainDetailAction({ allowTap = false, canScrollUp = false, canScrollDown = false } = {}) {
  return new Promise((resolve) => {
    const options = { capture: true };
    let resolved = false;

    const cleanup = () => {
      if (resolved) return;
      resolved = true;
      document.removeEventListener("keydown", keyHandler, options);
      if (allowTap) {
        const terminal = document.querySelector(".terminal");
        if (terminal) {
          terminal.removeEventListener("pointerdown", tapHandler, options);
        }
      }
    };

    const finish = (value) => {
      cleanup();
      resolve(value);
    };

    const keyHandler = (event) => {
      const key = event?.key || event?.code || "";
      if ((key === "ArrowUp" || key === "Up") && canScrollUp) {
        event.preventDefault();
        finish("up");
        return;
      }
      if ((key === "ArrowDown" || key === "Down") && canScrollDown) {
        event.preventDefault();
        finish("down");
        return;
      }
      if (
        key === "Enter" ||
        key === "Return" ||
        key === "NumpadEnter" ||
        key === "Escape" ||
        key.toLowerCase() === "b" ||
        key.toLowerCase() === "x"
      ) {
        event.preventDefault();
        finish("back");
      }
    };

    const tapHandler = (event) => {
      if (event.pointerType !== "touch") return;
      event.preventDefault();
      finish("back");
    };

    document.addEventListener("keydown", keyHandler, options);
    if (allowTap) {
      const terminal = document.querySelector(".terminal");
      if (terminal) terminal.addEventListener("pointerdown", tapHandler, options);
    }
  });
}

async function renderDetails(villain, evaluation, poisIndex = new Map()) {
  const detailLines = buildDetailLines(villain, evaluation, poisIndex);
  const headerLines = [
    { parts: [{ text: titleLine(`VILLAIN DOSSIER :: ${String(villain.alias || villain.id || "PROFILE").toUpperCase()}`), className: "tui-system" }] },
  ];
  const baseFooterLines = [
    { parts: [{ text: "RETURN / B / ESC", className: "tui-accent" }, { text: " volver", className: "tui-muted" }] },
  ];
  const capacity = getTerminalLineCapacity(24);
  let offset = 0;

  while (true) {
    const reserved = countVisualLines(headerLines) + countVisualLines(baseFooterLines) + 1;
    const viewport = Math.max(6, capacity - reserved);
    const maxOffset = Math.max(0, detailLines.length - viewport);
    const safeOffset = Math.max(0, Math.min(offset, maxOffset));
    const visibleLines = detailLines.slice(safeOffset, safeOffset + viewport);
    const footerLines = [
      {
        parts: [
          { text: "SCROLL ", className: "tui-system" },
          { text: `${safeOffset + 1}-${Math.min(detailLines.length, safeOffset + visibleLines.length)}`, className: "tui-muted" },
          { text: " / ", className: "tui-muted" },
          { text: String(detailLines.length), className: "tui-muted" },
          ...(maxOffset > 0
            ? [
                { text: " | ", className: "tui-muted" },
                { text: "↑/↓", className: "tui-accent" },
                { text: " desplazar", className: "tui-muted" },
              ]
            : []),
        ],
      },
      ...baseFooterLines,
    ];

    clear();
    await renderSelectableLines(
      {
        lines: [...headerLines, ...visibleLines],
        footerLines,
        chips: isPortraitNarrow() && maxOffset > 0
          ? [
              ...(safeOffset > 0 ? [{ label: "ARRIBA", action: "select", value: "UP" }] : []),
              ...(safeOffset < maxOffset ? [{ label: "ABAJO", action: "select", value: "DOWN" }] : []),
              { label: "VOLVER", action: "select", value: "BACK" },
            ]
          : isPortraitNarrow()
            ? [{ label: "VOLVER", action: "select", value: "BACK" }]
            : [],
        items: [],
        context: { backValue: "BACK", backAction: "input" },
      },
      fastRender
    );

    if (isPortraitNarrow()) {
      const selected = await waitForSelection();
      const value = String(selected?.dataset?.value || "").toUpperCase();
      if (value === "UP" && safeOffset > 0) {
        offset = Math.max(0, safeOffset - Math.max(1, Math.floor(viewport / 2)));
        continue;
      }
      if (value === "DOWN" && safeOffset < maxOffset) {
        offset = Math.min(maxOffset, safeOffset + Math.max(1, Math.floor(viewport / 2)));
        continue;
      }
      break;
    }

    const action = await waitForVillainDetailAction({
      allowTap: document.body.classList.contains("touch-mode"),
      canScrollUp: safeOffset > 0,
      canScrollDown: safeOffset < maxOffset,
    });
    if (action === "up") {
      offset = Math.max(0, safeOffset - Math.max(1, Math.floor(viewport / 2)));
      continue;
    }
    if (action === "down") {
      offset = Math.min(maxOffset, safeOffset + Math.max(1, Math.floor(viewport / 2)));
      continue;
    }
    break;
  }

  markSeen("villains", villain.id, Number(villain.updatedAt || Date.now()));
}

const needsChildren = (villains, id) =>
  villains.some((entry) => (entry.commands?.parentId || "") === id);

const statusLabel = (evaluation) =>
  getAccessLabel(evaluation, {
    hiddenLabel: "OCULTO",
    unlockedLabel: "ONLINE",
    lockedLabel: "LOCKED",
  });

const formatNodeLine = (villain, evaluation, index, campaignState) => {
  const marker = getDeltaMarker(villain, "villains", campaignState);
  const label = getNodeLabel(villain);
  const threat = villain.threatLevel
    ? String(villain.threatLevel).toUpperCase()
    : "UNKNOWN";
  const status = statusLabel(evaluation);
  const line1 = {
    parts: [
      { text: `${String(index + 1).padStart(2, "0")} `, className: "tui-muted" },
      { text: `${SYMBOLS.selected} `, className: "tui-muted" },
      { text: label, className: "tui-primary" },
      ...(marker
        ? [
            {
              text: ` ${marker === "!" ? SYMBOLS.critical : marker}`,
              className: marker === "!" ? "tui-alert" : "tui-warn",
            },
          ]
        : []),
    ],
  };
  const line2 = {
    parts: [
      { text: "  THREAT: ", className: "tui-system" },
      { text: threat, className: getStateTone(threat) },
      { text: " | ", className: "tui-muted" },
      { text: status, className: getStateTone(status) },
    ],
  };
  return [line1, line2];
};

const buildPreviewLines = (villain, evaluation, campaignState, breadcrumb = [], poisIndex = new Map()) => {
  if (!villain) {
    return [
      { parts: [{ text: "SIN PERFIL SELECCIONADO.", className: "tui-muted" }] },
      { parts: [{ text: "REVISA LOS FILTROS.", className: "tui-muted" }] },
    ];
  }
  const marker = getDeltaMarker(villain, "villains", campaignState);
  const threat = villain.threatLevel
    ? String(villain.threatLevel).toUpperCase()
    : "UNKNOWN";
  const status = statusLabel(evaluation);
  const locations = resolveVillainLocations(villain, poisIndex);
  const primaryLocation =
    locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const lines = [
    {
      parts: [
        { text: "FOCUS ", className: "tui-system" },
        { text: `${SYMBOLS.selected} ${villain.alias || villain.id}`, className: "tui-accent" },
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
    labelValueLine("ID", villain.id, "tui-muted"),
    labelValueLine("STATUS", status, getStateTone(status)),
    labelValueLine("THREAT", threat, getStateTone(threat)),
  ];
  if (breadcrumb.length) {
    lines.push(labelValueLine("PATH", breadcrumb.join(" / "), "tui-muted"));
  }
  if (villain.lastSeen) {
    lines.push(labelValueLine("LAST SEEN", villain.lastSeen, "tui-muted"));
  }
  if (primaryLocation) {
    lines.push(labelValueLine("POI", primaryLocation.label, "tui-muted"));
  }
  if (locations.length > 1) {
    lines.push(labelValueLine("NETWORK", `${locations.length} POIS`, "tui-muted"));
  }
  if (villain.summary) {
    lines.push({ parts: [{ text: "SUMMARY:", className: "tui-system" }] });
    wrapLine(villain.summary, COLUMN.right - 2).forEach((line) => {
      lines.push({
        parts: [
          { text: "  ", className: "tui-muted" },
          { text: line, className: "tui-primary" },
        ],
      });
    });
  }
  if (villain.patterns?.length) {
    lines.push({ parts: [{ text: "PATRONES:", className: "tui-system" }] });
    villain.patterns.slice(0, 3).forEach((entry) => {
      wrapLine(entry, COLUMN.right - 4).forEach((line) => {
        lines.push({
          parts: [
            { text: "  ", className: "tui-muted" },
            { text: SYMBOLS.bullet + " ", className: "tui-muted" },
            { text: line, className: "tui-primary" },
          ],
        });
      });
    });
  }
  if (villain.knownAssociates?.length) {
    lines.push({ parts: [{ text: "ASSOCIATES:", className: "tui-system" }] });
    villain.knownAssociates.slice(0, 3).forEach((entry) => {
      wrapLine(entry, COLUMN.right - 4).forEach((line) => {
        lines.push({
          parts: [
            { text: "  ", className: "tui-muted" },
            { text: SYMBOLS.relation + " ", className: "tui-muted" },
            { text: line, className: "tui-primary" },
          ],
        });
      });
    });
  }
  return lines;
};

function buildWorkspaceLines(villain, evaluation, crumbs = [], poisIndex = new Map()) {
  if (!villain) return [mergeLine("FOCO", "SIN PERFIL")];
  const locations = resolveVillainLocations(villain, poisIndex);
  const primary = locations.find((entry) => entry.role === "primary") || locations[0] || null;
  const pathText = crumbs.length ? crumbs.join(" > ") : "VILLAINS";
  const poiText = primary
    ? primary.district
      ? `${primary.label} · ${primary.district}`
      : primary.label
    : locations.length
      ? `${locations.length} POIS RELACIONADOS`
      : "SIN INFORMACION";
  const leadText = villain.lastSeen || villain.summary || villain.patterns?.[0] || villain.knownAssociates?.[0] || "";
  const tags = [
    villain.threatLevel ? `THREAT:${String(villain.threatLevel).toUpperCase()}` : "",
    locations.length ? `${locations.length} POI` : "",
    villain.patterns?.length ? "PATTERNS" : "",
    villain.knownAssociates?.length ? "NETWORK" : "",
    !evaluation.unlocked && evaluation.config?.unlockMode !== "none" ? "LOCKED" : "",
  ].filter(Boolean);
  const lines = [
    mergeLine(
      { parts: [{ text: String(villain.alias || villain.id || "SIN PERFIL").slice(0, 36), className: "tui-primary" }] },
      {
        parts: [
          { text: statusLabel(evaluation), className: getStateTone(statusLabel(evaluation)) },
          { text: " | ", className: "tui-muted" },
          { text: villain.id || "NO ID", className: "tui-muted" },
        ],
      }
    ),
    mergeLine(
      { parts: [{ text: "RUTA", className: "tui-system" }] },
      { parts: [{ text: pathText.slice(0, 48) || "ROOT", className: "tui-muted tui-panel-right" }] }
    ),
    mergeLine(
      { parts: [{ text: "POI", className: "tui-system" }] },
      { parts: [{ text: poiText.slice(0, 48), className: primary ? "tui-primary tui-panel-right" : "tui-muted tui-panel-right" }] }
    ),
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
  if (tags.length) {
    lines.push(
      mergeLine(
        { parts: [{ text: "TIPOS", className: "tui-system" }] },
        { parts: [{ text: tags.join(" · ").slice(0, 48), className: "tui-muted tui-panel-right" }] }
      )
    );
  }
  return lines;
}

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
      ).map((part) => ({
        ...part,
        className: `${part.className || ""} tui-panel-right`.trim(),
      }));
      return {
        className: "tui-split-selectable",
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

function countRenderedItemLines(items = []) {
  return items.reduce((sum, item) => {
    const lines = Array.isArray(item.lines) ? item.lines : [item.lines];
    return sum + lines.length;
  }, 0);
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

function installVillainsLivePreview({
  headerLines,
  pageItems,
  footerPrefixLines,
  footerSuffixLines,
  chips,
  terminal,
  campaignState,
  crumbs,
  poisIndex,
}) {
  const itemLineCount = countRenderedItemLines(pageItems);
  const headerCount = headerLines.length;
  const chipsOffset = chips.length ? 1 : 0;
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
    const footerNodes = terminalLines.slice(footerStart);
    const selected = pageItems[index] || pageItems[0] || null;
    if (!selected || !itemNodes.length || !footerNodes.length) return;

    const mergedItems = mergeItemsWithPreview(
      pageItems,
      buildPreviewLines(
        selected._villain,
        selected._evaluation,
        campaignState,
        crumbs,
        poisIndex
      )
    );
    const footerLines = [
      ...footerPrefixLines,
      ...buildWorkspaceLines(selected?._villain, selected?._evaluation, crumbs, poisIndex),
      ...footerSuffixLines,
    ];
    const nextFooterLines = footerLines.slice();
    while (nextFooterLines.length < footerNodes.length) nextFooterLines.push("");
    if (nextFooterLines.length > footerNodes.length) nextFooterLines.length = footerNodes.length;

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

async function attemptUnlock(villain, evaluation) {
  return attemptEntityUnlock(villain, evaluation, {
    passwordPrompt: "CLAVE DE ARCHIVO: ",
    passwordHint: "INPUT REQUIRED",
    passwordSuccessLines: ["PERFIL DESBLOQUEADO.", " "],
    passwordFailureLines: ["CLAVE INCORRECTA.", " "],
    prerequisiteIntroLines: ["FALTAN PERFILES PREVIOS:"],
    chainSuccessLines: ["CADENA COMPLETA. PERFIL ABIERTO.", " "],
    flagsIntroLines: ["ACTIVA ESTOS FLAGS PARA DESBLOQUEAR:"],
    conditionalSuccessLines: ["CONDICIONES SATISFECHAS. PERFIL ABIERTO.", " "],
    puzzleLines: [" ", "RESUELVE EL PROTOCOLO DE ACCESO DESDE EL SISTEMA DE CONTROL.", "Modo puzzle aun no disponible aqui.", " "],
  });
}

async function browseVillains(villains) {
  let campaignState = loadCampaignState();
  const stack = [{ parentId: "", crumbs: ["VILLAINS"], pageIndex: 0 }];
  const poisIndex = await loadPoisIndex();

  while (stack.length) {
    campaignState = loadCampaignState();
    const statusContext = await getStatusContext();
    const { parentId, crumbs } = stack[stack.length - 1];
    const nodes = villains
      .filter((villain) => (villain.commands?.parentId || "") === parentId)
      .map((villain) => ({
        villain,
        evaluation: evaluateAccess(villain, campaignState),
      }))
      .filter(({ evaluation }) => evaluation.visible || evaluation.listed);

    if (!nodes.length) {
      if (stack.length > 1) {
        await type([" ", "SIN SUBPERFILES EN ESTE NIVEL.", " "], {
          stopBlinking: true,
        });
        stack.pop();
        continue;
      }
      await type([" ", "GALERIA VACIA.", " "], { stopBlinking: true });
      return;
    }

    const breadcrumb = crumbs.join(" / ");
    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const items = nodes.map(({ villain, evaluation }, index) => ({
      lines: formatNodeLine(villain, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
      _villain: villain,
      _evaluation: evaluation,
    }));

    const headerLines = [
      ...buildHeaderLines({
        node: "WAYNE AUX NODE",
        view: "VILLAINS",
        status: "ONLINE",
        link: "SECURE",
        mode: "INTEL",
        caseLabel: statusContext?.activeCase
          ? statusContext.activeCase.title || statusContext.activeCase.id
          : activeCaseId || "NONE",
        alert: statusContext?.state?.alertLevel || "LOW",
        flags: (statusContext?.state?.flags || []).join(" | ") || "NONE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-system" }] })),
      { parts: [{ text: titleLine("VILLANOS :: BASE DE INTEL"), className: "tui-system" }] },
      mergeLine(
        { parts: [{ text: "INDICE / FILES", className: "tui-system" }] },
        { parts: [{ text: "PERFIL / RELACIONES", className: "tui-system" }] }
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
          { parts: [{ text: "ENLACE REMOTO CAIDO", className: "tui-warn" }] }
        )
      );
    }

    const baseHintLine = mergeLine(
      {
        parts: [
          { text: "HINTS: ", className: "tui-system" },
          { text: "ENTER", className: "tui-accent" },
          { text: " abrir | ", className: "tui-muted" },
          { text: "/", className: "tui-accent" },
          { text: " buscar | ", className: "tui-muted" },
          { text: "B", className: "tui-accent" },
          { text: " back | ", className: "tui-muted" },
          { text: "EXIT", className: "tui-accent" },
          { text: " remote", className: "tui-muted" },
        ],
      },
      { parts: [{ text: "BASE DE INTEL", className: "tui-muted tui-panel-right" }] }
    );
    const baseFooterLines = [
      ...buildWorkspaceLines(nodes[0]?.villain, nodes[0]?.evaluation, crumbs, poisIndex),
      baseHintLine,
      ...buildFooterLines({
        mode: "INTEL",
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
      maxItemsPerPage: 6,
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
      focusItem?._villain,
      focusItem?._evaluation,
      campaignState,
      crumbs,
      poisIndex
    );
    const pageItemsMerged = mergeItemsWithPreview(pageItems, previewLines);
    const finalHintLine = mergeLine(
      {
        parts: [
          { text: "HINTS: ", className: "tui-system" },
          { text: "ENTER", className: "tui-accent" },
          { text: " abrir | ", className: "tui-muted" },
          { text: "/", className: "tui-accent" },
          { text: " buscar | ", className: "tui-muted" },
          { text: "B", className: "tui-accent" },
          { text: " back | ", className: "tui-muted" },
          { text: "EXIT", className: "tui-accent" },
          { text: " remote", className: "tui-muted" },
        ],
      },
      {
        parts: pageCount > 1
          ? [
              { text: "N/P", className: "tui-accent tui-panel-right" },
              { text: " pagina", className: "tui-muted tui-panel-right" },
            ]
          : [{ text: "BASE DE INTEL", className: "tui-muted tui-panel-right" }],
      }
    );
    const footerLines = [
      ...(pageCount > 1 ? [mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, "")] : []),
      ...buildWorkspaceLines(focusItem?._villain, focusItem?._evaluation, crumbs, poisIndex),
      finalHintLine,
      ...buildFooterLines({
        mode: "INTEL",
        link: "SECURE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-muted" }] })),
    ];
    const footerPrefixLines = pageCount > 1 ? [mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, "")] : [];
    const footerSuffixLines = [
      finalHintLine,
      ...buildFooterLines({
        mode: "INTEL",
        link: "SECURE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-muted" }] })),
    ];
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
        context: {
          backValue: "B",
          backAction: "input",
          onSelectionChange: installVillainsLivePreview({
            headerLines,
            pageItems,
            footerPrefixLines,
            footerSuffixLines,
            chips,
            terminal: document.querySelector(".terminal"),
            campaignState,
            crumbs,
            poisIndex,
          }),
        },
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
        hint: "AUX-01 > open profile 2 | / filter threat:high | B back | EXIT remote",
      });
    }
    if (!choice) continue;
    const normalized = choice.trim().toUpperCase();
    if (normalized === "X") {
      await type([" ", "SALIDA DE GALERIA.", " "], { stopBlinking: true });
      clear();
      return;
    }
    if (EXIT_CONTEXT_COMMANDS.includes(normalized)) {
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

    const { villain, evaluation } = nodes[index];
    if (!evaluation.unlocked) {
      const unlocked = await attemptUnlock(villain, evaluation);
      if (!unlocked) continue;
      campaignState = loadCampaignState();
    }

    clear();
    await renderDetails(villain, evaluation, poisIndex);

    const nodeType = getNodeType(villain);
    if (
      (nodeType === "container" || nodeType === "mixed") &&
      needsChildren(villains, villain.id)
    ) {
      let answer = "";
      if (isPortraitNarrow()) {
        await renderSelectableLines({
          lines: ["?Abrir subperfiles?"],
          chips: [
            { label: "SI", action: "select", value: "Y" },
            { label: "NO", action: "select", value: "N" },
          ],
        });
        const selected = await waitForSelection();
        answer = selected?.dataset?.value || "";
      } else {
        answer = await prompt("?Abrir subperfiles? (Y/N): ");
      }
      if (answer && answer.trim().toLowerCase().startsWith("y")) {
        stack.push({
          parentId: villain.id,
          crumbs: [...crumbs, getNodeLabel(villain)],
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
  const data = await fetchGallery();
  if (dataSource !== "api") {
    await print(["ARCHIVO DE RESPALDO LOCAL EN USO."], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
  }
  const villains = data.villains || [];
  if (!villains.length) {
    await print(["SIN REGISTROS EN LA GALERIA", " "], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
    return;
  }
  await browseVillains(villains);
};
