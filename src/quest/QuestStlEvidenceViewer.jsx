/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import * as THREE from 'three';

import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const VIEWER_POSITION = [0.56, 1.82, -0.56];
const VIEWER_SCALE = 0.44;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };
const STICK_DEADZONE = 0.16;

const VIEWER_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
};

const PANEL_MATERIAL_PROPS = {
  transparent: true,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
};

const COLORS = {
  bg: '#061018',
  panel: '#071722',
  cyan: '#73e8ff',
  cyanBright: '#d7f9ff',
  muted: '#89afc2',
  green: '#28e58c',
  amber: '#ffbc42',
  red: '#ff4a4a',
};

const getEvidenceItems = (toolData = {}) => [
  ...(toolData.builtInEvidence || []),
  ...(toolData.evidence || []),
]
  .filter((entry) => entry?.stlPath)
  .filter((entry) => entry.visible !== false && entry.visibility !== 'hidden');

const getActiveEvidence = (session) => {
  const items = getEvidenceItems(session?.toolData);
  const resourceId = session?.selection?.herramientas?.resourceId;
  return items.find((entry) => entry.id === resourceId) || items[0] || null;
};

const selectEvidence = (session, id) => {
  if (!id) return;
  session.actions.openTool('evidencias', {
    originModule: session.toolContext?.originModule || session.lastPrimaryModule,
    resourceId: id,
  });
};

const getNextEvidenceId = (session, offset = 1) => {
  const items = getEvidenceItems(session?.toolData);
  if (!items.length) return null;

  const currentId = session?.selection?.herramientas?.resourceId || items[0]?.id;
  const currentIndex = Math.max(0, items.findIndex((entry) => entry.id === currentId));
  return items[(currentIndex + offset + items.length) % items.length]?.id || items[0]?.id || null;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const drawWrapped = ({ context, text, x, y, maxWidth, lineHeight, maxLines }) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return;
  const lines = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const next = `${current} ${words[index]}`;
    if (context.measureText(next).width <= maxWidth) {
      current = next;
      continue;
    }
    lines.push(current);
    current = words[index];
    if (lines.length >= maxLines - 1) break;
  }
  if (lines.length < maxLines) lines.push(current);
  lines.slice(0, maxLines).forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
};

