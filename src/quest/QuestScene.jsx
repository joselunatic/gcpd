/* eslint-disable react/no-unknown-property */
import { IfInSessionMode } from '@react-three/xr';

import QuestShell from './QuestShell';

const QuestScene = () => {
  return (
    <>
      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 4, 14]} />

      <ambientLight intensity={0.9} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />
      <pointLight position={[-3, 2, 3]} intensity={0.6} color="#7ad5ff" />

      <IfInSessionMode deny="immersive-vr">
        <mesh position={[0, 1.2, -3.2]}>
          <planeGeometry args={[12, 8]} />
          <meshBasicMaterial color="#102433" />
        </mesh>
      </IfInSessionMode>

      <IfInSessionMode allow="immersive-vr">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[7, 48]} />
          <meshStandardMaterial color="#0c1a1e" />
        </mesh>
      </IfInSessionMode>

      <QuestShell />
    </>
  );
};

export default QuestScene;
