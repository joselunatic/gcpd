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
const MAP4X_IMAGE = "/mapa4x.png";
const MAP4X_WIDTH = 3200;
const MAP4X_HEIGHT = 4300;
const MAP_LOUPE_POSITION_KEY = "terminalMapLoupePosition";
let cache;
let dataSource = "api";

async function fetchJson(url) {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }
  return response.json();
}

const safeJsonParse = (value, fallback = null) => {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const basename = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const clean = raw.split("?")[0].split("#")[0];
  const parts = clean.split("/").filter(Boolean);
  return parts.length ? parts[parts.length - 1] : clean;
};

const inferPoiResourceType = (resource = {}) => {
  const explicit = String(resource.type || resource.kind || resource.mime || "").toLowerCase();
  const src = String(resource.src || resource.url || resource.path || resource.href || "").toLowerCase();
  if (explicit.includes("image") || /\.(png|jpe?g|gif|webp|avif|svg)$/.test(src)) return "image";
  if (explicit.includes("video") || /\.(mp4|webm|mov|m4v)$/.test(src)) return "video";
  if (explicit.includes("audio") || /\.(mp3|wav|ogg|m4a)$/.test(src)) return "audio";
  if (explicit.includes("pdf") || /\.pdf$/.test(src)) return "pdf";
  return explicit || "document";
};

const collectPoiResources = (poi = {}) => {
  const sources = [
    poi.resources,
    poi.media,
    poi.attachments,
    poi.assets,
    poi.commands?.resources,
    poi.commands?.media,
    poi.poiV2?.resources,
    poi.poiV2?.media,
  ];
  const items = sources.flatMap((source) => (Array.isArray(source) ? source : source ? [source] : []));
  return items
    .map((entry, index) => {
      const value = typeof entry === "string" ? { src: entry } : entry || {};
      const src = String(value.src || value.url || value.path || value.href || "").trim();
      const label = String(value.label || value.title || value.name || value.caption || basename(src) || `RECURSO ${index + 1}`).trim();
      if (!src && !label) return null;
      return {
        id: String(value.id || value.resourceId || value.assetId || src || `${poi.id || "poi"}-resource-${index + 1}`).trim(),
        label,
        type: inferPoiResourceType(value),
        src,
        visible: value.visible !== false,
        visibility: String(value.visibility || value.access || (value.visible === false ? "hidden" : "listed")).trim() || "listed",
        description: String(value.description || value.notes || "").trim(),
      };
    })
    .filter(Boolean)
    .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index);
};

const getSessionStorageJson = (key, fallback = null) => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return fallback;
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = safeJsonParse(raw, null);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
};

