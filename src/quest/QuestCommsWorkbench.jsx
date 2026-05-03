/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { PHONE_MODE_CALL, PHONE_MODE_TRACER } from './hooks/useQuestSession';
import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const WORKBENCH_POSITION = [0, 1.98, -0.38];
const WORKBENCH_SCALE = 0.72;
const MAP_TEXTURE_URL = '/mapa.png';
const MAP_WIDTH = 1.0;
const MAP_HEIGHT = MAP_WIDTH * 0.744;
const TRACE_STEP_MS = 15_000;
const TRACE_EXACT_MS = 45_000;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const UI_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
};

const PANEL_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
};

const COMMS_COLORS = {
  bg: '#061018',
  panel: '#071722',
  cyan: '#73e8ff',
  cyanBright: '#d7f9ff',
  muted: '#89afc2',
  green: '#28e58c',
  amber: '#ffbc42',
  red: '#ff4a4a',
  blue: '#1769ff',
};

const normalizeDigits = (value = '') => String(value).replace(/\D/g, '');

const clampText = (value, max = 82) => {
  const text = String(value || '').trim();
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const stageFromElapsed = (elapsedMs) => {
  if (elapsedMs >= TRACE_EXACT_MS) return 3;
  if (elapsedMs >= TRACE_STEP_MS * 2) return 2;
  if (elapsedMs >= TRACE_STEP_MS) return 1;
  return 0;
};

const ringRadiusForStage = (stage) => {
  if (stage >= 3) return 0.035;
  if (stage === 2) return 0.13;
  if (stage === 1) return 0.25;
  return 0.43;
};

const mapPercentToLocal = (x = 50, y = 50) => [
  (Number(x) / 100 - 0.5) * MAP_WIDTH,
  (0.5 - Number(y) / 100) * MAP_HEIGHT,
];

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

const drawWrapped = ({ context, text, x, y, maxWidth, lineHeight, maxLines }) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const lines = [];
  let current = words[0];
  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${current} ${words[index]}`;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
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

const createCommsTexture = ({
  eyebrow = '',
  title = '',
  body = '',
  meta = '',
  width = 900,
  height = 260,
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

  context.fillStyle = active ? 'rgba(23,105,255,0.22)' : 'rgba(115,232,255,0.07)';
  context.beginPath();
  context.moveTo(width * 0.08, 22);
  context.lineTo(width * 0.72, 22);
  context.lineTo(width * 0.56, height - 22);
  context.lineTo(width * 0.02, height - 22);
  context.closePath();
  context.fill();

  context.shadowColor = danger ? COMMS_COLORS.red : active ? COMMS_COLORS.cyan : '#1c6d92';
  context.shadowBlur = active ? 18 : 8;
  context.strokeStyle = danger ? COMMS_COLORS.red : active ? COMMS_COLORS.cyanBright : COMMS_COLORS.cyan;
  context.lineWidth = active ? 7 : 4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = active ? 'rgba(115,232,255,0.82)' : 'rgba(115,232,255,0.42)';
  context.fillRect(24, 24, width * 0.2, compact ? 7 : 10);

  context.textBaseline = 'top';
  context.textAlign = 'left';
  if (eyebrow) {
    context.fillStyle = active ? COMMS_COLORS.cyanBright : COMMS_COLORS.cyan;
    context.font = `bold ${compact ? 22 : 28}px monospace`;
    context.fillText(String(eyebrow).toUpperCase(), 42, compact ? 36 : 42);
  }

  context.fillStyle = danger ? COMMS_COLORS.red : COMMS_COLORS.cyanBright;
  context.font = `bold ${compact ? 32 : 50}px monospace`;
  context.fillText(String(title || '').toUpperCase(), 42, compact ? 70 : 88);

  if (body) {
    context.fillStyle = COMMS_COLORS.muted;
    context.font = `${compact ? 21 : 28}px monospace`;
    drawWrapped({
      context,
      text: body,
      x: 42,
      y: compact ? 116 : 154,
      maxWidth: width - 84,
      lineHeight: compact ? 28 : 36,
      maxLines: compact ? 2 : 3,
    });
  }

  if (meta) {
    context.fillStyle = danger ? COMMS_COLORS.red : active ? COMMS_COLORS.green : COMMS_COLORS.cyan;
    context.font = `bold ${compact ? 19 : 24}px monospace`;
    context.fillText(String(meta).toUpperCase(), 42, height - (compact ? 42 : 50));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useCommsTexture = (config) => {
  const texture = useMemo(() => createCommsTexture(config), [config]);
  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const HoloPlate = ({ name, position, size, opacity = 0.035, color = COMMS_COLORS.cyan, renderOrder = 1 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} opacity={opacity} {...UI_MATERIAL_PROPS} />
  </mesh>
);

const HoloLine = ({ name, position, size, opacity = 0.7, color = COMMS_COLORS.cyan, renderOrder = 24 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} opacity={opacity} {...UI_MATERIAL_PROPS} />
  </mesh>
);

const TextCard = ({ name, position, size, textureOptions, onClick, renderOrder = 14 }) => {
  const [hovered, setHovered] = useState(false);
  const texture = useCommsTexture({
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
        pointerEventsOrder={onClick ? 42 : undefined}
      >
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture || null} {...UI_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
};

const ModeTabs = ({ activeTool, session }) => {
  const switchMode = (tool) => {
    session.actions.openTool?.(tool, {
      originModule: session.toolContext?.originModule || session.lastPrimaryModule,
      resourceId: tool === 'rastreo' ? 'phone-tracer' : 'phone-call',
    });
    session.actions.setPhoneMode?.(tool === 'rastreo' ? PHONE_MODE_TRACER : PHONE_MODE_CALL);
  };

  return (
    <group name="GCPD_Comms_ModeTabs">
      <TextCard
        name="GCPD_Comms_Tab_Dial"
        position={[-0.36, 0, 0]}
        size={[0.56, 0.16]}
        onClick={() => switchMode('comunicaciones')}
        textureOptions={{
          title: 'DIAL',
          meta: 'Llamada manual',
          width: 620,
          height: 170,
          compact: true,
          active: activeTool !== 'rastreo',
        }}
      />
      <TextCard
        name="GCPD_Comms_Tab_Trace"
        position={[0.28, 0, 0.01]}
        size={[0.56, 0.16]}
        onClick={() => switchMode('rastreo')}
        textureOptions={{
          title: 'TRAZA',
          meta: 'WebSocket DM',
          width: 620,
          height: 170,
          compact: true,
          active: activeTool === 'rastreo',
        }}
      />
    </group>
  );
};

const LineRail = ({ lines, selectedIndex, setSelectedIndex }) => (
  <group name="GCPD_Comms_LineRail">
    {lines.slice(0, 5).map((line, index) => {
      const number = normalizeDigits(line.number);
      return (
        <TextCard
          key={`${line.source}:${line.id || number || index}`}
          name={`GCPD_Comms_Line_${line.id || index}`}
          position={[0, 0.25 - index * 0.17, 0.02 + index * 0.002]}
          size={[0.58, 0.13]}
          onClick={() => setSelectedIndex(index)}
          textureOptions={{
            eyebrow: index === selectedIndex ? 'ACTIVA' : '',
            title: line.label || number || 'LINEA',
            body: number ? `#${number}` : 'sin numero',
            meta: line.source === 'tracer' ? 'traza configurada' : 'audio line',
            width: 680,
            height: 170,
            compact: true,
            active: index === selectedIndex,
          }}
        />
      );
    })}
  </group>
);

