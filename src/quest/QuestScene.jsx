/* eslint-disable react/no-unknown-property */
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import QuestEnvironment from './QuestEnvironment';
import QuestShell from './QuestShell';

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

const QuestScene = ({ data, navigation, recenterKey }) => {
  const [environmentAnchors, setEnvironmentAnchors] = useState(null);

  return (
    <>
      <QuestCameraRig recenterKey={recenterKey} anchors={environmentAnchors} />

      <color attach="background" args={['#071019']} />
      <fog attach="fog" args={['#071019', 3.2, 10.5]} />

      <ambientLight intensity={0.34} />
      <hemisphereLight
        args={['#84dfff', '#04080c', 0.6]}
        position={[0, 3, 0]}
      />
      <directionalLight position={[2.8, 4.6, 3.2]} intensity={1.05} color="#eaf7ff" />
      <pointLight position={[-2.2, 1.6, 1.4]} intensity={0.45} color="#66d8ff" />
      <pointLight position={[2.1, 1.4, 1.1]} intensity={0.38} color="#4ab8e9" />
      <pointLight position={[1.6, 1.2, 0.1]} intensity={0.18} color="#ff9b54" />

      <QuestEnvironment onAnchorsChange={setEnvironmentAnchors} />

      <QuestShell
        data={data}
        navigation={navigation}
        panelAnchor={environmentAnchors?.panel}
      />
    </>
  );
};

export default QuestScene;
