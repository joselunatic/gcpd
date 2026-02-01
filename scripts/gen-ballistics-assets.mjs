import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { createCanvas } from "canvas";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, "../public/assets/ballistics");
const WIDTH = 1024;
const HEIGHT = 256;
const datasetPath = path.join(__dirname, "ballistics-dataset.json");
const datasetRaw = await fs.readFile(datasetPath, "utf-8");
const dataset = JSON.parse(datasetRaw);

function createRng(seed = 1) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const normalized = ((t ^ (t >>> 14)) >>> 0) / 4294967295;
    return normalized;
  };
}

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function applyNoise(ctx, random, strength = 12) {
  const image = ctx.getImageData(0, 0, WIDTH, HEIGHT);
  for (let i = 0; i < image.data.length; i += 4) {
    const variation = (random() - 0.5) * strength;
    image.data[i] = clampChannel(image.data[i] + variation);
    image.data[i + 1] = clampChannel(image.data[i + 1] + variation * 0.6);
    image.data[i + 2] = clampChannel(image.data[i + 2] + variation * 0.2);
  }
  ctx.putImageData(image, 0, 0);
}

function drawScanlines(ctx, random) {
  ctx.save();
  ctx.globalCompositeOperation = "overlay";
  for (let y = 0; y < HEIGHT; y += 2) {
    const alpha = 0.08 + random() * 0.04;
    ctx.fillStyle = `rgba(0, 255, 128, ${alpha})`;
    ctx.fillRect(0, y, WIDTH, 1);
  }
  ctx.restore();
}

