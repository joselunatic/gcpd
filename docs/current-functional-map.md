# Mapa Funcional Actual Del Repo

Fecha de revision original: 2026-04-20

Nota de vigencia: revisado superficialmente el 2026-06-01. Este documento sigue siendo util para el flujo funcional base del terminal/DM, pero no cubre en detalle el trabajo posterior de Quest/XR ni el Live Map tactico. Para esos temas usar `codex_to_claude.md`, `docs/live-map-handoff.md` y los docs Quest especificos.

Este documento resume el comportamiento real del repo tras integrar el bundle remoto con `TRACER`, `PHONE`, `AUDIO` y `BALLISTICA`.

## Resumen Ejecutivo

El proyecto tiene dos superficies principales:

1. Superficie de jugador:
   - terminal diegetico con dialer inicial
   - acceso al nodo principal `BROTHER-MK0`
   - acceso a una consola secundaria `REMOTE OS`
   - herramientas diegeticas nuevas: `TRACER`, `DIAL`, `AUDIO`, `BALLISTICA`, `SHOW`

2. Superficie DM:
   - panel de gestion en `/dm`
   - puente rapido de operacion telefonica en `/phone`
   - documentacion visual ligera en `/docs`

## Rutas Actuales

Definidas en [src/App.jsx](C:/Repos/gcpd/src/App.jsx) y [src/components/IMSAI/Monitor.jsx](C:/Repos/gcpd/src/components/IMSAI/Monitor.jsx).

- `/docs`
  - renderiza [src/components/DocsPage.jsx](C:/Repos/gcpd/src/components/DocsPage.jsx)
  - hoy muestra `docs/dm-db-esquema.md`

- `/dm`
  - panel principal de DM
  - componente: [src/components/DmPanel.jsx](C:/Repos/gcpd/src/components/DmPanel.jsx)

- `/phone`
  - operador movil para llamadas `TRACER`
  - componente: [src/components/PhonePanel.jsx](C:/Repos/gcpd/src/components/PhonePanel.jsx)

- `/tic-tac-toe`
- `/hangman`
- `/sudoku`
- `/global-thermonuclear-war`
- `/pacman`
  - minijuegos cargados dentro del monitor CRT

- `/*`
  - terminal principal con boot y shell diegetica

## Flujo Actual Del Jugador

La logica principal vive en [public/utils/screens.js](C:/Repos/gcpd/public/utils/screens.js).

### 1. Boot

- La app entra por la shell CRT.
- Si no se desactiva por modo rapido, muestra `BootAscii`.
- Tras el boot, cae al terminal.

### 0. Arranque Rapido Del Terminal

Metodo de arranque operativo para validaciones manuales:

1. Abrir `/`
2. Pulsar el switch `PWR ON/OFF` del panel frontal para encender el monitor
3. Esperar al boot hasta que aparezca el dialer

Atajos utiles:

- `RUN/STOP`
  - hace reset a estado de boot y vuelve a cargar la TUI desde dialer/login
- `RESET / EXT. CLR`
  - limpia estado de login persistido y fuerza reinicio del terminal

Referencia tecnica:

- encendido por switch `POWER` en [src/components/IMSAI/Base.jsx](C:/Repos/gcpd/src/components/IMSAI/Base.jsx)
- recarga de la TUI en [src/js/terminal.js](C:/Repos/gcpd/src/js/terminal.js)

### 2. Dialer Inicial

Estado interno: `dialer`

El dialer muestra 5 lineas WayneTech verificadas:

1. `GARAJE DE LA BATCUEVA`
2. `FAILSAFE ZUR-EN-ARRH`
3. `TERMINAL OS`
4. `CLOCKTOWER BACKUP`
5. `ALA SEGURA DE ARKHAM`

Nota: en pantalla se presentan 5 entradas del array `dialerLines`; las lineas no activas muestran texto narrativo y vuelven al dialer con `RETURN`.

### 3. Tipos De Linea En El Dialer

- `message`
  - abre una ficha diegetica de texto
  - no entra al sistema jugable

- `activate`
  - actualmente: legacy / no visible en el dialer inicial reducido
  - dispara animacion de modem y va a `login()`

- `remote-os`
  - actualmente: `TERMINAL OS`
  - dispara animacion de modem y entra en una shell limitada `REMOTE>`

### 4. Login De BROTHER-MK0

Estado interno: `login`

Nota operativa:

- el login clasico sigue existiendo en codigo
- ya no es la ruta principal del dialer visible reducido
- la entrada jugable principal desde el dialer pasa por `TERMINAL OS` hacia `REMOTE>`

Claves aceptadas hoy:

- `joshua`
- `oracle`
- `brothereye`
- `wayne`

Si el login es correcto, entra en `main_with_info()` y deja acceso al terminal principal del nodo.

