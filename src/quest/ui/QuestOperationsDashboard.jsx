/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

import {
  QUEST_PANEL_MATERIAL_PROPS,
  QUEST_RAY_POINTER_EVENTS,
  QUEST_UI_COLORS,
  QUEST_UI_LAYOUT,
  QUEST_UI_MATERIAL_PROPS,
} from './questUiTokens';

const truncate = (value, max = 86) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const splitWords = (text) => String(text || '').split(/\s+/).filter(Boolean);

const drawWrappedText = ({
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines,
}) => {
  const words = splitWords(text);
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

  const visibleLines = lines.slice(0, maxLines);
  const visibleWordCount = splitWords(visibleLines.join(' ')).length;
  if (visibleWordCount < words.length) {
    const lastIndex = visibleLines.length - 1;
    let clipped = visibleLines[lastIndex];
    while (
      clipped.length > 3 &&
      context.measureText(`${clipped}...`).width > maxWidth
    ) {
      clipped = clipped.slice(0, -1);
    }
    visibleLines[lastIndex] = `${clipped}...`;
  }

  visibleLines.forEach((line, lineIndex) => {
    context.fillText(line, x, y + lineIndex * lineHeight);
  });
};

const drawPanelFrame = ({
  context,
  width,
  height,
  active = false,
  dense = false,
}) => {
  const colors = QUEST_UI_COLORS;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, active ? '#103f67' : colors.panelSoft);
  gradient.addColorStop(0.52, active ? colors.panelActive : colors.panel);
  gradient.addColorStop(1, '#02070c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = active ? 'rgba(23,105,255,0.18)' : 'rgba(125,230,255,0.045)';
  context.beginPath();
  context.moveTo(width * 0.18, 24);
  context.lineTo(width * 0.72, 24);
  context.lineTo(width * 0.56, height - 24);
  context.lineTo(width * 0.08, height - 24);
  context.closePath();
  context.fill();

  context.shadowColor = active ? colors.cyan : colors.border;
  context.shadowBlur = active ? 22 : 10;
  context.strokeStyle = active ? colors.cyan : colors.borderSoft;
  context.lineWidth = active ? 8 : 4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = active ? 'rgba(23,105,255,0.36)' : 'rgba(125,230,255,0.08)';
  context.fillRect(22, 22, width - 44, dense ? 8 : 12);
  context.fillStyle = active ? colors.cyan : colors.border;
  context.fillRect(22, 22, width * 0.2, dense ? 8 : 12);

  const corner = dense ? 34 : 52;
  context.strokeStyle = active ? colors.cyanBright : colors.cyan;
  context.lineWidth = active ? 5 : 3;
  [
    [18, 18, 1, 1],
    [width - 18, 18, -1, 1],
    [18, height - 18, 1, -1],
    [width - 18, height - 18, -1, -1],
  ].forEach(([x, y, sx, sy]) => {
    context.beginPath();
    context.moveTo(x, y + sy * corner);
    context.lineTo(x, y);
    context.lineTo(x + sx * corner, y);
    context.stroke();
  });

  if (!dense) {
    context.strokeStyle = 'rgba(125,230,255,0.08)';
    context.lineWidth = 1;
    for (let y = 58; y < height - 24; y += 18) {
      context.beginPath();
      context.moveTo(22, y);
      context.lineTo(width - 22, y);
      context.stroke();
    }
  }

  context.fillStyle = active ? 'rgba(188,239,255,0.9)' : 'rgba(125,230,255,0.5)';
  context.fillRect(width - 94, height - 30, 52, dense ? 4 : 6);
  context.fillRect(width - 34, height - 30, 12, dense ? 4 : 6);
};

