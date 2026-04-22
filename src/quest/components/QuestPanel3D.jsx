/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

const drawWrappedText = ({
  context,
  text,
  x,
  y,
  maxWidth,
  lineHeight,
  maxLines = 2,
}) => {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (!words.length) return;

  const lines = [];
  let currentLine = words[0];

  for (let index = 1; index < words.length; index += 1) {
    const candidate = `${currentLine} ${words[index]}`;
    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    lines.push(currentLine);
    currentLine = words[index];

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines) {
    lines.push(currentLine);
  }

  const visibleLines = lines.slice(0, maxLines);
  const sourceExhausted = visibleLines.join(' ').split(/\s+/).length >= words.length;
  if (!sourceExhausted) {
    const lastIndex = visibleLines.length - 1;
    let clipped = visibleLines[lastIndex];
    while (`${clipped}...`.length > 3 && context.measureText(`${clipped}...`).width > maxWidth) {
      clipped = clipped.slice(0, -1);
    }
    visibleLines[lastIndex] = `${clipped}...`;
  }

  visibleLines.forEach((line, lineIndex) => {
    context.fillText(line, x, y + lineIndex * lineHeight);
  });
};

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

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, accent ? '#12384f' : '#08131d');
  background.addColorStop(1, accent ? '#0b2230' : '#050c13');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  context.strokeStyle = accent ? '#9ad7ff' : '#315d76';
  context.lineWidth = 6;
  context.strokeRect(14, 14, width - 28, height - 28);

  context.fillStyle = accent ? 'rgba(122, 213, 255, 0.14)' : 'rgba(122, 213, 255, 0.08)';
  context.fillRect(24, 24, width - 48, 8);
  context.fillRect(24, height - 32, width * 0.24, 4);

  context.strokeStyle = 'rgba(122, 213, 255, 0.08)';
  context.lineWidth = 1;
  for (let y = 42; y < height - 20; y += 12) {
    context.beginPath();
    context.moveTo(24, y);
    context.lineTo(width - 24, y);
    context.stroke();
  }

  context.fillStyle = '#d8f2ff';
  context.font = 'bold 72px monospace';
  context.textBaseline = 'top';
  context.fillText(String(title || '').toUpperCase(), 44, 36);

  if (subtitle) {
    context.fillStyle = '#8eb7cf';
    context.font = '30px monospace';
    drawWrappedText({
      context,
      text: String(subtitle),
      x: 44,
      y: 138,
      maxWidth: width - 92,
      lineHeight: 38,
      maxLines: 2,
    });
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
  const [hovered, setHovered] = useState(false);
  const texture = useLabelTexture({ title, subtitle, accent });

  return (
    <group position={position}>
      <mesh position={[0, 0, -0.02]}>
        <planeGeometry args={[1.62, 0.44]} />
        <meshStandardMaterial
          color={hovered ? '#15384b' : '#071018'}
          transparent
          opacity={0.96}
          metalness={0.2}
          roughness={0.68}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 0.165, -0.01]}>
        <planeGeometry args={[1.48, 0.02]} />
        <meshBasicMaterial
          color={hovered || accent ? '#9ad7ff' : '#2a556d'}
          transparent
          opacity={hovered || accent ? 0.95 : 0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.018 : 1}
      >
        <planeGeometry args={[1.5, 0.34]} />
        <meshBasicMaterial map={texture || null} transparent side={THREE.DoubleSide} />
      </mesh>
      {hovered ? (
        <>
          <mesh position={[0.78, 0, 0.015]}>
            <planeGeometry args={[0.12, 0.018]} />
            <meshBasicMaterial color="#b4efff" transparent opacity={0.95} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[-0.78, 0, 0.015]}>
            <planeGeometry args={[0.12, 0.018]} />
            <meshBasicMaterial color="#b4efff" transparent opacity={0.95} side={THREE.DoubleSide} />
          </mesh>
        </>
      ) : null}
    </group>
  );
};

