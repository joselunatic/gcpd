import { useState } from 'react';

import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestPreflightOverlay from './QuestPreflightOverlay';
import QuestSessionControls from './QuestSessionControls';
import { useQuestData } from './hooks/useQuestData';
import { useQuestSession } from './hooks/useQuestSession';

const QuestRoute = () => {
  const data = useQuestData();
  const session = useQuestSession(data);
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
      <QuestHud data={data} session={session} />
    </div>
  );
};

export default QuestRoute;
