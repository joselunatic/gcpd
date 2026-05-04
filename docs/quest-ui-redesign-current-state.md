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
  - Los POIs de Quest exponen `x/y` derivados de `poiV2.geo` para que los hotspots XR se pinten sobre `public/mapa.png`.
  - La ficha de POI de Quest consume `poiV2.geo.image` y `poiV2.content.details/contacts/notes` cuando existen.

- `QuestSectionDashboard` mapa:
  - Mapa central ampliado para que `mapa.png` sea el foco principal.
  - Añadida capa canvas de POIs con decluttering: POI activo y POIs relevantes etiquetados, resto como puntos pequeños.
  - Los hit areas 3D de POI siguen activos para selección por ray.
  - Al seleccionar POI se muestra ficha con imagen, resumen, estado, distrito y datos operativos.
  - Al seleccionar recurso asociado, el recurso pasa a primer plano manteniendo el mapa como contexto.
  - Eliminado el falso control `+/-`, coordenadas visibles y acciones laterales no contextuales (`ver caso`, `ver perfil`, `rastreo`, `atrás`) del módulo mapa.

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

- `QuestWorkbenchRayBlocker`:
  - Añadida capa XR transparente alrededor del workbench activo en `herramientas`.
  - Bloquea rayos fuera del área central del workbench para evitar activar botones del dashboard inferior.
  - Mantiene prioridad menor que los controles del workbench, para no romper selección interna.

- Workbenches especializados:
  - DIAL/TRAZA, AUDIO, BALÍSTICA y STL se han reposicionado más lejos de cámara.
  - El objetivo es reducir la sensación de estar demasiado encima al abrir una herramienta.

- Saneado de labels visibles:
  - La UI de agentes no debe mostrar rutas internas, endpoints, nombres de archivo ni ids técnicos.
  - Si no hay label de producto válido se muestra `SIN LABEL`.
  - Las rutas siguen existiendo solo como datos internos para cargar recursos.

## Validación realizada

- `npx eslint src/quest/ui/QuestSectionDashboard.jsx src/quest/hooks/useQuestSession.js --ext js,jsx --report-unused-disable-directives --max-warnings 0`
- `npm run smoke:quest-tools`
- `npm run build`
- Playwright/IWSDK en `http://localhost:5174/quest`
- Playwright console: 0 errores en la página actual.
- IWSDK `scene_get_hierarchy`: runtime responde y permite inspección de escena.
- Playwright: mapa validado con `narrows` y `bancojones`; POIs visibles y recurso imagen de Banco Jones en primer plano.
- Playwright tras sincronizar DB con 38 POIs: sin errores de consola, POIs no activos reducidos para evitar apelotonamiento.
- Capturas generadas:
  - `quest-ui-workbench-priority-dial-clean.png`
  - `quest-ui-workbench-priority-stl-clean.png`
  - `quest-ux-fixes-dial-balanced.png`
  - `quest-ux-fixes-stl-balanced.png`
  - `quest-ui-pass-operation-2.png`
  - `quest-ui-pass-casos.png`
  - `quest-ui-pass-mapa-2.png`

## Estado visual actual

- Operación, casos y mapa tienen más contraste y lectura de visor.
- Mapa ya presenta POIs sobre mapa central y recursos en primer plano.
- Mapa usa coordenadas `poiV2.geo` reales de DM/API; si un POI no tiene geo, queda en la lista pero no se pinta como hotspot.
- Herramientas ya no carga STL directamente al entrar; muestra hub y submenú.
- Al seleccionar STL/DIAL/audio/balística/traza, el workbench activo domina el centro.
- DIAL se abre correctamente también si se invoca como `openTool('dial')`.
- Al abrir un workbench hay bloqueo transparente de rayos alrededor del área central.
- Los labels visibles ya no deben caer a `src`, `stlPath`, `pngPath`, `/api`, `/uploads` ni nombres de fichero.

## Riesgos / deuda UX pendiente

- Los workbenches especializados todavía tienen distinta densidad visual entre sí.
- DIAL/TRAZA siguen siendo los más densos por coexistencia de dial, mapa, ruta y estado.
- El viewer STL funciona, pero aún puede acercarse más al mockup si se amplía el escenario central y se reducen mini-controles.
- Faltan ajustes finos de navegación con stick derecho por grupo si el ray apunta a rail/centro/derecha.
- La capa de bloqueo usa cuatro planos transparentes dejando una apertura central; si aún hay fugas de rayos por huecos del workbench, ampliar esa máscara o añadir shields específicos por herramienta.
- IWSDK conserva logs antiguos de sockets suspendidos (`ERR_NETWORK_IO_SUSPENDED`) de sesiones previas, pero Playwright no ve errores actuales tras la navegación.
- Las capturas de validación están sin trackear; decidir si se conservan como evidencia o se limpian antes de commit.

## Siguiente bloque recomendado

1. Ajustar cada workbench especializado contra su mockup:
   - STL: escenario central más grande, selector izquierdo más compacto, acciones derechas más limpias.
   - Audio: waveform/spectrogram más protagonista.
   - Balística: dos muestras grandes y score central dominante.
   - DIAL/TRAZA: separar mejor dial izquierdo y traza derecha; mantener teléfono 2D/diegético sin volver al modelo 3D.
2. Validar cada herramienta con Playwright/IWSDK y capturas.
3. Revisar consola y `scene_get_hierarchy` tras los cambios.
