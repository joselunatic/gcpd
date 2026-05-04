/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const WORKBENCH_POSITION = [0, 1.96, -0.62];
const WORKBENCH_SCALE = 0.7;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const PANEL_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
};

const normalizeCaseCode = (value = '') =>
  String(value).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);

const resolveBallisticImage = (entry = {}) =>
  entry.pngPath || (entry.assetId ? `/assets/ballistics/${entry.assetId}.png` : '');

const buildDataset = (models = []) =>
  models
    .map((entry, index) => ({
      ...entry,
      id: entry.id || entry.bulletId || entry.assetId || `ballistic-${index}`,
      label: entry.label || 'SIN LABEL',
      caseCode: normalizeCaseCode(entry.caseCode || entry.id || entry.label),
      image: resolveBallisticImage(entry),
      bulletId: entry.bulletId || `BULLET-${String(index + 1).padStart(2, '0')}`,
      caseId: entry.caseId || entry.caseNumber || '',
      crime: entry.crime || '',
      location: entry.location || entry.poiId || '',
      status: entry.status || '',
      caliber: entry.caliber || '',
      material: entry.material || '',
      closedBy: entry.closedBy || '',
    }))
    .filter((entry) => entry.caseCode.length === 3 && entry.image);

const createBallisticsLabelTexture = ({
  title,
  subtitle = '',
  status = '',
  accent = false,
  width = 1024,
  height = 256,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = accent ? '#102c3a' : '#06111a';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = accent ? '#d8f8ff' : '#62d9ff';
  context.lineWidth = 7;
  context.strokeRect(16, 16, width - 32, height - 32);
  context.fillStyle = accent ? 'rgba(216, 248, 255, 0.16)' : 'rgba(98, 217, 255, 0.1)';
  context.fillRect(32, 32, width - 64, 10);

  context.textBaseline = 'top';
  context.fillStyle = '#78e4ff';
  context.font = 'bold 30px monospace';
  context.fillText(String(title || '').toUpperCase(), 46, 54);

  context.fillStyle = '#eefaff';
  context.font = 'bold 42px monospace';
  context.fillText(String(subtitle || '').toUpperCase(), 46, 106);

  if (status) {
    context.fillStyle = '#9fc4d4';
    context.font = '24px monospace';
    context.fillText(String(status).toUpperCase().slice(0, 58), 46, 176);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useBallisticsLabelTexture = (config) => {
  const { title = '', subtitle = '', status = '', accent = false, width = 1024, height = 256 } = config;
  const texture = useMemo(
    () => createBallisticsLabelTexture({ title, subtitle, status, accent, width, height }),
    [accent, height, status, subtitle, title, width]
  );

  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const EvidencePlate = ({ entry, side, position, onClick }) => {
  const texture = useLoader(THREE.TextureLoader, entry.image);
  const code = entry.caseCode;
  const codeFragment = side === 'left' ? code.slice(0, 1) : code.slice(1);
  const labelTexture = useBallisticsLabelTexture({
    title: side === 'left' ? 'MUESTRA A' : 'MUESTRA B',
    subtitle: `${codeFragment} // ${entry.label}`,
    status: `${entry.caliber || 'CAL'} · ${entry.material || 'MAT'}`,
    accent: false,
    width: 900,
    height: 220,
  });

  return (
    <group name={`GCPD_Ballistics_${side}_Plate`} position={position}>
      <mesh position={[0, 0.2, -0.04]}>
        <boxGeometry args={[1.0, 0.84, 0.06]} />
        <meshStandardMaterial
          color="#06111a"
          emissive="#092231"
          emissiveIntensity={0.24}
          metalness={0.18}
          roughness={0.48}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh
        position={[0, 0.29, 0.02]}
        onClick={onClick}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={44}
      >
        <planeGeometry args={[0.82, 0.52]} />
        <meshBasicMaterial map={texture} transparent toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.13, 0.03]}>
        <planeGeometry args={[0.94, 0.23]} />
        <meshBasicMaterial map={labelTexture || null} {...PANEL_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
};

const WorkbenchButton = ({ label, position, onClick, accent = false }) => {
  const texture = useBallisticsLabelTexture({
    title: label,
    subtitle: '',
    status: '',
    accent,
    width: 560,
    height: 150,
  });

  return (
    <mesh
      name={`GCPD_Ballistics_Button_${label}`}
      position={position}
      onClick={onClick}
      pointerEventsType={XR_RAY_POINTER_EVENTS}
      pointerEventsOrder={46}
    >
      <planeGeometry args={[0.38, 0.14]} />
      <meshBasicMaterial map={texture || null} {...PANEL_MATERIAL_PROPS} />
    </mesh>
  );
};

const QuestBallisticsWorkbench = ({ session }) => {
  const dataset = useMemo(
    () => buildDataset(session?.toolData?.ballistics || []),
    [session?.toolData?.ballistics]
  );
  const [leftIndex, setLeftIndex] = useState(0);
  const [rightIndex, setRightIndex] = useState(1);
  const [result, setResult] = useState('LISTO. CODIGO A + CODIGO B.');

  useEffect(() => {
    setLeftIndex(0);
    setRightIndex(dataset.length > 1 ? 1 : 0);
    setResult(dataset.length ? 'LISTO. CODIGO A + CODIGO B.' : 'SIN DATASET BALISTICO.');
  }, [dataset.length]);

  const isActive =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    session?.selection?.herramientas?.activeTool === 'balistica' &&
    dataset.length > 0;

  const left = dataset[leftIndex % dataset.length];
  const right = dataset[rightIndex % dataset.length];
  const match = Boolean(left?.caseCode && right?.caseCode && left.caseCode === right.caseCode);
  const resultTexture = useBallisticsLabelTexture({
    title: match && result.startsWith('MATCH') ? 'MATCH EXITOSO' : 'BALLISTICA XR',
    subtitle: result,
    status: match && left
      ? `${left.caseId || 'SIN CASO'} · ${left.crime || 'SIN CRIMEN'} · ${left.status || 'SIN ESTADO'}`
      : 'A selecciona primera letra · B selecciona dos ultimas letras',
    accent: match,
    width: 1400,
    height: 260,
  });

  const cycleLeft = () => {
    if (!dataset.length) return;
    setLeftIndex((current) => (current + 1) % dataset.length);
    setResult('MUESTRA A ACTUALIZADA.');
  };

  const cycleRight = () => {
    if (!dataset.length) return;
    setRightIndex((current) => (current + 1) % dataset.length);
    setResult('MUESTRA B ACTUALIZADA.');
  };

  const compare = () => {
    if (!left || !right) {
      setResult('CODIGOS INCOMPLETOS.');
      return;
    }

    if (left.caseCode === right.caseCode) {
      setResult(`MATCH ${left.caseCode} | ${left.caseId || 'SIN CASO'} | ${left.crime || 'SIN CRIMEN'}`);
      return;
    }

    setResult(`NO MATCH | ${left.caseCode.slice(0, 1)} + ${right.caseCode.slice(1)}`);
  };

  const forceMatch = () => {
    if (!left) return;
    setRightIndex(leftIndex);
    setResult(`B AJUSTADA A ${left.caseCode.slice(1)}.`);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!import.meta.env.DEV && !window.IWER_DEVICE) return undefined;

    const bridge = {
      version: 1,
      snapshot: {
        active: isActive,
        datasetCount: dataset.length,
        leftIndex,
        rightIndex,
        left: left
          ? {
              id: left.id,
              caseCode: left.caseCode,
              image: left.image,
              caseId: left.caseId,
              crime: left.crime,
              status: left.status,
            }
          : null,
        right: right
          ? {
              id: right.id,
              caseCode: right.caseCode,
              image: right.image,
              caseId: right.caseId,
              crime: right.crime,
              status: right.status,
            }
          : null,
        match,
        result,
      },
      actions: {
        cycleLeft,
        cycleRight,
        compare,
        forceMatch,
        setPair: (nextLeftIndex, nextRightIndex) => {
          if (!dataset.length) return;
          setLeftIndex(Math.max(0, Number(nextLeftIndex) || 0) % dataset.length);
          setRightIndex(Math.max(0, Number(nextRightIndex) || 0) % dataset.length);
          setResult('MUESTRAS AJUSTADAS.');
        },
      },
    };

    window.__GCPD_QUEST_BALLISTICS__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_BALLISTICS__ === bridge) {
        delete window.__GCPD_QUEST_BALLISTICS__;
      }
    };
  }, [dataset.length, isActive, left, leftIndex, match, result, right, rightIndex]);

  if (!isActive) return null;

  return (
    <group name="GCPD_BallisticsWorkbench" position={WORKBENCH_POSITION} scale={WORKBENCH_SCALE}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[2.18, 1.42, 0.08]} />
        <meshStandardMaterial
          color="#07131d"
          emissive="#071d28"
          emissiveIntensity={0.22}
          metalness={0.2}
          roughness={0.52}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh position={[0, 0.72, 0.02]}>
        <boxGeometry args={[2.08, 0.025, 0.025]} />
        <meshBasicMaterial color="#8feaff" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -0.72, 0.02]}>
        <boxGeometry args={[2.08, 0.02, 0.02]} />
        <meshBasicMaterial color="#3d9dbc" transparent opacity={0.78} />
      </mesh>

      <EvidencePlate entry={left} side="left" position={[-0.52, 0.08, 0.04]} onClick={cycleLeft} />
      <EvidencePlate entry={right} side="right" position={[0.52, 0.08, 0.04]} onClick={cycleRight} />

      <mesh position={[0, -0.54, 0.05]}>
        <planeGeometry args={[1.92, 0.25]} />
        <meshBasicMaterial map={resultTexture || null} {...PANEL_MATERIAL_PROPS} />
      </mesh>

      <WorkbenchButton label="A+" position={[-0.78, -0.82, 0.06]} onClick={cycleLeft} />
      <WorkbenchButton label="B+" position={[-0.28, -0.82, 0.06]} onClick={cycleRight} />
      <WorkbenchButton label="MATCH" position={[0.28, -0.82, 0.06]} onClick={compare} accent />
      <WorkbenchButton label="AUTO B" position={[0.78, -0.82, 0.06]} onClick={forceMatch} />
    </group>
  );
};

export default QuestBallisticsWorkbench;
