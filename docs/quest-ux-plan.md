# Quest UX/UI plan

## Principios

- Mantener la UI diegetica: las acciones principales deben vivir en paneles y objetos XR antes que en overlays DOM.
- Conservar ray selection como interaccion primaria, pero anadir atajos fisicos cuando reduzcan precision necesaria.
- Validar cada bloque con IWSDK MCP cuando sea posible: screenshot, consola, escena y estado XR.
- Usar Blender para cambios de paneles, capas y geometria de escena cuando el MCP de Blender este conectado.

## Bloques

1. Entrada XR y overlays DOM
   - Evitar controles duplicados antes de entrar en VR.
   - Mantener un solo panel preflight con accion primaria y recenter.
   - Atenuar HUD/escritorio detras del preflight para preservar foco.

2. Navegacion fisica
   - Stick horizontal: cambiar modulo principal.
   - Stick vertical: cambiar seleccion en el modulo actual.
   - Ray selection sigue siendo la confirmacion precisa.

3. Panel central
   - Mejorar jerarquia visual y tamanos de texto por distancia real de visor.
   - Separar estado, foco y acciones en zonas mas estables.
   - Hacer mas visible la seleccion activa sin depender solo del hover.

4. Workbenches XR
   - Unificar botones, estados y feedback entre STL, balistica, dial y traza.
   - Dar feedback claro de accion ejecutada, bloqueo y resultado.

5. Escena Blender
   - Ajustar capas, inclinacion y distancias de paneles si el contenido queda pequeno o tapado.
   - Revisar soporte fisico de panel central, mapa y telefono.

## Estado

- Bloque 1 completado a nivel tecnico: preflight simplificado, HUD atenuado y recenter expuesto.
- Bloque 2 completado a nivel tecnico: navegacion por stick montada y puente debug disponible en `window.__GCPD_QUEST_CONTROLLER_NAV__`.
- Bloque 3 iniciado: rayos XR menos invasivos, panel central escalado/adelantado y seleccion activa con mas contraste.
- Blender MCP responde en `localhost:9876`; se uso para confirmar la geometria de `MainPanelScreen`. No se modifico la escena en este bloque.
- IWSDK MCP valida `/quest` con screenshot, consola sin errores nuevos y transform de `QuestMonitorSurface`.
