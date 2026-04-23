import { createXRStore } from '@react-three/xr';

const rayPointer = {
  minDistance: 0.01,
  maxDistance: 12,
  rayModel: {
    color: '#9ee7ff',
    maxLength: 12,
    opacity: 0.85,
    renderOrder: 80,
    size: 0.018,
  },
  cursorModel: {
    color: '#d9f8ff',
    opacity: 0.95,
    renderOrder: 81,
  },
};

const xrStore = createXRStore({
  originReferenceSpace: 'local-floor',
  controller: {
    grabPointer: false,
    rayPointer,
    teleportPointer: false,
  },
  hand: {
    rayPointer,
    touchPointer: false,
    grabPointer: false,
    teleportPointer: false,
  },
  gaze: false,
});

export { xrStore };
