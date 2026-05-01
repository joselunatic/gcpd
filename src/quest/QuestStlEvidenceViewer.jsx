/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const VIEWER_POSITION = [1.48, 1.72, -0.62];
const VIEWER_SCALE = 0.52;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const VIEWER_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
};

const getEvidenceItems = (toolData = {}) => [
  ...(toolData.builtInEvidence || []),
  ...(toolData.evidence || []),
].filter((entry) => entry?.stlPath);

const getActiveEvidence = (session) => {
  const items = getEvidenceItems(session?.toolData);
  const resourceId = session?.selection?.herramientas?.resourceId;
  return items.find((entry) => entry.id === resourceId) || items[0] || null;
};

const getNextEvidenceId = (session) => {
  const items = getEvidenceItems(session?.toolData);
  if (!items.length) return null;

  const currentId = session?.selection?.herramientas?.resourceId || items[0]?.id;
  const currentIndex = Math.max(0, items.findIndex((entry) => entry.id === currentId));
  return items[(currentIndex + 1) % items.length]?.id || items[0]?.id || null;
};

const createViewerLabelTexture = (evidence) => {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#06111a';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#69dfff';
  context.lineWidth = 8;
  context.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);
  context.fillStyle = 'rgba(105, 223, 255, 0.12)';
  context.fillRect(32, 32, canvas.width - 64, 12);
  context.fillRect(32, canvas.height - 46, 260, 6);

  context.textBaseline = 'top';
  context.fillStyle = '#7ee8ff';
  context.font = 'bold 34px monospace';
  context.fillText('VISOR STL // EVIDENCIA', 54, 58);

  context.fillStyle = '#e8f8ff';
  context.font = 'bold 54px monospace';
  context.fillText(String(evidence?.label || evidence?.id || 'SIN PIEZA').toUpperCase(), 54, 118);

  context.fillStyle = '#9ebfd0';
  context.font = '28px monospace';
  const source = evidence?.source === 'builtin' ? 'BUILT-IN' : 'DM / API';
  context.fillText(`${source} · ${evidence?.stlPath || 'sin stlPath'}`, 54, 196);
  context.fillStyle = '#76cfe8';
  context.font = '24px monospace';
  context.fillText('TOCAR SOPORTE O SIG STL PARA CICLAR', 54, 248);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useViewerLabelTexture = (evidence) => {
  const id = evidence?.id || '';
  const label = evidence?.label || '';
  const source = evidence?.source || '';
  const stlPath = evidence?.stlPath || '';
  const texture = useMemo(
    () => createViewerLabelTexture({ id, label, source, stlPath }),
    [id, label, source, stlPath]
  );

  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const usePreparedStlGeometry = (url) => {
  const sourceGeometry = useLoader(STLLoader, url);

  const prepared = useMemo(() => {
    const geometry = sourceGeometry.clone();
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();

    const box = geometry.boundingBox || new THREE.Box3().setFromBufferAttribute(
      geometry.attributes.position
    );
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);
    geometry.translate(-center.x, -center.y, -center.z);

    const maxAxis = Math.max(size.x, size.y, size.z, 0.001);
    const scale = 0.72 / maxAxis;

    return { geometry, scale };
  }, [sourceGeometry]);

  useEffect(() => {
    return () => {
      prepared.geometry.dispose();
    };
  }, [prepared]);

  return prepared;
};

const EvidenceStlMesh = ({ evidence, hovered = false }) => {
  const groupRef = useRef(null);
  const { geometry, scale } = usePreparedStlGeometry(evidence.stlPath);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y += delta * 0.32;
    groupRef.current.rotation.x = Math.sin(performance.now() * 0.0006) * 0.08;
  });

  return (
    <group
      name="GCPD_StlEvidenceMesh"
      ref={groupRef}
      scale={[scale * (hovered ? 1.08 : 1), scale * (hovered ? 1.08 : 1), scale * (hovered ? 1.08 : 1)]}
      rotation={[0.22, -0.36, 0]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#b7e8ff"
          emissive={hovered ? '#146889' : '#0a3347'}
          emissiveIntensity={hovered ? 0.42 : 0.22}
          metalness={0.18}
          roughness={0.34}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry, 18]} />
        <lineBasicMaterial color="#e7fbff" transparent opacity={0.42} />
      </lineSegments>
    </group>
  );
};

