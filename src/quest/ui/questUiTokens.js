import * as THREE from 'three';

const QUEST_UI_COLORS = {
  bg: '#061019',
  panel: '#071723',
  panelSoft: '#0a1d2b',
  panelActive: '#0b2a45',
  border: '#1b79c9',
  borderSoft: '#1d5574',
  cyan: '#7de6ff',
  cyanBright: '#bcefff',
  text: '#d9f4ff',
  muted: '#7fa6bd',
  dim: '#45697d',
  blue: '#1769ff',
  green: '#26e28a',
  red: '#ff4a4a',
  amber: '#ffbc42',
};

const QUEST_UI_LAYOUT = {
  width: 3.42,
  height: 1.78,
  rail: {
    x: -1.32,
    y: 0.04,
    width: 0.58,
    height: 1.34,
    buttonWidth: 0.48,
    buttonHeight: 0.2,
    gap: 0.055,
  },
  central: {
    x: -0.24,
    y: 0.05,
    width: 1.54,
    height: 1.34,
  },
  right: {
    x: 1.24,
    y: 0.12,
    width: 0.72,
    height: 1.08,
  },
  status: {
    x: 0.17,
    y: -0.62,
    width: 2.48,
    height: 0.25,
  },
  z: {
    base: -0.12,
    halo: -0.08,
    panel: -0.04,
    card: 0.018,
    text: 0.034,
    interactive: 0.05,
    floating: 0.13,
  },
  depth: {
    rail: 0.14,
    central: 0.04,
    right: 0.16,
    status: 0.2,
  },
  rotation: {
    rail: [0, -0.18, 0],
    central: [0, 0, 0],
    right: [0, 0.18, 0],
    status: [0.04, 0, 0],
  },
};

const QUEST_UI_MATERIAL_PROPS = {
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  toneMapped: false,
};

const QUEST_PANEL_MATERIAL_PROPS = {
  transparent: true,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
};

const QUEST_RAY_POINTER_EVENTS = { allow: 'ray' };

export {
  QUEST_PANEL_MATERIAL_PROPS,
  QUEST_RAY_POINTER_EVENTS,
  QUEST_UI_COLORS,
  QUEST_UI_LAYOUT,
  QUEST_UI_MATERIAL_PROPS,
};
