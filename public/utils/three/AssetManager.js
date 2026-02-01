async function loadThreeModules({ timeoutMs = 2000, intervalMs = 50 } = {}) {
  if (window.__three && window.__AsciiEffect && window.__STLLoader) {
    return {
      THREE: window.__three,
      AsciiEffect: window.__AsciiEffect,
      STLLoader: window.__STLLoader,
      OrbitControls: window.__OrbitControls,
    };
  }
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (window.__three && window.__AsciiEffect && window.__STLLoader) {
      return {
        THREE: window.__three,
        AsciiEffect: window.__AsciiEffect,
        STLLoader: window.__STLLoader,
        OrbitControls: window.__OrbitControls,
      };
    }
  }
  throw new Error("Three.js modules not available");
}

export { loadThreeModules };
