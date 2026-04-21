import { useMemo } from 'react';

import QuestPanel3D from './components/QuestPanel3D';
import { buildQuestScreen } from './domain/mapTerminalToQuest';

const QuestShell = ({ data, navigation }) => {
  const screen = useMemo(
    () => buildQuestScreen({ data, navigation }),
    [data, navigation]
  );

  return (
    <group>
      <QuestPanel3D
        title={screen.title}
        subtitle={screen.subtitle}
        items={screen.items}
        hint={screen.hint}
        onSelect={screen.onSelect}
        onBack={screen.onBack}
        onHome={screen.onHome}
        position={[0, 1.22, -1.45]}
        scale={0.82}
      />
    </group>
  );
};

export default QuestShell;
