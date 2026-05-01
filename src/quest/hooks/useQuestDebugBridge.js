import { useEffect } from 'react';

const buildToolCounts = (toolData = {}) => ({
  evidence: (toolData.evidence || []).length,
  builtInEvidence: (toolData.builtInEvidence || []).length,
  ballistics: (toolData.ballistics || []).length,
  ballisticsAssets: (toolData.ballisticsAssets || []).length,
  audio: (toolData.audio || []).length,
  phoneLines: (toolData.phoneLines || []).length,
  tracerLines: (toolData.tracerConfig?.lines || []).length,
  tracerHotspots: (toolData.tracerConfig?.hotspots || []).length,
});

const buildQuestSnapshot = ({ data, session }) => ({
  currentModule: session.currentModule,
  activeCaseId: session.activeCaseId,
  activeCaseTitle: session.activeCase?.title || '',
  selectedCaseId: session.selectedCase?.id || '',
  selectedPoiId: session.selectedPoi?.id || '',
  selectedProfileId: session.selectedProfile?.id || '',
  activeTool: session.selection?.herramientas?.activeTool || '',
  toolResourceId: session.selection?.herramientas?.resourceId || '',
  syncState: session.syncState,
  alertLevel: session.alertLevel,
  data: {
    loading: data.loading,
    error: data.error,
    cases: data.cases.length,
    pois: data.pois.length,
    villains: data.villains.length,
  },
  tools: buildToolCounts(session.toolData),
  phone: {
    mode: session.phoneState?.mode || '',
    activeMode: session.phoneState?.activeMode || '',
    lineStatus: session.phoneState?.lineStatus || '',
    dialedDigits: session.phoneState?.dialedDigits || '',
    lastDialedNumber: session.phoneState?.lastDialedNumber || '',
    tracerWsState: session.phoneState?.tracerWsState || '',
    tracerPhase: session.phoneState?.tracerPhase || '',
    hotspotLabel: session.phoneState?.hotspotLabel || '',
    activeAudioLabel: session.phoneState?.activeAudioLabel || '',
    lastAction: session.phoneState?.lastAction || '',
  },
});

const shouldInstallDebugBridge = () => {
  if (typeof window === 'undefined') return false;
  return Boolean(import.meta.env.DEV || window.IWER_DEVICE);
};

const useQuestDebugBridge = ({ data, session }) => {
  useEffect(() => {
    if (!shouldInstallDebugBridge()) return undefined;

    const bridge = {
      version: 1,
      snapshot: buildQuestSnapshot({ data, session }),
      actions: {
        goToOperacion: () => session.actions.goToOperacion(),
        goToCasos: (caseId) => session.actions.goToCasos({ caseId }),
        goToMapa: (poiId) => session.actions.goToMapa({ poiId }),
        goToPerfiles: (profileId) => session.actions.goToPerfiles({ profileId }),
        openTool: (tool, resourceId = null) =>
          session.actions.openTool(tool, {
            originModule: session.currentModule,
            resourceId,
          }),
        dial: (number, mode) => session.actions.dialPhoneNumber?.(number, mode),
        setPhoneMode: (mode) => session.actions.setPhoneMode?.(mode),
        clearPhoneDial: () => session.actions.clearPhoneDial?.(),
        goBack: () => session.actions.goBack(),
      },
    };

    window.__GCPD_QUEST_DEBUG__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_DEBUG__ === bridge) {
        delete window.__GCPD_QUEST_DEBUG__;
      }
    };
  }, [data, session]);
};

export { useQuestDebugBridge };
