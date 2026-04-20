import { type } from "/utils/io.js";

const ASSET_PATH = "/assets/ballistics";
const assetImages = new Map();

function resolveAssetSrc(entry = {}) {
  const pngPath = String(entry.pngPath || "").trim();
  if (pngPath) return pngPath;
  const assetId = String(entry.assetId || "").trim();
  if (!assetId) return "";
  return `${ASSET_PATH}/${assetId}.png`;
}

function getAssetKey(entry = {}) {
  return String(entry.pngPath || entry.assetId || "");
}

function normalizeCaseCode(value = "") {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (cleaned.length >= 3) return cleaned.slice(0, 3);
  if (cleaned.length === 2) return `${cleaned}X`;
  if (cleaned.length === 1) return `${cleaned}XX`;
  return "XXX";
}

function loadAssetImage(entry = {}) {
  const key = getAssetKey(entry);
  if (!key) return Promise.resolve(null);
  const cached = assetImages.get(key);
  if (cached) {
    if (cached instanceof HTMLImageElement) {
      return Promise.resolve(cached);
    }
    return cached;
  }
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      assetImages.set(key, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = resolveAssetSrc(entry);
  });
  assetImages.set(key, promise);
  return promise;
}

function deriveAssetId(entry = {}) {
  if (entry.assetId) return String(entry.assetId);
  const rawPath = String(entry.pngPath || "");
  if (!rawPath) return "";
  const parts = rawPath.split("/").filter(Boolean);
  const file = parts[parts.length - 1] || "";
  return file.replace(/\.png$/i, "");
}

