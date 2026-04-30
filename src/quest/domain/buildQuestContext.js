const STOP_WORDS = new Set([
  'activo',
  'activa',
  'actual',
  'archivo',
  'caso',
  'cases',
  'con',
  'data',
  'del',
  'desde',
  'detecta',
  'detectado',
  'detectada',
  'el',
  'ella',
  'este',
  'esta',
  'esto',
  'gcpd',
  'para',
  'por',
  'que',
  'sin',
  'status',
  'the',
  'una',
  'uno',
  'wayne',
]);

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const flattenValue = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flattenValue);
  if (typeof value === 'object') return Object.values(value).flatMap(flattenValue);
  return [String(value)];
};

const collectText = (value) => normalizeText(flattenValue(value).join(' '));

const tokenize = (value) =>
  normalizeText(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length >= 4 && !STOP_WORDS.has(token));

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const getEntityLabel = (entity) =>
  entity?.title || entity?.name || entity?.alias || entity?.id || '';

const getEntityText = (entity) => collectText(entity);

const getStrongTokens = (entity) =>
  unique([
    ...tokenize(entity?.id),
    ...tokenize(entity?.title),
    ...tokenize(entity?.name),
    ...tokenize(entity?.alias),
    ...tokenize(entity?.lastSeen),
  ]);

const scoreRelation = (source, target) => {
  if (!source || !target) return 0;

  const sourceText = getEntityText(source);
  const targetLabel = normalizeText(getEntityLabel(target));
  let score = 0;

  if (targetLabel && sourceText.includes(targetLabel)) score += 12;

  getStrongTokens(target).forEach((token) => {
    if (sourceText.includes(token)) score += 5;
  });

  return score;
};

const rankRelated = (source, targets = [], { minScore = 5 } = {}) =>
  targets
    .map((target, index) => ({
      target,
      score: scoreRelation(source, target),
      index,
    }))
    .filter((entry) => entry.score >= minScore)
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((entry) => entry.target);

const firstOrNull = (values) => values.find(Boolean) || null;

const buildQuestContext = ({
  activeCase,
  selectedCase,
  selectedPoi,
  selectedProfile,
  cases = [],
  pois = [],
  villains = [],
}) => {
  const focusCase = selectedCase || activeCase || cases[0] || null;
  const relatedPoisForCase = rankRelated(focusCase, pois);
  const relatedProfilesForCase = rankRelated(focusCase, villains);
  const relatedCasesForPoi = rankRelated(selectedPoi, cases);
  const relatedProfilesForPoi = rankRelated(selectedPoi, villains);
  const relatedPoisForProfile = rankRelated(selectedProfile, pois);
  const relatedCasesForProfile = rankRelated(selectedProfile, cases);
  const recommendedPoi = firstOrNull([selectedPoi, relatedPoisForCase[0], relatedPoisForProfile[0], pois[0]]);
  const recommendedProfile = firstOrNull([
    selectedProfile,
    relatedProfilesForCase[0],
    relatedProfilesForPoi[0],
    villains[0],
  ]);

  return {
    focusCase,
    recommendedPoi,
    recommendedProfile,
    relatedPoisForCase,
    relatedProfilesForCase,
    relatedCasesForPoi,
    relatedProfilesForPoi,
    relatedPoisForProfile,
    relatedCasesForProfile,
  };
};

export { buildQuestContext, rankRelated };
