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
    module.dialer();
  }
}

async function login() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    module.login();
  }
}

async function mapScreen() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    if (module.mapConsole) {
      module.mapConsole();
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
    module.main_with_info();
  }
}

async function main() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/screens.js` /* @vite-ignore */
  );
  if (module) {
    module.main();
  }
}

async function type(...args) {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/io.js` /* @vite-ignore */
  );
  if (module) {
    module.type(args);
  }
}

async function parse(...args) {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/io.js` /* @vite-ignore */
  );
  if (module) {
    module.parse(args);
  }
}

// Check if query param is set and load that command
async function loadingTerminal() {
  let screen = document.querySelector(".terminal");
  let screenStatus = localStorage.getItem("screenStatus");
  if (!screenStatus) {
    screenStatus = sessionStorage.getItem("screenStatus");
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
  if (module && module.restoreTerminalSnapshot) {
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
      savedState &&
      typeof module.restoreTerminalState === "function"
    ) {
      const restored = await module.restoreTerminalState(savedState);
      if (restored) {
        return;
      }
    }
  }
  console.log("loadingTerminal. screenStatus: ", screenStatus);
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

function handleClick(event) {
  if (event) {
    event.preventDefault();
  }
  if (document.body.classList.contains("touch-mode")) {
    return;
  }
  let input = document.querySelector("[contenteditable='true']");
  if (input) {
    input.focus();
  }
}

function fly(event) {
  event.target.classList.toggle("fly");
}

async function click() {
  const module = await import(
    `${import.meta.env.BASE_URL}utils/sounds.js` /* @vite-ignore */
  );
  if (module) {
    module.click();
  }
}

function theme(event) {
  click();
  let theme = event.target.dataset.theme;
  [...document.getElementsByClassName("theme")].forEach((b) =>
    b.classList.toggle("active", false)
  );
  event.target.classList.add("active");
  document.body.classList = "theme-" + theme;
  handleClick();
}

function globalListener({ keyCode }) {
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
  const input = document.querySelector("[contenteditable='true']");
  const hasSelectables = document.querySelector("[data-selectable='true']");
  if (!hasSelectables) return;
  event.preventDefault();
  event.stopPropagation();
  event.__woprHandled = true;
  import(`${import.meta.env.BASE_URL}utils/selection.js`).then((module) => {
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
