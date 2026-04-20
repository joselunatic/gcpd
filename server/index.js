import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';
import multer from 'multer';
import { spawn } from 'child_process';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DEFAULT_PASSWORD = process.env.DM_DEFAULT_PASSWORD || 'brother';
const BACKDOOR_PASSWORD = process.env.DM_BACKDOOR_PASSWORD || '1234';
const SESSION_DURATION_MS = Number(process.env.DM_SESSION_DURATION_MS || 1000 * 60 * 60 * 6);
const GLOBAL_COMMANDS_KEY = 'global_commands';
const TRACER_CONFIG_KEY = 'tracer_config';
const TRACER_RING_TIMEOUT_MS = 60_000;
const TRACER_STEP_MS = 15_000;
const TRACER_EXACT_MS = 45_000;

const dbPath = path.join(__dirname, 'batconsole.db');
const db = new Database(dbPath);

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
app.use('/api/uploads', express.static(uploadsDir));

const ballisticsDir = path.join(__dirname, '..', 'public', 'assets', 'ballistics');
fs.mkdirSync(ballisticsDir, { recursive: true });
const audioDir = path.join(__dirname, '..', 'public', 'assets', 'audio');
const audioGarbledDir = path.join(audioDir, 'garbled');
fs.mkdirSync(audioDir, { recursive: true });
fs.mkdirSync(audioGarbledDir, { recursive: true });
const phoneAudioDir = path.join(__dirname, '..', 'public', 'assets', 'phonelines');
fs.mkdirSync(phoneAudioDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.stl' ? ext : '.stl';
    const stamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `evidence-${stamp}-${random}${safeExt}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.stl') {
      cb(new Error('Solo se permiten archivos STL.'));
      return;
    }
    cb(null, true);
  },
});

const ballisticsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ballisticsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.png' ? ext : '.png';
    const stamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `ballistics-${stamp}-${random}${safeExt}`);
  },
});

const ballisticsUpload = multer({
  storage: ballisticsStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.png') {
      cb(new Error('Solo se permiten PNG.'));
      return;
    }
    cb(null, true);
  },
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, audioDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.mp3' ? ext : '.mp3';
    const stamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `audio-${stamp}-${random}${safeExt}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.mp3') {
      cb(new Error('Solo se permiten MP3.'));
      return;
    }
    cb(null, true);
  },
});

const phoneAudioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, phoneAudioDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ext === '.mp3' ? ext : '.mp3';
    const stamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `phoneline-${stamp}-${random}${safeExt}`);
  },
});

const phoneAudioUpload = multer({
  storage: phoneAudioStorage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext !== '.mp3') {
      cb(new Error('Solo se permiten MP3.'));
      return;
    }
    cb(null, true);
  },
});

const poiImageDir = path.join(uploadsDir, 'images');
fs.mkdirSync(poiImageDir, { recursive: true });

const poiImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, poiImageDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowed = ['.png', '.jpg', '.jpeg', '.webp'];
    const safeExt = allowed.includes(ext) ? ext : '.png';
    const stamp = Date.now();
    const random = crypto.randomBytes(4).toString('hex');
    cb(null, `poi-${stamp}-${random}${safeExt}`);
  },
});

const poiImageUpload = multer({
  storage: poiImageStorage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!['.png', '.jpg', '.jpeg', '.webp'].includes(ext)) {
      cb(new Error('Solo se permiten PNG/JPG/WEBP.'));
      return;
    }
    cb(null, true);
  },
});

function initDatabase() {
  db.prepare(
    `CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS campaign_state (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS cases_data (
      id TEXT PRIMARY KEY,
      title TEXT,
      status TEXT,
      summary TEXT,
      tags TEXT,
      updated_at INTEGER,
      unlock_conditions TEXT,
      commands TEXT,
      dm TEXT
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS pois_data (
      id TEXT PRIMARY KEY,
      name TEXT,
      district TEXT,
      status TEXT,
      summary TEXT,
      access_code TEXT,
      details TEXT,
      contacts TEXT,
      notes TEXT,
      updated_at INTEGER,
      unlock_conditions TEXT,
      dm TEXT,
      commands TEXT
    )`
  ).run();
  db.prepare(
    `CREATE TABLE IF NOT EXISTS villains_data (
      id TEXT PRIMARY KEY,
      alias TEXT,
      real_name TEXT,
      species TEXT,
      age TEXT,
      height TEXT,
      weight TEXT,
      threat_level TEXT,
      status TEXT,
      summary TEXT,
      last_seen TEXT,
      patterns TEXT,
      known_associates TEXT,
      notes TEXT,
      updated_at INTEGER,
      unlock_conditions TEXT,
      dm TEXT,
      commands TEXT
    )`
  ).run();

  ensureColumn('pois_data', 'unlock_conditions', 'TEXT');
  ensureColumn('pois_data', 'dm', 'TEXT');
  ensureColumn('pois_data', 'commands', 'TEXT');
  ensureColumn('pois_data', 'updated_at', 'INTEGER');
  ensureColumn('villains_data', 'unlock_conditions', 'TEXT');
  ensureColumn('villains_data', 'dm', 'TEXT');
  ensureColumn('villains_data', 'commands', 'TEXT');
  ensureColumn('villains_data', 'updated_at', 'INTEGER');
  ensureColumn('cases_data', 'updated_at', 'INTEGER');
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? row.value : null;
}

