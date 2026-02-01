import { typeSound } from "/utils/sounds.js";
import pause from "/utils/pause.js";
import say from "/utils/speak.js";
import {
  setSelectables,
  hasPendingSelection,
  activateSelection,
  getSelectedElement,
} from "/utils/selection.js";

// Command history
let prev = getHistory();
let historyIndex = -1;
let tmp = "";
let interval;
const FAST_MODE_STORAGE_KEY = "ttyFastMode";
const FAST_MODE_MULTIPLIER = 0.15;
const MIN_TICK_MS = 4;
let fastMode = false;
let activeInput = null;

try {
  fastMode = localStorage.getItem(FAST_MODE_STORAGE_KEY) === "true";
} catch (e) {}

function setFastMode(enabled) {
  fastMode = Boolean(enabled);
  try {
    localStorage.setItem(FAST_MODE_STORAGE_KEY, String(fastMode));
  } catch (e) {}
}

function getFastMode() {
  return fastMode;
}

function toggleFastMode() {
  setFastMode(!fastMode);
}

window.addEventListener("keydown", (event) => {
  if (event.altKey && event.shiftKey && event.code === "KeyF") {
    event.preventDefault();
    toggleFastMode();
  }
});

function applySpeedDelay(value) {
  if (!value) return 0;
  if (!fastMode) return value;
  return Math.round(value * FAST_MODE_MULTIPLIER);
}

function applySpeedTick(value) {
  if (!value) return 0;
  if (!fastMode) return value;
  const adjusted = Math.round(value * FAST_MODE_MULTIPLIER);
  return Math.max(MIN_TICK_MS, adjusted);
}

function countWords(str) {
  const arr = str.split(" ");
  return arr.filter((word) => word !== "").length;
}

async function isUrlFound(url) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      cache: "no-cache",
    });
    return response.status === 200;
  } catch (error) {
    // console.log(error);
    const mute = error;
    return false;
  }
}

function getHistory() {
  let storage = localStorage.getItem("commandHistory");
  let prev;
  if (storage) {
    try {
      let json = JSON.parse(storage);
      prev = Array.isArray(json) ? json : [];
    } catch (e) {
      prev = [];
    }
  } else {
    prev = [];
  }
  return prev;
}

function addToHistory(cmd) {
  prev = [cmd, ...prev];
  historyIndex = -1;
  tmp = "";

  try {
    localStorage.setItem("commandHistory", JSON.stringify(prev));
  } catch (e) {}
}

function setActiveInput({ element, onKeyDown, resolve, pw }) {
  activeInput = { element, onKeyDown, resolve, pw };
}

function clearActiveInput() {
  if (activeInput?.element && activeInput?.onKeyDown) {
    activeInput.element.removeEventListener("keydown", activeInput.onKeyDown);
  }
  activeInput = null;
}

function isInputActive() {
  return Boolean(
    activeInput?.element &&
      activeInput.element.getAttribute("contenteditable") === "true"
  );
}

function focusInput() {
  if (activeInput?.element) {
    activeInput.element.focus();
  }
}

function navigateHistory(direction) {
  if (!activeInput?.element) return false;
  const element = activeInput.element;
  if (direction === "up") {
    if (historyIndex === -1) tmp = element.textContent;
    historyIndex = Math.min(prev.length - 1, historyIndex + 1);
    element.textContent = prev[historyIndex] || "";
  } else if (direction === "down") {
    historyIndex = Math.max(-1, historyIndex - 1);
    element.textContent = prev[historyIndex] || tmp;
  }
  moveCaretToEnd(element);
  return true;
}

function submitInput(value) {
  if (!activeInput?.element) return false;
  const element = activeInput.element;
  const text = value != null ? String(value) : element.textContent || "";
  element.textContent = text;
  element.setAttribute("contenteditable", false);
  addToHistory(text);
  if (activeInput.pw) {
    element.setAttribute("data-pw", Array(text.length).fill("*").join(""));
  }
  const resolve = activeInput.resolve;
  clearActiveInput();
  resolve(cleanInput(text));
  return true;
}

/**
 * Convert a character that needs to be typed into something that can be shown on the screen.
 * Newlines becomes <br>
 * Tabs become three spaces.
 * Spaces become &nbsp;
 * */