### 5. Home Del Nodo Principal

Estados internos: `main_with_info()` y `main()`

Banner actual:

- `WAYNE INDUSTRIES AUX NODE // BROTHER-MK0`
- `STATUS: KNIGHTFALL CONTINGENCY ACTIVE`
- `BATMAN: UNRESPONSIVE | BATSIGNAL: DARK`

Opciones visibles de entrada:

1. `HELP`
2. `CASES`
3. `MAP`
4. `VILLAINS`

En movil este home actua como menu seleccionable.
En desktop permite seguir escribiendo comandos libres tras mostrar el home.

### 6. Remote OS

Entrada principal desde la linea `TERMINAL OS`.

Componente logico: [public/utils/remoteOs.js](C:/Repos/gcpd/public/utils/remoteOs.js)

Prompt:

- `REMOTE>`

Es una shell secundaria con:

- `HELP`
- `INFO <entidad> <atributo>`
- `SCAN` / `FIND <entidad>`
- `SHOW`
- `BALLISTICA`
- `AUDIO [id]`
- `DIAL <telefono>`
- `TRACER <telefono>`
- comandos globales configurados por DM
- salida con `EXIT`, `BYE`, `HANGUP`

En la practica actual del producto, esta es la shell principal accesible para jugador desde el dialer.

## Comandos Actuales Del Jugador

Superficie principal de comandos:

- `HELP`
- `STATUS`
- `SUMMARY`
- `FLAGS`
- `LAST`
- `MAP`
- `CASES`
- `MODULES`
- `CASE <id>`
- `VILLAINS`
- `SHOW W`
- `SHOW JOKER`
- `SHOW BALA`
- `SHOW <evidence-id>`
- `AUDIO [id]`
- `BALLISTICA`
- `DIAL <telefono>`
- `DIALER`
- `TRACER <telefono>`
- `CLEAR`
- `TOUCH [ON|OFF]`
- `LOGOUT`
- `EXIT`
- `QUIT`
- `HELLO`

## Funciones Jugables Reales

### Cases

Archivo principal: [public/commands/cases.js](C:/Repos/gcpd/public/commands/cases.js)

- carga de `/api/cases-data`
- fallback a contenido local si falla
- soporte de jerarquia caso/subcaso
- control de acceso por:
  - visibilidad
  - password
  - prerequisites
  - flags
- marcado de vistos y deltas
- soporte de puzzle configurado en el caso

### Map

Archivo principal: [public/commands/map.js](C:/Repos/gcpd/public/commands/map.js)

- carga de `/api/pois-data`
- fallback a JSON local
- overlay cartografico de Gotham
- hotspots desde POIs y/o JSON auxiliar
- control de acceso a POIs
- imagenes de POI y detalle contextual

### Villains

Archivo principal: [public/commands/villains.js](C:/Repos/gcpd/public/commands/villains.js)

- carga de `/api/villains-data`
- fallback local
- control de acceso por entidad
- atributos bloqueables por campo
- ficha expandida de villano

### Show

Archivo principal: [public/commands/show.js](C:/Repos/gcpd/public/commands/show.js)

- visor 3D/ASCII dentro del CRT
- modelos especiales:
  - `SHOW W`
  - `SHOW JOKER`
  - `SHOW BALA`
- tambien puede abrir evidencias STL configuradas por DM

### Audio

Archivo principal: [public/commands/audio.js](C:/Repos/gcpd/public/commands/audio.js)

- reproductor CRT de audio
- visualizacion osciloscopio
- desbloqueo de audios protegidos por password
- usa `/api/audio` y `/api/audio-unlock`

### Dial

Archivo principal: [public/commands/dial.js](C:/Repos/gcpd/public/commands/dial.js)

- marca una linea telefonica registrada por DM
- reproduce audio asociado a esa linea
- respeta estado `rellamable/llamado`
- marca lineas ya llamadas con `/api/phone-lines-called`

### Tracer

Archivo principal: [public/commands/tracer.js](C:/Repos/gcpd/public/commands/tracer.js)

- comando real y operativo, ya no solo una idea de diseño
- uso: `TRACER <telefono>`
- abre overlay CRT de rastreo
- conecta por WebSocket a `/ws/tracer?role=agent`
- necesita operador DM disponible
- evoluciona por fases temporales:
  - Fase 0: cobertura total
  - Fase 1: radio reducido
  - Fase 2: triangulacion avanzada
  - Fase 3: posicion exacta

## Phone Bridge Para DM

Ruta: `/phone`

Archivo principal: [src/components/PhonePanel.jsx](C:/Repos/gcpd/src/components/PhonePanel.jsx)

Funcion:

- superficie movil rapida para operador de llamadas `TRACER`
- muestra estado WebSocket
- muestra llamada entrante / activa
- muestra reloj `T+`
- permite atender y colgar
- refleja la fase actual del trazado

