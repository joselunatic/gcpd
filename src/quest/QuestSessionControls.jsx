import { useState } from 'react';

import { xrStore } from './QuestStore';

const QuestSessionControls = () => {
  const [message, setMessage] = useState(
    'Quest route ready. Enter VR from Meta Quest Browser or preview in desktop.'
  );

  const handleEnterVr = async () => {
    setMessage('Requesting immersive VR session...');
    try {
      const session = await xrStore.enterVR();
      if (!session) {
        setMessage('Immersive VR is not available in this browser/device.');
        return;
      }
      setMessage('Immersive VR session active.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Failed to enter immersive VR.'
      );
    }
  };

  return (
    <div className="quest-session-controls">
      <button type="button" onClick={handleEnterVr}>
        Enter VR
      </button>
      <p>{message}</p>
    </div>
  );
};

export default QuestSessionControls;
