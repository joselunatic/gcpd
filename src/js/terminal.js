var woprsound = new Audio("/assets/sounds/wopr-humming.mp3");
woprsound.muted = true;

async function initTouch() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/touch.js` /* @vite-ignore */
  );
  if (module?.initTouchMode) {
    module.initTouchMode();
  }
}

initTouch();

function setTuiPalette(palette = "") {
  const container = document.getElementById("terminal-container");
  if (!container) return;
  const next = String(palette || "").toLowerCase();
  container.classList.remove("terminal-theme--green", "terminal-theme--amber");
  if (next === "green") {
    container.classList.add("terminal-theme--green");
  } else if (next === "amber") {
    container.classList.add("terminal-theme--amber");
  }
  try {
    localStorage.setItem("tuiPalette", next);
  } catch (e) {
    console.debug("Storage unavailable for tuiPalette", e);
  }
  window.dispatchEvent(
    new CustomEvent("wopr-theme-change", { detail: { palette: next } })
  );
}

window.setTuiPalette = setTuiPalette;

try {
  const storedPalette = localStorage.getItem("tuiPalette");
  if (storedPalette) {
    setTuiPalette(storedPalette);
  }
} catch (e) {
  console.debug("Storage unavailable for tuiPalette", e);
}

window.addEventListener("playwoprsound", (event) => {
  console.log("Terminal event listener playwoprsound: ", event);
  if (woprsound.muted) return;
  woprsound.loop = true;
  woprsound.play();
});

window.addEventListener("stopwoprsound", (event) => {
  console.log("Terminal event listener stopwoprsound: ", event);
  woprsound.pause();
});

async function dialer() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    console.log("[Terminal]", new Date().toISOString(), "dialer()");
    module.dialer();
  }
}

async function login() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    console.log("[Terminal]", new Date().toISOString(), "login()");
    module.login();
  }
}

async function mapScreen() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    console.log("[Terminal]", new Date().toISOString(), "mapScreen()");
    if (module.osMenu) {
      module.osMenu();
    } else if (module.games) {
      module.games();
    }
  }
}

async function main_with_info() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    console.log("[Terminal]", new Date().toISOString(), "main_with_info()");
    module.main_with_info();
  }
}

// Check if query param is set and load that command
async function loadingTerminal() {
  console.log("[Terminal]", new Date().toISOString(), "loadingTerminal()");
  let screen = document.querySelector(".terminal");
  const isDevFast =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_DEV_MODE === "1";
  let screenStatus = localStorage.getItem("screenStatus");
  if (!screenStatus) {
    screenStatus = sessionStorage.getItem("screenStatus");
  }
  if (isDevFast) {
    screenStatus = "os-remote";
  }
  if (
    screen &&
    screen.innerHTML.trim() &&
    screen.dataset?.screenStatus === screenStatus
  ) {
    return;
  }
  if (screen) {
    screen.innerHTML = "";
  }
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (isDevFast && module && typeof module.restoreTerminalState === "function") {
    const restored = await module.restoreTerminalState({
      status: "os-remote",
      context: { lineIndex: 3 },
    });
    if (restored) {
      return;
    }
  }
  const allowResumeBase =
    module && typeof module.shouldAllowResume === "function"
      ? module.shouldAllowResume()
      : true;
  const allowResume = isDevFast ? false : allowResumeBase;
  if (allowResume && module && module.restoreTerminalSnapshot) {
    const restored = module.restoreTerminalSnapshot(screenStatus);
    if (restored) {
      return;
    }
  }
  document.body.classList.remove("resume-static");
  if (module) {
    const savedState =
      typeof module.getTerminalState === "function"
        ? module.getTerminalState()
        : null;
    if (
      allowResume &&
      savedState &&
      typeof module.restoreTerminalState === "function"
    ) {
      const restored = await module.restoreTerminalState(savedState);
      if (restored) {
        return;
      }
    }
  }
  console.log("[Terminal]", new Date().toISOString(), "loadingTerminal screenStatus:", screenStatus);
  if (screenStatus === "dialer") {
    dialer();
  } else if (screenStatus === "login") {
    login();
  } else if (screenStatus === "map" || screenStatus === "games") {
    mapScreen();
  } else if (screenStatus === "main") {
    main_with_info();
  } else {
    dialer();
  }
}

function globalListener() {
  const element = document.querySelector("#input");
  if (!element) return;
  if (document.body.classList.contains("dialer-mode")) return;
  element.focus();
}

document.addEventListener("keydown", globalListener);

function handleSelectableKeys(event) {
  const key = event.key;
  if (key !== "ArrowUp" && key !== "ArrowDown") return;
  if (event.__woprHandled) return;
  const hasSelectables = document.querySelector("[data-selectable='true']");
  if (!hasSelectables) return;
  event.preventDefault();
  event.stopPropagation();
  event.__woprHandled = true;
  import(
    `${import.meta.env.BASE_URL}utils/selection.js` /* @vite-ignore */
  ).then((module) => {
    if (!module) return;
    if (key === "ArrowUp") {
      module.moveSelection(-1);
      return;
    }
    if (key === "ArrowDown") {
      module.moveSelection(1);
      return;
    }
  });
}

document.addEventListener("keydown", handleSelectableKeys, { capture: true });

document.addEventListener("click", () => {
  if (document.body.classList.contains("touch-mode")) {
    return;
  }
  if (document.body.classList.contains("dialer-mode")) {
    return;
  }
  const element = document.querySelector("#input");
  if (element) {
    element.focus();
  }
});

// // Define some stuff on the window so we can use it directly from the HTML
// Object.assign(window, {
//   loadingTerminal,
//   theme,
//   fly,
//   handleClick,
// });

export { loadingTerminal };