const DialPad = ({ session, selectedNumber, activeMode }) => {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
  const callLabel = activeMode ? 'COLGAR' : 'LLAMAR';

  return (
    <group name="GCPD_Comms_DialPad">
      {keys.map((key, index) => (
        <TextCard
          key={key}
          name={`GCPD_Comms_Key_${key}`}
          position={[-0.2 + (index % 3) * 0.2, 0.26 - Math.floor(index / 3) * 0.15, 0.03]}
          size={[0.16, 0.11]}
          onClick={() => session.actions.pressPhoneKey?.(key)}
          textureOptions={{
            title: key,
            width: 220,
            height: 140,
            compact: true,
            active: session.phoneState?.pressedKey === key,
          }}
        />
      ))}
      <TextCard
        name="GCPD_Comms_Dial_Call"
        position={[0, -0.4, 0.04]}
        size={[0.58, 0.14]}
        onClick={() => session.actions.dialPhoneNumber?.(selectedNumber, PHONE_MODE_CALL)}
        textureOptions={{
          title: callLabel,
          body: selectedNumber ? `#${selectedNumber}` : 'sin numero',
          width: 680,
          height: 160,
          compact: true,
          active: !activeMode,
        }}
      />
      <TextCard
        name="GCPD_Comms_Dial_Clear"
        position={[0, -0.57, 0.04]}
        size={[0.58, 0.11]}
        onClick={() => session.actions.clearPhoneDial?.()}
        textureOptions={{
          title: 'CLEAR',
          width: 620,
          height: 130,
          compact: true,
        }}
      />
    </group>
  );
};