function setSetting(key, value) {
  db.prepare(
    `INSERT INTO settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

function getEvidenceModels() {
  const raw = getSetting('evidence_models');
  const parsed = parseJSON(raw, []);
  const models = Array.isArray(parsed) ? parsed : [];
  const migrated = models.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const stlPath = String(entry.stlPath || entry.url || '').trim();
    if (stlPath.startsWith('/uploads/')) {
      return { ...entry, stlPath: `/api${stlPath}` };
    }
    return entry;
  });
  const changed = JSON.stringify(migrated) !== JSON.stringify(models);
  if (changed) {
    setSetting('evidence_models', stringify(migrated));
  }
  return migrated;
}

function setEvidenceModels(models = []) {
  const cleaned = Array.isArray(models)
    ? models
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          return {
            id: String(entry.id || '').trim(),
            label: String(entry.label || '').trim(),
            command: String(entry.command || '').trim(),
            stlPath: String(entry.stlPath || entry.url || '').trim(),
            updatedAt: Date.now(),
          };
        })
        .filter((entry) => entry && entry.id && entry.stlPath)
    : [];
  setSetting('evidence_models', stringify(cleaned));
  return cleaned;
}

function getBallisticsModels() {
  const raw = getSetting('ballistics_models');
  const parsed = parseJSON(raw, []);
  const models = Array.isArray(parsed) ? parsed : [];
  return models.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    return {
      id: String(entry.id || '').trim(),
      label: String(entry.label || '').trim(),
      assetId: String(entry.assetId || '').trim(),
      pngPath: String(entry.pngPath || '').trim(),
      caliber: String(entry.caliber || '').trim(),
      material: String(entry.material || '').trim(),
      bulletId: String(entry.bulletId || '').trim(),
      caseId: String(entry.caseId || entry.caseNumber || '').trim(),
      caseCode: String(entry.caseCode || '').trim(),
      crime: String(entry.crime || '').trim(),
      location: String(entry.location || '').trim(),
      status: String(entry.status || '').trim(),
      closedBy: String(entry.closedBy || '').trim(),
      updatedAt: Number(entry.updatedAt) || 0,
    };
  });
}

function setBallisticsModels(models = []) {
  const cleaned = Array.isArray(models)
    ? models
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          return {
            id: String(entry.id || '').trim(),
            label: String(entry.label || '').trim(),
            assetId: String(entry.assetId || '').trim(),
            pngPath: String(entry.pngPath || '').trim(),
            caliber: String(entry.caliber || '').trim(),
            material: String(entry.material || '').trim(),
            bulletId: String(entry.bulletId || '').trim(),
            caseId: String(entry.caseId || entry.caseNumber || '').trim(),
            caseCode: String(entry.caseCode || '').trim(),
            crime: String(entry.crime || '').trim(),
            location: String(entry.location || '').trim(),
            status: String(entry.status || '').trim(),
            closedBy: String(entry.closedBy || '').trim(),
            updatedAt: Date.now(),
          };
        })
        .filter((entry) => entry && entry.id && entry.pngPath)
    : [];
  setSetting('ballistics_models', stringify(cleaned));
  return cleaned;
}

function getAudioModels() {
  const raw = getSetting('audio_models');
  const parsed = parseJSON(raw, []);
  const models = Array.isArray(parsed) ? parsed : [];
  return models.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    return {
      id: String(entry.id || '').trim(),
      title: String(entry.title || '').trim(),
      originalSrc: String(entry.originalSrc || '').trim(),
      garbledSrc: String(entry.garbledSrc || '').trim(),
      isGarbled: Boolean(entry.isGarbled),
      passwordHash: String(entry.passwordHash || '').trim(),
      updatedAt: Number(entry.updatedAt) || 0,
    };
  });
}

function setAudioModels(models = []) {
  const cleaned = Array.isArray(models)
    ? models
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          return {
            id: String(entry.id || '').trim(),
            title: String(entry.title || '').trim(),
            originalSrc: String(entry.originalSrc || '').trim(),
            garbledSrc: String(entry.garbledSrc || '').trim(),
            isGarbled: Boolean(entry.isGarbled),
            passwordHash: String(entry.passwordHash || '').trim(),
            updatedAt: Date.now(),
          };
        })
        .filter((entry) => entry && entry.id && entry.originalSrc)
    : [];
  setSetting('audio_models', stringify(cleaned));
  return cleaned;
}

function getPhoneLines() {
  const raw = getSetting('phone_lines');
  const parsed = parseJSON(raw, []);
  const lines = Array.isArray(parsed) ? parsed : [];
  return lines.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    return {
      id: String(entry.id || '').trim(),
      number: String(entry.number || '').trim(),
      label: String(entry.label || '').trim(),
      audioId: String(entry.audioId || '').trim(),
      rellamable: Boolean(entry.rellamable),
      llamado: Boolean(entry.llamado),
      updatedAt: Number(entry.updatedAt) || 0,
    };
  });
}

function setPhoneLines(lines = []) {
  const cleaned = Array.isArray(lines)
    ? lines
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          return {
            id: String(entry.id || '').trim(),
            number: String(entry.number || '').trim(),
            label: String(entry.label || '').trim(),
            audioId: String(entry.audioId || '').trim(),
            rellamable: Boolean(entry.rellamable),
            llamado: Boolean(entry.llamado),
            updatedAt: Date.now(),
          };
        })
        .filter((entry) => entry && entry.id && entry.number)
    : [];
  setSetting('phone_lines', stringify(cleaned));
  return cleaned;
}

function normalizeTracerHotspot(entry = {}) {
  if (!entry || typeof entry !== 'object') return null;
  const id = String(entry.id || '').trim();
  const label = String(entry.label || id).trim();
  const x = Number(entry.x);
  const y = Number(entry.y);
  if (!id || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    id,
    label: label || id,
    x: Math.max(0, Math.min(100, x)),
    y: Math.max(0, Math.min(100, y)),
    updatedAt: Date.now(),
  };
}

function normalizePhoneDigits(value = '') {
  return String(value || '').replace(/[^\d]/g, '');
}

function normalizeTracerLine(entry = {}, hotspots = []) {
  if (!entry || typeof entry !== 'object') return null;
  const number = String(entry.number || '').trim();
  const hotspotId = String(entry.hotspotId || '').trim();
  if (!number || !hotspotId) return null;
  const id = String(entry.id || number).trim() || number;
  const normalized = normalizePhoneDigits(number);
  if (!normalized) return null;
  const hotspotExists = hotspots.some((spot) => spot.id === hotspotId);
  if (!hotspotExists) return null;
  return {
    id,
    number,
    normalized,
    label: String(entry.label || id).trim() || id,
    hotspotId,
    enabled: entry.enabled !== false,
    updatedAt: Date.now(),
  };
}

function getTracerConfig() {
  const raw = getSetting(TRACER_CONFIG_KEY);
  const parsed = parseJSON(raw, {});
  const rawHotspots = Array.isArray(parsed?.hotspots) ? parsed.hotspots : [];
  const hotspots = rawHotspots
    .map((entry) => normalizeTracerHotspot(entry))
    .filter(Boolean);
  const rawLines = Array.isArray(parsed?.lines) ? parsed.lines : [];
  const lines = rawLines
    .map((entry) => normalizeTracerLine(entry, hotspots))
    .filter(Boolean)
    .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index);
  return { lines, hotspots };
}

function setTracerConfig(config = {}) {
  const rawHotspots = Array.isArray(config?.hotspots) ? config.hotspots : [];
  const hotspots = rawHotspots
    .map((entry) => normalizeTracerHotspot(entry))
    .filter(Boolean);
  const rawLines = Array.isArray(config?.lines) ? config.lines : [];
  const lines = rawLines
    .map((entry) => normalizeTracerLine(entry, hotspots))
    .filter(Boolean)
    .filter((entry, index, list) => list.findIndex((item) => item.id === entry.id) === index);
  const payload = { lines, hotspots };
  setSetting(TRACER_CONFIG_KEY, stringify(payload));
  return payload;
}

let tracerDmSocket = null;
const tracerAgentSockets = new Set();
const tracerCalls = new Map();

function wsSend(socket, payload) {
  if (!socket || socket.readyState !== 1) return;
  try {
    socket.send(JSON.stringify(payload));
  } catch (error) {
    console.warn('[TRACER_WS] send failed', error?.message || error);
  }
}

function getTraceStage(elapsedMs = 0) {
  if (elapsedMs >= TRACER_EXACT_MS) return 3;
  if (elapsedMs >= TRACER_STEP_MS * 2) return 2;
  if (elapsedMs >= TRACER_STEP_MS) return 1;
  return 0;
}

function finalizeTracerCall(callId, reason, extra = {}) {
  const call = tracerCalls.get(callId);
  if (!call) return;
  if (call.ringTimer) {
    clearTimeout(call.ringTimer);
    call.ringTimer = null;
  }
  const elapsedMs = call.answeredAt ? Math.max(0, Date.now() - call.answeredAt) : 0;
  const stage = call.answeredAt ? getTraceStage(elapsedMs) : null;

  wsSend(call.agentSocket, {
    type: reason === 'auto_hangup' ? 'tracer:auto_hangup' : 'tracer:hangup',
    callId,
    reason,
    elapsedMs,
    stage,
    ...extra,
  });
  wsSend(tracerDmSocket, {
    type: 'tracer:ended',
    callId,
    reason,
    elapsedMs,
    stage,
    timeline: {
      stepMs: TRACER_STEP_MS,
      exactMs: TRACER_EXACT_MS,
    },
    ...extra,
  });
  tracerCalls.delete(callId);
}

function handleTracerStart(agentSocket, payload = {}) {
  const inputNumber = String(payload.number || '').trim();
  const normalized = normalizePhoneDigits(inputNumber);
  if (!normalized) {
    wsSend(agentSocket, {
      type: 'tracer:error',
      code: 'invalid_number',
      message: 'Numero invalido.',
    });
    return;
  }
  const config = getTracerConfig();
  const line = config.lines.find(
    (entry) => entry.enabled && normalizePhoneDigits(entry.number) === normalized
  );
  if (!line) {
    wsSend(agentSocket, {
      type: 'tracer:error',
      code: 'line_not_found',
      message: `No existe linea tracer para ${inputNumber}.`,
    });
    return;
  }
  const hotspot = config.hotspots.find((entry) => entry.id === line.hotspotId);
  if (!hotspot) {
    wsSend(agentSocket, {
      type: 'tracer:error',
      code: 'hotspot_not_found',
      message: 'La linea no tiene hotspot valido.',
    });
    return;
  }

  if (!tracerDmSocket || tracerDmSocket.readyState !== 1) {
    wsSend(agentSocket, {
      type: 'tracer:auto_hangup',
      reason: 'dm_offline',
      callId: null,
      message: 'Operador DM no disponible.',
    });
    return;
  }

  const callId = crypto.randomUUID();
  const call = {
    callId,
    state: 'incoming',
    number: line.number,
    normalized,
    line,
    hotspot,
    agentSocket,
    createdAt: Date.now(),
    answeredAt: 0,
    ringTimer: null,
  };
  call.ringTimer = setTimeout(() => {
    finalizeTracerCall(callId, 'auto_hangup', { message: 'linea no atendida' });
  }, TRACER_RING_TIMEOUT_MS);
  tracerCalls.set(callId, call);

  wsSend(agentSocket, {
    type: 'tracer:ringing',
    callId,
    number: line.number,
    label: line.label,
    timeoutMs: TRACER_RING_TIMEOUT_MS,
  });
  wsSend(tracerDmSocket, {
    type: 'tracer:incoming',
    call: {
      callId,
      number: line.number,
      label: line.label,
      hotspotId: hotspot.id,
      hotspotLabel: hotspot.label,
      createdAt: call.createdAt,
      timeoutMs: TRACER_RING_TIMEOUT_MS,
      stage: 0,
      timeline: {
        stepMs: TRACER_STEP_MS,
        exactMs: TRACER_EXACT_MS,
      },
    },
  });
}

function handleDmAnswer(payload = {}) {
  const callId = String(payload.callId || '').trim();
  const call = tracerCalls.get(callId);
  if (!call || call.state !== 'incoming') return;
  if (call.ringTimer) {
    clearTimeout(call.ringTimer);
    call.ringTimer = null;
  }
  call.state = 'answered';
  call.answeredAt = Date.now();
  wsSend(call.agentSocket, {
    type: 'tracer:answered',
    callId,
    answeredAt: call.answeredAt,
    line: {
      id: call.line.id,
      number: call.line.number,
      label: call.line.label,
    },
    hotspot: {
      id: call.hotspot.id,
      label: call.hotspot.label,
      x: call.hotspot.x,
      y: call.hotspot.y,
    },
    timeline: {
      stepMs: TRACER_STEP_MS,
      exactMs: TRACER_EXACT_MS,
    },
  });
  wsSend(tracerDmSocket, {
    type: 'tracer:answered',
    callId,
    answeredAt: call.answeredAt,
    stage: 0,
    line: {
      id: call.line.id,
      number: call.line.number,
      label: call.line.label,
    },
    hotspot: {
      id: call.hotspot.id,
      label: call.hotspot.label,
      x: call.hotspot.x,
      y: call.hotspot.y,
    },
    timeline: {
      stepMs: TRACER_STEP_MS,
      exactMs: TRACER_EXACT_MS,
    },
  });
}

function handleDmHangup(payload = {}) {
  const callId = String(payload.callId || '').trim();
  if (!callId) return;
  if (!tracerCalls.has(callId)) return;
  finalizeTracerCall(callId, 'dm_hangup');
}

function hashAudioPassword(password = '') {
  const secret = String(password || '').trim();
  if (!secret) return '';
  return crypto.createHash('sha256').update(secret).digest('hex');
}

function runFfmpeg(args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg failed with code ${code}`));
    });
  });
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleWavSegments(inputPath, outputPath, passwordHash = '') {
  const buffer = fs.readFileSync(inputPath);
  if (buffer.length < 44) throw new Error('WAV invalido.');
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  if (riff !== 'RIFF' || wave !== 'WAVE') throw new Error('WAV invalido.');

  let offset = 12;
  let dataOffset = -1;
  let dataSize = 0;
  while (offset + 8 <= buffer.length) {
    const chunkId = buffer.toString('ascii', offset, offset + 4);
    const chunkSize = buffer.readUInt32LE(offset + 4);
    const chunkDataOffset = offset + 8;
    if (chunkId === 'data') {
      dataOffset = chunkDataOffset;
      dataSize = chunkSize;
      break;
    }
    offset = chunkDataOffset + chunkSize;
  }
  if (dataOffset < 0) throw new Error('WAV sin data chunk.');

  const dataEnd = Math.min(dataOffset + dataSize, buffer.length);
  const data = buffer.slice(dataOffset, dataEnd);
  const header = Buffer.from(buffer.slice(0, dataOffset));
  const sampleRate = buffer.readUInt32LE(24);
  const channels = buffer.readUInt16LE(22);
  const bitsPerSample = buffer.readUInt16LE(34);
  const bytesPerSample = (bitsPerSample / 8) * channels;
  const seed = parseInt(String(passwordHash || '').slice(0, 8) || '0', 16) || 0;
  const rand = mulberry32(seed || 1);
  const chunkMs = 60 + Math.floor(rand() * 90);
  const chunkFrames = Math.max(1, Math.floor((sampleRate * chunkMs) / 1000));
  const chunkBytes = chunkFrames * bytesPerSample;

  const chunks = [];
  for (let i = 0; i < data.length; i += chunkBytes) {
    chunks.push(data.slice(i, Math.min(i + chunkBytes, data.length)));
  }

  const reverseChunk = (buf) => {
    const reversed = Buffer.allocUnsafe(buf.length);
    const frames = Math.floor(buf.length / bytesPerSample);
    for (let i = 0; i < frames; i++) {
      const srcStart = i * bytesPerSample;
      const dstStart = (frames - 1 - i) * bytesPerSample;
      buf.copy(reversed, dstStart, srcStart, srcStart + bytesPerSample);
    }
    return reversed;
  };

  for (let i = chunks.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [chunks[i], chunks[j]] = [chunks[j], chunks[i]];
  }

  for (let i = 0; i < chunks.length; i++) {
    if (rand() < 0.5) {
      chunks[i] = reverseChunk(chunks[i]);
    }
    if (rand() < 0.12 && i > 0) {
      chunks[i] = chunks[i - 1];
    }
  }

  const shuffled = Buffer.concat(chunks);
  const updatedHeader = Buffer.from(header);
  const totalSize = 36 + shuffled.length;
  updatedHeader.writeUInt32LE(totalSize, 4);
  const dataSizeOffset = dataOffset - 4;
  if (dataSizeOffset >= 0 && dataSizeOffset + 4 <= updatedHeader.length) {
    updatedHeader.writeUInt32LE(shuffled.length, dataSizeOffset);
  }

  fs.writeFileSync(outputPath, Buffer.concat([updatedHeader, shuffled]));
}

