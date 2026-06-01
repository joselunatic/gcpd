import { type } from "/utils/io.js";
import { sayForced } from "/utils/speak.js";

const AUDIO_ENDPOINT = "/api/audio";
const PHONE_LINES_ENDPOINT = "/api/phone-lines";
const PHONE_CALLED_ENDPOINT = "/api/phone-lines-called";

function normalizeNumber(value = "") {
  return String(value || "").replace(/[^\d]/g, "");
}

async function loadAudioModels() {
  try {
    const res = await fetch(AUDIO_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.models) ? data.models : [];
  } catch (error) {
    console.warn("Dial audio models fetch failed:", error);
    return [];
  }
}

async function loadPhoneLines() {
  try {
    const res = await fetch(PHONE_LINES_ENDPOINT, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.lines) ? data.lines : [];
  } catch (error) {
    console.warn("Dial phone lines fetch failed:", error);
    return [];
  }
}

function ensureOverlay() {
  let overlay = document.getElementById("dialer-audio-overlay");
  if (overlay) return overlay;

  const container =
    document.getElementById("terminal") ||
    document.getElementById("terminal-container") ||
    document.getElementById("screen-container") ||
    document.body;

  overlay = document.createElement("div");
  overlay.id = "dialer-audio-overlay";
  overlay.innerHTML = `
    <div class="dialer-audio-crt">
      <div class="dialer-audio-number"></div>
      <div class="dialer-audio-visual">
        <canvas class="dialer-audio-canvas" width="640" height="160"></canvas>
      </div>
    </div>
  `;

  container.appendChild(overlay);
  return overlay;
}

function removeOverlay() {
  const overlay = document.getElementById("dialer-audio-overlay");
  if (overlay) overlay.remove();
}

function drawOscilloscope(canvas, timeArray) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !timeArray?.length) return;
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#020608";
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = "screen";
  ctx.strokeStyle = "rgba(140, 255, 210, 0.75)";
  ctx.lineWidth = 1;
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

  ctx.fillStyle = "rgba(0,0,0,0.22)";
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
}

async function startDial({ number = "" } = {}) {
  const normalized = normalizeNumber(number);
  if (!normalized) {
    await type("DIAL: numero invalido.");
    return;
  }

  const lines = await loadPhoneLines();
  const line = lines.find((item) => normalizeNumber(item.number) === normalized);
  if (!line) {
    await type(`DIAL: sin linea para ${number}.`);
    return;
  }

  const models = await loadAudioModels();
  const entry = models.find((item) => item.id === line.audioId);

  if (!entry) {
    await type(`DIAL: sin audio para ${line.number || number}.`);
    return;
  }

  const overlay = ensureOverlay();
  const canvas = overlay.querySelector(".dialer-audio-canvas");
  const numberEl = overlay.querySelector(".dialer-audio-number");

  if (numberEl) numberEl.textContent = `LINEA ${line.number || number}`;

  const audio = new Audio(entry.originalSrc || entry.garbledSrc || "");
  audio.preload = "auto";
  audio.autoplay = true;
  audio.volume = 0.85;

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.8;
  const source = audioCtx.createMediaElementSource(audio);
  source.connect(analyser);
  analyser.connect(audioCtx.destination);
  const timeData = new Uint8Array(analyser.fftSize);
  let running = true;

  const ensureContext = async () => {
    if (audioCtx.state === "suspended") {
      await audioCtx.resume();
    }
  };

  const render = () => {
    if (!running) return;
    analyser.getByteTimeDomainData(timeData);
    drawOscilloscope(canvas, timeData);
    requestAnimationFrame(render);
  };
  render();

  let hangingUp = false;
  const cleanup = () => {
    if (hangingUp) return;
    hangingUp = true;
    running = false;
    audio.pause();
    audio.currentTime = 0;
    window.removeEventListener("keydown", onKeyDown, true);
    try {
      source.disconnect();
      analyser.disconnect();
    } catch (error) {
      console.warn("Dialer audio cleanup error", error);
    }
    const hangup = new Audio("/assets/sounds/hangup.mp3");
    hangup.volume = 0.9;
    hangup.play().catch(() => {});
    hangup.onended = () => {
      removeOverlay();
    };
  };

  const onKeyDown = (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      cleanup();
      return;
    }
    if (event.key === " ") {
      event.preventDefault();
      ensureContext().then(() => {
        if (audio.paused) audio.play();
        else audio.pause();
      });
    }
  };

  window.addEventListener("keydown", onKeyDown, true);

  audio.addEventListener("ended", () => {
    cleanup();
  });

  const dialTone = new Audio("/assets/sounds/call.mp3");
  dialTone.volume = 0.9;

  const markCalled = async () => {
    try {
      await fetch(PHONE_CALLED_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: line.number || number }),
      });
    } catch (error) {
      console.warn("Dial called update failed", error);
    }
  };

  const playCall = async () => {
    await ensureContext();
    try {
      await dialTone.play();
    } catch {
      // ignore autoplay issues for dial tone
    }
  };

  const playAudio = async () => {
    await ensureContext();
    try {
      await audio.play();
    } catch {
      // If autoplay is blocked, wait for a user gesture fallback.
    }
  };

  const playAbonado = async () => {
    await ensureContext();
    await sayForced("Abonado no encontrado", 0.7, 0.9);
    cleanup();
  };

  dialTone.addEventListener(
    "ended",
    () => {
      if (!line.rellamable && line.llamado) {
        playAbonado();
        return;
      }
      playAudio();
    },
    { once: true }
  );

  audio.autoplay = false;
  await markCalled();
  await playCall();

  await type(["", `DIAL ${entry.number || number}: linea activa. ESC para colgar.`, ""], {
    wait: false,
  });

  await new Promise((resolve) => {
    const obs = new MutationObserver(() => {
      if (!document.getElementById("dialer-audio-overlay")) {
        obs.disconnect();
        resolve();
      }
    });
    obs.observe(document.body, { childList: true, subtree: true });
  });
}

export { startDial };
export default startDial;