function getChar(char) {
  let result;
  if (typeof char === "string") {
    if (char === "\n") {
      result = document.createElement("br");
    } else if (char === "\t") {
      let tab = document.createElement("span");
      tab.innerHTML = "&nbsp;&nbsp;&nbsp;";
      result = tab;
    } else if (char === " ") {
      let space = document.createElement("span");
      space.innerHTML = "&nbsp;";
      space.classList.add("char");
      result = space;
    } else {
      let span = document.createElement("span");
      span.classList.add("char");
      span.textContent = char;
      result = span;
    }
  }
  return result;
}

/** Types the given text on the screen */
async function type(
  text,
  {
    wait = 50,
    initialWait = 1000,
    finalWait = 500,
    typerClass = "",
    useContainer = false,
    stopBlinking = true,
    processChars = true,
    clearContainer = false,
    speak = false,
  } = {},
  container = document.querySelector(".terminal")
) {
  return new Promise(async (resolve) => {
    const startedAt = performance.now();
    const preview =
      typeof text === "string"
        ? text.slice(0, 32)
        : Array.isArray(text)
        ? String(text[0] || "").slice(0, 32)
        : "";
    console.log(
      "[TYPER]",
      new Date().toISOString(),
      "start",
      preview
    );
    //console.log("Type");
    if (interval) {
      console.log(
        "[TYPER]",
        new Date().toISOString(),
        "clearing previous interval"
      );
      clearInterval(interval);
      interval = null;
    }
    // Create a div where all the characters can be appended to (or use the given container)
    let typer = useContainer ? container : document.createElement("div");
    typer.classList.add("typer", "active");

    if (typerClass) {
      typer.classList.add(typerClass);
    }
    // Handy if reusing the same container
    if (clearContainer) {
      container.innerHTML = "&nbsp;";
    }

    if (!useContainer) {
      container.appendChild(typer);
    }

    const adjustedInitialWait = applySpeedDelay(initialWait);
    if (adjustedInitialWait) {
      await pause(adjustedInitialWait / 1000);
    }

    let queue = text;
    if (processChars) {
      if (Array.isArray(text)) {
        text = text.join("\n");
      }
      queue = text.split("");
    }

    let prev;

    if (speak) {
      say(text);
    }

    // Use an interval to repeatedly pop a character from the queue and type it on screen
    const adjustedWait = applySpeedTick(wait);
    interval = setInterval(async () => {
      if (queue.length) {
        let char = queue.shift();

        // This is an optimisation for typing a large number of characters on the screen.
        // It seems the performance degrades when trying to add 500+ DOM elements rapidly on the screen.
        // So the content of the previous element is moved to the typer container and removed, which
        // reduces the amount of DOM elements.
        // This may cause issues when the element is removed while the character is still animating (red screen)
        if (processChars && prev) {
          prev.remove();
          if (prev.firstChild && prev.firstChild.nodeType === Node.TEXT_NODE) {
            typer.innerText += prev.innerText;
          } else {
            typer.appendChild(prev);
          }
        }
        let element = processChars ? getChar(char) : char;
        if (element) {
          typer.appendChild(element);

          if (element.nodeName === "BR") {
            scroll(container);
          } else if (!processChars) {
            scroll(container);
          }
        }
        prev = element;
      } else {
        // When the queue is empty, clean up the interval
        clearInterval(interval);
        const adjustedFinalWait = applySpeedDelay(finalWait);
        if (adjustedFinalWait) {
          await pause(adjustedFinalWait / 1000);
        }
        if (stopBlinking) {
          typer.classList.remove("active");
        }
        console.log(
          "[TYPER]",
          new Date().toISOString(),
          "done",
          preview,
          "dt",
          performance.now() - startedAt
        );
        resolve();
      }
    }, adjustedWait);
  });
}

function createLineNode(lineInput = "", { selectable = false, action = "", value = "" } = {}) {
  const line = document.createElement("div");
  line.classList.add("terminal-line");
  let plainText = "";
  if (typeof lineInput === "string" || typeof lineInput === "number") {
    plainText = String(lineInput ?? "");
    line.textContent = plainText;
  } else if (lineInput && typeof lineInput === "object") {
    if (lineInput.className) {
      String(lineInput.className)
        .split(" ")
        .filter(Boolean)
        .forEach((cls) => line.classList.add(cls));
    }
    if (lineInput.semantic) {
      line.classList.add(`tui-${String(lineInput.semantic)}`);
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
        line.appendChild(span);
      });
    } else {
      plainText = String(lineInput.text || "");
      line.textContent = plainText;
    }
  }
  if (plainText) {
    line.dataset.text = plainText;
  }
  if (selectable) {
    line.classList.add("touch-selectable");
    line.dataset.selectable = "true";
    if (action) line.dataset.action = action;
    if (value) line.dataset.value = value;
  }
  return line;
}

