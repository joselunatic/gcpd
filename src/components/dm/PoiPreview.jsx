import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const PoiPreview = ({
  open = true,
  onToggle,
  data = null,
  title = 'Vista agente',
}) => {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!open) setExpanded(false);
  }, [open]);

  useEffect(() => {
    if (!expanded || typeof document === 'undefined') return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [expanded]);

  const detailOverlay =
    expanded && data ? (
      <div className="dm-panel__overlay">
        <div className="dm-panel__overlay-backdrop" onClick={() => setExpanded(false)} />
        <div className="dm-panel__overlay-dialog">
          <div className="dm-panel__overlay-header">
            <strong>{data.title}</strong>
            <button
              type="button"
              className="dm-panel__ghost"
              onClick={() => setExpanded(false)}
            >
              Cerrar
            </button>
          </div>
          <div className="dm-panel__overlay-body">
            {(data.meta || data.state) && (
              <div className="dm-panel__preview-meta">
                {[data.meta, data.state].filter(Boolean).join(' • ')}
              </div>
            )}
            {data.image && (
              <div className="dm-panel__preview-image dm-panel__preview-image--large">
                <img src={data.image} alt="POI" />
              </div>
            )}
            <div className="dm-panel__preview-summary">{data.summary}</div>
          </div>
        </div>
      </div>
    ) : null;

  if (!open) {
    return (
      <div className="dm-panel__card dm-panel__preview-card">
        <div className="dm-panel__panel-title">
          {title}
          <button
            type="button"
            className="dm-panel__ghost dm-panel__preview-toggle"
            onClick={onToggle}
          >
            Mostrar
          </button>
        </div>
        <p className="dm-panel__hint">Vista oculta.</p>
      </div>
    );
  }
  return (
    <div className="dm-panel__card dm-panel__preview-card">
      <div className="dm-panel__panel-title">
        {title}
        <button
          type="button"
          className="dm-panel__ghost dm-panel__preview-toggle"
          onClick={onToggle}
        >
          Ocultar
        </button>
      </div>
      <div className="dm-panel__preview-body">
        {data ? (
          <>
            <div className="dm-panel__preview-title">{data.title}</div>
            {(data.meta || data.state) && (
              <div className="dm-panel__preview-meta">
                {[data.meta, data.state].filter(Boolean).join(' • ')}
              </div>
            )}
            {data.image && (
              <div className="dm-panel__preview-image">
                <img src={data.image} alt="POI" />
              </div>
            )}
            <div className="dm-panel__preview-summary dm-panel__preview-summary--clamp">
              {data.summary}
            </div>
            <button
              type="button"
              className="dm-panel__ghost dm-panel__preview-open"
              onClick={() => setExpanded(true)}
            >
              Ver detalle
            </button>
          </>
        ) : (
          <p className="dm-panel__hint">Selecciona un POI para ver preview.</p>
        )}
      </div>
      {detailOverlay && typeof document !== 'undefined'
        ? createPortal(detailOverlay, document.body)
        : null}
    </div>
  );
};

export default PoiPreview;