const QuestActionChip = ({ title, position, onClick, accent = false }) => {
  const texture = useLabelTexture({
    title,
    subtitle: '',
    width: 520,
    height: 120,
    accent,
  });

  return (
    <group position={position}>
      <mesh onClick={onClick}>
        <planeGeometry args={[0.34, 0.11]} />
        <meshBasicMaterial map={texture || null} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const QuestPanel3D = ({
  layout = 'operations',
  title,
  subtitle,
  focusTitle = '',
  focusBody = '',
  detailTitle = '',
  detailBody = '',
  items = [],
  actions = [],
  hint = '',
  onSelect,
  onAction,
  onBack,
  onHome,
  position = [0, 1.6, -1.4],
  scale = 1,
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
  const focusTexture = useLabelTexture({
    title: focusTitle,
    subtitle: focusBody,
    width: 980,
    height: layout === 'operations' ? 320 : 520,
    accent: layout === 'operations',
  });
  const detailTexture = useLabelTexture({
    title: detailTitle,
    subtitle: detailBody,
    width: 980,
    height: 520,
    accent: false,
  });

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[1.9, 1.82]} />
        <meshStandardMaterial
          color="#040a10"
          transparent
          opacity={0.95}
          metalness={0.28}
          roughness={0.82}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0, -0.025]}>
        <planeGeometry args={[1.82, 1.74]} />
        <meshStandardMaterial
          color="#061018"
          transparent
          opacity={0.92}
          metalness={0.14}
          roughness={0.64}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 0.83, -0.01]}>
        <planeGeometry args={[1.72, 0.04]} />
        <meshBasicMaterial color="#8ed9ff" transparent opacity={0.74} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, -0.79, -0.01]}>
        <planeGeometry args={[1.72, 0.022]} />
        <meshBasicMaterial color="#2b5a74" transparent opacity={0.58} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0.73, 0]}>
        <planeGeometry args={[1.58, 0.31]} />
        <meshBasicMaterial map={titleTexture || null} transparent side={THREE.DoubleSide} />
      </mesh>

      {layout === 'operations' ? (
        <>
          <mesh position={[0, 0.2, 0.01]}>
            <planeGeometry args={[1.58, 0.4]} />
            <meshBasicMaterial map={focusTexture || null} transparent side={THREE.DoubleSide} />
          </mesh>

          {items.map((item, index) => (
            <QuestButton
              key={item.id || index}
              title={item.label}
              subtitle={item.description}
              position={[0, -0.16 - index * 0.4, 0.02]}
              onClick={() => onSelect?.(item.id)}
              accent={item.accent}
            />
          ))}
        </>
      ) : (
        <>
          <mesh position={[0.38, layout === 'instrument' ? 0.2 : 0.12, 0.01]}>
            <planeGeometry args={[0.84, 0.74]} />
            <meshBasicMaterial map={focusTexture || null} transparent side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0.38, layout === 'instrument' ? -0.34 : -0.44, 0.01]}>
            <planeGeometry args={[0.84, layout === 'instrument' ? 0.62 : 0.42]} />
            <meshBasicMaterial map={detailTexture || null} transparent side={THREE.DoubleSide} />
          </mesh>

          {items.slice(0, layout === 'instrument' ? 5 : 4).map((item, index) => (
            <QuestButton
              key={item.id || index}
              title={item.label}
              subtitle={item.description}
              position={[-0.52, layout === 'instrument' ? 0.42 - index * 0.28 : 0.34 - index * 0.34, 0.02]}
              onClick={() => onSelect?.(item.id)}
              accent={item.accent}
            />
          ))}
        </>
      )}

      <mesh position={[0, -0.62, 0]}>
        <planeGeometry args={[1.58, 0.27]} />
        <meshBasicMaterial map={hintTexture || null} transparent side={THREE.DoubleSide} />
      </mesh>

      {actions.slice(0, 4).map((action, index) => (
        <QuestActionChip
          key={action.id || index}
          title={action.label}
          position={[-0.51 + index * 0.34, -0.92, 0.03]}
          onClick={() => onAction?.(action.id)}
          accent={action.accent}
        />
      ))}

      {onBack ? (
        <QuestButton
          title="VOLVER"
          subtitle="Regresar al contexto anterior"
          position={[-0.44, -1.15, 0.03]}
          onClick={onBack}
        />
      ) : null}

      {onHome ? (
        <QuestButton
          title="OPERACIÓN"
          subtitle="Volver al nodo operativo"
          position={[0.44, -1.15, 0.03]}
          onClick={onHome}
        />
      ) : null}
    </group>
  );
};

export default QuestPanel3D;
