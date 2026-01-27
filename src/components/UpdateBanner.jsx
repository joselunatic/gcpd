import { useEffect, useState } from 'react';

const UpdateBanner = () => {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    const handler = () => setUpdateReady(true);
    window.addEventListener('sw-update-ready', handler);
    return () => window.removeEventListener('sw-update-ready', handler);
  }, []);

  const handleUpdate = () => {
    const reg = window.__swRegistration;
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!updateReady) return null;

  return (
    <div className="update-banner" role="status" aria-live="polite">
      <span>Nueva version disponible.</span>
      <button type="button" onClick={handleUpdate}>Actualizar</button>
    </div>
  );
};

export default UpdateBanner;