async function loadBallisticsModels() {
  try {
    const res = await fetch("/api/ballistics", { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models : [];
  } catch (error) {
    console.warn("Failed to load ballistics models:", error);
    return [];
  }
}

async function preloadAssets(dataset) {
  const tasks = dataset.map((entry) => loadAssetImage(entry));
  await Promise.all(tasks);
}

function drawAssetOverlay(canvas, entry, side) {
  const ctx = canvas.getContext("2d");
  const img = assetImages.get(getAssetKey(entry));
  if (!img || !(img instanceof HTMLImageElement)) return;
  const halfWidth = img.width / 2;
  const sourceX = side === "left" ? 0 : halfWidth;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.globalAlpha = 0.65;
  ctx.drawImage(img, sourceX, 0, halfWidth, img.height, 0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp01(x) {
  return Math.max(0, Math.min(1, x));
}

function circularShift(arr, shift) {
  const n = arr.length;
  const out = new Array(n);
  const s = ((shift % n) + n) % n;
  for (let i = 0; i < n; i++) out[(i + s) % n] = arr[i];
  return out;
}

function addNoise(arr, rand, amount = 0.06) {
  return arr.map((v) => clamp01(v + (rand() - 0.5) * 2 * amount));
}

function cosineSimilarity(a, b) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const x = a[i] - 0.5;
    const y = b[i] - 0.5;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (!na || !nb) return 0;
  return dot / Math.sqrt(na * nb);
}

function bestCircularSimilarity(a, b) {
  // quick + believable: check a few candidate shifts around current
  // for now brute-force small step count to keep it simple.
  const n = a.length;
  const step = Math.max(1, Math.floor(n / 64));
  let best = -1;
  let bestShift = 0;
  for (let s = 0; s < n; s += step) {
    const bs = circularShift(b, s);
    const score = cosineSimilarity(a, bs);
    if (score > best) {
      best = score;
      bestShift = s;
    }
  }
  return { score: best, shift: bestShift };
}

function generateRiflingPattern(seed, n = 512) {
  const rand = mulberry32(seed);
  const arr = new Array(n);
  // base stripes + wobble + micro scratches
  const stripes = 8 + Math.floor(rand() * 9); // 8..16
  const wobble = 0.15 + rand() * 0.25;
  const scratch = 0.10 + rand() * 0.20;
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const base = 0.5 + 0.38 * Math.sin(2 * Math.PI * stripes * t + rand() * 0.2);
    const w = wobble * Math.sin(2 * Math.PI * (2 + Math.floor(rand() * 4)) * t + 10 * rand());
    const s = scratch * (rand() < 0.08 ? (rand() * 0.6) : 0);
    const v = clamp01(base + w - s + (rand() - 0.5) * 0.08);
    arr[i] = v;
  }
  return arr;
}

function drawStripTexture(canvas, pattern, { tint = "#9fe7ff" } = {}) {
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  // background
  ctx.fillStyle = "#040b11";
  ctx.fillRect(0, 0, w, h);

  // stripes
  for (let x = 0; x < w; x++) {
    const v = pattern[Math.floor((x / w) * pattern.length)] ?? 0.5;
    const c = Math.floor(30 + v * 180);
    ctx.fillStyle = `rgba(${c}, ${c + 10}, ${c + 35}, 0.92)`;
    ctx.fillRect(x, 0, 1, h);
  }

  // CRT scanlines
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  for (let y = 0; y < h; y += 3) ctx.fillRect(0, y, w, 1);

  // tint overlay
  ctx.fillStyle = tint;
  ctx.globalAlpha = 0.08;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 1;

  // vignette
  const g = ctx.createRadialGradient(w * 0.5, h * 0.5, h * 0.1, w * 0.5, h * 0.5, h * 0.8);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function ensureOverlay() {
  let overlay = document.getElementById("ballistica-overlay");
  if (overlay) return overlay;

  const container =
    document.getElementById("screen-container") ||
    document.getElementById("terminal") ||
    document.getElementById("terminal-container") ||
    document.body;
  overlay = document.createElement("div");
  overlay.id = "ballistica-overlay";
  overlay.classList.add("ballistica-overlay");
  overlay.innerHTML = `
    <div class="ballistica-crt">
      <div class="ballistica-header">
        <div class="ballistica-title">BALISTICA // MATCHER</div>
        <div class="ballistica-hint">TAB selecciona panel · ingresa el codigo y ENTER · MATCH compara · ESC salir</div>
      </div>
      <div class="ballistica-panels">
        <div class="ballistica-panel" data-side="left">
          <div class="ballistica-label">IZQ</div>
          <div class="ballistica-code">
            <span>COD</span>
            <input class="ballistica-code-input" data-side="left" maxlength="1" />
          </div>
          <canvas class="ballistica-canvas" width="512" height="256"></canvas>
          <div class="ballistica-meta"></div>
        </div>
        <div class="ballistica-panel" data-side="right">
          <div class="ballistica-label">DER</div>
          <div class="ballistica-code">
            <span>COD</span>
            <input class="ballistica-code-input" data-side="right" maxlength="2" />
          </div>
          <canvas class="ballistica-canvas" width="512" height="256"></canvas>
          <div class="ballistica-meta"></div>
        </div>
      </div>
      <div class="ballistica-result">
        <canvas class="ballistica-result-canvas" width="1024" height="256"></canvas>
      </div>
      <div class="ballistica-footer">
        <button class="ballistica-match" type="button">MATCH</button>
        <div class="ballistica-status"></div>
      </div>
    </div>
  `;

  container.appendChild(overlay);
  return overlay;
}

function removeOverlay() {
  const overlay = document.getElementById("ballistica-overlay");
  if (overlay) overlay.remove();
}

function makeDataset(models = []) {
  const fallback = [
    {
      bulletId: "BULLET-01",
      caseId: "gcpd-XYZ-JKL",
      caseCode: "XYZ",
      crime: "HOMICIDIO",
      location: "NARROWS",
      status: "ABIERTO",
      closedBy: "",
      assetId: "b01",
      caliber: "9mm",
      material: "copper-jacketed",
    },
    {
      bulletId: "BULLET-02",
      caseId: "gcpd-ABC-TUV",
      caseCode: "ABC",
      crime: "ASALTO",
      location: "BURNSIDE",
      status: "ABIERTO",
      closedBy: "",
      assetId: "b02",
      caliber: ".45 ACP",
      material: "lead core",
    },
    {
      bulletId: "BULLET-03",
      caseId: "gcpd-DEF-QRS",
      caseCode: "DEF",
      crime: "ROBO",
      location: "OLD GOTHAM",
      status: "CERRADO",
      closedBy: "AGT. HOLLAND",
      assetId: "b03",
      caliber: "5.56 NATO",
      material: "steel-core",
    },
    {
      bulletId: "BULLET-04",
      caseId: "gcpd-GHI-MNO",
      caseCode: "GHI",
      crime: "SECUESTRO",
      location: "TRICORNER",
      status: "ABIERTO",
      closedBy: "",
      assetId: "b04",
      caliber: "7.62x39",
      material: "molybdenum",
    },
    {
      bulletId: "BULLET-05",
      caseId: "gcpd-JKL-PQR",
      caseCode: "JKL",
      crime: "EXTORSION",
      location: "THE BOWERY",
      status: "CERRADO",
      closedBy: "AGT. MONTES",
      assetId: "b05",
      caliber: ".50 BMG",
      material: "blackened",
    },
    {
      bulletId: "BULLET-06",
      caseId: "gcpd-MNO-STU",
      caseCode: "MNO",
      crime: "HOMICIDIO",
      location: "EAST END",
      status: "ABIERTO",
      closedBy: "",
      assetId: "b06",
      caliber: "11.43x33",
      material: "monel",
    },
  ];
  const bullets = (Array.isArray(models) && models.length
    ? models.map((entry, index) => ({
        bulletId: entry.bulletId || `BULLET-${String(index + 1).padStart(2, "0")}`,
        caseId:
          entry.caseId ||
          entry.caseNumber ||
          `gcpd-${String(index + 1).padStart(4, "0")}`,
        caseCode: normalizeCaseCode(entry.caseCode),
        crime: entry.crime || "SIN CRIMEN",
        location: entry.location || "SIN UBICACION",
        status: entry.status || "ABIERTO",
        closedBy: entry.closedBy || "",
        assetId: deriveAssetId(entry) || `b${String(index + 1).padStart(2, "0")}`,
        pngPath: entry.pngPath || "",
        caliber: entry.caliber || "CALIBRE",
        material: entry.material || "MATERIAL",
        label: entry.label || "",
      }))
    : fallback);

  const dataset = bullets.map((b, idx) => {
    const seed = 1337 + idx * 101;
    const base = generateRiflingPattern(seed);
    const randA = mulberry32(seed + 1);
    const randB = mulberry32(seed + 2);

    const shiftB = 30 + (idx * 17) % 120;
    const halfA = addNoise(base, randA, 0.05);
    const halfB = addNoise(circularShift(base, shiftB), randB, 0.05);

    return {
      ...b,
      halves: {
        A: { id: `${b.bulletId}-A`, pattern: halfA },
        B: { id: `${b.bulletId}-B`, pattern: halfB },
      },
      // store the true shift for a "perfect" match
      __idealShift: shiftB,
    };
  });

  return dataset;
}

async function startBallistica() {
  const overlay = ensureOverlay();
  const models = await loadBallisticsModels();
  const dataset = makeDataset(models);

  const state = {
    active: "left",
    leftIndex: null,
    rightIndex: null,
    leftCandidates: [],
    rightCandidates: [],
    leftCursor: 0,
    rightCursor: 0,
    leftRot: 0,
    rightRot: 0,
    lastResult: "",
  };

  const panels = {
    left: overlay.querySelector(".ballistica-panel[data-side=left]"),
    right: overlay.querySelector(".ballistica-panel[data-side=right]"),
  };
  const panelsWrapper = overlay.querySelector(".ballistica-panels");
  const codeInputs = {
    left: overlay.querySelector(".ballistica-code-input[data-side=left]"),
    right: overlay.querySelector(".ballistica-code-input[data-side=right]"),
  };
  const canvases = {
    left: panels.left.querySelector("canvas"),
    right: panels.right.querySelector("canvas"),
  };
  const metas = {
    left: panels.left.querySelector(".ballistica-meta"),
    right: panels.right.querySelector(".ballistica-meta"),
  };
  const statusEl = overlay.querySelector(".ballistica-status");
  const matchButton = overlay.querySelector(".ballistica-match");
  const resultWrapper = overlay.querySelector(".ballistica-result");
  const resultCanvas = overlay.querySelector(".ballistica-result-canvas");

  statusEl.textContent = "CARGANDO IMAGENES BALISTICAS...";
  try {
    await preloadAssets(dataset);
  } catch (error) {
    console.error("Ballistica asset loading failed:", error);
    statusEl.textContent = "ERROR CARGANDO IMAGENES BALISTICAS";
  }

  function setActive(side) {
    state.active = side;
    panels.left.classList.toggle("is-active", side === "left");
    panels.right.classList.toggle("is-active", side === "right");
  }

  function findIndexByLeftChar(char) {
    const target = String(char || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
    if (!target) return -1;
    return dataset.findIndex((entry) => entry.caseCode?.[0] === target);
  }

  function findIndexByRightChars(chars) {
    const target = String(chars || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    if (target.length !== 2) return -1;
    return dataset.findIndex((entry) => entry.caseCode?.slice(1) === target);
  }

  function findCandidatesByLeftChar(char) {
    const target = String(char || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
    if (!target) return [];
    return dataset
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => entry.caseCode?.[0] === target)
      .map(({ idx }) => idx);
  }

  function findCandidatesByRightChars(chars) {
    const target = String(chars || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
    if (target.length !== 2) return [];
    return dataset
      .map((entry, idx) => ({ entry, idx }))
      .filter(({ entry }) => entry.caseCode?.slice(1) === target)
      .map(({ idx }) => idx);
  }

  function render() {
    const left = Number.isInteger(state.leftIndex) ? dataset[state.leftIndex] : null;
    const right = Number.isInteger(state.rightIndex) ? dataset[state.rightIndex] : null;

    // map rotation (0..2pi) -> circular shift of texture
    const n = left ? left.halves.A.pattern.length : right?.halves.B.pattern.length;
    const shiftL = Math.round((state.leftRot / (Math.PI * 2)) * (n || 1));
    const shiftR = Math.round((state.rightRot / (Math.PI * 2)) * (n || 1));

    if (left) {
      const pattL = circularShift(left.halves.A.pattern, shiftL);
      drawStripTexture(canvases.left, pattL, { tint: "#9fe7ff" });
      drawAssetOverlay(canvases.left, left, "left");
    } else {
      const ctx = canvases.left.getContext("2d");
      ctx.clearRect(0, 0, canvases.left.width, canvases.left.height);
    }

    if (right) {
      const pattR = circularShift(right.halves.B.pattern, shiftR);
      drawStripTexture(canvases.right, pattR, { tint: "#9fe7ff" });
      drawAssetOverlay(canvases.right, right, "right");
    } else {
      const ctx = canvases.right.getContext("2d");
      ctx.clearRect(0, 0, canvases.right.width, canvases.right.height);
    }

    statusEl.textContent = state.lastResult || "LISTO. Ingresa codigos y compara.";
  }

  function renderResult(left, right) {
    if (!resultCanvas || !left || !right) return;
    const ctx = resultCanvas.getContext("2d");
    ctx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    const halfWidth = Math.floor(resultCanvas.width / 2);

    const tempLeft = document.createElement("canvas");
    tempLeft.width = halfWidth;
    tempLeft.height = resultCanvas.height;
    const pattL = circularShift(left.halves.A.pattern, 0);
    drawStripTexture(tempLeft, pattL, { tint: "#9fe7ff" });
    drawAssetOverlay(tempLeft, left, "left");
    ctx.drawImage(tempLeft, 0, 0);

    const tempRight = document.createElement("canvas");
    tempRight.width = halfWidth;
    tempRight.height = resultCanvas.height;
    const pattR = circularShift(right.halves.B.pattern, 0);
    drawStripTexture(tempRight, pattR, { tint: "#9fe7ff" });
    drawAssetOverlay(tempRight, right, "right");
    ctx.drawImage(tempRight, halfWidth, 0);
  }

  async function compare() {
    if (!Number.isInteger(state.leftIndex) || !Number.isInteger(state.rightIndex)) {
      state.lastResult = "CODIGOS INCOMPLETOS.";
      metas.left.textContent = "";
      metas.right.textContent = "";
      render();
      return;
    }
    const left = dataset[state.leftIndex];
    const right = dataset[state.rightIndex];
    if (left.caseCode && right.caseCode && left.caseCode === right.caseCode) {
      state.lastResult = [
        "MATCH EXITOSO",
        `CASE: ${left.caseId || "SIN CASO"}`,
        `CRIMEN: ${left.crime || "SIN CRIMEN"}`,
        `LOCALIZACION: ${left.location}`,
        `ESTADO: ${left.status}`,
      ].join(" | ");
      const label = left.label ? `${left.label} · ` : "";
      const closedBy =
        /cerrado/i.test(left.status) && left.closedBy ? `\nCERRADO POR: ${left.closedBy}` : "";
      const metaText = `${label}${left.assetId} · ${left.caliber} · ${left.material}\nREF: ${left.bulletId}${closedBy}`;
      metas.left.textContent = metaText;
      metas.right.textContent = "";
      if (resultWrapper) {
        renderResult(left, right);
        resultWrapper.classList.add("is-visible");
      }
      if (panelsWrapper) panelsWrapper.classList.add("is-hidden");
      if (codeInputs.left) codeInputs.left.blur();
      if (codeInputs.right) codeInputs.right.blur();
    } else {
      state.lastResult = "NO MATCH.";
      metas.left.textContent = "";
      metas.right.textContent = "";
      if (resultWrapper) {
        resultWrapper.classList.remove("is-visible");
      }
      if (panelsWrapper) panelsWrapper.classList.remove("is-hidden");
    }
    render();
  }

  function cleanup() {
    window.removeEventListener("keydown", onKeyDown, true);
    removeOverlay();
  }

  function onKeyDown(event) {
    const key = event.key;
    if (key === "Escape") {
      event.preventDefault();
      cleanup();
      return;
    }
    if (key === "Tab") {
      event.preventDefault();
      setActive(state.active === "left" ? "right" : "left");
      return;
    }

    const active = state.active;

    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      const dir = key === "ArrowUp" ? -1 : 1;
      if (active === "left" && state.leftCandidates.length) {
        state.leftCursor =
          (state.leftCursor + dir + state.leftCandidates.length) % state.leftCandidates.length;
        state.leftIndex = state.leftCandidates[state.leftCursor];
        state.lastResult = "";
        render();
      } else if (active === "right" && state.rightCandidates.length) {
        state.rightCursor =
          (state.rightCursor + dir + state.rightCandidates.length) % state.rightCandidates.length;
        state.rightIndex = state.rightCandidates[state.rightCursor];
        state.lastResult = "";
        render();
      }
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      if (active === "left" && Number.isInteger(state.leftIndex)) state.leftRot -= 0.18;
      else if (active === "right" && Number.isInteger(state.rightIndex)) state.rightRot -= 0.18;
      render();
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      if (active === "left" && Number.isInteger(state.leftIndex)) state.leftRot += 0.18;
      else if (active === "right" && Number.isInteger(state.rightIndex)) state.rightRot += 0.18;
      render();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      return;
    }
  }

  setActive("left");
  window.addEventListener("keydown", onKeyDown, true);
  if (codeInputs.left) {
    codeInputs.left.addEventListener("input", (event) => {
      const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
      event.target.value = value;
    });
    codeInputs.left.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 1);
      const candidates = findCandidatesByLeftChar(value);
      if (candidates.length) {
        state.leftCandidates = candidates;
        state.leftCursor = 0;
        state.leftIndex = candidates[0];
        state.lastResult = "";
        render();
        if (resultWrapper) resultWrapper.classList.remove("is-visible");
        if (panelsWrapper) panelsWrapper.classList.remove("is-hidden");
      } else {
        state.lastResult = "CODIGO IZQ NO ENCONTRADO.";
        state.leftCandidates = [];
        state.leftIndex = null;
        render();
        if (resultWrapper) resultWrapper.classList.remove("is-visible");
        if (panelsWrapper) panelsWrapper.classList.remove("is-hidden");
      }
    });
  }
  if (codeInputs.right) {
    codeInputs.right.addEventListener("input", (event) => {
      const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
      event.target.value = value;
    });
    codeInputs.right.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 2);
      if (value.length < 2) return;
      const candidates = findCandidatesByRightChars(value);
      if (candidates.length) {
        state.rightCandidates = candidates;
        state.rightCursor = 0;
        state.rightIndex = candidates[0];
        state.lastResult = "";
        render();
        if (resultWrapper) resultWrapper.classList.remove("is-visible");
        if (panelsWrapper) panelsWrapper.classList.remove("is-hidden");
      } else {
        state.lastResult = "CODIGO DER NO ENCONTRADO.";
        state.rightCandidates = [];
        state.rightIndex = null;
        render();
        if (resultWrapper) resultWrapper.classList.remove("is-visible");
        if (panelsWrapper) panelsWrapper.classList.remove("is-hidden");
      }
    });
  }
  if (matchButton) {
    matchButton.addEventListener("click", () => {
      compare();
    });
  }
  render();

  await type(["", "BALISTICA: modo grafico activo. ESC para salir.", ""], { wait: false });
  // Block until overlay is closed.
  await new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (!document.getElementById("ballistica-overlay")) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

export { startBallistica };
export default startBallistica;
