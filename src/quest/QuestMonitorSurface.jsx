/* eslint-disable react/no-unknown-property */
import QuestModuleRouter from './QuestModuleRouter';

const PANEL_FIXED_POSITION = [0, 1.78, -0.68];
const PANEL_FIXED_ROTATION = [0, 0, 0];
const PANEL_FIXED_SCALE = [0.82, 0.82, 0.82];
const PANEL_BASE_SIZE = {
  width: 2.24,
  height: 1.92,
};
const PANEL_SURFACE_PADDING = 0.92;
const PANEL_SURFACE_FORWARD_OFFSET = 0.016;

const clampScale = (value) => Math.max(0.72, Math.min(1.18, value));

const buildPanelTransform = (panelAnchor) => {
  if (!panelAnchor?.position) {
    return {
      position: PANEL_FIXED_POSITION,
      rotation: PANEL_FIXED_ROTATION,
      scale: PANEL_FIXED_SCALE,
    };
  }

  const position = [...panelAnchor.position];

  if (Array.isArray(panelAnchor.size)) {
    const [width = 0, height = 0] = panelAnchor.size;
    const widthScale = width > 0 ? width / PANEL_BASE_SIZE.width : 1;
    const heightScale = height > 0 ? height / PANEL_BASE_SIZE.height : 1;
    const fittedScale = clampScale(
      Math.min(widthScale || 1, heightScale || 1) * PANEL_SURFACE_PADDING
    );

    position[1] += 0.02;
    position[2] += PANEL_SURFACE_FORWARD_OFFSET;

    return {
      position,
      rotation: PANEL_FIXED_ROTATION,
      scale: [fittedScale, fittedScale, fittedScale],
    };
  }

  position[2] += PANEL_SURFACE_FORWARD_OFFSET;

  return {
    position,
    rotation: PANEL_FIXED_ROTATION,
    scale: PANEL_FIXED_SCALE,
  };
};

const QuestMonitorSurface = ({ data, session, panelAnchor = null }) => {
  const panel = <QuestModuleRouter data={data} session={session} />;
  const panelTransform = buildPanelTransform(panelAnchor);

  return (
    <group
      position={panelTransform.position}
      rotation={panelTransform.rotation}
      scale={panelTransform.scale}
    >
      {panel}
    </group>
  );
};

export default QuestMonitorSurface;
