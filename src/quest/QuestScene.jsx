/* eslint-disable react/no-unknown-property */
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { IfInSessionMode } from '@react-three/xr';

import QuestShell from './QuestShell';

const QuestCameraRig = ({ recenterKey }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (gl.xr?.isPresenting) return;
    camera.position.set(0, 1.52, 3.15);
    camera.lookAt(0, 1.18, -1.45);
    camera.updateProjectionMatrix();
  }, [camera, gl, recenterKey]);

  return null;
};

const QuestScene = ({ data, navigation, recenterKey }) => {
  return (
    <>
      <QuestCameraRig recenterKey={recenterKey} />

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
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
          <circleGeometry args={[10, 64]} />
          <meshBasicMaterial color="#08131a" />
        </mesh>
      </IfInSessionMode>

      <IfInSessionMode allow="immersive-vr">
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <circleGeometry args={[7, 48]} />
          <meshStandardMaterial color="#0c1a1e" />
        </mesh>
      </IfInSessionMode>

      <QuestShell data={data} navigation={navigation} />
    </>
  );
};

export default QuestScene;
