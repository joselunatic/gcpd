const BASE_URL = process.env.QUEST_SMOKE_URL || 'http://localhost:5174';

const fetchJson = async (path) => {
  const response = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  return response.json();
};

const fetchOk = async (path) => {
  const response = await fetch(`${BASE_URL}${path}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${path} responded ${response.status}`);
  }
  return response;
};

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

const list = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const run = async () => {
  const questResponse = await fetchOk('/quest');
  const questHtml = await questResponse.text();
  assert(questHtml.includes('<div id="root">'), '/quest did not return the app shell');

  await Promise.all(['/w.stl', '/joker.stl', '/bala.stl'].map(fetchOk));

  const [evidence, ballistics, assets, audio, phoneLines, tracerConfig] = await Promise.all([
    fetchJson('/api/evidence'),
    fetchJson('/api/ballistics'),
    fetchJson('/api/ballistics-assets'),
    fetchJson('/api/audio'),
    fetchJson('/api/phone-lines'),
    fetchJson('/api/tracer-config'),
  ]);

  const evidenceModels = list(evidence, 'models');
  const ballisticsModels = list(ballistics, 'models');
  const ballisticsAssets = list(assets, 'assets');
  const audioModels = list(audio, 'models');
  const phoneLineModels = list(phoneLines, 'lines');
  const tracerLines = list(tracerConfig, 'lines');
  const tracerHotspots = list(tracerConfig, 'hotspots');

  assert(ballisticsModels.length > 0, 'Expected /api/ballistics models');
  assert(ballisticsAssets.length > 0, 'Expected /api/ballistics-assets assets');
  assert(audioModels.length > 0, 'Expected /api/audio models');
  assert(phoneLineModels.length > 0, 'Expected /api/phone-lines lines');
  assert(tracerLines.length > 0, 'Expected /api/tracer-config lines');
  assert(tracerHotspots.length > 0, 'Expected /api/tracer-config hotspots');

  const invalidBallistic = ballisticsModels.find((entry) => {
    const code = String(entry.caseCode || '').replace(/[^A-Z]/gi, '');
    return code.length !== 3 || !entry.pngPath;
  });
  assert(!invalidBallistic, `Invalid ballistics model: ${invalidBallistic?.id || 'unknown'}`);

  console.log(JSON.stringify({
    ok: true,
    baseUrl: BASE_URL,
    evidence: evidenceModels.length,
    builtInStl: 3,
    ballistics: ballisticsModels.length,
    ballisticsAssets: ballisticsAssets.length,
    audio: audioModels.length,
    phoneLines: phoneLineModels.length,
    tracerLines: tracerLines.length,
    tracerHotspots: tracerHotspots.length,
  }, null, 2));
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
