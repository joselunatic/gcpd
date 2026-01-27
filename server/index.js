import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;
const DEFAULT_PASSWORD = process.env.DM_DEFAULT_PASSWORD || 'brother';
const BACKDOOR_PASSWORD = process.env.DM_BACKDOOR_PASSWORD || '1234';
const SESSION_DURATION_MS = Number(process.env.DM_SESSION_DURATION_MS || 1000 * 60 * 60 * 6);

const dbPath = path.join(__dirname, 'batconsole.db');
const db = new Database(dbPath);

app.use(cors());
app.use(express.json());

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
  };
};

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
    return res.status(401).json({ message: 'Sesion no valida. Vuelve a iniciar sesion.' });
  }
  req.session = session;
  req.token = token;
  next();
}

initDatabase();
ensureDefaultPassword();
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
  db.prepare('DELETE FROM cases_data WHERE id = ?').run(id);
  res.json({ success: true });
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
  db.prepare('DELETE FROM cases_data WHERE id = ?').run(id);
  res.json({ success: true });
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

app.listen(PORT, () => {
  console.log(`DM control API listening on port ${PORT}`);
});
