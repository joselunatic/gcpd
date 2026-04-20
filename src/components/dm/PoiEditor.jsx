import { useState } from 'react';
import PoiMapPicker from './PoiMapPicker';
import PoiImageCard from './PoiImageCard';

const PoiEditor = ({
  poiForm,
  setPoiForm,
  sections,
  toggleSection,
  renderSection,
  labelRow,
  savePoi,
  advancedOpen,
  toggleAdvanced,
  previewOpen,
  togglePreview,
  saveState,
  saveStateCompact,
  resetPoi,
  clearPoi,
  selectedPoi,
  deletePoi,
  poiMessage,
  isOperation,
  mapProps,
  mapFineOpen,
  onToggleMapFine,
  imageCardProps,
  mapGridStep,
  onClamp,
  nodeTypeOptions = [],
  parentOptions = [],
  updatedAtLabel = '',
}) => {
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  return (
    <form onSubmit={savePoi} className="dm-panel__form dm-panel__form--compact-poi">
      <div className="dm-panel__poi-actions dm-panel__poi-actions--sticky">
        <div className="dm-panel__poi-actions-left">
          <button type="button" className="dm-panel__ghost" onClick={resetPoi}>
            Nuevo
          </button>
          <button type="button" className="dm-panel__ghost" onClick={clearPoi}>
            Limpiar
          </button>
        </div>
        <div className="dm-panel__poi-actions-right">
          <button
            type="button"
            className="dm-panel__ghost dm-panel__ghost--utility"
            onClick={togglePreview}
          >
            {previewOpen ? 'Vista ▾' : 'Vista ▸'}
          </button>
          <button type="button" className="dm-panel__ghost dm-panel__ghost--utility" onClick={toggleAdvanced}>
            {advancedOpen ? 'Avanzado ▾' : 'Avanzado ▸'}
          </button>
          <button type="submit" className="dm-panel__primary">
            Guardar
          </button>
          <span className={`dm-panel__save-state dm-panel__save-state--${saveState.status}`}>
            {saveStateCompact}
          </span>
        </div>
      </div>

    {renderSection({
      id: 'poi-identity',
      title: 'Identidad',
      open: sections.identity,
      onToggle: () => toggleSection('pois', 'identity'),
      children: (
        <div className="dm-panel__form-group dm-panel__form-group--compact">
          <div className="dm-panel__form-grid dm-panel__form-grid--two dm-panel__form-grid--compact">
            <label className="dm-panel__field dm-panel__field--compact">
              {labelRow('ID', 'Identificador unico para la TUI.')}
              <input
                type="text"
                value={poiForm.id}
                readOnly={Boolean(selectedPoi?.id)}
                onChange={(e) => setPoiForm({ ...poiForm, id: e.target.value })}
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              {labelRow('Nombre', 'Nombre visible para agentes.')}
              <input
                type="text"
                value={poiForm.name}
                onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              {labelRow('Distrito', 'Zona de Gotham.')}
              <input
                type="text"
                value={poiForm.district}
                onChange={(e) =>
                  setPoiForm({ ...poiForm, district: e.target.value })
                }
              />
            </label>
            <label className="dm-panel__field dm-panel__field--compact">
              {labelRow('Estado', 'Estado operativo.')}
              <input
                type="text"
                value={poiForm.status}
                onChange={(e) => setPoiForm({ ...poiForm, status: e.target.value })}
              />
            </label>
          </div>
        </div>
      ),
    })}

    {renderSection({
      id: 'poi-summary',
      title: 'Información Pública',
      open: sections.summary,
      onToggle: () => toggleSection('pois', 'summary'),
      children: (
        <div className="dm-panel__form-group dm-panel__form-group--compact">
          <label className="dm-panel__field dm-panel__field--compact">
            {labelRow('Resumen', 'Texto breve visible para agentes.')}
            <textarea
              className={`dm-panel__textarea--compact${summaryExpanded ? ' is-expanded' : ''}`}
              value={poiForm.summary}
              onChange={(e) => setPoiForm({ ...poiForm, summary: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="dm-panel__toggle-link"
            onClick={() => setSummaryExpanded((prev) => !prev)}
          >
            {summaryExpanded ? 'Colapsar' : 'Expandir'}
          </button>
        </div>
      ),
    })}

    {renderSection({
      id: 'poi-map',
      title: 'Mapa / Hotspot',
      open: sections.map,
      onToggle: () => toggleSection('pois', 'map'),
      children: (
        <div className="dm-panel__form-group dm-panel__form-group--compact">
          <div className="dm-panel__map-picker dm-panel__map-picker--compact">
            <PoiMapPicker
              {...mapProps}
              values={{
                x: poiForm.mapX,
                y: poiForm.mapY,
                radius: poiForm.mapRadius,
                label: poiForm.mapLabel,
              }}
              onValueChange={(next) => setPoiForm((prev) => ({ ...prev, ...next }))}
              onClamp={onClamp}
              mapGridStep={mapGridStep}
              mapFineOpen={mapFineOpen}
              onToggleMapFine={onToggleMapFine}
              labelRow={labelRow}
              onClearCoords={() =>
                setPoiForm((prev) => ({
                  ...prev,
                  mapX: '',
                  mapY: '',
                  mapLabel: '',
                }))
              }
            />

            <PoiImageCard {...imageCardProps} />

            <p className="dm-panel__hint">
              Click en el mapa para fijar coordenadas (snap {mapGridStep}%).
            </p>
          </div>
        </div>
      ),
    })}

    {advancedOpen && !isOperation && renderSection({
      id: 'poi-content',
      title: 'Detalles',
      open: sections.content,
      onToggle: () => toggleSection('pois', 'content'),
      children: (
        <div className="dm-panel__form-group dm-panel__form-group--compact">
          <label>
            {labelRow('Detalles', 'Intel visible en la TUI.')}
            <textarea
              className="dm-panel__textarea--md"
              value={poiForm.details}
              onChange={(e) => setPoiForm({ ...poiForm, details: e.target.value })}
            />
          </label>
        </div>
      ),
    })}

    {advancedOpen && !isOperation && renderSection({
      id: 'poi-structure',
      title: 'Estructura',
      open: sections.engine,
      onToggle: () => toggleSection('pois', 'engine'),
      children: (
        <div className="dm-panel__form-group dm-panel__form-group--compact">
          <label>
            {labelRow('Nodo padre (ID)', 'Jerarquia en menus.')}
            <input
              type="text"
              list="poi-parent-options"
              value={poiForm.parentId}
              onChange={(e) => setPoiForm({ ...poiForm, parentId: e.target.value })}
              placeholder="Ej. poi_narrows"
            />
          </label>
          <datalist id="poi-parent-options">
            {parentOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </datalist>
          <div className="dm-panel__form-grid dm-panel__form-grid--two">
            <label>
              {labelRow('Tipo de nodo', 'Controla submenu.')}
              <select
                value={poiForm.nodeType}
                onChange={(e) => setPoiForm({ ...poiForm, nodeType: e.target.value })}
              >
                {nodeTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      ),
    })}

    {advancedOpen && selectedPoi && (
      <div className="dm-panel__form-group dm-panel__form-group--compact">
        <h4>Debug</h4>
        <div className="dm-panel__debug-grid">
          <div>
            <span className="dm-panel__debug-label">Ultima actualizacion</span>
            <span className="dm-panel__debug-value">{updatedAtLabel}</span>
          </div>
        </div>
        <button
          type="button"
          className="dm-panel__delete dm-panel__delete--compact"
          onClick={deletePoi}
        >
          Eliminar POI
        </button>
      </div>
    )}

    {poiMessage && <p className="dm-panel__hint">{poiMessage}</p>}
    </form>
  );
};

export default PoiEditor;