const createCardTexture = ({
  eyebrow = '',
  title = '',
  body = '',
  meta = '',
  width = 900,
  height = 280,
  active = false,
  danger = false,
  dense = false,
  align = 'left',
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const colors = QUEST_UI_COLORS;
  drawPanelFrame({ context, width, height, active, dense });

  const left = align === 'center' ? width / 2 : 42;
  context.textBaseline = 'top';
  context.textAlign = align;

  if (eyebrow) {
    context.fillStyle = active ? colors.cyanBright : colors.cyan;
    context.font = `bold ${dense ? 26 : 30}px monospace`;
    context.fillText(String(eyebrow).toUpperCase(), left, dense ? 32 : 40);
  }

  context.fillStyle = danger ? colors.red : colors.text;
  context.font = `bold ${dense ? 38 : 54}px monospace`;
  context.fillText(String(title || '').toUpperCase(), left, dense ? 68 : 84);

  if (body) {
    context.fillStyle = colors.muted;
    context.font = `${dense ? 24 : 30}px monospace`;
    drawWrappedText({
      context,
      text: body,
      x: left,
      y: dense ? 118 : 156,
      maxWidth: align === 'center' ? width - 96 : width - 84,
      lineHeight: dense ? 32 : 40,
      maxLines: dense ? 2 : 3,
    });
  }

  if (meta) {
    context.fillStyle = danger ? colors.red : active ? colors.green : colors.cyan;
    context.font = `bold ${dense ? 22 : 26}px monospace`;
    context.fillText(String(meta).toUpperCase(), left, height - (dense ? 46 : 54));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const createHeroTexture = ({
  title = '',
  subtitle = '',
  caseTitle = '',
  width = 1600,
  height = 560,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  const colors = QUEST_UI_COLORS;
  const sky = context.createLinearGradient(0, 0, width, height);
  sky.addColorStop(0, '#0a2238');
  sky.addColorStop(0.48, '#06131f');
  sky.addColorStop(1, '#02070c');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(
    width * 0.52,
    height * 0.38,
    30,
    width * 0.52,
    height * 0.42,
    width * 0.64
  );
  glow.addColorStop(0, 'rgba(125,230,255,0.18)');
  glow.addColorStop(0.42, 'rgba(23,105,255,0.08)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = 'rgba(2,7,12,0.62)';
  for (let i = 0; i < 24; i += 1) {
    const x = 70 + i * 64;
    const towerWidth = 22 + ((i * 17) % 58);
    const towerHeight = 70 + ((i * 31) % 180);
    context.fillRect(x, height - 150 - towerHeight, towerWidth, towerHeight + 110);
    if (i % 4 === 0) {
      context.fillRect(x + towerWidth * 0.34, height - 178 - towerHeight, towerWidth * 0.32, 34);
    }
  }

  context.strokeStyle = 'rgba(255,188,66,0.45)';
  context.lineWidth = 10;
  context.beginPath();
  context.moveTo(0, height * 0.58);
  context.lineTo(width, height * 0.46);
  context.stroke();
  context.strokeStyle = 'rgba(125,230,255,0.16)';
  context.lineWidth = 2;
  for (let x = 0; x < width; x += 44) {
    context.beginPath();
    context.moveTo(x, height * 0.58);
    context.lineTo(x + 22, height * 0.56);
    context.stroke();
  }

  context.fillStyle = 'rgba(2,7,12,0.3)';
  context.fillRect(0, 0, width, height);
  drawPanelFrame({ context, width, height, active: true, dense: false });

  context.textBaseline = 'top';
  context.textAlign = 'left';
  context.fillStyle = colors.cyan;
  context.font = 'bold 34px monospace';
  context.fillText('OPERACION ACTUAL', 62, 54);
  context.fillStyle = colors.text;
  context.font = 'bold 76px monospace';
  context.fillText(String(caseTitle || title || 'ESCENA DEL CRIMEN').toUpperCase(), 62, 102);
  context.fillStyle = colors.muted;
  context.font = '32px monospace';
  context.fillText(truncate(subtitle, 96), 62, 194);

  context.fillStyle = 'rgba(3,12,20,0.72)';
  context.fillRect(64, height - 174, width * 0.56, 118);
  context.strokeStyle = 'rgba(125,230,255,0.32)';
  context.lineWidth = 3;
  context.strokeRect(64, height - 174, width * 0.56, 118);
  context.fillStyle = colors.cyan;
  context.font = 'bold 28px monospace';
  context.fillText('CASO ACTIVO', 94, height - 146);
  context.fillStyle = colors.text;
  context.font = 'bold 44px monospace';
  context.fillText('INVESTIGACION GCPD', 94, height - 110);
  context.fillStyle = colors.muted;
  context.font = '24px monospace';
  context.fillText('Esenciales recopilados en la escena.', 94, height - 62);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useCardTexture = (options) => {
  const texture = useMemo(() => createCardTexture(options), [options]);

  useEffect(() => {
    return () => {
      texture?.dispose?.();
    };
  }, [texture]);

  return texture;
};

const useHeroTexture = (options) => {
  const texture = useMemo(() => createHeroTexture(options), [options]);

  useEffect(() => {
    return () => {
      texture?.dispose?.();
    };
  }, [texture]);

  return texture;
};

const TexturedPlane = ({
  name,
  position,
  args,
  texture,
  renderOrder = 10,
  onClick,
  onPointerEnter,
  onPointerLeave,
}) => (
  <mesh
    name={name}
    position={position}
    onClick={onClick}
    onPointerEnter={onPointerEnter}
    onPointerLeave={onPointerLeave}
    renderOrder={renderOrder}
    pointerEventsType={onClick ? QUEST_RAY_POINTER_EVENTS : undefined}
    pointerEventsOrder={onClick ? 30 : undefined}
  >
    <planeGeometry args={args} />
    <meshBasicMaterial map={texture || null} {...QUEST_UI_MATERIAL_PROPS} />
  </mesh>
);

const HoloPlate = ({
  name,
  position,
  size,
  color = QUEST_UI_COLORS.cyan,
  opacity = 0.08,
  renderOrder = 1,
}) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial
      color={color}
      opacity={opacity}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  </mesh>
);

const HoloTrace = ({
  name,
  position,
  size,
  color = QUEST_UI_COLORS.cyan,
  opacity = 0.72,
  renderOrder = 20,
}) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial
      color={color}
      opacity={opacity}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  </mesh>
);

const DashboardCard = ({
  name,
  position,
  size,
  textureOptions,
  onClick,
  renderOrder = 12,
}) => {
  const [hovered, setHovered] = useState(false);
  const texture = useCardTexture({
    ...textureOptions,
    active: textureOptions.active || hovered,
  });

  return (
    <group position={position} scale={hovered ? 1.035 : 1}>
      <HoloPlate
        name={`${name}_Glow`}
        position={[0, 0, -0.01]}
        size={[size[0] + 0.05, size[1] + 0.05]}
        opacity={textureOptions.active || hovered ? 0.1 : 0.025}
        renderOrder={renderOrder - 2}
      />
      <TexturedPlane
        name={name}
        position={[0, 0, 0]}
        args={size}
        texture={texture}
        renderOrder={renderOrder}
        onClick={onClick}
        onPointerEnter={onClick ? () => setHovered(true) : undefined}
        onPointerLeave={onClick ? () => setHovered(false) : undefined}
      />
    </group>
  );
};

const RailButton = ({ item, index, onSelect }) => {
  const layout = QUEST_UI_LAYOUT.rail;
  const y = 0.46 - index * (layout.buttonHeight + layout.gap);
  return (
    <DashboardCard
      name={`GCPD_Quest_ActionButton_${item.id}`}
      position={[layout.x, y, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.rail]}
      size={[layout.buttonWidth, layout.buttonHeight]}
      onClick={item.disabled ? undefined : () => onSelect?.(item.id)}
      textureOptions={{
        eyebrow: '',
        title: item.label,
        body: item.description,
        meta: item.meta,
        width: 620,
        height: 210,
        active: item.active,
        dense: true,
      }}
    />
  );
};

const ModuleRail = ({ items, onSelect }) => (
  <group
    name="GCPD_Quest_ModuleRail"
    rotation={QUEST_UI_LAYOUT.rotation.rail}
  >
    <HoloPlate
      name="GCPD_Quest_ModuleRail_Aura"
      position={[QUEST_UI_LAYOUT.rail.x, 0, QUEST_UI_LAYOUT.z.halo + QUEST_UI_LAYOUT.depth.rail]}
      size={[QUEST_UI_LAYOUT.rail.width + 0.14, QUEST_UI_LAYOUT.rail.height + 0.2]}
      opacity={0.035}
    />
    <mesh position={[QUEST_UI_LAYOUT.rail.x, 0, QUEST_UI_LAYOUT.z.panel + QUEST_UI_LAYOUT.depth.rail]} renderOrder={2}>
      <planeGeometry args={[QUEST_UI_LAYOUT.rail.width, QUEST_UI_LAYOUT.rail.height]} />
      <meshStandardMaterial
        color={QUEST_UI_COLORS.panel}
        opacity={0.62}
        metalness={0.08}
        roughness={0.62}
        {...QUEST_PANEL_MATERIAL_PROPS}
      />
    </mesh>
    <HoloTrace
      name="GCPD_Quest_ModuleRail_LeftTrace"
      position={[QUEST_UI_LAYOUT.rail.x - 0.29, 0, QUEST_UI_LAYOUT.z.floating + QUEST_UI_LAYOUT.depth.rail]}
      size={[0.012, QUEST_UI_LAYOUT.rail.height + 0.1]}
      opacity={0.85}
    />
    <DashboardCard
      name="GCPD_Quest_InfoCard_rail_header"
      position={[QUEST_UI_LAYOUT.rail.x, 0.64, QUEST_UI_LAYOUT.z.text + QUEST_UI_LAYOUT.depth.rail]}
      size={[0.48, 0.16]}
      textureOptions={{
        eyebrow: 'GCPD VR',
        title: 'MODULOS',
        body: '',
        width: 560,
        height: 160,
        dense: true,
      }}
    />
    {items.map((item, index) => (
      <RailButton key={item.id} item={item} index={index} onSelect={onSelect} />
    ))}
  </group>
);

const CentralPanel = ({
  title,
  subtitle,
  focusBody,
  detailTitle,
  detailBody,
  onSelect,
}) => {
  const layout = QUEST_UI_LAYOUT.central;
  const caseTitle = String(subtitle || '').split('·')[0]?.trim() || 'ESCENA DEL CRIMEN';
  const heroTexture = useHeroTexture({
    title,
    subtitle,
    caseTitle,
  });

  return (
    <group
      name="GCPD_Quest_CentralPanel"
      rotation={QUEST_UI_LAYOUT.rotation.central}
    >
      <HoloPlate
      name="GCPD_Quest_CentralPanel_Aura"
      position={[layout.x, layout.y, QUEST_UI_LAYOUT.z.halo + QUEST_UI_LAYOUT.depth.central]}
      size={[layout.width + 0.28, layout.height + 0.26]}
      opacity={0.045}
      />
      <mesh position={[layout.x, layout.y, QUEST_UI_LAYOUT.z.panel + QUEST_UI_LAYOUT.depth.central]} renderOrder={2}>
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial
          color={QUEST_UI_COLORS.panelSoft}
          opacity={0.7}
          metalness={0.1}
          roughness={0.54}
          {...QUEST_PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloTrace
        name="GCPD_Quest_CentralPanel_TopTrace"
        position={[layout.x, 0.66, QUEST_UI_LAYOUT.z.floating + QUEST_UI_LAYOUT.depth.central]}
        size={[layout.width + 0.18, 0.014]}
        opacity={0.9}
      />
      <TexturedPlane
        name="GCPD_Quest_InfoCard_operation_header"
        position={[layout.x, 0.34, QUEST_UI_LAYOUT.z.text + QUEST_UI_LAYOUT.depth.central + 0.015]}
        args={[1.42, 0.64]}
        texture={heroTexture}
        renderOrder={14}
      />
      <DashboardCard
        name="GCPD_Quest_InfoCard_lead_status"
        position={[-0.12, -0.2, QUEST_UI_LAYOUT.z.text + QUEST_UI_LAYOUT.depth.central + 0.075]}
        size={[1.08, 0.3]}
        textureOptions={{
          eyebrow: 'LEAD / STATUS',
          title: detailTitle || 'EN LINEA',
          body: `${detailBody || focusBody || ''}`,
          meta: 'Det. Gordon en linea',
          width: 1180,
          height: 300,
        }}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_case_open"
        position={[-0.49, -0.51, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.central + 0.095]}
        size={[0.52, 0.18]}
        textureOptions={{
          title: 'ABRIR CASO',
          body: '',
          meta: 'Ray select',
          width: 560,
          height: 180,
          dense: true,
          active: true,
        }}
        onClick={() => onSelect?.('operacion:casos')}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_map_open"
        position={[0.1, -0.51, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.central + 0.105]}
        size={[0.52, 0.18]}
        textureOptions={{
          title: 'VER MAPA',
          body: '',
          meta: 'Vinculo',
          width: 560,
          height: 180,
          dense: true,
        }}
        onClick={() => onSelect?.('operacion:mapa')}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_tools_open"
        position={[0.69, -0.51, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.central + 0.115]}
        size={[0.52, 0.18]}
        textureOptions={{
          title: 'HERRAMIENTAS',
          body: '',
          meta: 'Forense',
          width: 620,
          height: 180,
          dense: true,
        }}
        onClick={() => onSelect?.('operacion:herramientas')}
      />
    </group>
  );
};

const RightColumn = ({ items, onSelect }) => {
  const layout = QUEST_UI_LAYOUT.right;
  const activity = items.slice(0, 3);

  return (
    <group
      name="GCPD_Quest_RightColumn"
      rotation={QUEST_UI_LAYOUT.rotation.right}
    >
      <HoloPlate
      name="GCPD_Quest_RightColumn_Aura"
      position={[layout.x, layout.y, QUEST_UI_LAYOUT.z.halo + QUEST_UI_LAYOUT.depth.right]}
      size={[layout.width + 0.16, layout.height + 0.2]}
      opacity={0.035}
      />
      <mesh position={[layout.x, layout.y, QUEST_UI_LAYOUT.z.panel + QUEST_UI_LAYOUT.depth.right]} renderOrder={2}>
        <planeGeometry args={[layout.width, layout.height]} />
        <meshStandardMaterial
          color={QUEST_UI_COLORS.panel}
          opacity={0.58}
          metalness={0.08}
          roughness={0.58}
          {...QUEST_PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloTrace
        name="GCPD_Quest_RightColumn_RightTrace"
        position={[layout.x + 0.36, 0.12, QUEST_UI_LAYOUT.z.floating + QUEST_UI_LAYOUT.depth.right]}
        size={[0.012, layout.height + 0.08]}
        opacity={0.78}
      />
      <DashboardCard
        name="GCPD_Quest_InfoCard_recent_activity"
        position={[layout.x, 0.42, QUEST_UI_LAYOUT.z.text + QUEST_UI_LAYOUT.depth.right]}
        size={[0.62, 0.44]}
        textureOptions={{
          eyebrow: 'ACTIVIDAD RECIENTE',
          title: activity[0]?.label || 'SIN EVENTOS',
          body: activity.map((entry) => entry.description).join(' '),
          meta: 'Sincronia activa',
          width: 700,
          height: 420,
        }}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_quick_cases"
        position={[1.0, -0.01, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.right + 0.03]}
        size={[0.28, 0.2]}
        textureOptions={{
          title: 'CASOS',
          body: '',
          width: 320,
          height: 180,
          dense: true,
        }}
        onClick={() => onSelect?.('operacion:casos')}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_quick_map"
        position={[1.34, -0.01, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.right + 0.04]}
        size={[0.28, 0.2]}
        textureOptions={{
          title: 'MAPA',
          body: '',
          width: 320,
          height: 180,
          dense: true,
        }}
        onClick={() => onSelect?.('operacion:mapa')}
      />
      <DashboardCard
        name="GCPD_Quest_ActionButton_quick_tools"
        position={[layout.x, -0.29, QUEST_UI_LAYOUT.z.interactive + QUEST_UI_LAYOUT.depth.right + 0.055]}
        size={[0.62, 0.2]}
        textureOptions={{
          eyebrow: 'ACCESOS RAPIDOS',
          title: 'EVIDENCIAS',
          body: 'STL, audio, balistica y dial',
          width: 700,
          height: 190,
          dense: true,
        }}
        onClick={() => onSelect?.('operacion:herramientas')}
      />
    </group>
  );
};

const StatusStrip = ({ subtitle, hint }) => (
  <group
    name="GCPD_Quest_StatusStrip"
    rotation={QUEST_UI_LAYOUT.rotation.status}
  >
    <HoloPlate
      name="GCPD_Quest_StatusStrip_Aura"
      position={[QUEST_UI_LAYOUT.status.x, QUEST_UI_LAYOUT.status.y, QUEST_UI_LAYOUT.z.halo + QUEST_UI_LAYOUT.depth.status]}
      size={[QUEST_UI_LAYOUT.status.width + 0.16, QUEST_UI_LAYOUT.status.height + 0.1]}
      opacity={0.025}
    />
    <mesh position={[QUEST_UI_LAYOUT.status.x, QUEST_UI_LAYOUT.status.y, QUEST_UI_LAYOUT.z.panel + QUEST_UI_LAYOUT.depth.status]} renderOrder={2}>
      <planeGeometry args={[QUEST_UI_LAYOUT.status.width, QUEST_UI_LAYOUT.status.height]} />
      <meshStandardMaterial
        color={QUEST_UI_COLORS.panel}
        opacity={0.34}
        metalness={0.06}
        roughness={0.62}
        {...QUEST_PANEL_MATERIAL_PROPS}
      />
    </mesh>
    <DashboardCard
      name="GCPD_Quest_InfoCard_status_telemetry"
      position={[QUEST_UI_LAYOUT.status.x, QUEST_UI_LAYOUT.status.y, QUEST_UI_LAYOUT.z.text + QUEST_UI_LAYOUT.depth.status]}
      size={[1.9, 0.16]}
      textureOptions={{
        eyebrow: 'ALERTA ALTA  //  SINCRONIA ACTIVA  //  MODULO OPERACION',
        title: 'DET. GORDON EN LINEA',
        body: `${truncate(hint || subtitle, 112)}`,
        meta: 'Ray + stick listos',
        width: 1800,
        height: 170,
        dense: true,
        active: false,
      }}
    />
  </group>
);

const buildRailItems = (items) => {
  const byId = new Map(items.map((entry) => [entry.id, entry]));
  return [
    {
      id: 'operacion:actual',
      label: 'OPERACION ACTUAL',
      description: 'Centro de mando',
      active: true,
      disabled: true,
    },
    {
      id: 'operacion:casos',
      label: 'CASOS',
      description: truncate(byId.get('operacion:casos')?.description, 38),
      active: false,
    },
    {
      id: 'operacion:mapa',
      label: 'MAPA',
      description: truncate(byId.get('operacion:mapa')?.description, 38),
    },
    {
      id: 'operacion:perfiles',
      label: 'PERFILES',
      description: truncate(byId.get('operacion:perfiles')?.description, 38),
    },
    {
      id: 'operacion:herramientas',
      label: 'HERRAMIENTAS',
      description: truncate(byId.get('operacion:herramientas')?.description, 38),
    },
  ];
};

const QuestOperationsDashboard = ({
  title,
  subtitle,
  focusTitle,
  focusBody,
  detailTitle,
  detailBody,
  items = [],
  hint,
  onSelect,
  position = [0, 0, 0],
  scale = 1,
}) => {
  const railItems = useMemo(() => buildRailItems(items), [items]);

  return (
    <group name="GCPD_Quest_MainDashboard" position={position} scale={scale}>
      <HoloPlate
        name="GCPD_Quest_MainDashboard_Volume"
        position={[0, 0.03, QUEST_UI_LAYOUT.z.base]}
        size={[QUEST_UI_LAYOUT.width + 0.18, QUEST_UI_LAYOUT.height + 0.14]}
        opacity={0.025}
        renderOrder={0}
      />
      <mesh position={[0, 0, QUEST_UI_LAYOUT.z.base]} renderOrder={0}>
        <planeGeometry args={[QUEST_UI_LAYOUT.width, QUEST_UI_LAYOUT.height]} />
        <meshStandardMaterial
          color={QUEST_UI_COLORS.bg}
          opacity={0.12}
          metalness={0.14}
          roughness={0.58}
          {...QUEST_PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloTrace
        name="GCPD_Quest_MainDashboard_Horizon"
        position={[0, 0.78, QUEST_UI_LAYOUT.z.floating + 0.02]}
        size={[QUEST_UI_LAYOUT.width - 0.08, 0.016]}
        opacity={0.96}
      />
      <HoloTrace
        name="GCPD_Quest_MainDashboard_FloorTrace"
        position={[0.08, -0.66, QUEST_UI_LAYOUT.z.floating + 0.16]}
        size={[2.76, 0.01]}
        opacity={0.42}
      />
      <mesh position={[0, 0.78, QUEST_UI_LAYOUT.z.panel]} renderOrder={1}>
        <planeGeometry args={[QUEST_UI_LAYOUT.width - 0.12, 0.02]} />
        <meshBasicMaterial
          color={QUEST_UI_COLORS.cyan}
          opacity={0.32}
          {...QUEST_UI_MATERIAL_PROPS}
        />
      </mesh>
      <ModuleRail items={railItems} onSelect={onSelect} />
      <CentralPanel
        title={title}
        subtitle={subtitle}
        focusTitle={focusTitle}
        focusBody={focusBody}
        detailTitle={detailTitle}
        detailBody={detailBody}
        onSelect={onSelect}
      />
      <RightColumn items={items} onSelect={onSelect} />
      <StatusStrip subtitle={subtitle} hint={hint} />
    </group>
  );
};

export default QuestOperationsDashboard;
