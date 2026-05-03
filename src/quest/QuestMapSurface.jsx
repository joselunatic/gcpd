/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';

import { PHONE_MODE_TRACER } from './hooks/useQuestSession';
import { QUEST_MODULE_MAPA, QUEST_MODULE_HERRAMIENTAS } from './state/questModules';

const MAP_TEXTURE_URL = '/mapa.png';
const HOTSPOTS_URL = '/data/map/hotspots.json';
const MAP_WIDTH = 2.48;
const MAP_HEIGHT = MAP_WIDTH * 0.744;
const TRACE_STEP_MS = 15_000;
const TRACE_EXACT_MS = 45_000;
const XR_RAY_POINTER_EVENTS = { allow: 'ray' };

const UI_MATERIAL_PROPS = {
  transparent: true,
  depthWrite: false,
  toneMapped: false,
};

const summarize = (value, fallback = 'Sin datos.') => {
  const source = Array.isArray(value) ? value.join(' ') : value;
  const text = String(source || fallback).trim();
  if (!text) return fallback;
  return text.length > 96 ? `${text.slice(0, 93)}...` : text;
};

const getPoiGeo = (poi = {}) => {
  const geo = poi?.poiV2?.geo || {};
  const mapMeta = poi?.commands?.mapMeta || {};
  const x = geo.x ?? mapMeta.x;
  const y = geo.y ?? mapMeta.y;
  if (!Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return null;
  return {
    x: Number(x),
    y: Number(y),
    radius: Number(geo.radius ?? mapMeta.radius) || 1.6,
    label: geo.label || mapMeta.label || poi.name || poi.id || '',
  };
};

const mapPercentToLocal = (x, y) => [
  (Number(x) / 100 - 0.5) * MAP_WIDTH,
  (0.5 - Number(y) / 100) * MAP_HEIGHT,
];

const radiusForStage = (stage, maxRadius) => {
  if (stage >= 3) return 0.045;
  if (stage === 2) return maxRadius / 3;
  if (stage === 1) return (maxRadius * 2) / 3;
  return maxRadius;
};

const stageFromElapsed = (elapsedMs) => {
  if (elapsedMs >= TRACE_EXACT_MS) return 3;
  if (elapsedMs >= TRACE_STEP_MS * 2) return 2;
  if (elapsedMs >= TRACE_STEP_MS) return 1;
  return 0;
};

const createTextTexture = ({
  title,
  body = '',
  width = 720,
  height = 220,
  accent = false,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, accent ? '#063349' : '#061620');
  gradient.addColorStop(1, '#02070d');
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = accent ? '#d6f8ff' : '#64cceb';
  context.lineWidth = accent ? 7 : 5;
  context.strokeRect(12, 12, width - 24, height - 24);
  context.fillStyle = accent ? '#f0fcff' : '#bceeff';
  context.font = 'bold 42px monospace';
  context.textBaseline = 'top';
  context.fillText(String(title || '').toUpperCase(), 34, 30);
  context.fillStyle = '#8fc7d8';
  context.font = '25px monospace';
  String(body || '')
    .split(/\s+/)
    .reduce((lines, word) => {
      const current = lines[lines.length - 1] || '';
      const next = current ? `${current} ${word}` : word;
      if (next.length > 44) lines.push(word);
      else lines[lines.length - 1] = next;
      return lines;
    }, [''])
    .slice(0, 4)
    .forEach((line, index) => context.fillText(line, 36, 90 + index * 31));

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useTextTexture = (options) => {
  const texture = useMemo(() => createTextTexture(options), [
    options.title,
    options.body,
    options.width,
    options.height,
    options.accent,
  ]);

  useEffect(() => () => texture?.dispose?.(), [texture]);
  return texture;
};

const QuestMapLabel = ({ title, body, position, scale = [0.8, 0.24, 1], accent = false }) => {
  const texture = useTextTexture({ title, body, accent });
  return (
    <mesh position={position} scale={scale} renderOrder={32}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={texture || null} {...UI_MATERIAL_PROPS} />
    </mesh>
  );
};

const QuestMapPoi = ({ spot, active, related, dimmed, onSelect }) => {
  const [hovered, setHovered] = useState(false);
  const [x, y] = mapPercentToLocal(spot.x, spot.y);
  const radius = Math.max(0.025, (Number(spot.radius || 1.6) / 100) * MAP_WIDTH);
  const color = active || hovered ? '#e3fbff' : related ? '#8affc9' : '#73e8ff';
  const baseOpacity = dimmed ? 0.12 : related ? 0.46 : 0.34;
  const ringOpacity = dimmed ? 0.26 : related ? 0.82 : 0.62;
  const selectSpot = (event) => {
    event.stopPropagation();
    onSelect?.(spot.id);
  };

  return (
    <group position={[x, y, 0.045]}>
      <mesh
        name={`GCPD_Quest_MapPoi_Hit_${spot.id}`}
        pointerEventsType={XR_RAY_POINTER_EVENTS}
        pointerEventsOrder={70}
        onPointerEnter={() => setHovered(true)}
        onPointerOver={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onPointerOut={() => setHovered(false)}
        onClick={selectSpot}
        onPointerDown={selectSpot}
      >
        <circleGeometry args={[Math.max(0.06, radius * 2.4), 32]} />
        <meshBasicMaterial color={color} opacity={active || hovered ? 0.2 : 0.001} {...UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.006]} renderOrder={30}>
        <circleGeometry args={[radius * (hovered ? 1.35 : 1.1), 32]} />
        <meshBasicMaterial color={color} opacity={active || hovered ? 0.58 : baseOpacity} {...UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.008]}>
        <ringGeometry args={[radius * 1.25, radius * 1.55, 32]} />
        <meshBasicMaterial color={color} opacity={active || hovered ? 0.95 : ringOpacity} {...UI_MATERIAL_PROPS} />
      </mesh>
      {related && !active ? (
        <mesh position={[0, 0, 0.018]} renderOrder={31}>
          <ringGeometry args={[radius * 1.82, radius * 2.08, 32]} />
          <meshBasicMaterial color="#8affc9" opacity={dimmed ? 0.32 : 0.78} {...UI_MATERIAL_PROPS} />
        </mesh>
      ) : null}
      {(active || hovered) && (
        <QuestMapLabel
          title={spot.label || spot.id}
          body={[
            spot.district || 'POI',
            spot.resourceCount ? `${spot.resourceCount} recursos` : '',
            summarize(spot.summary || spot.status, ''),
          ].filter(Boolean).join(' · ')}
          position={[0.23, 0.08, 0.035]}
          scale={[0.52, 0.16, 1]}
          accent={active}
        />
      )}
    </group>
  );
};

const QuestTracerOverlay = ({ phoneState }) => {
  const [stage, setStage] = useState(0);
  const [clock, setClock] = useState('T+00.0s');
  const hotspot = phoneState?.hotspot;
  const active = phoneState?.activeMode === PHONE_MODE_TRACER && hotspot;
  const answeredAt = Number(phoneState?.tracerAnsweredAt || 0);
  const [x, y] = active ? mapPercentToLocal(hotspot.x ?? 50, hotspot.y ?? 50) : [0, 0];
  const maxRadius = Math.max(
    ...[
      [-MAP_WIDTH / 2, -MAP_HEIGHT / 2],
      [MAP_WIDTH / 2, -MAP_HEIGHT / 2],
      [-MAP_WIDTH / 2, MAP_HEIGHT / 2],
      [MAP_WIDTH / 2, MAP_HEIGHT / 2],
    ].map(([cx, cy]) => Math.hypot(cx - x, cy - y))
  );
  const radius = radiusForStage(stage, maxRadius);

  useFrame(() => {
    if (!active || !answeredAt) return;
    const elapsed = Math.max(0, Date.now() - answeredAt);
    const nextStage = stageFromElapsed(elapsed);
    setClock(`T+${(elapsed / 1000).toFixed(1)}s`);
    setStage((current) => (current === nextStage ? current : nextStage));
  });

  if (!active) return null;

  return (
    <group position={[0, 0, 0.08]}>
      <mesh position={[x, y, 0.015]} renderOrder={42}>
        <ringGeometry args={[radius, radius + 0.01, 96]} />
        <meshBasicMaterial color="#8affc9" opacity={0.9} {...UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[x, y, 0.012]} renderOrder={41}>
        <circleGeometry args={[radius, 96]} />
        <meshBasicMaterial color="#54ffd2" opacity={0.08} {...UI_MATERIAL_PROPS} />
      </mesh>
      {stage >= 3 ? (
        <mesh position={[x, y, 0.04]} renderOrder={45}>
          <circleGeometry args={[0.022, 32]} />
          <meshBasicMaterial color="#f3ffbf" opacity={1} {...UI_MATERIAL_PROPS} />
        </mesh>
      ) : null}
      <QuestMapLabel
        title={`TRACER FASE ${stage}`}
        body={`${clock} · ${stage >= 3 ? (hotspot.label || phoneState.hotspotLabel || 'POSICION EXACTA') : 'cerrando radio tactico'}`}
        position={[-0.62, MAP_HEIGHT / 2 + 0.18, 0.035]}
        scale={[0.78, 0.22, 1]}
        accent
      />
    </group>
  );
};

const buildSpots = (pois = [], fallbackHotspots = []) => {
  const validFallbackHotspots = fallbackHotspots
    .filter(Boolean)
    .map((entry) => ({
      ...entry,
      x: Number(entry.x),
      y: Number(entry.y),
      radius: Number(entry.radius) || 1.6,
    }))
    .filter((entry) => Number.isFinite(entry.x) && Number.isFinite(entry.y));
  const fallbackById = new Map(validFallbackHotspots.map((entry) => [entry.id, entry]));
  const poiSpots = pois
    .filter(Boolean)
    .map((poi) => {
      const fallback = fallbackById.get(poi.id);
      const geo = getPoiGeo(poi) || fallback;
      if (!geo) return null;
      return {
        id: poi.id,
        label: geo.label || poi.name || poi.id,
        district: poi.district || '',
        summary: poi.summary || '',
        status: poi.status || '',
        resourceCount: Array.isArray(poi.resources) ? poi.resources.length : 0,
        x: Number(geo.x),
        y: Number(geo.y),
        radius: Number(geo.radius) || 1.6,
      };
    })
    .filter((entry) => entry && Number.isFinite(entry.x) && Number.isFinite(entry.y));

  if (poiSpots.length) return poiSpots;
  return validFallbackHotspots;
};

const QuestMapSurface = ({ data, session, panelAnchor = null }) => {
  const mapTexture = useLoader(THREE.TextureLoader, MAP_TEXTURE_URL);
  const [fallbackHotspots, setFallbackHotspots] = useState([]);
  const selectedPoi = session?.selectedPoi;
  const relatedPoiIds = useMemo(
    () =>
      new Set(
        (session?.questContext?.relatedPoisForCase || [])
          .map((entry) => entry.id)
          .filter(Boolean)
      ),
    [session?.questContext?.relatedPoisForCase]
  );
  const activeTool = session?.selection?.herramientas?.activeTool;
  const activeFilter = session?.selection?.mapa?.activeFilter || 'caso-activo';
  const isCaseFilterActive = activeFilter === 'caso-activo' && relatedPoiIds.size > 0;
  const activeTracer = session?.phoneState?.activeMode === PHONE_MODE_TRACER;
  const shouldShow =
    session?.currentModule === QUEST_MODULE_MAPA ||
    (session?.currentModule === QUEST_MODULE_HERRAMIENTAS && activeTool === 'rastreo') ||
    activeTracer;

  useEffect(() => {
    let cancelled = false;
    fetch(HOTSPOTS_URL, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload) => {
        if (cancelled) return;
        setFallbackHotspots(Array.isArray(payload?.hotspots) ? payload.hotspots : []);
      })
      .catch(() => {
        if (!cancelled) setFallbackHotspots([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const spots = useMemo(
    () => buildSpots(data?.pois || [], fallbackHotspots),
    [data?.pois, fallbackHotspots]
  );
  const selectedSpot =
    spots.find((entry) => entry.id === selectedPoi?.id) ||
    spots.find((entry) => relatedPoiIds.has(entry.id)) ||
    spots[0] ||
    null;
  const selectedIsRelated = selectedSpot ? relatedPoiIds.has(selectedSpot.id) : false;
  const title = activeTracer
    ? 'TRACER MAP'
    : isCaseFilterActive
      ? 'GOTHAM MAP · CASO'
      : 'GOTHAM MAP';
  const body = activeTracer
    ? `${session.phoneState.lineStatus || 'traza'} · ${session.phoneState.hotspotLabel || session.phoneState.lastDialedNumber || 'sin hotspot'}`
    : selectedPoi
      ? [
          selectedPoi.name || selectedPoi.id,
          selectedPoi.district || 'sin distrito',
          selectedIsRelated ? 'vinculado al caso' : 'fuera del foco',
        ].join(' · ')
      : `${spots.length} POIs georreferenciados`;

  const position = panelAnchor?.position
    ? [panelAnchor.position[0] - 1.42, panelAnchor.position[1] + 0.05, panelAnchor.position[2] + 0.07]
    : [-1.44, 1.92, -0.62];
  const scale = activeTracer ? 0.88 : 0.72;

  useEffect(() => {
    mapTexture.colorSpace = THREE.SRGBColorSpace;
  }, [mapTexture]);

  if (!shouldShow) return null;

  return (
    <group position={position} scale={[scale, scale, scale]}>
      <QuestMapLabel
        title={title}
        body={body}
        position={[0, MAP_HEIGHT / 2 + 0.32, 0.06]}
        scale={[1.08, 0.24, 1]}
        accent={activeTracer}
      />
      <mesh position={[0, 0, -0.012]} renderOrder={20}>
        <planeGeometry args={[MAP_WIDTH + 0.14, MAP_HEIGHT + 0.14]} />
        <meshStandardMaterial color="#031018" emissive="#062535" emissiveIntensity={0.45} roughness={0.72} />
      </mesh>
      <mesh renderOrder={21}>
        <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
        <meshBasicMaterial map={mapTexture} color="#d8fbff" opacity={0.94} {...UI_MATERIAL_PROPS} />
      </mesh>
      <mesh position={[0, 0, 0.025]} renderOrder={22}>
        <planeGeometry args={[MAP_WIDTH, MAP_HEIGHT]} />
        <meshBasicMaterial color="#6ee7ff" opacity={0.075} wireframe {...UI_MATERIAL_PROPS} />
      </mesh>
      {spots.map((spot) => (
        <QuestMapPoi
          key={spot.id}
          spot={spot}
          active={spot.id === selectedPoi?.id}
          related={relatedPoiIds.has(spot.id)}
          dimmed={isCaseFilterActive && !relatedPoiIds.has(spot.id)}
          onSelect={session.actions.selectPoi}
        />
      ))}
      <QuestTracerOverlay phoneState={session.phoneState} />
      {selectedSpot && !activeTracer ? (
        <QuestMapLabel
          title={selectedSpot.label}
          body={`${selectedSpot.status || 'sin estado'} · ${selectedIsRelated ? 'caso activo' : 'sin vínculo directo'} · ${summarize(selectedSpot.summary || selectedPoi?.summary)}`}
          position={[0, -MAP_HEIGHT / 2 - 0.28, 0.06]}
          scale={[1.06, 0.24, 1]}
        />
      ) : null}
    </group>
  );
};

export default QuestMapSurface;