const setSessionStorageJson = (key, value) => {
  try {
    if (typeof window === "undefined" || !window.sessionStorage) return;
    window.sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore storage failures */
  }
};

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
      display: block;
      position: relative;
      padding: 12px;
      box-sizing: border-box;
    }
    .terminal-map-panel {
      width: min(44vw, 560px);
      height: calc(100% - 56px);
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
      position: absolute;
      right: 14px;
      top: 54px;
      overflow: hidden auto;
      border-radius: 10px;
      z-index: 60;
      backdrop-filter: blur(2px);
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
    .terminal-map-panel__inset {
      position: relative;
      display: grid;
      gap: 8px;
      flex: 1;
      min-height: 0;
    }
    .terminal-map-panel__inset.is-hidden {
      display: none;
    }
    .terminal-map-panel__inset-head {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      align-items: center;
      font-size: 10px;
      letter-spacing: 0.12em;
      color: rgba(191, 255, 220, 0.66);
      text-transform: uppercase;
    }
    .terminal-map-panel__inset-title {
      color: #e4fff3;
    }
    .terminal-map-panel__inset-body {
      position: relative;
      flex: 1;
      min-height: 0;
      border: 1px dashed rgba(124, 255, 178, 0.42);
      border-radius: 10px;
      overflow: hidden;
      background: rgba(1, 5, 4, 0.94);
    }
    .terminal-map-panel__inset-body::before,
    .terminal-map-panel__inset-body::after {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
    }
    .terminal-map-panel__inset-body::before {
      background:
        linear-gradient(rgba(124, 255, 178, 0.04) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124, 255, 178, 0.04) 1px, transparent 1px);
      background-size: 26px 26px;
      mix-blend-mode: screen;
      opacity: 0.55;
    }
    .terminal-map-panel__inset-body::after {
      border-radius: inherit;
      box-shadow: inset 0 0 42px rgba(124, 255, 178, 0.08);
      background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(1, 5, 4, 0.1) 66%, rgba(1, 5, 4, 0.32) 100%);
    }
    .terminal-map-panel__inset-stage {
      position: absolute;
      inset: 0;
      overflow: hidden;
      border-radius: inherit;
    }
    .terminal-map-panel__inset-surface {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-color: #030804;
      transform-origin: 0 0;
    }
    .terminal-map-panel__inset-node {
      position: absolute;
      transform: translate(-50%, -50%);
      padding: 3px 5px;
      border: 1px solid rgba(124, 255, 178, 0.48);
      border-radius: 999px;
      background: rgba(2, 10, 8, 0.92);
      color: #dfffee;
      font-size: 8px;
      line-height: 1;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.55), 0 0 12px rgba(124, 255, 178, 0.18);
      transition: transform 120ms ease-out, box-shadow 120ms ease-out, border-color 120ms ease-out;
      max-width: 70%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .terminal-map-panel__inset-node:hover,
    .terminal-map-panel__inset-node.is-active {
      border-color: #e4fff3;
      box-shadow: 0 0 0 1px rgba(191, 255, 220, 0.5), 0 0 18px rgba(124, 255, 178, 0.4);
      transform: translate(-50%, -50%) scale(1.03);
    }
    .terminal-map-panel__inset-node--focus {
      border-color: rgba(166, 226, 255, 0.95);
      background: rgba(2, 12, 18, 0.96);
      color: #f1fbff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 18px rgba(103, 207, 255, 0.28);
    }
    .terminal-map-panel__inset-node.is-cluster-focus {
      border-color: rgba(255, 224, 152, 0.98);
      color: #fff3d8;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 18px rgba(255, 207, 103, 0.36);
    }
    .terminal-map-panel__inset-empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: rgba(191, 255, 220, 0.58);
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: center;
      padding: 0 10px;
    }
    .terminal-map-frame {
      position: relative;
      overflow: hidden;
      border-radius: 10px;
      box-shadow: 0 0 0 1px rgba(124, 255, 178, 0.15), 0 0 30px rgba(124, 255, 178, 0.08);
      background: #040807;
      width: 100%;
      height: 100%;
    }
    .terminal-map-stage {
      position: absolute;
      inset: 0;
      overflow: hidden;
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
      transform: none;
      transform-origin: center center;
      transition: none;
      will-change: auto;
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
      width: fit-content !important;
      inline-size: fit-content !important;
      height: auto !important;
      min-width: 0 !important;
      min-height: 0 !important;
      border-radius: 999px;
      border: 1px solid rgba(176, 255, 210, 0.96);
      background: rgba(1, 6, 5, 0.9);
      color: #f2fff7;
      font: 600 8px/1 "Courier New", monospace;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      cursor: pointer;
      text-shadow: 0 1px 2px #000, 0 0 5px rgba(0, 0, 0, 0.95);
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.78),
        0 0 7px rgba(124, 255, 178, 0.34);
      padding: 1px 5px;
      z-index: 2;
      transition: border-color 120ms ease-out, box-shadow 120ms ease-out,
        background-color 120ms ease-out, opacity 120ms ease-out;
      outline: none;
      white-space: nowrap;
      max-width: 150px !important;
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
      border-color: rgba(176, 255, 210, 0.86);
      background: rgba(1, 6, 5, 0.86);
      color: rgba(242, 255, 247, 0.96);
      font-size: 7px;
      letter-spacing: 0.02em;
      padding: 1px 4px;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72);
      opacity: 0.94;
      max-width: 118px !important;
    }
    .terminal-map-hotspot.is-cluster {
      border-color: rgba(166, 226, 255, 0.98);
      background: rgba(2, 12, 18, 0.92);
      color: #f1fbff;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.86),
        0 0 9px rgba(103, 207, 255, 0.46);
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
      background: rgba(0, 11, 8, 0.98);
      box-shadow: 0 0 0 1px rgba(191, 255, 220, 0.5),
        0 0 14px rgba(124, 255, 178, 0.75);
      color: #ffffff;
      opacity: 1;
      z-index: 3;
    }
    .terminal-map-hotspot:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-loupe {
      position: fixed;
      right: 18px;
      top: 72px;
      width: min(44vw, 560px);
      height: min(56vh, 460px);
      min-width: 320px;
      min-height: 260px;
      max-width: calc(100vw - 24px);
      max-height: calc(100vh - 24px);
      resize: none;
      z-index: 120;
      display: grid;
      grid-template-rows: auto 1fr auto;
      border: 1px solid rgba(124, 255, 178, 0.52);
      border-radius: 12px;
      background: rgba(2, 8, 6, 0.92);
      box-shadow: 0 0 24px rgba(124, 255, 178, 0.18);
      overflow: hidden;
      backdrop-filter: blur(2px);
      pointer-events: auto;
    }
    .terminal-map-loupe.is-locked {
      border-color: rgba(255, 224, 152, 0.78);
      box-shadow: 0 0 24px rgba(255, 207, 103, 0.18);
    }
    .terminal-map-loupe.is-free .terminal-map-loupe__head {
      border-bottom-color: rgba(124, 255, 178, 0.24);
    }
    .terminal-map-loupe.is-hidden {
      display: none;
    }
    .terminal-map-loupe__head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 8px 10px;
      border-bottom: 1px solid rgba(124, 255, 178, 0.24);
      font: 600 10px/1.2 "Courier New", monospace;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: #dfffee;
      background: rgba(4, 12, 10, 0.94);
      cursor: move;
      user-select: none;
      touch-action: none;
    }
    .terminal-map-loupe.is-dragging {
      box-shadow: 0 0 30px rgba(124, 255, 178, 0.28);
    }
    .terminal-map-loupe__meta {
      color: rgba(191, 255, 220, 0.72);
    }
    .terminal-map-loupe__state {
      color: rgba(228, 255, 243, 0.92);
    }
    .terminal-map-loupe__body {
      position: relative;
      min-height: 0;
      overflow: hidden;
      background:
        linear-gradient(rgba(124, 255, 178, 0.05) 1px, transparent 1px),
        linear-gradient(90deg, rgba(124, 255, 178, 0.05) 1px, transparent 1px),
        #020604;
      background-size: 28px 28px;
    }
    .terminal-map-loupe__surface {
      position: absolute;
      inset: 0;
      background-repeat: no-repeat;
      background-color: #030804;
      transform-origin: 0 0;
    }
    .terminal-map-loupe__surface::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background: radial-gradient(circle at 50% 50%, transparent 0%, rgba(1, 5, 4, 0.06) 66%, rgba(1, 5, 4, 0.28) 100%);
      mix-blend-mode: screen;
    }
    .terminal-map-loupe__node {
      position: absolute;
      transform: translate(-50%, -50%);
      padding: 3px 6px;
      border: 1px solid rgba(166, 226, 255, 0.96);
      border-radius: 999px;
      background: rgba(2, 12, 18, 0.94);
      color: #f1fbff;
      font-size: 8px;
      line-height: 1;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 16px rgba(103, 207, 255, 0.22);
      max-width: 72%;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .terminal-map-loupe__node:hover,
    .terminal-map-loupe__node.is-active {
      border-color: #e4fff3;
      box-shadow: 0 0 0 1px rgba(191, 255, 220, 0.5), 0 0 18px rgba(124, 255, 178, 0.38);
    }
    .terminal-map-loupe__node.is-focus {
      border-color: rgba(255, 224, 152, 0.98);
      color: #fff3d8;
      box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.72), 0 0 18px rgba(255, 207, 103, 0.36);
    }
    .terminal-map-loupe__empty {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: rgba(191, 255, 220, 0.58);
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: center;
      padding: 0 14px;
    }
    .terminal-map-loupe__foot {
      padding: 7px 10px;
      border-top: 1px solid rgba(124, 255, 178, 0.18);
      font: 600 9px/1.2 "Courier New", monospace;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: rgba(191, 255, 220, 0.62);
      background: rgba(4, 12, 10, 0.94);
    }
    .terminal-map-loupe__resize {
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 18px;
      height: 18px;
      border-right: 2px solid rgba(124, 255, 178, 0.4);
      border-bottom: 2px solid rgba(124, 255, 178, 0.4);
      border-radius: 0 0 10px 0;
      cursor: nwse-resize;
      opacity: 0.8;
      pointer-events: auto;
      z-index: 2;
      background:
        linear-gradient(135deg, transparent 44%, rgba(124, 255, 178, 0.5) 44%, rgba(124, 255, 178, 0.5) 56%, transparent 56%);
    }
    .terminal-map-panel__poi-button {
      width: 100% !important;
      border: 1px solid rgba(124, 255, 178, 0.28);
      background: rgba(4, 8, 7, 0.54);
      color: #bfffdc;
      font: inherit;
      letter-spacing: inherit;
      text-align: left;
      text-transform: uppercase;
      padding: 5px 7px;
      cursor: pointer;
      overflow-wrap: anywhere;
    }
    .terminal-map-panel__poi-button:hover,
    .terminal-map-panel__poi-button:focus-visible {
      border-color: rgba(228, 255, 243, 0.88);
      color: #e4fff3;
      outline: none;
      background: rgba(14, 26, 20, 0.92);
    }
    .terminal-map-panel__meta--compact {
      grid-template-columns: auto 1fr auto 1fr;
      gap: 4px 10px;
    }
    .terminal-map-panel__meta-value {
      color: #e4fff3;
      overflow-wrap: anywhere;
      word-break: break-word;
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
    .terminal-map-popup {
      position: absolute;
      inset: 0;
      z-index: 180;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 14px;
      background: rgba(1, 6, 5, 0.78);
      backdrop-filter: blur(1px);
      overflow: hidden;
    }
    .terminal-map-popup__backdrop {
      position: absolute;
      inset: 0;
    }
    .terminal-map-popup__card {
      position: relative;
      z-index: 1;
      width: min(1180px, calc(100vw - 28px));
      height: min(88vh, calc(100vh - 28px));
      overflow: hidden;
      display: grid;
      grid-template-rows: auto minmax(0, 1fr);
      border: 1px solid rgba(124, 255, 178, 0.72);
      border-radius: 12px;
      background:
        radial-gradient(circle at 20% 0%, rgba(124, 255, 178, 0.14), transparent 42%),
        #030806;
      box-shadow: 0 0 30px rgba(124, 255, 178, 0.18);
    }
    .terminal-map-popup__head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
      border-bottom: 1px solid rgba(124, 255, 178, 0.3);
      background: rgba(4, 12, 10, 0.96);
      font: 600 11px/1.2 "Courier New", monospace;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #dfffee;
      min-width: 0;
    }
    .terminal-map-popup__head > div:first-child {
      min-width: 0;
    }
    .terminal-map-popup__head > div:first-child > div:last-child {
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .terminal-map-popup__eyebrow {
      color: rgba(191, 255, 220, 0.7);
      min-width: 0;
    }
    .terminal-map-popup__close {
      background: transparent;
      border: 1px solid rgba(124, 255, 178, 0.72);
      color: #bfffdc;
      font: 600 10px/1 "Courier New", monospace;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding: 6px 10px;
      cursor: pointer;
    }
    .terminal-map-popup__close:focus-visible {
      outline: 2px solid rgba(228, 255, 243, 0.98);
      outline-offset: 2px;
    }
    .terminal-map-popup__body {
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      display: grid;
      gap: 6px;
      padding: 6px;
      grid-template-columns: minmax(0, 1.18fr) minmax(0, 0.82fr);
      align-items: start;
      align-content: start;
      grid-auto-rows: min-content;
      min-width: 0;
    }
    .terminal-map-popup__media {
      display: grid;
      gap: 4px;
      align-content: start;
      grid-template-rows: auto;
      min-height: 0;
      min-width: 0;
      align-self: start;
    }
    .terminal-map-popup__image {
      position: relative;
      min-height: 0;
      aspect-ratio: 16 / 9;
      max-height: 46vh;
      border: 1px solid rgba(124, 255, 178, 0.24);
      border-radius: 10px;
      overflow: hidden;
      background:
        radial-gradient(circle at 50% 50%, rgba(124, 255, 178, 0.1), transparent 55%),
        rgba(2, 7, 5, 0.9);
    }
    .terminal-map-popup__image img {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
    .terminal-map-popup__image-placeholder {
      position: absolute;
      inset: 0;
      display: grid;
      place-items: center;
      color: rgba(191, 255, 220, 0.58);
      font-size: 10px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: center;
      padding: 0 12px;
    }
    .terminal-map-popup__summary {
      grid-column: 1 / -1;
      font-size: 12px;
      line-height: 1.54;
      color: rgba(228, 255, 243, 0.88);
      letter-spacing: 0.04em;
      padding: 8px 10px;
      border: 1px solid rgba(124, 255, 178, 0.18);
      border-radius: 10px;
      background: rgba(4, 12, 10, 0.74);
      max-height: clamp(140px, 24vh, 260px);
      overflow-y: auto;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
      min-width: 0;
    }
    .terminal-map-popup__details {
      display: grid;
      gap: 5px;
      align-content: start;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      grid-auto-rows: min-content;
      min-height: 0;
      min-width: 0;
      align-self: start;
    }
    .terminal-map-popup__section {
      display: grid;
      gap: 3px;
      padding: 5px 7px;
      border: 1px solid rgba(124, 255, 178, 0.16);
      border-radius: 10px;
      background: rgba(4, 12, 10, 0.7);
      min-width: 0;
    }
    .terminal-map-popup__section-title {
      color: rgba(191, 255, 220, 0.66);
      font-size: 9px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }
    .terminal-map-popup__lines {
      display: grid;
      gap: 3px;
      font-size: 10px;
      color: rgba(228, 255, 243, 0.82);
      line-height: 1.42;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-word;
      min-width: 0;
    }
    .terminal-map-popup__lines > div {
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
      white-space: pre-wrap;
    }
    .terminal-map-popup__resource-list {
      display: grid;
      gap: 3px;
      min-width: 0;
    }
    .terminal-map-popup__resource-item {
      display: grid;
      gap: 2px;
      min-width: 0;
      padding: 4px 6px;
      border: 1px solid rgba(124, 255, 178, 0.12);
      border-radius: 8px;
      background: rgba(2, 10, 8, 0.4);
    }
    .terminal-map-popup__resource-head {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 6px;
      align-items: center;
      min-width: 0;
      overflow-wrap: anywhere;
      word-break: break-word;
    }
    .terminal-map-popup__resource-badge {
      flex: 0 0 auto;
      padding: 2px 5px;
      border: 1px solid rgba(124, 255, 178, 0.24);
      border-radius: 999px;
      color: rgba(191, 255, 220, 0.84);
      font-size: 8px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    .terminal-map-popup__resource-label {
      min-width: 0;
      color: rgba(228, 255, 243, 0.92);
    }
    .terminal-map-popup__resource-meta {
      color: rgba(191, 255, 220, 0.68);
      font-size: 8px;
      overflow-wrap: anywhere;
      word-break: break-word;
      min-width: 0;
    }
    @media (max-width: 639px) {
      .terminal-map-shell {
        width: 100%;
        height: 100%;
        gap: 12px;
      }
      .terminal-map-panel {
        width: calc(100% - 20px);
        height: auto;
        top: 54px;
        right: 10px;
        bottom: 10px;
      }
      .terminal-map-popup {
        padding: 0;
      }
      .terminal-map-popup__body {
        grid-template-columns: 1fr;
      }
      .terminal-map-popup__details {
        grid-template-columns: 1fr;
      }
      .terminal-map-popup__card {
        width: 100%;
        height: 100%;
      }
      .terminal-map-lightbox {
        padding: 14px;
      }
      .terminal-map-lightbox__card {
        width: 100%;
        max-height: 92%;
      }
      .terminal-map-loupe {
        right: 12px;
        left: 12px;
        top: auto;
        bottom: 12px;
        width: auto;
        height: 38vh;
        min-width: 0;
        min-height: 220px;
      }
    }
  `;
  document.head.appendChild(style);
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

  const baseImage = document.createElement("img");
  baseImage.className = "terminal-map-image";
  baseImage.alt = "MAPA GOTHAM";
  baseImage.src = hotspotsData?.image || "/mapa.png";
  viewport.appendChild(baseImage);

  const loupe = document.createElement("div");
  loupe.className = "terminal-map-loupe is-hidden";
  loupe.innerHTML = `
    <div class="terminal-map-loupe__head">
      <div data-role="title">LUPA :: INACTIVA</div>
      <div class="terminal-map-loupe__meta"><span class="terminal-map-loupe__state" data-role="state">FREE</span> · <span data-role="meta">MUEVE EL RATON SOBRE EL MAPA</span></div>
    </div>
    <div class="terminal-map-loupe__body">
      <div class="terminal-map-loupe__surface"></div>
      <div class="terminal-map-loupe__empty" data-role="empty">SIN DATOS</div>
    </div>
    <div class="terminal-map-loupe__foot" data-role="foot">HOVER PARA DESPLEGAR POIS EN ZOOM REAL</div>
    <div class="terminal-map-loupe__resize" aria-hidden="true"></div>
  `;
  document.body.appendChild(loupe);

  const ui = document.createElement("div");
  ui.className = "terminal-map-ui";
  ui.innerHTML = `
    <div>${escapeHtml(hotspotsData?.scopedLabel || "MAPA :: SECTORES")}</div>
    <button class="terminal-map-ui__button" type="button" data-action="exit">SALIR</button>
  `;
  overlay.appendChild(ui);

  const exitButton = ui.querySelector("[data-action='exit']");
  const loupeTitle = loupe.querySelector("[data-role='title']");
  const loupeMeta = loupe.querySelector("[data-role='meta']");
  const loupeState = loupe.querySelector("[data-role='state']");
  const loupeFoot = loupe.querySelector("[data-role='foot']");
  const loupeEmpty = loupe.querySelector("[data-role='empty']");
  const loupeSurface = loupe.querySelector(".terminal-map-loupe__surface");
  const loupeHead = loupe.querySelector(".terminal-map-loupe__head");
  const loupeResizeHandle = loupe.querySelector(".terminal-map-loupe__resize");

  const hotspotNodes = [];
  const campaignState = loadCampaignState();
  let activeHotspot = null;
  let poiPopup = null;
  let hoverTarget = null;
  let lockedTarget = null;
  let exitResolver = null;
  let disposed = false;
  let loupeDrag = null;
  let loupeResize = null;
  let loupePositionReady = false;

  const visibleEntries = (Array.isArray(hotspotsData?.hotspots) ? hotspotsData.hotspots : [])
    .map((spot) => {
      const poi = pois.find((entry) => entry.id === spot.id);
      if (!poi) return null;
      const evaluation = evaluateAccess(poi, campaignState);
      if (!evaluation.visible && !evaluation.listed) return null;
      return { spot, poi, evaluation };
    })
    .filter(Boolean);

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const pctToPx = (pct, size) => (clamp(Number(pct) || 0, 0, 100) / 100) * size;

  const buildClusterGroups = (entries = []) => {
    const cols = 6;
    const rows = 8;
    const groups = new Map();
    entries.forEach((entry) => {
      const col = Math.max(0, Math.min(cols - 1, Math.floor((Number(entry.spot.x) / 100) * cols)));
      const row = Math.max(0, Math.min(rows - 1, Math.floor((Number(entry.spot.y) / 100) * rows)));
      const key = `${col}:${row}`;
      if (!groups.has(key)) groups.set(key, { col, row, entries: [] });
      groups.get(key).entries.push(entry);
    });
    return Array.from(groups.values()).map((group) => {
      const x =
        group.entries.reduce((sum, entry) => sum + Number(entry.spot.x || 0), 0) /
        group.entries.length;
      const y =
        group.entries.reduce((sum, entry) => sum + Number(entry.spot.y || 0), 0) /
        group.entries.length;
      return {
        ...group,
        id: `X${group.col + 1}-Y${group.row + 1}`,
        label: `X${group.col + 1} / Y${group.row + 1}`,
        x,
        y,
      };
    });
  };

  const clusterGroups = visibleEntries.length > 12 ? buildClusterGroups(visibleEntries) : [];
  const useClusters = clusterGroups.some((group) => group.entries.length > 1);
  if (visibleEntries.length > 12) overlay.classList.add("is-dense");
  if (useClusters) overlay.classList.add("is-clustered");

  const closePoiPopup = () => {
    if (!poiPopup) return;
    poiPopup.remove();
    poiPopup = null;
  };

  const setLoupeMode = (mode) => {
    const isLocked = mode === "locked";
    loupe.classList.toggle("is-locked", isLocked);
    loupe.classList.toggle("is-free", !isLocked);
    if (loupeState) {
      loupeState.textContent = isLocked ? "LOCKED" : "FREE";
    }
  };

  const endLoupeDrag = () => {
    if (!loupeDrag) return;
    const rect = loupe.getBoundingClientRect();
    setSessionStorageJson(MAP_LOUPE_POSITION_KEY, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
    loupeDrag = null;
    loupe.classList.remove("is-dragging");
    window.removeEventListener("pointermove", onLoupeDragMove);
    window.removeEventListener("pointerup", endLoupeDrag);
    window.removeEventListener("pointercancel", endLoupeDrag);
  };

  const onLoupeDragMove = (event) => {
    if (!loupeDrag) return;
    const left = event.clientX - loupeDrag.offsetX;
    const top = event.clientY - loupeDrag.offsetY;
    applyLoupePosition(left, top, false);
  };

  const startLoupeDrag = (event) => {
    if (event.button !== 0) return;
    if (event.target && event.target.closest("button")) return;
    const rect = loupe.getBoundingClientRect();
    loupeDrag = {
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    loupe.classList.add("is-dragging");
    event.preventDefault();
    window.addEventListener("pointermove", onLoupeDragMove);
    window.addEventListener("pointerup", endLoupeDrag);
    window.addEventListener("pointercancel", endLoupeDrag);
  };

  const endLoupeResize = () => {
    if (!loupeResize) return;
    const rect = loupe.getBoundingClientRect();
    setSessionStorageJson(MAP_LOUPE_POSITION_KEY, {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    });
    loupeResize = null;
    loupe.classList.remove("is-resizing");
    window.removeEventListener("pointermove", onLoupeResizeMove);
    window.removeEventListener("pointerup", endLoupeResize);
    window.removeEventListener("pointercancel", endLoupeResize);
  };

  const onLoupeResizeMove = (event) => {
    if (!loupeResize) return;
    const width = loupeResize.startWidth + (event.clientX - loupeResize.startX);
    const height = loupeResize.startHeight + (event.clientY - loupeResize.startY);
    applyLoupeBounds(
      {
        left: loupeResize.startLeft,
        top: loupeResize.startTop,
        width,
        height,
      },
      false
    );
  };

  const startLoupeResize = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const rect = loupe.getBoundingClientRect();
    loupeResize = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: rect.left,
      startTop: rect.top,
      startWidth: rect.width,
      startHeight: rect.height,
    };
    loupe.classList.add("is-resizing");
    window.addEventListener("pointermove", onLoupeResizeMove);
    window.addEventListener("pointerup", endLoupeResize);
    window.addEventListener("pointercancel", endLoupeResize);
  };

  const clampLoupePosition = (left, top) => {
    const rect = loupe.getBoundingClientRect();
    const width = rect.width || loupe.offsetWidth || 440;
    const height = rect.height || loupe.offsetHeight || 320;
    const margin = 12;
    const maxLeft = Math.max(margin, window.innerWidth - width - margin);
    const maxTop = Math.max(margin, window.innerHeight - height - margin);
    return {
      left: clamp(Number(left) || 0, margin, maxLeft),
      top: clamp(Number(top) || 0, margin, maxTop),
    };
  };

  const clampLoupeSize = (width, height) => {
    const margin = 12;
    const minWidth = 320;
    const minHeight = 220;
    const maxWidth = Math.max(minWidth, window.innerWidth - margin * 2);
    const maxHeight = Math.max(minHeight, window.innerHeight - margin * 2);
    return {
      width: clamp(Number(width) || minWidth, minWidth, maxWidth),
      height: clamp(Number(height) || minHeight, minHeight, maxHeight),
    };
  };

  const applyLoupeBounds = (bounds = {}, persist = false) => {
    const current = loupe.getBoundingClientRect();
    const size = clampLoupeSize(bounds.width ?? current.width, bounds.height ?? current.height);
    const position = clampLoupePosition(bounds.left ?? current.left, bounds.top ?? current.top);
    loupe.style.left = `${Math.round(position.left)}px`;
    loupe.style.top = `${Math.round(position.top)}px`;
    loupe.style.width = `${Math.round(size.width)}px`;
    loupe.style.height = `${Math.round(size.height)}px`;
    loupe.style.right = "auto";
    loupe.style.bottom = "auto";
    loupe.dataset.position = "custom";
    if (persist) {
      setSessionStorageJson(MAP_LOUPE_POSITION_KEY, {
        left: position.left,
        top: position.top,
        width: size.width,
        height: size.height,
      });
    }
    return { ...position, ...size };
  };

  const applyLoupePosition = (left, top, persist = false) => {
    const pos = clampLoupePosition(left, top);
    return applyLoupeBounds({ left: pos.left, top: pos.top }, persist);
  };

  const restoreLoupePosition = () => {
    const saved = getSessionStorageJson(MAP_LOUPE_POSITION_KEY, null);
    if (saved && Number.isFinite(Number(saved.left)) && Number.isFinite(Number(saved.top))) {
      return applyLoupeBounds(saved, false);
    }
    const terminalRect = terminal.getBoundingClientRect();
    const loupeRect = loupe.getBoundingClientRect();
    const margin = 16;
    const rightSide = terminalRect.right + 18;
    const topSide = Math.max(terminalRect.top + 28, margin);
    if (rightSide + loupeRect.width + margin <= window.innerWidth) {
      return applyLoupePosition(rightSide, topSide, false);
    }
    const bottomSide = Math.min(
      window.innerHeight - loupeRect.height - margin,
      Math.max(terminalRect.bottom - loupeRect.height - 12, margin)
    );
    return applyLoupePosition(
      Math.max(margin, window.innerWidth - loupeRect.width - margin),
      bottomSide,
      false
    );
  };

  const syncLoupeVisiblePosition = () => {
    if (loupe.classList.contains("is-hidden")) return;
    if (!loupePositionReady) {
      restoreLoupePosition();
      loupePositionReady = true;
      return;
    }
    const currentLeft = Number.parseFloat(loupe.style.left || "0");
    const currentTop = Number.parseFloat(loupe.style.top || "0");
    if (Number.isFinite(currentLeft) && Number.isFinite(currentTop) && loupe.dataset.position === "custom") {
      applyLoupePosition(currentLeft, currentTop, false);
    } else {
      restoreLoupePosition();
    }
  };

  if (loupeHead) {
    loupeHead.addEventListener("pointerdown", startLoupeDrag);
  }
  if (loupeResizeHandle) {
    loupeResizeHandle.addEventListener("pointerdown", startLoupeResize);
  }

  const openPoiPopup = (poi, evaluation, clusterContext = null) => {
    if (!poi || !evaluation) return;
    closePoiPopup();
    const status = poi.status ? String(poi.status).toUpperCase() : "UNKNOWN";
    const access = statusLabel(evaluation);
    const summary = poi.summary || "";
    const geo = getPoiGeo(poi) || {};
    const content = getPoiContent(poi);
    const imageSrc = geo.image || "";
    const details = Array.isArray(content.details) ? content.details : [];
    const contacts = Array.isArray(content.contacts) ? content.contacts : [];
    const notes = Array.isArray(content.notes) ? content.notes : [];
    const intel = Array.isArray(content.intel) ? content.intel : [];
    const brief = Array.isArray(content.brief) ? content.brief : [];
    const resources = collectPoiResources(poi);
    const resourceMarkup = resources.length
      ? `
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">RECURSOS</div>
          <div class="terminal-map-popup__resource-list">
            ${resources
              .map((resource) => {
                const metaBits = [resource.type, resource.visibility, resource.description]
                  .filter(Boolean)
                  .map((entry) => escapeHtml(entry))
                  .join(" · ");
                return `
                  <div class="terminal-map-popup__resource-item">
                    <div class="terminal-map-popup__resource-head">
                      <span class="terminal-map-popup__resource-badge">${escapeHtml(resource.type || "RECURSO")}</span>
                      <span class="terminal-map-popup__resource-label">${escapeHtml(resource.label || resource.id || "RECURSO")}</span>
                    </div>
                    ${metaBits ? `<div class="terminal-map-popup__resource-meta">${metaBits}</div>` : ""}
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      `
      : `
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">RECURSOS</div>
          <div class="terminal-map-popup__lines"><div>SIN DATOS.</div></div>
        </div>
      `;
    const sectionBlocks = [];
    if (brief.length) {
      sectionBlocks.push(`
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">BRIEF</div>
          <div class="terminal-map-popup__lines">${brief
            .map((entry) => `<div>${escapeHtml(entry)}</div>`)
            .join("")}</div>
        </div>
      `);
    }
    if (intel.length) {
      sectionBlocks.push(`
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">INTEL</div>
          <div class="terminal-map-popup__lines">${intel
            .map((entry) => `<div>${escapeHtml(entry)}</div>`)
            .join("")}</div>
        </div>
      `);
    }
    if (details.length) {
      sectionBlocks.push(`
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">DETALLES</div>
          <div class="terminal-map-popup__lines">${details
            .map((entry) => `<div>${escapeHtml(entry)}</div>`)
            .join("")}</div>
        </div>
      `);
    }
    if (contacts.length) {
      sectionBlocks.push(`
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">CONTACTOS</div>
          <div class="terminal-map-popup__lines">${contacts
            .map((entry) => `<div>${escapeHtml(entry)}</div>`)
            .join("")}</div>
        </div>
      `);
    }
    if (notes.length) {
      sectionBlocks.push(`
        <div class="terminal-map-popup__section">
          <div class="terminal-map-popup__section-title">NOTAS</div>
          <div class="terminal-map-popup__lines">${notes
            .map((entry) => `<div>${escapeHtml(entry)}</div>`)
            .join("")}</div>
        </div>
      `);
    }

    poiPopup = document.createElement("div");
    poiPopup.className = "terminal-map-popup";
    poiPopup.innerHTML = `
      <div class="terminal-map-popup__backdrop"></div>
      <div class="terminal-map-popup__card" role="dialog" aria-modal="true" aria-label="Ficha del POI">
        <div class="terminal-map-popup__head">
          <div>
            <div class="terminal-map-popup__eyebrow">POI DETALLE${clusterContext?.label ? ` :: CLUSTER ${escapeHtml(clusterContext.label)}` : ""}</div>
            <div>${escapeHtml((poi.name || poi.id || "POI").toUpperCase())}</div>
          </div>
          <button class="terminal-map-popup__close" type="button">CERRAR</button>
        </div>
        <div class="terminal-map-popup__body">
          <div class="terminal-map-popup__media">
            <div class="terminal-map-popup__image">
              <img alt="Evidencia POI" />
              <div class="terminal-map-popup__image-placeholder">SIN IMAGEN ASOCIADA</div>
            </div>
          </div>
          <div class="terminal-map-popup__details">
            <div class="terminal-map-popup__section">
              <div class="terminal-map-popup__section-title">METADATOS</div>
              <div class="terminal-map-popup__lines">
                <div>ID: ${escapeHtml(poi.id || "--")}</div>
                <div>STATUS: ${escapeHtml(status)}</div>
                <div>ACCESS: ${escapeHtml(access)}</div>
                <div>DISTRICT: ${escapeHtml(poi.district || "--")}</div>
              </div>
            </div>
            ${sectionBlocks.join("")}
            ${resourceMarkup}
          </div>
          ${summary ? `<div class="terminal-map-popup__summary">${escapeHtml(summary)}</div>` : ""}
        </div>
      </div>
    `;
    const popupImage = poiPopup.querySelector(".terminal-map-popup__image img");
    const imagePlaceholder = poiPopup.querySelector(".terminal-map-popup__image-placeholder");
    if (popupImage && imageSrc) {
      popupImage.src = imageSrc.startsWith("/uploads/") ? `/api${imageSrc}` : imageSrc;
    }
    const imageContainer = poiPopup.querySelector(".terminal-map-popup__image");
    if (popupImage && imageContainer && imagePlaceholder) {
      const syncPlaceholder = () => {
        const hasSrc = Boolean(popupImage.getAttribute("src"));
        const complete = popupImage.complete && popupImage.naturalWidth > 0;
        imagePlaceholder.style.display = hasSrc && complete ? "none" : "grid";
      };
      popupImage.addEventListener("load", () => {
        imageContainer.dataset.loaded = "true";
        syncPlaceholder();
      });
      popupImage.addEventListener("error", () => {
        imageContainer.dataset.loaded = "false";
        syncPlaceholder();
      });
      syncPlaceholder();
    }
    const closeButton = poiPopup.querySelector(".terminal-map-popup__close");
    const backdrop = poiPopup.querySelector(".terminal-map-popup__backdrop");
    if (closeButton) closeButton.addEventListener("click", closePoiPopup);
    if (backdrop) backdrop.addEventListener("click", closePoiPopup);
    overlay.appendChild(poiPopup);
    if (closeButton) closeButton.focus();
  };

  const selectPoiFromNode = async (button, poi, evaluation, clusterContext = null) => {
    if (!evaluation.unlocked) {
      const unlocked = await attemptUnlock(poi, evaluation);
      if (!unlocked) return false;
    }
    if (activeHotspot && activeHotspot !== button) {
      activeHotspot.classList.remove("is-active");
    }
    if (button) {
      button.classList.add("is-active");
      activeHotspot = button;
    }
    openPoiPopup(poi, evaluation, clusterContext);
    return true;
  };

  const hideLoupe = () => {
    if (!loupe.classList.contains("is-hidden")) {
      loupe.classList.add("is-hidden");
    }
  };

  const getTargetFromPointer = (event) => {
    const rect = frame.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    return {
      kind: "cursor",
      x: clamp(x, 0, 100),
      y: clamp(y, 0, 100),
    };
  };

  const lockTarget = (target) => {
    if (!target) return;
    lockedTarget = target;
    setLoupeMode("locked");
    renderLoupe(lockedTarget);
  };

  const unlockTarget = () => {
    lockedTarget = null;
    setLoupeMode("free");
    if (hoverTarget) {
      renderLoupe(hoverTarget);
      return;
    }
    hideLoupe();
  };

  const renderLoupe = (target) => {
    if (!target) {
      hideLoupe();
      return;
    }
    loupe.classList.remove("is-hidden");
    void loupe.offsetWidth;
    syncLoupeVisiblePosition();
    const bodyRect = loupe.querySelector(".terminal-map-loupe__body").getBoundingClientRect();
    const stageWidth = Math.max(260, Math.floor(bodyRect.width || 360));
    const stageHeight = Math.max(200, Math.floor(bodyRect.height || 260));
    const centerX = clamp(target.x ?? 50, 0, 100);
    const centerY = clamp(target.y ?? 50, 0, 100);

    const entries = target.cluster?.entries?.length ? target.cluster.entries : visibleEntries;
    const bounds =
      target.cluster?.entries?.length
        ? (() => {
            const xs = target.cluster.entries.map((entry) => Number(entry.spot.x || 0));
            const ys = target.cluster.entries.map((entry) => Number(entry.spot.y || 0));
            const minX = Math.min(...xs);
            const minY = Math.min(...ys);
            const maxX = Math.max(...xs);
            const maxY = Math.max(...ys);
            const padX = Math.max(6, (maxX - minX) * 0.18);
            const padY = Math.max(6, (maxY - minY) * 0.18);
            return {
              minX: clamp(minX - padX, 0, 100),
              minY: clamp(minY - padY, 0, 100),
              maxX: clamp(maxX + padX, 0, 100),
              maxY: clamp(maxY + padY, 0, 100),
            };
          })()
        : {
            minX: clamp(centerX - 9, 0, 100),
            minY: clamp(centerY - 9, 0, 100),
            maxX: clamp(centerX + 9, 0, 100),
            maxY: clamp(centerY + 9, 0, 100),
          };

    const cropLeft = Math.max(0, Math.round((bounds.minX / 100) * MAP4X_WIDTH));
    const cropTop = Math.max(0, Math.round((bounds.minY / 100) * MAP4X_HEIGHT));
    const cropWidth = Math.max(1, Math.round(((bounds.maxX - bounds.minX) / 100) * MAP4X_WIDTH));
    const cropHeight = Math.max(1, Math.round(((bounds.maxY - bounds.minY) / 100) * MAP4X_HEIGHT));
    const zoom = Math.max(stageWidth / cropWidth, stageHeight / cropHeight);

    setLoupeMode(target.locked ? "locked" : lockedTarget ? "locked" : "free");
    loupeTitle.textContent = target.cluster?.label ? `LUPA :: ${target.cluster.label}` : "LUPA :: MAPA";
    loupeMeta.textContent = target.cluster
      ? `${target.cluster.entries.length} POIS / FOCO SECTOR`
      : target.poi
      ? `${target.poi.name || target.poi.id} / FOCO POI`
      : "MUESTRA LOCAL";
    loupeFoot.textContent = target.cluster
      ? (target.locked ? "DOBLE CLICK PARA VOLVER A FREE HOVER" : "CLICK PARA FIJAR ESTA ZONA")
      : (target.locked ? "DOBLE CLICK PARA VOLVER A FREE HOVER" : "MUEVE EL RATON PARA REPOSICIONAR EL ZOOM");

    loupeSurface.style.width = `${stageWidth}px`;
    loupeSurface.style.height = `${stageHeight}px`;
    loupeSurface.style.backgroundImage = `url(${MAP4X_IMAGE})`;
    loupeSurface.style.backgroundSize = `${Math.round(MAP4X_WIDTH * zoom)}px ${Math.round(
      MAP4X_HEIGHT * zoom
    )}px`;
    loupeSurface.style.backgroundPosition = `${Math.round(-cropLeft * zoom)}px ${Math.round(
      -cropTop * zoom
    )}px`;
    loupeSurface.innerHTML = "";

    const scopedEntries = (target.cluster?.entries?.length ? target.cluster.entries : entries)
      .filter((entry) => {
        const x = Number(entry.spot.x || 0);
        const y = Number(entry.spot.y || 0);
        return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
      })
      .sort((a, b) => {
        const ax = Number(a.spot.x || 0) - centerX;
        const ay = Number(a.spot.y || 0) - centerY;
        const bx = Number(b.spot.x || 0) - centerX;
        const by = Number(b.spot.y || 0) - centerY;
        return Math.hypot(ax, ay) - Math.hypot(bx, by);
      });

    const renderEntries = scopedEntries.length
      ? scopedEntries
      : entries
          .slice()
          .sort((a, b) => {
            const ax = Number(a.spot.x || 0) - centerX;
            const ay = Number(a.spot.y || 0) - centerY;
            const bx = Number(b.spot.x || 0) - centerX;
            const by = Number(b.spot.y || 0) - centerY;
            return Math.hypot(ax, ay) - Math.hypot(bx, by);
          })
          .slice(0, 6);

    if (!renderEntries.length) {
      loupeEmpty.style.display = "grid";
      loupeEmpty.textContent = "SIN POIS EN ESTE ZOOM.";
      return;
    }

    loupeEmpty.style.display = "none";
    renderEntries.forEach((entry) => {
      const node = document.createElement("button");
      node.type = "button";
      node.className = "terminal-map-loupe__node";
      if (!entry.evaluation.unlocked) node.classList.add("is-locked");
      if (target.poi?.id && entry.poi.id === target.poi.id) node.classList.add("is-focus");
      node.textContent = entry.poi.name || entry.poi.id || "POI";
      const xPx = pctToPx(entry.spot.x, MAP4X_WIDTH);
      const yPx = pctToPx(entry.spot.y, MAP4X_HEIGHT);
      node.style.left = `${clamp((xPx - cropLeft) * zoom, 12, stageWidth - 12)}px`;
      node.style.top = `${clamp((yPx - cropTop) * zoom, 12, stageHeight - 12)}px`;
      node.title = `${entry.poi.name || entry.poi.id} (${entry.spot.x}%, ${entry.spot.y}%)`;
      node.setAttribute("aria-label", node.title);
      node.addEventListener("click", (event) => {
        event.stopPropagation();
        selectPoiFromNode(node, entry.poi, entry.evaluation, target.cluster || null);
      });
      loupeSurface.appendChild(node);
    });
  };

  const addHotspot = (spot, poi, evaluation, clusterContext = null) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "terminal-map-hotspot";
    if (!evaluation.unlocked) button.classList.add("is-locked");
    button.dataset.x = String(spot.x || 0);
    button.dataset.y = String(spot.y || 0);
    button.dataset.poi = poi.id;
    const fullLabel = String(spot.label || poi.name || poi.id).toUpperCase();
    button.textContent = fullLabel;
    button.title = fullLabel;
    button.setAttribute("aria-label", fullLabel);
    button.tabIndex = 0;
    button.addEventListener("mouseenter", () => {
      if (lockedTarget) return;
      hoverTarget = {
        kind: "poi",
        x: Number(spot.x || 0),
        y: Number(spot.y || 0),
        poi,
        cluster: clusterContext,
      };
      renderLoupe({
        kind: "poi",
        x: Number(spot.x || 0),
        y: Number(spot.y || 0),
        poi,
        cluster: clusterContext,
      });
    });
    button.addEventListener("focus", () => {
      if (lockedTarget) return;
      hoverTarget = {
        kind: "poi",
        x: Number(spot.x || 0),
        y: Number(spot.y || 0),
        poi,
        cluster: clusterContext,
      };
      renderLoupe({
        kind: "poi",
        x: Number(spot.x || 0),
        y: Number(spot.y || 0),
        poi,
        cluster: clusterContext,
      });
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = {
        kind: "poi",
        x: Number(spot.x || 0),
        y: Number(spot.y || 0),
        poi,
        cluster: clusterContext,
      };
      hoverTarget = target;
      lockTarget(target);
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

  const addCluster = (cluster) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "terminal-map-hotspot is-cluster";
    button.dataset.x = String(cluster.x);
    button.dataset.y = String(cluster.y);
    button.textContent = `${cluster.entries.length} POIS`;
    button.title = `${cluster.label}: ${cluster.entries.map(({ poi }) => poi.name || poi.id).join(", ")}`;
    button.setAttribute("aria-label", button.title);
    button.tabIndex = 0;
    button.addEventListener("mouseenter", () => {
      if (lockedTarget) return;
      hoverTarget = { kind: "cluster", ...cluster };
      renderLoupe(hoverTarget);
    });
    button.addEventListener("focus", () => {
      if (lockedTarget) return;
      hoverTarget = { kind: "cluster", ...cluster };
      renderLoupe(hoverTarget);
    });
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const target = { kind: "cluster", ...cluster };
      hoverTarget = target;
      lockTarget(target);
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

  (useClusters ? clusterGroups : visibleEntries).forEach((entry) => {
    if (entry.entries?.length > 1) {
      addCluster(entry);
      return;
    }
    const single = entry.entries ? entry.entries[0] : entry;
    addHotspot(single.spot, single.poi, single.evaluation);
  });

  const renderLayout = () => {
    const shellBounds = shell.getBoundingClientRect();
    frame.style.width = `${Math.floor(shellBounds.width)}px`;
    frame.style.height = `${Math.floor(shellBounds.height)}px`;
    const dense = overlay.classList.contains("is-dense");
    hotspotNodes.forEach((node) => {
      const x = Number(node.dataset.x || 0);
      const y = Number(node.dataset.y || 0);
      node.style.left = `${x}%`;
      node.style.top = `${y}%`;
      node.style.maxWidth = `${Math.max(44, Math.min(dense ? 118 : 150, Math.floor(shellBounds.width * 0.3)))}px`;
    });
    syncLoupeVisiblePosition();
    if (lockedTarget) {
      renderLoupe(lockedTarget);
    } else if (hoverTarget) {
      renderLoupe(hoverTarget);
    }
  };

  const resizeObserver = new ResizeObserver(renderLayout);
  resizeObserver.observe(screenHost);
  resizeObserver.observe(shell);

  baseImage.addEventListener("load", renderLayout);
  if (baseImage.complete) renderLayout();

  const onPointerMove = (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (event.target && event.target.closest(".terminal-map-hotspot")) return;
    if (event.target && event.target.closest(".terminal-map-loupe")) return;
    if (lockedTarget) return;
    const target = getTargetFromPointer(event);
    if (!target) return;
    hoverTarget = target;
    renderLoupe(hoverTarget);
  };

  const onPointerLeave = (event) => {
    if (event?.relatedTarget && event.relatedTarget.closest(".terminal-map-loupe")) {
      return;
    }
    if (loupeDrag) return;
    if (lockedTarget) return;
    hoverTarget = null;
    hideLoupe();
  };

  frame.addEventListener("pointermove", onPointerMove);
  frame.addEventListener("pointerleave", onPointerLeave);
  loupe.addEventListener("pointerenter", () => {
    if (lockedTarget || loupeDrag) return;
    syncLoupeVisiblePosition();
  });
  frame.addEventListener("click", (event) => {
    if (event.target && event.target.closest(".terminal-map-hotspot")) return;
    if (event.target && event.target.closest(".terminal-map-loupe")) return;
    const target = getTargetFromPointer(event);
    if (!target) return;
    hoverTarget = target;
    lockTarget(target);
  });

  const onGlobalDoubleClick = (event) => {
    if (!overlay.parentNode || !loupe.parentNode) return;
    event.preventDefault();
    if (poiPopup) {
      closePoiPopup();
    }
    unlockTarget();
  };
  document.addEventListener("dblclick", onGlobalDoubleClick, { capture: true });

  const cleanup = () => {
    resizeObserver.disconnect();
    frame.removeEventListener("pointermove", onPointerMove);
    frame.removeEventListener("pointerleave", onPointerLeave);
    document.removeEventListener("dblclick", onGlobalDoubleClick, true);
    if (loupeHead) loupeHead.removeEventListener("pointerdown", startLoupeDrag);
    if (loupeResizeHandle) loupeResizeHandle.removeEventListener("pointerdown", startLoupeResize);
    endLoupeDrag();
    endLoupeResize();
    closePoiPopup();
    terminal.classList.remove("terminal-viewer-active");
    document.body.classList.remove("terminal-viewer-active");
    if (loupe.parentNode) loupe.parentNode.removeChild(loupe);
    if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
  };

  const exitPromise = new Promise((resolve) => {
    exitResolver = resolve;
  });

  const exitOverlay = () => {
    if (disposed) return;
    disposed = true;
    disposeKeymap();
    cleanup();
    if (exitResolver) exitResolver(true);
  };

  const disposeKeymap = pushKeymap(
    {
      Escape: () => {
        if (poiPopup) {
          closePoiPopup();
          return true;
        }
        exitOverlay();
        return true;
      },
      b: () => {
        if (poiPopup) {
          closePoiPopup();
          return true;
        }
        exitOverlay();
        return true;
      },
      B: () => {
        if (poiPopup) {
          closePoiPopup();
          return true;
        }
        exitOverlay();
        return true;
      },
      Backspace: () => {
        if (poiPopup) {
          closePoiPopup();
          return true;
        }
        exitOverlay();
        return true;
      },
    },
    { shouldHandle: () => true }
  );

  if (exitButton) {
    exitButton.addEventListener("click", exitOverlay);
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

const formatNodeLine = (node, evaluation, index) => {
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

const buildPreviewLines = (poi, evaluation, campaignState, allPois = []) => {
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

const renderDetails = async (poi) => {
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
    puzzleLines: [" ", "PROTOCOLO BLOQUEADO: REQUIERE ACTIVACION EXTERNA.", "El modo puzzle aun no esta operativo en la TUI.", " "],
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

    const activeCaseId = statusContext?.state?.activeCaseId || "";
    const items = nodes.map(({ poi, evaluation }, index) => ({
      lines: formatNodeLine(poi, evaluation, index),
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
          { parts: [{ text: "ENLACE REMOTO CAIDO", className: "tui-warn" }] }
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
      pois
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
    await renderDetails(poi);

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
    await print(["ARCHIVO DE RESPALDO LOCAL EN USO."], {
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
          notes: "NO HAY VINCULO OPERATIVO ENTRE CASO Y SECTOR.",
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
