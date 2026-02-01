import clear from "/commands/clear.js";
import { type } from "/utils/io.js";
import { createMetricsScope } from "/utils/metrics.js";
import { loadThreeModules } from "/utils/three/AssetManager.js";
import { createAsciiViewer } from "/utils/three/asciiViewer.js";
import { pushKeymap } from "/utils/keymap.js";

const ASCII_CHARS = " .:-+*=%@#";
const EFFECT_RESOLUTION = 0.2;
const PROFILES = {
  default: {
    label: "Default",
    characters: " .:-+*=%@#",
    resolution: EFFECT_RESOLUTION,
    mode: "ascii",
    flatShading: true,
    roughness: 0.35,
    metalness: 0.1,
    toneMapping: null,
    exposure: 1,
  },
  normal: {
    label: "Normal",
    characters: " .:-+*=%@#",
    resolution: 0.4,
    mode: "render",
    flatShading: true,
    roughness: 0.35,
    metalness: 0.1,
    toneMapping: null,
    exposure: 1,
  },
  wayne90x30: {
    label: "Wayne 90x30",
    characters: " .:-+*=%@#",
    resolution: 0.2,
    mode: "ascii",
    flatShading: false,
    roughness: 0.95,
    metalness: 0,
    toneMapping: "ACES",
    exposure: 1.0,
  },
};
const DEFAULT_CAMERA = { x: -0.6, y: -344.05, z: 74.4 };
const DEFAULT_SCALE = 1.65;
const DEFAULT_ROT_DEG = { x: 0, y: -6, z: -78 };
const DEFAULT_LIGHT = { x: 85.2, y: -213.7, z: 341.5 };
const EVIDENCE_CACHE_TTL = 60 * 1000;
let evidenceCache = { at: 0, models: [] };

const normalizeToken = (value = '') =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

async function getEvidenceModels() {
  const now = Date.now();
  if (evidenceCache.models.length && now - evidenceCache.at < EVIDENCE_CACHE_TTL) {
    return evidenceCache.models;
  }
  try {
    const res = await fetch('/api/evidence', { cache: 'no-store' });
    if (!res.ok) throw new Error('no evidence');
    const data = await res.json();
    const models = Array.isArray(data?.models) ? data.models : [];
    evidenceCache = { at: now, models };
    return models;
  } catch (err) {
    return [];
  }
}

function waitForEnter() {
  return new Promise((resolve) => {
    const dispose = pushKeymap(
      {
        Enter: () => {
          dispose();
          resolve();
          return true;
        },
        NumpadEnter: () => {
          dispose();
          resolve();
          return true;
        },
        Return: () => {
          dispose();
          resolve();
          return true;
        },
      },
      {
        shouldHandle: () => true,
      }
    );
  });
}

