/* eslint-disable react/no-unknown-property */
import { useMemo } from 'react';

import QuestPanel3D from './components/QuestPanel3D';
import { buildQuestScreen } from './domain/mapTerminalToQuest';

const FALLBACK_PANEL_POSITION = [0, 1.22, -1.45];
const PANEL_SURFACE_OFFSET = [0, 0, -0.035];
const PANEL_SURFACE_SCALE = [0.64, 0.64, 0.64];

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
