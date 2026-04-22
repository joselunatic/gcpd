import QuestModuleRouter from './QuestModuleRouter';

const FALLBACK_PANEL_POSITION = [0, 1.22, -1.45];
const PANEL_SURFACE_OFFSET = [0, 0, -0.035];
const PANEL_SURFACE_SCALE = [0.64, 0.64, 0.64];

const QuestMonitorSurface = ({ data, session, panelAnchor = null }) => {
  const panel = <QuestModuleRouter data={data} session={session} />;

  if (panelAnchor?.position) {
    return (
      <group
        position={[
          panelAnchor.position[0],
          panelAnchor.position[1],
          panelAnchor.position[2] + PANEL_SURFACE_OFFSET[2],
        ]}
        rotation={[0, Math.PI, 0]}
      >
        <group scale={PANEL_SURFACE_SCALE}>
          {panel}
        </group>
      </group>
    );
  }

  return (
    <group position={FALLBACK_PANEL_POSITION} scale={0.82}>
      {panel}
    </group>
  );
};

export default QuestMonitorSurface;
