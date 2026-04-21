import { useCallback, useState } from 'react';

import {
  QUEST_SCREEN_CASE_DETAIL,
  QUEST_SCREEN_CASES,
  QUEST_SCREEN_HOME,
  QUEST_SCREEN_POI_DETAIL,
  QUEST_SCREEN_POIS,
  QUEST_SCREEN_VILLAIN_DETAIL,
  QUEST_SCREEN_VILLAINS,
} from '../state/questScreens';

const useQuestNavigation = () => {
  const [screen, setScreen] = useState(QUEST_SCREEN_HOME);
  const [selectedId, setSelectedId] = useState('');

  const goHome = useCallback(() => {
    setScreen(QUEST_SCREEN_HOME);
    setSelectedId('');
  }, []);

  const openCases = useCallback(() => {
    setScreen(QUEST_SCREEN_CASES);
    setSelectedId('');
  }, []);

  const openPois = useCallback(() => {
    setScreen(QUEST_SCREEN_POIS);
    setSelectedId('');
  }, []);

  const openVillains = useCallback(() => {
    setScreen(QUEST_SCREEN_VILLAINS);
    setSelectedId('');
  }, []);

  const openCaseDetail = useCallback((id) => {
    setSelectedId(String(id || ''));
    setScreen(QUEST_SCREEN_CASE_DETAIL);
  }, []);

  const openPoiDetail = useCallback((id) => {
    setSelectedId(String(id || ''));
    setScreen(QUEST_SCREEN_POI_DETAIL);
  }, []);

  const openVillainDetail = useCallback((id) => {
    setSelectedId(String(id || ''));
    setScreen(QUEST_SCREEN_VILLAIN_DETAIL);
  }, []);

  const goBack = useCallback(() => {
    setSelectedId('');
    setScreen((current) => {
      switch (current) {
        case QUEST_SCREEN_CASE_DETAIL:
          return QUEST_SCREEN_CASES;
        case QUEST_SCREEN_POI_DETAIL:
          return QUEST_SCREEN_POIS;
        case QUEST_SCREEN_VILLAIN_DETAIL:
          return QUEST_SCREEN_VILLAINS;
        default:
          return QUEST_SCREEN_HOME;
      }
    });
  }, []);

  return {
    screen,
    selectedId,
    goHome,
    goBack,
    openCases,
    openPois,
    openVillains,
    openCaseDetail,
    openPoiDetail,
    openVillainDetail,
  };
};

export { useQuestNavigation };
