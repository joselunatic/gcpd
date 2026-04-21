import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';

import QuestScene from './QuestScene';
import { xrStore } from './QuestStore';

const QuestCanvas = () => {
  return (
    <div className="quest-canvas-shell">
      <Canvas
        camera={{ position: [0, 1.6, 2.35], fov: 56 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <XR store={xrStore}>
          <QuestScene />
        </XR>
      </Canvas>
    </div>
  );
};

export default QuestCanvas;
