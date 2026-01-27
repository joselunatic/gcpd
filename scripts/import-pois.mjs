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
  console.error('Uso: node scripts/import-pois.mjs <archivo.json> [--url http://localhost:4000] [--password XXX] [--dry-run]');
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

const pois = Array.isArray(payloadJson.pois) ? payloadJson.pois : [];
if (!pois.length) {
  console.error('No hay POIs en el JSON. Se esperaba {"pois": [...]}');
  process.exit(1);
}

const token = dryRun ? 'dry-run' : await login(urlArg, passwordArg);

let ok = 0;
let fail = 0;

for (const [index, poi] of pois.entries()) {
  try {
    const poiPayload = buildPoiPayload(poi);
    if (dryRun) {
      console.log(`[DRY] ${poiPayload.id}`);
      ok += 1;
      continue;
    }
    await postPoi(urlArg, token, poiPayload);
    console.log(`OK ${poiPayload.id}`);
    ok += 1;
  } catch (error) {
    fail += 1;
    console.error(`FAIL [${index}] ${poi?.id || poi?.name || 'sin-id'}: ${error.message}`);
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

function buildPoiPayload(poi = {}) {
  const id = String(poi.id || '').trim();
  if (!id) {
    throw new Error('POI sin id');
  }
  return {
    id,
    name: String(poi.name || '').trim(),
    district: String(poi.district || '').trim(),
    status: String(poi.status || 'active').trim(),
    summary: String(poi.summary || '').trim(),
    details: toLines(poi.details),
    contacts: Array.isArray(poi.contacts) ? poi.contacts : [],
    notes: Array.isArray(poi.notes) ? poi.notes : [],
    accessCode: poi.accessCode || undefined,
    unlockConditions: poi.unlockConditions,
    dm: poi.dm,
    commands: {
      nodeType: String(poi.nodeType || 'mixed').trim(),
      parentId: String(poi.parentId || '').trim(),
      category: String(poi.category || 'map').trim(),
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

async function postPoi(baseUrl, token, payload) {
  const res = await fetch(`${baseUrl}/api/pois-data`, {
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
