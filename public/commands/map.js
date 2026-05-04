import {
  prompt,
  type,
  print,
  renderSelectableLines,
  parse,
  input,
} from "/utils/io.js";
import {
  loadCampaignState,
  markSeen,
  refreshCampaignState,
} from "/utils/campaignState.js";
import clear from "/commands/clear.js";
import {
  evaluateAccess,
  getNodeType,
  getNodeLabel,
  getAccessLabel,
  getStateTone,
} from "/utils/access.js";
import { attemptEntityUnlock } from "/utils/accessFlow.js";
import { getStatusContext } from "/utils/status.js";
import { getDeltaMarker } from "/utils/delta.js";
import { isPortraitNarrow, getWrapLimit } from "/utils/portrait.js";
import { waitForSelection } from "/utils/selection.js";
import { paginateSelectableItems } from "/utils/pagination.js";
import {
  SYMBOLS,
  buildHeaderLines,
  buildFooterLines,
  titleLine,
  mergePartsLine,
  toParts,
  trimParts,
  padParts,
} from "/utils/tui.js";
import { pushKeymap } from "/utils/keymap.js";
import {
  normalizePoisClient,
  getPoiHierarchy,
  getPoiGeo,
  getPoiContent,
} from "/utils/poiContract.js";

const API_URL = "/api/pois-data";
const FALLBACK_URL = "/data/map/pois.json";
const HOTSPOTS_URL = "/data/map/hotspots.json";
const POI_IMAGE_ASPECT = 16 / 9;
let cache;
let dataSource = "api";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

const wrapLine = (text = "", limit = 80) => {
  const adjustedLimit = getWrapLimit(limit);
  const words = text.split(" ");
  const segments = [];
  let current = "";
  words.forEach((word) => {
    const tentative = current ? `${current} ${word}` : word;
    if (tentative.length > adjustedLimit) {
      if (current) segments.push(current);
      current = word;
    } else {
      current = tentative;
    }
  });
  if (current) segments.push(current);
  return segments.length ? segments : [text];
};

const fetchPois = async () => {
  if (!cache) {
    cache = fetchJson(API_URL)
      .then((data) => {
        if (Array.isArray(data.pois) && data.pois.length) {
          dataSource = "api";
          return { ...data, pois: normalizePoisClient(data.pois) };
        }
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL)
          .then((fallback) => ({ ...fallback, pois: normalizePoisClient(fallback.pois) }))
          .catch(() => ({ pois: [] }));
      })
      .catch((error) => {
        console.error("Map data error", error);
        dataSource = "fallback";
        return fetchJson(FALLBACK_URL)
          .then((fallback) => ({ ...fallback, pois: normalizePoisClient(fallback.pois) }))
          .catch(() => ({ pois: [] }));
      });
  }
  return cache;
};

