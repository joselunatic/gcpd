# Operativa principal del panel DM

Esta guía documenta el panel del DM a partir de dos fuentes:

- **UI observada en ejecución** sobre `http://127.0.0.1:5174/dm`
- **código actual del repo**, principalmente `src/components/DmPanel.jsx`, `server/index.js` y los comandos de la TUI de agentes en `public/commands`

No se han creado ni editado datos para esta documentación. Las capturas corresponden al estado real disponible en el entorno local.

## Índice rápido

- [Vista general](#vista-general)
- [Encabezado, sesión y navegación](#encabezado-sesion-y-navegacion)
- [Seguridad y cuenta](#seguridad-y-cuenta)
- [Casos](#casos)
- [POIs](#pois)
- [Villanos](#villanos)
- [Evidencias](#evidencias)
- [Tracer](#tracer)
- [Accesos](#accesos)
- [Campaña](#campana)
- [Modelo mental recomendado](#modelo-mental-recomendado)

## Vista general

El panel del DM es la consola editorial y operativa de la campaña. Desde aquí se gestionan:

- casos
- POIs
- villanos
- evidencias
- tracer
- accesos por atributo
- estado global de campaña

Su relación con el frontend de agentes es directa: el DM escribe en endpoints de edición y el frontend agente consume esos mismos datos por API para construir la TUI.

![Vista general del panel DM](/docs-screenshots/dm/00-overview.png)

### Cómo se conecta con el frontend de agentes

En código, la relación es esta:

- La ruta del panel DM vive en `src/App.jsx` con `/dm`.
- El panel React define endpoints de trabajo en `src/components/DmPanel.jsx`:
  - `/api/cases-data`
  - `/api/pois-data`
  - `/api/villains-data`
  - `/api/campaign-state`
  - `/api/global-commands`
  - `/api/evidence`
  - `/api/ballistics`
  - `/api/audio`
  - `/api/phone-lines`
  - `/api/tracer-config`
- El backend expone esas fuentes en `server/index.js`.
- La TUI de agentes las consume desde:
  - `public/commands/cases.js`
  - `public/commands/map.js`
  - `public/commands/villains.js`
  - `public/commands/show.js`
  - `public/commands/ballistica.js`
  - `public/commands/audio.js`
  - `public/commands/dial.js`
  - `public/commands/summary.js`

Lectura práctica:

- **Casos** editados en DM terminan en la TUI `CASES`.
- **POIs** terminan en `MAP` y también enriquecen `CASES` y `VILLAINS`.
- **Villanos** terminan en `VILLAINS`.
- **Campaña** alimenta `SUMMARY`, `STATUS`, `FLAGS`, desbloqueos y contexto activo.
- **Evidencias** acaban en `SHOW`, `BALLISTICA`, `AUDIO` y `DIAL`.
- **Tracer** se apoya en `/phone` para la operativa en vivo y en la TUI `TRACER`.

> Flujo recomendado: usa el panel DM como sistema de edición y sincronización, no como lugar donde “simular” la experiencia del agente. La validación final siempre conviene hacerla en la TUI.

## Encabezado, sesión y navegación

La capa superior del panel tiene tres funciones:

- mostrar que la sesión DM está desbloqueada
- exponer acciones de seguridad
- cambiar entre las áreas principales del workspace

![Vista general del panel DM](/docs-screenshots/dm/00-overview.png)

### Qué ves arriba

- `DM Control / Brother-MK0`: encabezado principal del panel.
- franja de sesión: informa de que el panel está desbloqueado y muestra expiración de sesión.
- `Ayuda / Docs`: acceso a la documentación.
- `Cuenta / Seguridad`: despliega el bloque para cambiar contraseña.
- `Cerrar sesión`: invalida la sesión activa.
- navegación principal:
  - `Casos`
  - `POIs`
  - `Villanos`
  - `Evidencias`
  - `Tracer`
  - `Accesos`
  - `Campaña`

### Referencia de código

- `src/components/DmPanel.jsx`
  - `VIEW_OPTIONS` define la navegación principal
  - el encabezado de autenticación y sesión está en la parte final del componente
- `server/index.js`
  - login, sesión, logout y cambio de contraseña están en `/api/auth/*`

> Atajo operativo: si estás preparando una sesión, empieza siempre aquí para verificar que la sesión está abierta, cuánto dura y si necesitas rotar contraseña antes de tocar contenido.

## Seguridad y cuenta

`Cuenta / Seguridad` abre el bloque para rotar la contraseña del panel.

![Cuenta y seguridad](/docs-screenshots/dm/08-security.png)

### Qué puedes hacer

- introducir contraseña actual
- definir nueva contraseña
- confirmar la nueva contraseña
- guardar el cambio

### Qué implica operativamente

- esta contraseña protege el acceso al panel del DM
- el backend mantiene una sesión temporal
- hay un backdoor técnico en backend para acceso de emergencia, pero no forma parte del flujo normal de operación

### Referencia de código

- `src/components/DmPanel.jsx`: formulario de seguridad en el bloque `accountOpen`
- `server/index.js`: `/api/auth/login`, `/api/auth/logout`, `/api/auth/password`

> No es una vista narrativa. Es puramente administrativa y conviene tratarla como tal.

## Casos

`Casos` es el centro editorial de la campaña. Aquí decides qué estructura narrativa existe para el agente y cómo se representa.

![Sección de casos](/docs-screenshots/dm/01-cases.png)

### Qué ves

- `Listado de casos` a la izquierda
  - lista jerárquica
  - soporta casos raíz y subcasos
- columna central de edición
  - breadcrumb como `CASOS > ...`
  - acciones `Guardar`, `Avanzado`, `Vista`, `Nuevo caso`, `Nuevo subcaso`, `Limpiar`
  - selector `Caso / Subcaso`
  - `POI principal`
  - `POIs relacionados`
  - `Título`
  - `Resumen`
  - `Brief`
- `Vista agente` a la derecha
  - preview compacto de cómo lo verá el frontend agente

### Qué puedes hacer

- crear un caso raíz
- crear un subcaso asociado a otro caso
- asignar POI principal
- añadir red de POIs relacionados con roles narrativos
- escribir el `summary` visible para agentes
- escribir `brief` interno/extenso
- abrir el bloque `Avanzado` para acceso, metadatos y debug

### Qué hace cada acción superior

- `Guardar`: persiste el caso en `/api/cases-data`
- `Avanzado`: abre campos de visibilidad, desbloqueo, flags, estado, tipo de nodo e información de debug
- `Vista`: abre/cierra el preview agente
- `Nuevo caso`: arranca una ficha vacía de caso raíz
- `Nuevo subcaso`: crea un borrador con padre ya seleccionado
- `Limpiar`: limpia selección y formulario

### Qué cambia en el frontend de agentes

Lo editado aquí llega a la TUI `CASES`:

- el árbol usa `parentId`
- la ficha del preview usa `title`, `summary`, `brief`, `intel`, `puzzle`, `locationRefs`
- el acceso depende de `unlockConditions`
- la navegación cruzada con mapa y POIs depende de `locationRefs`

### Flujo recomendado

1. Define si el nodo es `Caso` o `Subcaso`.
2. Asigna primero el `POI principal`.
3. Añade después la red de `POIs relacionados`.
4. Redacta `Resumen` para agentes.
5. Usa `Brief` para el bloque más amplio o interno.
6. Solo al final abre `Avanzado` para acceso y metadatos.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderCaseView`
- API:
  - `server/index.js`, `/api/cases-data`
- Agentes:
  - `public/commands/cases.js`
  - `public/utils/cases.js`

> Regla práctica: `Resumen` decide si el agente entiende el caso. `Brief` decide si el DM tiene contexto suficiente para operarlo.

## POIs

`POIs` mantiene el catálogo de lugares o personas de interés que luego alimenta mapa, casos, villanos y tracer.

![Sección de POIs](/docs-screenshots/dm/02-pois.png)

### Qué ves

- panel de selección de POIs
- caja de búsqueda
- acciones `Nuevo`, `Vista`, `Avanzado`, `Guardar`, `Limpiar`
- preview `Vista agente`
- bloques plegables:
  - `Identidad`
  - `Información pública`
  - `Mapa / Hotspot`

### Qué puedes hacer

- crear un POI nuevo
- editar identidad básica:
  - `ID`
  - `Nombre`
  - `Distrito`
  - `Estado`
- redactar `Resumen` visible para agentes
- definir mapa/hotspot y detalle geográfico
- abrir el preview agente para validar la presentación

### Qué significan los menús internos

- `Vista`: controla el preview del panel
- `Avanzado`: abre más configuración editorial/técnica
- `Identidad`: datos troncales del POI
- `Información pública`: contenido visible en TUI
- `Mapa / Hotspot`: coordenadas, radio y etiqueta geográfica

### Qué cambia en el frontend de agentes

Los POIs alimentan:

- `MAP`
- contexto geográfico dentro de `CASES`
- localizaciones relacionadas en `VILLAINS`
- hotspots base de `TRACER`

### Flujo recomendado

1. Crea identidad y distrito.
2. Redacta un resumen mínimo y claro.
3. Completa mapa/hotspot.
4. Luego vuelve a `Casos`, `Villanos` o `Tracer` para enlazar ese POI.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderPoiView`
  - componentes auxiliares en `src/components/dm/*`
- API:
  - `server/index.js`, `/api/pois-data`
- Agentes:
  - `public/commands/map.js`
  - `public/commands/cases.js`
  - `public/commands/villains.js`

> Si un caso “no tiene mapa”, normalmente el problema no está en `Casos`, sino en que aquí falta un POI válido o un hotspot bien definido.

## Villanos

`Villanos` es el editor de perfiles de antagonistas. Separa la ficha editorial base de la lógica fina de acceso por atributo.

![Sección de villanos](/docs-screenshots/dm/03-villains.png)

### Qué ves

- `Listado de villanos`
- acciones:
  - `Guardar`
  - `Avanzado`
  - `Vista`
  - `Nuevo`
  - `Limpiar`
- preview `Vista agente`
- bloques plegables:
  - `Identidad`
  - `Agent-facing Summary`
  - `Detalles de perfil`

### Qué puedes hacer

- crear o editar villanos
- definir `ID` y `Alias`
- redactar `Resumen` visible para agentes
- abrir el bloque de detalles extendidos del perfil
- revisar la previsualización antes de publicar cambios

### Cómo se reparte la lógica aquí

- esta vista mantiene el contenido principal del villano
- la matriz de acceso fino por campo no está aquí, sino en `Accesos`

### Qué cambia en el frontend de agentes

Esta ficha alimenta `VILLAINS` en la TUI:

- alias, resumen y estado componen la lectura básica
- localizaciones relacionadas pueden cruzarse con POIs
- la visibilidad completa o parcial depende de la capa de accesos

### Flujo recomendado

1. Define `Alias` y `Resumen`.
2. Añade los detalles de perfil solo si realmente aportan.
3. Si algún campo no debe ser visible aún, no lo resuelvas aquí: pásalo a `Accesos`.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderVillainView`
- API:
  - `server/index.js`, `/api/villains-data`
- Agentes:
  - `public/commands/villains.js`

> Esta pantalla define contenido. `Accesos` define ritmo de revelación.

## Evidencias

`Evidencias` no es una sola pantalla: es un contenedor de cuatro subproductos distintos.

![Evidencias · STL](/docs-screenshots/dm/04-evidence.png)

### Submenús

- `STL`
- `Balistica`
- `Audio`
- `Telefonos`

Todos viven dentro de `renderEvidenceView`, pero publican a endpoints y superficies de agente diferentes.

> Piensa `Evidencias` como un hub técnico. No todo lo que hay aquí acaba en el mismo comando del agente.

### STL

Sirve para registrar modelos 3D consumidos desde el comando `SHOW`.

![Evidencias · STL](/docs-screenshots/dm/04-evidence.png)

#### Qué ves

- listado `Modelos`
- formulario `Detalle / Upload`
- campos:
  - `ID`
  - `Etiqueta`
  - `Comando SHOW`
  - `Perfil ASCII`
  - `Ruta STL`
  - `Subir STL`
- `Preview ASCII`

#### Qué puedes hacer

- subir `.stl`
- asignarle alias para `SHOW <alias>`
- decidir el perfil de render ASCII
- guardar o eliminar la evidencia

#### Impacto en agentes

- lo consume `public/commands/show.js`
- aparece en el catálogo remoto del `remoteOs`

> Úsalo para objetos, pruebas o elementos que deban verse como artefactos en el visor ASCII.

### Balística

Sirve para gestionar PNGs, metadatos forenses y vínculo con caso y POI.

![Evidencias · Balística](/docs-screenshots/dm/09-evidence-ballistics.png)

#### Qué ves

- listado `PNG Balistica`
- formulario `Metadatos Balistica`
- campos operativos:
  - `PNG` o `PNG existente`
  - `Subir PNG`
  - `Case ID`
  - `Codigo`
  - `POI`
  - `Localizacion`
  - `Crimen`
  - `Estado`
  - `Cerrado por`
- `Preview PNG` partido en mitades

#### Impacto en agentes

- se consume desde `public/commands/ballistica.js`
- se cruza con casos y POIs por metadatos

> Aquí merece la pena ser estricto con `Case ID`, `Código` y `POI`, porque son los campos que más ayudan a que la pieza forense no quede aislada.

### Audio

Sirve para registrar MP3s, cifrarlos opcionalmente y exponerlos al frontend de agentes.

![Evidencias · Audio](/docs-screenshots/dm/10-evidence-audio.png)

#### Qué ves

- listado `Audios`
- formulario `Audio / Upload`
- campos:
  - `ID`
  - `Titulo`
  - `MP3`
  - `Cifrar`
  - `Garbled`
  - `Subir MP3`

#### Impacto en agentes

- se consume desde `public/commands/audio.js`
- puede exigir desbloqueo de audio en runtime

> Si el audio tiene que formar parte de una progresión, define desde el principio si va libre o cifrado.

### Teléfonos

Sirve para modelar líneas del dialer y asociarlas a un audio.

![Evidencias · Teléfonos](/docs-screenshots/dm/11-evidence-phones.png)

#### Qué ves

- listado `Telefonos`
- formulario `Linea / Audio`
- campos:
  - `ID`
  - `Numero`
  - `Etiqueta`
  - `Audio`
  - `Rellamable`
  - `Llamado`
  - `Audio ID`
  - `Subir MP3`

#### Impacto en agentes

- se consume desde `public/commands/dial.js`
- conecta con el panel `/phone` para operativa de tracer en vivo

> Esta subvista es más operativa que narrativa. Conviene tratar cada línea como infraestructura para una interacción concreta.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderEvidenceView`
- API:
  - `server/index.js`
    - `/api/evidence`
    - `/api/ballistics`
    - `/api/ballistics-assets`
    - `/api/audio`
    - `/api/audio-upload`
    - `/api/phone-lines`
    - `/api/phone-lines-upload`
- Agentes:
  - `public/commands/show.js`
  - `public/commands/ballistica.js`
  - `public/commands/audio.js`
  - `public/commands/dial.js`
  - `public/utils/remoteOs.js`

## Tracer

`Tracer` es el editor táctico de hotspots y líneas DM. La vista deja claro que el operador vivo se delega a `/phone`.

![Sección Tracer](/docs-screenshots/dm/05-tracer.png)

### Qué ves

- cabecera `Lineas DM y hotspots de traza`
- contadores de líneas y hotspots
- acciones rápidas:
  - `Nueva linea`
  - `Nuevo hotspot`
- workspace dividido en dos:
  - `Hotspot (visible para Agentes)`
  - `Linea asociada al hotspot`

### Qué puedes hacer

- crear hotspots independientes
- asignarles `POI base`
- previsualizar su posición sobre el mapa
- guardar el hotspot
- crear una línea DM asociada a hotspot
- activar o invalidar la línea

### Qué significa cada bloque

- `ID hotspot`: identificador técnico de tracer
- `Label hotspot`: texto visible al agente cuando resuelve la traza
- `POI base`: ancla el hotspot a un POI real
- mapa: preview visual de la posición
- `Numero`: identificador usado por `TRACER #TELEFONO`
- `Label linea (DM)`: alias operativo interno
- `Hotspot`: destino de esa línea
- `Activa`: si está apagada, TRACER la tratará como inválida

### Qué cambia en el frontend de agentes

- el comando `TRACER` usa esta configuración
- la operativa en vivo se complementa con `/phone`
- el mapa del hotspot siempre se basa en POIs

### Flujo recomendado

1. Define o revisa el `POI base`.
2. Guarda el hotspot.
3. Después crea la línea asociada.
4. Valida si esa línea debe estar activa o no.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderTracerView`
- API:
  - `server/index.js`, `/api/tracer-config`
- Agentes:
  - `public/commands/tracer.js`
  - `src/components/PhonePanel.jsx`

> El hotspot es la capa visible para agentes. La línea es la capa operativa para DM.

## Accesos

`Accesos` controla el acceso por atributo de villanos. No cambia la ficha completa del villano, sino qué campos concretos son visibles o desbloqueables.

![Sección Accesos](/docs-screenshots/dm/06-access.png)

### Qué ves

- selector `Villano`
- matriz por atributo con columnas:
  - `Locked`
  - `Visible`
  - `Runtime`
  - `Frase`
  - `Token`
- acciones:
  - `Guardar accesos`
  - `Recargar`

### Qué hace cada columna

- `Locked`: el atributo arranca bloqueado o libre
- `Visible`: el atributo existe para el agente o queda oculto
- `Runtime`: desbloqueo activo en el estado actual de campaña
- `Frase`: frase de revelación
- `Token`: secreto/password asociado

### Qué cambia en el frontend de agentes

- el agente puede ver o no campos sueltos del villano
- algunos atributos se pueden liberar sin exponer la ficha completa
- esta capa trabaja junto al sistema común de `access`, `accessFlow` y `campaignState`

### Flujo recomendado

1. Elige el villano.
2. Decide qué atributos existen pero deben estar ocultos.
3. Decide cuáles están bloqueados pero visibles.
4. Usa `Runtime` solo para el estado vivo actual, no como configuración editorial permanente.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderAccessView`
- Estado/acceso:
  - `public/utils/access.js`
  - `public/utils/accessFlow.js`
  - `public/utils/campaignState.js`
- Agentes:
  - `public/commands/villains.js`
  - `public/utils/remoteOs.js`

> `Locked` e `invisible` no son lo mismo. Invisible oculta la existencia del campo. Locked conserva la estructura pero reserva el contenido.

## Campaña

`Campaña` controla el estado global compartido con la experiencia del agente.

![Sección Campaña](/docs-screenshots/dm/07-campaign.png)

### Qué ves

- `Flags globales`
- `Contexto operativo`
  - `Nivel de alerta`
  - `Caso activo (ID)`
- `Desbloqueos`
  - casos
  - POIs
  - villanos
- `Comandos globales`

### Qué puedes hacer

- activar flags por línea
- definir el caso activo actual
- marcar desbloqueos persistentes
- cargar un JSON de comandos globales

### Qué cambia en el frontend de agentes

Esta vista es la que más afecta al estado general:

- `SUMMARY` y `STATUS` leen `alertLevel`, `activeCaseId` y flags
- casos, POIs y villanos consultan desbloqueos persistidos
- `global commands` alimenta respuestas globales del terminal

### Flujo recomendado

1. Marca flags globales.
2. Actualiza `Caso activo`.
3. Revisa desbloqueos persistentes.
4. Solo después toca `Comandos globales` si necesitas alterar respuestas del terminal.

### Referencia de código

- UI:
  - `src/components/DmPanel.jsx`, `renderCampaignView`
- API:
  - `server/index.js`
    - `/api/campaign-state`
    - `/api/global-commands`
- Agentes:
  - `public/commands/summary.js`
  - `public/commands/status.js`
  - `public/commands/flags.js`
  - `public/utils/status.js`
  - `public/utils/campaignState.js`

> Si el agente ve datos “viejos” o incoherentes, esta suele ser la primera pantalla que conviene revisar.

## Modelo mental recomendado

Si hay que resumir la operativa del DM en una cadena corta:

1. Crea o ajusta POIs.
2. Usa esos POIs para construir casos, villanos o tracer.
3. Vincula evidencias si la investigación lo requiere.
4. Controla qué se ve con `Accesos`.
5. Sincroniza ritmo narrativo y desbloqueos en `Campaña`.

## Mapa rápido de referencias de código

- Rutas principales:
  - `src/App.jsx`
- Panel DM:
  - `src/components/DmPanel.jsx`
- Panel de operador tracer:
  - `src/components/PhonePanel.jsx`
- Backend:
  - `server/index.js`
- TUI de agentes:
  - `public/commands/cases.js`
  - `public/commands/map.js`
  - `public/commands/villains.js`
  - `public/commands/show.js`
  - `public/commands/ballistica.js`
  - `public/commands/audio.js`
  - `public/commands/dial.js`
  - `public/commands/tracer.js`
  - `public/commands/summary.js`
