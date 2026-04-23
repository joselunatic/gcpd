/* eslint-disable react/no-unknown-property */
import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { XROrigin } from '@react-three/xr';
import * as THREE from 'three';

import QuestEnvironment from './QuestEnvironment';
import QuestHdriEnvironment from './QuestHdriEnvironment';
import QuestMonitorSurface from './QuestMonitorSurface';

const DEFAULT_CAMERA_POSITION = [0, 3.72, 4.34];
const DEFAULT_CAMERA_TARGET = [0, 3.08, -1.45];
const XR_ORIGIN_OFFSET = [0, 0.4725, 1.25];

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
    .add(new THREE.Vector3(0, 3.77, 1.03))
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
      <XROrigin position={XR_ORIGIN_OFFSET} />
      <QuestCameraRig recenterKey={recenterKey} anchors={environmentAnchors} />
      <QuestHdriEnvironment />

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
      <pointLight position={[0, 2.6, -4.2]} intensity={0.48} distance={7.5} color="#8fcfff" />
      <pointLight position={[-3.6, 2.4, -1.2]} intensity={0.24} distance={6.2} color="#56cfff" />
      <pointLight position={[3.6, 2.4, -1.2]} intensity={0.24} distance={6.2} color="#56cfff" />

      <mesh position={[0, 1.9, -0.8]} renderOrder={-10}>
        <sphereGeometry args={[8.5, 32, 24]} />
        <meshBasicMaterial color="#09131b" side={THREE.BackSide} toneMapped={false} fog={false} />
      </mesh>
      <mesh position={[0, 2.9, -5.1]} renderOrder={-9}>
        <planeGeometry args={[4.8, 2.4]} />
        <meshBasicMaterial color="#1d3442" transparent opacity={0.16} toneMapped={false} />
      </mesh>
      <mesh position={[-4.05, 2.2, -0.9]} rotation={[0, Math.PI / 2.2, 0]} renderOrder={-9}>
        <planeGeometry args={[3.2, 2]} />
        <meshBasicMaterial color="#163646" transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <mesh position={[4.05, 2.2, -0.9]} rotation={[0, -Math.PI / 2.2, 0]} renderOrder={-9}>
        <planeGeometry args={[3.2, 2]} />
        <meshBasicMaterial color="#163646" transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <mesh position={[0, 3.3, -4.8]} renderOrder={-8}>
        <planeGeometry args={[2.6, 0.24]} />
        <meshBasicMaterial color="#9fd9ff" transparent opacity={0.16} toneMapped={false} />
      </mesh>
      <mesh position={[-2.45, 3.05, -4.7]} renderOrder={-8}>
        <planeGeometry args={[0.16, 1.3]} />
        <meshBasicMaterial color="#7fcfff" transparent opacity={0.12} toneMapped={false} />
      </mesh>
      <mesh position={[2.45, 3.05, -4.7]} renderOrder={-8}>
        <planeGeometry args={[0.16, 1.3]} />
        <meshBasicMaterial color="#7fcfff" transparent opacity={0.12} toneMapped={false} />
      </mesh>

      <mesh position={[0, 2.1, -3.9]} receiveShadow>
        <planeGeometry args={[10.5, 5.2]} />
        <meshStandardMaterial color="#101c28" roughness={0.9} metalness={0.08} />
      </mesh>
      <mesh position={[0, 2.1, 3.9]} rotation={[0, Math.PI, 0]}>
        <planeGeometry args={[10.5, 5.2]} />
        <meshStandardMaterial color="#0b151e" roughness={0.94} metalness={0.03} />
      </mesh>
      <mesh position={[-4.4, 2.0, -0.4]} rotation={[0, Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0d1822" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[4.4, 2.0, -0.4]} rotation={[0, -Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0d1822" roughness={0.94} metalness={0.04} />
      </mesh>
      <mesh position={[-4.4, 2.0, -0.4]} rotation={[0, -Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0a131b" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[4.4, 2.0, -0.4]} rotation={[0, Math.PI / 2.7, 0]}>
        <planeGeometry args={[8.6, 5.0]} />
        <meshStandardMaterial color="#0a131b" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[0, 4.45, -1.0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[10.5, 8.6]} />
        <meshStandardMaterial color="#0b141c" roughness={0.98} metalness={0.02} />
      </mesh>
      <mesh position={[0, 0.02, -0.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10.5, 8.6]} />
        <meshStandardMaterial color="#111b24" roughness={0.96} metalness={0.05} />
      </mesh>

      <QuestEnvironment
        onAnchorsChange={setEnvironmentAnchors}
        onPhoneKeyPress={session.actions.pressPhoneKey}
        onPhoneHandsetToggle={session.actions.togglePhoneHandset}
        onPhoneFocusEnter={session.actions.enterPhoneFocus}
        onPhoneFocusExit={session.actions.exitPhoneFocus}
        onPhoneModeSelect={session.actions.setPhoneMode}
        phoneState={session.phoneState}
      />

      <QuestMonitorSurface
        data={data}
        session={session}
        panelAnchor={environmentAnchors?.panel}
      />
    </>
  );
};

export default QuestScene;
