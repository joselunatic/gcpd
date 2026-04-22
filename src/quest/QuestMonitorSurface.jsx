import QuestModuleRouter from './QuestModuleRouter';

const FALLBACK_PANEL_POSITION = [0, 1.22, -1.45];
const PANEL_SURFACE_LOCAL_OFFSET = [0, 0, 0.018];
const PANEL_SURFACE_SCALE = [0.64, 0.64, 0.64];

const QuestMonitorSurface = ({ data, session, panelAnchor = null }) => {
  const panel = <QuestModuleRouter data={data} session={session} />;

  if (panelAnchor?.position && panelAnchor?.quaternion) {
    return (
      <group
        position={panelAnchor.position}
        quaternion={panelAnchor.quaternion}
      >
        <group
          position={PANEL_SURFACE_LOCAL_OFFSET}
          rotation={[0, Math.PI, 0]}
          scale={PANEL_SURFACE_SCALE}
        >
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
