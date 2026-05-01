import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

import {
  QUEST_MODULE_CASOS,
  QUEST_MODULE_HERRAMIENTAS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_PERFILES,
} from '../state/questModules';

const PRIMARY_MODULES = [
  QUEST_MODULE_OPERACION,
  QUEST_MODULE_CASOS,
  QUEST_MODULE_MAPA,
  QUEST_MODULE_PERFILES,
  QUEST_MODULE_HERRAMIENTAS,
];

const TOOL_ORDER = [
  'evidencias',
  'audio',
  'balistica',
  'comunicaciones',
  'rastreo',
];

const AXIS_THRESHOLD = 0.68;
const NAV_REPEAT_MS = 320;

const selectAtOffset = ({ items, currentId, offset, onSelect }) => {
  const validItems = items.filter(Boolean);
  if (!validItems.length) return '';

  const currentIndex = Math.max(0, validItems.findIndex((entry) => entry.id === currentId));
  const nextIndex = (currentIndex + offset + validItems.length) % validItems.length;
  const nextId = validItems[nextIndex]?.id || '';
  if (nextId) onSelect(nextId);
  return nextId;
};

const getGamepad = (session, handedness = 'right') => {
  const sources = Array.from(session?.inputSources || []);
  const xrGamepad =
    sources.find((source) => source.handedness === handedness && source.gamepad)?.gamepad || null;
  if (xrGamepad) return xrGamepad;

  const gamepads =
    typeof navigator !== 'undefined' && typeof navigator.getGamepads === 'function'
      ? Array.from(navigator.getGamepads()).filter(Boolean)
      : [];
  const handednessPattern = handedness === 'right' ? /right/i : /left/i;
  return gamepads.find((gamepad) => handednessPattern.test(gamepad.id || '')) || null;
};

const useQuestControllerNavigation = ({ data, session }) => {
  const { gl } = useThree();
  const lastMoveAtRef = useRef(0);
  const lastActionRef = useRef(null);
  const didReportInputRef = useRef(false);

  const navigateModule = (offset) => {
    const currentIndex = Math.max(0, PRIMARY_MODULES.indexOf(session.currentModule));
    const nextModule = PRIMARY_MODULES[
      (currentIndex + offset + PRIMARY_MODULES.length) % PRIMARY_MODULES.length
    ];

    if (nextModule === QUEST_MODULE_OPERACION) session.actions.goToOperacion();
    if (nextModule === QUEST_MODULE_CASOS) session.actions.goToCasos();
    if (nextModule === QUEST_MODULE_MAPA) session.actions.goToMapa();
    if (nextModule === QUEST_MODULE_PERFILES) session.actions.goToPerfiles();
    if (nextModule === QUEST_MODULE_HERRAMIENTAS) session.actions.goToHerramientas();

    return nextModule;
  };

  const navigateSelection = (offset) => {
    if (session.currentModule === QUEST_MODULE_CASOS) {
      return selectAtOffset({
        items: data.cases,
        currentId: session.selectedCase?.id,
        offset,
        onSelect: session.actions.selectCase,
      });
    }

    if (session.currentModule === QUEST_MODULE_MAPA) {
      return selectAtOffset({
        items: data.pois,
        currentId: session.selectedPoi?.id,
        offset,
        onSelect: session.actions.selectPoi,
      });
    }

    if (session.currentModule === QUEST_MODULE_PERFILES) {
      return selectAtOffset({
        items: data.villains,
        currentId: session.selectedProfile?.id,
        offset,
        onSelect: session.actions.selectProfile,
      });
    }

    if (session.currentModule === QUEST_MODULE_HERRAMIENTAS) {
      return selectAtOffset({
        items: TOOL_ORDER.map((id) => ({ id })),
        currentId: session.selection?.herramientas?.activeTool || 'evidencias',
        offset,
        onSelect: (tool) =>
          session.actions.openTool(tool, {
            originModule: session.toolContext?.originModule || session.lastPrimaryModule,
            resourceId: null,
          }),
      });
    }

    return '';
  };

  useFrame(() => {
    const xrSession = gl.xr.getSession?.();
    if (!xrSession || session.phoneState?.focusMode) return;
    const gamepad = getGamepad(xrSession, 'right') || getGamepad(xrSession, 'left');
    if (import.meta.env.DEV && !didReportInputRef.current) {
      didReportInputRef.current = true;
      console.info(
        `[QuestControllerNav] inputSources ${Array.from(xrSession?.inputSources || []).length} gamepad ${Boolean(gamepad)}`
      );
    }
    if (!gamepad?.axes?.length) return;

    const now = performance.now();
    if (now - lastMoveAtRef.current < NAV_REPEAT_MS) return;

    const x = Number(gamepad.axes[0] || 0);
    const y = Number(gamepad.axes[1] || 0);
    let action = null;

    if (Math.abs(x) >= AXIS_THRESHOLD && Math.abs(x) >= Math.abs(y)) {
      const direction = x > 0 ? 1 : -1;
      action = {
        type: 'module',
        direction,
        value: navigateModule(direction),
      };
    } else if (Math.abs(y) >= AXIS_THRESHOLD) {
      const direction = y > 0 ? 1 : -1;
      action = {
        type: 'selection',
        direction,
        value: navigateSelection(direction),
      };
    }

    if (!action) return;
    lastMoveAtRef.current = now;
    lastActionRef.current = {
      ...action,
      at: new Date().toISOString(),
    };
    if (import.meta.env.DEV) {
      console.info(
        `[QuestControllerNav] ${action.type} ${action.direction > 0 ? 'next' : 'prev'} ${action.value}`
      );
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!import.meta.env.DEV && !window.IWER_DEVICE) return undefined;

    const bridge = {
      version: 1,
      snapshot: {
        enabled: true,
        axisThreshold: AXIS_THRESHOLD,
        repeatMs: NAV_REPEAT_MS,
        lastAction: lastActionRef.current,
      },
      actions: {
        nextModule: () => navigateModule(1),
        previousModule: () => navigateModule(-1),
        nextSelection: () => navigateSelection(1),
        previousSelection: () => navigateSelection(-1),
      },
    };

    window.__GCPD_QUEST_CONTROLLER_NAV__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_CONTROLLER_NAV__ === bridge) {
        delete window.__GCPD_QUEST_CONTROLLER_NAV__;
      }
    };
  });
};

export { useQuestControllerNavigation };
