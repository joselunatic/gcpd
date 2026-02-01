import { type } from "/utils/io.js";

const ASSET_PATH = "/assets/ballistics";
const assetImages = new Map();

function loadAssetImage(assetId) {
  const cached = assetImages.get(assetId);
  if (cached) {
    if (cached instanceof HTMLImageElement) {
      return Promise.resolve(cached);
    }
    return cached;
  }
  const promise = new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      assetImages.set(assetId, img);
      resolve(img);
    };
    img.onerror = reject;
    img.src = `${ASSET_PATH}/${assetId}.png`;
  });
  assetImages.set(assetId, promise);
  return promise;
}

async function preloadAssets(dataset) {
  const tasks = dataset.map((entry) => loadAssetImage(entry.assetId));
  await Promise.all(tasks);
}

function drawAssetOverlay(canvas, assetId, side) {
  const ctx = canvas.getContext("2d");
  const img = assetImages.get(assetId);
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

  const container = document.getElementById("screen-container") || document.body;
  overlay = document.createElement("div");
  overlay.id = "ballistica-overlay";
  overlay.innerHTML = `
    <div class="ballistica-crt">
      <div class="ballistica-header">
        <div class="ballistica-title">BALISTICA // MATCHER</div>
        <div class="ballistica-hint">TAB cambia panel · \u2190/\u2192 rota · \u2191/\u2193 cambia bala · ENTER compara · ESC salir</div>
      </div>
      <div class="ballistica-panels">
        <div class="ballistica-panel" data-side="left">
          <div class="ballistica-label">IZQ</div>
          <canvas class="ballistica-canvas" width="512" height="256"></canvas>
          <div class="ballistica-meta"></div>
        </div>
        <div class="ballistica-panel" data-side="right">
          <div class="ballistica-label">DER</div>
          <canvas class="ballistica-canvas" width="512" height="256"></canvas>
          <div class="ballistica-meta"></div>
        </div>
      </div>
      <div class="ballistica-footer">
        <div class="ballistica-status"></div>
      </div>
    </div>
  `;

  // Minimal styling inline to avoid touching CSS right now.
  const style = document.createElement("style");
  style.textContent = `
    #ballistica-overlay{ position:absolute; inset:0; z-index:9999; display:flex; align-items:center; justify-content:center; padding:24px; }
    #ballistica-overlay .ballistica-crt{ width:min(980px, 96vw); background:rgba(2,8,12,0.92); border:1px solid rgba(120,200,255,0.28); box-shadow:0 0 0 2px rgba(0,0,0,0.6), 0 0 50px rgba(80,170,255,0.10); backdrop-filter: blur(2px); }
    #ballistica-overlay .ballistica-header{ padding:12px 14px; border-bottom:1px solid rgba(120,200,255,0.18); }
    #ballistica-overlay .ballistica-title{ font-family: monospace; letter-spacing:0.14em; color:#bfeaff; font-size:14px; }
    #ballistica-overlay .ballistica-hint{ font-family: monospace; opacity:0.75; color:#8fcbe6; font-size:11px; margin-top:6px; }
    #ballistica-overlay .ballistica-panels{ display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:14px; }
    #ballistica-overlay .ballistica-panel{ border:1px solid rgba(120,200,255,0.18); padding:10px; position:relative; }
    #ballistica-overlay .ballistica-panel.is-active{ border-color: rgba(190,240,255,0.85); box-shadow: 0 0 0 1px rgba(190,240,255,0.35) inset; }
    #ballistica-overlay .ballistica-label{ position:absolute; top:8px; left:10px; font-family: monospace; color:#bfeaff; opacity:0.7; font-size:12px; }
    #ballistica-overlay .ballistica-canvas{ width:100%; height:auto; display:block; margin-top:14px; image-rendering: pixelated; }
    #ballistica-overlay .ballistica-meta{ font-family: monospace; color:#a7dff7; opacity:0.85; font-size:12px; margin-top:8px; min-height:34px; white-space:pre-line; }
    #ballistica-overlay .ballistica-footer{ padding:10px 14px 14px; border-top:1px solid rgba(120,200,255,0.18); }
    #ballistica-overlay .ballistica-status{ font-family: monospace; color:#bfeaff; font-size:12px; opacity:0.9; }
  `;

  overlay.appendChild(style);
  container.appendChild(overlay);
  return overlay;
}

function removeOverlay() {
  const overlay = document.getElementById("ballistica-overlay");
  if (overlay) overlay.remove();
}

