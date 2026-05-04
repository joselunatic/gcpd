/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';

import { QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const WORKBENCH_POSITION = [0, 1.96, -0.62];
const WORKBENCH_SCALE = 0.68;
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

const AUDIO_COLORS = {
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

const getAudioLabel = (track = {}) => track.title || track.label || 'SIN LABEL';

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

const createAudioTexture = ({
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

  context.shadowColor = danger ? AUDIO_COLORS.red : active ? AUDIO_COLORS.cyan : '#1c6d92';
  context.shadowBlur = active ? 18 : 8;
  context.strokeStyle = danger ? AUDIO_COLORS.red : active ? AUDIO_COLORS.cyanBright : AUDIO_COLORS.cyan;
  context.lineWidth = active ? 7 : 4;
  context.strokeRect(10, 10, width - 20, height - 20);
  context.shadowBlur = 0;

  context.fillStyle = active ? 'rgba(115,232,255,0.82)' : 'rgba(115,232,255,0.42)';
  context.fillRect(24, 24, width * 0.2, compact ? 7 : 10);

  context.textBaseline = 'top';
  if (eyebrow) {
    context.fillStyle = active ? AUDIO_COLORS.cyanBright : AUDIO_COLORS.cyan;
    context.font = `bold ${compact ? 22 : 28}px monospace`;
    context.fillText(String(eyebrow).toUpperCase(), 42, compact ? 36 : 42);
  }

  context.fillStyle = danger ? AUDIO_COLORS.red : AUDIO_COLORS.cyanBright;
  context.font = `bold ${compact ? 32 : 52}px monospace`;
  context.fillText(String(title || '').toUpperCase(), 42, compact ? 70 : 88);

  if (body) {
    context.fillStyle = AUDIO_COLORS.muted;
    context.font = `${compact ? 21 : 29}px monospace`;
    drawWrapped({
      context,
      text: body,
      x: 42,
      y: compact ? 116 : 160,
      maxWidth: width - 84,
      lineHeight: compact ? 28 : 38,
      maxLines: compact ? 2 : 3,
    });
  }

  if (meta) {
    context.fillStyle = danger ? AUDIO_COLORS.red : active ? AUDIO_COLORS.green : AUDIO_COLORS.cyan;
    context.font = `bold ${compact ? 19 : 24}px monospace`;
    context.fillText(String(meta).toUpperCase(), 42, height - (compact ? 42 : 52));
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useAudioTexture = (config) => {
  const texture = useMemo(() => createAudioTexture(config), [config]);
  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const TextCard = ({ name, position, size, textureOptions, onClick, renderOrder = 14 }) => {
  const [hovered, setHovered] = useState(false);
  const texture = useAudioTexture({
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

const HoloLine = ({ name, position, size, opacity = 0.7, color = AUDIO_COLORS.cyan, renderOrder = 24 }) => (
  <mesh name={name} position={position} renderOrder={renderOrder}>
    <planeGeometry args={size} />
    <meshBasicMaterial color={color} opacity={opacity} {...UI_MATERIAL_PROPS} />
  </mesh>
);

const TrackRail = ({ tracks, selectedIndex, setSelectedIndex }) => (
  <group name="GCPD_Audio_TrackRail" rotation={[0, 0.22, 0]}>
    <TextCard
      name="GCPD_Audio_TrackRail_Header"
      position={[0, 0.52, 0.02]}
      size={[0.7, 0.16]}
      textureOptions={{
        eyebrow: 'AUDIO',
        title: 'PISTAS',
        body: `${tracks.length} archivos disponibles`,
        width: 760,
        height: 180,
        compact: true,
      }}
    />
    {tracks.slice(0, 6).map((track, index) => (
      <TextCard
        key={track.id || index}
        name={`GCPD_Audio_Track_${track.id || index}`}
        position={[0, 0.29 - index * 0.15, 0.03 + index * 0.002]}
        size={[0.7, 0.12]}
        onClick={() => setSelectedIndex(index)}
        textureOptions={{
          eyebrow: index === selectedIndex ? 'ACTIVA' : '',
          title: getAudioLabel(track),
          body: track.locked ? 'bloqueada' : 'disponible',
          width: 760,
          height: 150,
          compact: true,
          active: index === selectedIndex,
          danger: track.locked,
        }}
      />
    ))}
  </group>
);

const Waveform = ({ active = false, locked = false }) => (
  <group name="GCPD_Audio_Waveform">
    {Array.from({ length: 34 }).map((_, index) => {
      const phase = index / 33;
      const height = 0.06 + Math.abs(Math.sin(phase * Math.PI * 5.5)) * (active ? 0.36 : 0.22);
      return (
        <mesh key={index} position={[-0.62 + index * 0.038, 0, 0.05]} renderOrder={18}>
          <planeGeometry args={[0.012, height]} />
          <meshBasicMaterial
            color={locked ? AUDIO_COLORS.red : active ? AUDIO_COLORS.green : AUDIO_COLORS.cyan}
            opacity={active ? 0.92 : 0.48}
            {...UI_MATERIAL_PROPS}
          />
        </mesh>
      );
    })}
  </group>
);

const QuestAudioWorkbench = ({ session }) => {
  const tracks = session?.toolData?.audio || [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  const isActive =
    session?.currentModule === QUEST_MODULE_HERRAMIENTAS &&
    session?.selection?.herramientas?.activeTool === 'audio';
  const selectedTrack = tracks[selectedIndex % Math.max(tracks.length, 1)] || null;

  useEffect(() => {
    setSelectedIndex(0);
    setPlaying(false);
  }, [tracks.length]);

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause?.();
    audioRef.current = null;
  }, [selectedTrack?.id, selectedTrack?.src]);

  const playSelected = () => {
    if (!selectedTrack?.src || selectedTrack.locked) {
      setPlaying(false);
      return;
    }
    if (!audioRef.current) {
      audioRef.current = new Audio(selectedTrack.src);
      audioRef.current.onended = () => setPlaying(false);
    }
    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }
    audioRef.current.play?.().then(() => setPlaying(true)).catch(() => setPlaying(false));
  };

  const nextTrack = (offset = 1) => {
    if (!tracks.length) return;
    setSelectedIndex((current) => (current + offset + tracks.length) % tracks.length);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    if (!import.meta.env.DEV && !window.IWER_DEVICE) return undefined;

    const bridge = {
      version: 1,
      snapshot: {
        active: isActive,
        trackCount: tracks.length,
        selectedIndex,
        playing,
        selectedTrack: selectedTrack
          ? {
              id: selectedTrack.id,
              title: getAudioLabel(selectedTrack),
              src: selectedTrack.src,
              locked: selectedTrack.locked,
            }
          : null,
      },
      actions: {
        playSelected,
        nextTrack: () => nextTrack(1),
        previousTrack: () => nextTrack(-1),
        selectTrack: (index) => setSelectedIndex(Math.max(0, Number(index) || 0) % Math.max(tracks.length, 1)),
      },
    };

    window.__GCPD_QUEST_AUDIO__ = bridge;

    return () => {
      if (window.__GCPD_QUEST_AUDIO__ === bridge) {
        delete window.__GCPD_QUEST_AUDIO__;
      }
    };
  }, [isActive, playing, selectedIndex, selectedTrack, tracks.length]);

  useEffect(() => () => audioRef.current?.pause?.(), []);

  if (!isActive) return null;

  return (
    <group name="GCPD_AudioWorkbench" position={WORKBENCH_POSITION} scale={WORKBENCH_SCALE}>
      <mesh position={[0, 0, -0.11]} renderOrder={0}>
        <planeGeometry args={[2.42, 1.58]} />
        <meshStandardMaterial
          color={AUDIO_COLORS.bg}
          emissive="#071d28"
          emissiveIntensity={0.26}
          metalness={0.14}
          roughness={0.58}
          opacity={0.48}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <HoloLine name="GCPD_Audio_TopTrace" position={[0, 0.75, 0.06]} size={[2.28, 0.014]} opacity={0.86} />
      <HoloLine name="GCPD_Audio_BusTrace" position={[0.2, -0.32, 0.1]} size={[1.28, 0.012]} color={AUDIO_COLORS.blue} opacity={0.62} />

      <group position={[-0.72, 0.02, 0.08]}>
        <TrackRail tracks={tracks} selectedIndex={selectedIndex} setSelectedIndex={setSelectedIndex} />
      </group>

      <group name="GCPD_Audio_MainDeck" position={[0.42, 0.05, 0.1]}>
        <TextCard
          name="GCPD_Audio_Header"
          position={[0, 0.5, 0.03]}
          size={[1.16, 0.22]}
          textureOptions={{
            eyebrow: selectedTrack?.locked ? 'BLOQUEADA' : 'ESCUCHA FORENSE',
            title: selectedTrack ? getAudioLabel(selectedTrack) : 'SIN PISTA',
            body: selectedTrack ? 'Pista preparada para análisis forense.' : 'No hay audio seleccionado.',
            meta: playing ? 'reproduciendo' : 'standby',
            width: 1260,
            height: 240,
            compact: true,
            active: playing,
            danger: selectedTrack?.locked,
          }}
        />
        <mesh position={[0, 0.12, -0.02]} renderOrder={8}>
          <planeGeometry args={[1.26, 0.5]} />
          <meshStandardMaterial color={AUDIO_COLORS.panel} opacity={0.64} {...PANEL_MATERIAL_PROPS} />
        </mesh>
        <Waveform active={playing} locked={selectedTrack?.locked} />
        <TextCard
          name="GCPD_Audio_Play"
          position={[-0.34, -0.32, 0.07]}
          size={[0.36, 0.16]}
          onClick={playSelected}
          textureOptions={{
            title: playing ? 'PAUSA' : 'PLAY',
            body: selectedTrack?.locked ? 'requiere unlock' : '',
            width: 420,
            height: 170,
            compact: true,
            active: playing,
            danger: selectedTrack?.locked,
          }}
        />
        <TextCard
          name="GCPD_Audio_Previous"
          position={[0.08, -0.32, 0.08]}
          size={[0.34, 0.16]}
          onClick={() => nextTrack(-1)}
          textureOptions={{
            title: 'ANT',
            width: 380,
            height: 170,
            compact: true,
          }}
        />
        <TextCard
          name="GCPD_Audio_Next"
          position={[0.48, -0.32, 0.09]}
          size={[0.34, 0.16]}
          onClick={() => nextTrack(1)}
          textureOptions={{
            title: 'SIG',
            width: 380,
            height: 170,
            compact: true,
          }}
        />
      </group>
    </group>
  );
};

export default QuestAudioWorkbench;
