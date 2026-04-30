import { useState } from 'react';

import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestPhoneOverlay from './QuestPhoneOverlay';
import QuestPreflightOverlay from './QuestPreflightOverlay';
import QuestSessionControls from './QuestSessionControls';
import { useQuestData } from './hooks/useQuestData';
import { useQuestSession } from './hooks/useQuestSession';
import { useQuestToolData } from './hooks/useQuestToolData';

const QuestRoute = () => {
  const data = useQuestData();
  const toolData = useQuestToolData();
  const session = useQuestSession(data, toolData);
  const [recenterKey, setRecenterKey] = useState(0);

  const handleRecenter = () => {
    setRecenterKey((value) => value + 1);
  };

  return (
    <div className="quest-route">
      <QuestCanvas
        data={data}
        session={session}
        recenterKey={recenterKey}
      />
      <QuestSessionControls onRecenter={handleRecenter}>
        {({ supportState, message, handleEnterVr }) => (
          <QuestPreflightOverlay
            data={data}
            session={session}
            supportState={supportState}
            message={message}
            onEnterVr={handleEnterVr}
          />
        )}
      </QuestSessionControls>
      <QuestPhoneOverlay session={session} />
      <QuestHud data={data} session={session} />
    </div>
  );
};

export default QuestRoute;
