/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import {
  QUEST_PANEL_MATERIAL_PROPS,
  QUEST_RAY_POINTER_EVENTS,
  QUEST_UI_COLORS,
  QUEST_UI_MATERIAL_PROPS,
} from './questUiTokens';

const SECTION = {
  width: 3.34,
  height: 1.78,
  leftX: -1.15,
  centerX: -0.12,
  rightX: 1.18,
};
const MAP_TEXTURE_URL = '/mapa.png';
const MAP_PREVIEW_WIDTH = 1.36;
const MAP_PREVIEW_HEIGHT = MAP_PREVIEW_WIDTH * 0.744;
const truncate = (value, max = 92) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

const humanizeResourceName = (value = '') => {
  const fileName = String(value || '').split('/').pop().replace(/\.[a-z0-9]+$/i, '');
  return fileName
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const getResourceDisplayLabel = (resource = {}) => {
  const raw =
    resource?.label ||
    resource?.title ||
    resource?.name ||
    'SIN LABEL';
  const text = String(raw || '').trim();
  if (!text) return 'SIN LABEL';
  if (text.includes('/') || text.includes('\\') || /\.[a-z0-9]{2,5}$/i.test(text)) return 'SIN LABEL';
  return /[_-]/.test(text) ? humanizeResourceName(text) : text;
};

const getResourceDisplayBody = (resource = {}) =>
  resource?.description ||
  resource?.summary ||
  resource?.caption ||
  `${resource?.type || 'recurso'} asociado al POI.`;

const words = (text) => String(text || '').split(/\s+/).filter(Boolean);

const drawWrapped = ({ context, text, x, y, maxWidth, lineHeight, maxLines }) => {
  const source = words(text);
  if (!source.length) return;

  const lines = [];
  let current = source[0];
  for (let index = 1; index < source.length; index += 1) {
    const candidate = `${current} ${source[index]}`;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }
    lines.push(current);
    current = source[index];
    if (lines.length >= maxLines - 1) break;
  }
  if (lines.length < maxLines) lines.push(current);

  const visible = lines.slice(0, maxLines);
  if (words(visible.join(' ')).length < source.length) {
    let clipped = visible[visible.length - 1];
    while (clipped.length > 3 && context.measureText(`${clipped}...`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    visible[visible.length - 1] = `${clipped}...`;
  }

  visible.forEach((line, index) => {
    context.fillText(line, x, y + index * lineHeight);
  });
};

const drawFrame = ({ context, width, height, active = false, danger = false }) => {
  const colors = QUEST_UI_COLORS;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, active ? '#0d3c64' : '#071827');
  gradient.addColorStop(0.48, active ? '#061a31' : '#050f19');
  gradient.addColorStop(1, '#02070c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  const glow = context.createRadialGradient(width * 0.5, height * 0.08, 20, width * 0.5, height * 0.2, width * 0.72);
  glow.addColorStop(0, active ? 'rgba(125,230,255,0.2)' : 'rgba(125,230,255,0.07)');
  glow.addColorStop(0.48, active ? 'rgba(23,105,255,0.08)' : 'rgba(23,105,255,0.025)');
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, width, height);

  context.fillStyle = active ? 'rgba(23,105,255,0.24)' : 'rgba(125,230,255,0.06)';
  context.beginPath();
  context.moveTo(width * 0.08, 22);
  context.lineTo(width * 0.78, 22);
  context.lineTo(width * 0.6, height - 22);
  context.lineTo(width * 0.02, height - 22);
  context.closePath();
  context.fill();

  context.strokeStyle = active ? 'rgba(188,239,255,0.18)' : 'rgba(125,230,255,0.08)';
  context.lineWidth = 1;
  for (let y = 52; y < height - 28; y += 18) {
    context.beginPath();
    context.moveTo(24, y);
    context.lineTo(width - 24, y + Math.sin(y / 19) * 2);
    context.stroke();
  }

  context.shadowColor = danger ? colors.red : active ? colors.cyanBright : colors.border;
  context.shadowBlur = active ? 28 : 10;
  context.strokeStyle = danger ? colors.red : active ? colors.cyan : colors.borderSoft;
  context.lineWidth = active ? 6 : 3;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = danger ? 'rgba(255,74,74,0.28)' : active ? 'rgba(23,105,255,0.5)' : 'rgba(125,230,255,0.1)';
  context.fillRect(24, 24, width - 48, 10);
  context.fillStyle = danger ? colors.red : active ? colors.cyanBright : colors.cyan;
  context.fillRect(24, 24, Math.max(48, width * 0.26), 10);

  const corner = Math.min(48, height * 0.22);
  context.strokeStyle = danger ? colors.red : colors.cyan;
  context.lineWidth = 3;
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
};

const createPanelTexture = ({
  eyebrow = '',
  title = '',
  body = '',
  meta = '',
  width = 900,
  height = 300,
  active = false,
  danger = false,
  compact = false,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const colors = QUEST_UI_COLORS;
  drawFrame({ context, width, height, active, danger });

  context.textAlign = 'left';
  context.textBaseline = 'top';
  if (eyebrow) {
    context.fillStyle = active ? colors.cyanBright : colors.cyan;
    context.font = `bold ${compact ? 24 : 30}px monospace`;
    context.fillText(String(eyebrow).toUpperCase(), 44, compact ? 38 : 44);
  }

  context.fillStyle = danger ? colors.red : colors.text;
  context.font = `bold ${compact ? 34 : 54}px monospace`;
  context.shadowColor = active ? 'rgba(125,230,255,0.5)' : 'rgba(0,0,0,0)';
  context.shadowBlur = active ? 10 : 0;
  context.fillText(String(title || '').toUpperCase(), 44, compact ? 74 : 88);
  context.shadowBlur = 0;

  if (body) {
    context.fillStyle = colors.muted;
    context.font = `${compact ? 22 : 30}px monospace`;
    drawWrapped({
      context,
      text: body,
      x: 44,
      y: compact ? 120 : 156,
      maxWidth: width - 88,
      lineHeight: compact ? 29 : 40,
      maxLines: compact ? 2 : 4,
    });
  }

  if (meta) {
    context.fillStyle = danger ? colors.red : active ? colors.green : colors.cyan;
    context.font = `bold ${compact ? 20 : 25}px monospace`;
    context.fillText(String(meta).toUpperCase(), 44, height - (compact ? 42 : 52));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const getWorkspaceMode = ({ title, focusTitle, instrument }) => {
  if (instrument) {
    const toolName = String(focusTitle || '').toLowerCase();
    if (toolName.includes('bal')) return 'ballistics';
    if (toolName.includes('audio')) return 'audio';
    if (toolName.includes('comunic')) return 'comms';
    if (toolName.includes('rast')) return 'trace';
    return 'evidence';
  }

  const moduleName = String(title || '').toLowerCase();
  if (moduleName.includes('mapa')) return 'map';
  if (moduleName.includes('perfil')) return 'profile';
  return 'case';
};

const drawGrid = ({ context, width, height, color = 'rgba(125,230,255,0.1)' }) => {
  context.strokeStyle = color;
  context.lineWidth = 1;
  for (let x = 52; x < width - 52; x += 52) {
    context.beginPath();
    context.moveTo(x, 96);
    context.lineTo(x, height - 54);
    context.stroke();
  }
  for (let y = 112; y < height - 42; y += 42) {
    context.beginPath();
    context.moveTo(44, y);
    context.lineTo(width - 44, y);
    context.stroke();
  }
};

const drawModuleVisual = ({ context, width, height, mode, colors }) => {
  drawGrid({ context, width, height });

  if (mode === 'map') {
    context.fillStyle = 'rgba(38,226,138,0.06)';
    context.fillRect(54, 98, width - 108, height - 172);
    context.strokeStyle = 'rgba(38,226,138,0.26)';
    context.lineWidth = 3;
    context.strokeRect(54, 98, width - 108, height - 172);
    context.fillStyle = colors.green;
    context.font = 'bold 28px monospace';
    context.fillText('MAPA TACTICO / POIS', 84, 122);
    return;
  }

  if (mode === 'profile') {
    context.strokeStyle = 'rgba(125,230,255,0.42)';
    context.lineWidth = 5;
    context.beginPath();
    context.arc(width * 0.36, height * 0.46, 118, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(width * 0.36, height * 0.39, 44, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(width * 0.26, height * 0.66);
    context.quadraticCurveTo(width * 0.36, height * 0.55, width * 0.46, height * 0.66);
    context.stroke();

    context.fillStyle = 'rgba(23,105,255,0.16)';
    context.fillRect(width * 0.58, 150, 260, 38);
    context.fillRect(width * 0.58, 218, 210, 38);
    context.fillRect(width * 0.58, 286, 300, 38);
    context.fillStyle = colors.red;
    context.font = 'bold 34px monospace';
    context.fillText('THREAT VECTOR', width * 0.58, 98);
    return;
  }

  if (mode === 'case') {
    context.fillStyle = 'rgba(3,12,20,0.56)';
    context.fillRect(78, 136, width - 156, 210);
    context.strokeStyle = 'rgba(125,230,255,0.3)';
    context.lineWidth = 3;
    context.strokeRect(78, 136, width - 156, 210);
    context.fillStyle = 'rgba(23,105,255,0.18)';
    context.fillRect(108, 168, 270, 38);
    context.fillRect(108, 234, 360, 28);
    context.fillRect(108, 288, 240, 28);
    context.fillStyle = colors.red;
    context.font = 'bold 34px monospace';
    context.fillText('ALTA', width - 228, 168);
    context.fillStyle = colors.green;
    context.font = 'bold 26px monospace';
    context.fillText('ACTIVO', width - 232, 224);
    return;
  }

  if (mode === 'ballistics') {
    const drawTrace = (x, y) => {
      context.strokeStyle = colors.green;
      context.lineWidth = 4;
      context.beginPath();
      for (let i = 0; i < 280; i += 8) {
        const px = x + i;
        const py = y + Math.sin(i / 17) * 18 + Math.sin(i / 7) * 7;
        if (i === 0) context.moveTo(px, py);
        else context.lineTo(px, py);
      }
      context.stroke();
      context.strokeStyle = 'rgba(38,226,138,0.28)';
      context.strokeRect(x - 6, y - 44, 292, 88);
    };

    drawTrace(112, 212);
    drawTrace(572, 212);
    context.strokeStyle = colors.green;
    context.lineWidth = 14;
    context.beginPath();
    context.arc(width / 2, 245, 82, -Math.PI / 2, Math.PI * 1.72);
    context.stroke();
    context.fillStyle = colors.green;
    context.font = 'bold 78px monospace';
    context.textAlign = 'center';
    context.fillText('94%', width / 2, 206);
    context.font = 'bold 26px monospace';
    context.fillText('MATCH', width / 2, 294);
    context.textAlign = 'left';
    return;
  }

  if (mode === 'audio') {
    context.strokeStyle = colors.green;
    context.lineWidth = 4;
    context.beginPath();
    for (let i = 0; i < 780; i += 6) {
      const x = 100 + i;
      const y = 260 + Math.sin(i / 14) * 46 + Math.sin(i / 5) * 14;
      if (i === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();
    context.fillStyle = 'rgba(38,226,138,0.18)';
    for (let i = 0; i < 22; i += 1) {
      const h = 24 + ((i * 19) % 94);
      context.fillRect(120 + i * 34, 360 - h, 16, h);
    }
    return;
  }

  if (mode === 'trace' || mode === 'comms') {
    context.strokeStyle = colors.cyan;
    context.lineWidth = 4;
    context.beginPath();
    context.arc(280, 262, 92, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(670, 236, 120, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(370, 252);
    context.lineTo(550, 236);
    context.stroke();
    context.fillStyle = colors.green;
    context.fillRect(210, 250, 140, 24);
    context.fillRect(600, 224, 140, 24);
    return;
  }

  if (mode === 'evidence') {
    context.strokeStyle = 'rgba(125,230,255,0.48)';
    context.lineWidth = 3;
    context.beginPath();
    context.moveTo(190, 330);
    context.lineTo(520, 176);
    context.lineTo(770, 210);
    context.lineTo(560, 380);
    context.closePath();
    context.stroke();
    context.fillStyle = 'rgba(125,230,255,0.08)';
    context.fill();
    context.fillStyle = colors.cyan;
    context.font = 'bold 30px monospace';
    context.fillText('STL VIEWER', 120, 126);
    return;
  }

  context.strokeStyle = colors.cyan;
  context.lineWidth = 4;
  context.strokeRect(108, 142, width - 216, height - 232);
  context.fillStyle = 'rgba(23,105,255,0.12)';
  context.fillRect(130, 166, width - 260, height - 278);
};

const createWorkspaceTexture = ({
  mode = 'case',
  title = '',
  body = '',
  meta = '',
  lines = [],
  width = 1100,
  height = 520,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const colors = QUEST_UI_COLORS;
  drawFrame({ context, width, height, active: true });
  drawModuleVisual({ context, width, height, mode, colors });

  context.textAlign = 'left';
  context.textBaseline = 'top';
  context.fillStyle = colors.cyanBright;
  context.font = 'bold 28px monospace';
  context.fillText(String(meta || mode).toUpperCase(), 44, 42);
  context.fillStyle = colors.text;
  context.font = 'bold 48px monospace';
  context.fillText(String(title || 'WORKSPACE').toUpperCase(), 44, 82);
  context.fillStyle = colors.muted;
  context.font = '26px monospace';
  drawWrapped({
    context,
    text: body,
    x: 44,
    y: mode === 'map' ? height - 104 : height - 154,
    maxWidth: width - 88,
    lineHeight: 34,
    maxLines: 2,
  });

  if (mode !== 'map' && lines.length) {
    context.fillStyle = 'rgba(3,12,20,0.68)';
    context.fillRect(58, height - 238, width - 116, 166);
    context.strokeStyle = 'rgba(125,230,255,0.24)';
    context.lineWidth = 2;
    context.strokeRect(58, height - 238, width - 116, 166);
    context.fillStyle = colors.cyan;
    context.font = 'bold 22px monospace';
    context.fillText('AGENT NOTES', 78, height - 222);
    context.fillStyle = colors.text;
    context.font = '19px monospace';
    lines.slice(0, 5).forEach((line, index) => {
      context.fillText(`> ${truncate(line, 96).toUpperCase()}`, 78, height - 190 + index * 27);
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const usePanelTexture = (options) => {
  const texture = useMemo(() => createPanelTexture(options), [options]);

  useEffect(() => {
    return () => texture?.dispose?.();
  }, [texture]);

  return texture;
};

const useWorkspaceTexture = (options) => {
  const texture = useMemo(() => createWorkspaceTexture(options), [options]);

  useEffect(() => {
    return () => texture?.dispose?.();
  }, [texture]);

  return texture;
};

const createMapOverlayTexture = ({ items = [], selectedId = '', width = 1400, height = 1040 }) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, width, height);
  context.textBaseline = 'middle';
  context.font = 'bold 25px monospace';

  const placedLabels = [];
  const sortedItems = [...items].sort((a, b) => {
    const score = (item) =>
      (item.id === selectedId || item.accent ? 1000 : 0) +
      (item.resourceCount ? 250 : 0) +
      (item.image ? 100 : 0);
    return score(b) - score(a);
  });

  sortedItems.forEach((item) => {
    const x = (Number(item.x) / 100) * width;
    const y = (Number(item.y) / 100) * height;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;

    const active = item.id === selectedId || Boolean(item.accent);
    const color = active ? '#d9f4ff' : '#26e28a';
    const radius = active ? 20 : 7;
    const label = String(item.label || 'POI').toUpperCase().slice(0, active ? 22 : 16);
    const labelWidth = Math.min(active ? 360 : 260, Math.max(108, context.measureText(label).width + 42));
    const labelX = Math.min(width - labelWidth - 18, x + 24);
    const labelY = Math.max(22, Math.min(height - 22, y - 10));
    const labelBox = {
      x: labelX - 8,
      y: labelY - 24,
      width: labelWidth + 16,
      height: 48,
    };
    const overlaps = placedLabels.some((box) =>
      labelBox.x < box.x + box.width &&
      labelBox.x + labelBox.width > box.x &&
      labelBox.y < box.y + box.height &&
      labelBox.y + labelBox.height > box.y
    );
    const shouldLabel = active || (item.resourceCount && !overlaps) || (!overlaps && placedLabels.length < 7);

    context.shadowColor = color;
    context.shadowBlur = active ? 18 : 10;
    context.strokeStyle = color;
    context.lineWidth = active ? 6 : 3;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(x, y, Math.max(4, radius * 0.34), 0, Math.PI * 2);
    context.fillStyle = active ? 'rgba(217,244,255,0.9)' : 'rgba(38,226,138,0.58)';
    context.fill();

    if (shouldLabel) {
      placedLabels.push(labelBox);
      context.shadowBlur = active ? 16 : 6;
      context.fillStyle = active ? 'rgba(8,23,35,0.92)' : 'rgba(5,15,22,0.76)';
      context.strokeStyle = active ? '#d9f4ff' : '#26e28a';
      context.lineWidth = active ? 4 : 2;
      context.fillRect(labelX, labelY - 18, labelWidth, 36);
      context.strokeRect(labelX, labelY - 18, labelWidth, 36);
      context.fillStyle = color;
      context.shadowBlur = 0;
      context.fillText(label, labelX + 14, labelY + 1);

      if (item.resourceCount) {
        context.fillStyle = '#ffbc42';
        context.font = 'bold 20px monospace';
        context.fillText(`${item.resourceCount}R`, labelX + labelWidth - 38, labelY + 1);
        context.font = 'bold 25px monospace';
      }
    }
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useMapOverlayTexture = ({ items, selectedId }) => {
  const texture = useMemo(
    () => createMapOverlayTexture({ items, selectedId }),
    [items, selectedId]
  );

  useEffect(() => () => texture?.dispose?.(), [texture]);

  return texture;
};

const HoloPlate = ({ name, position, size, opacity = 0.04, renderOrder = 1 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial
      color={QUEST_UI_COLORS.cyan}
      opacity={opacity}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  </mesh>
);

const HoloLine = ({ name, position, size, opacity = 0.76, renderOrder = 20 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial
      color={QUEST_UI_COLORS.cyan}
      opacity={opacity}
      transparent
      depthWrite={false}
      side={THREE.DoubleSide}
      toneMapped={false}
    />
  </mesh>
);

const mapPercentToLocal = (x, y, width = MAP_PREVIEW_WIDTH, height = MAP_PREVIEW_HEIGHT) => [
  (Number(x) / 100 - 0.5) * width,
  (0.5 - Number(y) / 100) * height,
];

const Card = ({ name, position, size, textureOptions, onClick, renderOrder = 12 }) => {
  const [hovered, setHovered] = useState(false);
  const texture = usePanelTexture({
    ...textureOptions,
    active: textureOptions.active || hovered,
  });

  return (
    <group position={position} scale={hovered ? 1.025 : 1}>
      <HoloPlate
        name={`${name}_Glow`}
        position={[0, 0, -0.012]}
        size={[size[0] + 0.04, size[1] + 0.04]}
        opacity={textureOptions.active || hovered ? 0.09 : 0.018}
        renderOrder={renderOrder - 2}
      />
      <mesh
        name={name}
        position={[0, 0, 0]}
        onClick={onClick}
        onPointerEnter={onClick ? () => setHovered(true) : undefined}
        onPointerLeave={onClick ? () => setHovered(false) : undefined}
        renderOrder={renderOrder}
        pointerEventsType={onClick ? QUEST_RAY_POINTER_EVENTS : undefined}
        pointerEventsOrder={onClick ? 32 : undefined}
      >
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture || null} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
};

const MapPoiMarker = ({ item, active, onSelect, mapWidth = MAP_PREVIEW_WIDTH, mapHeight = MAP_PREVIEW_HEIGHT }) => {
  const [hovered, setHovered] = useState(false);
  const [x, y] = mapPercentToLocal(item.x ?? 50, item.y ?? 50, mapWidth, mapHeight);
  const radius = Math.max(0.017, (Number(item.radius || 1.8) / 100) * mapWidth);
  const color = active || hovered ? QUEST_UI_COLORS.text : item.status ? QUEST_UI_COLORS.green : QUEST_UI_COLORS.cyan;
  const select = (event) => {
    event.stopPropagation();
    onSelect?.(item.id);
  };

  return (
    <group position={[x, y, 0.08]}>
      <mesh
        name={`GCPD_Quest_CentralMapPoi_Hit_${item.id}`}
        pointerEventsType={QUEST_RAY_POINTER_EVENTS}
        pointerEventsOrder={76}
        onPointerEnter={() => setHovered(true)}
        onPointerOver={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerOut={() => setHovered(false)}
        onClick={select}
        onPointerDown={select}
      >
        <circleGeometry args={[Math.max(0.045, radius * 2.65), 32]} />
        <meshBasicMaterial color={color} opacity={active || hovered ? 0.18 : 0.001} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.058]} renderOrder={72}>
        <circleGeometry args={[radius * (active || hovered ? 1.95 : 0.58), 32]} />
        <meshBasicMaterial color={color} opacity={active || hovered ? 0.64 : 0.22} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.068]} renderOrder={74}>
        <ringGeometry
          args={[
            radius * (active || hovered ? 1.9 : 0.72),
            radius * (active || hovered ? 2.36 : 0.98),
            32,
          ]}
        />
        <meshBasicMaterial color={color} opacity={active || hovered ? 1 : 0.36} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      {hovered && (
        <Card
          name={`GCPD_Quest_CentralMapPoi_Tooltip_${item.id}`}
          position={[0.21, 0.07, 0.06]}
          size={[0.36, 0.13]}
          renderOrder={84}
          textureOptions={{
            eyebrow: 'POI',
            title: item.label || item.id,
            body: item.description || item.summary || '',
            width: 430,
            height: 160,
            compact: true,
            active,
          }}
        />
      )}
    </group>
  );
};

const CentralMapPreview = ({
  items = [],
  selectedId,
  onSelect,
  width = MAP_PREVIEW_WIDTH,
  height = MAP_PREVIEW_HEIGHT,
  position = [-0.08, -0.02, 0.08],
}) => {
  const mapTexture = useLoader(THREE.TextureLoader, MAP_TEXTURE_URL);

  useEffect(() => {
    mapTexture.colorSpace = THREE.SRGBColorSpace;
  }, [mapTexture]);

  const mappableItems = items.filter((item) => Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)));
  const overlayTexture = useMapOverlayTexture({ items: mappableItems, selectedId });

  return (
    <group name="GCPD_Quest_CentralMapPreview" position={position}>
      <mesh position={[0, 0, -0.014]} renderOrder={24}>
        <planeGeometry args={[width + 0.06, height + 0.06]} />
        <meshBasicMaterial color="#02070d" opacity={0.94} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh renderOrder={25}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={mapTexture} color="#7fb6ff" opacity={0.88} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.022]} renderOrder={26}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color="#02101a" opacity={0.34} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.034]} renderOrder={27}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial color={QUEST_UI_COLORS.cyan} opacity={0.08} wireframe {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh name="GCPD_Quest_CentralMapPoi_Overlay" position={[0, 0, 0.066]} renderOrder={68}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={overlayTexture || null} opacity={0.96} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      {mappableItems.map((item) => (
        <MapPoiMarker
          key={item.id}
          item={item}
          active={item.id === selectedId || Boolean(item.accent)}
          onSelect={onSelect}
          mapWidth={width}
          mapHeight={height}
        />
      ))}
      <HoloLine
        name="GCPD_Quest_CentralMapPreview_Scanline"
        position={[0, height * 0.28, 0.075]}
        size={[width, 0.006]}
        opacity={0.7}
        renderOrder={44}
      />
    </group>
  );
};

const ImageResourcePreview = ({ resource, size, position = [0.18, -0.02, 0.08] }) => {
  const texture = useLoader(THREE.TextureLoader, resource.src || resource.thumbnail);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <mesh name="GCPD_Quest_MapResource_Image" position={position} renderOrder={32}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} color="#e6fbff" opacity={0.92} {...QUEST_UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const VideoResourcePreview = ({ resource, size, position = [0.18, -0.02, 0.08] }) => {
  const texture = useMemo(() => {
    if (!resource?.src || typeof document === 'undefined') return null;
    const video = document.createElement('video');
    video.src = resource.src;
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play?.().catch(() => {});
    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    return videoTexture;
  }, [resource?.src]);

  useEffect(() => () => texture?.dispose?.(), [texture]);

  return (
    <mesh name="GCPD_Quest_MapResource_Video" position={position} renderOrder={32}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture || null} color="#e6fbff" opacity={0.92} {...QUEST_UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const AudioResourcePreview = ({ resource, size, position = [0.18, -0.02, 0.08] }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useMemo(() => {
    if (!resource?.src || typeof Audio === 'undefined') return null;
    const audio = new Audio(resource.src);
    audio.onended = () => setPlaying(false);
    return audio;
  }, [resource?.src]);

  useEffect(() => () => audioRef?.pause?.(), [audioRef]);

  const toggle = () => {
    if (!audioRef) return;
    if (playing) {
      audioRef.pause();
      setPlaying(false);
      return;
    }
    audioRef.play?.().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  return (
    <group name="GCPD_Quest_MapResource_Audio" position={position}>
      <mesh renderOrder={30}>
        <planeGeometry args={size} />
        <meshBasicMaterial color="#04131d" opacity={0.82} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      {Array.from({ length: 26 }).map((_, index) => {
        const height = 0.035 + Math.abs(Math.sin(index * 0.72)) * (playing ? 0.22 : 0.12);
        return (
          <mesh key={index} position={[-0.43 + index * 0.036, 0.06, 0.04]} renderOrder={34}>
            <planeGeometry args={[0.012, height]} />
            <meshBasicMaterial
              color={playing ? QUEST_UI_COLORS.green : QUEST_UI_COLORS.cyan}
              opacity={playing ? 0.95 : 0.52}
              {...QUEST_UI_MATERIAL_PROPS}
            />
          </mesh>
        );
      })}
      <Card
        name="GCPD_Quest_MapResource_Audio_Play"
        position={[0, -0.22, 0.06]}
        size={[0.38, 0.14]}
        onClick={toggle}
        renderOrder={38}
        textureOptions={{
          title: playing ? 'PAUSA' : 'PLAY',
          body: getResourceDisplayLabel(resource),
          width: 420,
          height: 160,
          compact: true,
          active: playing,
        }}
      />
    </group>
  );
};

const ResourceFallbackPreview = ({ resource, size, position = [0.18, -0.02, 0.08] }) => (
  <Card
    name="GCPD_Quest_MapResource_Fallback"
    position={position}
    size={size}
    renderOrder={32}
    textureOptions={{
      eyebrow: resource?.type || 'RECURSO',
      title: resource ? getResourceDisplayLabel(resource) : 'SIN RECURSO',
      body: resource ? getResourceDisplayBody(resource) : 'El DM puede asociar imagen, video o audio a este POI.',
      meta: resource ? 'recurso DM' : 'sin fuente',
      width: 980,
      height: 620,
      active: Boolean(resource),
    }}
  />
);

const MapResourcePreview = ({ resource, size, position }) => {
  if (!resource) return <ResourceFallbackPreview resource={resource} size={size} position={position} />;
  if (resource.type === 'image' && (resource.src || resource.thumbnail)) {
    return <ImageResourcePreview resource={resource} size={size} position={position} />;
  }
  if (resource.type === 'video' && resource.src) {
    return <VideoResourcePreview resource={resource} size={size} position={position} />;
  }
  if (resource.type === 'audio' && resource.src) {
    return <AudioResourcePreview resource={resource} size={size} position={position} />;
  }
  return <ResourceFallbackPreview resource={resource} size={size} position={position} />;
};

const PoiImagePreview = ({ image, size, position = [0.43, 0.3, 0.18], renderOrder = 66 }) => {
  const texture = useLoader(THREE.TextureLoader, image);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <mesh name="GCPD_Quest_MapPoi_Image" position={position} renderOrder={renderOrder}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} color="#d8ffe8" opacity={0.9} {...QUEST_UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const MapPoiSidePanel = ({ item, body, lines = [], selectedResource = null, actions = [] }) => {
  const details = item?.details?.length ? item.details : lines;
  const intelBody = [
    body,
    details?.[0],
    details?.[1],
  ].filter(Boolean).join(' ');
  const resourceActions = actions.filter((action) => action.resource);
  const resourceCount = resourceActions.length || item?.resourceCount || 0;

  return (
    <group name="GCPD_Quest_MapPoi_SidePanel" rotation={[0, -0.22, 0]}>
      <HoloPlate
        name="GCPD_Quest_MapPoi_SidePanel_Aura"
        position={[SECTION.rightX, 0.12, 0.07]}
        size={[0.8, 1.34]}
        opacity={0.04}
      />
      {item?.image ? (
        <PoiImagePreview
          image={item.image}
          size={[0.62, 0.3]}
          position={[SECTION.rightX, 0.47, 0.22]}
          renderOrder={72}
        />
      ) : (
        <Card
          name="GCPD_Quest_MapPoi_NoImage"
          position={[SECTION.rightX, 0.47, 0.22]}
          size={[0.62, 0.3]}
          renderOrder={72}
          textureOptions={{
            eyebrow: 'EVIDENCIA',
            title: 'SIN IMAGEN',
            body: 'El DM puede asociar imagen de POI desde el panel de control.',
            width: 640,
            height: 320,
            compact: true,
          }}
        />
      )}
      <Card
        name="GCPD_Quest_MapPoi_PrimaryIntel"
        position={[SECTION.rightX, 0.16, 0.24]}
        size={[0.66, 0.26]}
        renderOrder={74}
        textureOptions={{
          eyebrow: 'FICHA POI',
          title: item?.label || 'SIN UBICACION',
          body: intelBody || 'Sin resumen operativo disponible.',
          meta: [
            item?.status ? String(item.status).toUpperCase() : 'SIN ESTADO',
            item?.district || 'SIN DISTRITO',
          ].join(' · '),
          width: 700,
          height: 500,
          compact: true,
          active: true,
        }}
      />
      {selectedResource ? (
        <>
          <MapResourcePreview
            resource={selectedResource}
            size={[0.64, 0.28]}
            position={[SECTION.rightX, -0.19, 0.22]}
          />
          <Card
            name="GCPD_Quest_MapPoi_ResourceMeta"
            position={[SECTION.rightX, -0.46, 0.25]}
            size={[0.66, 0.17]}
            renderOrder={76}
            textureOptions={{
              eyebrow: selectedResource.type || 'RECURSO QUEST',
              title: getResourceDisplayLabel(selectedResource),
              body: getResourceDisplayBody(selectedResource),
              meta: `${resourceCount} recurso(s) Quest`,
              width: 700,
              height: 190,
              compact: true,
              active: true,
            }}
          />
        </>
      ) : (
        <Card
          name="GCPD_Quest_MapPoi_ResourceEmpty"
          position={[SECTION.rightX, -0.28, 0.24]}
          size={[0.66, 0.22]}
          renderOrder={76}
          textureOptions={{
            eyebrow: 'RECURSOS QUEST',
            title: resourceCount ? 'SELECCIONA RECURSO' : 'SIN RECURSOS',
            body: resourceCount
              ? `${resourceCount} recurso(s) disponibles debajo.`
              : 'Este POI no tiene recursos especificos para Quest.',
            meta: item?.label || 'POI actual',
            width: 700,
            height: 240,
            compact: true,
          }}
        />
      )}
    </group>
  );
};

const MapWorkspaceCard = ({
  title,
  body,
  lines = [],
  mapItems = [],
  onSelect,
  position,
  size,
}) => {
  const headerTexture = useWorkspaceTexture({
    mode: 'map',
    title,
    body,
    meta: 'MAPA GOTHAM / POIS',
    lines,
  });
  const selectedMapItem = mapItems.find((item) => item.accent) || null;

  return (
    <group position={position}>
      <HoloPlate
        name="GCPD_Quest_MapWorkspace_Glow"
        position={[0, 0, -0.018]}
        size={[size[0] + 0.08, size[1] + 0.08]}
        opacity={0.06}
        renderOrder={8}
      />
      <mesh name="GCPD_Quest_MapWorkspace_Frame" position={[0, 0, -0.006]} renderOrder={10}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={headerTexture || null} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <CentralMapPreview
        items={mapItems}
        selectedId={selectedMapItem?.id}
        onSelect={onSelect}
        width={1.42}
        height={1.06}
        position={[-0.05, 0.03, 0.08]}
      />
    </group>
  );
};

const WorkspaceCard = ({ mode, title, body, meta, lines = [], position, size }) => {
  const texture = useWorkspaceTexture({
    mode,
    title,
    body,
    meta,
    lines,
  });

  return (
    <group position={position}>
      <HoloPlate
        name="GCPD_Quest_WorkspaceVisual_Glow"
        position={[0, 0, -0.016]}
        size={[size[0] + 0.08, size[1] + 0.08]}
        opacity={0.06}
        renderOrder={8}
      />
      <mesh name="GCPD_Quest_WorkspaceVisual" position={[0, 0, 0]} renderOrder={15}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={texture || null} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
    </group>
  );
};

const SectionList = ({ items, onSelect, instrument = false, itemLimit = null }) => {
  const count = itemLimit || (instrument ? 5 : 6);
  const startY = instrument ? 0.42 : 0.46;
  const dense = count > 6;
  const step = instrument ? 0.23 : dense ? 0.145 : 0.2;
  const itemHeight = instrument ? 0.18 : dense ? 0.118 : 0.16;
  return (
    <group name="GCPD_Quest_SectionList" rotation={[0, 0.22, 0]}>
      <HoloPlate
        name="GCPD_Quest_SectionList_Aura"
        position={[SECTION.leftX, 0.02, 0.05]}
        size={[0.72, 1.46]}
        opacity={dense ? 0.07 : 0.034}
      />
      <HoloLine
        name="GCPD_Quest_SectionList_Trace"
        position={[SECTION.leftX - 0.36, 0.04, 0.19]}
        size={[0.012, 1.44]}
      />
      {items.slice(0, count).map((item, index) => (
        <group key={item.id || index}>
          {item.accent ? (
            <mesh
              name={`GCPD_Quest_SectionItem_ActivePointer_${item.id || index}`}
              position={[SECTION.leftX + 0.34, startY - index * step, 0.235]}
              renderOrder={35}
            >
              <planeGeometry args={[0.018, itemHeight * 0.82]} />
              <meshBasicMaterial color={QUEST_UI_COLORS.blue} opacity={0.95} {...QUEST_UI_MATERIAL_PROPS} />
            </mesh>
          ) : null}
          <Card
            name={`GCPD_Quest_SectionItem_${item.id || index}`}
            position={[SECTION.leftX, startY - index * step, 0.18]}
            size={[0.62, itemHeight]}
            onClick={() => onSelect?.(item.id)}
            textureOptions={{
              eyebrow: item.accent ? 'ACTIVO' : '',
              title: item.label || item.id || 'REGISTRO',
              body: item.description,
              width: 720,
              height: instrument ? 180 : dense ? 132 : 160,
              compact: true,
              active: item.accent,
            }}
          />
        </group>
      ))}
    </group>
  );
};

const ActionColumn = ({ actions, onAction, onHome, onBack, mapMode = false }) => {
  const quickActions = [
    ...actions.slice(0, 4),
    !mapMode && onBack ? { id: 'nav:back', label: 'ATRAS', description: 'Volver al contexto anterior' } : null,
    !mapMode && onHome ? { id: 'nav:home', label: 'OPERACION', description: 'Centro operativo' } : null,
  ].filter(Boolean);
  const resourceActions = quickActions.filter((action) => action.resource);
  const selectedResourceAction = resourceActions.find((action) => action.accent);
  const contextAction = selectedResourceAction || quickActions[0];
  const contextTitle =
    resourceActions.length && !selectedResourceAction
      ? 'RECURSOS DEL POI'
      : contextAction?.label || (mapMode ? 'SIN RECURSOS' : 'SIN ACCION');
  const contextBody =
    resourceActions.length && !selectedResourceAction
      ? `${resourceActions.length} recurso(s) disponibles. Selecciona uno para abrirlo en el panel central.`
      : contextAction?.description || (mapMode ? 'Este POI no tiene recursos visibles para agentes.' : 'Acciones contextuales no disponibles.');

  const handleAction = (id) => {
    if (id === 'nav:back') {
      onBack?.();
      return;
    }
    if (id === 'nav:home') {
      onHome?.();
      return;
    }
    onAction?.(id);
  };

  if (mapMode) {
    return (
      <group name="GCPD_Quest_ActionColumn_MapResources" rotation={[0, -0.22, 0]}>
        {resourceActions.slice(0, 4).map((action, index) => (
          <Card
            key={action.id || index}
            name={`GCPD_Quest_MapResourceButton_${action.id || index}`}
            position={[
              SECTION.rightX + (index % 2 === 0 ? -0.17 : 0.17),
              -0.58 - Math.floor(index / 2) * 0.13,
              0.29 + index * 0.012,
            ]}
            size={[0.3, 0.1]}
            onClick={() => handleAction(action.id)}
            textureOptions={{
              title: action.label || action.id,
              body: '',
              meta: action.resource ? 'Recurso' : '',
              width: 360,
              height: 120,
              compact: true,
              active: Boolean(action.accent),
            }}
          />
        ))}
      </group>
    );
  }

  return (
    <group name="GCPD_Quest_ActionColumn" rotation={[0, -0.22, 0]}>
      <HoloPlate
        name="GCPD_Quest_ActionColumn_Aura"
        position={[SECTION.rightX, 0.1, 0.07]}
        size={[0.78, 1.28]}
        opacity={0.03}
      />
      <Card
        name="GCPD_Quest_InfoCard_context"
        position={[SECTION.rightX, 0.44, 0.2]}
        size={[0.66, 0.42]}
        textureOptions={{
          eyebrow: 'CONTEXTO',
          title: contextTitle,
          body: contextBody,
          meta: mapMode ? 'POI actual' : 'Accesos rapidos',
          width: 740,
          height: 400,
        }}
      />
      {quickActions.slice(0, 4).map((action, index) => (
        <Card
          key={action.id || index}
          name={`GCPD_Quest_ActionButton_${action.id || index}`}
          position={[
            SECTION.rightX + (index % 2 === 0 ? -0.17 : 0.17),
            -0.02 - Math.floor(index / 2) * 0.23,
            0.24 + index * 0.012,
          ]}
          size={[0.3, 0.18]}
          onClick={() => handleAction(action.id)}
          textureOptions={{
            title: action.label || action.id,
            body: '',
            meta: action.resource ? 'Recurso' : '',
            width: 360,
            height: 180,
            compact: true,
            active: Boolean(action.accent),
          }}
        />
      ))}
    </group>
  );
};

const StatusTelemetry = ({ title, hint, instrument }) => (
  <group name="GCPD_Quest_SectionStatus" rotation={[0.035, 0, 0]}>
    <HoloLine
      name="GCPD_Quest_SectionStatus_Line"
      position={[0, -0.7, 0.28]}
      size={[2.78, 0.012]}
      opacity={0.44}
    />
    <Card
      name="GCPD_Quest_InfoCard_section_status"
      position={[-0.02, -0.64, 0.31]}
      size={[1.9, 0.16]}
      textureOptions={{
        eyebrow: `${instrument ? 'HERRAMIENTAS' : 'DOSSIER'} // SINCRONIA ACTIVA // RAY READY`,
        title: title || 'MODULO ACTIVO',
        body: truncate(hint, 112),
        meta: 'Stick navigation enabled',
        width: 1800,
        height: 170,
        compact: true,
      }}
    />
  </group>
);

const ToolWorkbenchGuide = () => (
  <group name="GCPD_Quest_ToolWorkbenchGuide">
    <HoloLine
      name="GCPD_Quest_ToolWorkbenchGuide_TopTrace"
      position={[SECTION.centerX, 0.64, 0.28]}
      size={[1.36, 0.012]}
      opacity={0.44}
    />
    <HoloLine
      name="GCPD_Quest_ToolWorkbenchGuide_FloorTrace"
      position={[SECTION.centerX, -0.5, 0.28]}
      size={[1.2, 0.01]}
      opacity={0.24}
    />
  </group>
);

const MainWorkspace = ({
  title,
  subtitle,
  focusTitle,
  focusBody,
  detailTitle,
  detailBody,
  workspaceLines,
  mapItems,
  instrument,
  onSelect,
}) => {
  const mode = getWorkspaceMode({ title, focusTitle, instrument });

  return (
    <group name="GCPD_Quest_MainWorkspace">
      <HoloPlate
        name="GCPD_Quest_MainWorkspace_Aura"
        position={[SECTION.centerX, 0.08, 0.02]}
        size={mode === 'map' ? [1.78, 1.52] : [1.56, 1.28]}
        opacity={0.04}
      />
      <HoloLine
        name="GCPD_Quest_MainWorkspace_Horizon"
        position={[SECTION.centerX, 0.68, 0.22]}
        size={[1.58, 0.014]}
        opacity={0.82}
      />
      {mode === 'map' ? null : (
        <Card
          name="GCPD_Quest_InfoCard_section_header"
          position={[SECTION.centerX, 0.5, 0.18]}
          size={[1.42, 0.24]}
          textureOptions={{
            eyebrow: instrument ? 'HERRAMIENTAS' : title,
            title,
            body: subtitle,
            width: 1460,
            height: 250,
            active: true,
            compact: true,
          }}
        />
      )}
      {mode === 'map' ? (
        <MapWorkspaceCard
          title={focusTitle || title}
          body={focusBody}
          lines={workspaceLines}
          mapItems={mapItems}
          onSelect={onSelect}
          position={[SECTION.centerX, 0.07, 0.22]}
          size={[1.58, 1.34]}
        />
      ) : (
        <WorkspaceCard
          mode={mode}
          title={focusTitle || title}
          body={focusBody}
          meta={instrument ? 'WORKBENCH XR' : 'ESPACIO OPERATIVO'}
          lines={workspaceLines}
          position={[SECTION.centerX, 0.08, 0.22]}
          size={[1.42, 0.7]}
        />
      )}
      {mode === 'map' ? null : (
        <>
          <Card
            name="GCPD_Quest_InfoCard_section_focus"
            position={[SECTION.centerX - 0.37, -0.41, 0.25]}
            size={[0.68, 0.2]}
            textureOptions={{
              eyebrow: focusTitle || 'FOCO',
              title: instrument ? 'ACTIVO' : 'DETALLES',
              body: focusBody,
              meta: instrument ? 'Tool context' : 'Dossier',
              width: 760,
              height: 210,
              compact: true,
            }}
          />
          <Card
            name="GCPD_Quest_InfoCard_section_detail"
            position={[SECTION.centerX + 0.37, -0.41, 0.27]}
            size={[0.68, 0.2]}
            textureOptions={{
              eyebrow: detailTitle || 'DETALLE',
              title: instrument ? 'INVENTARIO' : 'INTEL',
              body: detailBody,
              meta: 'Vinculado',
              width: 760,
              height: 210,
              compact: true,
            }}
          />
        </>
      )}
    </group>
  );
};

const QuestSectionDashboard = ({
  layout = 'dossier',
  title,
  subtitle,
  focusTitle,
  focusBody,
  detailTitle,
  detailBody,
  items = [],
  actions = [],
  workspaceLines = [],
  selectedMapResource = null,
  itemLimit = null,
  hint = '',
  onSelect,
  onAction,
  onBack,
  onHome,
  position = [0, 0, 0],
  scale = 1,
}) => {
  const instrument = layout === 'instrument';
  const activeInstrument = instrument && items.some((item) => item.accent);
  const workspaceMode = getWorkspaceMode({ title, focusTitle, instrument });
  const mapMode = workspaceMode === 'map';
  const selectedMapItem = mapMode ? items.find((item) => item.accent) || items[0] || null : null;

  return (
    <group name="GCPD_Quest_SectionDashboard" position={position} scale={scale}>
      <HoloPlate
        name="GCPD_Quest_SectionDashboard_Volume"
        position={[0, 0.02, -0.12]}
        size={[SECTION.width, SECTION.height]}
        opacity={0.022}
        renderOrder={0}
      />
      <mesh position={[0, 0, -0.11]} renderOrder={0}>
        <planeGeometry args={[SECTION.width - 0.08, SECTION.height - 0.1]} />
        <meshStandardMaterial
          color={QUEST_UI_COLORS.bg}
          opacity={0.11}
          metalness={0.1}
          roughness={0.64}
          {...QUEST_PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloLine
        name="GCPD_Quest_SectionDashboard_TopTrace"
        position={[0, 0.79, 0.16]}
        size={[SECTION.width - 0.16, 0.016]}
        opacity={0.9}
      />
      <SectionList items={items} onSelect={onSelect} instrument={instrument} itemLimit={itemLimit} />
      {activeInstrument ? (
        <ToolWorkbenchGuide />
      ) : (
        <MainWorkspace
          title={title}
          subtitle={subtitle}
          focusTitle={focusTitle}
          focusBody={focusBody}
          detailTitle={detailTitle}
          detailBody={detailBody}
          workspaceLines={workspaceLines}
          mapItems={items}
          instrument={instrument}
          onSelect={onSelect}
        />
      )}
      {mapMode && !activeInstrument ? (
        <MapPoiSidePanel
          item={selectedMapItem}
          body={focusBody}
          lines={workspaceLines}
          selectedResource={selectedMapResource}
          actions={actions}
        />
      ) : null}
      <ActionColumn
        actions={actions}
        onAction={onAction}
        onBack={onBack}
        onHome={onHome}
        mapMode={mapMode}
      />
      <StatusTelemetry title={title} hint={hint} instrument={instrument} />
    </group>
  );
};

export default QuestSectionDashboard;
