import { useEffect, useState } from 'react';

import { xrStore } from './QuestStore';

const QuestSessionControls = ({ onRecenter }) => {
  const [supportState, setSupportState] = useState('checking');
  const [message, setMessage] = useState(
    'Checking immersive VR support for this browser...'
  );

  useEffect(() => {
    let cancelled = false;

    const detectVrSupport = async () => {
      if (typeof navigator === 'undefined' || !('xr' in navigator)) {
        if (cancelled) return;
        setSupportState('unsupported');
        setMessage(
          'WebXR immersive VR is not available here. Desktop preview mode is active.'
        );
        return;
      }

      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (cancelled) return;
        if (supported) {
          setSupportState('supported');
          setMessage(
            'Immersive VR is supported. Use Meta Quest Browser to enter the headset session.'
          );
        } else {
          setSupportState('unsupported');
          setMessage(
            'This browser does not support immersive VR. Desktop preview mode is active.'
          );
        }
      } catch (error) {
        if (cancelled) return;
        setSupportState('unsupported');
        setMessage(
          'Immersive VR support could not be confirmed. Desktop preview mode is active.'
        );
      }
    };

    detectVrSupport();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleEnterVr = async () => {
    if (supportState !== 'supported') {
      setMessage('Immersive VR is not available in this browser/device.');
      return;
    }

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
      {supportState === 'supported' ? (
        <button type="button" onClick={handleEnterVr}>
          Enter VR
        </button>
      ) : (
        <div className="quest-session-controls__badge">
          Desktop Preview
        </div>
      )}
      <button
        type="button"
        className="quest-session-controls__secondary"
        onClick={onRecenter}
      >
        Recenter View
      </button>
      <p>{message}</p>
    </div>
  );
};

export default QuestSessionControls;
