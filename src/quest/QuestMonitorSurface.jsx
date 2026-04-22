import QuestModuleRouter from './QuestModuleRouter';

const PANEL_FIXED_POSITION = [0, 1.4, -1.02];
const PANEL_FIXED_ROTATION = [-0.1, 0, 0];
const PANEL_FIXED_SCALE = [0.72, 0.72, 0.72];

const QuestMonitorSurface = ({ data, session, panelAnchor = null }) => {
  const panel = <QuestModuleRouter data={data} session={session} />;
  const panelPosition = panelAnchor?.position || PANEL_FIXED_POSITION;

  return (
    <group
      position={panelPosition}
      rotation={PANEL_FIXED_ROTATION}
      scale={PANEL_FIXED_SCALE}
    >
      {panel}
    </group>
  );
};

export default QuestMonitorSurface;
