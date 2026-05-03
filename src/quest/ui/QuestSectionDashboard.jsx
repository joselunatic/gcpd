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
const MAP_ASPECT_RATIO = 0.744;

const truncate = (value, max = 92) => {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
};

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
  gradient.addColorStop(0, active ? '#0d3760' : '#081b28');
  gradient.addColorStop(0.55, active ? '#071d35' : '#06121c');
  gradient.addColorStop(1, '#02070c');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);

  context.fillStyle = active ? 'rgba(23,105,255,0.2)' : 'rgba(125,230,255,0.055)';
  context.beginPath();
  context.moveTo(width * 0.08, 22);
  context.lineTo(width * 0.72, 22);
  context.lineTo(width * 0.58, height - 22);
  context.lineTo(width * 0.02, height - 22);
  context.closePath();
  context.fill();

  context.shadowColor = danger ? colors.red : active ? colors.cyanBright : colors.border;
  context.shadowBlur = active ? 22 : 8;
  context.strokeStyle = danger ? colors.red : active ? colors.cyan : colors.borderSoft;
  context.lineWidth = active ? 7 : 4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = danger ? 'rgba(255,74,74,0.28)' : active ? 'rgba(23,105,255,0.42)' : 'rgba(125,230,255,0.1)';
  context.fillRect(24, 24, width - 48, 10);
  context.fillStyle = danger ? colors.red : active ? colors.cyanBright : colors.cyan;
  context.fillRect(24, 24, Math.max(48, width * 0.2), 10);

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
  context.fillText(String(title || '').toUpperCase(), 44, compact ? 74 : 88);

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
    context.fillStyle = 'rgba(38,226,138,0.14)';
    context.fillRect(78, 126, width - 156, height - 238);
    context.strokeStyle = colors.green;
    context.lineWidth = 4;
    context.strokeRect(78, 126, width - 156, height - 238);
    context.fillStyle = colors.green;
    context.font = 'bold 28px monospace';
    context.fillText('MAPA TACTICO /mapa.png', 104, 150);
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

const mapPercentToLocal = (x, y, width, height) => [
  (Number(x) / 100 - 0.5) * width,
  (0.5 - Number(y) / 100) * height,
];

const ImageResourcePreview = ({ resource, size }) => {
  const texture = useLoader(THREE.TextureLoader, resource.src || resource.thumbnail);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
  }, [texture]);

  return (
    <mesh name="GCPD_Quest_MapResource_Image" position={[0.18, -0.02, 0.08]} renderOrder={32}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture} color="#e6fbff" opacity={0.92} {...QUEST_UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const VideoResourcePreview = ({ resource, size }) => {
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
    <mesh name="GCPD_Quest_MapResource_Video" position={[0.18, -0.02, 0.08]} renderOrder={32}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={texture || null} color="#e6fbff" opacity={0.92} {...QUEST_UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const AudioResourcePreview = ({ resource, size }) => {
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
    <group name="GCPD_Quest_MapResource_Audio" position={[0.18, -0.02, 0.08]}>
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
          body: resource.src || '',
          width: 420,
          height: 160,
          compact: true,
          active: playing,
        }}
      />
    </group>
  );
};

const ResourceFallbackPreview = ({ resource, size }) => (
  <Card
    name="GCPD_Quest_MapResource_Fallback"
    position={[0.18, -0.02, 0.08]}
    size={size}
    renderOrder={32}
    textureOptions={{
      eyebrow: resource?.type || 'RECURSO',
      title: resource?.title || 'SIN RECURSO',
      body: resource?.description || resource?.src || 'El DM puede asociar imagen, video o audio a este POI.',
      meta: resource?.src || 'sin fuente',
      width: 980,
      height: 620,
      active: Boolean(resource),
    }}
  />
);

const MapResourcePreview = ({ resource, size }) => {
  if (!resource) return <ResourceFallbackPreview resource={resource} size={size} />;
  if (resource.type === 'image' && (resource.src || resource.thumbnail)) {
    return <ImageResourcePreview resource={resource} size={size} />;
  }
  if (resource.type === 'video' && resource.src) {
    return <VideoResourcePreview resource={resource} size={size} />;
  }
  if (resource.type === 'audio' && resource.src) {
    return <AudioResourcePreview resource={resource} size={size} />;
  }
  return <ResourceFallbackPreview resource={resource} size={size} />;
};

