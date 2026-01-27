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

const API_URL = "/api/villains-data";
const FALLBACK_URL = "/data/villains/gallery.json";
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

const output = [
  " ",
  "GALERIA DE VILLANOS",
  "====================",
  "MARCAS: * NUEVO  ~ ACTUALIZADO  ! CRITICO",
  " ",
];
const fastRender = { wait: false, initialWait: false, finalWait: false };

const renderDetails = async (villain, evaluation) => {
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
  if (isPortraitNarrow()) {
    const lines = [
      `${index + 1}. ${label}`,
    ];
    if (villain.summary) {
      lines.push(`${villain.summary}`);
    }
    return [lines.join("\n")];
  }
  const summary = villain.summary ? ` - ${villain.summary}` : "";
  const base = `${index + 1}. [${statusLabel(evaluation)}] ${marker ? marker + " " : ""}${label}${villain.alias ? ` (${villain.alias})` : ""}${summary}`;
  return wrapLine(base, 80).map((segment, idx) =>
    idx === 0 ? segment : `    ${segment}`
  );
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

  while (stack.length) {
    campaignState = loadCampaignState();
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
    const items = nodes.map(({ villain, evaluation }, index) => ({
      lines: formatNodeLine(villain, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
    }));

    const headerLines = [" ", `/${breadcrumb}`];
    const baseFooterLines = [" ", "Selecciona perfil.", " "];
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
            "Selecciona perfil.",
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
    await renderStatusHeader(fastRender);
    await renderDetails(villain, evaluation);

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
  await renderStatusHeader(fastRender);
  await refreshCampaignState();
  await type(output, { stopBlinking: true, ...fastRender });
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
