/* eslint-disable react/no-unknown-property */
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import QuestEnvironment from './QuestEnvironment';
import QuestMonitorSurface from './QuestMonitorSurface';

const DEFAULT_CAMERA_POSITION = [0, 1.52, 3.15];
const DEFAULT_CAMERA_TARGET = [0, 1.18, -1.45];

const getCameraPose = (anchors) => {
  if (!anchors?.panel?.position || !anchors?.panel?.quaternion || !anchors?.viewerPosition) {
    return {
      position: DEFAULT_CAMERA_POSITION,
      target: DEFAULT_CAMERA_TARGET,
    };
  }

  const viewerPosition = new THREE.Vector3().fromArray(anchors.viewerPosition);
  const panelPosition = new THREE.Vector3().fromArray(anchors.panel.position);
  const panelQuaternion = new THREE.Quaternion().fromArray(anchors.panel.quaternion);
  const panelNormal = new THREE.Vector3(0, 1, 0).applyQuaternion(panelQuaternion);

  const position = viewerPosition
    .clone()
    .add(new THREE.Vector3(0, 1.58, 0))
    .add(panelNormal.multiplyScalar(0.08));

  return {
    position: position.toArray(),
    target: panelPosition.toArray(),
  };
};

const QuestCameraRig = ({ recenterKey, anchors }) => {
  const { camera, gl } = useThree();

  useEffect(() => {
    if (gl.xr?.isPresenting) return;

    const pose = getCameraPose(anchors);
    camera.position.fromArray(pose.position);
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }, [anchors, camera, gl, recenterKey]);

  return null;
};

const QuestScene = ({ data, session, recenterKey }) => {
  const [environmentAnchors, setEnvironmentAnchors] = useState(null);

  return (
    <>
      <QuestCameraRig recenterKey={recenterKey} anchors={environmentAnchors} />

      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 3.2, 10.5]} />

      <ambientLight intensity={0.52} />
      <hemisphereLight
        args={['#9ee8ff', '#091019', 0.9]}
        position={[0, 3, 0]}
      />
      <directionalLight position={[2.8, 4.6, 3.2]} intensity={1.4} color="#f3fbff" />
      <pointLight position={[-2.2, 1.6, 1.4]} intensity={0.72} color="#8fe9ff" />
      <pointLight position={[2.1, 1.4, 1.1]} intensity={0.62} color="#63d7ff" />
      <pointLight position={[1.6, 1.2, 0.1]} intensity={0.24} color="#ff9b54" />
      <pointLight position={[0, 1.9, 0.65]} intensity={1.35} distance={5.5} color="#d9f7ff" />

      <mesh position={[0, 2.1, -3.9]} receiveShadow>
        <planeGeometry args={[10.5, 5.2]} />
        <meshStandardMaterial color="#101c28" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[-4.4, 2.0, -0.4]} rotation={[0, Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0d1822" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[4.4, 2.0, -0.4]} rotation={[0, -Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0d1822" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[0, 4.45, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.5, 8.6]} />
        <meshStandardMaterial color="#0b141c" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.02, -0.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10.5, 8.6]} />
        <meshStandardMaterial color="#111b24" roughness={0.96} metalness={0.05} />
      </mesh>

      <QuestEnvironment onAnchorsChange={setEnvironmentAnchors} />

      <QuestMonitorSurface
        data={data}
        session={session}
        panelAnchor={environmentAnchors?.panel}
      />
    </>
  );
};

export default QuestScene;
