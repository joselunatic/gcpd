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

const API_URL = "/api/villains-data";
const FALLBACK_URL = "/data/villains/gallery.json";
const POIS_URL = "/api/pois-data";
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
        const pois = Array.isArray(data?.pois) ? data.pois : [];
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
        label: poi.name || poi.id,
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

const renderDetails = async (villain, evaluation, poisIndex = new Map()) => {
  const locations = resolveVillainLocations(villain, poisIndex);
  const detailLine = (text) => wrapLine(text, 80);
  const hasValue = (value) =>
    value !== null && value !== undefined && String(value).trim() !== "";
  const lines = [
    " ",
    ...detailLine(`ALIAS: ${villain.alias}`),
    ...(villain.threatLevel ? detailLine(`AMENAZA: ${villain.threatLevel}`) : []),
    ...(villain.lastSeen
      ? detailLine(`ULTIMO AVISTAMIENTO: ${villain.lastSeen}`)
      : []),
    ...(villain.summary ? detailLine(`RESUMEN: ${villain.summary}`) : []),
  ].filter(Boolean);
  lines.push(" ");
  await type(lines, { stopBlinking: true });

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
    await type(["PERFIL", " "], { stopBlinking: true });
    await type(profileLines, { stopBlinking: true });
  }

  if (locations.length) {
    await type(["RED OPERATIVA"], { stopBlinking: true });
    const locationLines = [];
    locations.forEach((entry) => {
      const roleLabel = (entry.role || "related").replace(/_/g, " ").toUpperCase();
      const suffix = entry.district ? ` · ${entry.district}` : "";
      locationLines.push(`> ${roleLabel}: ${entry.label}${suffix}`);
    });
    await type(locationLines, { stopBlinking: true });
  }

  if (villain.patterns?.length) {
    await type(["PATRONES"], { stopBlinking: true });
    const patternLines = [];
    villain.patterns.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        patternLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    await type(patternLines, { stopBlinking: true });
  }
  if (villain.knownAssociates?.length) {
    await type(["ASOCIADOS"], { stopBlinking: true });
    await type(villain.knownAssociates.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  if (villain.notes?.length) {
    await type(["ANALISIS"], { stopBlinking: true });
    await type(villain.notes.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  await type([" "], { stopBlinking: true });
  markSeen("villains", villain.id, Number(villain.updatedAt || Date.now()));
};

function waitForReturn({ allowTap = false } = {}) {
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

    const keyHandler = (event) => {
      const key = event?.key || event?.code || "";
      if (key === "Enter" || key === "Return" || key === "NumpadEnter") {
        event.preventDefault();
        cleanup();
        resolve();
      }
    };

    const tapHandler = (event) => {
      if (event.pointerType !== "touch") return;
      event.preventDefault();
      cleanup();
      resolve();
    };

    document.addEventListener("keydown", keyHandler, options);
    if (allowTap) {
      const terminal = document.querySelector(".terminal");
      if (terminal) {
        terminal.addEventListener("pointerdown", tapHandler, options);
      }
    }
  });
}

const needsChildren = (villains, id) =>
  villains.some((entry) => (entry.commands?.parentId || "") === id);

const statusLabel = (evaluation) => {
  if (!evaluation.visible) return "OCULTO";
  return evaluation.unlocked ? "ONLINE" : "LOCKED";
};

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
      { text: threat, className: threat === "HIGH" ? "tui-alert" : "tui-warn" },
      { text: " | ", className: "tui-muted" },
      { text: status, className: status === "ONLINE" ? "tui-ok" : "tui-warn" },
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
    labelValueLine("STATUS", status, status === "ONLINE" ? "tui-ok" : "tui-warn"),
    labelValueLine("THREAT", threat, threat === "HIGH" ? "tui-alert" : "tui-warn"),
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

async function attemptUnlock(villain, evaluation) {
  const { config, prerequisitesMet, flagsMet } = evaluation;
  if (evaluation.unlocked) return true;

  if (config.unlockMode === "password") {
    const code = await prompt("CLAVE DE ARCHIVO: ", false, false, {
      hint: "INPUT REQUIRED",
    });
    if (
      code &&
      config.password &&
      code.trim().toLowerCase() === config.password.trim().toLowerCase()
    ) {
      unlockEntity(villain);
      await type(["PERFIL DESBLOQUEADO.", " "], { stopBlinking: true });
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
          "FALTAN PERFILES PREVIOS:",
          ...(config.prerequisites || []).map((id) => `> ${id}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(villain);
    await type(["CADENA COMPLETA. PERFIL ABIERTO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "conditional") {
    if (!flagsMet) {
      await type(
        [
          " ",
          "ACTIVA ESTOS FLAGS PARA DESBLOQUEAR:",
          ...(config.requiredFlags || []).map((flag) => `> ${flag}`),
          " ",
        ],
        { stopBlinking: true }
      );
      return false;
    }
    unlockEntity(villain);
    await type(["CONDICIONES SATISFECHAS. PERFIL ABIERTO.", " "], {
      stopBlinking: true,
    });
    return true;
  }

  if (config.unlockMode === "puzzle") {
    await type(
      [
        " ",
        "RESUELVE EL PUZZLE DESDE EL PANEL DM.",
        "Modo puzzle aun no disponible aqui.",
        " ",
      ],
      { stopBlinking: true }
    );
    return false;
  }

  unlockEntity(villain);
  return true;
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
        hint: "AUX-01 > open profile 2 | / filter threat:high | back",
      });
    }
    if (!choice) continue;
    const normalized = choice.trim().toUpperCase();
    if (normalized === "X") {
      await type([" ", "SALIDA DE GALERIA.", " "], { stopBlinking: true });
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
    await type(["PULSA RETURN PARA VOLVER AL MENU", " "], {
      stopBlinking: true,
      ...fastRender,
    });
    await waitForReturn({
      allowTap:
        isPortraitNarrow() || document.body.classList.contains("touch-mode"),
    });
    clear();
  }
}

export default async () => {
  await refreshCampaignState();
  const data = await fetchGallery();
  if (dataSource !== "api") {
    await print(["FALLBACK DATA IN USE."], {
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