function buildGarbledFilter(passwordHash = '') {
  const seed = parseInt(String(passwordHash || '').slice(0, 8) || '0', 16) || 0;
  const rand = (min, max, mod) => min + (seed % mod) / (mod - 1) * (max - min);
  const bits = Math.round(rand(3, 5, 97));
  const tremolo = rand(4.0, 10.0, 131).toFixed(2);
  const highpass = Math.round(rand(450, 1100, 173));
  const lowpass = Math.round(rand(1200, 2600, 211));
  const flangerDelay = rand(4.0, 12.0, 149).toFixed(2);
  const flangerDepth = rand(4.0, 16.0, 181).toFixed(2);
  const pulseHz = rand(1.5, 4.5, 193).toFixed(2);
  const pulseWidth = rand(0.15, 0.45, 157).toFixed(2);
  const gateThreshold = rand(0.06, 0.16, 167).toFixed(3);
  const gateRatio = Math.round(rand(6, 16, 107));
  return [
    `acrusher=bits=${bits}:mode=log`,
    `highpass=f=${highpass}`,
    `lowpass=f=${lowpass}`,
    `flanger=delay=${flangerDelay}:depth=${flangerDepth}:regen=0.4`,
    `apulsator=hz=${pulseHz}:width=${pulseWidth}`,
    `agate=threshold=${gateThreshold}:ratio=${gateRatio}:attack=10:release=140`,
    `tremolo=f=${tremolo}:d=0.8`,
    'volume=1.2',
  ].join(',');
}

