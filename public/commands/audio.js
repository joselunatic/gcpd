import { type } from "/utils/io.js";

const DEFAULT_AUDIO = "/assets/audio/dkb.mp3";
const AUDIO_ENDPOINT = "/api/audio";
const AUDIO_UNLOCK_ENDPOINT = "/api/audio-unlock";
const UNLOCK_STORAGE_KEY = "audio_unlocks";
let audioContext = null;

function ensureOverlay() {
  let overlay = document.getElementById("audio-overlay");
  if (overlay) return overlay;

  const container =
    document.getElementById("terminal") ||
    document.getElementById("terminal-container") ||
    document.getElementById("screen-container") ||
    document.body;

  overlay = document.createElement("div");
  overlay.id = "audio-overlay";
  overlay.innerHTML = `
    <div class="audio-crt">
      <div class="audio-header">
        <div class="audio-title">AUDIO // CRT PLAYER</div>
        <div class="audio-hint">SPACE play/pause · \u2190/\u2192 seek · \u2191/\u2193 volume · ESC salir</div>
      </div>
      <div class="audio-body">
        <div class="audio-visual">
          <canvas class="audio-canvas" width="900" height="260"></canvas>
        </div>
        <div class="audio-status">
          <div class="audio-track">TRACK: DKB.MP3</div>
          <div class="audio-time">00:00 / 00:00</div>
        </div>
        <div class="audio-unlock" hidden>
          <input class="audio-unlock__input" type="password" placeholder="PASSWORD..." />
          <button class="audio-unlock__btn" type="button">UNLOCK</button>
          <div class="audio-unlock__status"></div>
        </div>
      </div>
      <div class="audio-footer">
        <div class="audio-state">CARGANDO AUDIO...</div>
      </div>
    </div>
  `;

  container.appendChild(overlay);
  return overlay;
}

function removeOverlay() {
  const overlay = document.getElementById("audio-overlay");
  if (overlay) overlay.remove();
}