const fetchHotspots = async () => {
  try {
    return await fetchJson(HOTSPOTS_URL);
  } catch (error) {
    return null;
  }
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

function buildHotspotsFromPois(pois = []) {
  return pois
    .map((poi) => {
      const meta = getPoiGeo(poi) || {};
      const x = Number(meta.x);
      const y = Number(meta.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
      return {
        id: poi.id,
        label: String(meta.label || poi.name || poi.id || "").toUpperCase(),
        x,
        y,
        radius: Number(meta.radius) || 1.6,
      };
    })
    .filter(Boolean);
}

function parseMapArgs(args = "") {
  const tokens = String(args || "")
    .split(/\s+/)
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return {
    forceEmptyState: tokens.includes("sininfo"),
    poiIds: tokens.filter((entry) => entry !== "sininfo"),
  };
}

function ensureMapStyles() {
  if (document.getElementById("terminal-map-styles")) return;
  const style = document.createElement("style");
  style.id = "terminal-map-styles";
  style.textContent = `
    .terminal-map-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #040807;
      z-index: 40;
      pointer-events: auto;
      padding: 16px;
    }
    .terminal-map-shell {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      gap: 16px;
      position: relative;
      padding: 12px;
      box-sizing: border-box;
    }
    .terminal-map-panel {
      flex: 1;
      width: auto;
      height: 100%;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: #bfffdc;
      font: 600 12px/1.45 "Courier New", monospace;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 14px;
      border: 1px solid rgba(124, 255, 178, 0.2);
      background: rgba(6, 16, 12, 0.9);
      box-shadow: 0 0 18px rgba(124, 255, 178, 0.08);
      position: relative;
      overflow: hidden auto;
      border-radius: 10px;
      z-index: 60;
      position: relative;
      left: 0;
      top: 0;
      transform: none;
    }
    .terminal-map-panel__close {
      display: none;
    }
    .terminal-map-panel__title {
      font-size: 13px;
      letter-spacing: 0.2em;
      color: #e4fff3;
    }
    .terminal-map-panel__meta {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 4px 10px;
      font-size: 11px;
      color: rgba(191, 255, 220, 0.85);
    }
    .terminal-map-panel__meta > div {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .terminal-map-panel__label {
      color: rgba(191, 255, 220, 0.55);
    }
    .terminal-map-panel__image {
      width: 100%;
      aspect-ratio: ${POI_IMAGE_ASPECT};
      min-height: 186px;
      max-height: 360px;
      border: 1px dashed rgba(124, 255, 178, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(191, 255, 220, 0.6);
      font-size: 10px;
      letter-spacing: 0.25em;
      position: relative;
      overflow: hidden;
      background:
        radial-gradient(circle at 30% 25%, rgba(124, 255, 178, 0.12), transparent 52%),
        rgba(4, 8, 7, 0.95);
      transition: border-color 140ms ease-out, box-shadow 140ms ease-out;
    }
    .terminal-map-panel__image.is-clickable {
      border: 1px solid rgba(124, 255, 178, 0.72);
      box-shadow: inset 0 0 0 1px rgba(124, 255, 178, 0.16),
        0 0 18px rgba(124, 255, 178, 0.15);
      cursor: zoom-in;
      outline: none;
    }
    .terminal-map-panel__image.is-clickable:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-panel__image-el {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: none;
      transition: transform 160ms ease-out, filter 160ms ease-out;
      filter: saturate(1.08) contrast(1.03) brightness(0.98);
    }
    .terminal-map-panel__image.is-clickable:hover .terminal-map-panel__image-el,
    .terminal-map-panel__image.is-clickable:focus-visible .terminal-map-panel__image-el {
      transform: scale(1.035);
      filter: saturate(1.14) contrast(1.06) brightness(1.02);
    }
    .terminal-map-panel__image-placeholder {
      z-index: 1;
      text-align: center;
      padding: 0 10px;
      line-height: 1.45;
    }
    .terminal-map-panel__image-caption {
      position: absolute;
      left: 8px;
      right: 8px;
      bottom: 8px;
      z-index: 2;
      font-size: 9px;
      letter-spacing: 0.14em;
      color: #e7fff4;
      text-transform: uppercase;
      text-shadow: 0 0 8px rgba(0, 0, 0, 0.85);
      padding: 5px 7px;
      border: 1px solid rgba(124, 255, 178, 0.38);
      background: rgba(4, 8, 7, 0.72);
      display: none;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .terminal-map-panel__block {
      font-size: 11px;
      color: rgba(191, 255, 220, 0.8);
      line-height: 1.52;
      letter-spacing: 0.05em;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .terminal-map-panel__block span {
      display: block;
      color: rgba(191, 255, 220, 0.55);
      margin-bottom: 4px;
    }
    .terminal-map-panel__copy {
      max-height: 136px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 6px;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .terminal-map-panel__list {
      display: grid;
      gap: 4px;
      font-size: 10px;
      color: rgba(191, 255, 220, 0.75);
      max-height: 118px;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 6px;
      white-space: pre-wrap;
    }
    .terminal-map-panel__list > div {
      overflow-wrap: anywhere;
      word-break: break-word;
      line-height: 1.5;
      white-space: pre-wrap;
    }
    .terminal-map-frame {
      position: relative;
      overflow: hidden;
      border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(124, 255, 178, 0.15), 0 0 30px rgba(124, 255, 178, 0.08);
      background: #040807;
      flex: 1;
      width: auto;
      height: 100%;
    }
    .terminal-map-frame::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        linear-gradient(rgba(0, 0, 0, 0.18) 50%, rgba(0, 0, 0, 0) 50%) 0 0 / 100% 3px,
        radial-gradient(circle at center, rgba(124, 255, 178, 0.18), transparent 70%);
      mix-blend-mode: screen;
      pointer-events: none;
      z-index: 4;
    }
    .terminal-map-frame::after {
      content: "";
      position: absolute;
      inset: 0;
      background-image:
        linear-gradient(120deg, rgba(255,255,255,0.04) 0%, rgba(0,0,0,0.08) 100%);
      opacity: 0.6;
      pointer-events: none;
      z-index: 5;
    }
    .terminal-map-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      filter: saturate(1.05) blur(0.2px);
      opacity: 0.92;
    }
    .terminal-map-viewport {
      position: absolute;
      inset: 0;
      transform: scale(0.96);
      transform-origin: center center;
      transition: transform 120ms ease-out, transform-origin 120ms ease-out;
      will-change: transform;
    }
    .terminal-map-hotspot {
      position: absolute;
      left: 0;
      top: 0;
      transform: translate(-50%, -50%);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      width: max-content;
      height: auto;
      min-width: 0;
      min-height: 0;
      border-radius: 999px;
      border: 1px solid rgba(124, 255, 178, 0.9);
      background: rgba(4, 8, 7, 0.76);
      color: #bfffdc;
      font: 600 8px/1 "Courier New", monospace;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      box-shadow: 0 0 6px rgba(124, 255, 178, 0.25);
      padding: 1px 5px;
      z-index: 2;
      transition: border-color 120ms ease-out, box-shadow 120ms ease-out,
        background-color 120ms ease-out, opacity 120ms ease-out;
      outline: none;
      white-space: nowrap;
      max-width: 150px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .terminal-map-hotspot::before {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: 999px;
      background: transparent;
    }
    .terminal-map-overlay.is-dense .terminal-map-hotspot {
      border-color: rgba(124, 255, 178, 0.62);
      background: rgba(4, 8, 7, 0.58);
      color: rgba(191, 255, 220, 0.82);
      font-size: 7px;
      letter-spacing: 0.02em;
      padding: 1px 4px;
      box-shadow: none;
      opacity: 0.86;
      max-width: 118px;
    }
    .terminal-map-hotspot.is-locked {
      border-style: dashed;
      color: rgba(124, 255, 178, 0.5);
      box-shadow: none;
      opacity: 0.82;
    }
    .terminal-map-hotspot:hover,
    .terminal-map-hotspot.is-active {
      border-color: #dfffee;
      background: rgba(14, 26, 20, 0.92);
      box-shadow: 0 0 0 1px rgba(191, 255, 220, 0.5),
        0 0 14px rgba(124, 255, 178, 0.75);
      color: #e4fff3;
      opacity: 1;
      z-index: 3;
    }
    .terminal-map-hotspot:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-ui {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font: 600 11px/1 "Courier New", monospace;
      letter-spacing: 0.2em;
      color: #bfffdc;
      text-transform: uppercase;
      pointer-events: none;
    }
    .terminal-map-ui__button {
      pointer-events: auto;
      background: transparent;
      border: 1px solid rgba(124, 255, 178, 0.7);
      color: #bfffdc;
      font: 600 10px/1 "Courier New", monospace;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding: 6px 10px;
      cursor: pointer;
    }
    .terminal-map-ui__button:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-lightbox {
      position: absolute;
      inset: 0;
      z-index: 90;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: rgba(2, 6, 5, 0.78);
      backdrop-filter: blur(1px);
    }
    .terminal-map-lightbox__backdrop {
      position: absolute;
      inset: 0;
    }
    .terminal-map-lightbox__card {
      position: relative;
      width: min(980px, 92%);
      max-height: 88%;
      border: 1px solid rgba(124, 255, 178, 0.72);
      background: #030806;
      box-shadow: 0 0 24px rgba(124, 255, 178, 0.2);
      border-radius: 12px;
      overflow: hidden;
      display: grid;
      grid-template-rows: auto 1fr;
    }
    .terminal-map-lightbox__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(124, 255, 178, 0.35);
      font: 600 11px/1.2 "Courier New", monospace;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #dfffee;
      background: rgba(5, 12, 10, 0.94);
    }
    .terminal-map-lightbox__close {
      background: transparent;
      border: 1px solid rgba(124, 255, 178, 0.7);
      color: #bfffdc;
      font: 600 10px/1 "Courier New", monospace;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding: 6px 10px;
      cursor: pointer;
    }
    .terminal-map-lightbox__close:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-lightbox__body {
      min-height: 0;
      overflow: auto;
      background:
        linear-gradient(rgba(0, 0, 0, 0.16) 50%, rgba(0, 0, 0, 0) 50%) 0 0 / 100% 3px,
        #020604;
    }
    .terminal-map-lightbox__img {
      width: 100%;
      height: auto;
      display: block;
      object-fit: contain;
    }
    @media (max-width: 639px) {
      .terminal-map-shell {
        width: 100%;
        height: 100%;
        flex-direction: column;
        gap: 12px;
      }
      .terminal-map-panel {
        width: 100%;
        height: 45%;
      }
      .terminal-map-lightbox {
        padding: 14px;
      }
      .terminal-map-lightbox__card {
        width: 100%;
        max-height: 92%;
      }
    }
  `;
  document.head.appendChild(style);
}

function computeFitSize(containerWidth, containerHeight, ratio) {
  let width = containerWidth;
  let height = width / ratio;
  if (height > containerHeight) {
    height = containerHeight;
    width = height * ratio;
  }
  return { width, height };
}

async function showMapOverlay({ pois, hotspotsData }) {
  const terminal = document.querySelector(".terminal");
  const screenHost = document.querySelector("#screen-container") || terminal;
  if (!terminal || !screenHost) return false;

  ensureMapStyles();
  terminal.classList.add("terminal-viewer-active");
  document.body.classList.add("terminal-viewer-active");

  const overlay = document.createElement("div");
  overlay.className = "terminal-map-overlay";
  screenHost.appendChild(overlay);

  const shell = document.createElement("div");
  shell.className = "terminal-map-shell";
  overlay.appendChild(shell);

  const frame = document.createElement("div");
  frame.className = "terminal-map-frame";
  shell.appendChild(frame);

  const viewport = document.createElement("div");
  viewport.className = "terminal-map-viewport";
  frame.appendChild(viewport);

  const panel = document.createElement("div");
  panel.className = "terminal-map-panel";
  const emptyState = hotspotsData?.emptyState || {};
  const scopedLabel = hotspotsData?.scopedLabel || "";
  const emptyTitle = String(emptyState.title || "SECTOR :: SIN SELECCION").toUpperCase();
  const emptyImageText = emptyState.imageText || "SELECCIONA UN POI PARA CARGAR EVIDENCIA.";
  const emptySummary = emptyState.summary || "Esperando seleccion de POI.";
  const emptyDetails = emptyState.details || "SIN DATOS.";
  const emptyContacts = emptyState.contacts || "SIN DATOS.";
  const emptyNotes = emptyState.notes || "SIN DATOS.";
  panel.innerHTML = `
    <div class="terminal-map-panel__title">${escapeHtml(emptyTitle)}</div>
    <div class="terminal-map-panel__meta">
      <div class="terminal-map-panel__label">ID</div>
      <div>--</div>
      <div class="terminal-map-panel__label">STATUS</div>
      <div>--</div>
      <div class="terminal-map-panel__label">ACCESS</div>
      <div>--</div>
      <div class="terminal-map-panel__label">DISTRICT</div>
      <div>--</div>
    </div>
    <div class="terminal-map-panel__image" role="button" tabindex="-1" aria-disabled="true" aria-label="Sin evidencia disponible">
      <img class="terminal-map-panel__image-el" alt="POI" />
      <span class="terminal-map-panel__image-placeholder">${escapeHtml(emptyImageText)}</span>
      <span class="terminal-map-panel__image-caption"></span>
    </div>
    <div class="terminal-map-panel__block" data-panel="summary">
      <span>RESUMEN</span>
      <div class="terminal-map-panel__copy">${escapeHtml(emptySummary)}</div>
    </div>
    <div class="terminal-map-panel__block" data-panel="details">
      <span>INTEL</span>
      <div class="terminal-map-panel__list">${escapeHtml(emptyDetails)}</div>
    </div>
    <div class="terminal-map-panel__block" data-panel="contacts">
      <span>CONTACTOS</span>
      <div class="terminal-map-panel__list">${escapeHtml(emptyContacts)}</div>
    </div>
    <div class="terminal-map-panel__block" data-panel="notes">
      <span>NOTAS</span>
      <div class="terminal-map-panel__list">${escapeHtml(emptyNotes)}</div>
    </div>
  `;
  shell.appendChild(panel);

  const img = document.createElement("img");
  img.className = "terminal-map-image";
  img.alt = "MAPA GOTHAM";
  img.src = hotspotsData?.image || "/mapa.png";
  viewport.appendChild(img);

  const ui = document.createElement("div");
  ui.className = "terminal-map-ui";
  ui.innerHTML = `
    <div>${escapeHtml(scopedLabel || "MAPA :: SECTORES")}</div>
    <button class="terminal-map-ui__button" type="button" data-action="exit">SALIR</button>
  `;
  overlay.appendChild(ui);

  const exitButton = ui.querySelector("[data-action='exit']");

  const hotspotNodes = [];
  const campaignState = loadCampaignState();
  let activeHotspot = null;
  let lightbox = null;
  let selectedImageSrc = "";
  let selectedImageTitle = "";

  const imageFrame = panel.querySelector(".terminal-map-panel__image");
  const imageEl = panel.querySelector(".terminal-map-panel__image-el");
  const imagePlaceholder = panel.querySelector(".terminal-map-panel__image-placeholder");
  const imageCaption = panel.querySelector(".terminal-map-panel__image-caption");

  const closeLightbox = () => {
    if (!lightbox) return;
    if (lightbox.parentNode) {
      lightbox.parentNode.removeChild(lightbox);
    }
    lightbox = null;
  };

  const openLightbox = () => {
    if (!selectedImageSrc || lightbox || !overlay) return;

    lightbox = document.createElement("div");
    lightbox.className = "terminal-map-lightbox";
    lightbox.innerHTML = `
      <div class="terminal-map-lightbox__backdrop"></div>
      <div class="terminal-map-lightbox__card" role="dialog" aria-modal="true">
        <div class="terminal-map-lightbox__head">
          <span>EVIDENCIA :: DETALLE ${escapeHtml(selectedImageTitle || "POI")}</span>
          <button class="terminal-map-lightbox__close" type="button">CERRAR</button>
        </div>
        <div class="terminal-map-lightbox__body">
          <img class="terminal-map-lightbox__img" alt="Evidencia POI" />
        </div>
      </div>
    `;

    const largeImage = lightbox.querySelector(".terminal-map-lightbox__img");
    if (largeImage) {
      largeImage.src = selectedImageSrc;
      largeImage.alt = `Evidencia ${selectedImageTitle || "POI"}`;
    }
    const closeButton = lightbox.querySelector(".terminal-map-lightbox__close");
    const backdrop = lightbox.querySelector(".terminal-map-lightbox__backdrop");
    if (closeButton) closeButton.addEventListener("click", closeLightbox);
    if (backdrop) backdrop.addEventListener("click", closeLightbox);
    overlay.appendChild(lightbox);
    if (closeButton) closeButton.focus();
  };

  const handleImageFrameClick = () => {
    if (!selectedImageSrc) return;
    openLightbox();
  };
  const handleImageFrameKeydown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleImageFrameClick();
    }
  };
  if (imageFrame) {
    imageFrame.addEventListener("click", handleImageFrameClick);
    imageFrame.addEventListener("keydown", handleImageFrameKeydown);
  }

  const updatePanel = (poi, evaluation) => {
    if (!poi) return;
    const status = poi.status ? String(poi.status).toUpperCase() : "UNKNOWN";
    const access = statusLabel(evaluation);
    const summary = poi.summary || "SIN RESUMEN.";
    const geo = getPoiGeo(poi) || {};
    const content = getPoiContent(poi);
    const imageSrc = geo.image || "";
    const details = Array.isArray(content.details) && content.details.length ? content.details : ["SIN DATOS."];
    const contacts = Array.isArray(content.contacts) && content.contacts.length ? content.contacts : ["SIN DATOS."];
    const notes = Array.isArray(content.notes) && content.notes.length ? content.notes : ["SIN DATOS."];
    panel.querySelector(".terminal-map-panel__title").textContent =
      `SECTOR :: ${(poi.name || poi.id || "UNKNOWN").toUpperCase()}`;
    const meta = panel.querySelectorAll(".terminal-map-panel__meta div");
    if (meta.length >= 8) {
      meta[1].textContent = poi.id || "--";
      meta[3].textContent = status;
      meta[5].textContent = access;
      meta[7].textContent = poi.district || "--";
    }
    const summaryNode = panel.querySelector("[data-panel='summary'] .terminal-map-panel__copy");
    if (summaryNode) {
      summaryNode.textContent = summary;
    }
    const detailNode = panel.querySelector("[data-panel='details'] .terminal-map-panel__list");
    if (detailNode) {
      detailNode.innerHTML = details
        .map((entry) => `<div>${escapeHtml(entry)}</div>`)
        .join("");
    }
    const contactNode = panel.querySelector("[data-panel='contacts'] .terminal-map-panel__list");
    if (contactNode) {
      contactNode.innerHTML = contacts
        .map((entry) => `<div>${escapeHtml(entry)}</div>`)
        .join("");
    }
    const notesNode = panel.querySelector("[data-panel='notes'] .terminal-map-panel__list");
    if (notesNode) {
      notesNode.innerHTML = notes
        .map((entry) => `<div>${escapeHtml(entry)}</div>`)
        .join("");
    }
    if (imageEl) {
      if (imageSrc) {
        const resolvedSrc = imageSrc.startsWith("/uploads/")
          ? `/api${imageSrc}`
          : imageSrc;
        selectedImageSrc = resolvedSrc;
        selectedImageTitle = (poi.name || poi.id || "POI").toUpperCase();
        imageEl.src = resolvedSrc;
        imageEl.style.display = "block";
        if (imagePlaceholder) imagePlaceholder.style.display = "none";
        if (imageCaption) {
          imageCaption.style.display = "block";
          imageCaption.textContent = `EVIDENCIA :: ${selectedImageTitle} (CLICK PARA AMPLIAR)`;
        }
        if (imageFrame) {
          imageFrame.classList.add("is-clickable");
          imageFrame.tabIndex = 0;
          imageFrame.setAttribute("aria-disabled", "false");
          imageFrame.setAttribute("aria-label", `Abrir evidencia de ${selectedImageTitle}`);
        }
      } else {
        selectedImageSrc = "";
        selectedImageTitle = "";
        closeLightbox();
        imageEl.removeAttribute("src");
        imageEl.style.display = "none";
        if (imagePlaceholder) {
          imagePlaceholder.style.display = "block";
          imagePlaceholder.textContent = "SIN EVIDENCIA ADJUNTA.";
        }
        if (imageCaption) {
          imageCaption.style.display = "none";
          imageCaption.textContent = "";
        }
        if (imageFrame) {
          imageFrame.classList.remove("is-clickable");
          imageFrame.tabIndex = -1;
          imageFrame.setAttribute("aria-disabled", "true");
          imageFrame.setAttribute("aria-label", "Sin evidencia disponible");
        }
      }
    }
  };

  const addHotspot = (spot, poi, evaluation) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "terminal-map-hotspot";
    if (!evaluation.unlocked) {
      button.classList.add("is-locked");
    }
    button.dataset.x = String(spot.x || 0);
    button.dataset.y = String(spot.y || 0);
    button.dataset.poi = poi.id;
    const fullLabel = String(spot.label || poi.name || poi.id).toUpperCase();
    button.textContent = fullLabel;
    button.title = fullLabel;
    button.setAttribute("aria-label", fullLabel);
    button.tabIndex = 0;

    button.addEventListener("click", async () => {
      if (!evaluation.unlocked) {
        const unlocked = await attemptUnlock(poi, evaluation);
        if (!unlocked) {
          return;
        }
      }
      if (activeHotspot && activeHotspot !== button) {
        activeHotspot.classList.remove("is-active");
      }
      button.classList.add("is-active");
      activeHotspot = button;
      updatePanel(poi, evaluation);
    });
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        button.click();
      }
    });

    viewport.appendChild(button);
    hotspotNodes.push(button);
  };

  const spots = Array.isArray(hotspotsData?.hotspots) ? hotspotsData.hotspots : [];
  if (spots.length > 12) {
    overlay.classList.add("is-dense");
  }
  spots.forEach((spot) => {
    const poi = pois.find((entry) => entry.id === spot.id);
    if (!poi) return;
    const evaluation = evaluateAccess(poi, campaignState);
    if (!evaluation.visible && !evaluation.listed) return;
    addHotspot(spot, poi, evaluation);
  });

  const layout = () => {
    const shellBounds = shell.getBoundingClientRect();
    const isNarrow = window.matchMedia("(max-width: 639px)").matches;
    const ratio =
      Number(hotspotsData?.aspectRatio) ||
      (img.naturalWidth && img.naturalHeight
        ? img.naturalWidth / img.naturalHeight
        : 1);
    const gap = 16;
    const maxWidth = isNarrow ? shellBounds.width : (shellBounds.width - gap) / 2;
    const fitted = computeFitSize(maxWidth, shellBounds.height, ratio);
    frame.style.width = `${Math.floor(fitted.width)}px`;
    frame.style.height = `${Math.floor(fitted.height)}px`;
    if (isNarrow) {
      panel.style.width = "100%";
      panel.style.height = `${Math.floor(shellBounds.height * 0.45)}px`;
    } else {
      panel.style.width = `${Math.floor(fitted.width)}px`;
      panel.style.height = `${Math.floor(fitted.height)}px`;
    }
    hotspotNodes.forEach((node) => {
      const x = Number(node.dataset.x || 0);
      const y = Number(node.dataset.y || 0);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      const dense = overlay.classList.contains("is-dense");
      const maxLabelWidth = dense ? 118 : 150;
      node.style.maxWidth = `${Math.max(64, Math.min(maxLabelWidth, Math.floor(fitted.width * 0.42)))}px`;
    });
  };

  const resizeObserver = new ResizeObserver(layout);
  resizeObserver.observe(screenHost);

  img.addEventListener("load", layout);
  if (img.complete) layout();

  let zoomActive = false;
  const applyZoom = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (event.target && event.target.closest(".terminal-map-hotspot")) return;
    if (event.buttons) return;
    const rect = frame.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    viewport.style.transformOrigin = `${Math.max(0, Math.min(100, x))}% ${Math.max(
      0,
      Math.min(100, y)
    )}%`;
    viewport.style.transform = "scale(1.45)";
    zoomActive = true;
  };

  const clearZoom = () => {
    viewport.style.transformOrigin = "center center";
    viewport.style.transform = "scale(0.96)";
    zoomActive = false;
  };

  frame.addEventListener("pointermove", applyZoom);
  frame.addEventListener("pointerenter", applyZoom);
  frame.addEventListener("pointerleave", clearZoom);

  const cleanup = () => {
    resizeObserver.disconnect();
    frame.removeEventListener("pointermove", applyZoom);
    frame.removeEventListener("pointerenter", applyZoom);
    frame.removeEventListener("pointerleave", clearZoom);
    closeLightbox();
    if (imageFrame) {
      imageFrame.removeEventListener("click", handleImageFrameClick);
      imageFrame.removeEventListener("keydown", handleImageFrameKeydown);
    }
    terminal.classList.remove("terminal-viewer-active");
    document.body.classList.remove("terminal-viewer-active");
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  let disposed = false;
  let resolveExit = null;
  const exitPromise = new Promise((resolve) => {
    resolveExit = resolve;
  });

  const exitOverlay = () => {
    if (disposed) return;
    disposed = true;
    disposeKeymap();
    cleanup();
    if (resolveExit) resolveExit(true);
  };

  const disposeKeymap = pushKeymap(
    {
      Escape: () => {
        if (lightbox) {
          closeLightbox();
          return true;
        }
        exitOverlay();
        return true;
      },
      B: () => {
        exitOverlay();
        return true;
      },
      Backspace: () => {
        exitOverlay();
        return true;
      },
    },
    { shouldHandle: () => true }
  );

  if (exitButton) {
    exitButton.addEventListener("click", () => {
      exitOverlay();
    });
  }

  return exitPromise;
}

