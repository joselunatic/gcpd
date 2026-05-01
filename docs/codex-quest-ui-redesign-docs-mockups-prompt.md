# Prompt para Codex App Windows: UI VR Quest usando `/docs/mockups` y escena base Blender

## Uso

Pega este archivo como prompt en Codex App para Windows.

Antes de ejecutarlo, deja en el repo una carpeta:

- `docs/mockups/`

Dentro de esa carpeta coloca:

1. La captura actual de `/quest` en VR, donde se ve la UI apelotonada.
2. El mockup visual generado con la interfaz GCPD/Wayne limpia.
3. Cualquier otro mockup adicional que quieras que Codex use como referencia visual.

Adjunta también al prompt, si lo tienes disponible, el archivo:

- `quest_base_scene_v1.blend`

Codex debe usar los archivos de `docs/mockups/` como referencia visual local del proyecto. No debe convertir esos mockups en assets runtime. Son documentación visual para programar la UI.

---

## Prompt

Trabaja en el repo `joselunatic/gcpd`.

Estoy usando Codex App para Windows. El proyecto ya tiene integración IWSDK y scripts específicos para Windows.

## Contexto de referencias visuales

He creado una carpeta de documentación visual en:

- `docs/mockups/`

Ahí voy a dejar varios mockups y capturas de referencia.

Debes inspeccionar esa carpeta antes de programar.

Usa los mockups como dirección visual, no como assets finales.

Reglas sobre `docs/mockups/`:

- Trátala como documentación visual.
- No importes esas imágenes en la UI runtime.
- No copies un mockup como textura de fondo.
- No conviertas la UI en una imagen pegada sobre un plano.
- No muevas ni borres los mockups.
- Si necesitas documentar qué mockup usaste como referencia, hazlo por nombre de archivo.
- Si hay varios mockups, extrae patrones comunes: composición, jerarquía, separación, colores y zonas.

## Referencias esperadas en `docs/mockups/`

Puede haber, entre otras:

- una captura actual de `/quest` en VR;
- uno o varios mockups de UI deseada;
- iteraciones visuales alternativas.

La captura actual sirve para diagnosticar el problema:

- paneles y opciones apelotonados;
- solapamientos visuales;
- jerarquía de lectura confusa;
- tarjetas compitiendo en la misma superficie;
- sensación de layout colocado a mano.

Los mockups deseados sirven para definir dirección:

- rail lateral izquierdo;
- panel central dominante;
- columna derecha;
- banda inferior o zona estable de estado;
- tarjetas separadas;
- estética GCPD/Wayne;
- fondo oscuro;
- acentos cyan/azul;
- alto contraste;
- pocos elementos por bloque;
- composición amplia y legible.

## Objetivo principal

Rediseñar la UI VR inicial de `/quest` para que deje de estar apelotonada y se acerque a los mockups de `docs/mockups/`.

La solución debe ser una primera iteración implementable y validable, no una recreación artística completa.

Prioridad de esta tarea:

1. Layout XR limpio.
2. Separación clara entre zonas.
3. Legibilidad en visor.
4. Panel central dominante.
5. Rail lateral izquierdo estable.
6. Columna derecha para contexto/actividad.
7. Uso razonable de la escena base Blender como soporte físico si está disponible.
8. UI dinámica programada, no horneada como imagen o texto dentro del GLB.

## Escena base Blender

Si está disponible, usa el archivo:

- `quest_base_scene_v1.blend`

Trátalo como base ambiental/física, no como UI final.

La escena puede contener elementos como:

- `MainPanelFrame`
- `MainPanelScreen`
- `MainPedestal`
- `BasePlatform`
- `InnerPlatform`
- `RearHalo`
- `OverheadBridge`
- `LeftDataPylon`
- `RightDataPylon`
- `RunwayGlow`
- `RunwayStrip`
- `QuestPhoneModel`
- `QuestPhoneHandset`
- `QuestPhoneKey_*`
- cámaras tipo `QuestUserCam`, `QuestWideCam`, `QuestSideCam`
- materiales tipo `M_QuestScreen`, `M_QuestGlow`, `M_QuestTrim`, `M_QuestFloor`

