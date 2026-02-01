import { createSceneRoot } from "/utils/three/SceneRoot.js";

function createAsciiViewer({
  THREE,
  AsciiEffect,
  OrbitControls,
  container,
  profiles,
  initialProfileKey = "default",
  metrics,
  onFrame,
  controlsConfig = {},
  themeSource,
  idleAfterMs = 0,
  idleFps = 60,
  activeFps = 60,
  idleResolutionScale = 0.6,
} = {}) {
  if (!container) {
    throw new Error("createAsciiViewer requires a container");
  }
  const sceneRoot = createSceneRoot({
    THREE,
    container,
    antialias: false,
    alpha: true,
    fov: 45,
    near: 0.1,
    far: 2000,
    pixelRatioMax: 2,
  });
  const { scene, camera, renderer } = sceneRoot;

  let effect = null;
  let controls = null;
  let outputMode = "ascii";
  let currentProfile = initialProfileKey;
  let rafId = null;
  let lastRender = 0;
  let lastActive = performance.now();
  let idleState = false;
  const asciiStyle = {
    color: "#ffffff",
    backgroundColor: "#000000",
  };
  const resolveThemeSource = () =>
    themeSource ||
    document.getElementById("terminal-container") ||
    document.documentElement ||
    document.body;

  const readThemeColors = () => {
    const source = resolveThemeSource();
    if (!source || typeof getComputedStyle !== "function") return null;
    const styles = getComputedStyle(source);
    const fg =
      styles.getPropertyValue("--fg-primary")?.trim() ||
      styles.getPropertyValue("--color")?.trim();
    const bg =
      styles.getPropertyValue("--bg")?.trim() ||
      styles.getPropertyValue("--background-color")?.trim();
    return { fg, bg };
  };

  const applyTheme = () => {
    const colors = readThemeColors();
    if (!colors) return null;
    if (colors.fg) setAsciiColor(colors.fg);
    if (colors.bg) setBackgroundColor(colors.bg);
    return colors;
  };

  if (typeof window !== "undefined") {
    window.addEventListener("wopr-theme-change", applyTheme);
  }

  const applyEffectStyles = () => {
    if (!effect?.domElement) return;
    effect.domElement.style.color = asciiStyle.color;
    effect.domElement.style.backgroundColor = asciiStyle.backgroundColor;
  };

  const adjustAsciiWidth = () => {
    if (!effect?.domElement) return;
    const table = effect.domElement.querySelector("table");
    if (!table) return;
    const tableWidth = table.offsetWidth;
    if (!tableWidth) return;
    const containerWidth = container.clientWidth || 1;
    const scaleX = containerWidth / tableWidth;
    effect.domElement.style.transform = `scaleX(${scaleX})`;
    effect.domElement.style.transformOrigin = "top left";
  };

  const attachControls = () => {
    if (!OrbitControls) return;
    if (controls?.dispose) controls.dispose();
    const targetEl = outputMode === "ascii" ? effect?.domElement : renderer.domElement;
    if (!targetEl) return;
    controls = new OrbitControls(camera, targetEl);
    controls.enableDamping =
      "enableDamping" in controlsConfig ? controlsConfig.enableDamping : true;
    controls.dampingFactor =
      "dampingFactor" in controlsConfig ? controlsConfig.dampingFactor : 0.08;
    controls.enableZoom =
      "enableZoom" in controlsConfig ? controlsConfig.enableZoom : true;
    controls.enablePan =
      "enablePan" in controlsConfig ? controlsConfig.enablePan : true;
    controls.enableRotate =
      "enableRotate" in controlsConfig ? controlsConfig.enableRotate : true;
    controls.autoRotate =
      "autoRotate" in controlsConfig ? controlsConfig.autoRotate : false;
    controls.addEventListener("change", markActive);
  };

  const detachControls = () => {
    if (!controls) return;
    controls.removeEventListener("change", markActive);
    if (controls.dispose) controls.dispose();
    controls = null;
  };

  const buildEffect = (profileKey, resolutionScale = 1) => {
    const stopBuild = metrics?.start ? metrics.start("build_effect") : null;
    const profile = profiles?.[profileKey] || profiles?.default || {};
    outputMode = profile.mode || "ascii";
    if (effect?.domElement?.parentNode) {
      effect.domElement.parentNode.removeChild(effect.domElement);
    }
    if (renderer?.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    if (outputMode === "ascii") {
      const baseResolution = profile.resolution || 0.4;
      const resolution = baseResolution * resolutionScale;
      const originalGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, options) {
        if (type === "2d" && !options) {
          return originalGetContext.call(this, type, { willReadFrequently: true });
        }
        return originalGetContext.call(this, type, options);
      };
      effect = new AsciiEffect(renderer, profile.characters, {
        invert: true,
        resolution,
      });
      HTMLCanvasElement.prototype.getContext = originalGetContext;
      effect.domElement.classList.add("terminal-ascii-viewer__effect");
      effect.domElement.style.width = "100%";
      effect.domElement.style.height = "100%";
      effect.domElement.style.pointerEvents = "auto";
      applyEffectStyles();
      adjustAsciiWidth();
      container.appendChild(effect.domElement);
    } else {
      effect = null;
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      renderer.domElement.style.display = "block";
      container.appendChild(renderer.domElement);
    }
    detachControls();
    attachControls();
    resize();
    if (stopBuild) {
      stopBuild({ profile: profileKey, mode: outputMode });
    }
    return profile;
  };

  const resize = () => {
    const { width, height } = sceneRoot.resize();
    if (effect) effect.setSize(width, height);
    adjustAsciiWidth();
    return { width, height };
  };

  const observeResize = () => sceneRoot.observeResize();

  const setProfile = (profileKey) => {
    currentProfile = profileKey;
    return buildEffect(profileKey, idleState ? idleResolutionScale : 1);
  };

  const setAsciiColor = (color) => {
    asciiStyle.color = color;
    if (effect?.domElement) {
      effect.domElement.style.color = color;
    }
  };

  const setBackgroundColor = (color) => {
    asciiStyle.backgroundColor = color;
    scene.background = new THREE.Color(color);
    if (effect?.domElement) {
      effect.domElement.style.backgroundColor = color;
    } else {
      renderer.setClearColor(color);
    }
  };

  const markActive = () => {
    lastActive = performance.now();
  };

  const tick = (time = performance.now()) => {
    const idleNow = idleAfterMs > 0 && time - lastActive > idleAfterMs;
    if (idleNow !== idleState) {
      idleState = idleNow;
      buildEffect(currentProfile, idleState ? idleResolutionScale : 1);
    }
    const targetDelta = 1000 / (idleState ? idleFps : activeFps);
    if (time - lastRender < targetDelta) {
      rafId = window.requestAnimationFrame(tick);
      return;
    }
    lastRender = time;
    if (controls) controls.update();
    if (outputMode === "ascii" && effect) {
      effect.render(scene, camera);
      adjustAsciiWidth();
    } else {
      renderer.render(scene, camera);
    }
    if (typeof onFrame === "function") {
      onFrame({ scene, camera, renderer, controls, effect, idle: idleState });
    }
    rafId = window.requestAnimationFrame(tick);
  };

  const start = () => {
    applyTheme();
    buildEffect(currentProfile, 1);
    tick();
  };

  const dispose = () => {
    if (rafId) window.cancelAnimationFrame(rafId);
    detachControls();
    window.removeEventListener("wopr-theme-change", applyTheme);
    if (effect?.domElement?.parentNode) {
      effect.domElement.parentNode.removeChild(effect.domElement);
    }
    if (renderer?.domElement?.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement);
    }
    sceneRoot.dispose();
  };

  return {
    scene,
    camera,
    renderer,
    resize,
    observeResize,
    setProfile,
    setAsciiColor,
    setBackgroundColor,
    markActive,
    start,
    dispose,
    getEffect: () => effect,
    getControls: () => controls,
  };
}

export { createAsciiViewer };
