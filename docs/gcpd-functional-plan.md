# GCPD Auxiliary Terminal – Functional Blueprint

## 1. Objetivos y restricciones
- Mantener la experiencia “mainframe” secuencial (marcador → login → consola) pero remapeada al contexto GCPD usando equipo heredado de Batman.
- Separar claramente lo que ve el jugador/agente de los controles y spoilers del DM.
- Permitir que el contenido narrativo (casos, eventos, mensajes) se cargue como módulos configurables sin tocar código.
- Facilitar cambios de skin más adelante (soporte de temas, assets intercambiables) sin reescribir la lógica base.

## 2. Roles y flujos
- **Agente GCPD (jugador)**  
  1. Arranque con dialer que simula enlazar con la “Aux Node” de Batman.  
  2. Login con credenciales o desafíos definidos por el DM (p.ej. “passphrase” recibida en la partida).  
  3. Consola principal con comandos: `HELP`, `MODULES`, `CASE <id>`, `SCAN`, `COMMS`, `LOGOUT`, etc.  
  4. Acceso a minijuegos/herramientas (p. ej. descifrar, sudoku) para resolver puzzles específicos del módulo activo.
- **DM (operador)**  
  - Panel privado accesible por ruta protegida (`/dm`) o atajo oculto que requiera PIN.  
  - Puede cargar/crear módulos (JSON/YAML), habilitarlos, pausar eventos, enviar mensajes “push” a los agentes.  
  - Controla estados globales (alarma, lockdown, disponibilidad de gadgets).

## 3. Estados/pantallas previstos
1. Dialer “Baticueva” (sin cambios estructurales, solo contenidos).  
2. Login personalizado: admitir múltiples credenciales y hooks para desafíos (pregunta secreta, puzzle, multi-factor).  
3. Consola principal (loop `main` actual) consumiendo contenidos dinámicos:  
   - Feed de casos activos.  
   - Respuestas contextuales según módulo.  
   - Integración con minijuegos existentes (TTT/Hangman/Sudoku) reconvertidos en “herramientas”.  
4. Alert overlays (full-screen templates ya soportadas vía `showTemplateScreen`) para eventos importantes.

## 4. Arquitectura de módulos
- Ficheros en `public/data/cases/*.json` con estructura base:
  ```json
  {
    "id": "case_madhatter",
    "title": "Operation Wonderland",
    "status": "locked|active|resolved",
    "unlockConditions": ["flag:oracle_online"],
    "commands": {
      "brief": ["texto..."],
      "intel": ["listado..."],
      "puzzle": {
        "type": "sudoku",
        "config": { "seed": 12345 }
      }
    },
    "dm": {
      "notes": "...",
      "spoilers": ["..."]
    }
  }
  ```
- Loader compartido entre jugador y DM:  
  - Jugador solo ve campos públicos.  
  - Panel DM muestra sección `dm`.
- Flags globales guardados en `localStorage`/`BroadcastChannel` para sincronizar desbloqueos sin recargar.

## 5. Panel DM
- Ruta nueva en React (`/dm`), diseño minimal para ahora. Funcionalidades mínimas:  
  1. Lista de módulos con estados + botón “activar/desactivar”.  
  2. Editor rápido (textarea/json) para cargar modificaciones desde archivos.  
  3. Controles de estado global (sirena, blackout, comunicación Oracle).  
  4. Terminal rápida para enviar mensajes a la sesión del jugador (publicar en `localStorage` o `postMessage`).  
- Autenticación básica inicial: PIN almacenado en `.env`/`localStorage` hasta que se defina otra opción.

## 6. Hooks técnicos necesarios
- Refactor ligero de `public/utils/screens.js` para que las cadenas estáticas vengan de un “data provider” (permitirá cambiar textos según módulo/tema).  
- Servicio de eventos compartido (`src/js/event-bus.js` o `utils/bus.ts`) para:  
  - Abrir juegos (`loadgame`, ya existe).  
  - Notificar cambios de módulo (`module:activate`, `module:update`).  
  - Enviar mensajes DM→Jugador (`dm:message`).
- Persistencia:  
  - Estado del terminal en `localStorage` (ya se usa), ampliar con `gcpd.flags` y `gcpd.activeModule`.  
  - Opcional: fallback a ficheros JSON servidos por Vite (solo lectura) + posibilidad futura de API.

## 7. Próximos pasos
1. Preparar entorno (instalar dependencias, scripts, carpeta `public/data/cases`).  
2. Crear loader de módulos y exponer un hook simple a `screens.js`.  
3. Implementar comando `MODULES` para listar módulos disponibles.  
4. Prototipo `/dm` con lectura/activación de módulos y publicación de flags.  
5. Iterar sobre comandos y minijuegos para alinearlos con los casos GCPD.