Usa esta escena como entorno físico: sala, monitor, marco, teléfono, plataforma, luces y decoración.

No metas dentro del GLB textos estáticos, menús finales ni datos de UI. La UI debe seguir en React Three Fiber.

## Contexto técnico del repo

- Proyecto Vite + React.
- Ruta Quest: `/quest/*`.
- Quest usa React Three Fiber y `@react-three/xr`.
- `src/quest/QuestCanvas.jsx` monta `Canvas` y `XR store={xrStore}`.
- `src/quest/QuestStore.js` usa `createXRStore` con ray pointers para controllers/hands.
- `src/quest/QuestScene.jsx` compone la escena Quest.
- `src/quest/QuestEnvironment.jsx` probablemente carga o monta el entorno.
- `src/quest/QuestMonitorSurface.jsx` coloca la superficie principal.
- `src/quest/QuestModuleRouter.jsx` usa `QuestPanel3D`.
- `src/quest/components/QuestPanel3D.jsx` contiene el panel UI 3D actual.
- Existe integración IWSDK:
  - `npm run dev:iwsdk`
  - `npm run dev:iwsdk:status`
  - `npm run mcp:iwsdk`
  - `npm run iwsdk:sync`
- Existe adapter mínimo para scene MCP:
  - `src/quest/hooks/useQuestSceneMcpRuntime.js`
- No uses ECS. El repo no usa `@iwsdk/core`.

## Reglas estrictas

- No tocar la TUI principal.
- No cambiar rutas.
- No cambiar `vite.config.js`.
- No cambiar configuración IWSDK.
- No añadir dependencias.
- No migrar Vite.
- No reescribir toda la rama Quest.
- No cambiar la lógica de sesión salvo que sea imprescindible.
- No tocar `useQuestSession` salvo que sea imprescindible. Si crees que es imprescindible, detente y explica por qué antes de editar.
- No romper layouts existentes `dossier` e `instrument`.
- Esta primera fase debe centrarse en `layout === 'operations'`.
- Mantener compatibilidad con `@react-three/xr`.
- Mantener interacciones por ray pointer.
- Mantener callbacks existentes:
  - `onSelect`
  - `onAction`
  - `onBack`
  - `onHome`

## Decisión arquitectónica

Usa arquitectura híbrida:

- `.blend` / `.glb` para entorno físico y props.
- React Three Fiber para UI dinámica, botones, tarjetas, textos y estados.
- IWSDK para validar visualmente y depurar escena.
- `docs/mockups/` para documentación visual y comparación, no para runtime.

No conviertas el mockup en una imagen pegada en un plano.

No conviertas la UI dinámica en geometría fija dentro de Blender.

## Paso 1: inspección inicial

Antes de editar, inspecciona:

- `docs/mockups/`
- `src/quest/QuestScene.jsx`
- `src/quest/QuestEnvironment.jsx`
- `src/quest/QuestMonitorSurface.jsx`
- `src/quest/QuestModuleRouter.jsx`
- `src/quest/components/QuestPanel3D.jsx`

Devuelve un plan breve con:

- mockups encontrados;
- patrón visual común;
- archivos que vas a tocar;
- si vas a usar o no la escena Blender en esta iteración;
- riesgos.

Después implementa.

## Si puedes usar Blender

Si Codex puede abrir Blender o usar el MCP de Blender:

1. Abre `quest_base_scene_v1.blend`.
2. Inspecciona la jerarquía.
3. Confirma si existe `MainPanelScreen`.
4. Confirma su posición, escala y orientación.
5. Confirma si puede usarse como ancla de la UI.
6. Exporta una prueba a GLB si no existe ya:
   - `public/assets/quest/quest_base_scene_v1.glb`
