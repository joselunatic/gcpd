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
      layout={model.layout}
      title={model.title}
      subtitle={model.subtitle}
      focusTitle={model.focusTitle}
      focusBody={model.focusBody}
      detailTitle={model.detailTitle}
      detailBody={model.detailBody}
      items={model.items}
      actions={model.actions}
      workspaceLines={model.workspaceLines}
      hint={model.hint}
      onSelect={model.onSelect}
      onAction={model.onAction}
      onBack={model.onBack}
      onHome={model.onHome}
      position={[0, 0, 0]}
      scale={1}
    />
  );
};

export default QuestModuleRouter;