const SignalProp = ({ label, meta, position, active = false, danger = false }) => (
  <group position={position}>
    <mesh renderOrder={16}>
      <octahedronGeometry args={[0.035, 0]} />
      <meshBasicMaterial
        color={danger ? COMMS_COLORS.red : active ? COMMS_COLORS.green : COMMS_COLORS.cyan}
        opacity={active ? 1 : 0.75}
        {...UI_MATERIAL_PROPS}
      />
    </mesh>
    <TextCard
      name={`GCPD_Comms_Prop_${label}`}
      position={[0.18, 0, 0.02]}
      size={[0.34, 0.11]}
      textureOptions={{
        title: label,
        body: meta,
        width: 420,
        height: 140,
        compact: true,
        active,
        danger,
      }}
    />
  </group>
);

const TraceMap = ({ session, selectedNumber, selectedLine, phase }) => {
  const mapTexture = useLoader(THREE.TextureLoader, MAP_TEXTURE_URL);
  const [traceState, setTraceState] = useState({
    stage: 0,
    clock: 'T+00.0s',
    sweep: 0,
  });

  useEffect(() => {
    mapTexture.colorSpace = THREE.SRGBColorSpace;
  }, [mapTexture]);

  useFrame((_, delta) => {
    setTraceState((current) => {
      const answeredAt = Number(session.phoneState?.tracerAnsweredAt || 0);
      const active = session.phoneState?.activeMode === PHONE_MODE_TRACER && answeredAt;
      const elapsed = active ? Math.max(0, Date.now() - answeredAt) : 0;
      return {
        stage: active ? stageFromElapsed(elapsed) : current.stage,
        clock: active ? `T+${(elapsed / 1000).toFixed(1)}s` : current.clock,
        sweep: (current.sweep + delta * 1.8) % (Math.PI * 2),
      };
    });
  });

  const hotspot = session.phoneState?.hotspot || selectedLine?.hotspot || selectedLine || { x: 50, y: 50 };
  const [hotspotX, hotspotY] = mapPercentToLocal(hotspot.x ?? 50, hotspot.y ?? 50);
  const activeTrace = session.phoneState?.activeMode === PHONE_MODE_TRACER;
  const radius = ringRadiusForStage(traceState.stage);
  const exact = activeTrace && traceState.stage >= 3;
  const status = activeTrace
    ? session.phoneState?.lineStatus || 'trazando'
    : phase === 'ready'
      ? 'listo para iniciar'
      : 'reposo';

  return (
    <group name="GCPD_Comms_TraceMap">
      <mesh position={[0, 0.02, -0.02]} renderOrder={8}>
        <planeGeometry args={[1.26, 0.78]} />
        <meshStandardMaterial
          color={COMMS_COLORS.panel}
          emissive="#08263a"
          emissiveIntensity={0.32}
          opacity={0.74}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <mesh name="GCPD_Comms_TraceMap_Image" position={[-0.18, 0.03, 0.01]} renderOrder={18}>
        <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
        <meshBasicMaterial map={mapTexture} color="#d7ffe1" opacity={0.8} {...UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[-0.18, 0.03, 0.02]} renderOrder={19}>
        <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
        <meshBasicMaterial color={COMMS_COLORS.green} opacity={0.05} wireframe {...UI_MATERIAL_PROPS} />
      </mesh>

      <group position={[-0.18 + hotspotX, 0.03 + hotspotY, 0.05]}>
        <mesh renderOrder={28}>
          <ringGeometry args={[radius, radius + 0.008, 96]} />
          <meshBasicMaterial color={exact ? COMMS_COLORS.red : COMMS_COLORS.green} opacity={0.9} {...UI_MATERIAL_PROPS} />
        </mesh>
        <mesh renderOrder={27}>
          <circleGeometry args={[radius, 96]} />
          <meshBasicMaterial color={COMMS_COLORS.green} opacity={activeTrace ? 0.055 : 0.018} {...UI_MATERIAL_PROPS} />
        </mesh>
        <mesh rotation={[0, 0, traceState.sweep]} renderOrder={30}>
          <planeGeometry args={[radius * 1.8, 0.006]} />
          <meshBasicMaterial color={COMMS_COLORS.cyanBright} opacity={activeTrace ? 0.92 : 0.22} {...UI_MATERIAL_PROPS} />
        </mesh>
        <mesh position={[0, 0, 0.05]} renderOrder={32}>
          <circleGeometry args={[exact ? 0.02 : 0.012, 24]} />
          <meshBasicMaterial color={exact ? COMMS_COLORS.red : COMMS_COLORS.cyanBright} opacity={1} {...UI_MATERIAL_PROPS} />
        </mesh>
      </group>

      <HoloLine
        name="GCPD_Comms_SignalPath_A"
        position={[-0.43, 0.25, 0.06]}
        size={[0.28, 0.012]}
        color={activeTrace ? COMMS_COLORS.green : COMMS_COLORS.cyan}
        opacity={activeTrace ? 0.95 : 0.42}
      />
      <HoloLine
        name="GCPD_Comms_SignalPath_B"
        position={[-0.12, 0.13, 0.06]}
        size={[0.32, 0.012]}
        color={activeTrace ? COMMS_COLORS.amber : COMMS_COLORS.cyan}
        opacity={activeTrace ? 0.86 : 0.34}
      />
      <HoloLine
        name="GCPD_Comms_SignalPath_C"
        position={[0.19, -0.02, 0.06]}
        size={[0.28, 0.012]}
        color={exact ? COMMS_COLORS.red : COMMS_COLORS.green}
        opacity={activeTrace ? 0.9 : 0.3}
      />

      <SignalProp
        label="CELL TOWER"
        meta="triangulando"
        position={[-0.64, 0.27, 0.08]}
        active={activeTrace}
      />
      <SignalProp
        label="MOBILE PROXY"
        meta="salto 4G/LTE"
        position={[-0.34, 0.12, 0.08]}
        active={traceState.stage >= 1}
      />
      <SignalProp
        label="WAYNEMOBILE"
        meta="backdoor activo"
        position={[0.0, -0.04, 0.08]}
        active={traceState.stage >= 2}
      />
      <SignalProp
        label="HOTSPOT"
        meta={exact ? hotspot.label || 'exacto' : 'radio vivo'}
        position={[0.33, -0.21, 0.08]}
        active={exact}
        danger={exact}
      />

      <TextCard
        name="GCPD_Comms_TraceStatus"
        position={[0.44, 0.22, 0.08]}
        size={[0.42, 0.18]}
        textureOptions={{
          eyebrow: 'TRAZA',
          title: status,
          body: selectedNumber ? `#${selectedNumber}` : 'selecciona linea',
          meta: `${traceState.clock} // fase ${activeTrace ? traceState.stage : 0}`,
          width: 520,
          height: 210,
          compact: true,
          active: activeTrace,
        }}
      />
      <TextCard
        name="GCPD_Comms_TraceAction"
        position={[0.44, -0.03, 0.08]}
        size={[0.42, 0.16]}
        onClick={() => session.actions.dialPhoneNumber?.(selectedNumber, PHONE_MODE_TRACER)}
        textureOptions={{
          title: activeTrace ? 'COLGAR' : 'INICIAR TRAZA',
          body: activeTrace ? 'cortar websocket' : 'llamada DM',
          width: 520,
          height: 180,
          compact: true,
          active: !activeTrace,
        }}
      />
      <TextCard
        name="GCPD_Comms_TraceLog"
        position={[0.44, -0.27, 0.08]}
        size={[0.42, 0.2]}
        textureOptions={{
          eyebrow: 'LOG',
          title: session.phoneState?.tracerWsState || 'offline',
          body: clampText(session.phoneState?.lastAction || 'sistema en espera', 96),
          meta: session.phoneState?.hotspotLabel || 'sin hotspot',
          width: 520,
          height: 230,
          compact: true,
        }}
      />
    </group>
  );
};

