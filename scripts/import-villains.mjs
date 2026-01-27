import fs from 'fs/promises';
import path from 'path';

const DEFAULT_URL = process.env.WOPR_API_URL || 'http://localhost:4000';
const DEFAULT_PASSWORD = process.env.DM_PASSWORD || process.env.WOPR_DM_PASSWORD || '';

const args = process.argv.slice(2);
const fileArg = args.find((arg) => !arg.startsWith('--'));
const urlArg = getFlagValue(args, '--url') || DEFAULT_URL;
const passwordArg = getFlagValue(args, '--password') || DEFAULT_PASSWORD;
const dryRun = args.includes('--dry-run');

if (!fileArg) {
  console.error('Uso: node scripts/import-villains.mjs <archivo.json> [--url http://localhost:4000] [--password XXX] [--dry-run]');
  process.exit(1);
}

if (!passwordArg && !dryRun) {
  console.error('Falta password. Usa --password o define DM_PASSWORD/WOPR_DM_PASSWORD.');
  process.exit(1);
}

const filePath = path.resolve(process.cwd(), fileArg);

const raw = await fs.readFile(filePath, 'utf8');
let payloadJson;
try {
  payloadJson = JSON.parse(raw);
} catch (error) {
  console.error('JSON invalido:', error.message);
  process.exit(1);
}

const villains = Array.isArray(payloadJson.villains) ? payloadJson.villains : [];
if (!villains.length) {
  console.error('No hay villanos en el JSON. Se esperaba {"villains": [...]}');
  process.exit(1);
}

const token = dryRun ? 'dry-run' : await login(urlArg, passwordArg);

let ok = 0;
let fail = 0;

for (const [index, entry] of villains.entries()) {
  try {
    const villainPayload = buildVillainPayload(entry);
    if (dryRun) {
      console.log(`[DRY] ${villainPayload.id}`);
      ok += 1;
      continue;
    }
    await postVillain(urlArg, token, villainPayload);
    console.log(`OK ${villainPayload.id}`);
    ok += 1;
  } catch (error) {
    fail += 1;
    console.error(`FAIL [${index}] ${entry?.id || entry?.alias || 'sin-id'}: ${error.message}`);
  }
}

console.log(`Importados: ${ok}. Fallos: ${fail}.`);
if (fail) process.exit(1);

function getFlagValue(list, flag) {
  const idx = list.indexOf(flag);
  if (idx === -1) return '';
  return list[idx + 1] || '';
}

function toLines(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return [];
}

function buildVillainPayload(entry = {}) {
  const id = String(entry.id || '').trim();
  if (!id) {
    throw new Error('Villano sin id');
  }
  return {
    id,
    alias: String(entry.alias || '').trim(),
    realName: String(entry.realName || '').trim(),
    species: String(entry.species || '').trim(),
    age: String(entry.age || '').trim(),
    height: String(entry.height || '').trim(),
    weight: String(entry.weight || '').trim(),
    threatLevel: String(entry.threatLevel || '').trim(),
    status: String(entry.status || 'active').trim(),
    summary: String(entry.summary || '').trim(),
    lastSeen: String(entry.lastSeen || '').trim(),
    patterns: toLines(entry.patterns),
    knownAssociates: toLines(entry.knownAssociates),
    notes: toLines(entry.notes),
    unlockConditions: entry.unlockConditions,
    dm: entry.dm,
    commands: {
      nodeType: String(entry.nodeType || 'mixed').trim(),
      parentId: String(entry.parentId || '').trim(),
      category: String(entry.category || 'villains').trim(),
    },
  };
}

async function login(baseUrl, password) {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login fallo (${res.status}): ${text}`);
  }
  const data = await res.json();
  if (!data.token) throw new Error('Login sin token');
  return data.token;
}

async function postVillain(baseUrl, token, payload) {
  const res = await fetch(`${baseUrl}/api/villains-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST fallo (${res.status}): ${text}`);
  }
}
