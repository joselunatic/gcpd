import { createXRStore } from '@react-three/xr';

const xrStore = createXRStore({
  originReferenceSpace: 'local-floor',
  controller: {
    teleportPointer: false,
  },
  hand: false,
  gaze: false,
});

export { xrStore };