function drawBackground(ctx, random, tint) {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  gradient.addColorStop(0, `#020906`);
  gradient.addColorStop(0.35, `hsl(${tint}, 60%, 8%)`);
  gradient.addColorStop(1, `hsl(${tint}, 50%, 11%)`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const radial = ctx.createRadialGradient(
    WIDTH * 0.5,
    HEIGHT * 0.45,
    10,
    WIDTH * 0.5,
    HEIGHT * 0.45,
    WIDTH * 0.8
  );
  radial.addColorStop(0, `rgba(150, 255, 190, 0.18)`);
  radial.addColorStop(0.4, `rgba(20, 60, 40, 0.12)`);
  radial.addColorStop(1, `rgba(0, 0, 0, 0)`);
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = radial;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.globalCompositeOperation = "source-over";
}

function buildSilhouettePoints(entry) {
  const silhouette = entry.silhouette;
  if (!silhouette) return null;
  const centerY = HEIGHT / 2;
  const length = WIDTH * silhouette.length;
  const startX = (WIDTH - length) / 2;
  const segments = 180;
  const points = [];
  const top = [];
  const bottom = [];
  const halfHeight = HEIGHT * silhouette.width;
  for (let i = 0; i <= segments; i++) {
    const x = startX + (i / segments) * length;
    const radius = radiusAt(i / segments, entry, halfHeight);
    top.push({ x, y: centerY - radius });
  }
  for (let i = segments; i >= 0; i--) {
    const x = startX + (i / segments) * length;
    const radius = radiusAt(i / segments, entry, halfHeight);
    bottom.push({ x, y: centerY + radius });
  }
  return {
    top,
    bottom,
    startX,
    length,
    centerY,
    halfHeight,
  };
}

function drawStriations(ctx, entry, random, silhouettePoints) {
  if (silhouettePoints) {
    ctx.save();
    ctx.beginPath();
    silhouettePoints.top.forEach(({ x, y }, index) => {
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    silhouettePoints.bottom.forEach(({ x, y }) => {
      ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.clip();
  }
  const lineCount = 4 + Math.floor(random() * 6);
  for (let line = 0; line < lineCount; line++) {
    const baseline = HEIGHT * (0.2 + (line / Math.max(1, lineCount - 1)) * 0.6);
    const amplitude = HEIGHT * (0.04 + entry.lineDensity * 0.3 + random() * 0.1);
    const frequency = entry.sineFrequency + random() * 2;
    ctx.lineWidth = 1 + random() * 1.5;
    const hue = (entry.tint + line * 2) % 360;
    const lightness = 35 + entry.lineDensity * 25 + random() * 12;
    ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${0.35 + random() * 0.25})`;
    ctx.beginPath();
    for (let x = 0; x <= WIDTH; x += 3) {
      const phase = (x / WIDTH) * frequency * Math.PI;
      const y =
        baseline +
        Math.sin(phase + line * 0.6) * amplitude * (0.6 + random() * 0.4) +
        Math.sin(x * 0.02 + random() * 4) * HEIGHT * 0.004;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();
  }
  if (silhouettePoints) {
    ctx.restore();
  }
}

function drawGlowStripes(ctx, random, entry) {
  const glowCount = 2 + Math.floor(random() * 3);
  ctx.lineCap = "round";
  for (let i = 0; i < glowCount; i++) {
    const y = HEIGHT * (0.3 + (i / Math.max(1, glowCount - 1)) * 0.4);
    ctx.strokeStyle = `hsla(${(entry.tint + 120) % 360}, 100%, 60%, ${0.08 + random() * 0.05})`;
    ctx.lineWidth = 4 + random() * 6;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(WIDTH, y + Math.sin(i + random() * 4) * 8);
    ctx.stroke();
  }
}

function radiusAt(norm, entry, halfHeight) {
  const silhouette = entry.silhouette || {};
  const shoulder = silhouette.shoulder ?? 0.66;
  const taper = silhouette.taper ?? 0.92;
  const nose = silhouette.nose ?? "spitzer";
  const bodyRadius = halfHeight;
  if (norm <= shoulder) {
    let radius = bodyRadius;
    if (silhouette.cannelure) {
      const diff = Math.abs(norm - silhouette.cannelure);
      if (diff < 0.12) {
        radius *= 0.78 + diff * 0.3;
      }
    }
    if (nose === "boat-tail" && norm < 0.2) {
      radius *= 0.85 + norm * 0.4;
    }
    return radius;
  }
  const noseNorm = (norm - shoulder) / Math.max(1 - shoulder, 0.01);
  let radius = bodyRadius * (1 - noseNorm * taper);
  radius = Math.min(radius, bodyRadius);
  radius = Math.max(radius, bodyRadius * 0.08);
  switch (nose) {
    case "round":
      radius += Math.sin(noseNorm * Math.PI) * bodyRadius * 0.08;
      break;
    case "hollow":
      radius *= 0.92 + Math.sin(noseNorm * Math.PI * 0.7) * 0.08;
      break;
    case "flat":
      radius = Math.max(bodyRadius * 0.45, radius);
      break;
    case "boat-tail":
      radius *= 0.85 + noseNorm * 0.15;
      break;
    case "ogive":
      radius = bodyRadius * Math.cos(noseNorm * Math.PI * 0.5);
      radius = Math.max(radius, bodyRadius * 0.1);
      break;
    default:
      radius *= 1 - noseNorm * 0.1;
  }
  return radius;
}

function drawBulletSilhouette(ctx, entry, random, points) {
  const silhouette = entry.silhouette;
  if (!silhouette || !points) return;
  const centerY = HEIGHT / 2;
  ctx.save();
  ctx.globalCompositeOperation = "screen";
  ctx.beginPath();
  points.top.forEach(({ x, y }, index) => {
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  points.bottom.forEach(({ x, y }) => {
    ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = `hsla(${entry.tint}, 70%, 36%, 0.18)`;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = `hsla(${entry.tint}, 90%, 70%, 0.45)`;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.strokeStyle = `hsla(${entry.tint}, 80%, 95%, 0.35)`;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(points.startX + points.length * 0.1, centerY - points.halfHeight * 0.35);
  ctx.lineTo(
    points.startX + points.length - points.length * 0.1,
    centerY - points.halfHeight * 0.35 - Math.sin(random()) * 6
  );
  ctx.stroke();
  ctx.restore();
}

async function render(entry) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");
  const random = createRng(entry.seed || 1);

  drawBackground(ctx, random, entry.tint);
  const silhouettePoints = buildSilhouettePoints(entry);
  drawBulletSilhouette(ctx, entry, random, silhouettePoints);
  drawStriations(ctx, entry, random, silhouettePoints);
  drawGlowStripes(ctx, random, entry);
  drawScanlines(ctx, random);
  applyNoise(ctx, random, 18);

  const exportsDir = path.join(outputDir, `${entry.id}.png`);
  await fs.writeFile(exportsDir, canvas.toBuffer("image/png"));
  console.log(`Generated ${entry.id}.png`);
}

async function ensureDirectory() {
  try {
    await fs.mkdir(outputDir, { recursive: true });
  } catch (error) {
    if (error.code !== "EEXIST") {
      throw error;
    }
  }
}

async function main() {
  await ensureDirectory();
  for (const entry of dataset) {
    await render(entry);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