async function showJoker({ returnToMain = true, label = "JOKER", stlPath = "/joker.stl" } = {}) {
  const metrics = createMetricsScope("AsciiViewer");
  const terminal = document.querySelector(".terminal");
  if (!terminal) return;
  const screenHost =
    document.querySelector("#screen-container") || terminal;
  const getThemeColors = () => {
    const source =
      document.getElementById("terminal-container") ||
      document.documentElement ||
      document.body;
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
  const modelLabel = String(label || "JOKER").toUpperCase();
  const modelPath = String(stlPath || "/joker.stl");
  metrics.mark("viewer_start", { modelLabel, modelPath });

  clear();
  terminal.classList.add("terminal-viewer-active");
  await type([" ", `CARGANDO ${modelLabel}...`, " "], {
    wait: false,
    initialWait: false,
    finalWait: false,
    speak: false,
  });

  const overlay = document.createElement("div");
  overlay.className = "terminal-ascii-viewer";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  screenHost.appendChild(overlay);

  const ui = document.createElement("div");
  ui.className = "terminal-ascii-ui";
  ui.innerHTML = `
    <div class="terminal-ascii-ui__title">${modelLabel} // ASCII VIEWER</div>
    <label class="terminal-ascii-ui__row">
      <span>PROFILE</span>
      <select data-control="profile">
        <option value="default">Default</option>
        <option value="normal">Normal</option>
        <option value="wayne90x30">Wayne 90x30</option>
      </select>
    </label>
    <label class="terminal-ascii-ui__row">
      <span>LIGHT ROTATION</span>
      <input type="range" min="0" max="360" step="1" value="45" data-control="light-angle" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>LIGHT HEIGHT</span>
      <input type="range" min="-2" max="2" step="0.1" value="1" data-control="light-height" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>ROTATE X</span>
      <input type="range" min="-180" max="180" step="1" value="0" data-control="rotate-x" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>ROTATE Y</span>
      <input type="range" min="-180" max="180" step="1" value="0" data-control="rotate-y" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>ROTATE Z</span>
      <input type="range" min="-180" max="180" step="1" value="0" data-control="rotate-z" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>SCALE</span>
      <input type="range" min="0.4" max="2.5" step="0.05" value="1" data-control="scale" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>LIGHT INT</span>
      <input type="range" min="0.1" max="3" step="0.1" value="2.4" data-control="light-intensity" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>AMBIENT</span>
      <input type="range" min="0.1" max="2" step="0.1" value="0.55" data-control="ambient-intensity" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>ASCII COLOR</span>
      <input type="color" value="#ffffff" data-control="ascii-color" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>LIGHT COLOR</span>
      <input type="color" value="#ffffff" data-control="light-color" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>FILL COLOR</span>
      <input type="color" value="#ffffff" data-control="fill-color" />
    </label>
    <label class="terminal-ascii-ui__row">
      <span>BG COLOR</span>
      <input type="color" value="#000000" data-control="bg-color" />
    </label>
    <div class="terminal-ascii-ui__readout">
      <div data-output="light-pos">LIGHT X:0.0 Y:0.0 Z:0.0</div>
      <div data-output="scale">SCALE: 1.00</div>
      <div data-output="rotate">ROT X:0 Y:0 Z:0</div>
      <div data-output="camera">CAM X:0.0 Y:0.0 Z:0.0</div>
    </div>
    <div class="terminal-ascii-ui__hint">ARRASTRA PARA ROTAR · CTRL/SHIFT/ALT PARA EJES · RUEDA PARA ZOOM · ENTER PARA SALIR</div>
  `;
  screenHost.appendChild(ui);

  let disposed = false;
  let cleanup = () => {};
  const profileState = {};
  let currentProfile = "default";

  const run = async () => {
    const stopModules = metrics.start("load_three");
    let modules = null;
    try {
      modules = await loadThreeModules();
      stopModules({ ok: true });
    } catch (err) {
      stopModules({ ok: false });
      await type([" ", "NO SE PUDO INICIAR THREE.JS", " "], {
        wait: false,
        initialWait: false,
        finalWait: false,
        speak: false,
      });
      return;
    }
    const { THREE, AsciiEffect, STLLoader, OrbitControls } = modules;

    if (disposed) return;

    const viewer = createAsciiViewer({
      THREE,
      AsciiEffect,
      OrbitControls,
      container: overlay,
      profiles: PROFILES,
      initialProfileKey: "default",
      metrics,
      themeSource: document.getElementById("terminal-container") || document.body,
      controlsConfig: {
        enableDamping: true,
        dampingFactor: 0.08,
        enableZoom: true,
        enablePan: true,
        enableRotate: true,
        autoRotate: false,
      },
      onFrame: ({ camera: frameCamera }) => {
        const lightOut = ui.querySelector('[data-output="light-pos"]');
        const scaleOut = ui.querySelector('[data-output="scale"]');
        const rotOut = ui.querySelector('[data-output="rotate"]');
        if (lightOut) {
          lightOut.textContent = `LIGHT X:${keyLight.position.x.toFixed(1)} Y:${keyLight.position.y.toFixed(1)} Z:${keyLight.position.z.toFixed(1)}`;
        }
        if (scaleOut && mesh) {
          scaleOut.textContent = `SCALE: ${Math.abs(mesh.scale.x).toFixed(2)}`;
        }
        if (rotOut && mesh) {
          const rx = (mesh.rotation.x * 180 / Math.PI).toFixed(0);
          const ry = (mesh.rotation.y * 180 / Math.PI).toFixed(0);
          const rz = (mesh.rotation.z * 180 / Math.PI).toFixed(0);
          rotOut.textContent = `ROT X:${rx} Y:${ry} Z:${rz}`;
        }
        const camOut = ui.querySelector('[data-output="camera"]');
        if (camOut) {
          camOut.textContent = `CAM X:${frameCamera.position.x.toFixed(1)} Y:${frameCamera.position.y.toFixed(1)} Z:${frameCamera.position.z.toFixed(1)}`;
        }
      },
    });
    const { scene, camera, renderer } = viewer;
    camera.position.set(0, 0, 160);

    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(120, 160, 200);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0xffffff, 0.9);
    fillLight.position.set(-120, -80, 100);
    scene.add(fillLight);

    let mesh = null;
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.35,
      metalness: 0.1,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    let lightAngle = 45;
    let lightHeight = 1;
    let rotateSpeed = 0.5;
    let lightIntensity = 2.4;
    let ambientIntensity = 0.55;
    const applyThemeColors = () => {
      const colors = getThemeColors();
      if (!colors) return;
      if (colors.fg) {
        viewer.setAsciiColor(colors.fg);
        material.color.set(colors.fg);
        keyLight.color.set(colors.fg);
        fillLight.color.set(colors.fg);
        ambient.color.set(colors.fg);
        const asciiInput = ui.querySelector('[data-control="ascii-color"]');
        const lightInput = ui.querySelector('[data-control="light-color"]');
        const fillInput = ui.querySelector('[data-control="fill-color"]');
        if (asciiInput) asciiInput.value = colors.fg;
        if (lightInput) lightInput.value = colors.fg;
        if (fillInput) fillInput.value = colors.fg;
      }
      if (colors.bg) {
        viewer.setBackgroundColor(colors.bg);
        const bgInput = ui.querySelector('[data-control="bg-color"]');
        if (bgInput) bgInput.value = colors.bg;
      }
      if (profileState[currentProfile]) {
        profileState[currentProfile].asciiColor =
          viewer.getEffect()?.domElement?.style?.color || colors.fg || "#ffffff";
        profileState[currentProfile].bgColor =
          viewer.getEffect()?.domElement?.style?.backgroundColor || colors.bg || "#000000";
      }
    };

    const updateLightPosition = () => {
      if (!mesh || !mesh.geometry?.boundingBox) return;
      const bbox = mesh.geometry.boundingBox;
      const radius = Math.max(bbox.max.z - bbox.min.z, 1) * 2.2;
      const angleRad = (lightAngle * Math.PI) / 180;
      const bboxHeight = bbox.max.y - bbox.min.y;
      const height = bboxHeight * lightHeight;
      const x = Math.cos(angleRad) * radius;
      const z = Math.sin(angleRad) * radius;
      keyLight.position.set(x, height, z);
    };

    const frameBounds = () => {
      if (!mesh || !mesh.geometry || !mesh.geometry.boundingBox) return;
      const bbox = mesh.geometry.boundingBox;
      const size = new THREE.Vector3();
      bbox.getSize(size);
      camera.position.set(DEFAULT_CAMERA.x, DEFAULT_CAMERA.y, DEFAULT_CAMERA.z);
      camera.lookAt(0, 0, 0);
      const activeControls = viewer.getControls();
      if (activeControls) {
        activeControls.target.set(0, 0, 0);
        activeControls.update();
        activeControls.saveState();
      }
      keyLight.position.set(DEFAULT_LIGHT.x, DEFAULT_LIGHT.y, DEFAULT_LIGHT.z);
      const angleDeg = (Math.atan2(DEFAULT_LIGHT.z, DEFAULT_LIGHT.x) * 180) / Math.PI;
      const bboxHeight = bbox.max.y - bbox.min.y || 1;
      lightAngle = (angleDeg + 360) % 360;
      lightHeight = DEFAULT_LIGHT.y / bboxHeight;
      const lightAngleInput = ui.querySelector('[data-control="light-angle"]');
      const lightHeightInput = ui.querySelector('[data-control="light-height"]');
      if (lightAngleInput) lightAngleInput.value = String(lightAngle.toFixed(1));
      if (lightHeightInput) lightHeightInput.value = String(lightHeight.toFixed(2));
    };

    const useGeometry = (geometry) => {
      if (mesh) {
        scene.remove(mesh);
        mesh.geometry.dispose();
      }
      geometry.computeVertexNormals();
      geometry.center();
      geometry.computeBoundingBox();
      mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.set(
        (DEFAULT_ROT_DEG.x * Math.PI) / 180,
        (DEFAULT_ROT_DEG.y * Math.PI) / 180,
        (DEFAULT_ROT_DEG.z * Math.PI) / 180
      );
      mesh.scale.set(DEFAULT_SCALE, DEFAULT_SCALE, DEFAULT_SCALE);
      scene.add(mesh);
      frameBounds();
      const scaleInput = ui.querySelector('[data-control="scale"]');
      const rotateXInput = ui.querySelector('[data-control="rotate-x"]');
      const rotateYInput = ui.querySelector('[data-control="rotate-y"]');
      const rotateZInput = ui.querySelector('[data-control="rotate-z"]');
      if (scaleInput) scaleInput.value = String(DEFAULT_SCALE);
      if (rotateXInput) rotateXInput.value = String(DEFAULT_ROT_DEG.x);
      if (rotateYInput) rotateYInput.value = String(DEFAULT_ROT_DEG.y);
      if (rotateZInput) rotateZInput.value = String(DEFAULT_ROT_DEG.z);
    };

    const loader = new STLLoader();
    const stopStl = metrics.start("stl_load");
    loader.load(
      modelPath,
      (geometry) => {
        stopStl({ ok: true });
        useGeometry(geometry);
      },
      undefined,
      (err) => {
        console.error("STL load failed", err);
        stopStl({ ok: false });
        const fallback = new THREE.TorusKnotGeometry(28, 9, 120, 16);
        useGeometry(fallback);
      }
    );

    const resizeObserver = viewer.observeResize();
    viewer.resize();

    const applyProfileToMaterial = (profileKey = "default") => {
      const profile = PROFILES[profileKey] || PROFILES.default;
      material.flatShading = profile.flatShading;
      material.roughness = profile.roughness;
      material.metalness = profile.metalness;
      material.needsUpdate = true;
      if (profile.toneMapping === "ACES") {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = profile.exposure;
      } else {
        renderer.toneMapping = THREE.NoToneMapping;
        renderer.toneMappingExposure = 1;
      }
      if ("outputColorSpace" in renderer) {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
      } else if ("outputEncoding" in renderer) {
        renderer.outputEncoding = THREE.sRGBEncoding;
      }
    };

    viewer.setProfile("default");
    applyProfileToMaterial("default");
    applyThemeColors();
    viewer.start();
    metrics.mark("render_start");

    const markActive = () => {
      viewer.markActive();
    };

    let axisCleanup = null;
    const setupAxisRotate = (targetEl) => {
      if (!targetEl) return () => {};
      let dragging = false;
      let lastX = 0;
      let lastY = 0;
      const speed = 0.005;

      const onPointerDown = (event) => {
        dragging = true;
        lastX = event.clientX;
        lastY = event.clientY;
      };
      const onPointerMove = (event) => {
        if (!dragging || !mesh) return;
        const axis = event.ctrlKey ? "x" : event.shiftKey ? "y" : event.altKey ? "z" : "";
        if (!axis) return;
        const dx = event.clientX - lastX;
        const dy = event.clientY - lastY;
        lastX = event.clientX;
        lastY = event.clientY;
        if (axis === "x") mesh.rotation.x += dy * speed;
        if (axis === "y") mesh.rotation.y += dx * speed;
        if (axis === "z") mesh.rotation.z += dx * speed;
        const controls = viewer.getControls();
        if (controls) controls.enableRotate = false;
        event.preventDefault();
        event.stopPropagation();
        markActive();
      };
      const onPointerUp = () => {
        dragging = false;
        const controls = viewer.getControls();
        if (controls) controls.enableRotate = true;
      };

      targetEl.addEventListener("pointerdown", onPointerDown);
      targetEl.addEventListener("pointermove", onPointerMove);
      targetEl.addEventListener("pointerup", onPointerUp);
      targetEl.addEventListener("pointerleave", onPointerUp);
      return () => {
        targetEl.removeEventListener("pointerdown", onPointerDown);
        targetEl.removeEventListener("pointermove", onPointerMove);
        targetEl.removeEventListener("pointerup", onPointerUp);
        targetEl.removeEventListener("pointerleave", onPointerUp);
      };
    };

    axisCleanup = setupAxisRotate(
      viewer.getEffect()?.domElement || renderer.domElement
    );
    const handleUiClick = (event) => {
      const action = event.target?.dataset?.action;
      if (!action) return;
    };
    const saveProfileState = (profileKey) => {
      const effect = viewer.getEffect();
      profileState[profileKey] = {
        lightAngle,
        lightHeight,
        lightIntensity,
        ambientIntensity,
        asciiColor: effect?.domElement?.style?.color || "#ffffff",
        bgColor: effect?.domElement?.style?.backgroundColor || "#000000",
        scale: mesh ? Math.abs(mesh.scale.x) : DEFAULT_SCALE,
        rot: mesh
          ? {
              x: (mesh.rotation.x * 180) / Math.PI,
              y: (mesh.rotation.y * 180) / Math.PI,
              z: (mesh.rotation.z * 180) / Math.PI,
            }
          : DEFAULT_ROT_DEG,
      };
    };
    const applyProfileState = (profileKey) => {
      const state = profileState[profileKey];
      if (!state) return;
      const effect = viewer.getEffect();
      lightAngle = state.lightAngle;
      lightHeight = state.lightHeight;
      lightIntensity = state.lightIntensity;
      ambientIntensity = state.ambientIntensity;
      if (mesh) {
        mesh.scale.set(state.scale, state.scale, state.scale);
        mesh.rotation.set(
          (state.rot.x * Math.PI) / 180,
          (state.rot.y * Math.PI) / 180,
          (state.rot.z * Math.PI) / 180
        );
      }
      keyLight.intensity = lightIntensity;
      ambient.intensity = ambientIntensity;
      viewer.setAsciiColor(state.asciiColor);
      viewer.setBackgroundColor(state.bgColor);
    };
    const handleUiInput = (event) => {
      markActive();
      const control = event.target?.dataset?.control;
      if (!control) return;
      if (control === "profile") {
        const nextProfile = event.target.value;
        saveProfileState(currentProfile);
        currentProfile = nextProfile;
        viewer.setProfile(nextProfile);
        applyProfileState(nextProfile);
        applyProfileToMaterial(nextProfile);
        viewer.resize();
        if (axisCleanup) axisCleanup();
        axisCleanup = setupAxisRotate(
          viewer.getEffect()?.domElement || renderer.domElement
        );
        return;
      }
      const value = parseFloat(event.target.value);
      if (Number.isNaN(value)) return;
      if (control === "scale" && mesh) {
        mesh.scale.set(value, value, value);
      }
      if (control === "light-angle") {
        lightAngle = value;
        updateLightPosition();
      }
      if (control === "light-height") {
        lightHeight = value;
        updateLightPosition();
      }
      if (control === "light-intensity") {
        lightIntensity = value;
        keyLight.intensity = lightIntensity;
      }
      if (control === "ambient-intensity") {
        ambientIntensity = value;
        ambient.intensity = ambientIntensity;
      }
      if (control === "ascii-color") {
        viewer.setAsciiColor(event.target.value);
      }
      if (control === "light-color") {
        keyLight.color.set(event.target.value);
      }
      if (control === "fill-color") {
        fillLight.color.set(event.target.value);
      }
      if (control === "bg-color") {
        viewer.setBackgroundColor(event.target.value);
      }
      if (mesh && control === "rotate-x") {
        mesh.rotation.x = (value * Math.PI) / 180;
      }
      if (mesh && control === "rotate-y") {
        mesh.rotation.y = (value * Math.PI) / 180;
      }
      if (mesh && control === "rotate-z") {
        mesh.rotation.z = (value * Math.PI) / 180;
      }
    };
    ui.addEventListener("click", handleUiClick);
    ui.addEventListener("input", handleUiInput);
    const handleThemeChange = () => {
      applyThemeColors();
    };
    window.addEventListener("wopr-theme-change", handleThemeChange);

    let cleanedUp = false;
    cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.removeEventListener("wopr-theme-change", handleThemeChange);
      ui.removeEventListener("click", handleUiClick);
      ui.removeEventListener("input", handleUiInput);
      if (resizeObserver) resizeObserver.disconnect();
      if (mesh) {
        mesh.geometry.dispose();
      }
      material.dispose();
      if (axisCleanup) axisCleanup();
      viewer.dispose();
    };
  };

  run();

  await waitForEnter();

  disposed = true;
  metrics.mark("viewer_exit");
  cleanup();
  if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  if (ui.parentNode) ui.parentNode.removeChild(ui);
  terminal.classList.remove("terminal-viewer-active");

  if (returnToMain) {
    const screens = await import("/utils/screens.js");
    if (screens?.main) {
      screens.main();
    }
  }
}

