import { useEffect, useRef } from 'react';

const ICONS = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
};

const AUTO_DISMISS_MS = 3500;

/**
 * Single toast item.
 * Props: { id, type, text, onDismiss }
 */
const Toast = ({ id, type = 'info', text, onDismiss }) => {
  const timerRef = useRef(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), AUTO_DISMISS_MS);
    return () => clearTimeout(timerRef.current);
  }, [id, onDismiss]);

  return (
    <div className={`dm-panel__toast dm-panel__toast--${type}`} role="status" aria-live="polite">
      <span className="dm-panel__toast-icon">{ICONS[type] ?? 'ℹ'}</span>
      <span className="dm-panel__toast-text">{text}</span>
      <button
        type="button"
        className="dm-panel__toast-close"
        aria-label="Cerrar notificación"
        onClick={() => onDismiss(id)}
      >
        ×
      </button>
    </div>
  );
};

/**
 * Toast container. Render once inside DmPanel when authorized.
 * Props: { toasts: [{ id, type, text }], onDismiss: (id) => void }
 */
const DmToast = ({ toasts = [], onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="dm-panel__toast-container" aria-label="Notificaciones">
      {toasts.map((t) => (
        <Toast key={t.id} {...t} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

export default DmToast;