const MapWorkspaceCard = ({
  title,
  body,
  items = [],
  lines = [],
  selectedResource = null,
  position,
  size,
}) => {
  const mapTexture = useLoader(THREE.TextureLoader, MAP_TEXTURE_URL);
  const headerTexture = useWorkspaceTexture({
    mode: 'map',
    title,
    body,
    meta: 'MAPA GOTHAM / POIS',
    lines,
  });
  const mapWidth = size[0] * 0.45;
  const mapHeight = mapWidth * MAP_ASPECT_RATIO;
  const sideX = size[0] * 0.25;
  const hasResource = Boolean(selectedResource);

  useEffect(() => {
    mapTexture.colorSpace = THREE.SRGBColorSpace;
  }, [mapTexture]);

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
      <mesh
        name="GCPD_Quest_MapWorkspace_Image"
        position={hasResource ? [-0.47, -0.225, 0.018] : [-0.34, -0.125, 0.018]}
        renderOrder={18}
      >
        <planeGeometry args={hasResource ? [mapWidth * 0.66, mapHeight * 0.66] : [mapWidth, mapHeight]} />
        <meshBasicMaterial map={mapTexture} color="#d7ffe1" opacity={0.86} {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={hasResource ? [-0.47, -0.225, 0.026] : [-0.34, -0.125, 0.026]} renderOrder={19}>
        <planeGeometry args={hasResource ? [mapWidth * 0.66, mapHeight * 0.66] : [mapWidth, mapHeight]} />
        <meshBasicMaterial color={QUEST_UI_COLORS.green} opacity={0.05} wireframe {...QUEST_UI_MATERIAL_PROPS} />
      </mesh>
      {items
        .filter((item) => Number.isFinite(item.mapX) && Number.isFinite(item.mapY))
        .slice(0, 8)
        .map((item) => {
          const [x, y] = mapPercentToLocal(
            item.mapX,
            item.mapY,
            hasResource ? mapWidth * 0.66 : mapWidth,
            hasResource ? mapHeight * 0.66 : mapHeight
          );
          const active = Boolean(item.accent);
          return (
            <group key={item.id} position={[hasResource ? -0.47 + x : -0.34 + x, hasResource ? -0.225 + y : -0.125 + y, 0.04]}>
              <mesh renderOrder={24}>
                <ringGeometry args={[active ? 0.022 : 0.014, active ? 0.033 : 0.023, 32]} />
                <meshBasicMaterial
                  color={active ? QUEST_UI_COLORS.red : QUEST_UI_COLORS.green}
                  opacity={active ? 1 : 0.86}
                  {...QUEST_UI_MATERIAL_PROPS}
                />
              </mesh>
              <mesh position={[0, 0, 0.006]} renderOrder={25}>
                <circleGeometry args={[active ? 0.01 : 0.007, 16]} />
                <meshBasicMaterial
                  color={active ? QUEST_UI_COLORS.red : QUEST_UI_COLORS.cyan}
                  opacity={1}
                  {...QUEST_UI_MATERIAL_PROPS}
                />
              </mesh>
            </group>
          );
        })}
      <HoloLine
        name="GCPD_Quest_MapWorkspace_Divider"
        position={[sideX - 0.1, 0.02, 0.05]}
        size={[0.012, size[1] - 0.18]}
        opacity={0.42}
      />
      {hasResource ? (
        <>
          <MapResourcePreview resource={selectedResource} size={[0.9, 0.48]} />
          <Card
            name="GCPD_Quest_MapResource_Meta"
            position={[0.18, -0.35, 0.12]}
            size={[0.9, 0.14]}
            textureOptions={{
              eyebrow: selectedResource.type || 'RECURSO',
              title: selectedResource.title || selectedResource.label,
              body: selectedResource.description || selectedResource.src,
              width: 980,
              height: 150,
              compact: true,
              active: true,
            }}
          />
        </>
      ) : (
        lines.slice(0, 5).map((line, index) => (
          <Card
            key={`${line}-${index}`}
            name={`GCPD_Quest_MapIntel_${index}`}
            position={[sideX + 0.06, 0.2 - index * 0.105, 0.06 + index * 0.002]}
            size={[0.38, 0.085]}
            textureOptions={{
              title: `INTEL ${index + 1}`,
              body: line,
              width: 520,
              height: 120,
              compact: true,
              active: index === 0,
            }}
          />
        ))
      )}
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

const SectionList = ({ items, onSelect, instrument = false }) => {
  const count = instrument ? 5 : 6;
  const startY = instrument ? 0.42 : 0.46;
  const step = instrument ? 0.23 : 0.2;
  return (
    <group name="GCPD_Quest_SectionList" rotation={[0, 0.22, 0]}>
      <HoloPlate
        name="GCPD_Quest_SectionList_Aura"
        position={[SECTION.leftX, 0.02, 0.05]}
        size={[0.72, 1.46]}
        opacity={0.034}
      />
      <HoloLine
        name="GCPD_Quest_SectionList_Trace"
        position={[SECTION.leftX - 0.36, 0.04, 0.19]}
        size={[0.012, 1.44]}
      />
      {items.slice(0, count).map((item, index) => (
        <Card
          key={item.id || index}
          name={`GCPD_Quest_SectionItem_${item.id || index}`}
          position={[SECTION.leftX, startY - index * step, 0.18]}
          size={[0.62, instrument ? 0.18 : 0.16]}
          onClick={() => onSelect?.(item.id)}
          textureOptions={{
            eyebrow: item.accent ? 'ACTIVO' : '',
            title: item.label || item.id || 'REGISTRO',
            body: item.description,
            width: 720,
            height: instrument ? 180 : 160,
            compact: true,
            active: item.accent,
          }}
        />
      ))}
    </group>
  );
};

const ActionColumn = ({ actions, onAction, onHome, onBack }) => {
  const quickActions = [
    ...actions.slice(0, 4),
    onBack ? { id: 'nav:back', label: 'ATRAS', description: 'Volver al contexto anterior' } : null,
    onHome ? { id: 'nav:home', label: 'OPERACION', description: 'Centro operativo' } : null,
  ].filter(Boolean);

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
          title: quickActions[0]?.label || 'SIN ACCION',
          body: quickActions[0]?.description || 'Acciones contextuales no disponibles.',
          meta: 'Accesos rapidos',
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
            meta: index === 0 ? 'Primary' : '',
            width: 360,
            height: 180,
            compact: true,
            active: index === 0,
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

const MainWorkspace = ({
  title,
  subtitle,
  focusTitle,
  focusBody,
  detailTitle,
  detailBody,
  items,
  workspaceLines,
  selectedMapResource,
  instrument,
}) => {
  const mode = getWorkspaceMode({ title, focusTitle, instrument });

  return (
    <group name="GCPD_Quest_MainWorkspace">
      <HoloPlate
        name="GCPD_Quest_MainWorkspace_Aura"
        position={[SECTION.centerX, 0.08, 0.02]}
        size={[1.56, 1.28]}
        opacity={0.04}
      />
      <HoloLine
        name="GCPD_Quest_MainWorkspace_Horizon"
        position={[SECTION.centerX, 0.68, 0.22]}
        size={[1.58, 0.014]}
        opacity={0.82}
      />
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
      {mode === 'map' ? (
        <MapWorkspaceCard
          title={focusTitle || title}
          body={focusBody}
          items={items}
          lines={workspaceLines}
          selectedResource={selectedMapResource}
          position={[SECTION.centerX, 0.08, 0.22]}
          size={[1.42, 0.7]}
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
  hint = '',
  onSelect,
  onAction,
  onBack,
  onHome,
  position = [0, 0, 0],
  scale = 1,
}) => {
  const instrument = layout === 'instrument';

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
      <SectionList items={items} onSelect={onSelect} instrument={instrument} />
      <MainWorkspace
        title={title}
        subtitle={subtitle}
        focusTitle={focusTitle}
        focusBody={focusBody}
        detailTitle={detailTitle}
        detailBody={detailBody}
        items={items}
        workspaceLines={workspaceLines}
        selectedMapResource={selectedMapResource}
        instrument={instrument}
      />
      <ActionColumn actions={actions} onAction={onAction} onBack={onBack} onHome={onHome} />
      <StatusTelemetry title={title} hint={hint} instrument={instrument} />
    </group>
  );
};

export default QuestSectionDashboard;
