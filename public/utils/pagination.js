function countVisualLines(lines = []) {
  const list = Array.isArray(lines) ? lines : [lines];
  return list.reduce((sum, line) => {
    if (line == null) return sum;
    return sum + String(line).split(/\n/).length;
  }, 0);
}

function getTerminalLineCapacity(fallback = 24) {
  const terminal = document.querySelector(".terminal");
  if (!terminal) return fallback;
  const rect = terminal.getBoundingClientRect();
  if (!rect.height) return fallback;

  let lineHeight = 0;
  const probe = document.createElement("div");
  probe.className = "terminal-line";
  probe.textContent = "X";
  probe.style.visibility = "hidden";
  probe.style.position = "absolute";
  probe.style.pointerEvents = "none";
  terminal.appendChild(probe);
  lineHeight = probe.getBoundingClientRect().height || 0;
  terminal.removeChild(probe);

  if (!lineHeight) {
    const computed = window.getComputedStyle(terminal);
    const parsed = parseFloat(computed.lineHeight || "0");
    lineHeight = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  if (!lineHeight) return fallback;

  const capacity = Math.floor(rect.height / lineHeight);
  return Math.max(6, capacity || fallback);
}

function countItemLines(item) {
  const rawLines = Array.isArray(item?.lines) ? item.lines : [item?.lines];
  return rawLines.reduce((sum, line) => {
    if (line == null) return sum;
    return sum + String(line).split(/\n/).length;
  }, 0);
}

function paginateItems(items = [], budget = 10) {
  const pages = [];
  let current = [];
  let used = 0;

  items.forEach((item) => {
    const cost = Math.max(1, countItemLines(item));
    if (current.length && used + cost > budget) {
      pages.push(current);
      current = [];
      used = 0;
    }
    if (!current.length && cost > budget) {
      pages.push([item]);
      return;
    }
    current.push(item);
    used += cost;
  });

  if (current.length) pages.push(current);
  return pages.length ? pages : [[]];
}

function paginateSelectableItems({ lines = [], items = [], footerLines = [], chips = [] } = {}) {
  const capacity = getTerminalLineCapacity();
  const baseReserved =
    countVisualLines(lines) + countVisualLines(footerLines) + (chips.length ? 1 : 0);
  let budget = Math.max(1, capacity - baseReserved);
  let pages = paginateItems(items, budget);
  if (pages.length > 1) {
    const reservedWithPager = baseReserved + 1;
    budget = Math.max(1, capacity - reservedWithPager);
    pages = paginateItems(items, budget);
  }
  return { pages, pageCount: pages.length, capacity };
}

export { countVisualLines, getTerminalLineCapacity, paginateItems, paginateSelectableItems };
