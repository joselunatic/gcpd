/* eslint-disable react/no-unknown-property */
import QuestModuleRouter from './QuestModuleRouter';

const PANEL_FIXED_POSITION = [0, 1.78, -0.68];
const PANEL_FIXED_ROTATION = [0, 0, 0];
const PANEL_FIXED_SCALE = [1, 1, 1];
const PANEL_BASE_SIZE = {
  width: 3.12,
  height: 1.54,
};
const PANEL_SURFACE_PADDING = 1.5;
const PANEL_SURFACE_FORWARD_OFFSET = 0.56;

const clampScale = (value) => Math.max(1.08, Math.min(1.56, value));

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
    const [width = 0, height = 0, depth = 0] = panelAnchor.size;
    const visibleHeight = Math.max(height, depth);
    const widthScale = width > 0 ? width / PANEL_BASE_SIZE.width : 1;
    const heightScale = visibleHeight > 0 ? visibleHeight / PANEL_BASE_SIZE.height : 1;
    const fittedScale = clampScale(
      Math.min(widthScale || 1, heightScale || 1) * PANEL_SURFACE_PADDING
    );

    position[1] += 0.34;
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
      name="QuestMonitorSurface"
      position={panelTransform.position}
      rotation={panelTransform.rotation}
      scale={panelTransform.scale}
    >
      {panel}
    </group>
  );
};

export default QuestMonitorSurface;
