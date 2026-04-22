import { useMemo } from 'react';

import QuestPanel3D from './components/QuestPanel3D';
import { buildQuestModuleModel } from './domain/buildQuestModuleModel';

const QuestModuleRouter = ({ data, session }) => {
  const model = useMemo(
    () => buildQuestModuleModel({ data, session }),
    [data, session]
  );

  return (
    <QuestPanel3D
      title={model.title}
      subtitle={model.subtitle}
      items={model.items}
      hint={model.hint}
      onSelect={model.onSelect}
      onBack={model.onBack}
      onHome={model.onHome}
      position={[0, 0, 0]}
      scale={1}
    />
  );
};

export default QuestModuleRouter;