const fastRender = { wait: false, initialWait: false, finalWait: false };
const COLUMN = { left: 38, right: 51, divider: "│" };

const mergeLine = (left = "", right = "") =>
  mergePartsLine(left, right, {
    leftWidth: COLUMN.left,
    rightWidth: COLUMN.right,
    divider: COLUMN.divider,
    dividerClass: "tui-sep",
  });

const labelValueLine = (label, value, valueClass = "tui-primary") => ({
  parts: [
    { text: `${label}: `, className: "tui-system" },
    { text: String(value || ""), className: valueClass },
  ],
});

const statusLabel = (evaluation) =>
  getAccessLabel(evaluation, {
    hiddenLabel: "OCULTO",
    unlockedLabel: "ONLINE",
    lockedLabel: "LOCKED",
  });

const formatNodeLine = (node, evaluation, index, campaignState) => {
  const label = getNodeLabel(node);
  const parentId = getPoiHierarchy(node).parentId || "";
  const isSub = parentId && parentId !== node.id;
  const line1 = {
    parts: [
      { text: `${String(index + 1).padStart(2, "0")} `, className: "tui-muted" },
      ...(isSub ? [{ text: `${SYMBOLS.relation} `, className: "tui-muted" }] : []),
      { text: label, className: "tui-primary" },
    ],
  };
  return [line1];
};

