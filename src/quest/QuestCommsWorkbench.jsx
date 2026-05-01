/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

import { PHONE_MODE_CALL, PHONE_MODE_TRACER } from './hooks/useQuestSession';
import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const WORKBENCH_POSITION = [1.48, 1.72, -0.62];
const WORKBENCH_SCALE = 0.54;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const PANEL_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
};

const normalizeDigits = (value = '') => String(value).replace(/\D/g, '');

const getCommsLines = (session, activeTool) => {
  const toolData = session?.toolData || {};
  const phoneLines = toolData.phoneLines || [];
  const tracerLines = toolData.tracerConfig?.lines || [];

  if (activeTool === 'rastreo' && tracerLines.length) {
    return tracerLines.map((line) => ({
      ...line,
      number: line.number || line.normalizedNumber || line.normalized || '',
      label: line.label || line.id || line.number || 'TRAZA',
      mode: PHONE_MODE_TRACER,
      source: 'tracer',
    }));
  }

  return phoneLines.map((line) => ({
    ...line,
    number: line.number || line.normalizedNumber || '',
    label: line.label || line.number || 'LINEA',
    mode: activeTool === 'rastreo' ? PHONE_MODE_TRACER : PHONE_MODE_CALL,
    source: 'phone',
  }));
};

const createCommsTexture = ({
  title = '',
  subtitle = '',
  body = '',
  accent = false,
  width = 1200,
  height = 320,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = accent ? '#102f3d' : '#06111a';
  context.fillRect(0, 0, width, height);
  context.strokeStyle = accent ? '#dbf9ff' : '#66dcff';
  context.lineWidth = 8;
  context.strokeRect(18, 18, width - 36, height - 36);
  context.fillStyle = accent ? 'rgba(219, 249, 255, 0.16)' : 'rgba(102, 220, 255, 0.1)';
  context.fillRect(34, 34, width - 68, 12);
  context.fillRect(34, height - 48, 260, 6);

  context.textBaseline = 'top';
  context.fillStyle = '#7ee8ff';
  context.font = 'bold 34px monospace';
  context.fillText(String(title).toUpperCase(), 54, 58);

  context.fillStyle = '#eefaff';
  context.font = 'bold 50px monospace';
  context.fillText(String(subtitle).toUpperCase().slice(0, 34), 54, 122);

  context.fillStyle = '#9fc4d4';
  context.font = '27px monospace';
  context.fillText(String(body).toUpperCase().slice(0, 66), 54, 208);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useCommsTexture = (config) => {
  const {
    title = '',
    subtitle = '',
    body = '',
    accent = false,
    width = 1200,
    height = 320,
  } = config;
  const texture = useMemo(
    () => createCommsTexture({ title, subtitle, body, accent, width, height }),
    [accent, body, height, subtitle, title, width]
  );

  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const CommsButton = ({ label, position, onClick, accent = false }) => {
  const texture = useCommsTexture({
    title: label,
    accent,
    width: 620,
    height: 160,
  });

  return (
    <mesh
      name={`GCPD_Comms_Button_${label}`}
      position={position}
      onClick={onClick}
      pointerEventsType={XR_RAY_POINTER_EVENTS}
      pointerEventsOrder={24}
    >
      <planeGeometry args={[0.42, 0.14]} />
      <meshBasicMaterial map={texture || null} {...PANEL_MATERIAL_PROPS} />
    </mesh>
  );
};

const QuestCommsWorkbench = ({ session }) => {
  const activeTool = session?.selection?.herramientas?.activeTool;
  const lines = useMemo(() => getCommsLines(session, activeTool), [activeTool, session]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [activeTool, lines.length]);

  const isActive =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    (activeTool === 'comunicaciones' || activeTool === 'rastreo');

  const selectedLine = lines[selectedIndex % Math.max(lines.length, 1)] || null;
  const selectedNumber = normalizeDigits(selectedLine?.number);
  const mode = activeTool === 'rastreo' ? PHONE_MODE_TRACER : PHONE_MODE_CALL;
  const hasActiveLine = Boolean(session?.phoneState?.activeMode);
  const isConsumed = selectedLine?.rellamable === false && selectedLine?.llamado;
  const primaryTexture = useCommsTexture({
    title: activeTool === 'rastreo' ? 'TRACER XR' : 'DIAL XR',
    subtitle: selectedLine
      ? `${selectedLine.label || selectedNumber} // ${selectedNumber || 'SIN NUMERO'}`
      : 'SIN LINEAS',
    body: selectedLine
      ? [
          selectedLine.source === 'tracer' ? 'traza configurada' : `audio ${selectedLine.audioId || 'sin audio'}`,
          isConsumed ? 'ya consumida' : 'disponible',
          `ws ${session?.phoneState?.tracerWsState || 'offline'}`,
        ].join(' · ')
      : 'Configura phone-lines/tracer-config desde DM.',
    accent: hasActiveLine,
    width: 1400,
    height: 330,
  });
  const statusTexture = useCommsTexture({
    title: 'ESTADO LINEA',
    subtitle: session?.phoneState?.lineStatus || 'reposo',
    body: [
      session?.phoneState?.lastDialedNumber || session?.phoneState?.dialedDigits || 'sin marcacion',
      session?.phoneState?.activeAudioLabel || session?.phoneState?.hotspotLabel || session?.phoneState?.lastAction,
    ].filter(Boolean).join(' · '),
    accent: false,
    width: 1400,
    height: 290,
  });

  if (!isActive) return null;

  const cycleLine = () => {
    if (!lines.length) return;
    setSelectedIndex((current) => (current + 1) % lines.length);
  };

  const dialSelected = () => {
    if (!selectedNumber) return;
    session.actions.dialPhoneNumber?.(selectedNumber, mode);
  };

  const traceSelected = () => {
    if (!selectedNumber) return;
    session.actions.dialPhoneNumber?.(selectedNumber, PHONE_MODE_TRACER);
  };

  return (
    <group name="GCPD_CommsWorkbench" position={WORKBENCH_POSITION} scale={WORKBENCH_SCALE}>
      <mesh position={[0, 0, -0.08]}>
        <boxGeometry args={[2.12, 1.42, 0.08]} />
        <meshStandardMaterial
          color="#07131d"
          emissive="#071d28"
          emissiveIntensity={0.24}
          metalness={0.2}
          roughness={0.52}
          transparent
          opacity={0.94}
        />
      </mesh>
      <mesh position={[0, 0.72, 0.02]}>
        <boxGeometry args={[2.02, 0.025, 0.025]} />
        <meshBasicMaterial color="#8feaff" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -0.72, 0.02]}>
        <boxGeometry args={[2.02, 0.02, 0.02]} />
        <meshBasicMaterial color="#3d9dbc" transparent opacity={0.78} />
      </mesh>

      <mesh position={[0, 0.25, 0.04]}>
        <planeGeometry args={[1.88, 0.46]} />
        <meshBasicMaterial map={primaryTexture || null} {...PANEL_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, -0.25, 0.05]}>
        <planeGeometry args={[1.88, 0.38]} />
        <meshBasicMaterial map={statusTexture || null} {...PANEL_MATERIAL_PROPS} />
      </mesh>

      <CommsButton label="SIG" position={[-0.78, -0.82, 0.06]} onClick={cycleLine} />
      <CommsButton
        label={hasActiveLine ? 'COLGAR' : activeTool === 'rastreo' ? 'TRAZA' : 'DIAL'}
        position={[-0.27, -0.82, 0.06]}
        onClick={dialSelected}
        accent
      />
      <CommsButton label="TRAZA" position={[0.27, -0.82, 0.06]} onClick={traceSelected} />
      <CommsButton
        label="CLEAR"
        position={[0.78, -0.82, 0.06]}
        onClick={() => session.actions.clearPhoneDial?.()}
      />
    </group>
  );
};

export default QuestCommsWorkbench;