const DialPanel = ({ session, lines, selectedLine, selectedIndex, setSelectedIndex }) => {
  const selectedNumber = normalizeDigits(selectedLine?.number || session.phoneState?.dialedDigits);
  const activeMode = session.phoneState?.activeMode;
  const displayNumber = session.phoneState?.dialedDigits || selectedNumber || session.phoneState?.lastDialedNumber || '';

  return (
    <group name="GCPD_Comms_DialPanel" position={[-0.86, -0.02, 0.08]} rotation={[0, -0.12, 0]}>
      <HoloPlate name="GCPD_Comms_DialPanel_Aura" position={[0, 0, -0.04]} size={[0.86, 1.28]} opacity={0.045} />
      <TextCard
        name="GCPD_Comms_DialHeader"
        position={[0, 0.54, 0.02]}
        size={[0.76, 0.18]}
        textureOptions={{
          eyebrow: 'DIAL',
          title: displayNumber || 'SIN MARCAR',
          body: activeMode === PHONE_MODE_CALL ? 'línea conectada' : 'llamada manual',
          meta: session.phoneState?.lineStatus || 'colgada',
          width: 820,
          height: 220,
          compact: true,
          active: activeMode === PHONE_MODE_CALL,
        }}
      />
      <group position={[-0.24, 0.01, 0.03]}>
        <DialPad session={session} selectedNumber={selectedNumber || displayNumber} activeMode={activeMode === PHONE_MODE_CALL} />
      </group>
      <group position={[0.28, 0.0, 0.02]}>
        <LineRail lines={lines} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} />
      </group>
    </group>
  );
};