function formatTime(seconds = 0) {
  if (!Number.isFinite(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioContext;
}

async function loadAudioModels() {
  try {
    const res = await fetch(AUDIO_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models : [];
  } catch (error) {
    console.warn("Audio models fetch failed:", error);
    return [];
  }
}

function getUnlockedSet() {
  try {
    const raw = localStorage.getItem(UNLOCK_STORAGE_KEY);
    const parsed = JSON.parse(raw || "[]");
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function storeUnlockedSet(setValue) {
  const arr = Array.from(setValue);
  localStorage.setItem(UNLOCK_STORAGE_KEY, JSON.stringify(arr));
}

async function unlockAudio(id, password) {
  const res = await fetch(AUDIO_UNLOCK_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || "Password incorrecto.");
  }
  return data;
}

function drawOscilloscope(canvas, timeArray) {
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  if (!timeArray?.length) return;

  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(140, 255, 210, 0.7)";
  ctx.beginPath();
  const slice = width / timeArray.length;
  for (let i = 0; i < timeArray.length; i++) {
    const v = timeArray[i] / 128 - 1;
    const y = height * 0.5 + v * height * 0.32;
    const x = i * slice;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "rgba(60, 180, 120, 0.45)";
  ctx.beginPath();
  for (let i = 0; i < timeArray.length; i += 2) {
    const v = timeArray[i] / 128 - 1;
    const y = height * 0.5 + v * height * 0.22;
    const x = i * slice;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();
}

function drawScanlines(canvas) {
  const ctx = canvas.getContext("2d");
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < canvas.height; y += 3) ctx.fillRect(0, y, canvas.width, 1);
  ctx.restore();
}

async function startAudio({ id = "", src = "" } = {}) {
  const overlay = ensureOverlay();
  const canvas = overlay.querySelector(".audio-canvas");
  const visual = overlay.querySelector(".audio-visual");
  const trackEl = overlay.querySelector(".audio-track");
  const timeEl = overlay.querySelector(".audio-time");
  const stateEl = overlay.querySelector(".audio-state");
  const unlockPanel = overlay.querySelector(".audio-unlock");
  const unlockInput = overlay.querySelector(".audio-unlock__input");
  const unlockBtn = overlay.querySelector(".audio-unlock__btn");
  const unlockStatus = overlay.querySelector(".audio-unlock__status");
  if (!canvas) {
    await type("ERROR: no se pudo iniciar el player de audio.");
    return;
  }

  const audio = new Audio();
  audio.crossOrigin = "anonymous";
  audio.preload = "auto";
  audio.volume = 0.8;

  const models = await loadAudioModels();
  const normalizedId = String(id || "").trim().toLowerCase();
  const entry =
    models.find((item) => String(item.id || "").toLowerCase() === normalizedId) ||
    models.find((item) => String(item.title || "").toLowerCase() === normalizedId) ||
    null;
  const unlockedSet = getUnlockedSet();
  const unlocked = entry && unlockedSet.has(entry.id);
  const isGarbled = Boolean(entry?.isGarbled);
  const resolvedSrc = entry
    ? unlocked || !isGarbled
      ? entry.originalSrc
      : entry.garbledSrc || entry.originalSrc
    : src || DEFAULT_AUDIO;

  audio.src = resolvedSrc || DEFAULT_AUDIO;

  if (trackEl) {
    const name = entry?.title || entry?.id || resolvedSrc.split("/").pop() || "AUDIO";
    trackEl.textContent = `TRACK: ${String(name).toUpperCase()}`;
  }

  const audioCtx = getAudioContext();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;

  const source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);

  const runningRef = { active: true };
  const freqData = new Uint8Array(analyser.frequencyBinCount);
  const timeData = new Uint8Array(analyser.fftSize);
  let smoothLevel = 0;
  const overlayCanvas = document.createElement("canvas");
  overlayCanvas.className = "audio-oscilloscope";
  overlayCanvas.width = canvas.width;
  overlayCanvas.height = canvas.height;
  overlayCanvas.style.position = "absolute";
  overlayCanvas.style.inset = "0";
  overlayCanvas.style.pointerEvents = "none";
  if (visual) {
    visual.style.position = "relative";
    visual.appendChild(overlayCanvas);
  } else {
    canvas.parentElement.style.position = "relative";
    canvas.parentElement.appendChild(overlayCanvas);
  }
  canvas.style.visibility = "hidden";

  const resizeOverlay = () => {
    const width = canvas.clientWidth || canvas.width;
    const height = canvas.clientHeight || canvas.height;
    overlayCanvas.width = width;
    overlayCanvas.height = height;
  };
  let overlayObserver = null;
  if (typeof ResizeObserver !== "undefined") {
    overlayObserver = new ResizeObserver(resizeOverlay);
    overlayObserver.observe(canvas);
  } else {
    window.addEventListener("resize", resizeOverlay);
  }
  resizeOverlay();

  const cleanup = () => {
    runningRef.active = false;
    audio.pause();
    audio.currentTime = 0;
    window.removeEventListener("keydown", onKeyDown, true);
    try {
      source.disconnect();
      analyser.disconnect();
      if (overlayObserver) {
        overlayObserver.disconnect();
      } else {
        window.removeEventListener("resize", resizeOverlay);
      }
    } catch (error) {
      console.warn("Audio disconnect error", error);
    }
    removeOverlay();
  };

  const ensureContext = async () => {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  };

  const togglePlay = async () => {
    await ensureContext();
    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cleanup();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      togglePlay();
      return;
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      ensureContext();
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      return;
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      ensureContext();
      audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 5);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      ensureContext();
      audio.volume = Math.min(1, audio.volume + 0.05);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      ensureContext();
      audio.volume = Math.max(0, audio.volume - 0.05);
      return;
    }
  };

  window.addEventListener("keydown", onKeyDown, true);

  audio.addEventListener("canplay", async () => {
    stateEl.textContent = "LISTO. SPACE PARA REPRODUCIR.";
  });

  audio.addEventListener("ended", () => {
    stateEl.textContent = "FIN";
  });

  if (entry && entry.isGarbled && !unlocked) {
    unlockPanel.hidden = false;
    unlockStatus.textContent = "";

    const attemptUnlock = async () => {
      const password = String(unlockInput.value || "").trim();
      if (!password) {
        unlockStatus.textContent = "PASSWORD REQUERIDO.";
        return;
      }
      unlockStatus.textContent = "VERIFICANDO...";
      try {
        const response = await unlockAudio(entry.id, password);
        unlockStatus.textContent = "DESBLOQUEADO.";
        unlockPanel.hidden = true;
        unlockedSet.add(entry.id);
        storeUnlockedSet(unlockedSet);

        const current = audio.currentTime || 0;
        audio.pause();
        audio.src = response.originalSrc || entry.originalSrc;
        await new Promise((resolve) => {
          const handler = () => {
            audio.removeEventListener("loadedmetadata", handler);
            resolve();
          };
          audio.addEventListener("loadedmetadata", handler);
          audio.load();
        });
        await ensureContext();
        audio.currentTime = current;
        await audio.play();
      } catch (error) {
        unlockStatus.textContent = "PASSWORD INCORRECTO.";
      }
    };

    unlockBtn.addEventListener("click", attemptUnlock);
    unlockInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        attemptUnlock();
      }
    });
  }

  const render = () => {
    if (!runningRef.active) return;
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(timeData);
    let sum = 0;
    for (let i = 0; i < freqData.length; i++) sum += freqData[i];
    const avg = sum / Math.max(1, freqData.length);
    const level = avg / 255;
    smoothLevel += (level - smoothLevel) * 0.12;

    const ctx = overlayCanvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      ctx.fillStyle = "#020608";
      ctx.fillRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    }
    drawOscilloscope(overlayCanvas, timeData);
    drawScanlines(overlayCanvas);

    const current = formatTime(audio.currentTime);
    const total = formatTime(audio.duration);
    if (timeEl) timeEl.textContent = `${current} / ${total}`;
    if (stateEl) {
      stateEl.textContent = audio.paused ? "PAUSA" : "REPRODUCIENDO";
    }

    requestAnimationFrame(render);
  };
  render();

  await type(["", "AUDIO: modo grafico activo. ESC para salir.", ""], { wait: false });

  await new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (!document.getElementById("audio-overlay")) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

export { startAudio };
export default startAudio;
