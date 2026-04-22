/* eslint-disable react/no-unknown-property */
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const UI_MATERIAL_PROPS = {
  transparent: true,
  side: THREE.DoubleSide,
  depthWrite: false,
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  toneMapped: false,
};

const PANEL_MATERIAL_PROPS = {
  transparent: true,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
};

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

  const titleFontSize = clamp(Math.round(height * (subtitle ? 0.28 : 0.4)), 30, 86);
  const subtitleFontSize = clamp(Math.round(height * 0.12), 18, 34);
  const availableSubtitleHeight = Math.max(height - 150, subtitleFontSize * 2);
  const maxSubtitleLines = clamp(
    Math.floor(availableSubtitleHeight / Math.max(subtitleFontSize * 1.2, 1)),
    1,
    4
  );

  context.fillStyle = '#d8f2ff';
  context.font = `bold ${titleFontSize}px monospace`;
  context.textBaseline = 'top';
  context.fillText(String(title || '').toUpperCase(), 44, 36);

  if (subtitle) {
    context.fillStyle = '#8eb7cf';
    context.font = `${subtitleFontSize}px monospace`;
    drawWrappedText({
      context,
      text: String(subtitle),
      x: 44,
      y: Math.max(112, titleFontSize + 54),
      maxWidth: width - 92,
      lineHeight: Math.round(subtitleFontSize * 1.28),
      maxLines: maxSubtitleLines,
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

const QuestButton = ({
  title,
  subtitle,
  position,
  onClick,
  accent = false,
  buttonScale = 1,
}) => {
  const [hovered, setHovered] = useState(false);
  const texture = useLabelTexture({ title, subtitle, accent });

  return (
    <group position={position} scale={buttonScale}>
      <mesh position={[0, 0, -0.04]} renderOrder={1}>
        <planeGeometry args={[1.62, 0.44]} />
        <meshStandardMaterial
          color={hovered ? '#1c4c64' : '#0a1721'}
          opacity={0.98}
          metalness={0.16}
          roughness={0.52}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>
      <mesh position={[0, 0.165, -0.012]} renderOrder={2}>
        <planeGeometry args={[1.48, 0.02]} />
        <meshBasicMaterial
          color={hovered || accent ? '#b9efff' : '#4f91b2'}
          opacity={hovered || accent ? 1 : 0.82}
          {...UI_MATERIAL_PROPS}
        />
      </mesh>
      <mesh
        position={[0, 0, 0.018]}
        onClick={onClick}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        scale={hovered ? 1.018 : 1}
        renderOrder={3}
      >
        <planeGeometry args={[1.5, 0.34]} />
        <meshBasicMaterial map={texture || null} {...UI_MATERIAL_PROPS} />
      </mesh>
      {hovered ? (
        <>
          <mesh position={[0.78, 0, 0.03]} renderOrder={4}>
            <planeGeometry args={[0.12, 0.018]} />
            <meshBasicMaterial color="#b4efff" opacity={0.95} {...UI_MATERIAL_PROPS} />
          </mesh>
          <mesh position={[-0.78, 0, 0.03]} renderOrder={4}>
            <planeGeometry args={[0.12, 0.018]} />
            <meshBasicMaterial color="#b4efff" opacity={0.95} {...UI_MATERIAL_PROPS} />
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
      <mesh onClick={onClick} renderOrder={7}>
        <planeGeometry args={[0.34, 0.11]} />
        <meshBasicMaterial map={texture || null} {...UI_MATERIAL_PROPS} />
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
  const isInstrumentLayout = layout === 'instrument';
  const isDossierLayout = layout === 'dossier';
  const titleTexture = useLabelTexture({
    title,
    subtitle,
    width: 1600,
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
    width: 1100,
    height: layout === 'operations' ? 340 : isInstrumentLayout ? 430 : 560,
    accent: layout === 'operations',
  });
  const detailTexture = useLabelTexture({
    title: detailTitle,
    subtitle: detailBody,
    width: 1100,
    height: isInstrumentLayout ? 360 : 520,
    accent: false,
  });

  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0, -0.08]} renderOrder={0}>
        <planeGeometry args={[2.24, 1.92]} />
        <meshStandardMaterial
          color="#08141e"
          opacity={0.98}
          metalness={0.18}
          roughness={0.58}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>

      <mesh position={[0, 0, -0.05]} renderOrder={0}>
        <planeGeometry args={[2.12, 1.8]} />
        <meshStandardMaterial
          color="#0b1b26"
          opacity={0.96}
          metalness={0.08}
          roughness={0.44}
          {...PANEL_MATERIAL_PROPS}
        />
      </mesh>

      <mesh position={[0, 0.95, -0.03]} renderOrder={1}>
        <planeGeometry args={[2.04, 0.08]} />
        <meshBasicMaterial color="#67dfff" opacity={0.92} {...UI_MATERIAL_PROPS} />
      </mesh>

      <mesh position={[0, 0.88, -0.025]} renderOrder={1}>
        <planeGeometry args={[1.98, 0.04]} />
        <meshBasicMaterial color="#c1f4ff" opacity={0.94} {...UI_MATERIAL_PROPS} />
      </mesh>

      <mesh position={[0, -0.89, -0.02]} renderOrder={1}>
        <planeGeometry args={[1.98, 0.022]} />
        <meshBasicMaterial color="#5ea3c4" opacity={0.8} {...UI_MATERIAL_PROPS} />
      </mesh>

      <mesh position={[0, 0.73, 0.02]} renderOrder={2}>
        <planeGeometry args={[1.9, 0.34]} />
        <meshBasicMaterial map={titleTexture || null} {...UI_MATERIAL_PROPS} />
      </mesh>

      {onBack ? (
        <QuestActionChip
          title="ATRÁS"
          position={[-0.8, 1.08, 0.04]}
          onClick={onBack}
          accent={false}
        />
      ) : null}

      {onHome ? (
        <QuestActionChip
          title="OPERACIÓN"
          position={[0.8, 1.08, 0.04]}
          onClick={onHome}
          accent
        />
      ) : null}

      {layout === 'operations' ? (
        <>
          <mesh position={[0, 0.26, 0.03]} renderOrder={3}>
            <planeGeometry args={[1.9, 0.42]} />
            <meshBasicMaterial map={focusTexture || null} {...UI_MATERIAL_PROPS} />
          </mesh>

          {items.map((item, index) => (
            <QuestButton
              key={item.id || index}
              title={item.label}
              subtitle={item.description}
              position={[0, -0.1 - index * 0.32, 0.02]}
              onClick={() => onSelect?.(item.id)}
              accent={item.accent}
              buttonScale={0.96}
            />
          ))}
        </>
      ) : (
        <>
          <mesh
            position={[isInstrumentLayout ? 0.5 : 0.42, isInstrumentLayout ? 0.28 : 0.08, 0.03]}
            renderOrder={3}
          >
            <planeGeometry args={[isInstrumentLayout ? 1.04 : 1.08, isInstrumentLayout ? 0.52 : 0.76]} />
            <meshBasicMaterial map={focusTexture || null} {...UI_MATERIAL_PROPS} />
          </mesh>
          <mesh
            position={[isInstrumentLayout ? 0.5 : 0.42, isInstrumentLayout ? -0.23 : -0.46, 0.045]}
            renderOrder={4}
          >
            <planeGeometry args={[isInstrumentLayout ? 1.04 : 1.08, isInstrumentLayout ? 0.36 : 0.48]} />
            <meshBasicMaterial map={detailTexture || null} {...UI_MATERIAL_PROPS} />
          </mesh>

          {items.slice(0, isInstrumentLayout ? 5 : 4).map((item, index) => (
            <QuestButton
              key={item.id || index}
              title={item.label}
              subtitle={item.description}
              position={[
                isInstrumentLayout ? -0.63 : -0.56,
                isInstrumentLayout ? 0.46 - index * 0.2 : 0.36 - index * 0.32,
                0.02,
              ]}
              onClick={() => onSelect?.(item.id)}
              accent={item.accent}
              buttonScale={isInstrumentLayout ? 0.76 : 0.9}
            />
          ))}
        </>
      )}

      <mesh
        position={[
          isInstrumentLayout ? 0.22 : isDossierLayout ? 0.08 : 0,
          isInstrumentLayout ? -0.66 : isDossierLayout ? -0.74 : -0.62,
          0.05,
        ]}
        renderOrder={5}
      >
        <planeGeometry
          args={[
            isInstrumentLayout ? 1.42 : isDossierLayout ? 1.82 : 1.9,
            isInstrumentLayout ? 0.2 : isDossierLayout ? 0.22 : 0.27,
          ]}
        />
        <meshBasicMaterial map={hintTexture || null} {...UI_MATERIAL_PROPS} />
      </mesh>

      {actions.slice(0, 4).map((action, index) => (
        <QuestActionChip
          key={action.id || index}
          title={action.label}
          position={[-0.6 + index * 0.4, -0.98, 0.03]}
          onClick={() => onAction?.(action.id)}
          accent={action.accent}
        />
      ))}
    </group>
  );
};

export default QuestPanel3D;
