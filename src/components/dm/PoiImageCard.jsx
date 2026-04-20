const PoiImageCard = ({
  imageUrl = '',
  onReplaceClick,
  onClear,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  uploading = false,
  error = '',
  previewUrl = '',
  onOpenCrop,
  fileInputRef,
}) => {
  if (imageUrl) {
    return (
      <div className="dm-panel__map-media-card">
        <div className="dm-panel__map-media-row">
          <img src={imageUrl} alt="POI" />
          <div className="dm-panel__map-media-actions">
            <button type="button" className="dm-panel__ghost" onClick={onReplaceClick}>
              Reemplazar
            </button>
            <button type="button" className="dm-panel__ghost" onClick={onClear}>
              Quitar
            </button>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />
      </div>
    );
  }

  return (
    <div className="dm-panel__map-media-card dm-panel__map-media-card--empty">
      <div
        className="dm-panel__map-drop"
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        Arrastra una imagen aqui
      </div>
      <label className="dm-panel__map-upload-row">
        Subir imagen
        <input
          ref={fileInputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.webp"
          onChange={onFileChange}
        />
      </label>
      {previewUrl && (
        <div className="dm-panel__map-media-preview">
          <img src={previewUrl} alt="Preview" />
          <button
            type="button"
            className="dm-panel__ghost"
            onClick={onOpenCrop}
            disabled={uploading}
          >
            {uploading ? 'Subiendo...' : 'Recortar'}
          </button>
        </div>
      )}
      {error && <p className="dm-panel__error">{error}</p>}
    </div>
  );
};

export default PoiImageCard;
