export const clampPercent = (value, fallback = 50) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(100, numeric));
};

export const normalizeTokenKind = (kind = '') => {
  const normalized = String(kind || '').trim().toLowerCase();
  if (['enemy', 'enemigo', 'hostile', 'target', 'objetivo'].includes(normalized)) {
    return 'enemy';
  }
  return 'ally';
};

export const normalizeTrail = (entry = {}) => {
  if (!entry || typeof entry !== 'object') return null;
  const fromX = clampPercent(entry.fromX);
  const fromY = clampPercent(entry.fromY);
  const toX = clampPercent(entry.toX);
  const toY = clampPercent(entry.toY);
  const updatedAt = Number(entry.updatedAt) || Date.now();
  if (![fromX, fromY, toX, toY].every((value) => Number.isFinite(value))) return null;
  return { fromX, fromY, toX, toY, updatedAt };
};

export const normalizeToken = (token = {}) => ({
  id: String(token.id || ''),
  label: String(token.agentLabel || token.label || token.dmLabel || ''),
  agentLabel: String(token.agentLabel || token.label || token.dmLabel || ''),
  dmLabel: String(token.dmLabel || token.label || token.agentLabel || ''),
  x: clampPercent(token.x),
  y: clampPercent(token.y),
  visible: token.visible !== false,
  kind: normalizeTokenKind(token.kind),
  trail: token.trail
    ? {
        fromX: clampPercent(token.trail.fromX),
        fromY: clampPercent(token.trail.fromY),
        toX: clampPercent(token.trail.toX ?? token.x),
        toY: clampPercent(token.trail.toY ?? token.y),
        updatedAt: Number(token.trail.updatedAt) || Number(token.updatedAt) || 0,
      }
    : null,
  updatedAt: Number(token.updatedAt) || 0,
});

export const applyTokenMove = (state, token = {}) => {
  const normalized = normalizeState(state);
  const tokenId = String(token.id || '').trim();
  if (!tokenId) return normalized;
  const targetX = clampPercent(token.x);
  const targetY = clampPercent(token.y);
  const sourceToken =
    normalized.tokens.find((entry) => entry.id === tokenId) || normalizeToken(token) || null;
  const explicitTrail =
    token.trail && typeof token.trail === 'object'
      ? {
          fromX: clampPercent(token.trail.fromX),
          fromY: clampPercent(token.trail.fromY),
          toX: clampPercent(token.trail.toX ?? targetX),
          toY: clampPercent(token.trail.toY ?? targetY),
          updatedAt: Number(token.trail.updatedAt) || Number(token.updatedAt) || Date.now(),
        }
      : null;
  const nextTokens = normalized.tokens.some((entry) => entry.id === tokenId)
    ? normalized.tokens.map((entry) => {
        if (entry.id !== tokenId) return entry;
        const moved = entry.x !== targetX || entry.y !== targetY;
        return {
          ...entry,
          x: targetX,
          y: targetY,
          trail: explicitTrail
            ? explicitTrail
            : moved
            ? {
                fromX: entry.x,
                fromY: entry.y,
                toX: targetX,
                toY: targetY,
                updatedAt: Number(token.updatedAt) || Date.now(),
              }
            : entry.trail || null,
          updatedAt: Number(token.updatedAt) || Date.now(),
        };
      })
    : [
        ...normalized.tokens,
        {
          ...(sourceToken || {}),
          id: tokenId,
          x: targetX,
          y: targetY,
          visible: token.visible !== false,
          kind: normalizeTokenKind(token.kind || sourceToken?.kind || ''),
          agentLabel: String(
            token.agentLabel ||
              token.label ||
              sourceToken?.agentLabel ||
              sourceToken?.label ||
              sourceToken?.dmLabel ||
              tokenId
          ).trim(),
          dmLabel: String(
            token.dmLabel ||
              sourceToken?.dmLabel ||
              sourceToken?.label ||
              sourceToken?.agentLabel ||
              token.label ||
              tokenId
          ).trim(),
          label: String(
            token.agentLabel ||
              token.label ||
              sourceToken?.agentLabel ||
              sourceToken?.label ||
              sourceToken?.dmLabel ||
              tokenId
          ).trim(),
          trail: explicitTrail || null,
          updatedAt: Number(token.updatedAt) || Date.now(),
        },
      ];
  return { ...normalized, tokens: nextTokens };
};

export const normalizeState = (state = {}) => ({
  backgroundImagePath:
    state.backgroundLoaded === true ? String(state.backgroundImagePath || '') : '',
  backgroundLoaded: state.backgroundLoaded === true,
  backgroundLabel: String(state.backgroundLabel || ''),
  fallbackImagePath: String(state.fallbackImagePath || '/assets/livemap/gcpd_live_map_fallback_unavailable.png'),
  tokens: Array.isArray(state.tokens)
    ? state.tokens.map(normalizeToken).filter((token) => token.id && token.label)
    : [],
  updatedAt: Number(state.updatedAt) || 0,
});
