function isPortraitNarrow() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  const narrowPortrait = window.matchMedia("(max-width: 639px) and (orientation: portrait)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const hoverCapable = window.matchMedia("(hover: hover)").matches;
  const touchDevice =
    !finePointer &&
    !hoverCapable &&
    (window.matchMedia("(pointer: coarse)").matches ||
      window.matchMedia("(hover: none)").matches);
  return narrowPortrait && touchDevice;
}

function getWrapLimit(defaultLimit = 60, portraitLimit = 40) {
  return isPortraitNarrow() ? portraitLimit : defaultLimit;
}

export { isPortraitNarrow, getWrapLimit };
