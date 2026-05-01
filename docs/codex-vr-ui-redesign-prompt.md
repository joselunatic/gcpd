# Prompt para Codex App Windows: rediseño UI VR Quest

## Cómo usar este prompt

Pega este archivo como prompt en Codex App para Windows.

Antes de enviarlo, adjunta también estas dos imágenes en el prompt de Codex:

1. **Captura actual de `/quest` en VR**  
   Es la imagen donde los paneles aparecen apelotonados y solapados.

2. **Mockup visual deseado**  
   Es la imagen generada con la interfaz GCPD más limpia: rail lateral izquierdo, panel central dominante, columna derecha y tarjetas bien separadas.

Codex debe usar la primera imagen como diagnóstico del problema y la segunda como dirección visual. No debe copiar el mockup como imagen; debe traducirlo a componentes XR programáticos con React Three Fiber.

---

## Prompt

Trabaja en el repo `joselunatic/gcpd`.

Estoy usando Codex App para Windows. Ten en cuenta que el proyecto ya tiene integración IWSDK y que en Windows existe un workaround local para arrancar `iwsdk dev up`.

Te adjunto dos imágenes:

- Imagen 1: estado actual de `/quest` en VR. Muestra el problema real: los paneles y opciones están apelotonados, hay solapamientos visuales, la jerarquía de lectura es confusa y las tarjetas compiten en la misma superficie.
- Imagen 2: mockup visual deseado. Úsalo como referencia de composición, no como imagen final. La dirección visual es: rail lateral izquierdo, panel central dominante, columna derecha, banda inferior de estado, tarjetas separadas, estética GCPD/Wayne oscura con cyan/azul, alto contraste y buena legibilidad en visor XR.

## Objetivo

Rediseñar la UI VR inicial de `/quest` para que deje de estar apelotonada y se parezca estructuralmente al mockup, pero implementada de forma programática con Three.js / React Three Fiber.

No quiero assets externos en esta fase. No quiero imagen de fondo. No quiero retratos reales. No quiero mapa elaborado. No quiero modificar Blender ni GLB. El objetivo de esta primera iteración es layout, escala, separación, legibilidad y navegación XR.

## Contexto técnico del repo

- Proyecto Vite + React.
- Ruta Quest: `/quest/*`.
- Quest usa React Three Fiber y `@react-three/xr`.
- `src/quest/QuestCanvas.jsx` monta `Canvas` y `XR store={xrStore}`.
- `src/quest/QuestStore.js` usa `createXRStore` con ray pointers para controllers/hands.
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
- No cambiar la configuración IWSDK.
- No añadir dependencias.
- No modificar assets GLB ni usar Blender en esta tarea.
- No migrar Vite.
- No reescribir todo Quest.
- No tocar `useQuestSession` salvo que sea imprescindible. Si lo ves imprescindible, detente y explícame por qué antes de editarlo.
- No romper layouts existentes `dossier` e `instrument`. Esta primera fase debe limitarse a `layout === 'operations'`.
- Mantener compatibilidad con `@react-three/xr`.
- Mantener interacciones por ray pointer.
- Mantener callbacks existentes:
  - `onSelect`
  - `onAction`
  - `onBack`
  - `onHome`

## Resultado visual esperado

Implementa una primera versión del nuevo layout solo para `Operación actual`.

Debe verse como un dashboard XR limpio:

- Rail izquierdo con botones:
  - Operación actual
  - Casos
  - Mapa
  - Perfiles
  - Herramientas
- Panel central dominante:
  - título `OPERACIÓN ACTUAL`
  - foco principal, por ejemplo `ESCENA DEL CRIMEN` o el caso activo
  - bloque `CASO ACTIVO`
  - bloque `LEAD / STATUS`
- Columna derecha:
  - `ACTIVIDAD RECIENTE`
  - `ACCESOS RÁPIDOS`
- Zona inferior o banda estable:
  - estado operativo
  - prioridad
  - lead sugerida