function createCommandChip(
  label,
  { action = "command", value = "", labelHtml = "", hotkey = "" } = {}
) {
  const chip = document.createElement("span");
  chip.classList.add("command-chip", "touch-selectable");
  chip.dataset.selectable = "true";
  chip.dataset.action = action;
  chip.dataset.value = value || label.toLowerCase();
  if (hotkey) {
    chip.dataset.hotkey = String(hotkey).toUpperCase();
  }
  if (labelHtml) {
    chip.innerHTML = `[${labelHtml}]`;
  } else {
    chip.textContent = `[${label}]`;
  }
  return chip;
}

async function renderSelectableLines(
  {
    lines = [],
    items = [],
    footerLines = [],
    chips = [],
    context = {},
    defaultIndex = 0,
  } = {},
  options = {}
) {
  const queue = [];
  lines.forEach((line) => queue.push(createLineNode(line)));

  const selectableElements = [];
  items.forEach((item, index) => {
    const itemLines = Array.isArray(item.lines) ? item.lines : [item.lines];
    const value = item.value != null ? String(item.value) : String(index + 1);
    itemLines.forEach((line, lineIndex) => {
      if (lineIndex === 0) {
        const node = createLineNode(line, {
          selectable: true,
          action: item.action || "",
          value,
        });
        selectableElements.push(node);
        queue.push(node);
      } else {
        queue.push(createLineNode(line));
      }
    });
  });

  if (chips.length) {
    const chipLine = document.createElement("div");
    chipLine.classList.add("terminal-line", "terminal-line--chips");
    chips.forEach((chip, index) => {
      if (index > 0) {
        chipLine.appendChild(document.createTextNode(" "));
      }
      const chipEl = createCommandChip(chip.label, {
        action: chip.action,
        value: chip.value,
        labelHtml: chip.labelHtml,
        hotkey: chip.hotkey,
      });
      selectableElements.push(chipEl);
      chipLine.appendChild(chipEl);
    });
    queue.push(chipLine);
  }

  footerLines.forEach((line) => queue.push(createLineNode(line)));

  await type(queue, {
    processChars: false,
    stopBlinking: true,
    ...options,
  });

  if (selectableElements.length) {
    setSelectables(selectableElements, { context, defaultIndex });
  } else {
    setSelectables([], { context, defaultIndex });
  }
}

async function renderLayout({
  headerLines = [],
  bodyLines = [],
  footerLines = [],
  promptLines = [],
  items = [],
  chips = [],
  context = {},
  defaultIndex = 0,
} = {}, options = {}) {
  const lines = [];
  if (headerLines.length) {
    lines.push(...headerLines);
  }
  if (bodyLines.length) {
    if (lines.length) lines.push(" ");
    lines.push(...bodyLines);
  }
  const combinedFooter = [...footerLines, ...promptLines].filter(Boolean);
  return renderSelectableLines({
    lines,
    items,
    footerLines: combinedFooter,
    chips,
    context,
    defaultIndex,
  }, options);
}

async function renderCommandChips(chips = [], options = {}) {
  if (!chips.length) return;
  return renderSelectableLines({ chips }, options);
}

function formatSemanticLines(lines, semantic) {
  if (!semantic) return lines;
  const tag = `[${semantic.toUpperCase()}] `;
  return lines.map((line) => `${tag}${line}`);
}

async function print(lines, { semantic = "", ...options } = {}) {
  const list = Array.isArray(lines) ? lines : [String(lines || "")];
  const decorated = formatSemanticLines(list, semantic);
  const typerClass = semantic ? `typer--${semantic.toLowerCase()}` : "";
  return type(decorated, { ...options, typerClass });
}

