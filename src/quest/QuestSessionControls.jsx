import { useEffect, useState } from 'react';

import { xrStore } from './QuestStore';

const QuestSessionControls = ({ onRecenter, children = null }) => {
  const [supportState, setSupportState] = useState('checking');
  const [message, setMessage] = useState(
    'Comprobando compatibilidad de WebXR inmersivo en este navegador...'
  );

  useEffect(() => {
    let cancelled = false;

    const detectVrSupport = async () => {
      if (typeof navigator === 'undefined' || !('xr' in navigator)) {
        if (cancelled) return;
        setSupportState('unsupported');
        setMessage(
          'WebXR inmersivo no está disponible aquí. Se mantiene la vista previa de escritorio.'
        );
        return;
      }

      try {
        const supported = await navigator.xr.isSessionSupported('immersive-vr');
        if (cancelled) return;
        if (supported) {
          setSupportState('supported');
          setMessage(
            'VR inmersiva disponible. Usa Meta Quest Browser para entrar en la sesión del visor.'
          );
        } else {
          setSupportState('unsupported');
          setMessage(
            'Este navegador no soporta VR inmersiva. Se mantiene la vista previa de escritorio.'
          );
        }
      } catch (error) {
        if (cancelled) return;
        setSupportState('unsupported');
        setMessage(
          'No se ha podido confirmar la compatibilidad VR inmersiva. Se mantiene la vista previa de escritorio.'
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
      setMessage('La VR inmersiva no está disponible en este navegador o dispositivo.');
      return;
    }

    setMessage('Solicitando sesión inmersiva VR...');
    try {
      const session = await xrStore.enterVR();
      if (!session) {
        setMessage('La VR inmersiva no está disponible en este navegador o dispositivo.');
        return;
      }
      setMessage('Sesión VR inmersiva activa.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se ha podido entrar en VR inmersiva.'
      );
    }
  };

  if (typeof children === 'function') {
    return children({
      supportState,
      message,
      handleEnterVr,
    });
  }

  return (
    <>
      <div className="quest-session-controls">
        {supportState === 'supported' ? (
          <button type="button" onClick={handleEnterVr}>
            Entrar en VR
          </button>
        ) : (
          <div className="quest-session-controls__badge">
            Vista previa escritorio
          </div>
        )}
        <button
          type="button"
          className="quest-session-controls__secondary"
          onClick={onRecenter}
        >
          Recentrar vista
        </button>
        <p>{message}</p>
      </div>
    </>
  );
};

export default QuestSessionControls;
