const keymapStack = [];
let listenerAttached = false;

function onKeydown(event) {
  if (!keymapStack.length) return;
  const entry = keymapStack[keymapStack.length - 1];
  if (!entry) return;
  if (event.__woprHandled) return;
  if (entry.shouldHandle && !entry.shouldHandle(event)) return;
  const map = entry.map || {};
  const key = event.key;
  const code = event.code;
  const handler = map[key] || map[code] || map["*"];
  if (typeof handler !== "function") return;
  const handled = handler(event);
  if (handled !== false) {
    event.preventDefault();
    event.stopPropagation();
    event.__woprHandled = true;
  }
}

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  document.addEventListener("keydown", onKeydown, { capture: true });
}

function pushKeymap(map = {}, options = {}) {
  const entry = {
    map,
    shouldHandle: options.shouldHandle || null,
  };
  keymapStack.push(entry);
  ensureListener();
  return () => {
    const index = keymapStack.lastIndexOf(entry);
    if (index >= 0) {
      keymapStack.splice(index, 1);
    }
  };
}

export { pushKeymap };