function isPrintable(keycode) {
  //console.log("Keycode: ", keycode);
  return (
    (keycode > 47 && keycode < 58) || // number keys
    keycode === 32 || // spacebar & return key(s) (if you want to allow carriage returns)
    (keycode > 64 && keycode < 91) // letter keys
    // (keycode > 95 && keycode < 112) // numpad keys
    // || (keycode > 185 && keycode < 193) // ;=,-./` (in order)
    // || (keycode > 218 && keycode < 223)
  );
}

function moveCaretToEnd(el) {
  var range, selection;
  if (document.createRange) {
    range = document.createRange(); //Create a range (a range is a like the selection but invisible)
    range.selectNodeContents(el); //Select the entire contents of the element with the range
    range.collapse(false); //collapse the range to the end point. false means collapse to end rather than the start
    selection = window.getSelection(); //get the selection object (allows you to change selection)
    selection.removeAllRanges(); //remove any selections already made
    selection.addRange(range); //make the range you have just created the visible selection
  }
}

/** Shows an input field, returns a resolved promise with the typed text on <enter> */
async function input(pw = false, options = {}) {
  //console.log("Input begin");
  return new Promise((resolve) => {
    // This handles all user input
    //console.log("Input continue");
    const onKeyDown = (event) => {
      //console.log("Key down", event.keyCode);
      if (event.keyCode !== 13 && event.keyCode !== 8) {
        if (!isPrintable(event.keyCode)) {
          event.preventDefault();
          //console.log("Not printable");
          return;
        }
      }

      typeSound();
      // ENTER
      if (event.keyCode === 13) {
        const rawText = event.target.textContent || "";
        if (!rawText.trim()) {
          if (hasPendingSelection()) {
            event.preventDefault();
            activateSelection();
            return;
          }
          const selected = getSelectedElement();
          if (selected) {
            const action = selected.dataset.action || "";
            const value = selected.dataset.value || "";
            event.preventDefault();
            if (action === "command") {
              parse(value);
              return;
            }
            if (action === "input") {
              submitInput(value);
              return;
            }
          }
        }
        event.preventDefault();
        submitInput(event.target.textContent);
      }
      // UP
      else if (event.keyCode === 38) {
        navigateHistory("up");
      }
      // DOWN
      else if (event.keyCode === 40) {
        navigateHistory("down");
      }
      // BACKSPACE
      else if (event.keyCode === 8) {
        // Prevent inserting a <br> when removing the last character
        if (event.target.textContent.length === 1) {
          event.preventDefault();
          event.target.innerHTML = "";
        }
      }
      // Check if character can be shown as output (skip if CTRL is pressed)
      else if (isPrintable(event.keyCode) && !event.ctrlKey) {
        //console.log("IsPrintable: ", isPrintable(event.keyCode));
        event.preventDefault();
        // Wrap the character in a span
        let span = document.createElement("span");

        let keyCode = event.keyCode;
        let chrCode = keyCode - 48 * Math.floor(keyCode / 48);
        let chr = String.fromCharCode(96 <= keyCode ? chrCode : keyCode);
        // Add span to the input
        span.classList.add("char");
        span.textContent = chr;
        event.target.appendChild(span);

        // For password field, fill the data-pw attr with asterisks
        // which will be shown using CSS
        if (pw) {
          let length = event.target.textContent.length;
          -event.target.setAttribute(
            "data-pw",
            Array(length).fill("*").join("")
          );
        }
        moveCaretToEnd(event.target);
      } else {
        //console.log("Not printable");
      }
    };
    //console.log("Test");

    // Add input to terminal
    let terminal = document.querySelector(".terminal");
    let input = document.createElement("span");
    input.setAttribute("id", "input");
    if (pw) {
      input.classList.add("password");
    }
    input.setAttribute("contenteditable", true);
    input.addEventListener("keydown", onKeyDown);
    terminal.appendChild(input);
    setActiveInput({ element: input, onKeyDown, resolve, pw });
    if (options?.hint) {
      const hint = document.createElement("div");
      hint.classList.add("input-hint");
      hint.textContent = options.hint;
      terminal.insertBefore(hint, input);
    }
    input.addEventListener("focus", () => {
      document.body.classList.add("keyboard-open");
      scroll(terminal);
      input.scrollIntoView({ block: "end" });
    });
    input.addEventListener("blur", () => {
      document.body.classList.remove("keyboard-open");
    });
    setTimeout(() => input.focus(), 0);
  });
}

