import {
  parse,
  submitInput,
  focusInput,
  isInputActive,
  navigateHistory,
  setFastMode,
  getFastMode,
} from "/utils/io.js";
import {
  moveSelection,
  setSelectedElement,
  getSelectedElement,
  getSelectionContext,
  activateSelection,
  hasPendingSelection,
  clearSelectables,
} from "/utils/selection.js";
import clear from "/commands/clear.js";

const TOUCH_MODE_STORAGE_KEY = "touchModeEnabled";
const state = {
  initialized: false,
  enabled: false,
  overlay: null,
  savedFastMode: null,
};

const TOUCH_DEBUG_VERSION = "touch-v2";

function readPreference() {
  try {
    const stored = localStorage.getItem(TOUCH_MODE_STORAGE_KEY);
    if (stored === null) return null;
    return stored === "true";
  } catch (e) {
    return null;
  }
}

function isDesktopPointer() {
  const fine = window.matchMedia("(pointer: fine)").matches;
  const hoverCapable = window.matchMedia("(hover: hover)").matches;
  return fine || hoverCapable;
}

function shouldAutoEnable() {
  if (isDesktopPointer()) return false;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  const hoverless = window.matchMedia("(hover: none)").matches;
  return coarse || hoverless;
}

function setTouchMode(enabled, { persist = true } = {}) {
  state.enabled = Boolean(enabled);
  document.body.classList.toggle("touch-mode", state.enabled);
  if (state.overlay) {
    state.overlay.classList.toggle("is-active", state.enabled);
  }
  if (state.enabled) {
    state.savedFastMode = getFastMode();
    setFastMode(true);
  } else if (state.savedFastMode !== null) {
    setFastMode(state.savedFastMode);
    state.savedFastMode = null;
  }
  if (persist) {
    try {
      localStorage.setItem(TOUCH_MODE_STORAGE_KEY, String(state.enabled));
    } catch (e) {}
  }
}

function ensureOverlay() {
  if (state.overlay) return;
  const container = document.querySelector("#terminal-container");
  if (!container) return;

  const overlay = document.createElement("div");
  overlay.classList.add("touch-overlay");
  overlay.innerHTML = `
    <button class="touch-key" data-touch-action="up" aria-label="Move up">UP</button>
    <button class="touch-key" data-touch-action="down" aria-label="Move down">DOWN</button>
    <button class="touch-key touch-key--primary" data-touch-action="enter" aria-label="Select">ENTER</button>
    <button class="touch-key" data-touch-action="back" aria-label="Back">BACK</button>
    <button class="touch-key" data-touch-action="status" aria-label="Status">STATUS</button>
  `;
  overlay.addEventListener("click", (event) => {
    const key = event.target.closest("[data-touch-action]");
    if (!key) return;
    event.preventDefault();
    handleTouchAction(key.dataset.touchAction);
  });

  container.appendChild(overlay);
  state.overlay = overlay;
}

function flashTap(element) {
  if (!element) return;
  element.classList.add("touch-tap");
  setTimeout(() => {
    element.classList.remove("touch-tap");
  }, 180);
}

function prepareScreenForSelection() {
  clear();
  clearSelectables();
}

function triggerSelectedAction(element) {
  if (!element) return false;
  const action = element.dataset.action || "";
  const value = element.dataset.value || "";
  if (!action) return false;
  if (document.body.classList.contains("touch-mode")) {
    prepareScreenForSelection();
  }
  if (action === "input") {
    if (submitInput(value)) return true;
    focusInput();
    setTimeout(() => submitInput(value), 0);
    return true;
  }
  if (action === "command") {
    parse(value);
    if (isInputActive()) {
      setTimeout(() => focusInput(), 0);
    }
    return true;
  }
  return false;
}

function handleSelectableTap(target, { confirm = false } = {}) {
  if (!target) return;
  setSelectedElement(target);
  flashTap(target);
  if (confirm) {
    activateSelection();
    if (!hasPendingSelection()) {
      triggerSelectedAction(target);
    }
  }
}

function handleTouchAction(action) {
  if (action === "up") {
    if (!moveSelection(-1)) {
      navigateHistory("up");
    }
    return;
  }
  if (action === "down") {
    if (!moveSelection(1)) {
      navigateHistory("down");
    }
    return;
  }
  if (action === "enter") {
    const selected = activateSelection();
    if (selected) {
      triggerSelectedAction(selected);
    } else if (isInputActive()) {
      submitInput();
    }
    return;
  }
  if (action === "back") {
    const context = getSelectionContext();
    if (context?.backValue && context?.backAction === "input") {
      submitInput(context.backValue);
      return;
    }
    if (context?.backValue && context?.backAction === "command") {
      parse(context.backValue);
      return;
    }
    return;
  }
  if (action === "status") {
    parse("status");
    if (isInputActive()) {
      setTimeout(() => focusInput(), 0);
    }
    return;
  }
}

function handleKeyNavigation(event) {
  if (isInputActive()) return;
  if (event.key === "ArrowUp") {
    event.preventDefault();
    moveSelection(-1);
  } else if (event.key === "ArrowDown") {
    event.preventDefault();
    moveSelection(1);
  } else if (event.key === "Enter") {
    event.preventDefault();
    const selected = activateSelection();
    if (selected) {
      triggerSelectedAction(selected);
    }
  }
}

function bindSelectableHandler() {
  const terminal = document.querySelector(".terminal");
  if (!terminal) return;
  let lineReturnLastTap = 0;

  terminal.addEventListener("pointerdown", (event) => {
    if (handleLineReturnTap(event)) {
      return;
    }
    const target = event.target.closest("[data-selectable='true']");
    if (!target) return;
    event.preventDefault();
    event.stopPropagation();
    if (event.pointerType === "touch") {
      handleSelectableTap(target, { confirm: true });
      return;
    }
    handleSelectableTap(target, { confirm: true });
  });

  function handleLineReturnTap(event) {
    if (!document.body.classList.contains("line-message-active")) return false;
    if (event.pointerType !== "touch") return false;
    const now = Date.now();
    if (lineReturnLastTap && now - lineReturnLastTap <= DOUBLE_TAP_MS) {
      lineReturnLastTap = 0;
      window.dispatchEvent(new CustomEvent("line-return-double-tap"));
      return true;
    }
    lineReturnLastTap = now;
    window.dispatchEvent(new CustomEvent("line-return-double-tap"));
    return true;
  }
}

function initTouchMode() {
  if (state.initialized) return;
  state.initialized = true;

  ensureOverlay();
  bindSelectableHandler();
  // Tap-only selection on touch mode; keep keyboard input untouched elsewhere.

  console.log(`[TUI] touch init ${TOUCH_DEBUG_VERSION}`, {
    coarse: window.matchMedia("(pointer: coarse)").matches,
    fine: window.matchMedia("(pointer: fine)").matches,
    hover: window.matchMedia("(hover: hover)").matches,
    hoverless: window.matchMedia("(hover: none)").matches,
    autoEnable: shouldAutoEnable(),
  });

  if (!shouldAutoEnable()) {
    setTouchMode(false, { persist: false });
  } else {
    const pref = readPreference();
    if (pref !== null) {
      setTouchMode(pref, { persist: false });
    } else {
      setTouchMode(true, { persist: false });
    }
  }

  window.addEventListener("resize", () => {
    if (!shouldAutoEnable()) {
      setTouchMode(false, { persist: false });
      return;
    }
    const stored = readPreference();
    if (stored === null) {
      setTouchMode(true, { persist: false });
    }
  });
}

export { initTouchMode, setTouchMode, shouldAutoEnable };
