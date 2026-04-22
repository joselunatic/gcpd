import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';

import QuestScene from './QuestScene';
import { xrStore } from './QuestStore';

const QuestCanvas = ({ data, navigation, recenterKey }) => {
  return (
    <div className="quest-canvas-shell">
      <Canvas
        camera={{ position: [0, 1.52, 3.15], fov: 50 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: true }}
      >
        <XR store={xrStore}>
          <QuestScene
            data={data}
            navigation={navigation}
            recenterKey={recenterKey}
          />
        </XR>
      </Canvas>
    </div>
  );
};

export default QuestCanvas;
