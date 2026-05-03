const QUEST_POINTER_FOCUS_KEY = '__GCPD_QUEST_POINTER_FOCUS__';

const setQuestPointerFocus = (group, meta = {}) => {
  if (typeof window === 'undefined' || !group) return;
  window[QUEST_POINTER_FOCUS_KEY] = {
    group,
    meta,
    at: performance.now(),
  };
};

const clearQuestPointerFocus = (group) => {
  if (typeof window === 'undefined') return;
  const current = window[QUEST_POINTER_FOCUS_KEY];
  if (!group || current?.group === group) {
    delete window[QUEST_POINTER_FOCUS_KEY];
  }
};

const getQuestPointerFocus = () => {
  if (typeof window === 'undefined') return null;
  return window[QUEST_POINTER_FOCUS_KEY] || null;
};

export { clearQuestPointerFocus, getQuestPointerFocus, setQuestPointerFocus };
