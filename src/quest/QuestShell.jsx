import { useMemo } from 'react';

import QuestPanel3D from './components/QuestPanel3D';
import { buildQuestScreen } from './domain/mapTerminalToQuest';
import { useQuestData } from './hooks/useQuestData';
import { useQuestNavigation } from './hooks/useQuestNavigation';

const QuestShell = () => {
  const data = useQuestData();
  const navigation = useQuestNavigation();

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
        position={[0, 1.6, -1.4]}
      />
    </group>
  );
};

export default QuestShell;
