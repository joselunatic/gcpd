import { Suspense } from 'react';

import { Canvas } from '@react-three/fiber';
import { XR } from '@react-three/xr';

import QuestScene from './QuestScene';
import { xrStore } from './QuestStore';

const QuestCanvas = ({ data, session, recenterKey }) => {
  return (
    <div className="quest-canvas-shell">
      <Canvas
        camera={{ position: [0, 1.52, 3.15], fov: 46 }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, alpha: false }}
      >
        <XR store={xrStore}>
          <Suspense fallback={null}>
            <QuestScene
              data={data}
              session={session}
              recenterKey={recenterKey}
            />
          </Suspense>
        </XR>
      </Canvas>
    </div>
  );
};

export default QuestCanvas;