function makeDataset() {
  // Internal bullet IDs stable; case fields editable later.
  const bullets = [
    {
      bulletId: "BULLET-01",
      caseNumber: "gcpd-0001",
      crime: "HOMICIDIO",
      location: "NARROWS",
      status: "ABIERTO",
      assetId: "b01",
      caliber: "9mm",
      material: "copper-jacketed",
    },
    {
      bulletId: "BULLET-02",
      caseNumber: "gcpd-0002",
      crime: "ASALTO",
      location: "BURNSIDE",
      status: "ABIERTO",
      assetId: "b02",
      caliber: ".45 ACP",
      material: "lead core",
    },
    {
      bulletId: "BULLET-03",
      caseNumber: "gcpd-0003",
      crime: "ROBO",
      location: "OLD GOTHAM",
      status: "CERRADO",
      assetId: "b03",
      caliber: "5.56 NATO",
      material: "steel-core",
    },
    {
      bulletId: "BULLET-04",
      caseNumber: "gcpd-0004",
      crime: "SECUESTRO",
      location: "TRICORNER",
      status: "ABIERTO",
      assetId: "b04",
      caliber: "7.62x39",
      material: "molybdenum",
    },
    {
      bulletId: "BULLET-05",
      caseNumber: "gcpd-0005",
      crime: "EXTORSION",
      location: "THE BOWERY",
      status: "CERRADO",
      assetId: "b05",
      caliber: ".50 BMG",
      material: "blackened",
    },
    {
      bulletId: "BULLET-06",
      caseNumber: "gcpd-0006",
      crime: "HOMICIDIO",
      location: "EAST END",
      status: "ABIERTO",
      assetId: "b06",
      caliber: "11.43x33",
      material: "monel",
    },
  ];

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
  const dataset = makeDataset();

  const state = {
    active: "left",
    leftIndex: 0,
    rightIndex: 1,
    leftRot: 0,
    rightRot: 0,
    lastResult: "",
  };

  const panels = {
    left: overlay.querySelector(".ballistica-panel[data-side=left]"),
    right: overlay.querySelector(".ballistica-panel[data-side=right]"),
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

  function render() {
    const left = dataset[state.leftIndex];
    const right = dataset[state.rightIndex];

    // map rotation (0..2pi) -> circular shift of texture
    const n = left.halves.A.pattern.length;
    const shiftL = Math.round((state.leftRot / (Math.PI * 2)) * n);
    const shiftR = Math.round((state.rightRot / (Math.PI * 2)) * n);

    const pattL = circularShift(left.halves.A.pattern, shiftL);
    const pattR = circularShift(right.halves.B.pattern, shiftR);

    drawStripTexture(canvases.left, pattL, { tint: "#9fe7ff" });
    drawAssetOverlay(canvases.left, left.assetId, "left");
    drawStripTexture(canvases.right, pattR, { tint: "#9fe7ff" });
    drawAssetOverlay(canvases.right, right.assetId, "right");

    metas.left.textContent = `${left.assetId} · ${left.caliber} · ${left.material}\n${left.halves.A.id}\nREF: ${left.bulletId}\nCASE: ${left.caseNumber}`;
    metas.right.textContent = `${right.assetId} · ${right.caliber} · ${right.material}\n${right.halves.B.id}\nREF: ${right.bulletId}\nCASE: ${right.caseNumber}`;

    statusEl.textContent = state.lastResult || "LISTO. Ajusta rotacion y compara.";
  }

  async function compare() {
    const left = dataset[state.leftIndex];
    const right = dataset[state.rightIndex];
    const a = left.halves.A.pattern;
    const b = right.halves.B.pattern;

    const { score } = bestCircularSimilarity(a, b);

    // make it feel a bit strict.
    const same = left.bulletId === right.bulletId;
    const threshold = 0.78;

    if (same || score > threshold) {
      state.lastResult = [
        `COINCIDENCIA: POSITIVA  (score ${(score).toFixed(2)})`,
        `CASE: ${left.caseNumber}`,
        `CRIMEN: ${left.crime}`,
        `LOCALIZACION: ${left.location}`,
        `ESTADO: ${left.status}`,
      ].join(" | ");
    } else {
      state.lastResult = `COINCIDENCIA: NEGATIVA  (score ${(score).toFixed(2)})`;
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

    if (key === "ArrowUp") {
      event.preventDefault();
      if (active === "left") state.leftIndex = (state.leftIndex + dataset.length - 1) % dataset.length;
      else state.rightIndex = (state.rightIndex + dataset.length - 1) % dataset.length;
      state.lastResult = "";
      render();
      return;
    }

    if (key === "ArrowDown") {
      event.preventDefault();
      if (active === "left") state.leftIndex = (state.leftIndex + 1) % dataset.length;
      else state.rightIndex = (state.rightIndex + 1) % dataset.length;
      state.lastResult = "";
      render();
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      if (active === "left") state.leftRot -= 0.18;
      else state.rightRot -= 0.18;
      render();
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      if (active === "left") state.leftRot += 0.18;
      else state.rightRot += 0.18;
      render();
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      compare();
    }
  }

  setActive("left");
  window.addEventListener("keydown", onKeyDown, true);
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