const TracePanel = ({ session, selectedLine }) => {
  const selectedNumber = normalizeDigits(selectedLine?.number || session.phoneState?.lastDialedNumber || session.phoneState?.dialedDigits);
  const phase = selectedNumber ? 'ready' : 'idle';

  return (
    <group name="GCPD_Comms_TracePanel" position={[0.52, 0.0, 0.1]} rotation={[0, 0.1, 0]}>
      <HoloPlate name="GCPD_Comms_TracePanel_Aura" position={[0, 0, -0.04]} size={[1.48, 1.28]} opacity={0.04} />
      <TextCard
        name="GCPD_Comms_TraceHeader"
        position={[0, 0.54, 0.03]}
        size={[1.22, 0.18]}
        textureOptions={{
          eyebrow: 'TRAZA',
          title: 'ANALISIS DE SEÑAL',
          body: 'cell tower // proxy móvil // WayneMobile // hotspot',
          meta: session.phoneState?.tracerWsState || 'offline',
          width: 1250,
          height: 220,
          compact: true,
          active: session.phoneState?.activeMode === PHONE_MODE_TRACER,
        }}
      />
      <group position={[0, -0.03, 0.04]}>
        <TraceMap
          session={session}
          selectedNumber={selectedNumber}
          selectedLine={selectedLine}
          phase={phase}
        />
      </group>
    </group>
  );
};

const StatusStrip = ({ session }) => (
  <group name="GCPD_Comms_StatusStrip" position={[0.02, -0.78, 0.14]} rotation={[0.035, 0, 0]}>
    <TextCard
      name="GCPD_Comms_Status"
      position={[0, 0, 0]}
      size={[1.82, 0.16]}
      textureOptions={{
        eyebrow: 'COMMS // SINCRONIA ACTIVA // RAY READY',
        title: session.phoneState?.activeMode === PHONE_MODE_TRACER ? 'TRAZA EN CURSO' : 'TELEFONO OPERATIVO',
        body: clampText(session.phoneState?.lastAction || 'Sistema en espera.', 126),
        meta: `bridge ${session.phoneState?.tracerWsState || 'offline'} // ${session.phoneState?.lineStatus || 'colgada'}`,
        width: 1800,
        height: 170,
        compact: true,
        active: Boolean(session.phoneState?.activeMode),
      }}
    />
  </group>
);

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

  if (!isActive) return null;

  return (
    <group name="GCPD_CommsWorkbench" position={WORKBENCH_POSITION} scale={WORKBENCH_SCALE}>
      <mesh position={[0, 0, -0.11]} renderOrder={0}>
        <planeGeometry args={[2.6, 1.62]} />
        <meshStandardMaterial
          color={COMMS_COLORS.bg}
          emissive="#071d28"
          emissiveIntensity={0.26}
          metalness={0.14}
          roughness={0.58}
          opacity={0.46}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloLine name="GCPD_Comms_TopTrace" position={[0, 0.77, 0.06]} size={[2.48, 0.014]} opacity={0.86} />
      <HoloLine name="GCPD_Comms_MidBus_A" position={[-0.18, 0.26, 0.12]} size={[0.46, 0.01]} color={COMMS_COLORS.blue} opacity={0.82} />
      <HoloLine name="GCPD_Comms_MidBus_B" position={[-0.18, -0.08, 0.12]} size={[0.46, 0.01]} color={COMMS_COLORS.blue} opacity={0.66} />

      <group position={[-0.02, 0.69, 0.12]}>
        <ModeTabs activeTool={activeTool} session={session} />
      </group>
      <DialPanel
        session={session}
        lines={lines}
        selectedLine={selectedLine}
        selectedIndex={selectedIndex}
        setSelectedIndex={setSelectedIndex}
      />
      <TracePanel session={session} selectedLine={selectedLine} />
      <StatusStrip session={session} />
    </group>
  );
};

export default QuestCommsWorkbench;