export default async function show(args = "") {
  const normalized = String(args || "").trim().toLowerCase();
  if (normalized === "joker") {
    await showJoker({ returnToMain: true, label: "JOKER", stlPath: "/joker.stl" });
    return;
  }
  if (normalized === "bala") {
    await showJoker({ returnToMain: true, label: "BALA", stlPath: "/bala.stl" });
    return;
  }
  const evidence = await getEvidenceModels();
  if (evidence.length) {
    const token = normalizeToken(normalized);
    const found = evidence.find((entry) => {
      const id = normalizeToken(entry.id);
      const label = normalizeToken(entry.label);
      const command = normalizeToken(entry.command);
      return token === id || token === label || token === command;
    });
    if (found?.stlPath) {
      const resolvedPath = found.stlPath.startsWith('/uploads/')
        ? `/api${found.stlPath}`
        : found.stlPath;
      await showJoker({
        returnToMain: true,
        label: found.label || found.id,
        stlPath: resolvedPath,
      });
      return;
    }
  }
  await type([" ", "USO: SHOW JOKER | SHOW BALA | SHOW <EVIDENCIA>", " "], {
    wait: false,
    initialWait: false,
    finalWait: false,
    speak: false,
  });
}

async function showBala({ returnToMain = true } = {}) {
  return showJoker({ returnToMain, label: "BALA", stlPath: "/bala.stl" });
}

export { showJoker, showBala };
