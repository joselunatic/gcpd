/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';

const createLabelTexture = ({
  title = '',
  subtitle = '',
  width = 1024,
  height = 256,
  accent = false,
}) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = accent ? '#14384a' : '#0a1822';
  context.fillRect(0, 0, width, height);

  context.strokeStyle = accent ? '#9ad7ff' : '#3f6d8b';
  context.lineWidth = 8;
  context.strokeRect(8, 8, width - 16, height - 16);

  context.fillStyle = '#d8f2ff';
  context.font = 'bold 72px monospace';
  context.textBaseline = 'top';
  context.fillText(String(title || '').toUpperCase(), 44, 36);

  if (subtitle) {
    context.fillStyle = '#8eb7cf';
    context.font = '38px monospace';
    context.fillText(String(subtitle), 44, 140);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
};

const useLabelTexture = (config) => {
  const texture = useMemo(() => createLabelTexture(config), [config]);

  useEffect(() => {
    return () => {
      texture?.dispose?.();
    };
  }, [texture]);

  return texture;
};

const QuestButton = ({ title, subtitle, position, onClick, accent = false }) => {
  const texture = useLabelTexture({ title, subtitle, accent });

  return (
    <mesh position={position} onClick={onClick}>
      <planeGeometry args={[1.7, 0.42]} />
      <meshBasicMaterial map={texture || null} transparent />
    </mesh>
  );
};

const QuestPanel3D = ({
  title,
  subtitle,
  items = [],
  hint = '',
  onSelect,
  onBack,
  onHome,
  position = [0, 1.6, -1.4],
}) => {
  const titleTexture = useLabelTexture({
    title,
    subtitle,
    width: 1400,
    height: 300,
    accent: true,
  });
  const hintTexture = useLabelTexture({
    title: 'STATUS',
    subtitle: hint,
    width: 1400,
    height: 260,
    accent: false,
  });

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[2.15, 2.05]} />
        <meshStandardMaterial
          color="#061018"
          transparent
          opacity={0.96}
          metalness={0.1}
          roughness={0.72}
        />
      </mesh>

      <mesh position={[0, 0.73, 0]}>
        <planeGeometry args={[1.9, 0.38]} />
        <meshBasicMaterial map={titleTexture || null} transparent />
      </mesh>

      {items.map((item, index) => (
        <QuestButton
          key={item.id || index}
          title={item.label}
          subtitle={item.description}
          position={[0, 0.22 - index * 0.48, 0.02]}
          onClick={() => onSelect?.(item.id)}
        />
      ))}

      <mesh position={[0, -0.82, 0]}>
        <planeGeometry args={[1.9, 0.32]} />
        <meshBasicMaterial map={hintTexture || null} transparent />
      </mesh>

      {onBack ? (
        <QuestButton
          title="BACK"
          subtitle="Return to previous panel"
          position={[-0.5, -1.18, 0.03]}
          onClick={onBack}
        />
      ) : null}

      {onHome ? (
        <QuestButton
          title="HOME"
          subtitle="Return to quest root"
          position={[0.5, -1.18, 0.03]}
          onClick={onHome}
        />
      ) : null}
    </group>
  );
};

export default QuestPanel3D;