const buildSectorSummary = (pois = []) => {
  const counts = new Map();
  pois.forEach((poi) => {
    const key = poi.district || "UNKNOWN";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([district, count]) => `${district}: ${count}`);
};

const buildPreviewLines = (poi, evaluation, campaignState, allPois = [], breadcrumb = []) => {
  if (!poi) {
    return [
      { parts: [{ text: "SIN SECTOR SELECCIONADO.", className: "tui-muted" }] },
      { parts: [{ text: "REVISA LOS FILTROS.", className: "tui-muted" }] },
    ];
  }
  const marker = getDeltaMarker(poi, "map", campaignState);
  const access = statusLabel(evaluation);
  const status = poi.status ? String(poi.status).toUpperCase() : "UNKNOWN";
  const lines = [
    {
      parts: [
        { text: "FOCUS ", className: "tui-system" },
        { text: `${SYMBOLS.selected} ${poi.name || poi.id}`, className: "tui-accent" },
        ...(marker
          ? [
              {
                text: ` ${marker === "!" ? SYMBOLS.critical : marker}`,
                className: marker === "!" ? "tui-alert" : "tui-warn",
              },
            ]
          : []),
      ],
    },
    labelValueLine("ID", poi.id, "tui-muted"),
    labelValueLine("STATUS", status, getStateTone(status)),
    labelValueLine("ACCESS", access, getStateTone(access)),
  ];
  if (poi.district) {
    lines.push(labelValueLine("DISTRICT", poi.district, "tui-muted"));
  }
  if (poi.summary) {
    lines.push({ parts: [{ text: "SUMMARY:", className: "tui-system" }] });
    wrapLine(poi.summary, COLUMN.right - 2).forEach((line) => {
      lines.push({
        parts: [
          { text: "  ", className: "tui-muted" },
          { text: line, className: "tui-primary" },
        ],
      });
    });
  }
  const sectors = buildSectorSummary(allPois);
  if (sectors.length) {
    lines.push({ parts: [{ text: "SECTORS:", className: "tui-system" }] });
    sectors.forEach((entry) => {
      lines.push({
        parts: [
          { text: "  ", className: "tui-muted" },
          { text: SYMBOLS.bullet + " ", className: "tui-muted" },
          { text: entry, className: "tui-primary" },
        ],
      });
    });
  }
  const content = getPoiContent(poi);
  const previewDetails = Array.isArray(content.details) ? content.details : [];
  if (previewDetails?.length) {
    lines.push({ parts: [{ text: "FEED:", className: "tui-system" }] });
    previewDetails.slice(0, 2).forEach((entry) => {
      wrapLine(entry, COLUMN.right - 4).forEach((line) => {
        lines.push({
          parts: [
            { text: "  ", className: "tui-muted" },
            { text: SYMBOLS.bulletMuted + " ", className: "tui-muted" },
            { text: line, className: "tui-muted" },
          ],
        });
      });
    });
  }
  return lines;
};

const mergeItemsWithPreview = (items, previewLines) => {
  const totalLines = items.reduce((sum, item) => {
    const list = Array.isArray(item.lines) ? item.lines : [item.lines];
    return sum + list.length;
  }, 0);
  const rightLines = previewLines.slice(0, totalLines);
  while (rightLines.length < totalLines) rightLines.push("");
  let rowIndex = 0;
  return items.map((item) => {
    const lines = Array.isArray(item.lines) ? item.lines : [item.lines];
    const merged = lines.map((line) => {
      const right = rightLines[rowIndex] || "";
      rowIndex += 1;
      const leftParts = padParts(
        trimParts(toParts(line), COLUMN.left),
        COLUMN.left
      );
      const rightParts = padParts(
        trimParts(toParts(right), COLUMN.right),
        COLUMN.right
      );
      return {
        parts: [
          ...leftParts,
          { text: COLUMN.divider, className: "tui-sep" },
          ...rightParts,
        ],
      };
    });
    return { ...item, lines: merged };
  });
};

const renderDetails = async (poi, evaluation) => {
  const content = getPoiContent(poi);
  const details = Array.isArray(content.details) ? content.details : [];
  const contacts = Array.isArray(content.contacts) ? content.contacts : [];
  const notes = Array.isArray(content.notes) ? content.notes : [];
  const detailLine = (text) => wrapLine(text, 80);
  const lines = [
    " ",
    ...detailLine(`POI: ${poi.name}`),
    ...(poi.district ? detailLine(`DISTRITO: ${poi.district}`) : []),
    ...(poi.status
      ? detailLine(`ESTADO: ${(poi.status || "").toUpperCase()}`)
      : []),
    ...(poi.summary ? detailLine(`RESUMEN: ${poi.summary}`) : []),
  ].filter(Boolean);
  lines.push(" ");
  await type(lines, { stopBlinking: true });

  if (details?.length) {
    await type(["INTEL"], { stopBlinking: true });
    const intelLines = [];
    details.forEach((entry) => {
      wrapLine(`> ${entry}`, 80).forEach((line, idx) => {
        intelLines.push(idx === 0 ? line : `  ${line}`);
      });
    });
    await type(intelLines, { stopBlinking: true });
  }
  if (contacts?.length) {
    await type(["CONTACTOS"], { stopBlinking: true });
    await type(contacts.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  if (notes?.length) {
    await type(["NOTAS"], { stopBlinking: true });
    await type(notes.map((entry) => `> ${entry}`), {
      stopBlinking: true,
    });
  }
  await type([" "], { stopBlinking: true });
  markSeen("map", poi.id, Number(poi.updatedAt || Date.now()));
};

const hasChildren = (pois, id) =>
  pois.some((poi) => (getPoiHierarchy(poi).parentId || "") === id);

async function attemptUnlock(node, evaluation) {
  return attemptEntityUnlock(node, evaluation, {
    passwordPrompt: "CODIGO DE ACCESO: ",
    passwordSuccessLines: ["ACCESO CONCEDIDO", " "],
    passwordFailureLines: ["ACCESO DENEGADO", " "],
    prerequisiteIntroLines: ["ACCESO BLOQUEADO.", "PREREQUISITOS PENDIENTES:"],
    chainSuccessLines: ["CADENA COMPLETA. ACCESO HABILITADO.", " "],
    flagsIntroLines: ["SE NECESITAN FLAGS ACTIVAS:"],
    conditionalSuccessLines: ["CONDICIONES SATISFECHAS. ACCESO HABILITADO.", " "],
    puzzleLines: [" ", "PUZZLE REQUERIDO: EJECUTA EL MODULO DESDE EL PANEL DM.", "El modo puzzle aun no esta operativo en la TUI.", " "],
  });
}

async function browsePois(pois) {
  let campaignState = loadCampaignState();
  const stack = [{ parentId: "", crumbs: ["MAP"], pageIndex: 0 }];

  while (stack.length) {
    const { parentId, crumbs } = stack[stack.length - 1];
    campaignState = loadCampaignState();
    const statusContext = await getStatusContext();
    const nodes = pois
      .filter((poi) => (getPoiHierarchy(poi).parentId || "") === parentId)
      .map((poi) => ({
        poi,
        evaluation: evaluateAccess(poi, campaignState),
      }))
      .filter(({ evaluation }) => evaluation.visible || evaluation.listed);

    if (!nodes.length) {
      if (stack.length > 1) {
        await type([" ", "SIN ENTRADAS EN ESTE SUBMENU.", " "], {
          stopBlinking: true,
        });
        stack.pop();
        continue;
      }
      await type(
        [" ", "NO HAY POIs CONFIGURADOS PARA ESTE NIVEL.", " "],
        { stopBlinking: true }
      );
      return;
    }

    const breadcrumb = crumbs.join(" / ");
    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const items = nodes.map(({ poi, evaluation }, index) => ({
      lines: formatNodeLine(poi, evaluation, index, campaignState),
      action: "input",
      value: String(index + 1),
      _poi: poi,
      _evaluation: evaluation,
    }));

    const headerLines = [
      ...buildHeaderLines({
        node: "WAYNE AUX NODE",
        view: "MAPA",
        status: "ONLINE",
        link: "SECURE",
        mode: "SITUATION",
        caseLabel: statusContext?.activeCase
          ? statusContext.activeCase.title || statusContext.activeCase.id
          : activeCaseId || "NONE",
        alert: statusContext?.state?.alertLevel || "LOW",
        flags: (statusContext?.state?.flags || []).join(" | ") || "NONE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-system" }] })),
      { parts: [{ text: titleLine("MAPA :: CONCIENCIA SITUACIONAL"), className: "tui-system" }] },
      mergeLine(
        { parts: [{ text: "SECTORES / HOTSPOTS", className: "tui-system" }] },
        { parts: [{ text: "SITUACION / FEED", className: "tui-system" }] }
      ),
      mergePartsLine(
        { text: "─".repeat(COLUMN.left), className: "tui-sep" },
        { text: "─".repeat(COLUMN.right), className: "tui-sep" },
        { leftWidth: COLUMN.left, rightWidth: COLUMN.right, divider: "┼", dividerClass: "tui-sep" }
      ),
    ];
    if (statusContext?.unsynced) {
      headerLines.push(
        mergeLine(
          { parts: [{ text: "SYNC: DATA LOCAL", className: "tui-warn" }] },
          { parts: [{ text: "API OFFLINE", className: "tui-warn" }] }
        )
      );
    }

    const baseFooterLines = [
      mergeLine(
        {
          parts: [
            { text: "HINTS: ", className: "tui-system" },
            { text: "ENTER", className: "tui-accent" },
            { text: " abrir | ", className: "tui-muted" },
            { text: "/", className: "tui-accent" },
            { text: " buscar | ", className: "tui-muted" },
            { text: "B", className: "tui-accent" },
            { text: " back", className: "tui-muted" },
          ],
        },
        ""
      ),
      ...buildFooterLines({
        mode: "SITUATION",
        link: "SECURE",
      }).map((line) => ({ parts: [{ text: line, className: "tui-muted" }] })),
    ];
    const baseChips = [
      { label: "MAPA", action: "command", value: "map" },
      { label: "CASOS", action: "command", value: "cases" },
      { label: "VILLANOS", action: "command", value: "villains" },
      { label: "DIALER", action: "command", value: "dialer" },
    ];
    const { pages, pageCount } = paginateSelectableItems({
      lines: headerLines,
      items,
      footerLines: baseFooterLines,
      chips: baseChips,
    });
    const pageIndex = Math.max(
      0,
      Math.min(stack[stack.length - 1].pageIndex || 0, pageCount - 1)
    );
    stack[stack.length - 1].pageIndex = pageIndex;
    const pageItems = pages[pageIndex] || [];
    const pageDefaultIndex = pageItems.length ? 0 : -1;
    const focusItem = pageItems[pageDefaultIndex] || pageItems[0] || null;
    const previewLines = buildPreviewLines(
      focusItem?._poi,
      focusItem?._evaluation,
      campaignState,
      pois,
      crumbs
    );
    const pageItemsMerged = mergeItemsWithPreview(pageItems, previewLines);
    const footerLines =
      pageCount > 1
        ? [
            mergeLine(`PAGINA ${pageIndex + 1}/${pageCount} (N/P)`, ""),
            ...baseFooterLines,
          ]
        : baseFooterLines;
    const chips =
      pageCount > 1 && isPortraitNarrow()
        ? [
            ...baseChips,
            { label: "PREV", action: "select", value: "P" },
            { label: "NEXT", action: "select", value: "N" },
          ]
        : baseChips;

    clear();
    await renderSelectableLines({
      lines: headerLines,
      items: pageItemsMerged,
      footerLines,
      chips,
      context: { backValue: "B", backAction: "input" },
      defaultIndex: pageDefaultIndex,
    }, fastRender);

    let choice = "";
    if (isPortraitNarrow()) {
      const selected = await waitForSelection();
      const action = selected?.dataset?.action || "";
      const value = selected?.dataset?.value || "";
      if (action === "command" && value) {
        await parse(value);
        return;
      }
      choice = value || "";
    } else {
      choice = await input(false, {
        hint: "AUX-01 > open sector 2 | / filter status:critical | back",
      });
    }
    if (!choice) continue;
    const normalized = choice.trim().toUpperCase();
    if (normalized === "X") {
      await type([" ", "CERRANDO MATRIZ CARTOGRAFICA.", " "], {
        stopBlinking: true,
      });
      clear();
      return;
    }
    if (normalized === "B") {
      if (stack.length > 1) {
        stack.pop();
      } else {
        await type([" ", "YA ESTAS EN LA RAIZ DEL MAPA.", " "], {
          stopBlinking: true,
        });
      }
      continue;
    }
    if (normalized === "R") {
      stack.length = 1;
      continue;
    }
    if (normalized === "N" && pageCount > 1) {
      stack[stack.length - 1].pageIndex = (pageIndex + 1) % pageCount;
      continue;
    }
    if (normalized === "P" && pageCount > 1) {
      stack[stack.length - 1].pageIndex = (pageIndex - 1 + pageCount) % pageCount;
      continue;
    }

    const index = Number(choice) - 1;
    if (Number.isNaN(index) || index < 0 || index >= nodes.length) {
      await type([" ", "SELECCION NO VALIDA.", " "], { stopBlinking: true });
      continue;
    }

    const { poi, evaluation } = nodes[index];
    if (!evaluation.unlocked) {
      const unlocked = await attemptUnlock(poi, evaluation);
      if (!unlocked) {
        continue;
      }
      campaignState = loadCampaignState();
    }

    clear();
    await renderDetails(poi, evaluation);

    const nodeType = getNodeType(poi);
    if (
      (nodeType === "container" || nodeType === "mixed") &&
      hasChildren(pois, poi.id)
    ) {
      let answer = "";
      if (isPortraitNarrow()) {
        await renderSelectableLines({
          lines: ["Entrar en submenu?"],
          chips: [
            { label: "SI", action: "select", value: "Y" },
            { label: "NO", action: "select", value: "N" },
          ],
        });
        const selected = await waitForSelection();
        answer = selected?.dataset?.value || "";
      } else {
        answer = await prompt("Entrar en submenu (Y/N): ");
      }
      if (answer && answer.trim().toLowerCase().startsWith("y")) {
        stack.push({
          parentId: poi.id,
          crumbs: [...crumbs, getNodeLabel(poi)],
          pageIndex: 0,
        });
        continue;
      }
    }
    clear();
  }
}

