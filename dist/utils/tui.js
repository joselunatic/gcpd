const GRID = {
  rows: 28,
  cols: 90,
};

const SYMBOLS = {
  selected: "▸",
  bullet: "•",
  bulletMuted: "◦",
  active: "●",
  inactive: "○",
  critical: "◆",
  rising: "▲",
  falling: "▼",
  relation: "›",
};

const SEPARATORS = {
  section: "─",
  title: "═",
};

function repeatChar(char, count) {
  return Array(Math.max(0, count)).fill(char).join("");
}

function clampText(text = "", width = GRID.cols) {
  const value = String(text || "");
  if (value.length <= width) return value;
  return value.slice(0, Math.max(0, width - 1)) + "…";
}

function toParts(line) {
  if (!line && line !== 0) return [];
  if (typeof line === "string") return [{ text: line }];
  if (typeof line === "number") return [{ text: String(line) }];
  if (Array.isArray(line)) return line.flatMap((entry) => toParts(entry));
  if (line.parts) return toParts(line.parts);
  if (line.text != null) return [{ text: String(line.text), className: line.className }];
  return [{ text: String(line) }];
}

function partsLength(parts = []) {
  return parts.reduce((sum, part) => sum + String(part?.text || "").length, 0);
}

function trimParts(parts = [], width = GRID.cols) {
  const result = [];
  let used = 0;
  for (const part of parts) {
    const text = String(part?.text || "");
    if (!text) continue;
    const remaining = width - used;
    if (remaining <= 0) break;
    if (text.length <= remaining) {
      result.push(part);
      used += text.length;
      continue;
    }
    const slice = clampText(text, remaining);
    result.push({ ...part, text: slice });
    used += slice.length;
    break;
  }
  return result;
}

function padParts(parts = [], width = GRID.cols, align = "left") {
  const length = partsLength(parts);
  const gap = Math.max(0, width - length);
  if (!gap) return parts;
  const spacer = { text: repeatChar(" ", gap), className: "tui-pad" };
  if (align === "right") return [spacer, ...parts];
  if (align === "center") {
    const left = Math.floor(gap / 2);
    const right = gap - left;
    return [
      { text: repeatChar(" ", left), className: "tui-pad" },
      ...parts,
      { text: repeatChar(" ", right), className: "tui-pad" },
    ];
  }
  return [...parts, spacer];
}

function mergePartsLine(
  left,
  right,
  {
    leftWidth = 38,
    rightWidth = 51,
    divider = "│",
    dividerClass = "tui-sep",
    leftClass = "",
    rightClass = "",
  } = {}
) {
  const leftParts = padParts(trimParts(toParts(left), leftWidth), leftWidth).map(
    (part) =>
      leftClass
        ? { ...part, className: `${part.className || ""} ${leftClass}`.trim() }
        : part
  );
  const rightParts = padParts(trimParts(toParts(right), rightWidth), rightWidth).map(
    (part) =>
      rightClass
        ? { ...part, className: `${part.className || ""} ${rightClass}`.trim() }
        : part
  );
  return {
    parts: [
      ...leftParts,
      { text: divider, className: dividerClass },
      ...rightParts,
    ],
  };
}

function padLine(text = "", width = GRID.cols, align = "left") {
  const value = clampText(text, width);
  const gap = Math.max(0, width - value.length);
  if (!gap) return value;
  if (align === "right") return `${repeatChar(" ", gap)}${value}`;
  if (align === "center") {
    const left = Math.floor(gap / 2);
    const right = gap - left;
    return `${repeatChar(" ", left)}${value}${repeatChar(" ", right)}`;
  }
  return `${value}${repeatChar(" ", gap)}`;
}

function separatorLine(char = SEPARATORS.section, width = GRID.cols) {
  return repeatChar(char, width);
}

function titleLine(label = "", width = GRID.cols) {
  const text = String(label || "").trim();
  if (!text) return separatorLine(SEPARATORS.title, width);
  const padded = ` ${text} `;
  const remaining = Math.max(0, width - padded.length);
  const left = Math.floor(remaining / 2);
  const right = remaining - left;
  return `${repeatChar(SEPARATORS.title, left)}${padded}${repeatChar(
    SEPARATORS.title,
    right
  )}`;
}

function joinBreadcrumb(parts = []) {
  return parts.filter(Boolean).join(` ${SYMBOLS.selected} `);
}

function buildHeaderLines({
  node = "WAYNE AUX NODE",
  view = "OS",
  status = "ONLINE",
  link = "SECURE",
  mode = "INVESTIGATION",
  caseLabel = "NONE",
  alert = "LOW",
  flags = "NONE",
  width = GRID.cols,
} = {}) {
  const line1 = joinBreadcrumb([node, view, status, link]);
  const line2 = `MODE: ${mode} | CASE: ${caseLabel} | ALERT: ${alert} | FLAGS: ${flags}`;
  return [padLine(line1, width), padLine(line2, width)];
}

function buildFooterLines({
  nav = "NAV: [F1] MAPA [F2] CASOS [F3] VILLANOS [F4] DIALER",
  mode = "INVESTIGATION",
  link = "SECURE",
  width = GRID.cols,
} = {}) {
  const line = `${nav} | MODE: ${mode} | LINK: ${link}`;
  return [padLine(line, width)];
}

function buildPromptLine({
  prompt = "AUX-01 >",
  hint = "",
  width = GRID.cols,
} = {}) {
  const line = hint ? `${prompt} ${hint}` : prompt;
  return [padLine(line, width)];
}

export {
  GRID,
  SYMBOLS,
  SEPARATORS,
  clampText,
  toParts,
  partsLength,
  trimParts,
  padParts,
  mergePartsLine,
  padLine,
  separatorLine,
  titleLine,
  joinBreadcrumb,
  buildHeaderLines,
  buildFooterLines,
  buildPromptLine,
};