- Separación visible entre bloques.
- Nada debe solaparse.
- Los textos largos deben truncarse.
- El texto no debe invadir otros bloques.
- Los botones deben tener zona de click suficientemente grande para ray pointer.
- La selección activa debe ser visible sin depender solo del hover.
- La composición debe verse bien desde la posición de cámara/visor actual.

## Implementación sugerida

Crea una capa nueva de UI en vez de seguir acumulando lógica dentro de `QuestPanel3D`.

Puedes crear archivos como estos, ajustando nombres si ves una opción mejor:

- `src/quest/ui/questUiTokens.js`
- `src/quest/ui/QuestDashboardPanel.jsx`
- `src/quest/ui/QuestModuleRail.jsx`
- `src/quest/ui/QuestInfoCard.jsx`
- `src/quest/ui/QuestActionTile.jsx`
- `src/quest/ui/QuestCanvasText.js`

Después modifica mínimamente:

- `src/quest/components/QuestPanel3D.jsx`

para que cuando `layout === 'operations'` renderice el nuevo dashboard. Para otros layouts, conserva el comportamiento actual.

## Nombres de escena para IWSDK

Añade nombres claros en los grupos/meshes principales para poder inspeccionarlos con IWSDK MCP:

- `GCPD_Quest_MainDashboard`
- `GCPD_Quest_ModuleRail`
- `GCPD_Quest_CentralPanel`
- `GCPD_Quest_RightColumn`
- `GCPD_Quest_StatusStrip`
- `GCPD_Quest_ActionButton_<id>`

## Estilo visual

Usa geometría y materiales simples:

- `planeGeometry`
- `boxGeometry`
- materiales oscuros
- bordes cyan/azules
- fondos con baja opacidad
- acentos luminosos moderados
- alto contraste
- sin brillos excesivos
- sin elementos decorativos que tapen texto

Para texto y tarjetas, usa el patrón actual de texturas canvas / `CanvasTexture` si encaja con la implementación existente.

Centraliza medidas y colores en tokens. Evita magic numbers dispersos.

Ejemplo de estructura de tokens:

- ancho total del dashboard
- altura total
- ancho del rail izquierdo
- ancho de la columna derecha
- gap entre tarjetas
- z-offset de capas
- colores principales
- tamaños de fuente
- tamaños mínimos de botón

## Criterio de calidad de código

- Código simple.
- Pocos componentes.
- Layout fácil de ajustar.
- Texturas liberadas correctamente con `dispose`.
- Sin warnings nuevos de React.
- Sin errores de consola.
- Sin cambios funcionales fuera de `operations`.
- No pegar imágenes ni usar assets externos.

## Validación local obligatoria

Ejecuta:

- `npm run build`

Si hay dev server y backend disponibles, ejecuta también:

- `npm run smoke:quest-tools`

Si usas eslint, limítalo a Quest para evitar fallos preexistentes fuera del área de trabajo:

- `npx eslint src/quest --ext js,jsx --report-unused-disable-directives --max-warnings 0`

## Validación IWSDK recomendada

Si IWSDK está disponible en la sesión:

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

Criterio visual con IWSDK:

- La screenshot de `/quest` debe parecerse en estructura al mockup.
- Debe verse claramente:
  - rail lateral izquierdo
  - panel central dominante
  - columna derecha
  - banda inferior/status
  - separación entre tarjetas
- No debe haber tarjetas encima de otras.
- No debe haber texto invadiendo otros bloques.
- No debe haber paneles fuera del campo principal.

## Entrega esperada

Al terminar, devuelve:

- Archivos modificados.
- Resumen del diseño implementado.
- Comandos ejecutados y resultado.
- Screenshot IWSDK si se pudo capturar.
- Problemas encontrados.
- Próximo ajuste visual recomendado.

## Importante

No intentes alcanzar fidelidad artística completa en esta pasada.

No implementes imágenes, retratos, mapa elaborado ni assets externos.

El objetivo de esta iteración es que la UI VR sea legible, estable, ordenada y ajustable. La estética avanzada vendrá después.
