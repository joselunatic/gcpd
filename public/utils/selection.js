const state = {
  items: [],
  index: -1,
  context: {},
  pendingResolve: null,
};

function clearSelectionStyles() {
  state.items.forEach((item) => item.classList.remove("is-selected"));
}

function updateSelectionStyles() {
  clearSelectionStyles();
  if (state.index < 0 || state.index >= state.items.length) return;
  state.items[state.index].classList.add("is-selected");
}

function setSelectables(items, { defaultIndex = 0, context = {} } = {}) {
  clearSelectables();
  state.items = (items || []).filter(Boolean);
  state.context = context || {};
  if (!state.items.length) {
    state.index = -1;
    return;
  }
  state.index = Math.max(0, Math.min(defaultIndex, state.items.length - 1));
  updateSelectionStyles();
}

function clearSelectables() {
  clearSelectionStyles();
  state.items = [];
  state.index = -1;
  state.context = {};
  state.pendingResolve = null;
}

function moveSelection(delta) {
  if (!state.items.length) return false;
  const total = state.items.length;
  const next = (state.index + delta + total) % total;
  state.index = next;
  updateSelectionStyles();
  return true;
}

function setSelectedElement(element) {
  if (!element) return false;
  const index = state.items.indexOf(element);
  if (index === -1) return false;
  state.index = index;
  updateSelectionStyles();
  return true;
}

function getSelectedElement() {
  if (state.index < 0) return null;
  return state.items[state.index] || null;
}

function getSelectionContext() {
  return state.context || {};
}

function waitForSelection() {
  return new Promise((resolve) => {
    state.pendingResolve = resolve;
  });
}

function activateSelection() {
  const selected = getSelectedElement();
  if (state.pendingResolve) {
    const resolve = state.pendingResolve;
    state.pendingResolve = null;
    resolve(selected);
  }
  return selected;
}

function hasPendingSelection() {
  return Boolean(state.pendingResolve);
}

export {
  setSelectables,
  clearSelectables,
  moveSelection,
  setSelectedElement,
  getSelectedElement,
  getSelectionContext,
  waitForSelection,
  activateSelection,
  hasPendingSelection,
};
