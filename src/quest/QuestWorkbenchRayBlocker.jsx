/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';

import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const BLOCKER_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
};

const stopRay = (event) => {
  event.stopPropagation();
};

const SHIELDS = [
  { name: 'Top', position: [0, 0.76, 0], size: [3.5, 0.4] },
  { name: 'Bottom', position: [0, -0.76, 0], size: [3.5, 0.4] },
  { name: 'Left', position: [-1.35, 0, 0], size: [0.7, 1.2] },
  { name: 'Right', position: [1.35, 0, 0], size: [0.7, 1.2] },
];

const QuestWorkbenchRayBlocker = ({ session }) => {
  const activeTool = session?.selection?.herramientas?.activeTool;
  const active =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    Boolean(activeTool);

  if (!active) return null;

  return (
    <group name="GCPD_WorkbenchRayBlocker" position={[0, 1.82, -0.52]}>
      {SHIELDS.map((shield) => (
        <mesh
          key={shield.name}
          name={`GCPD_WorkbenchRayBlocker_${shield.name}`}
          position={shield.position}
          onClick={stopRay}
          onPointerDown={stopRay}
          onPointerUp={stopRay}
          pointerEventsType={XR_RAY_POINTER_EVENTS}
          pointerEventsOrder={39}
          renderOrder={90}
        >
          <planeGeometry args={shield.size} />
          <meshBasicMaterial color="#000000" opacity={0.001} {...BLOCKER_MATERIAL_PROPS} />
        </mesh>
      ))}
    </group>
  );
};

export default QuestWorkbenchRayBlocker;
