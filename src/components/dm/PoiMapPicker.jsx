import { useEffect, useMemo, useRef, useState } from 'react';

const PoiMapPicker = ({
  aspectRatio,
  imageUrl,
  markerStyle,
  markerLabel,
  values,
  onValueChange,
  onClamp,
  mapGridStep,
  mapFineOpen,
  onToggleMapFine,
  labelRow,
  onClearCoords,
  onPick,
  expanded,
  onExpandedChange,
  showExpandButton = true,
  showFineButton = true,
  afterPreview = null,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const thumbFrameRef = useRef(null);
  const thumbViewportRef = useRef(null);
  const overlayFrameRef = useRef(null);
  const overlayViewportRef = useRef(null);
  const isExpanded = typeof expanded === 'boolean' ? expanded : internalExpanded;
  const setExpandedState =
    typeof onExpandedChange === 'function' ? onExpandedChange : setInternalExpanded;

  const handleZoomMove = (frameRef, viewportRef) => (event) => {
    if (!frameRef.current || !viewportRef.current) return;
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    viewportRef.current.style.transformOrigin = `${x}% ${y}%`;
    viewportRef.current.style.transform = 'scale(2)';
  };

  const handleZoomLeave = (viewportRef) => () => {
    if (!viewportRef.current) return;
    viewportRef.current.style.transformOrigin = 'center center';
    viewportRef.current.style.transform = 'scale(1)';
  };

  const handlePick = (frameRef) => (event) => {
    if (!frameRef.current || !onPick) return;
    const rect = frameRef.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    onPick(x, y);
  };

  useEffect(() => {
    if (!isExpanded) return;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setExpandedState(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExpanded, setExpandedState]);

  const xyzValues = useMemo(
    () => ({
      x: values?.x ?? '',
      y: values?.y ?? '',
      radius: values?.radius ?? '',
      label: values?.label ?? '',
    }),
    [values],
  );

  return (
    <>
      <div className="dm-panel__map-thumb" style={{ aspectRatio }}>
        <div
          className="dm-panel__map-frame dm-panel__map-frame--thumb"
          ref={thumbFrameRef}
          onPointerMove={handleZoomMove(thumbFrameRef, thumbViewportRef)}
          onPointerLeave={handleZoomLeave(thumbViewportRef)}
          onClick={handlePick(thumbFrameRef)}
        >
          <div className="dm-panel__map-viewport">
            <div className="dm-panel__map-zoom-layer" ref={thumbViewportRef}>
              <img className="dm-panel__map-image" src={imageUrl} alt="Mapa Gotham" />
              <div className="dm-panel__map-marker" style={markerStyle}>
                {markerLabel && (
                  <span className="dm-panel__map-marker-label">{markerLabel}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {afterPreview}

      <div className="dm-panel__map-xyz">
        <input
          className="dm-panel__map-xyz-input"
          type="number"
          step="1"
          placeholder="X"
          value={xyzValues.x}
          onChange={(e) => onValueChange?.({ mapX: e.target.value })}
          onBlur={(e) => onValueChange?.({ mapX: onClamp(e.target.value) })}
        />
        <input
          className="dm-panel__map-xyz-input"
          type="number"
          step="1"
          placeholder="Y"
          value={xyzValues.y}
          onChange={(e) => onValueChange?.({ mapY: e.target.value })}
          onBlur={(e) => onValueChange?.({ mapY: onClamp(e.target.value) })}
        />
        <input
          className="dm-panel__map-xyz-input"
          type="number"
          step="0.1"
          placeholder="R"
          value={xyzValues.radius}
          onChange={(e) => onValueChange?.({ mapRadius: e.target.value })}
        />
        {showExpandButton && (
          <button
            type="button"
            className="dm-panel__ghost"
            onClick={() => setExpandedState(true)}
          >
            Expandir mapa
          </button>
        )}
        {showFineButton && (
          <button type="button" className="dm-panel__ghost" onClick={onToggleMapFine}>
            Ajuste fino
          </button>
        )}
      </div>

      {mapFineOpen && (
        <div className="dm-panel__map-fine">
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow ? labelRow('Label', 'Texto corto para el hotspot.') : 'Label'}
            <input
              type="text"
              value={xyzValues.label}
              onChange={(e) => onValueChange?.({ mapLabel: e.target.value })}
            />
          </label>
          <div className="dm-panel__map-fine-actions">
            <button type="button" className="dm-panel__ghost" onClick={onClearCoords}>
              Limpiar coordenadas
            </button>
            <span className="dm-panel__hint">
              Snap {Number.isFinite(mapGridStep) ? mapGridStep : 1}%.
            </span>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="dm-panel__overlay">
          <div className="dm-panel__overlay-backdrop" onClick={() => setExpandedState(false)} />
          <div className="dm-panel__overlay-dialog">
            <div className="dm-panel__overlay-header">
              <strong>Mapa / Hotspot</strong>
              <button
                type="button"
                className="dm-panel__ghost"
                onClick={() => setExpandedState(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="dm-panel__overlay-body">
              <div
                className="dm-panel__map-frame dm-panel__map-frame--overlay"
                ref={overlayFrameRef}
                style={{ aspectRatio }}
                onPointerMove={handleZoomMove(overlayFrameRef, overlayViewportRef)}
                onPointerLeave={handleZoomLeave(overlayViewportRef)}
                onClick={handlePick(overlayFrameRef)}
              >
                <div className="dm-panel__map-viewport">
                  <div className="dm-panel__map-zoom-layer" ref={overlayViewportRef}>
                    <img
                      className="dm-panel__map-image dm-panel__map-image--contain"
                      src={imageUrl}
                      alt="Mapa Gotham"
                    />
                    <div className="dm-panel__map-marker" style={markerStyle}>
                      {markerLabel && (
                        <span className="dm-panel__map-marker-label">{markerLabel}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="dm-panel__map-overlay-hint">
                Click para fijar coordenadas. Esc para cerrar.
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PoiMapPicker;
