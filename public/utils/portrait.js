function isPortraitNarrow() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(max-width: 639px) and (orientation: portrait)").matches;
}

function getWrapLimit(defaultLimit = 60, portraitLimit = 40) {
  return isPortraitNarrow() ? portraitLimit : defaultLimit;
}

export { isPortraitNarrow, getWrapLimit };
