import { useMemo } from 'react';

import QuestPanel3D from './components/QuestPanel3D';
import { buildQuestScreen } from './domain/mapTerminalToQuest';

const FALLBACK_PANEL_POSITION = [0, 1.22, -1.45];
const PANEL_SURFACE_OFFSET = [0, 0.035, 0];
const PANEL_SURFACE_SCALE = [0.66, 0.66, 0.66];

const QuestShell = ({ data, navigation, panelAnchor = null }) => {
  const screen = useMemo(
    () => buildQuestScreen({ data, navigation }),
    [data, navigation]
  );

  const panel = (
    <QuestPanel3D
      title={screen.title}
      subtitle={screen.subtitle}
      items={screen.items}
      hint={screen.hint}
      onSelect={screen.onSelect}
      onBack={screen.onBack}
      onHome={screen.onHome}
      position={[0, 0, 0]}
      scale={1}
    />
  );

  if (panelAnchor?.position && panelAnchor?.quaternion) {
    return (
      <group
        position={panelAnchor.position}
        quaternion={panelAnchor.quaternion}
      >
        <group
          position={PANEL_SURFACE_OFFSET}
          rotation={[-Math.PI / 2, 0, 0]}
          scale={PANEL_SURFACE_SCALE}
        >
          {panel}
        </group>
      </group>
    );
  }

  return (
    <QuestPanel3D
      title={screen.title}
      subtitle={screen.subtitle}
      items={screen.items}
      hint={screen.hint}
      onSelect={screen.onSelect}
      onBack={screen.onBack}
      onHome={screen.onHome}
      position={FALLBACK_PANEL_POSITION}
      scale={0.82}
    />
  );
};

export default QuestShell;
