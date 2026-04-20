import { execFile } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

const exec = promisify(execFile);

const baseDir = path.join('public', 'assets', 'ballistics');
const bases = ['b01.png', 'b02.png'];
const outputWidth = 1024;
const outputHeight = 256;

const calibers = [
  '9mm',
  '.45 ACP',
  '.40 S&W',
  '.38 SPL',
  '.357 MAG',
  '10mm AUTO',
  '.380 ACP',
  '.44 MAG',
  '5.56 NATO',
  '7.62x39',
  '.300 BLK',
  '.308 WIN',
  '.223 REM',
  '6.5 CREED',
  '7.62x51',
  '5.45x39',
];

const materials = [
  'copper-jacketed',
  'lead core',
  'steel-core',
  'blackened',
  'monel',
  'tungsten',
  'nickel plated',
  'polymer tip',
  'molybdenum',
  'brass-wash',
  'graphite coat',
  'cerakote',
];

const crimes = [
  'HOMICIDIO',
  'ASALTO',
  'ROBO',
  'SECUESTRO',
  'EXTORSION',
  'FRAUDE',
  'CONTRABANDO',
  'VANDALISMO',
];

const agents = ['AGT. MONTES', 'AGT. HOLLAND', 'AGT. GORDON', 'AGT. MONTOYA', 'AGT. ALLEN'];

function mulberry32(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, idx) {
  return arr[idx % arr.length];
}

function makeCode(idx) {
  const leftLetters = [
    'A','B','C','D','E','F','G','H','I','J','K','L',
    'M','N','O','P','Q','R','S','T','U','V','W','X',
  ];
  const rightCodes = [
    'CT','NW','BR','LK','ND','ET','WS','EA','DV','BK','SR','WY',
    'TR','AR','GC','RM','HL','IV','OT','BL','CN','FD','PR','HT',
  ];
  return `${leftLetters[idx % leftLetters.length]}${rightCodes[idx % rightCodes.length]}`;
}

async function generateVariant(index) {
  const seed = 1337 + index * 101;
  const rand = mulberry32(seed);
  const base = bases[index % bases.length];
  const sourcePath = path.join(baseDir, base);
  const targetName = `b${String(index + 1).padStart(2, '0')}.png`;
  const targetPath = path.join(baseDir, targetName);

  const widthScale = 0.85 + rand() * 0.35;
  const heightScale = 0.82 + rand() * 0.22;
  const width = Math.round(outputWidth * widthScale);
  const height = Math.round(outputHeight * heightScale);
  const rotate = (rand() * 2 - 1).toFixed(2);
  const brightness = Math.round(96 + rand() * 18); // 96-114
  const saturation = Math.round(90 + rand() * 40); // 90-130
  const hue = Math.round(95 + rand() * 20); // 95-115
  const contrast = rand() < 0.5 ? ['-contrast'] : ['-contrast', '-contrast'];

  const args = [
    sourcePath,
    '-resize', `${width}x${height}!`,
    '-background', 'black',
    '-rotate', rotate,
    '-gravity', 'center',
    '-extent', `${outputWidth}x${outputHeight}`,
    '-modulate', `${brightness},${saturation},${hue}`,
    ...contrast,
    targetPath,
  ];

  await exec('convert', args);
  return targetName;
}

async function main() {
  for (const base of bases) {
    const basePath = path.join(baseDir, base);
    if (!fs.existsSync(basePath)) {
      throw new Error(`Base PNG missing: ${basePath}`);
    }
  }

  const outputs = [];
  const total = 24;
  for (let i = 0; i < total; i++) {
    const name = await generateVariant(i);
    outputs.push(name);
  }

  const models = outputs.map((name, idx) => {
    const assetId = name.replace(/\.png$/i, '');
    const code = makeCode(idx);
    const status = idx % 6 === 0 ? 'CERRADO' : 'ABIERTO';
    return {
      id: `B${String(idx + 1).padStart(2, '0')}`,
      label: `GC-${String(idx + 1).padStart(2, '0')}`,
      assetId,
      pngPath: `/assets/ballistics/${name}`,
      caliber: pick(calibers, idx),
      material: pick(materials, idx),
      bulletId: `BULLET-${String(idx + 1).padStart(2, '0')}`,
      caseId: `gcpd-gc-${String(idx + 1).padStart(3, '0')}`,
      caseCode: code,
      crime: pick(crimes, idx),
      location: 'GOTHAM CENTRAL',
      status,
      closedBy: status === 'CERRADO' ? pick(agents, idx) : '',
    };
  });

  const db = new Database('server/batconsole.db');
  db.prepare(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value'
  ).run('ballistics_models', JSON.stringify(models));
  db.close();

  console.log(`Generated ${outputs.length} ballistics PNGs and updated DB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