7. Mantén nombres de objetos al exportar.
8. Evita exportar cámaras si no son necesarias.
9. Evita exportar elementos debug.
10. No añadas textos ni menús en Blender.

Si Blender no está disponible, no bloquees la tarea. Sigue con la UI programática y documenta que el uso del `.blend` queda pendiente.

## Si exportas GLB

Usa GLB como formato runtime.

Criterios:

- Mantener nombres de objetos.
- Materiales simples.
- Texturas razonables.
- Sin postprocesado pesado.
- Sin sombras dinámicas costosas en esta fase.
- Mantener el asset ambiental separado de la UI.
- No incluir assets temporales ni caches.

Si añades el GLB al repo, colócalo en:

- `public/assets/quest/quest_base_scene_v1.glb`

## Implementación UI

Crea una capa nueva de UI para `Operación actual`, en vez de seguir acumulando lógica dentro de `QuestPanel3D`.

Puedes crear archivos como:

- `src/quest/ui/questUiTokens.js`
- `src/quest/ui/QuestOperationsDashboard.jsx`
- `src/quest/ui/QuestModuleRail.jsx`
- `src/quest/ui/QuestInfoCard.jsx`
- `src/quest/ui/QuestActionTile.jsx`
- `src/quest/ui/QuestCanvasText.js`

Después modifica mínimamente:

- `src/quest/components/QuestPanel3D.jsx`

para que cuando `layout === 'operations'` renderice el nuevo dashboard.

Para otros layouts, conserva el comportamiento actual.

## Layout esperado

La composición debe parecerse estructuralmente a los mockups de `docs/mockups/`.

### Rail izquierdo

Debe contener botones grandes y separados:

- Operación actual
- Casos
- Mapa
- Perfiles
- Herramientas

Debe estar claramente separado del panel central.

### Panel central

Debe ser el área dominante.

Debe incluir:

- título `OPERACIÓN ACTUAL`
- foco principal, por ejemplo `ESCENA DEL CRIMEN` o el caso activo
- bloque `CASO ACTIVO`
- bloque `LEAD / STATUS`
- acciones primarias claras

### Columna derecha

Debe incluir:

- `ACTIVIDAD RECIENTE`
- `ACCESOS RÁPIDOS`
- estado o alertas secundarias

Debe estar separada del panel central, no encima.

### Banda inferior / status strip

Debe incluir datos compactos:

- alerta
- sincronía
- prioridad
- lead sugerida
- módulo actual

## Reglas visuales

- Nada debe solaparse.
- Las tarjetas deben respirar.
- El texto largo debe truncarse.
- El texto no debe invadir otros bloques.
- Los botones deben ser grandes para ray pointer.
- La selección activa debe ser visible sin depender solo de hover.
- La UI debe verse bien desde la posición de cámara/visor actual.
- Evitar demasiadas tarjetas en la misma fila.
- Evitar paneles pequeños con mucho texto.
- Evitar glow excesivo.
- Evitar que elementos decorativos tapen la lectura.

## Estilo visual

Usa geometría y materiales simples:

- `planeGeometry`
- `boxGeometry`
- materiales oscuros
- bordes cyan/azules
- fondos con baja opacidad
- acentos luminosos moderados
- alto contraste

Para texto y tarjetas, usa `CanvasTexture` o el patrón actual equivalente si ya existe.

Centraliza medidas y colores en tokens.

Evita magic numbers dispersos.

Ejemplo de tokens:

- ancho total del dashboard
- altura total
- ancho del rail izquierdo
- ancho de la columna derecha
- gap entre tarjetas
- z-offset de capas
- colores principales
- tamaños de fuente
- tamaños mínimos de botón

## Anclaje sobre la escena base

Si `MainPanelScreen` existe en el GLB o en la escena:

- úsalo como referencia física para colocar el dashboard;
- coloca la UI ligeramente delante de la pantalla;
- evita z-fighting;
- nombra claramente el grupo UI;
- documenta cómo se alinea el dashboard al panel.