async function garbleAudio(inputPath, outputPath, passwordHash = '') {
  const tempBase = `garble-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const tempWav = path.join('/tmp', `${tempBase}.wav`);
  const tempShuffled = path.join('/tmp', `${tempBase}-shuffled.wav`);
  try {
    await runFfmpeg(['-y', '-i', inputPath, '-ac', '2', '-ar', '44100', tempWav]);
    shuffleWavSegments(tempWav, tempShuffled, passwordHash);
    const filter = buildGarbledFilter(passwordHash);
    const args = [
      '-y',
      '-i',
      tempShuffled,
      '-af',
      filter,
      '-ar',
      '44100',
      '-ac',
      '2',
      '-codec:a',
      'libmp3lame',
      '-q:a',
      '4',
      outputPath,
    ];
    await runFfmpeg(args);
  } finally {
    fs.rmSync(tempWav, { force: true });
    fs.rmSync(tempShuffled, { force: true });
  }
}

function deriveAssetIdFromPath(pathValue = '') {
  const trimmed = String(pathValue || '').trim();
  if (!trimmed) return '';
  const parts = trimmed.split('/').filter(Boolean);
  const file = parts[parts.length - 1] || '';
  return file.replace(/\.(png|mp3)$/i, '');
}

function seedBallisticsModelsFromAssets() {
  const existing = getBallisticsModels();
  if (existing.length) return;
  let files = [];
  try {
    files = fs.readdirSync(ballisticsDir);
  } catch (error) {
    console.warn('Ballistics assets read failed:', error);
    return;
  }
  const assets = files
    .filter((name) => name.toLowerCase().endsWith('.png'))
    .map((name) => {
      const assetId = deriveAssetIdFromPath(name);
      return {
        id: assetId,
        label: '',
        assetId,
        pngPath: `/assets/ballistics/${name}`,
        caliber: '',
        material: '',
        bulletId: '',
        caseId: '',
        caseCode: '',
        crime: '',
        location: '',
        status: 'ABIERTO',
        closedBy: '',
      };
    });
  if (assets.length) {
    setBallisticsModels(assets);
  }
}

function seedAudioModelsFromAssets() {
  const existing = getAudioModels();
  if (existing.length) return;
  let files = [];
  try {
    files = fs.readdirSync(audioDir);
  } catch (error) {
    console.warn('Audio assets read failed:', error);
    return;
  }
  const entries = files
    .filter((name) => name.toLowerCase().endsWith('.mp3'))
    .map((name) => {
      const id = deriveAssetIdFromPath(name);
      return {
        id,
        title: id.toUpperCase(),
        originalSrc: `/assets/audio/${name}`,
        garbledSrc: '',
        isGarbled: false,
        passwordHash: '',
      };
    });
  if (entries.length) setAudioModels(entries);
}

function ensureDefaultPassword() {
  const existingHash = getSetting('dm_password_hash');
  if (!existingHash) {
    const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
    setSetting('dm_password_hash', hash);
    console.log('DM password initialized with default value.');
  }
}

const parseJSON = (value, fallback) => {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch (error) {
    return fallback;
  }
};

const stringify = (value) => JSON.stringify(value ?? null);

const ensureColumn = (table, column, definition) => {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!info.some((col) => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).run();
  }
};

const tableExists = (table) => {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
    .get(table);
  return Boolean(row?.name);
};

const defaultAccessConfig = {
  visibility: 'listed',
  unlockMode: 'none',
  password: '',
  prerequisites: [],
  requiredFlags: [],
  autoUnlockOn: 'resolve',
  initialAccessStatus: 'locked',
};

const toArray = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => (typeof entry === 'string' ? entry.trim() : entry)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n|,/) // allow comma or newline separated strings
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const toResponseLines = (value) => {
  if (Array.isArray(value)) {
    return value.map((entry) => (entry == null ? '' : String(entry)));
  }
  if (typeof value === 'string') {
    return value.split(/\r?\n/);
  }
  return [];
};

const normalizeGlobalCommands = (payload) => {
  const list = Array.isArray(payload) ? payload : payload?.commands;
  if (!Array.isArray(list)) return [];
  return list
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null;
      const triggers = toArray(entry.triggers || entry.trigger || entry.command || entry.commands);
      const response = toResponseLines(entry.response || entry.output || entry.text || '');
      return {
        id: typeof entry.id === 'string' ? entry.id : '',
        triggers,
        response,
      };
    })
    .filter((entry) => entry && entry.triggers.length && entry.response.length);
};

function getGlobalCommands() {
  const raw = getSetting(GLOBAL_COMMANDS_KEY);
  const parsed = parseJSON(raw, []);
  return normalizeGlobalCommands(parsed);
}

function setGlobalCommands(commands) {
  const normalized = normalizeGlobalCommands(commands);
  setSetting(GLOBAL_COMMANDS_KEY, stringify(normalized));
  return normalized;
}

const normalizeUnlockConditions = (value, fallbackPassword = '') => {
  if (!value && fallbackPassword) {
    return { ...defaultAccessConfig, unlockMode: 'password', password: fallbackPassword };
  }
  if (!value) {
    return { ...defaultAccessConfig };
  }
  if (Array.isArray(value)) {
    return { ...defaultAccessConfig, prerequisites: toArray(value) };
  }
  if (typeof value === 'object') {
    return {
      ...defaultAccessConfig,
      ...value,
      password: value.password || fallbackPassword || '',
      prerequisites: toArray(value.prerequisites || value.unlockConditions),
      requiredFlags: toArray(value.requiredFlags),
    };
  }
  return { ...defaultAccessConfig };
};

const normalizePuzzle = (value) => {
  if (!value || typeof value !== 'object') {
    return { type: 'none', config: {} };
  }
  return {
    type: value.type || 'none',
    config: typeof value.config === 'object' && value.config ? value.config : {},
  };
};

const normalizeCommands = (value, defaults = {}) => {
  if (!value || typeof value !== 'object') {
    return {
      brief: [],
      intel: [],
      puzzle: { type: 'none', config: {} },
      menuAlias: defaults.menuAlias || '',
      category: defaults.category || '',
      nodeType: defaults.nodeType || 'mixed',
      parentId: defaults.parentId || '',
      mapMeta: null,
    };
  }
  return {
    brief: toArray(value.brief),
    intel: toArray(value.intel),
    puzzle: normalizePuzzle(value.puzzle),
    menuAlias: typeof value.menuAlias === 'string' ? value.menuAlias : defaults.menuAlias || '',
    category: typeof value.category === 'string' ? value.category : defaults.category || '',
    nodeType: typeof value.nodeType === 'string' ? value.nodeType : defaults.nodeType || 'mixed',
    parentId: typeof value.parentId === 'string' ? value.parentId : defaults.parentId || '',
    mapMeta: normalizeMapMeta(value.mapMeta),
  };
};

function normalizeMapMeta(value) {
  if (!value || typeof value !== 'object') return null;
  const x = Number(value.x);
  const y = Number(value.y);
  const radius = Number(value.radius);
  const label = typeof value.label === 'string' ? value.label : '';
  const image = typeof value.image === 'string' ? value.image : '';
  return {
    x: Number.isFinite(x) ? x : null,
    y: Number.isFinite(y) ? y : null,
    radius: Number.isFinite(radius) ? radius : null,
    label,
    image,
  };
}

const normalizeDmNotes = (value) => {
  if (!value) {
    return { notes: '', spoilers: [] };
  }
  if (typeof value === 'string') {
    return { notes: value, spoilers: [] };
  }
  if (Array.isArray(value)) {
    return { notes: value.join('\n'), spoilers: [] };
  }
  if (typeof value === 'object') {
    const notes = Array.isArray(value.notes)
      ? value.notes.join('\n')
      : typeof value.notes === 'string'
        ? value.notes
        : '';
    return {
      notes,
      spoilers: toArray(value.spoilers),
    };
  }
  return { notes: '', spoilers: [] };
};

function clearExpiredSessions() {
  const now = Date.now();
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
}

function createSession() {
  clearExpiredSessions();
  const token = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + SESSION_DURATION_MS;
  db.prepare('INSERT INTO sessions (token, created_at, expires_at) VALUES (?, ?, ?)').run(
    token,
    now,
    expiresAt
  );
  return { token, expiresAt };
}

function validateToken(token) {
  if (!token) return null;
  clearExpiredSessions();
  const session = db.prepare('SELECT token, expires_at FROM sessions WHERE token = ?').get(token);
  if (!session) return null;
  if (session.expires_at <= Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }
  return session;
}

function deleteSession(token) {
  if (!token) return;
  db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const [, token] = header.split(' ');
  const session = validateToken(token);
  if (!session) {
    console.warn('[AUTH] invalid session', {
      path: req.path,
      ip: req.ip,
      tokenPresent: Boolean(token),
    });
    return res.status(401).json({ message: 'Sesion no valida. Vuelve a iniciar sesion.' });
  }
  req.session = session;
  req.token = token;
  next();
}

initDatabase();
ensureDefaultPassword();
seedBallisticsModelsFromAssets();
seedAudioModelsFromAssets();
ensureCampaignState();
seedInitialData();

function seedInitialData() {
  seedCases();
  seedPois();
  seedVillains();
}

function ensureCampaignState() {
  const existing = db
    .prepare('SELECT payload FROM campaign_state WHERE id = ?')
    .get('default');
  if (!existing) {
    const payload = JSON.stringify({
      unlocked: { cases: [], map: [], villains: [] },
      unlockedAttributes: { cases: {}, map: {}, villains: {} },
      flags: [],
      alertLevel: 'low',
      activeCaseId: '',
      lastSeen: { cases: {}, map: {}, villains: {} },
    });
    db.prepare(
      'INSERT INTO campaign_state (id, payload, updated_at) VALUES (?, ?, ?)'
    ).run('default', payload, Date.now());
  }
}

function normalizeCampaignState(state) {
  const unlocked = state?.unlocked || {};
  const legacyUnlocked = state?.unlocked?.modules || [];
  const legacyLastSeen = state?.lastSeen?.modules || {};
  const unlockedAttributes = state?.unlockedAttributes || {};
  return {
    unlocked: {
      cases: Array.isArray(unlocked.cases)
        ? unlocked.cases
        : Array.isArray(legacyUnlocked)
          ? legacyUnlocked
          : [],
      map: Array.isArray(unlocked.map) ? unlocked.map : [],
      villains: Array.isArray(unlocked.villains) ? unlocked.villains : [],
    },
    unlockedAttributes: {
      cases:
        typeof unlockedAttributes?.cases === 'object' && unlockedAttributes.cases
          ? unlockedAttributes.cases
          : {},
      map:
        typeof unlockedAttributes?.map === 'object' && unlockedAttributes.map
          ? unlockedAttributes.map
          : {},
      villains:
        typeof unlockedAttributes?.villains === 'object' && unlockedAttributes.villains
          ? unlockedAttributes.villains
          : {},
    },
    flags: Array.isArray(state?.flags) ? state.flags : [],
    alertLevel: typeof state?.alertLevel === 'string' ? state.alertLevel : 'low',
    activeCaseId: typeof state?.activeCaseId === 'string' ? state.activeCaseId : '',
    lastSeen: {
      cases: typeof state?.lastSeen?.cases === 'object' && state.lastSeen.cases
        ? state.lastSeen.cases
        : typeof legacyLastSeen === 'object' && legacyLastSeen
          ? legacyLastSeen
          : {},
      map: typeof state?.lastSeen?.map === 'object' && state.lastSeen.map
        ? state.lastSeen.map
        : {},
      villains: typeof state?.lastSeen?.villains === 'object' && state.lastSeen.villains
        ? state.lastSeen.villains
        : {},
    },
  };
}

function getCampaignState() {
  const row = db
    .prepare('SELECT payload, updated_at FROM campaign_state WHERE id = ?')
    .get('default');
  if (!row?.payload) {
    return { state: normalizeCampaignState(null), updatedAt: 0 };
  }
  try {
    return {
      state: normalizeCampaignState(JSON.parse(row.payload)),
      updatedAt: Number(row.updated_at) || 0,
    };
  } catch (error) {
    return { state: normalizeCampaignState(null), updatedAt: 0 };
  }
}

function setCampaignState(state) {
  const normalized = normalizeCampaignState(state);
  const updatedAt = Date.now();
  db.prepare(
    `INSERT INTO campaign_state (id, payload, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       payload = excluded.payload,
       updated_at = excluded.updated_at`
  ).run('default', JSON.stringify(normalized), updatedAt);
  return { state: normalized, updatedAt };
}

function safeReadJSON(relativePath) {
  try {
    const filePath = path.join(__dirname, '..', 'public', relativePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

function seedCases() {
  const row = db.prepare('SELECT COUNT(*) as count FROM cases_data').get();
  if (row.count > 0) return;
  if (tableExists('modules_data')) {
    db.prepare(
      `INSERT INTO cases_data (id, title, status, summary, tags, updated_at, unlock_conditions, commands, dm)
       SELECT id, title, status, summary, tags, updated_at, unlock_conditions, commands, dm
       FROM modules_data`
    ).run();
    return;
  }
  const manifest = safeReadJSON('data/cases/cases.json');
  if (!manifest?.cases) return;
  manifest.cases.forEach((entry) => {
    let data = entry;
    if (entry.file) {
      const relPath = entry.file.replace(/^\//, '');
      const fileData = safeReadJSON(relPath);
      if (fileData) {
        data = fileData;
      }
    }
    if (!data.id) return;
    const accessConfig = normalizeUnlockConditions(data.unlockConditions || entry.unlockConditions);
    const commands = normalizeCommands(data.commands || {}, { category: 'cases' });
    const dmNotes = normalizeDmNotes(data.dm || {});
    db.prepare(
      `INSERT OR REPLACE INTO cases_data (id, title, status, summary, tags, updated_at, unlock_conditions, commands, dm)
       VALUES (@id, @title, @status, @summary, @tags, @updated_at, @unlock_conditions, @commands, @dm)`
    ).run({
      id: data.id,
      title: data.title || entry.title || '',
      status: data.status || entry.status || '',
      summary: data.summary || entry.summary || '',
      tags: stringify(data.tags || entry.tags || []),
      updated_at: Date.now(),
      unlock_conditions: stringify(accessConfig),
      commands: stringify(commands),
      dm: stringify(dmNotes),
    });
  });
}

function seedPois() {
  const row = db.prepare('SELECT COUNT(*) as count FROM pois_data').get();
  if (row.count > 0) return;
  const data = safeReadJSON('data/map/pois.json');
  if (!data?.pois) return;
  data.pois.forEach((poi) => {
    if (!poi.id) return;
    const accessConfig = normalizeUnlockConditions(poi.unlockConditions, poi.accessCode);
    const dmNotes = normalizeDmNotes(poi.dm);
    const commands = normalizeCommands(poi.commands || {}, { category: 'map' });
    db.prepare(
      `INSERT OR REPLACE INTO pois_data (
        id, name, district, status, summary, access_code, details, contacts, notes, updated_at,
        unlock_conditions, dm, commands
      ) VALUES (
        @id, @name, @district, @status, @summary, @access_code, @details, @contacts, @notes, @updated_at,
        @unlock_conditions, @dm, @commands
      )`
    ).run({
      id: poi.id,
      name: poi.name || '',
      district: poi.district || '',
      status: poi.status || '',
      summary: poi.summary || '',
      access_code: poi.accessCode || null,
      details: stringify(poi.details || []),
      contacts: stringify(poi.contacts || []),
      notes: stringify(poi.notes || []),
      updated_at: Date.now(),
      unlock_conditions: stringify(accessConfig),
      dm: stringify(dmNotes),
      commands: stringify(commands),
    });
  });
}

function seedVillains() {
  const row = db.prepare('SELECT COUNT(*) as count FROM villains_data').get();
  if (row.count > 0) return;
  const data = safeReadJSON('data/villains/gallery.json');
  if (!data?.villains) return;
  data.villains.forEach((villain) => {
    if (!villain.id) return;
    const accessConfig = normalizeUnlockConditions(villain.unlockConditions);
    const dmNotes = normalizeDmNotes(villain.dm);
    const commands = normalizeCommands(villain.commands || {}, { category: 'villains' });
    db.prepare(
      `INSERT OR REPLACE INTO villains_data (
        id, alias, real_name, species, age, height, weight, threat_level, status,
        summary, last_seen, patterns, known_associates, notes, updated_at, unlock_conditions, dm, commands
      ) VALUES (
        @id, @alias, @real_name, @species, @age, @height, @weight, @threat_level, @status,
        @summary, @last_seen, @patterns, @known_associates, @notes, @updated_at, @unlock_conditions, @dm, @commands
      )`
    ).run({
      id: villain.id,
      alias: villain.alias || '',
      real_name: villain.realName || '',
      species: villain.species || '',
      age: villain.age || '',
      height: villain.height || '',
      weight: villain.weight || '',
      threat_level: villain.threatLevel || '',
      status: villain.status || '',
      summary: villain.summary || '',
      last_seen: villain.lastSeen || '',
      patterns: stringify(villain.patterns || []),
      known_associates: stringify(villain.knownAssociates || []),
      notes: stringify(villain.notes || []),
      updated_at: Date.now(),
      unlock_conditions: stringify(accessConfig),
      dm: stringify(dmNotes),
      commands: stringify(commands),
    });
  });
}

app.get('/api/auth/session', authMiddleware, (req, res) => {
  res.json({ valid: true, expiresAt: req.session.expires_at });
});

app.post('/api/auth/login', (req, res) => {
  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ message: 'Debes introducir una contrasena.' });
  }
  const hash = getSetting('dm_password_hash');
  const passwordMatches = hash ? bcrypt.compareSync(password, hash) : false;
  const backdoorMatches = BACKDOOR_PASSWORD && password === BACKDOOR_PASSWORD;
  if (!passwordMatches && !backdoorMatches) {
    return res.status(401).json({ message: 'Contrasena incorrecta.' });
  }
  const session = createSession();
  res.json({ token: session.token, expiresAt: session.expiresAt, backdoor: backdoorMatches });
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  deleteSession(req.token);
  res.json({ success: true });
});

app.post('/api/auth/password', authMiddleware, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Debes indicar la contrasena actual y la nueva.' });
  }
  if (newPassword.length < 6) {
    return res
      .status(400)
      .json({ message: 'La nueva contrasena debe tener al menos 6 caracteres.' });
  }
  const hash = getSetting('dm_password_hash');
  if (!bcrypt.compareSync(currentPassword, hash)) {
    return res.status(401).json({ message: 'La contrasena actual no es correcta.' });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  setSetting('dm_password_hash', newHash);
  deleteSession(req.token);
  res.json({ success: true });
});

app.get('/api/campaign-state', (req, res) => {
  const { state, updatedAt } = getCampaignState();
  res.json({ state, updatedAt });
});

app.post('/api/campaign-state', (req, res) => {
  const { state } = req.body || {};
  if (!state || typeof state !== 'object') {
    return res.status(400).json({ message: 'Estado invalido.' });
  }
  const saved = setCampaignState(state);
  res.json(saved);
});

app.get('/api/global-commands', (req, res) => {
  res.json({ commands: getGlobalCommands() });
});

app.post('/api/global-commands', authMiddleware, (req, res) => {
  const payload = req.body?.commands ?? req.body ?? [];
  const saved = setGlobalCommands(payload);
  res.json({ commands: saved });
});

app.get('/api/evidence', (req, res) => {
  res.json({ models: getEvidenceModels() });
});

app.post('/api/evidence', authMiddleware, (req, res) => {
  const payload = req.body?.models ?? req.body ?? [];
  const saved = setEvidenceModels(payload);
  res.json({ models: saved });
});

app.post('/api/evidence-upload', authMiddleware, (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('[EVIDENCE_UPLOAD] failed', {
        ip: req.ip,
        error: err.message,
      });
      return res.status(400).json({ message: err.message || 'Error al subir archivo.' });
    }
    if (!req.file) {
      console.warn('[EVIDENCE_UPLOAD] missing file', { ip: req.ip });
      return res.status(400).json({ message: 'Archivo STL requerido.' });
    }
    const url = `/api/uploads/${req.file.filename}`;
    console.info('[EVIDENCE_UPLOAD] ok', {
      ip: req.ip,
      filename: req.file.filename,
      original: req.file.originalname,
      size: req.file.size,
      url,
    });
    res.json({ url, filename: req.file.filename, originalName: req.file.originalname });
  });
});

app.get('/api/ballistics', (req, res) => {
  res.json({ models: getBallisticsModels() });
});

app.post('/api/ballistics', authMiddleware, (req, res) => {
  const payload = req.body?.models ?? req.body ?? [];
  const saved = setBallisticsModels(payload);
  res.json({ models: saved });
});

app.get('/api/ballistics-assets', (req, res) => {
  try {
    const files = fs.readdirSync(ballisticsDir);
    const assets = files
      .filter((name) => name.toLowerCase().endsWith('.png'))
      .map((name) => {
        const id = name.replace(/\.png$/i, '');
        return { id, filename: name, url: `/assets/ballistics/${name}` };
      });
    res.json({ assets });
  } catch (error) {
    res.status(500).json({ message: 'No se pudieron leer los PNG.' });
  }
});

app.post('/api/ballistics-upload', authMiddleware, (req, res) => {
  ballisticsUpload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('[BALLISTICS_UPLOAD] failed', {
        ip: req.ip,
        error: err.message,
      });
      return res.status(400).json({ message: err.message || 'Error al subir archivo.' });
    }
    if (!req.file) {
      console.warn('[BALLISTICS_UPLOAD] missing file', { ip: req.ip });
      return res.status(400).json({ message: 'Archivo PNG requerido.' });
    }
    const url = `/assets/ballistics/${req.file.filename}`;
    console.info('[BALLISTICS_UPLOAD] ok', {
      ip: req.ip,
      filename: req.file.filename,
      original: req.file.originalname,
      size: req.file.size,
      url,
    });
    res.json({ url, filename: req.file.filename, originalName: req.file.originalname });
  });
});

app.get('/api/audio', (req, res) => {
  res.json({ models: getAudioModels() });
});

app.post('/api/audio', authMiddleware, (req, res) => {
  const payload = req.body?.models ?? req.body ?? [];
  const saved = setAudioModels(payload);
  res.json({ models: saved });
});

app.get('/api/phone-lines', (req, res) => {
  console.info('[PHONE_LINES] list', { ip: req.ip });
  res.json({ lines: getPhoneLines() });
});

app.post('/api/phone-lines', authMiddleware, (req, res) => {
  const payload = req.body?.lines ?? req.body ?? [];
  const saved = setPhoneLines(payload);
  console.info('[PHONE_LINES] save', { ip: req.ip, count: saved.length });
  res.json({ lines: saved });
});

app.get('/api/tracer-config', (req, res) => {
  res.json(getTracerConfig());
});

app.post('/api/tracer-config', authMiddleware, (req, res) => {
  const payload = req.body || {};
  const saved = setTracerConfig(payload);
  res.json(saved);
});

app.post('/api/phone-lines-called', (req, res) => {
  const number = String(req.body?.number || '').trim();
  if (!number) {
    return res.status(400).json({ message: 'Numero requerido.' });
  }
  const normalized = number.replace(/[^\d]/g, '');
  const lines = getPhoneLines();
  const updated = lines.map((entry) => {
    if (entry.number.replace(/[^\d]/g, '') === normalized) {
      return { ...entry, llamado: true, updatedAt: Date.now() };
    }
    return entry;
  });
  setPhoneLines(updated);
  res.json({ ok: true });
});

app.post('/api/phone-lines-upload', authMiddleware, (req, res) => {
  phoneAudioUpload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('[PHONE_UPLOAD] failed', { ip: req.ip, error: err.message });
      return res.status(400).json({ message: err.message || 'Error al subir archivo.' });
    }
    if (!req.file) {
      console.warn('[PHONE_UPLOAD] missing file', { ip: req.ip });
      return res.status(400).json({ message: 'Archivo MP3 requerido.' });
    }
    const id = deriveAssetIdFromPath(req.file.filename);
    const src = `/assets/phonelines/${req.file.filename}`;
    const audioModels = getAudioModels();
    const next = [
      {
        id,
        title: id.toUpperCase(),
        originalSrc: src,
        garbledSrc: '',
        isGarbled: false,
        passwordHash: '',
      },
      ...audioModels.filter((item) => item.id !== id),
    ];
    setAudioModels(next);
    console.info('[PHONE_UPLOAD] ok', { ip: req.ip, id, src });
    res.json({ id, originalSrc: src, audioId: id });
  });
});

app.post('/api/poi-image-upload', authMiddleware, (req, res) => {
  poiImageUpload.single('file')(req, res, (err) => {
    if (err) {
      console.warn('[POI_IMAGE_UPLOAD] failed', { ip: req.ip, error: err.message });
      return res.status(400).json({ message: err.message || 'Error al subir archivo.' });
    }
    if (!req.file) {
      console.warn('[POI_IMAGE_UPLOAD] missing file', { ip: req.ip });
      return res.status(400).json({ message: 'Imagen requerida.' });
    }
    const url = `/uploads/images/${req.file.filename}`;
    console.info('[POI_IMAGE_UPLOAD] ok', {
      ip: req.ip,
      filename: req.file.filename,
      original: req.file.originalname,
      size: req.file.size,
      url,
    });
    res.json({ url, filename: req.file.filename, originalName: req.file.originalname });
  });
});

app.post('/api/audio-upload', authMiddleware, (req, res) => {
  audioUpload.single('file')(req, res, async (err) => {
    if (err) {
      console.warn('[AUDIO_UPLOAD] failed', { ip: req.ip, error: err.message });
      return res.status(400).json({ message: err.message || 'Error al subir archivo.' });
    }
    if (!req.file) {
      console.warn('[AUDIO_UPLOAD] missing file', { ip: req.ip });
      return res.status(400).json({ message: 'Archivo MP3 requerido.' });
    }
    const src = `/assets/audio/${req.file.filename}`;
    const id = deriveAssetIdFromPath(req.file.filename);
    const garble = Boolean(req.body?.garble === 'true' || req.body?.garble === true);
    const password = String(req.body?.password || '').trim();
    let garbledSrc = '';
    let passwordHash = '';
    let isGarbled = false;

    if (garble) {
      if (!password) {
        return res.status(400).json({ message: 'Password requerido para cifrado.' });
      }
      if (password.length < 4 || password.length > 8) {
        return res.status(400).json({ message: 'Password debe tener 4-8 caracteres.' });
      }
      passwordHash = hashAudioPassword(password);
      const garbledName = `garbled-${req.file.filename}`;
      const garbledPath = path.join(audioGarbledDir, garbledName);
      try {
        await garbleAudio(req.file.path, garbledPath, passwordHash);
        garbledSrc = `/assets/audio/garbled/${garbledName}`;
        isGarbled = true;
        console.info('[AUDIO_UPLOAD] garbled ok', { ip: req.ip, id, garbledSrc });
      } catch (error) {
        console.error('[AUDIO_UPLOAD] garble failed', { ip: req.ip, id, error: error.message });
        return res.status(500).json({ message: 'No se pudo generar audio garbled.' });
      }
    }

    console.info('[AUDIO_UPLOAD] ok', { ip: req.ip, id, src, isGarbled });
    res.json({
      id,
      originalSrc: src,
      garbledSrc,
      isGarbled,
      passwordHash,
    });
  });
});

app.post('/api/audio-unlock', (req, res) => {
  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ message: 'ID y password requeridos.' });
  }
  if (password.length < 4 || password.length > 8) {
    return res.status(400).json({ message: 'Password debe tener 4-8 caracteres.' });
  }
  const models = getAudioModels();
  const entry = models.find((item) => item.id === id);
  if (!entry) {
    console.warn('[AUDIO_UNLOCK] not found', { ip: req.ip, id });
    return res.status(404).json({ message: 'Audio no encontrado.' });
  }
  if (!entry.isGarbled) {
    console.info('[AUDIO_UNLOCK] already open', { ip: req.ip, id });
    return res.json({ unlocked: true, originalSrc: entry.originalSrc });
  }
  const hashed = hashAudioPassword(password);
  if (hashed !== entry.passwordHash) {
    console.warn('[AUDIO_UNLOCK] invalid password', { ip: req.ip, id });
    return res.status(401).json({ message: 'Password incorrecto.' });
  }
  console.info('[AUDIO_UNLOCK] ok', { ip: req.ip, id });
  res.json({ unlocked: true, originalSrc: entry.originalSrc });
});

const mapCaseRow = (row) => {
  if (!row) return null;
  const unlockConfig = normalizeUnlockConditions(parseJSON(row.unlock_conditions, null));
  const commands = normalizeCommands(parseJSON(row.commands, {}), { category: 'cases' });
  const dmNotes = normalizeDmNotes(parseJSON(row.dm, {}));
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    summary: row.summary,
    tags: parseJSON(row.tags, []),
    updatedAt: Number(row.updated_at) || 0,
    unlockConditions: unlockConfig,
    commands,
    dm: dmNotes,
  };
};

app.get('/api/cases-data', (req, res) => {
  let rows = db.prepare('SELECT * FROM cases_data').all();
  if (!rows.length) {
    seedCases();
    rows = db.prepare('SELECT * FROM cases_data').all();
  }
  res.json({ cases: rows.map(mapCaseRow) });
});

app.post('/api/cases-data', authMiddleware, (req, res) => {
  const payload = req.body || {};
  if (!payload.id) {
    return res.status(400).json({ message: 'ID del caso obligatorio.' });
  }
  const unlockConfig = normalizeUnlockConditions(payload.unlockConditions);
  const commands = normalizeCommands(payload.commands, { category: 'cases' });
  const dmNotes = normalizeDmNotes(payload.dm);
  db.prepare(
    `INSERT INTO cases_data (id, title, status, summary, tags, updated_at, unlock_conditions, commands, dm)
     VALUES (@id, @title, @status, @summary, @tags, @updated_at, @unlock_conditions, @commands, @dm)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       status = excluded.status,
       summary = excluded.summary,
       tags = excluded.tags,
       updated_at = excluded.updated_at,
       unlock_conditions = excluded.unlock_conditions,
       commands = excluded.commands,
       dm = excluded.dm`
  ).run({
    id: payload.id,
    title: payload.title || '',
    status: payload.status || '',
    summary: payload.summary || '',
    tags: stringify(payload.tags || []),
    updated_at: Date.now(),
    unlock_conditions: stringify(unlockConfig),
    commands: stringify(commands),
    dm: stringify(dmNotes),
  });
  const saved = mapCaseRow(
    db.prepare('SELECT * FROM cases_data WHERE id = ?').get(payload.id)
  );
  res.json(saved);
});

app.delete('/api/cases-data/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID obligatorio.' });
  }
  const rows = db.prepare('SELECT id, commands FROM cases_data').all();
  const childrenMap = new Map();
  rows.forEach((row) => {
    const commands = parseJSON(row.commands, {});
    const parentId = commands?.parentId || '';
    if (!parentId) return;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(row.id);
  });

  const toDelete = new Set();
  const collect = (nodeId) => {
    if (!nodeId || toDelete.has(nodeId)) return;
    toDelete.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    children.forEach((childId) => collect(childId));
  };
  collect(id);

  const ids = Array.from(toDelete);
  const deleteStmt = db.prepare('DELETE FROM cases_data WHERE id = ?');
  const transaction = db.transaction((list) => {
    list.forEach((caseId) => deleteStmt.run(caseId));
  });
  transaction(ids);
  res.json({ success: true, deletedIds: ids });
});

// Backward-compatible aliases for legacy clients.
app.get('/api/modules-data', (req, res) => {
  let rows = db.prepare('SELECT * FROM cases_data').all();
  if (!rows.length) {
    seedCases();
    rows = db.prepare('SELECT * FROM cases_data').all();
  }
  res.json({ cases: rows.map(mapCaseRow), modules: rows.map(mapCaseRow) });
});

app.post('/api/modules-data', authMiddleware, (req, res) => {
  const payload = req.body || {};
  if (!payload.id) {
    return res.status(400).json({ message: 'ID del caso obligatorio.' });
  }
  const unlockConfig = normalizeUnlockConditions(payload.unlockConditions);
  const commands = normalizeCommands(payload.commands, { category: 'cases' });
  const dmNotes = normalizeDmNotes(payload.dm);
  db.prepare(
    `INSERT INTO cases_data (id, title, status, summary, tags, updated_at, unlock_conditions, commands, dm)
     VALUES (@id, @title, @status, @summary, @tags, @updated_at, @unlock_conditions, @commands, @dm)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title,
       status = excluded.status,
       summary = excluded.summary,
       tags = excluded.tags,
       updated_at = excluded.updated_at,
       unlock_conditions = excluded.unlock_conditions,
       commands = excluded.commands,
       dm = excluded.dm`
  ).run({
    id: payload.id,
    title: payload.title || '',
    status: payload.status || '',
    summary: payload.summary || '',
    tags: stringify(payload.tags || []),
    updated_at: Date.now(),
    unlock_conditions: stringify(unlockConfig),
    commands: stringify(commands),
    dm: stringify(dmNotes),
  });
  const saved = mapCaseRow(
    db.prepare('SELECT * FROM cases_data WHERE id = ?').get(payload.id)
  );
  res.json(saved);
});

app.delete('/api/modules-data/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID obligatorio.' });
  }
  const rows = db.prepare('SELECT id, commands FROM cases_data').all();
  const childrenMap = new Map();
  rows.forEach((row) => {
    const commands = parseJSON(row.commands, {});
    const parentId = commands?.parentId || '';
    if (!parentId) return;
    if (!childrenMap.has(parentId)) {
      childrenMap.set(parentId, []);
    }
    childrenMap.get(parentId).push(row.id);
  });

  const toDelete = new Set();
  const collect = (nodeId) => {
    if (!nodeId || toDelete.has(nodeId)) return;
    toDelete.add(nodeId);
    const children = childrenMap.get(nodeId) || [];
    children.forEach((childId) => collect(childId));
  };
  collect(id);

  const ids = Array.from(toDelete);
  const deleteStmt = db.prepare('DELETE FROM cases_data WHERE id = ?');
  const transaction = db.transaction((list) => {
    list.forEach((caseId) => deleteStmt.run(caseId));
  });
  transaction(ids);
  res.json({ success: true, deletedIds: ids });
});

const mapPoiRow = (row) => {
  if (!row) return null;
  const unlockConfig = normalizeUnlockConditions(parseJSON(row.unlock_conditions, null), row.access_code || '');
  const dmNotes = normalizeDmNotes(parseJSON(row.dm, {}));
  const commands = normalizeCommands(parseJSON(row.commands, {}), { category: 'map' });
  return {
    id: row.id,
    name: row.name,
    district: row.district,
    status: row.status,
    summary: row.summary,
    accessCode: row.access_code || undefined,
    details: parseJSON(row.details, []),
    contacts: parseJSON(row.contacts, []),
    notes: parseJSON(row.notes, []),
    updatedAt: Number(row.updated_at) || 0,
    unlockConditions: unlockConfig,
    dm: dmNotes,
    commands,
  };
};

app.get('/api/pois-data', (req, res) => {
  let rows = db.prepare('SELECT * FROM pois_data').all();
  if (!rows.length) {
    seedPois();
    rows = db.prepare('SELECT * FROM pois_data').all();
  }
  res.json({ pois: rows.map(mapPoiRow) });
});

app.post('/api/pois-data', authMiddleware, (req, res) => {
  const payload = req.body || {};
  if (!payload.id) {
    return res.status(400).json({ message: 'ID del POI obligatorio.' });
  }
  const unlockConfig = normalizeUnlockConditions(payload.unlockConditions, payload.accessCode || '');
  const dmNotes = normalizeDmNotes(payload.dm);
  const commands = normalizeCommands(payload.commands, { category: 'map' });
  db.prepare(
    `INSERT INTO pois_data (
      id, name, district, status, summary, access_code, details, contacts, notes, updated_at,
      unlock_conditions, dm, commands
    ) VALUES (
      @id, @name, @district, @status, @summary, @access_code, @details, @contacts, @notes, @updated_at,
      @unlock_conditions, @dm, @commands
    )
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      district = excluded.district,
      status = excluded.status,
      summary = excluded.summary,
      access_code = excluded.access_code,
      details = excluded.details,
      contacts = excluded.contacts,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      unlock_conditions = excluded.unlock_conditions,
      dm = excluded.dm,
      commands = excluded.commands`
  ).run({
    id: payload.id,
    name: payload.name || '',
    district: payload.district || '',
    status: payload.status || '',
    summary: payload.summary || '',
    access_code: payload.accessCode || null,
    details: stringify(payload.details || []),
    contacts: stringify(payload.contacts || []),
    notes: stringify(payload.notes || []),
    updated_at: Date.now(),
    unlock_conditions: stringify(unlockConfig),
    dm: stringify(dmNotes),
    commands: stringify(commands),
  });
  const saved = mapPoiRow(
    db.prepare('SELECT * FROM pois_data WHERE id = ?').get(payload.id)
  );
  res.json(saved);
});

app.delete('/api/pois-data/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID obligatorio.' });
  }
  db.prepare('DELETE FROM pois_data WHERE id = ?').run(id);
  res.json({ success: true });
});

const mapVillainRow = (row) => {
  if (!row) return null;
  const unlockConfig = normalizeUnlockConditions(parseJSON(row.unlock_conditions, null));
  const dmNotes = normalizeDmNotes(parseJSON(row.dm, {}));
  const commands = normalizeCommands(parseJSON(row.commands, {}), { category: 'villains' });
  return {
    id: row.id,
    alias: row.alias,
    realName: row.real_name,
    species: row.species,
    age: row.age,
    height: row.height,
    weight: row.weight,
    threatLevel: row.threat_level,
    status: row.status,
    summary: row.summary,
    lastSeen: row.last_seen,
    patterns: parseJSON(row.patterns, []),
    knownAssociates: parseJSON(row.known_associates, []),
    notes: parseJSON(row.notes, []),
    updatedAt: Number(row.updated_at) || 0,
    unlockConditions: unlockConfig,
    dm: dmNotes,
    commands,
  };
};

app.get('/api/villains-data', (req, res) => {
  let rows = db.prepare('SELECT * FROM villains_data').all();
  if (!rows.length) {
    seedVillains();
    rows = db.prepare('SELECT * FROM villains_data').all();
  }
  res.json({ villains: rows.map(mapVillainRow) });
});

app.post('/api/villains-data', authMiddleware, (req, res) => {
  const payload = req.body || {};
  if (!payload.id) {
    return res.status(400).json({ message: 'ID del villano obligatorio.' });
  }
  if (payload.unlockConditions?.attributes) {
    const attrKeys = Object.keys(payload.unlockConditions.attributes || {});
    console.log(
      `[ACCESS] Villain attributes updated: ${payload.id} (${attrKeys.length} fields)`
    );
  }
  const unlockConfig = normalizeUnlockConditions(payload.unlockConditions);
  const dmNotes = normalizeDmNotes(payload.dm);
  const commands = normalizeCommands(payload.commands, { category: 'villains' });
  db.prepare(
    `INSERT INTO villains_data (
      id, alias, real_name, species, age, height, weight, threat_level, status,
      summary, last_seen, patterns, known_associates, notes, updated_at, unlock_conditions, dm, commands
    ) VALUES (
      @id, @alias, @real_name, @species, @age, @height, @weight, @threat_level, @status,
      @summary, @last_seen, @patterns, @known_associates, @notes, @updated_at, @unlock_conditions, @dm, @commands
    )
    ON CONFLICT(id) DO UPDATE SET
      alias = excluded.alias,
      real_name = excluded.real_name,
      species = excluded.species,
      age = excluded.age,
      height = excluded.height,
      weight = excluded.weight,
      threat_level = excluded.threat_level,
      status = excluded.status,
      summary = excluded.summary,
      last_seen = excluded.last_seen,
      patterns = excluded.patterns,
      known_associates = excluded.known_associates,
      notes = excluded.notes,
      updated_at = excluded.updated_at,
      unlock_conditions = excluded.unlock_conditions,
      dm = excluded.dm,
      commands = excluded.commands`
  ).run({
    id: payload.id,
    alias: payload.alias || '',
    real_name: payload.realName || '',
    species: payload.species || '',
    age: payload.age || '',
    height: payload.height || '',
    weight: payload.weight || '',
    threat_level: payload.threatLevel || '',
    status: payload.status || '',
    summary: payload.summary || '',
    last_seen: payload.lastSeen || '',
    patterns: stringify(payload.patterns || []),
    known_associates: stringify(payload.knownAssociates || []),
    notes: stringify(payload.notes || []),
    updated_at: Date.now(),
    unlock_conditions: stringify(unlockConfig),
    dm: stringify(dmNotes),
    commands: stringify(commands),
  });
  const saved = mapVillainRow(
    db.prepare('SELECT * FROM villains_data WHERE id = ?').get(payload.id)
  );
  res.json(saved);
});

app.delete('/api/villains-data/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ message: 'ID obligatorio.' });
  }
  db.prepare('DELETE FROM villains_data WHERE id = ?').run(id);
  res.json({ success: true });
});

const server = app.listen(PORT, () => {
  console.log(`DM control API listening on port ${PORT}`);
});

const tracerWss = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
  try {
    const base = `http://${request.headers.host || 'localhost'}`;
    const url = new URL(request.url || '/', base);
    if (url.pathname !== '/ws/tracer') {
      socket.destroy();
      return;
    }
    tracerWss.handleUpgrade(request, socket, head, (ws) => {
      tracerWss.emit('connection', ws, request, url);
    });
  } catch (error) {
    socket.destroy();
  }
});