// Processes the user input and executes a command
async function parse(input) {
  console.log("Parse");
  input = cleanInput(input);

  if (!input) {
    return;
  }
  // Only allow words, separated by space
  let matches = String(input).match(/^(\w+)(?:\s((?:\w+(?:\s\w+)*)))?$/);
  let command = matches[1];
  let args = matches[2];

  if (!matches) {
    //throw new Error("INVALID COMMAND");fuck
    command = "__invalid";
  }

  let naughty = ["fuck", "shit", "die", "ass", "cunt", "asshole", "idiot"];
  if (naughty.some((word) => command.includes(word))) {
    command = "__language";
  }

  console.log("Matches: ", matches[0]);
  let isValidCommand = await isUrlFound(`/commands/${command}.js`);
  console.log("Command valid: ", isValidCommand);
  if (!isValidCommand && countWords(matches[0]) < 3) {
    command = "__invalid";
    isValidCommand = true;
  }

  if (isValidCommand) {
    let module;
    // Try to import the command function
    try {
      module = await import(`/commands/${command}.js`);
    } catch (e) {
      console.error(e);
      // Kinda abusing TypeError to check if the import failed
      if (e instanceof TypeError) {
        return await type("UNKNOWN COMMAND");
      }
      // E.g. syntax error while executing the command
      else {
        return await type("Error while executing command");
      }
    }

    if (module && module.stylesheet) {
      addStylesheet(module.stylesheet);
    }
    // Try to import and parse any HTML templates that the command module exports
    if (module && module.template) {
      await loadTemplates(`../templates/${module.template}.html`);
    }

    // Show any output if the command exports any
    if (module && module.output) {
      await type(module.output);
    }

    await pause();

    // Execute the command (default export)
    if (module.default) {
      await module.default(args);
    }
  } else {
    if (countWords(matches[0]) >= 3) {
      console.log("Input has 3 or more words");
      let module;
      // Try to import the command function
      try {
        module = await import("/commands/__sentences.js");
      } catch (e) {
        console.error(e);
        // Kinda abusing TypeError to check if the import failed
        if (e instanceof TypeError) {
          return await type("UNKNOWN COMMAND");
        }
        // E.g. syntax error while executing the command
        else {
          return await type("Error while executing command");
        }
      }
      // Show any output if the command exports any
      if (module && module.output) {
        await type(module.output);
      }

      await pause();

      // Execute the command (default export)
      if (module.default) {
        await module.default(matches[0]);
      }
    }
  }
  return;
}

function cleanInput(input) {
  const input_lowercase = input.toLowerCase().trim();
  const input_wo_extra_spaces = input_lowercase.replace(/[\n\r\s\t]+/g, " ");
  //console.log("No extra spaces: ", input_wo_extra_spaces);
  const cleaned_input = input_wo_extra_spaces.replace(/[^a-zA-Z0-9\-_\s]/g, "");
  //const cleaned_input = input_lowercase.replace(/^[-\w]+$/, " ");
  //console.log("Cleaned: ", cleaned_input);
  return cleaned_input.trim();
}

function scroll(el = document.querySelector(".terminal")) {
  el.scrollTop = el.scrollHeight;
}

/** Types the given text and asks input */
async function prompt(text, pw = false, speak = false, options = {}) {
  await type(text, { speak: speak });
  return input(pw, options);
}

/** Sets a global event listeners and returns when a key is hit */
async function waitForKey() {
  return new Promise((resolve) => {
    const handle = () => {
      document.removeEventListener("keyup", handle);
      document.removeEventListener("click", handle);
      resolve();
    };
    document.addEventListener("keyup", handle);
    document.addEventListener("click", handle);
  });
}

function addStylesheet(file) {
  let head = document.getElementsByTagName("HEAD")[0];

  // Create new link Element
  let link = document.createElement("link");

  // set the attributes for link element
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = `style/${file}.css`;

  // Append link element to HTML head
  head.appendChild(link);
}

export {
  prompt,
  input,
  cleanInput,
  type,
  print,
  parse,
  scroll,
  waitForKey,
  renderSelectableLines,
  renderLayout,
  renderCommandChips,
  submitInput,
  focusInput,
  isInputActive,
  navigateHistory,
  setFastMode,
  getFastMode,
};