export default async (args = "") => {
  await refreshCampaignState();
  const mapArgs = parseMapArgs(args);
  const hasCaseScopedMap = mapArgs.forceEmptyState || mapArgs.poiIds.length > 0;
  const data = await fetchPois();
  if (dataSource !== "api") {
    await print(["FALLBACK DATA IN USE."], {
      semantic: "system",
      stopBlinking: true,
      ...fastRender,
    });
  }
  const allPois = data.pois || [];
  const pois =
    mapArgs.poiIds.length && !mapArgs.forceEmptyState
      ? allPois.filter((poi) => mapArgs.poiIds.includes(String(poi.id || "").toLowerCase()))
      : allPois;
  if (!pois.length) {
    await showMapOverlay({
      pois: [],
      hotspotsData: {
        image: "/mapa.png",
        aspectRatio: 1,
        hotspots: [],
        scopedLabel: "MAPA :: CONTEXTO DE CASO",
        emptyState: {
          title: "SECTOR :: SIN INFORMACION",
          imageText: "SIN INFORMACION GEOGRAFICA DEL CASO.",
          summary: "Este caso no tiene POIs asignados.",
          details: "SIN INFORMACION.",
          contacts: "SIN INFORMACION.",
          notes: "ASIGNA UN POI AL CASO DESDE DM PARA ACTIVAR EL MAPA.",
        },
      },
    });
    return;
  }
  const hotspotsData = await fetchHotspots();
  const derivedHotspots = buildHotspotsFromPois(pois);
  const overlayPayload =
    hasCaseScopedMap
      ? {
          image: hotspotsData?.image || "/mapa.png",
          aspectRatio: Number(hotspotsData?.aspectRatio) || 1,
          hotspots: derivedHotspots,
          scopedLabel: "MAPA :: CONTEXTO DE CASO",
        }
      : derivedHotspots.length
      ? {
          image: hotspotsData?.image || "/mapa.png",
          aspectRatio: Number(hotspotsData?.aspectRatio) || 1,
          hotspots: derivedHotspots,
        }
      : hotspotsData;
  if (overlayPayload && Array.isArray(overlayPayload.hotspots)) {
    await showMapOverlay({ pois, hotspotsData: overlayPayload });
    return;
  }
  await browsePois(pois);
};