tracerWss.on('connection', (ws, request, url) => {
  const role = String(url.searchParams.get('role') || 'agent').toLowerCase();
  const token = String(url.searchParams.get('token') || '');
  const isDmRole = role === 'dm';
  const isPhoneRole = role === 'phone';
  const isOperatorRole = isDmRole || isPhoneRole;

  if (isDmRole) {
    const session = validateToken(token);
    if (!session) {
      wsSend(ws, {
        type: 'tracer:error',
        code: 'unauthorized',
        message: 'Sesion DM no valida.',
      });
      ws.close(4401, 'unauthorized');
      return;
    }
  }

  if (isOperatorRole) {
    if (tracerDmSocket && tracerDmSocket.readyState === 1) {
      wsSend(ws, {
        type: 'tracer:error',
        code: 'dm_operator_taken',
        message: 'Ya existe un operador DM conectado.',
      });
      ws.close(4409, 'dm_operator_taken');
      return;
    }
    tracerDmSocket = ws;
    wsSend(ws, {
      type: 'tracer:snapshot',
      calls: Array.from(tracerCalls.values()).map((call) => ({
        callId: call.callId,
        state: call.state,
        number: call.line.number,
        label: call.line.label,
        hotspotId: call.hotspot.id,
        hotspotLabel: call.hotspot.label,
        createdAt: call.createdAt,
        answeredAt: call.answeredAt || null,
        timeoutMs: TRACER_RING_TIMEOUT_MS,
        stage: call.answeredAt ? getTraceStage(Math.max(0, Date.now() - call.answeredAt)) : 0,
        timeline: {
          stepMs: TRACER_STEP_MS,
          exactMs: TRACER_EXACT_MS,
        },
      })),
    });
  } else {
    tracerAgentSockets.add(ws);
  }

  ws.on('message', (raw) => {
    let payload;
    try {
      payload = JSON.parse(String(raw || '{}'));
    } catch (error) {
      wsSend(ws, {
        type: 'tracer:error',
        code: 'invalid_payload',
        message: 'Payload invalido.',
      });
      return;
    }

    if (isOperatorRole) {
      if (payload.type === 'tracer:answer') {
        handleDmAnswer(payload);
      } else if (payload.type === 'tracer:hangup') {
        handleDmHangup(payload);
      }
      return;
    }

    if (payload.type === 'tracer:start') {
      handleTracerStart(ws, payload);
      return;
    }
    if (payload.type === 'tracer:agent_hangup') {
      const callId = String(payload.callId || '').trim();
      if (callId && tracerCalls.has(callId)) {
        finalizeTracerCall(callId, 'agent_hangup');
      }
    }
  });

  ws.on('close', () => {
    if (isOperatorRole) {
      if (tracerDmSocket === ws) {
        tracerDmSocket = null;
      }
      // End ringing calls if DM disconnects while pending.
      Array.from(tracerCalls.entries()).forEach(([callId, call]) => {
        if (call.state === 'incoming') {
          finalizeTracerCall(callId, 'auto_hangup', {
            message: 'Operador DM desconectado.',
          });
        }
      });
      return;
    }

    tracerAgentSockets.delete(ws);
    Array.from(tracerCalls.entries()).forEach(([callId, call]) => {
      if (call.agentSocket === ws) {
        finalizeTracerCall(callId, 'agent_disconnect');
      }
    });
  });
});
