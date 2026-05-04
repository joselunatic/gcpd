import { useEffect, useMemo, useState } from 'react';

const TOOL_ENDPOINTS = {
  evidence: '/api/evidence',
  ballistics: '/api/ballistics',
  ballisticsAssets: '/api/ballistics-assets',
  audio: '/api/audio',
  phoneLines: '/api/phone-lines',
  tracerConfig: '/api/tracer-config',
};

const BUILT_IN_STL_EVIDENCE = [
  { id: 'w', label: 'W', stlPath: '/w.stl', source: 'builtin' },
  { id: 'joker', label: 'JOKER', stlPath: '/joker.stl', source: 'builtin' },
  { id: 'bala', label: 'BALA', stlPath: '/bala.stl', source: 'builtin' },
];

const fetchToolJson = async (url) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`${url} responded ${response.status}`);
  }
  return response.json();
};

const listFromPayload = (payload, key) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[key])) return payload[key];
  return [];
};

const normalizeDigits = (value = '') => String(value).replace(/\D/g, '');

const sanitizeAgentLabel = (value) => {
  const text = String(value || '').trim();
  if (!text) return 'SIN LABEL';
  if (text.includes('/') || text.includes('\\') || /\.[a-z0-9]{2,5}$/i.test(text)) return 'SIN LABEL';
  return text;
};

const normalizeEvidence = (payload) =>
  listFromPayload(payload, 'models')
    .filter((entry) => entry?.visible !== false && entry?.visibility !== 'hidden')
    .map((entry) => ({
      ...entry,
      id: entry.id || entry.label || entry.name || entry.stlPath,
      label: sanitizeAgentLabel(entry.label || entry.name || entry.title),
      stlPath: entry.stlPath || entry.path || entry.src || '',
      source: 'api',
    }));

const normalizeBallistics = (payload) =>
  listFromPayload(payload, 'models').map((entry) => ({
    ...entry,
    id: entry.bulletId || entry.id || entry.assetId || entry.pngPath,
    label: sanitizeAgentLabel(entry.label),
    caseCode: String(entry.caseCode || entry.caseId || entry.caseNumber || '').trim(),
    assetId: entry.assetId || '',
    pngPath: entry.pngPath || '',
  }));

const normalizeBallisticAssets = (payload) =>
  listFromPayload(payload, 'assets').map((entry) => ({
    ...entry,
    id: entry.id || entry.filename || entry.url,
    label: sanitizeAgentLabel(entry.label || entry.title),
    url: entry.url || '',
  }));

const normalizeAudio = (payload) =>
  listFromPayload(payload, 'models').map((entry) => ({
    ...entry,
    id: entry.id || entry.title || entry.originalSrc || entry.src,
    title: sanitizeAgentLabel(entry.title || entry.label),
    src: entry.originalSrc || entry.src || entry.garbledSrc || '',
    locked: Boolean(entry.isGarbled && entry.passwordHash),
  }));

const normalizePhoneLines = (payload) =>
  listFromPayload(payload, 'lines').map((entry) => ({
    ...entry,
    id: entry.id || entry.number || entry.audioId,
    number: entry.number || '',
    normalizedNumber: normalizeDigits(entry.number),
    label: entry.label || entry.name || entry.number || 'LÍNEA',
    audioId: entry.audioId || '',
    rellamable: entry.rellamable !== false,
    llamado: Boolean(entry.llamado),
  }));

const normalizeTracerConfig = (payload) => ({
  lines: listFromPayload(payload, 'lines').map((entry) => ({
    ...entry,
    id: entry.id || entry.number || entry.hotspotId,
    number: entry.number || '',
    normalizedNumber: normalizeDigits(entry.number),
    hotspotId: entry.hotspotId || entry.poiId || '',
  })),
  hotspots: listFromPayload(payload, 'hotspots').map((entry) => ({
    ...entry,
    id: entry.id || entry.poiId || entry.label,
    label: entry.label || entry.name || entry.poiId || entry.id || 'HOTSPOT',
  })),
});

const initialState = {
  loading: true,
  errors: {},
  evidence: [],
  builtInEvidence: BUILT_IN_STL_EVIDENCE,
  ballistics: [],
  ballisticsAssets: [],
  audio: [],
  phoneLines: [],
  tracerConfig: {
    lines: [],
    hotspots: [],
  },
};

const useQuestToolData = () => {
  const [state, setState] = useState(initialState);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      const entries = await Promise.all(
        Object.entries(TOOL_ENDPOINTS).map(async ([key, url]) => {
          try {
            return [key, await fetchToolJson(url), null];
          } catch (error) {
            return [key, null, error instanceof Error ? error.message : String(error)];
          }
        })
      );

      if (cancelled) return;

      const payloads = Object.fromEntries(entries.map(([key, payload]) => [key, payload]));
      const errors = Object.fromEntries(
        entries
          .filter(([, , error]) => error)
          .map(([key, , error]) => [key, error])
      );

      setState({
        loading: false,
        errors,
        evidence: normalizeEvidence(payloads.evidence),
        builtInEvidence: BUILT_IN_STL_EVIDENCE,
        ballistics: normalizeBallistics(payloads.ballistics),
        ballisticsAssets: normalizeBallisticAssets(payloads.ballisticsAssets),
        audio: normalizeAudio(payloads.audio),
        phoneLines: normalizePhoneLines(payloads.phoneLines),
        tracerConfig: normalizeTracerConfig(payloads.tracerConfig),
      });
    };

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      hasErrors: Object.keys(state.errors).length > 0,
    }),
    [state]
  );
};

export { useQuestToolData };
