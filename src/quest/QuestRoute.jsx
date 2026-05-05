import { useEffect, useState } from 'react';

import './styles/quest.css';

import QuestCanvas from './QuestCanvas';
import QuestHud from './QuestHud';
import QuestPhoneOverlay from './QuestPhoneOverlay';
import QuestPreflightOverlay from './QuestPreflightOverlay';
import QuestSessionControls from './QuestSessionControls';
import { useQuestData } from './hooks/useQuestData';
import { useQuestDebugBridge } from './hooks/useQuestDebugBridge';
import { useQuestSession } from './hooks/useQuestSession';
import { useQuestToolData } from './hooks/useQuestToolData';

const QuestRoute = () => {
  const data = useQuestData();
  const toolData = useQuestToolData();
  const session = useQuestSession(data, toolData);
  const [recenterKey, setRecenterKey] = useState(0);
  const [preflightDismissed, setPreflightDismissed] = useState(false);
  useQuestDebugBridge({ data, session });

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
          <QuestPreflightGate
            data={data}
            session={session}
            supportState={supportState}
            message={message}
            preflightDismissed={preflightDismissed}
            onDismiss={() => setPreflightDismissed(true)}
            onEnterVr={handleEnterVr}
            onRecenter={handleRecenter}
          />
        )}
      </QuestSessionControls>
      <QuestPhoneOverlay session={session} />
      <QuestHud data={data} session={session} />
    </div>
  );
};

const QuestPreflightGate = ({
  data,
  session,
  supportState,
  message,
  preflightDismissed,
  onDismiss,
  onEnterVr,
  onRecenter,
}) => {
  useEffect(() => {
    if (supportState === 'unsupported') {
      onDismiss();
    }
  }, [onDismiss, supportState]);

  if (preflightDismissed || supportState === 'unsupported') return null;

  return (
    <QuestPreflightOverlay
      data={data}
      session={session}
      supportState={supportState}
      message={message}
      onEnterVr={onEnterVr}
      onPreviewDesktop={onDismiss}
      onRecenter={onRecenter}
    />
  );
};

export default QuestRoute;