Si no puedes usar `MainPanelScreen` todavía:

- usa la posición fija actual como fallback;
- crea el layout de forma que luego sea fácil anclarlo al panel real.

## Nombres de escena para IWSDK

Añade nombres claros en los grupos/meshes principales:

- `GCPD_Quest_MainDashboard`
- `GCPD_Quest_ModuleRail`
- `GCPD_Quest_CentralPanel`
- `GCPD_Quest_RightColumn`
- `GCPD_Quest_StatusStrip`
- `GCPD_Quest_ActionButton_<id>`
- `GCPD_Quest_InfoCard_<id>`

Esto debe permitir inspección con IWSDK MCP.

## Interacción

Mantén ray pointer.

Usa:

- `pointerEventsType={{ allow: 'ray' }}`
- zonas de click grandes;
- feedback visual de hover;
- feedback visual de selección activa.

No implementes navegación avanzada por sticks en esta tarea salvo que ya exista y solo haya que mantenerla.

## Calidad de código

- Código simple.
- Componentes pequeños.
- Medidas agrupadas.
- Texturas liberadas correctamente con `dispose`.
- Sin warnings nuevos de React.
- Sin errores de consola.
- Sin dependencias nuevas.
- Sin cambios funcionales fuera de `operations`.

## Validación local obligatoria

Ejecuta:

- `npm run build`

Si hay dev server y backend disponibles:

- `npm run smoke:quest-tools`

Si usas eslint, limítalo a Quest:

- `npx eslint src/quest --ext js,jsx --report-unused-disable-directives --max-warnings 0`

No ejecutes `npm run lint` global si falla por errores preexistentes fuera de Quest.

## Validación IWSDK recomendada

Si IWSDK está disponible:

1. Arranca backend:
   - `npm run server`

2. Arranca runtime:
   - `npm run dev:iwsdk`

3. Abre:
   - `http://localhost:5174/quest`

4. Usa MCP IWSDK si está disponible:
   - `browser_screenshot`
   - `browser_get_console_logs`
   - `scene_get_hierarchy`
   - `scene_get_object_transform`
   - `xr_get_session_status`

Criterio visual con IWSDK:

- La screenshot de `/quest` debe parecerse en estructura a los mockups de `docs/mockups/`.
- Debe verse claramente:
  - rail lateral izquierdo
  - panel central dominante
  - columna derecha
  - banda inferior/status
  - separación entre tarjetas
- No debe haber tarjetas encima de otras.
- No debe haber texto invadiendo otros bloques.
- No debe haber paneles fuera del campo principal.

## Documentación del resultado

Crea o actualiza:

- `docs/mockups/README.md`

Incluye:

- qué mockups se revisaron;
- qué patrones visuales se extrajeron;
- qué se implementó;
- qué queda pendiente;
- cómo añadir nuevos mockups para iteraciones futuras.

Si prefieres no modificar la carpeta de mockups, crea:

- `docs/quest-ui-redesign-notes.md`

pero documenta de todas formas las referencias visuales usadas.

## Entrega esperada

Al terminar, devuelve:

- Archivos modificados.
- Mockups usados como referencia.
- Resumen del diseño implementado.
- Si se usó o no el `.blend`.
- Si se exportó GLB, ruta del GLB.
- Cómo se ancla la UI al entorno.
- Comandos ejecutados y resultado.
- Screenshot IWSDK si se pudo capturar.
- Problemas encontrados.
- Próximo ajuste visual recomendado.

## Importante

No intentes alcanzar fidelidad artística completa en esta pasada.

No implementes imágenes, retratos, mapa elaborado ni assets externos.

No metas la UI final en Blender.

No uses los mockups como runtime assets.

El objetivo de esta iteración es que la UI VR sea legible, estable, ordenada, ajustable y visualmente cercana a los mockups de `docs/mockups/`.
