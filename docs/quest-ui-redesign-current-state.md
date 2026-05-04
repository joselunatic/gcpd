# Quest UI Redesign - Estado Actual

Fecha: 2026-05-03

## Objetivo del bloque

Acercar la UI XR de `/quest` a los mockups de `docs/mockups` sin reescribir la arquitectura, manteniendo `@react-three/xr`, el flujo de datos existente y los workbenches específicos.

## Cambios aplicados

- `QuestOperationsDashboard`:
  - Refuerzo visual transversal: más contraste, glow, scanlines, paneles activos más claros y barras de estado en rail.
  - El rail activo usa marcador plano, no geometría 3D intrusiva.

- `QuestSectionDashboard`:
  - Refuerzo visual común para casos, mapa, perfiles y herramientas.
  - En `mapa`, el panel central usa `public/mapa.png` como superficie táctica principal con POIs interactivos.
  - En `herramientas`, si hay herramienta activa, el dashboard genérico ya no ocupa el centro: se deja el workbench real como primer plano.
  - El hub de herramientas sin selección sigue mostrando el workspace central de selección.

- `QuestMapSurface`:
  - La superficie física lateral de mapa ya no se renderiza durante el módulo `mapa`, para evitar mapa duplicado.
  - Sigue disponible como prop contextual en TRACER/rastreo.

- `buildQuestModuleModel`:
  - Labels de recursos de POI usan texto legible en lugar de `src/filename`.
  - El mapa evita mostrar `INTEL 1`, `INTEL 2`, etc. cuando no hay recurso seleccionado.

- `useQuestSession`:
  - Alias internos añadidos:
    - `dial` -> `comunicaciones`
    - `telefonia` -> `comunicaciones`
    - `phone` -> `comunicaciones`
    - `traza` -> `rastreo`
    - `tracer` -> `rastreo`
  - Esto permite que debug/bridge/órdenes humanas usen vocabulario de producto sin romper ids internos.

- `DmPanel.styles.css`:
  - Fix previo de layout en `DM > Tracer`, donde las líneas se rompían en texto vertical.

## Validación realizada

- `npx eslint src/quest/ui/QuestSectionDashboard.jsx src/quest/hooks/useQuestSession.js --ext js,jsx --report-unused-disable-directives --max-warnings 0`
- `npm run smoke:quest-tools`
- Playwright/IWSDK en `http://localhost:5174/quest`
- Capturas generadas:
  - `quest-ui-workbench-priority-dial-clean.png`
  - `quest-ui-workbench-priority-stl-clean.png`
  - `quest-ui-pass-operation-2.png`
  - `quest-ui-pass-casos.png`
  - `quest-ui-pass-mapa-2.png`

## Estado visual actual

- Operación, casos y mapa tienen más contraste y lectura de visor.
- Mapa ya presenta POIs sobre mapa central y recursos en primer plano.
- Herramientas ya no carga STL directamente al entrar; muestra hub y submenú.
- Al seleccionar STL/DIAL/audio/balística/traza, el workbench activo domina el centro.
- DIAL se abre correctamente también si se invoca como `openTool('dial')`.

## Riesgos / deuda UX pendiente

- Los workbenches especializados todavía tienen distinta densidad visual entre sí.
- DIAL/TRAZA siguen siendo los más densos por coexistencia de dial, mapa, ruta y estado.
- El viewer STL funciona, pero aún puede acercarse más al mockup si se amplía el escenario central y se reducen mini-controles.
- Faltan ajustes finos de navegación con stick derecho por grupo si el ray apunta a rail/centro/derecha.
- Las capturas de validación están sin trackear; decidir si se conservan como evidencia o se limpian antes de commit.

## Siguiente bloque recomendado

1. Ajustar cada workbench especializado contra su mockup:
   - STL: escenario central más grande, selector izquierdo más compacto, acciones derechas más limpias.
   - Audio: waveform/spectrogram más protagonista.
   - Balística: dos muestras grandes y score central dominante.
   - DIAL/TRAZA: separar mejor dial izquierdo y traza derecha; mantener teléfono 2D/diegético sin volver al modelo 3D.
2. Validar cada herramienta con Playwright/IWSDK y capturas.
3. Revisar consola y `scene_get_hierarchy` tras los cambios.