const createPanelTexture = ({
  eyebrow = '',
  title = '',
  body = '',
  meta = '',
  width = 760,
  height = 220,
  active = false,
  danger = false,
  compact = false,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, active ? '#0c3558' : '#071925');
  gradient.addColorStop(0.58, active ? '#08223c' : '#06111a');
  gradient.addColorStop(1, '#02070c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = active ? 'rgba(23,105,255,0.2)' : 'rgba(115,232,255,0.07)';
  context.beginPath();
  context.moveTo(width * 0.08, 20);
  context.lineTo(width * 0.74, 20);
  context.lineTo(width * 0.58, height - 20);
  context.lineTo(width * 0.02, height - 20);
  context.closePath();
  context.fill();

  context.shadowColor = danger ? COLORS.red : active ? COLORS.cyanBright : '#1c6d92';
  context.shadowBlur = active ? 18 : 8;
  context.strokeStyle = danger ? COLORS.red : active ? COLORS.cyanBright : COLORS.cyan;
  context.lineWidth = active ? 7 : 4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = active ? 'rgba(115,232,255,0.82)' : 'rgba(115,232,255,0.42)';
  context.fillRect(24, 24, width * 0.2, compact ? 7 : 10);

  context.textBaseline = 'top';
  if (eyebrow) {
    context.fillStyle = active ? COLORS.cyanBright : COLORS.cyan;
    context.font = `bold ${compact ? 20 : 27}px monospace`;
    context.fillText(String(eyebrow).toUpperCase(), 40, compact ? 34 : 42);
  }

  context.fillStyle = danger ? COLORS.red : COLORS.cyanBright;
  context.font = `bold ${compact ? 30 : 48}px monospace`;
  context.fillText(String(title || '').toUpperCase(), 40, compact ? 66 : 86);

  if (body) {
    context.fillStyle = COLORS.muted;
    context.font = `${compact ? 20 : 27}px monospace`;
    drawWrapped({
      context,
      text: body,
      x: 40,
      y: compact ? 108 : 150,
      maxWidth: width - 80,
      lineHeight: compact ? 26 : 35,
      maxLines: compact ? 2 : 3,
    });
  }

  if (meta) {
    context.fillStyle = danger ? COLORS.red : active ? COLORS.green : COLORS.cyan;
    context.font = `bold ${compact ? 18 : 23}px monospace`;
    context.fillText(String(meta).toUpperCase(), 40, height - (compact ? 38 : 48));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const usePanelTexture = (options) => {
  const texture = useMemo(() => createPanelTexture(options), [options]);
  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const HoloPlate = ({ name, position, size, opacity = 0.035, color = COLORS.cyan, renderOrder = 1 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} opacity={opacity} {...VIEWER_MATERIAL_PROPS} />
  </mesh>
);

const HoloLine = ({ name, position, size, opacity = 0.7, color = COLORS.cyan, renderOrder = 24 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} opacity={opacity} {...VIEWER_MATERIAL_PROPS} />
  </mesh>
);

const TextCard = ({ name, position, size, textureOptions, onClick, renderOrder = 14 }) => {
  const [hovered, setHovered] = useState(false);
  const texture = usePanelTexture({
    ...textureOptions,
    active: textureOptions.active || hovered,
  });

  return (
    <group position={position} scale={hovered ? 1.025 : 1}>
      <mesh
        name={name}
        onClick={onClick}
        onPointerEnter={onClick ? () => setHovered(true) : undefined}
        onPointerLeave={onClick ? () => setHovered(false) : undefined}
        renderOrder={renderOrder}
        pointerEventsType={onClick ? XR_RAY_POINTER_EVENTS : undefined}
        pointerEventsOrder={onClick ? 44 : undefined}
      >
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture || null} {...VIEWER_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
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

    return { geometry, scale, size };
  }, [sourceGeometry]);

  useEffect(() => {
    return () => {
      prepared.geometry.dispose();
    };
  }, [prepared]);

  return prepared;
};

const EvidenceStlMesh = ({ evidence, hovered, rotation, zoom }) => {
  const groupRef = useRef(null);
  const { geometry, scale } = usePreparedStlGeometry(evidence.stlPath);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = rotation.x;
    groupRef.current.rotation.y = rotation.y + delta * 0.06;
    groupRef.current.rotation.z = rotation.z;
  });

  const resolvedScale = scale * zoom * (hovered ? 1.04 : 1);

  return (
    <group
      name="GCPD_StlEvidenceMesh"
      ref={groupRef}
      scale={[resolvedScale, resolvedScale, resolvedScale]}
      rotation={[rotation.x, rotation.y, rotation.z]}
    >
      <mesh geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          color="#b7e8ff"
          emissive={hovered ? '#146889' : '#0a3347'}
          emissiveIntensity={hovered ? 0.5 : 0.24}
          metalness={0.22}
          roughness={0.32}
        />
      </mesh>
      <lineSegments>
        <edgesGeometry args={[geometry, 18]} />
        <lineBasicMaterial color="#e7fbff" transparent opacity={0.48} />
      </lineSegments>
    </group>
  );
};

const EvidenceSelector = ({ items, activeId, onSelect }) => (
  <group name="GCPD_StlEvidenceSelector" rotation={[0, -0.16, 0]}>
    <TextCard
      name="GCPD_StlEvidenceSelector_Header"
      position={[0, 0.52, 0.02]}
      size={[0.58, 0.16]}
      textureOptions={{
        eyebrow: 'DM VISIBLE',
        title: 'MODELOS',
        body: `${items.length} piezas habilitadas`,
        width: 680,
        height: 180,
        compact: true,
      }}
    />
    {items.slice(0, 6).map((item, index) => (
      <TextCard
        key={item.id}
        name={`GCPD_StlEvidenceSelector_${item.id}`}
        position={[0, 0.29 - index * 0.15, 0.03 + index * 0.002]}
        size={[0.58, 0.12]}
        onClick={() => onSelect(item.id)}
        textureOptions={{
          eyebrow: item.id === activeId ? 'ACTIVA' : '',
          title: item.label || item.id,
          body: item.source === 'builtin' ? 'built-in' : item.command || item.source || 'dm',
          width: 680,
          height: 150,
          compact: true,
          active: item.id === activeId,
        }}
      />
    ))}
  </group>
);

const ControlButton = ({ label, meta, position, onClick, active = false }) => (
  <TextCard
    name={`GCPD_StlControl_${label}`}
    position={position}
    size={[0.28, 0.13]}
    onClick={onClick}
    textureOptions={{
      title: label,
      meta,
      width: 360,
      height: 150,
      compact: true,
      active,
    }}
  />
);

const ViewerControls = ({ onRotate, onZoom, onReset, onNext, mode, setMode }) => (
  <group name="GCPD_StlViewerControls" rotation={[0, 0.16, 0]}>
    <TextCard
      name="GCPD_StlViewerControls_Header"
      position={[0, 0.52, 0.02]}
      size={[0.58, 0.16]}
      textureOptions={{
        eyebrow: 'OPERAR MODELO',
        title: mode === 'rotate' ? 'ROTACION' : 'ZOOM',
        body: 'ray + stick derecho',
        width: 680,
        height: 180,
        compact: true,
        active: true,
      }}
    />
    <ControlButton label="ROT X+" meta="pitch" position={[-0.16, 0.27, 0.03]} onClick={() => onRotate('x', 0.22)} />
    <ControlButton label="ROT X-" meta="pitch" position={[0.16, 0.27, 0.03]} onClick={() => onRotate('x', -0.22)} />
    <ControlButton label="ROT Y+" meta="yaw" position={[-0.16, 0.1, 0.03]} onClick={() => onRotate('y', 0.28)} />
    <ControlButton label="ROT Y-" meta="yaw" position={[0.16, 0.1, 0.03]} onClick={() => onRotate('y', -0.28)} />
    <ControlButton label="ZOOM+" meta="in" position={[-0.16, -0.07, 0.03]} onClick={() => onZoom(0.16)} />
    <ControlButton label="ZOOM-" meta="out" position={[0.16, -0.07, 0.03]} onClick={() => onZoom(-0.16)} />
    <ControlButton label="RESET" meta="vista" position={[-0.16, -0.24, 0.03]} onClick={onReset} />
    <ControlButton label="SIG STL" meta="next" position={[0.16, -0.24, 0.03]} onClick={onNext} />
    <ControlButton
      label="STICK"
      meta={mode}
      position={[0, -0.42, 0.03]}
      active
      onClick={() => setMode(mode === 'rotate' ? 'zoom' : 'rotate')}
    />
  </group>
);

const AnalysisReadout = ({ evidence, zoom, mode }) => (
  <group name="GCPD_StlReadout">
    <TextCard
      name="GCPD_StlReadout_Label"
      position={[0, -0.61, 0.08]}
      size={[1.18, 0.18]}
      textureOptions={{
        eyebrow: 'VISOR STL // EVIDENCIA',
        title: evidence?.label || evidence?.id || 'SIN PIEZA',
        body: evidence?.stlPath || 'sin stlPath',
        meta: `${evidence?.source === 'builtin' ? 'built-in' : 'dm/api'} // zoom ${(zoom * 100).toFixed(0)} // ${mode}`,
        width: 1300,
        height: 210,
        compact: true,
        active: true,
      }}
    />
    <TextCard
      name="GCPD_StlReadout_Hint"
      position={[0, -0.82, 0.08]}
      size={[1.18, 0.14]}
      textureOptions={{
        eyebrow: 'CONTROLES XR',
        title: 'RAY SELECT + STICK',
        body: 'stick derecho rota o zoom segun modo; botones laterales para ajuste fino',
        width: 1300,
        height: 170,
        compact: true,
      }}
    />
  </group>
);

const useGamepadModelControls = ({ active, mode, setRotation, setZoom }) => {
  const { gl } = useThree();

  useFrame((_, delta) => {
    if (!active) return;
    const xrSession = gl.xr.getSession?.();
    const rightController = Array.from(xrSession?.inputSources || []).find(
      (source) => source.handedness === 'right' && source.gamepad
    );
    const gamepad = rightController?.gamepad;
    if (!gamepad?.axes?.length) return;

    const x = Number(gamepad.axes[0] || 0);
    const y = Number(gamepad.axes[1] || 0);
    if (Math.abs(x) < STICK_DEADZONE && Math.abs(y) < STICK_DEADZONE) return;

    if (mode === 'zoom') {
      setZoom((current) => clamp(current + -y * delta * 1.1, 0.56, 1.9));
      return;
    }

    setRotation((current) => ({
      ...current,
      y: current.y + x * delta * 2.2,
      x: clamp(current.x + y * delta * 1.5, -1.15, 1.15),
    }));
  });
};

const QuestStlEvidenceViewer = ({ session }) => {
  const [hovered, setHovered] = useState(false);
  const [rotation, setRotation] = useState({ x: 0.22, y: -0.36, z: 0 });
  const [zoom, setZoom] = useState(1);
  const [controlMode, setControlMode] = useState('rotate');
  const items = getEvidenceItems(session?.toolData);
  const activeEvidence = getActiveEvidence(session);
  const isActive =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    session?.selection?.herramientas?.activeTool === 'evidencias' &&
    activeEvidence;

  useGamepadModelControls({
    active: Boolean(isActive),
    mode: controlMode,
    setRotation,
    setZoom,
  });

  const openEvidence = (id) => selectEvidence(session, id);
  const cycleEvidence = (offset = 1) => {
    const nextEvidenceId = getNextEvidenceId(session, offset);
    if (!nextEvidenceId) return;
    openEvidence(nextEvidenceId);
  };
  const rotate = (axis, amount) => {
    setRotation((current) => ({
      ...current,
      [axis]: axis === 'x' ? clamp(current[axis] + amount, -1.25, 1.25) : current[axis] + amount,
    }));
  };
  const changeZoom = (amount) => setZoom((current) => clamp(current + amount, 0.56, 1.9));
  const resetView = () => {
    setRotation({ x: 0.22, y: -0.36, z: 0 });
    setZoom(1);
    setControlMode('rotate');
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!import.meta.env.DEV && !window.IWER_DEVICE) return undefined;

    const bridge = {
      version: 2,
      snapshot: {
        active: Boolean(isActive),
        itemCount: items.length,
        resourceId: session?.selection?.herramientas?.resourceId || '',
        controlMode,
        zoom,
        rotation,
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
        cycleEvidence: () => cycleEvidence(1),
        previousEvidence: () => cycleEvidence(-1),
        openEvidence,
        zoomIn: () => changeZoom(0.16),
        zoomOut: () => changeZoom(-0.16),
        rotateY: (amount = 0.28) => rotate('y', amount),
        rotateX: (amount = 0.22) => rotate('x', amount),
        resetView,
      },
    };

    window.__GCPD_QUEST_STL__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_STL__ === bridge) {
        delete window.__GCPD_QUEST_STL__;
      }
    };
  }, [activeEvidence, controlMode, isActive, items, rotation, session, zoom]);

  if (!isActive) return null;

  return (
    <group name="GCPD_StlEvidenceViewer" position={VIEWER_POSITION} scale={VIEWER_SCALE}>
      <mesh position={[0, 0, -0.12]} renderOrder={0}>
        <planeGeometry args={[2.28, 1.72]} />
        <meshStandardMaterial
          color={COLORS.bg}
          emissive="#071d28"
          emissiveIntensity={0.26}
          metalness={0.16}
          roughness={0.58}
          opacity={0.46}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloLine name="GCPD_Stl_TopTrace" position={[0, 0.79, 0.05]} size={[2.14, 0.014]} opacity={0.86} />
      <HoloLine name="GCPD_Stl_FloorTrace" position={[0, -0.49, 0.06]} size={[1.22, 0.01]} opacity={0.38} />

      <group position={[-0.78, 0.02, 0.08]}>
        <EvidenceSelector items={items} activeId={activeEvidence.id} onSelect={openEvidence} />
      </group>

      <group name="GCPD_StlModelStage" position={[0, 0.06, 0.1]}>
        <HoloPlate
          name="GCPD_StlModelStage_Aura"
          position={[0, 0, -0.05]}
          size={[0.88, 0.9]}
          opacity={hovered ? 0.08 : 0.04}
        />
        <mesh position={[0, -0.08, -0.015]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={4}>
          <circleGeometry args={[0.46, 96]} />
          <meshBasicMaterial color={COLORS.cyan} transparent opacity={0.09} />
        </mesh>
        <mesh position={[0, -0.08, 0.005]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={5}>
          <ringGeometry args={[0.32, 0.47, 96]} />
          <meshBasicMaterial color={hovered ? COLORS.cyanBright : COLORS.cyan} transparent opacity={hovered ? 0.74 : 0.46} side={THREE.DoubleSide} />
        </mesh>
        <mesh
          name="GCPD_StlModelStage_HitArea"
          position={[0, -0.03, 0.11]}
          onClick={() => cycleEvidence(1)}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          pointerEventsType={XR_RAY_POINTER_EVENTS}
          pointerEventsOrder={38}
        >
          <cylinderGeometry args={[0.55, 0.55, 0.16, 96]} />
          <meshBasicMaterial color={COLORS.cyan} opacity={0.018} {...VIEWER_MATERIAL_PROPS} />
        </mesh>
        <EvidenceStlMesh evidence={activeEvidence} hovered={hovered} rotation={rotation} zoom={zoom} />
      </group>

      <group position={[0.78, 0.02, 0.08]}>
        <ViewerControls
          onRotate={rotate}
          onZoom={changeZoom}
          onReset={resetView}
          onNext={() => cycleEvidence(1)}
          mode={controlMode}
          setMode={setControlMode}
        />
      </group>

      <AnalysisReadout evidence={activeEvidence} zoom={zoom} mode={controlMode} />
    </group>
  );
};

export { getEvidenceItems };
export default QuestStlEvidenceViewer;
