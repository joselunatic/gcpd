# Quest UI mockups

## Referencias revisadas

- `general.png`: referencia principal para `operations`; rail izquierdo, panel central dominante, columna derecha y banda inferior.
- `casos.png`: confirma el patron de rail persistente y columna derecha para actividad/accesos.
- `mapa.png`: confirma composicion amplia con contenido principal dominante y filtros/contexto a la derecha.
- `perfiles` se deriva del patron de dossier: lista lateral, ficha central dominante y acciones/contexto a la derecha.
- `evidencias-stl.png`, `balistica.png` y `audio.png`: referencia para herramientas, especialmente visor 3D, comparadores y paneles laterales.

## Patrones extraidos

- Rail lateral izquierdo estable para cambiar de modulo.
- Area central grande, con una sola lectura principal.
- Columna derecha separada para actividad reciente y accesos rapidos.
- Banda inferior compacta para alerta, lead, sincronizacion y modulo activo.
- Fondos oscuros, bordes cyan/azules, alto contraste y poco glow.

## Implementado en esta iteracion

- Nueva capa programatica para `layout === "operations"` en `src/quest/ui/`.
- Primer sistema compartido para `layout === "dossier"` e `layout === "instrument"` con workspace central dominante, rail lateral, acciones contextuales y status strip.
- Variantes visuales procedurales por apartado:
  - `casos`: dossier/escena.
  - `mapa`: trazas de ciudad y marcadores.
  - `perfiles`: ficha de sujeto y vector de amenaza.
  - `herramientas`: visor STL, balistica, audio, comunicaciones o rastreo segun herramienta activa.
- La UI de `operations` se adelanta respecto al monitor fisico para funcionar como HUD holografico anclado a la escena, no como pantalla plana incrustada.
- Rail, panel central, columna derecha y status strip tienen separacion de profundidad, angulo y trazas luminosas propias.
- Dashboard con grupos nombrados para IWSDK:
  - `GCPD_Quest_MainDashboard`
  - `GCPD_Quest_ModuleRail`
  - `GCPD_Quest_CentralPanel`
  - `GCPD_Quest_RightColumn`
  - `GCPD_Quest_StatusStrip`
- La UI sigue siendo React Three Fiber dinamica. Ningun mockup se usa como asset runtime.
- `QuestPanel3D` se mantiene como router de compatibilidad; los layouts nuevos conservan `onSelect`, `onAction`, `onBack` y `onHome`.

## Pendiente

- Ajustar fidelidad visual tras screenshots en IWSDK/Quest Browser.
- Refinar proporciones y legibilidad en visor real, especialmente la distancia entre la UI flotante y las trazas luminosas del entorno.
- Convertir el workspace de `mapa` en una vista tactica mas rica y el workspace de `herramientas` en paneles especificos para STL, audio, balistica, traza y dial.
- Revisar si la escena Blender debe simplificar/ocultar el marco del monitor o anadir soportes ambientales para un visor mas envolvente. En esta iteracion Blender se uso solo para validar la escena base, sin cambios.

## Como anadir nuevos mockups

Guarda nuevas capturas o referencias en esta carpeta con nombres descriptivos. Usalas como documentacion visual: no deben importarse desde runtime ni convertirse en texturas finales.