const QuestStlEvidenceViewer = ({ session }) => {
  const [hovered, setHovered] = useState(false);
  const activeEvidence = getActiveEvidence(session);
  const labelTexture = useViewerLabelTexture(activeEvidence);
  const isActive =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    session?.selection?.herramientas?.activeTool === 'evidencias' &&
    activeEvidence;

  const cycleEvidence = () => {
    const nextEvidenceId = getNextEvidenceId(session);
    if (!nextEvidenceId) return;
    session.actions.openTool('evidencias', {
      originModule: session.toolContext?.originModule || session.lastPrimaryModule,
      resourceId: nextEvidenceId,
    });
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!import.meta.env.DEV && !window.IWER_DEVICE) return undefined;

    const items = getEvidenceItems(session?.toolData);
    const bridge = {
      version: 1,
      snapshot: {
        active: Boolean(isActive),
        itemCount: items.length,
        resourceId: session?.selection?.herramientas?.resourceId || '',
        activeEvidence: activeEvidence
          ? {
              id: activeEvidence.id,
              label: activeEvidence.label,
              stlPath: activeEvidence.stlPath,
              source: activeEvidence.source || 'api',
            }
          : null,
        items: items.map((entry) => ({
          id: entry.id,
          label: entry.label,
          stlPath: entry.stlPath,
          source: entry.source || 'api',
        })),
      },
      actions: {
        cycleEvidence,
        openEvidence: (id) => {
          if (!id) return;
          session.actions.openTool('evidencias', {
            originModule: session.toolContext?.originModule || session.lastPrimaryModule,
            resourceId: id,
          });
        },
      },
    };

    window.__GCPD_QUEST_STL__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_STL__ === bridge) {
        delete window.__GCPD_QUEST_STL__;
      }
    };
  }, [activeEvidence, isActive, session]);

  if (!isActive) return null;

  return (
    <group name="GCPD_StlEvidenceViewer" position={VIEWER_POSITION} scale={VIEWER_SCALE}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[1.42, 1.12, 0.08]} />
        <meshStandardMaterial
          color="#06111a"
          emissive="#071d28"
          emissiveIntensity={0.28}
          metalness={0.2}
          roughness={0.52}
          transparent
          opacity={0.92}
        />
      </mesh>
      <mesh position={[0, -0.56, 0.04]}>
        <boxGeometry args={[1.36, 0.025, 0.025]} />
        <meshBasicMaterial color={hovered ? '#e6fbff' : '#8feaff'} transparent opacity={0.92} />
      </mesh>
      <mesh position={[0, 0.56, 0.04]}>
        <boxGeometry args={[1.36, 0.018, 0.018]} />
        <meshBasicMaterial color="#3c9fbd" transparent opacity={0.72} />
      </mesh>
      <mesh position={[0, -0.05, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 96]} />
        <meshBasicMaterial color="#74dfff" transparent opacity={0.08} />
      </mesh>
      <mesh position={[0, -0.05, 0.02]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.34, 0.5, 96]} />
        <meshBasicMaterial
          color={hovered ? '#ffffff' : '#baf4ff'}
          transparent
          opacity={hovered ? 0.68 : 0.42}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        position={[0, -0.05, 0.1]}
        onClick={cycleEvidence}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={18}
      >
        <cylinderGeometry args={[0.58, 0.58, 0.12, 96]} />
        <meshBasicMaterial color="#6bdfff" opacity={0.02} {...VIEWER_MATERIAL_PROPS} />
      </mesh>
      <EvidenceStlMesh evidence={activeEvidence} hovered={hovered} />
      <mesh position={[0, -0.86, 0.08]} renderOrder={10}>
        <planeGeometry args={[1.44, 0.45]} />
        <meshBasicMaterial map={labelTexture || null} {...VIEWER_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
};

export { getEvidenceItems };
export default QuestStlEvidenceViewer;