Esta es la superficie canonica de operacion en vivo para `TRACER`.

## Panel DM

Ruta: `/dm`

Archivo principal: [src/components/DmPanel.jsx](C:/Repos/gcpd/src/components/DmPanel.jsx)

### Acceso

- login por password
- sesion por token
- verificacion de sesion
- cambio de contraseña

### Vistas Actuales

Segun `VIEW_OPTIONS`:

- `Cases`
- `POIs`
- `Villains`
- `Evidencias`
- `Tracer`
- `Accesos`
- `Campaña`

### Capacidades Del DM

#### Cases

- listar
- seleccionar
- crear caso raiz
- crear subcaso
- editar metadatos y contenido
- configurar acceso
- borrar

#### POIs

- listar
- editar
- posicionar en mapa
- subir imagen
- recortar imagen
- previsualizar
- borrar

#### Villains

- CRUD completo
- configuracion de acceso por atributo

#### Evidencias

Subtabs actuales:

- `STL`
- `BALLISTICS`
- `AUDIO`
- `PHONES`

Funciones:

- subir STL
- registrar comando asociado a evidencia
- cargar PNGs balisticos
- registrar comparativas balisticas
- subir MP3
- generar variante `garbled`
- registrar lineas telefonicas y vincularlas a audios

#### Tracer

- gestionar hotspots
- gestionar lineas tracer
- asociar numero a hotspot
- activar/desactivar lineas
- ver estado del operador WebSocket

Modelo final del tab `Tracer`:

- sin controles live de atender/colgar
- mapa grande de hotspots
- etiquetas separadas:
  - label de linea: orientado a DM
  - label de hotspot: orientado a agente

#### Accesos

- configuracion de visibilidad
- unlock mode
- password
- prerequisites
- flags
- initial status
- desbloqueo granular de atributos de villanos

#### Campaña

- flags globales
- alert level
- active case id
- casos desbloqueados
- POIs desbloqueados
- villanos desbloqueados
- comandos globales custom para el terminal

## APIs Activas

Principalmente en [server/index.js](C:/Repos/gcpd/server/index.js)

### Auth

- `GET /api/auth/session`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/password`

### Campaign Y Comandos Globales

- `GET /api/campaign-state`
- `POST /api/campaign-state`
- `GET /api/global-commands`
- `POST /api/global-commands`

### Evidence / Ballistics / Audio / Phones / Tracer

- `GET /api/evidence`
- `POST /api/evidence`
- `POST /api/evidence-upload`
- `GET /api/ballistics`
- `POST /api/ballistics`
- `GET /api/ballistics-assets`
- `POST /api/ballistics-upload`
- `GET /api/audio`
- `POST /api/audio`
- `POST /api/audio-upload`
- `POST /api/audio-unlock`
- `GET /api/phone-lines`
- `POST /api/phone-lines`
- `POST /api/phone-lines-upload`
- `POST /api/phone-lines-called`
- `GET /api/tracer-config`
- `POST /api/tracer-config`
- `POST /api/poi-image-upload`

### Contenido Narrativo

- `GET /api/cases-data`
- `POST /api/cases-data`
- `DELETE /api/cases-data/:id`
- `GET /api/modules-data`
- `POST /api/modules-data`
- `DELETE /api/modules-data/:id`
- `GET /api/pois-data`
- `POST /api/pois-data`
- `DELETE /api/pois-data/:id`
- `GET /api/villains-data`
- `POST /api/villains-data`
- `DELETE /api/villains-data/:id`

### WebSocket

- `/ws/tracer`
  - rol `dm`
  - rol `phone`
  - rol `agent`

## Estado Narrativo Del Producto

La implementacion actual ya encaja con este framing:

- webapp diegetica para partida de rol ambientada en `Gotham Central`
- terminal antiguo, contingente y parcialmente remendado
- `BROTHER-MK0` como prototipo temprano o nodo auxiliar de `Brother Eye`
- Batman ausente/no responsivo
- el GCPD opera sobre restos funcionales del sistema

## Lo Mas Importante Para Recordar

- El dialer inicial visible tiene una unica linea funcional de acceso a la shell jugable principal:
  - `TERMINAL OS`

- El login clasico de `BROTHER-MK0` sigue existiendo como flujo legacy en codigo, pero ya no es la ruta principal visible desde el dialer reducido.

- `TRACER` existe de verdad en el repo actual.

- `/phone` es parte esencial del flujo `TRACER`; no es una pantalla decorativa.

- El panel DM ya no es solo CRUD narrativo:
  - tambien opera media, telefonia, balistica, accesos y configuracion de trazado.

- `SHOW`, `AUDIO`, `DIAL` y `BALLISTICA` convierten el terminal en una interfaz de investigacion mas rica que la version antigua.
