# Quest VR Operating Model

Fecha: 2026-04-22

## Contexto de producto

El proyecto mantiene dos superficies de agente alimentadas por la misma API y la misma base de datos:

- `tui`: experiencia terminal/CRT basada en comandos
- `quest`: experiencia WebXR/VR orientada a Quest 2 y también usable en navegador de escritorio

Esta documentación se centra solo en la rama funcional `quest`.

## Decisión clave

`Brother-MK0` y `TerminalOS` no deben portarse como interfaz principal al entorno VR.

Se asumen como:

- genealogía del sistema
- capa histórica/diegética
- antecedente de la TUI actual

La variante `quest` debe arrancar ya en un **nodo operativo post-terminal**, no en:

- dialer
- login textual
- prompt de comandos

La UX de `quest` debe empezar directamente en operaciones.

## Regla de diseño

No traducir comandos.

Traducir operaciones.

La TUI actual se interpreta como inventario de capacidades del sistema, no como el paradigma de interacción que deba sobrevivir en VR.

## Principios UX de Quest

- operación antes que navegación
- panel frontal antes que overlays flotantes
- contexto persistente antes que menús profundos
- herramientas dedicadas antes que comandos escritos
- legibilidad y foco antes que espectacularidad
- WebXR web primero, no app nativa
- Quest Browser como validación final de escala y confort

## Mapeo conceptual TUI -> Quest

### Lo que deja de ser interfaz principal

- `dialer`
- `login`
- `TerminalOS`
- prompt de texto como acceso central
- navegación basada en escribir comandos

### Lo que se conserva

- taxonomía de dominios del sistema
- tono diegético Wayne / GCPD / Brother
- gating por acceso, flags, passwords y prerrequisitos
- caso activo
- cambios recientes / deltas
- herramientas de investigación reales
- las capacidades avanzadas quedan fuera de v1

## Capacidades reales detectadas en la TUI

### Navegación / estado

- `HELP`
- `STATUS`
- `SUMMARY`
- `FLAGS`
- `LAST`
- `CASES`
- `CASE <id>`
- `MAP`
- `VILLAINS`
- `MODULES`

### Evidencia / análisis

- `SHOW ...`
- `AUDIO [id]`
- `BALLISTICA`

### Comunicaciones / operaciones

- `DIAL <telefono>`
- `TRACER <telefono>`

### Sistema

- `CLEAR`
- `TOUCH [ON|OFF]`
- `LOGOUT`
- `EXIT`
- `QUIT`
- `HELLO`

### Shell secundaria

En `REMOTE OS` existen además:

- `INFO <entidad> <atributo>`
- `SCAN`
- `FIND`
- comandos globales del DM

## Lectura correcta para Quest

En Quest, estos elementos ya no deben entenderse como comandos que se escriben, sino como módulos o herramientas:

- `CASES` -> módulo `Casos`
- `CASE <id>` -> apertura directa de expediente
- `MAP` -> módulo `Mapa`
- `VILLAINS` -> módulo `Perfiles`
- `SHOW` -> herramienta `Evidencias`
- `AUDIO` -> herramienta `Audio`
- `BALLISTICA` -> herramienta `Balística`
- `DIAL` -> herramienta `Comunicaciones`
- `TRACER` -> herramienta `Rastreo`
- `STATUS`, `SUMMARY`, `FLAGS`, `LAST` -> capa persistente de awareness
- `INFO`, `SCAN`, `FIND` -> capacidades avanzadas aplazadas fuera de v1

## Modelo operativo VR propuesto

La rama `quest` debe estructurarse en 5 módulos principales.

### 1. Operación actual

Punto de entrada a VR.

Debe responder a:

- qué está pasando ahora
- cuál es el caso activo
- qué pista conviene abrir
- qué herramienta conviene usar

Contenido sugerido:

- `Operación actual`
- `Caso activo`
- `Nivel de alerta`
- `Cambios recientes`
- `Pistas abiertas`
- accesos rápidos a módulos

### 2. Casos

Sustituye `CASES` y `CASE <id>`.

Función:

- navegar expedientes
- ver jerarquía caso/subcaso
- leer resumen e inteligencia
- saltar a POIs, perfiles o evidencias relacionados

Etiquetas user-facing propuestas:

- `Casos`
- `Expedientes`
- `Subcasos`
- `Resumen`
- `Inteligencia`
- `Puzle`
- `Ubicaciones vinculadas`
- `Ver en mapa`
- `Abrir evidencia`

### 3. Mapa

Sustituye `MAP`.

Función:

- consultar Gotham y sus POIs
- seguir pistas espaciales
- abrir contexto y relaciones

Etiquetas user-facing propuestas:

- `Mapa`
- `Ubicaciones`
- `Distritos`
- `Puntos de interés`
- `Ubicación seleccionada`
- `Ver expediente`
- `Ver perfil`
- `Centrar`
- `Restablecer vista`

### 4. Perfiles

Sustituye `VILLAINS`.

Función:

- consultar fichas operativas
- ver amenaza, patrones, asociados y ubicaciones vinculadas

Etiquetas user-facing propuestas:

- `Perfiles`
- `Sospechosos`
- `Amenaza`
- `Estado`
- `Patrones`
- `Asociados`
- `Ubicaciones vinculadas`
- `Ver en mapa`
- `Ver expediente`

### 5. Herramientas

Agrupa herramientas instrumentales.

Submódulos:

- `Evidencias`
- `Audio`
- `Balística`
- `Comunicaciones`
- `Rastreo`

## Alcance de v1

La primera versión operativa de `quest` se limita al núcleo base:

- `Operación actual`
- `Casos`
- `Mapa`
- `Perfiles`
- `Herramientas`

Queda explícitamente fuera de v1:

- cualquier `Consola de análisis`
- `INFO`
- `SCAN`
- `FIND`
- comandos globales del DM trasladados a Quest
- shells textuales o modos de consulta avanzada

## Diseño detallado por módulo

### Operación actual

Objetivo:

- ser home operacional, no menú abstracto

Operaciones primarias:

- abrir caso activo
- abrir pista sugerida
- saltar a mapa
- abrir perfil relacionado
- abrir herramienta recomendada

Operaciones secundarias:

- ver sincronía
- revisar cambios recientes completos
- consultar estado extendido

Layout sugerido:

- panel central dominante
- contexto persistente discreto
- accesos rápidos secundarios

### Casos

Objetivo:

- convertir la lógica de expedientes en espacio de trabajo

Operaciones primarias:

- seleccionar caso
- expandir o contraer jerarquía
- leer `Resumen`
- leer `Inteligencia`
- saltar a mapa
- abrir entidad relacionada

Operaciones secundarias:

- ver restricciones
- fijar foco de investigación
- revisar deltas no leídos

Layout sugerido:

- árbol/lista lateral
- ficha central
- acciones contextuales secundarias

### Mapa

Objetivo:

- consola cartográfica para contexto espacial de investigación

Operaciones primarias:

- seleccionar POI
- abrir detalle
- resaltar POIs del caso activo
- saltar a expediente
- saltar a perfil

Operaciones secundarias:

- filtrar
- recentrar
- revisar imagen
- revisar estado de acceso

Layout sugerido:

- mapa central
- panel lateral de detalle
- relaciones contenidas

### Perfiles

Objetivo:

- consulta táctica de perfiles

Operaciones primarias:

- seleccionar perfil
- leer ficha
- saltar a POI relacionado
- saltar a expediente relacionado

Operaciones secundarias:

- abrir secciones de detalle
- ver atributos bloqueados

Layout sugerido:

- lista lateral
- ficha central
- relaciones en bloque secundario

### Herramientas

Objetivo:

- agrupar modos de operación especializados

Regla:

- entrar en `Herramientas`
- elegir modo
- operar
- volver al contexto del caso

#### Evidencias

Equivale a `SHOW`.

Operaciones:

- abrir evidencia
- girar
- acercar y alejar
- cambiar modo de visualización
- volver al caso

Etiquetas user-facing propuestas:

- `Evidencias`
- `Inspección`
- `Girar`
- `Acercar`
- `Alejar`
- `Modo escaneo`
- `Modo análisis`

#### Audio

Equivale a `AUDIO`.

Operaciones:

- reproducir
- pausar
- desplazarse por la pista
- ajustar volumen
- desbloquear contenido protegido

Etiquetas user-facing propuestas:

- `Audio`
- `Reproducir`
- `Pausar`
- `Adelantar`
- `Retroceder`
- `Volumen`
- `Desbloquear`
- `Pista actual`

#### Balística

Equivale a `BALLISTICA`.

Operaciones:

- elegir muestra A
- elegir muestra B
- comparar
- leer coincidencia

Etiquetas user-facing propuestas:

- `Balística`
- `Muestra A`
- `Muestra B`
- `Comparar`
- `Coincidencia`
- `Seleccionar muestra`

#### Comunicaciones

Equivale a `DIAL`.

Operaciones:

- seleccionar línea
- iniciar escucha
- colgar
- cerrar herramienta

Etiquetas user-facing propuestas:

- `Comunicaciones`
- `Líneas`
- `Llamada en curso`
- `Colgar`
- `Línea no disponible`

#### Rastreo

Equivale a `TRACER`.

Operaciones:

- iniciar rastreo
- seguir fases
- leer registro
- fijar resultado final

Etiquetas user-facing propuestas:

- `Rastreo`
- `Objetivo`
- `Fase`
- `Búsqueda amplia`
- `Triangulación`
- `Ubicación exacta`
- `Registro`
- `Sin operador disponible`

## Lo que queda fuera de Quest v1

La rama `quest` no debe reservar superficie, navegación ni complejidad para texto operativo avanzado en esta fase.

Queda fuera de v1:

- cualquier `Consola de análisis`
- consultas rápidas en formato shell
- comandos especiales textuales
- comandos globales del DM trasladados a Quest

No debe existir en esta fase como:

- punto de entrada
- capa principal de navegación
- requisito para operar
- soporte paralelo que condicione el layout base

## Estado persistente recomendado

La rama `quest` debería organizarse alrededor de estos estados:

- `casoActivo`
- `moduloActual`
- `entidadSeleccionada`
- `poiSeleccionado`
- `perfilSeleccionado`
- `herramientaActiva`
- `modoHerramienta`
- `nivelAlerta`
- `estadoSincronia`
- `cambiosRecientes`
- `bloqueosDeAcceso`

## HUD persistente recomendado

Información siempre visible o casi siempre visible:

- `Caso activo`
- `Nivel de alerta`
- `Sincronía`
- `Volver a operación`

No persistente:

- listas largas
- ayuda extensa
- logs grandes
- controles secundarios

## Flujo principal del agente en Quest

Happy path recomendado:

1. entrar a `Operación actual`
2. identificar `Caso activo`
3. abrir `Casos`
4. leer `Resumen` e `Inteligencia`
5. saltar a `Mapa` o `Perfiles`
6. activar una herramienta si hace falta
7. volver al contexto del caso sin perder foco

Regla:

La noción fuerte en Quest no debe ser “pantalla anterior”.

Debe ser “volver al contexto operativo”.

## Arquitectura de navegación y estado

Esta sección fija cómo debe comportarse `quest` a nivel de navegación, foco y memoria de contexto.

La regla base es:

- el usuario opera dentro de una sesión activa
- el sistema recuerda el contexto desde el que se abrió cada módulo
- las herramientas no rompen el hilo de investigación
- volver significa restaurar contexto, no solo cerrar una pantalla

### Modelo de navegación

La navegación de v1 debe ser plana a nivel superior.

Módulos principales:

- `Operación actual`
- `Casos`
- `Mapa`
- `Perfiles`
- `Herramientas`

No debe existir en v1:

- árbol profundo de pantallas
- navegación tipo app móvil con múltiples niveles
- dependencia de historial ciego de “atrás”

### Principio de foco operativo

El centro del sistema no es el menú.

El centro del sistema es el caso o lead que está en foco.

Eso implica:

- `Operación actual` abre con un caso activo o con una invitación clara a fijarlo
- `Casos`, `Mapa` y `Perfiles` deben poder leer y respetar ese foco
- `Herramientas` deben abrirse desde contexto cuando sea posible
- salir de una herramienta debe devolver al contexto desde el que se abrió

### Estado mínimo compartido

Además del estado persistente ya listado, la implementación de v1 debería asumir estos bloques lógicos:

- `casoActivo`
- `moduloActual`
- `seleccionActual`
- `origenDeNavegacion`
- `contextoDeHerramienta`
- `estadoDeSesion`

#### `seleccionActual`

Debe representar la entidad principal seleccionada en el módulo presente.

Ejemplos:

- en `Casos`: expediente seleccionado
- en `Mapa`: POI seleccionado
- en `Perfiles`: perfil seleccionado
- en `Herramientas`: recurso cargado en la herramienta activa

#### `origenDeNavegacion`

Debe registrar desde dónde se abrió una vista o herramienta.

Valores típicos:

- `operacion-actual`
- `casos`
- `mapa`
- `perfiles`
- `herramientas`

#### `contextoDeHerramienta`

Debe conservar qué motivó la apertura de una herramienta.

Ejemplos:

- evidencia abierta desde un expediente concreto
- audio abierto desde una pista concreta
- rastreo lanzado desde una ubicación o línea asociada

### Reglas de cambio de módulo

#### De `Operación actual` a otro módulo

Debe hacerse sin perder:

- `casoActivo`
- lead o pista seleccionada, si existe

Comportamiento esperado:

- `Abrir caso` lleva a `Casos` con el expediente ya seleccionado
- `Ir al mapa` lleva a `Mapa` con POIs filtrados por el caso activo si procede
- `Ver perfiles` lleva a `Perfiles` con entidades relacionadas destacadas
- `Abrir herramientas` lleva a `Herramientas` con sugerencia contextual si existe

#### De `Casos` a `Mapa`

Debe trasladarse:

- el expediente seleccionado
- las ubicaciones vinculadas
- el foco visual en los POIs relacionados

No debe abrir el mapa “vacío” salvo que no haya relaciones cartográficas.

#### De `Casos` a `Perfiles`

Debe trasladarse:

- el expediente seleccionado
- el subconjunto de perfiles relacionados

La lista general puede seguir existiendo, pero con los relacionados destacados en primer plano.

#### De `Mapa` a `Perfiles`

Debe trasladarse:

- el POI seleccionado
- las entidades vinculadas a ese POI

#### De `Perfiles` a `Mapa`

Debe trasladarse:

- el perfil seleccionado
- las ubicaciones asociadas a ese perfil

### Reglas de apertura de herramientas

Las herramientas de v1 no deben comportarse como módulos desconectados.

Deben abrirse:

- desde `Operación actual`
- desde `Casos`
- desde `Mapa`
- desde `Perfiles`

Y siempre que sea posible, con contexto ya resuelto.

Ejemplos:

- `Evidencias` abre una pieza concreta, no una galería vacía, si la acción viene desde un expediente
- `Audio` abre una pista concreta si la sesión ya apunta a ella
- `Balística` abre con muestras preseleccionadas si el expediente ya las define
- `Comunicaciones` abre la línea relacionada si el caso ya la referencia
- `Rastreo` abre con el objetivo cargado si existe un número u objetivo asociado

### Reglas de retorno

La acción de volver debe ser contextual.

Orden de prioridad:

1. volver al origen exacto desde el que se abrió la vista actual
2. si ese origen ya no es válido, volver al módulo desde el que se abrió
3. si tampoco existe contexto útil, volver a `Operación actual`

Ejemplos:

- una evidencia abierta desde `Casos` vuelve al expediente exacto
- un perfil abierto desde `Mapa` vuelve al POI exacto
- un rastreo abierto desde `Operación actual` vuelve al bloque de pista desde el que se lanzó

### Regla de persistencia visual

Cambiar de módulo no debe resetear la sesión salvo decisión explícita del usuario.

Debe persistir:

- `casoActivo`
- selección más reciente por módulo, cuando tenga sentido
- filtros derivados del caso activo
- estado de herramienta si el usuario vuelve a abrirla poco después

No debe persistir sin control:

- overlays temporales ruidosos
- modales secundarios abiertos
- estados de error obsoletos

### Recomendación de implementación para React

Sin entrar aún en código concreto, la arquitectura de `quest` debería separarse en:

- estado de sesión global
- estado de navegación por módulo
- estado efímero de herramienta

Reparto recomendado:

- estado global:
  - `casoActivo`
  - `moduloActual`
  - `nivelAlerta`
  - `estadoSincronia`
- estado por módulo:
  - selección actual
  - filtros
  - scroll o foco interno, si aplica
- estado de herramienta:
  - recurso abierto
  - origen
  - retorno
  - progreso propio, si existe

### Diagrama mental correcto

No pensar Quest como:

- `pantalla -> pantalla -> pantalla`

Pensarlo como:

- `sesión operativa`
- `caso en foco`
- `módulo de trabajo`
- `herramienta contextual`
- `retorno al caso`

### Criterios de validación

La arquitectura de navegación estará bien resuelta si:

- abrir `Casos`, `Mapa` o `Perfiles` desde `Operación actual` conserva el foco del caso
- una herramienta abierta desde contexto vuelve al lugar correcto
- el usuario no necesita “recordar dónde estaba” porque el sistema lo conserva
- `Operación actual` se siente como hogar operativo, no como menú muerto

## Contratos mínimos de datos por módulo

Esta sección no define aún endpoints ni tipos de implementación.

Define el mínimo de información que `quest` necesita para que el modelo operativo funcione sobre la API compartida con la TUI.

### Regla general

Quest no debe pedir datos “por pantalla”.

Debe pedir datos orientados a:

- sesión operativa
- caso activo
- relaciones entre casos, POIs, perfiles y herramientas

### `Operación actual`

Debe poder renderizarse con:

- `casoActivo.id`
- `casoActivo.titulo`
- `casoActivo.estado`
- `casoActivo.resumenBreve`
- `nivelAlerta`
- `estadoSincronia`
- `cambiosRecientes[]`
- `pistasAbiertas[]`
- `accionesSugeridas[]`

#### `pistasAbiertas[]`

Cada pista debería incluir como mínimo:

- `id`
- `tipo`
- `titulo`
- `resumenBreve`
- `destino`
- `destinoId`

`destino` debería poder apuntar a:

- `casos`
- `mapa`
- `perfiles`
- `herramientas`

### `Casos`

Debe poder renderizarse con dos niveles:

- índice de expedientes
- detalle de expediente

#### Índice de expedientes

Cada expediente debería incluir:

- `id`
- `titulo`
- `parentId`, si es subcaso
- `estado`
- `bloqueado`
- `nuevo`
- `activo`
- `resuelto`

#### Detalle de expediente

El detalle debería incluir:

- `id`
- `titulo`
- `estado`
- `resumen`
- `inteligencia`
- `puzle`, si existe
- `poisRelacionados[]`
- `perfilesRelacionados[]`
- `evidenciasRelacionadas[]`
- `herramientasSugeridas[]`

### `Mapa`

El módulo `Mapa` debe asumir el sistema cartográfico compartido con la TUI como fuente canónica.

Datos mínimos:

- `mapa.id`
- `mapa.assetRef` o equivalente
- `pois[]`

Cada POI debería incluir:

- `id`
- `slug`
- `titulo`
- `tipo`
- `x`
- `y`
- `u`
- `v`
- `distrito`, si aplica
- `resumenBreve`
- `imagen`, si existe
- `casosRelacionados[]`
- `perfilesRelacionados[]`
- `bloqueado`

Regla:

- si existen `x/y` heredados, Quest puede proyectarlos
- si existen `u/v` normalizados, Quest debe priorizarlos
- la API compartida no debería divergir entre TUI y Quest en la identidad del POI

### `Perfiles`

Cada perfil debería incluir:

- `id`
- `slug`
- `nombre`
- `alias`, si existe
- `amenaza`
- `estado`
- `resumenBreve`
- `patrones[]`
- `asociados[]`
- `ubicacionesRelacionadas[]`
- `casosRelacionados[]`
- `bloqueado`

Regla:

- `Perfiles` no necesita biografía larga como requisito
- sí necesita relaciones operativas claras

### `Herramientas`

Las herramientas deben consumir datos concretos, no replicar el árbol completo del sistema.

#### `Evidencias`

Cada evidencia debería incluir:

- `id`
- `titulo`
- `tipo`
- `assetRef`
- `expedienteOrigenId`
- `modoSugerido`, si existe

#### `Audio`

Cada pista debería incluir:

- `id`
- `titulo`
- `audioRef`
- `duracion`
- `bloqueado`
- `expedienteOrigenId`, si aplica

#### `Balística`

Cada muestra debería incluir:

- `id`
- `titulo`
- `assetRef` o `imagenRef`
- `grupo`
- `metadataMinima`

Cada comparación debería poder devolver:

- `muestraAId`
- `muestraBId`
- `coincidencia`
- `detalleBreve`

#### `Comunicaciones`

Cada línea debería incluir:

- `id`
- `titulo`
- `estado`
- `audioRef` o `streamRef`
- `casoRelacionadoId`, si existe

#### `Rastreo`

Cada operación de rastreo debería incluir:

- `id`
- `objetivo`
- `estado`
- `fase`
- `radioActual`, si aplica
- `registro[]`
- `resultadoPoiId`, si existe

### Relaciones mínimas entre dominios

Para que la navegación contextual funcione, la API compartida debe permitir al menos:

- caso -> POIs
- caso -> perfiles
- caso -> evidencias
- caso -> herramientas sugeridas
- POI -> casos
- POI -> perfiles
- perfil -> casos
- perfil -> POIs

### Requisito para v1

Si algún dominio no tiene aún toda esta riqueza, Quest debe degradar con gracia.

Orden de prioridad de degradación:

1. mantener navegación entre módulos
2. mostrar menos detalle
3. ocultar acciones no resolubles
4. no inventar contexto falso

## Arquitectura concreta de UI para `/quest`

Esta sección baja el modelo operativo a una propuesta práctica de implementación para la rama `quest`.

No define aún componentes exactos cerrados, pero sí fija:

- qué estado debe ser global
- qué estado debe vivir por módulo
- qué responsabilidad tiene cada vista principal
- qué flujo mínimo debe cubrir la primera implementación funcional

### Regla general

La escena 3D y la UI operativa no deben competir por el control del sistema.

Reparto recomendado:

- la escena 3D aporta espacio, framing, inmersión y anclajes
- la UI operativa aporta contexto, navegación y acciones

La escena no decide el producto.

El modelo operativo sí.

### Capas de la UI de Quest

La rama `quest` debería organizarse en 4 capas claras.

#### 1. Capa de escena

Responsabilidad:

- cargar el entorno 3D
- definir anclajes espaciales
- situar al usuario
- ofrecer la superficie principal para la UI

No debe asumir:

- lógica de negocio
- selección de casos
- reglas de navegación

#### 2. Capa de sesión

Responsabilidad:

- mantener el estado operativo global
- exponer `casoActivo`
- exponer `moduloActual`
- resolver reglas de retorno
- coordinar cambios de módulo

Esta capa es el verdadero corazón funcional de `quest`.

#### 3. Capa de módulos

Responsabilidad:

- renderizar la vista principal de cada módulo
- consumir datos ya preparados por la capa de sesión
- emitir eventos operativos

Eventos típicos:

- `abrirCaso`
- `abrirPoi`
- `abrirPerfil`
- `abrirHerramienta`
- `volverAOperacion`

#### 4. Capa de presentación espacial

Responsabilidad:

- decidir qué parte de la UI vive en el monitor principal
- qué parte vive en paneles laterales
- qué parte vive en HUD persistente

No debe duplicar la navegación ya resuelta en la capa de sesión.

### Estado global recomendado

Este estado debería vivir en un único contenedor de sesión para `quest`.

#### Estado de sesión

- `moduloActual`
- `casoActivoId`
- `nivelAlerta`
- `estadoSincronia`
- `cambiosRecientes`
- `estadoCargaSesion`

#### Estado de foco

- `expedienteSeleccionadoId`
- `poiSeleccionadoId`
- `perfilSeleccionadoId`
- `herramientaActiva`
- `recursoHerramientaId`

#### Estado de navegación

- `origenActual`
- `rutaDeRetorno`
- `ultimoModuloNoHerramienta`

#### Estado de filtros

- `filtroMapaPorCasoActivo`
- `filtroPerfilesRelacionados`
- `filtroCasosActivos`

### Estado por módulo

Además del estado global, cada módulo debería conservar su propio estado ligero.

#### `Operación actual`

- bloque expandido actual, si existe
- pista seleccionada, si aplica

#### `Casos`

- nodos expandidos del árbol
- posición de scroll
- pestaña interna activa:
  - `Resumen`
  - `Inteligencia`
  - `Puzle`

#### `Mapa`

- nivel de enfoque actual
- POI resaltado
- filtro activo
- estado de recentrado

#### `Perfiles`

- perfil resaltado
- bloque interno activo:
  - `Datos tácticos`
  - `Patrones`
  - `Ubicaciones vinculadas`

#### `Herramientas`

- herramienta seleccionada
- contexto de origen
- estado propio de la herramienta abierta

### Vistas principales necesarias

La primera implementación funcional de `/quest` debería cubrir estas vistas principales.

#### `QuestSessionRoot`

Responsabilidad:

- inicializar sesión
- cargar datos operativos base
- decidir qué módulo se renderiza
- exponer acciones globales

#### `QuestEnvironment`

Responsabilidad:

- cargar el `glb`
- exponer anclajes espaciales
- ocultar superficies sustituidas por runtime UI

#### `QuestMonitorSurface`

Responsabilidad:

- actuar como superficie principal donde vive el módulo activo
- respetar proporción y legibilidad dentro del monitor 3D

#### `QuestHud`

Responsabilidad:

- mostrar `Caso activo`
- mostrar `Alerta`
- mostrar `Sincronía`
- exponer `Volver a operación`

Debe ser siempre discreto.

#### `QuestModuleRouter`

Responsabilidad:

- decidir si renderiza:
  - `Operación actual`
  - `Casos`
  - `Mapa`
  - `Perfiles`
  - `Herramientas`

No debe contener lógica de negocio profunda.

#### Vistas de módulo

Se asumen estas cinco vistas:

- `QuestOperacionActualView`
- `QuestCasosView`
- `QuestMapaView`
- `QuestPerfilesView`
- `QuestHerramientasView`

### Responsabilidad de cada vista

#### `QuestOperacionActualView`

Debe:

- leer el `casoActivo`
- renderizar `Pistas abiertas`
- ofrecer accesos a otros módulos
- sugerir la siguiente acción operativa

No debe:

- resolver por sí sola toda la navegación

#### `QuestCasosView`

Debe:

- renderizar árbol de expedientes
- mostrar detalle del expediente seleccionado
- emitir saltos a `Mapa`, `Perfiles` y `Herramientas`

#### `QuestMapaView`

Debe:

- representar POIs sobre el sistema cartográfico compartido
- mostrar detalle lateral del POI
- permitir saltos a expediente o perfil relacionado

#### `QuestPerfilesView`

Debe:

- mostrar lista o carril de perfiles
- renderizar ficha operativa
- permitir saltos a `Mapa` o `Casos`

#### `QuestHerramientasView`

Debe:

- abrir una herramienta concreta según contexto o selección manual
- mantener clara la acción de retorno
- evitar que el usuario pierda el hilo operativo

### Acciones globales mínimas

La capa de sesión debería exponer al menos estas acciones:

- `irAOperacionActual()`
- `irACasos(caseId?)`
- `irAMapa(poiId?, opciones?)`
- `irAPerfiles(profileId?, opciones?)`
- `irAHerramienta(tipo, recursoId?, contexto?)`
- `fijarCasoActivo(caseId)`
- `volverAlContextoOperativo()`

### Reglas concretas de `volverAlContextoOperativo()`

Debe funcionar así:

- si la vista actual es una herramienta y tiene origen válido, volver ahí
- si no hay origen válido, volver al último módulo no herramienta
- si tampoco existe, volver a `Operación actual`

Nunca debe:

- mandar al usuario a una pantalla vacía
- perder el `casoActivo` sin motivo

### Flujo funcional mínimo para la primera implementación

La primera implementación funcional de `/quest` no necesita cubrir todos los estados raros.

Sí debe cubrir perfectamente este recorrido:

1. entrar en `Operación actual`
2. abrir `Casos` con un expediente ya seleccionado
3. saltar a `Mapa` desde el expediente
4. saltar a `Perfiles` desde el POI o desde el expediente
5. abrir una herramienta desde contexto
6. volver al contexto exacto de origen
7. regresar a `Operación actual` sin perder el `casoActivo`

### Orden recomendado de implementación

#### Fase 1

- contenedor global de sesión
- router de módulos
- `Operación actual`
- persistencia básica de `casoActivo`

#### Fase 2

- `Casos`
- salto contextual a `Mapa`
- salto contextual a `Perfiles`

#### Fase 3

- `Herramientas` con al menos:
  - `Evidencias`
  - `Audio`

#### Fase 4

- `Balística`
- `Comunicaciones`
- `Rastreo`
- pulido de retornos y estados vacíos

### Riesgos a evitar en la implementación

- mezclar estado global y estado visual efímero sin separación
- hacer que la escena 3D condicione reglas de navegación
- abrir módulos sin contexto aunque el sistema sí lo tenga
- duplicar navegación en HUD y monitor principal
- usar `Herramientas` como cajón sin reglas claras de retorno

### Criterios de validación de la arquitectura UI

La arquitectura de `/quest` estará bien encaminada si:

- el `casoActivo` sobrevive a todo el flujo principal
- cambiar de módulo no resetea selecciones de forma arbitraria
- abrir una herramienta desde `Casos`, `Mapa` o `Perfiles` devuelve al punto correcto
- el HUD informa, pero no compite con el monitor principal
- la escena 3D se siente soporte espacial y no fuente de complejidad extra

## Mapeo contra la implementación actual de `/quest`

Esta sección traduce el blueprint anterior al estado real del código en `src/quest`.

Objetivo:

- identificar qué ya sirve
- qué debe reorganizarse
- qué conviene reemplazar

### Lectura general del estado actual

La implementación actual de `quest` ya resuelve tres cosas valiosas:

- carga del entorno Blender exportado a `glb`
- anclaje del monitor runtime sobre la escena
- entrada básica a WebXR con preview de escritorio

Pero la lógica de interfaz sigue respondiendo a una vertical slice temprana:

- navegación basada en `screen + selectedId`
- panel único que alterna listas y detalle
- traducción directa de `home / cases / pois / villains`
- HUD de escritorio provisional con copy y etiquetas todavía en inglés

Conclusión:

- la base espacial sirve
- la base operativa aún no

### Piezas actuales que sí conviene conservar

#### `QuestEnvironment.jsx`

Sirve como base.

Responsabilidad actual válida:

- cargar `quest_base_scene_v1.glb`
- localizar anclajes de escena
- ocultar mallas sustituidas en runtime

Debe mantenerse como capa de escena.

#### `QuestScene.jsx`

Sirve parcialmente.

Responsabilidad actual válida:

- luces básicas
- cámara desktop derivada de anclajes
- composición general `entorno + shell`

Debe seguir existiendo, pero como ensamblador visual, no como capa operativa.

#### `QuestCanvas.jsx`

Sirve como raíz de Canvas/XR.

Responsabilidad actual válida:

- crear `Canvas`
- envolver con `XR`
- montar la escena principal

#### `QuestStore.js`

Sirve tal como está para esta fase.

Su alcance es XR runtime, no estado de producto.

No debe convertirse en store de sesión operativa.

### Piezas que conviene conservar, pero reorganizar

#### `QuestRoute.jsx`

Ahora mismo mezcla:

- carga de datos
- navegación
- render de canvas
- HUD
- controles de sesión

Debe evolucionar hacia un root de sesión más claro.

Rol recomendado:

- montar datos + estado global + layout de alto nivel

#### `useQuestData.js`

Sirve como punto de partida, pero es demasiado plano.

Hoy expone:

- `cases`
- `pois`
- `villains`

Debe evolucionar hacia datos preparados para el modelo operativo:

- `casoActivo`
- relaciones entre casos, POIs y perfiles
- estado de sincronía
- cambios recientes
- pistas abiertas

#### `QuestHud.jsx`

Debe conservarse solo como concepto de HUD persistente, no como implementación actual.

Problemas actuales:

- contenido provisional
- copy en inglés
- navegación duplicada
- demasiado “relay desktop” y poco estado operativo

Debe rehacerse para mostrar solo:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

#### `QuestSessionControls.jsx`

Sirve, pero como capa utilitaria.

Debe quedar separada del HUD operativo.

Su rol es:

- entrar en VR
- recentrar
- comunicar soporte del navegador

No debe participar en navegación de producto.

### Piezas que conviene reemplazar

#### `useQuestNavigation.js`

Debe reemplazarse.

El modelo actual:

- `screen`
- `selectedId`
- `goBack()`

no soporta:

- `casoActivo`
- origen de navegación
- retorno contextual
- herramientas abiertas desde contexto
- memoria de selección por módulo

Debe sustituirse por una capa de sesión con:

- `moduloActual`
- `casoActivoId`
- selección por módulo
- `origenActual`
- `rutaDeRetorno`
- acciones globales de navegación contextual

#### `state/questScreens.js`

Debe desaparecer o quedar absorbido por un modelo de módulos real.

El sistema de pantallas actual responde a una demo de:

- home
- list
- detail

No responde al modelo operativo definido para Quest.

#### `domain/mapTerminalToQuest.js`

Debe reemplazarse.

Ahora mismo traduce el estado actual a un único panel genérico.

Eso era útil para la vertical slice, pero entra en conflicto con el modelo nuevo porque:

- colapsa módulos distintos en el mismo shape
- trata `Casos`, `Mapa` y `Perfiles` como variantes de la misma pantalla
- no expresa contexto operativo ni relaciones

Debe sustituirse por:

- un router de módulos
- builders o adaptadores específicos por módulo

#### `components/QuestPanel3D.jsx`

Debe rehacerse o dividirse.

Ahora mismo es:

- un panel genérico de título
- lista de botones
- bloque de hint
- `Back` / `Home`

Problemas:

- copy en inglés
- jerarquía demasiado uniforme
- modelo lista/detalle demasiado estrecho
- no soporta layouts distintos por módulo

La nueva arquitectura no debería depender de un único panel universal.

### Árbol de componentes recomendado para la siguiente fase

Sobre la base actual, la rama `quest` debería converger hacia algo parecido a esto:

- `QuestRoute`
- `QuestSessionRoot`
- `QuestCanvas`
- `QuestScene`
- `QuestEnvironment`
- `QuestMonitorSurface`
- `QuestHud`
- `QuestSessionControls`
- `QuestModuleRouter`
- `QuestOperacionActualView`
- `QuestCasosView`
- `QuestMapaView`
- `QuestPerfilesView`
- `QuestHerramientasView`

### Reparto recomendado sobre archivos actuales

#### Mantener

- `src/quest/QuestEnvironment.jsx`
- `src/quest/QuestScene.jsx`
- `src/quest/QuestCanvas.jsx`
- `src/quest/QuestStore.js`
- `src/quest/QuestSessionControls.jsx`

#### Reorganizar

- `src/quest/QuestRoute.jsx`
- `src/quest/hooks/useQuestData.js`
- `src/quest/QuestHud.jsx`

#### Sustituir progresivamente

- `src/quest/hooks/useQuestNavigation.js`
- `src/quest/state/questScreens.js`
- `src/quest/domain/mapTerminalToQuest.js`
- `src/quest/components/QuestPanel3D.jsx`
- `src/quest/QuestShell.jsx`

### Orden recomendado de refactor

#### Paso 1

Crear una capa de sesión real sin tocar todavía la escena 3D.

Objetivo:

- reemplazar `screen + selectedId` por estado operativo

#### Paso 2

Introducir un router de módulos dentro del monitor.

Objetivo:

- separar `Operación actual`, `Casos`, `Mapa`, `Perfiles` y `Herramientas`

#### Paso 3

Rehacer `QuestHud` como HUD persistente mínimo.

#### Paso 4

Sustituir el panel genérico por vistas específicas por módulo.

#### Paso 5

Conectar `Herramientas` con reglas reales de apertura y retorno.

### Riesgo principal si no se hace este corte

Si se sigue iterando sobre la base actual sin introducir esta separación:

- `quest` crecerá como una cadena de pantallas
- el monitor se volverá un contenedor genérico de menús
- y el modelo operativo VR quedará atrapado en la vertical slice inicial

## Diseño de la capa de sesión de `quest`

Esta sección define el shape lógico del estado y las acciones de la sesión operativa.

Objetivo:

- sustituir el modelo actual de `screen + selectedId`
- soportar contexto operativo real
- dejar preparada una implementación estable para v1

No es todavía una API de código cerrada.

Sí es el contrato conceptual que la implementación debe respetar.

### Responsabilidad de la capa de sesión

La capa de sesión de `quest` debe encargarse de:

- decidir qué módulo está activo
- mantener el `casoActivo`
- recordar selecciones relevantes por módulo
- abrir herramientas con contexto
- resolver el retorno al contexto operativo correcto
- exponer acciones simples al resto de la UI

No debe encargarse de:

- cargar el `glb`
- dibujar geometría Three.js
- construir layouts visuales
- resolver detalle de estilos o composición

### Shape lógico de estado

La sesión debería organizarse alrededor de 6 bloques.

#### 1. `session`

Estado global mínimo de la sesión:

- `ready`
- `loading`
- `error`
- `syncState`
- `alertLevel`

Ejemplo conceptual:

```js
session: {
  ready: true,
  loading: false,
  error: '',
  syncState: 'online',
  alertLevel: 'medio',
}
```

#### 2. `navigation`

Estado de navegación de alto nivel:

- `currentModule`
- `lastPrimaryModule`
- `originModule`
- `returnStack`

`currentModule` solo debería poder ser:

- `operacion`
- `casos`
- `mapa`
- `perfiles`
- `herramientas`

`lastPrimaryModule` sirve para volver desde `Herramientas` sin perder el hilo.

`returnStack` no debe convertirse en historial de app genérico.

Debe ser corto y funcional.

#### 3. `focus`

Centro operativo de la sesión:

- `activeCaseId`
- `activeLeadId`
- `activePoiId`
- `activeProfileId`

Regla:

- `activeCaseId` es el ancla principal de v1
- el resto son focos derivados o temporales

#### 4. `selection`

Selección por módulo.

Ejemplo conceptual:

```js
selection: {
  operacion: {
    highlightedLeadId: null,
  },
  casos: {
    selectedCaseId: null,
    expandedCaseIds: [],
    activeTab: 'resumen',
  },
  mapa: {
    selectedPoiId: null,
    activeFilter: 'caso-activo',
    viewportMode: 'contexto',
  },
  perfiles: {
    selectedProfileId: null,
    activeSection: 'datos-tacticos',
  },
  herramientas: {
    activeTool: null,
    resourceId: null,
  },
}
```

#### 5. `toolContext`

Contexto de apertura de herramientas.

Debe incluir:

- `originModule`
- `originEntityType`
- `originEntityId`
- `tool`
- `resourceId`

Ejemplo:

```js
toolContext: {
  originModule: 'casos',
  originEntityType: 'case',
  originEntityId: 'case_001',
  tool: 'evidencias',
  resourceId: 'ev_knife_02',
}
```

#### 6. `derived`

Estado derivado útil para la UI, sin convertirlo en fuente primaria de verdad.

Puede incluir:

- `relatedPoisForActiveCase`
- `relatedProfilesForActiveCase`
- `suggestedTools`
- `recentChanges`
- `openLeads`

Regla:

- si algo puede recalcularse desde datos base, debe tratarse como derivado
- no conviene persistirlo como fuente única

### Acciones globales mínimas

La capa de sesión debería exponer un grupo de acciones pequeño y claro.

#### Acciones de sesión

- `initializeSession(payload)`
- `setSyncState(value)`
- `setAlertLevel(value)`
- `setSessionError(message)`

#### Acciones de foco

- `setActiveCase(caseId)`
- `setActiveLead(leadId | null)`
- `setActivePoi(poiId | null)`
- `setActiveProfile(profileId | null)`

#### Acciones de navegación

- `goToOperacion()`
- `goToCasos(options?)`
- `goToMapa(options?)`
- `goToPerfiles(options?)`
- `goToHerramientas(options?)`

#### Acciones de selección por módulo

- `selectCase(caseId)`
- `toggleCaseExpansion(caseId)`
- `setCaseTab(tabId)`
- `selectPoi(poiId)`
- `setMapaFilter(filterId)`
- `selectProfile(profileId)`
- `setProfileSection(sectionId)`

#### Acciones de herramientas

- `openTool(tool, options?)`
- `closeTool()`
- `setToolResource(resourceId | null)`
- `returnFromTool()`

#### Acción de retorno principal

- `returnToOperationalContext()`

Esta acción debe ser una de las más importantes de toda la rama `quest`.

### Semántica exacta de las acciones clave

#### `setActiveCase(caseId)`

Debe:

- actualizar `focus.activeCaseId`
- sincronizar `selection.casos.selectedCaseId`
- poder refrescar derivados como POIs o perfiles relacionados

No debe:

- cambiar de módulo por sí sola

#### `goToCasos(options?)`

Puede recibir:

- `caseId`
- `originModule`

Debe:

- activar módulo `casos`
- seleccionar el expediente indicado si existe
- si no existe `caseId`, usar `activeCaseId` si está disponible

#### `goToMapa(options?)`

Puede recibir:

- `poiId`
- `caseId`
- `originModule`

Debe:

- activar módulo `mapa`
- seleccionar el POI indicado si existe
- si no hay `poiId`, priorizar POIs relacionados con `activeCaseId`

#### `goToPerfiles(options?)`

Puede recibir:

- `profileId`
- `caseId`
- `originModule`

Debe:

- activar módulo `perfiles`
- seleccionar el perfil indicado si existe
- si no existe, destacar los relacionados con el `casoActivo`

#### `openTool(tool, options?)`

Debe aceptar como mínimo:

- `tool`
- `resourceId`
- `originModule`
- `originEntityType`
- `originEntityId`

Debe:

- activar módulo `herramientas`
- registrar `toolContext`
- mantener `lastPrimaryModule`
- preparar `selection.herramientas`

#### `returnToOperationalContext()`

Debe aplicar esta prioridad:

1. si hay `toolContext.originModule`, volver ahí y restaurar foco relacionado
2. si no, volver a `lastPrimaryModule`
3. si no, volver a `operacion`

Nunca debe:

- limpiar el `casoActivo`
- dejar una vista sin selección cuando el contexto sí existe

### Selectores recomendados

La UI no debería leer el estado bruto completo si no hace falta.

Conviene exponer selectores orientados a vistas.

#### Selectores globales

- `selectCurrentModule()`
- `selectActiveCase()`
- `selectHudState()`
- `selectSyncState()`
- `selectReturnAvailability()`

#### Selectores de `Operación actual`

- `selectOperacionActualSummary()`
- `selectOpenLeads()`
- `selectSuggestedActions()`

#### Selectores de `Casos`

- `selectCaseTree()`
- `selectSelectedCase()`
- `selectRelatedEntitiesForSelectedCase()`

#### Selectores de `Mapa`

- `selectMapPois()`
- `selectSelectedPoi()`
- `selectMapContext()`

#### Selectores de `Perfiles`

- `selectProfilesList()`
- `selectSelectedProfile()`
- `selectProfileRelations()`

#### Selectores de `Herramientas`

- `selectActiveTool()`
- `selectToolResource()`
- `selectToolOriginContext()`

### Reglas de propiedad del estado

Para que la implementación no se degrade rápido, cada capa debe respetar estos límites:

#### La capa de sesión es propietaria de:

- módulo activo
- caso activo
- reglas de retorno
- tool context

#### Las vistas de módulo son propietarias de:

- subpestañas visuales
- estados de expansión internos
- foco local que no afecte al resto de módulos

#### La escena 3D no es propietaria de:

- navegación
- selección de dominio
- memoria de contexto

### Invariantes de la sesión

La implementación debería preservar siempre estas invariantes:

1. si existe `activeCaseId`, `Operación actual` debe poder representarlo
2. abrir `Casos` sin `caseId` explícito debe intentar usar `activeCaseId`
3. abrir `Mapa` o `Perfiles` desde contexto no debe perder el origen
4. abrir `Herramientas` debe registrar siempre `toolContext`
5. `returnToOperationalContext()` nunca debe mandar a una vista vacía si hay contexto útil

### Estrategia de migración desde el estado actual

Partimos de un modelo limitado:

- `screen`
- `selectedId`

La migración razonable sería:

#### Etapa 1

Introducir `currentModule` y `activeCaseId` sin desmontar aún todo lo demás.

#### Etapa 2

Separar selección por módulo:

- `selectedCaseId`
- `selectedPoiId`
- `selectedProfileId`

#### Etapa 3

Introducir `toolContext` y `returnToOperationalContext()`.

#### Etapa 4

Eliminar definitivamente `screen + selectedId` y los enums de pantallas actuales.

### Criterios para dar esta capa por buena

La capa de sesión estará lista para pasar a implementación cuando:

- permita describir todo el flujo principal sin hacks
- no dependa de nomenclatura de pantallas heredada de la vertical slice
- permita abrir herramientas desde contexto con retorno claro
- soporte escritorio y Quest Browser sin cambiar modelo mental

## Árbol real de componentes y secuencia de refactor

Esta sección aterriza el blueprint sobre un árbol de componentes concreto para la rama `quest`.

Objetivo:

- reducir riesgo al empezar la implementación
- dejar claro qué archivo cambia de rol
- evitar refactors difusos que rompan `/quest`

### Árbol objetivo de v1

La rama `quest` debería converger hacia este árbol lógico:

- `QuestRoute`
- `QuestSessionProvider`
- `QuestCanvas`
- `QuestScene`
- `QuestEnvironment`
- `QuestMonitorSurface`
- `QuestModuleRouter`
- `QuestOperacionActualView`
- `QuestCasosView`
- `QuestMapaView`
- `QuestPerfilesView`
- `QuestHerramientasView`
- `QuestHud`
- `QuestSessionControls`

### Responsabilidad por archivo

#### `QuestRoute.jsx`

Debe quedar como raíz de composición de la experiencia Quest.

Responsabilidad final:

- cargar datos base
- montar el provider de sesión
- montar `QuestCanvas`
- montar `QuestHud`
- montar `QuestSessionControls`

No debe contener:

- navegación de módulos
- lógica de layout de cada vista

#### `QuestCanvas.jsx`

Debe seguir siendo contenedor técnico de:

- `Canvas`
- `XR`
- `Suspense`

Debe recibir ya la sesión resuelta, no calcular producto.

#### `QuestScene.jsx`

Debe componer:

- entorno
- cámara
- superficie del monitor

No debe conocer detalles de `Casos`, `Mapa` o `Perfiles`.

#### `QuestMonitorSurface.jsx`

Componente nuevo recomendado.

Responsabilidad:

- montar la UI sobre el anclaje del monitor
- recibir el módulo actual
- delegar en `QuestModuleRouter`

Sirve para separar:

- anclaje espacial
- contenido operativo

#### `QuestModuleRouter.jsx`

Componente nuevo recomendado.

Responsabilidad:

- seleccionar la vista de módulo activa
- pasar solo la porción de estado y acciones necesarias

#### `QuestSessionProvider`

Responsabilidad:

- encapsular la capa de sesión
- exponer estado, acciones y selectores

Puede empezar como hook + context local a `src/quest`.

#### Vistas de módulo

Cada una debe tener responsabilidad única:

- `QuestOperacionActualView`
- `QuestCasosView`
- `QuestMapaView`
- `QuestPerfilesView`
- `QuestHerramientasView`

Regla:

- una vista por módulo
- sin panel universal como centro del sistema

### Secuencia exacta de refactor recomendada

#### Paso 1. Introducir la capa de sesión sin cambiar aún el layout visual

Objetivo:

- sustituir el estado de `screen + selectedId`
- mantener momentáneamente la misma ruta `/quest`

Archivos afectados:

- `QuestRoute.jsx`
- `hooks/useQuestData.js`
- nuevo `session/` o `state/` para Quest

#### Paso 2. Separar monitor y router de módulos

Objetivo:

- dejar de usar `QuestShell` como contenedor de todo

Archivos afectados:

- `QuestScene.jsx`
- nuevo `QuestMonitorSurface.jsx`
- nuevo `QuestModuleRouter.jsx`

#### Paso 3. Sustituir el HUD provisional

Objetivo:

- pasar de overlay de escritorio a HUD persistente operativo

Archivos afectados:

- `QuestHud.jsx`
- `styles/quest.css`

#### Paso 4. Reemplazar el panel genérico por vistas de módulo

Objetivo:

- que `Operación actual`, `Casos`, `Mapa`, `Perfiles` y `Herramientas` tengan estructura propia

Archivos afectados:

- `QuestPanel3D.jsx`
- `QuestShell.jsx`
- nuevos componentes o vistas por módulo

#### Paso 5. Introducir retorno contextual y apertura de herramientas

Objetivo:

- completar la semántica operativa de v1

Archivos afectados:

- capa de sesión
- `QuestHerramientasView`
- acciones desde `Casos`, `Mapa` y `Perfiles`

### Criterio para empezar a implementar

Se puede empezar a implementar ya cuando:

- exista acuerdo en que el primer corte será de arquitectura, no de detalle visual fino
- se acepte mantener la escena actual mientras cambia la lógica del monitor

Ese criterio ya se considera cumplido en esta iteración.

## Estado actual y siguientes pasos

### Estado actual de la rama `quest`

A fecha de 2026-04-22, la rama `quest` tiene ya este primer corte implementado:

- escena base Blender integrada como entorno runtime
- monitor 3D alineado con el hueco del panel del `glb`
- capa de sesión inicial en `useQuestSession.js`
- módulos canónicos:
  - `operacion`
  - `casos`
  - `mapa`
  - `perfiles`
  - `herramientas`
- HUD operativo básico en español
- controles de sesión WebXR en español
- router de módulos inicial dentro del monitor

Build verificado:

- `npm run build` pasa

### Limitaciones conocidas del estado actual

- los módulos aún comparten un panel 3D genérico como soporte temporal
- no existe todavía layout específico por módulo
- `Herramientas` ya existe como módulo, pero no como bahías funcionales completas
- el retorno contextual está iniciado a nivel de sesión, pero todavía no está explotado en profundidad entre entidades reales
- la parte visual del entorno aún está en fase de primera integración, sin assets externos ya colocados en Blender

### Assets ya revisados y clasificados

Inventario operativo:

- `C:\Repos\gcpd\assets\quest_vr_asset_inventory.md`

Brief curatorial de referencia:

- `C:\Repos\gcpd\assets\quest_vr_asset_sourcing_brief.md`

Selección prioritaria ya decidida:

- `PaintedMetal002_1K-PNG`
- `MetalWalkway001_1K-PNG`
- `empty_warehouse_01_1k.exr`
- `server_rack.glb`
- `electrical_boxes.glb`

Donors inmediatos ya decididos:

- `industrial_switches_and_buttons_-_free_sample.glb`
- `modular_electric_cables_1k.blend`
- `cc0_-_tray.glb`

### Siguientes pasos recomendados

#### Paso 1. Integración visual en Blender

Objetivo:

- hacer la primera pasada de assets reales sobre la escena base

Orden recomendado:

1. aplicar `PaintedMetal002` como material maestro oscuro
2. aplicar `MetalWalkway001` a suelo/pasarela/base funcional
3. cargar `empty_warehouse_01_1k.exr` como probe suave de lookdev
4. validar `server_rack.glb` como rack lateral único
5. validar `electrical_boxes.glb` como caja técnica mural
6. extraer uno o dos controles de `industrial_switches_and_buttons` como donor

Entregables de este paso:

- nueva versión de la escena `.blend`
- export `.glb`
- 2 a 4 capturas de viewport
- actualización de la documentación de assets usados

#### Paso 2. Segunda pasada de UI espacial en `/quest`

Objetivo:

- dejar atrás el panel genérico y empezar a construir vistas reales de módulo

Orden recomendado:

1. `QuestOperacionActualView`
2. `QuestCasosView`
3. `QuestMapaView`
4. `QuestPerfilesView`
5. `QuestHerramientasView`

Regla:

- no tocar aún capacidades avanzadas textuales
- no introducir `Consola de análisis`

#### Paso 3. Validación desktop y Quest Browser

Objetivo:

- comprobar escala, framing y legibilidad

Validaciones mínimas:

- alineación del monitor con la UI runtime
- tamaño y distancia del panel
- lectura de texto en navegador de escritorio
- lectura y confort en Quest Browser

### Regla de continuidad

La siguiente iteración no debe reabrir estas decisiones:

- Quest no porta `TerminalOS`
- Quest no porta `Brother-MK0` como interfaz
- `Consola de análisis` queda fuera de v1
- no se usan modos ASCII en Quest
- la arquitectura debe seguir centrada en:
  - `Operación actual`
  - `Casos`
  - `Mapa`
  - `Perfiles`
  - `Herramientas`

## Decisiones ya tomadas en esta iteración

- Quest no replicará `TerminalOS`
- Quest no usará `dialer` ni `login` como entrada principal
- Quest se diseñará como estación operativa espacial
- todas las etiquetas user-facing se plantearán en español de España
- la TUI actual se usará como fuente de capacidades, no como layout a copiar
- `Consola de análisis` queda fuera de v1
- las capacidades avanzadas textuales quedan aplazadas

## Implicaciones para futuras iteraciones de Codex

Cuando se continúe este trabajo:

- no volver a abrir el debate de si hay que portar la TUI a VR
- asumir que la respuesta es no
- trabajar solo sobre el modelo operativo VR
- usar terminología en español de España para todas las etiquetas visibles al usuario
- mantener compatibilidad con la misma API y la misma DB que la TUI

## Próximos pasos recomendados

1. traducir este modelo a una arquitectura real de estado y navegación en `/quest`
2. definir contratos de datos mínimos por módulo frente a la API compartida
3. validar que `Casos`, `Mapa` y `Perfiles` conservan correctamente el `casoActivo`
4. fijar reglas de apertura y retorno para `Herramientas`
5. probar el flujo base completo primero en escritorio y después en Quest Browser
6. mantener fuera de v1 cualquier capacidad textual avanzada

## Layouts detallados

Esta sección concreta cómo debería repartirse el espacio visual en la escena Quest actual, asumiendo:

- usuario fijo frente al monitor principal
- HUD persistente mínimo
- experiencia sentada o de pie, pero sin locomoción libre como eje de diseño
- monitor frontal como superficie dominante

### Convenciones comunes

#### Zonas de escena

- `Monitor principal`: superficie frontal de trabajo
- `Panel lateral izquierdo`: navegación contextual o lista
- `Panel lateral derecho`: detalle secundario, estado o acciones rápidas
- `HUD persistente`: información mínima siempre visible
- `Modo herramienta`: cuando una operación necesita ocupar el foco completo

#### HUD persistente recomendado

Siempre visible, pero con mucho menos peso que el monitor.

Bloques:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

No debe incluir:

- listas largas
- logs
- texto explicativo largo
- navegación principal completa

### Layout de `Operación actual`

#### Objetivo visual

Debe sentirse como una consola ya encendida en mitad de una investigación, no como una pantalla de inicio abstracta.

#### Distribución

- centro del monitor:
  - bloque `Caso activo`
  - bloque `Resumen operativo`
  - bloque `Pistas abiertas`
- banda inferior del monitor:
  - accesos rápidos a `Casos`, `Mapa`, `Perfiles`, `Herramientas`
- lateral derecho discreto:
  - `Cambios recientes` en formato corto
- HUD persistente:
  - `Alerta`, `Sincronía`, `Volver a operación`

#### Jerarquía de contenido

Orden recomendado:

1. `Caso activo`
2. `Resumen operativo`
3. `Pistas abiertas`
4. `Acciones sugeridas`
5. `Cambios recientes`

#### Acciones primarias visibles

- `Abrir caso`
- `Ir al mapa`
- `Ver perfiles`
- `Abrir herramientas`

#### Estados vacíos o especiales

- sin caso activo:
  - `Sin caso activo`
  - `Selecciona un expediente para comenzar`
- API en fallback:
  - `Datos locales activos`
- cambios no leídos:
  - pastilla o marcador breve, no lista invasiva

### Layout de `Casos`

#### Objetivo visual

Una mesa de expedientes digital, no una app de tarjetas.

#### Distribución

- panel lateral izquierdo, estrecho:
  - árbol/lista de expedientes
  - scroll vertical
  - estados de acceso, lectura y jerarquía
- monitor principal:
  - ficha del expediente seleccionado
- panel lateral derecho o banda inferior:
  - acciones contextuales y relaciones

#### Contenido del panel lateral izquierdo

- `Expedientes`
- nodos padre/hijo
- marcadores:
  - `nuevo`
  - `bloqueado`
  - `activo`
  - `resuelto`

#### Contenido del monitor principal

Orden recomendado:

1. `Título del caso`
2. `Estado`
3. `Resumen`
4. `Inteligencia`
5. `Puzle`, si existe
6. `Ubicaciones vinculadas`

#### Contenido del panel secundario

- `Ver en mapa`
- `Ver perfiles relacionados`
- `Abrir evidencia`
- `Fijar como foco`

#### Comportamiento

- seleccionar un expediente actualiza el monitor sin cambiar de modo
- abrir un subcaso no debe sentirse como navegar a otra app
- volver desde `Mapa` o `Perfiles` debe poder restaurar este expediente

### Layout de `Mapa`

#### Objetivo visual

Mesa cartográfica operativa con detalle contextual.

#### Distribución

- monitor principal:
  - mapa
  - hotspots/POIs
  - capa de foco para caso activo
- panel lateral derecho:
  - detalle de la ubicación seleccionada
- banda superior mínima:
  - filtros y control de enfoque

#### Contenido del monitor principal

- Gotham como superficie principal
- nodos con jerarquía visual clara
- resalte especial para:
  - caso activo
  - rastreo activo
  - POI seleccionado

#### Contenido del panel lateral derecho

Orden recomendado:

1. `Ubicación seleccionada`
2. `Distrito`
3. `Resumen`
4. `Notas`
5. `Imagen`, si existe
6. relaciones:
  - `Ver expediente`
  - `Ver perfil`

#### Controles visibles

- `Centrar`
- `Restablecer vista`
- `Mostrar solo caso activo`
- `Mostrar todo`

#### Estados especiales

- sin POI seleccionado:
  - `Selecciona un punto de interés`
- POI bloqueado:
  - `Acceso restringido`

### Layout de `Perfiles`

#### Objetivo visual

Muro táctico de perfiles, no ficha de personaje ornamental.

#### Distribución

- panel lateral izquierdo:
  - lista de perfiles
- monitor principal:
  - ficha del perfil seleccionado
- panel lateral derecho:
  - relaciones y accesos rápidos

#### Contenido del panel lateral izquierdo

- alias
- amenaza
- estado
- marcadores de bloqueo o novedad

#### Contenido del monitor principal

Orden recomendado:

1. `Alias`
2. `Amenaza`
3. `Estado`
4. `Resumen`
5. `Patrones`
6. `Asociados`
7. `Ubicaciones vinculadas`

#### Contenido del panel secundario

- `Ver en mapa`
- `Ver expediente`
- `Relacionados`

#### Estados especiales

- atributo bloqueado:
  - `Datos restringidos`
- sin perfil seleccionado:
  - `Selecciona un perfil`

### Layout de `Herramientas`

#### Objetivo visual

Panel de modos de trabajo, no parrilla de iconos.

#### Distribución

- monitor principal:
  - selector de herramienta
  - descripción corta
  - último elemento usado o sugerido
- banda inferior:
  - accesos directos

#### Herramientas visibles

- `Evidencias`
- `Audio`
- `Balística`
- `Comunicaciones`
- `Rastreo`

#### Comportamiento

- elegir herramienta entra en modo dedicado
- salir devuelve al contexto anterior, idealmente al expediente o lead desde el que se abrió

### Layout de `Evidencias`

#### Objetivo visual

Bahía de inspección.

#### Distribución

- centro:
  - objeto/evidencia
- lateral derecho:
  - datos del objeto
- franja inferior:
  - controles de modo

#### Contenido

- nombre / id
- descripción breve
- acciones:
  - `Girar`
  - `Acercar`
  - `Alejar`
  - `Modo escaneo`
  - `Modo análisis`
  - `Volver al caso`

### Layout de `Audio`

#### Objetivo visual

Estación de escucha sobria.

#### Distribución

- monitor principal:
  - forma de onda
- lateral derecho:
  - pista actual, duración, estado
- banda inferior:
  - transporte

#### Contenido

- `Pista actual`
- `Reproducir`
- `Pausar`
- `Adelantar`
- `Retroceder`
- `Volumen`
- `Desbloquear`, si hace falta

### Layout de `Balística`

#### Objetivo visual

Comparador instrumental.

#### Distribución

- columna izquierda:
  - `Muestra A`
- columna derecha:
  - `Muestra B`
- centro o franja inferior:
  - `Coincidencia`
  - resultado

#### Contenido

- selector de muestra
- previsualización
- botón `Comparar`
- score/resultados

### Layout de `Comunicaciones`

#### Objetivo visual

Consola de línea externa.

#### Distribución

- panel izquierdo:
  - listado de líneas
- monitor principal:
  - actividad y estado
- panel derecho:
  - controles

#### Contenido

- `Líneas`
- `Llamada en curso`
- `Reproducir`
- `Colgar`

### Layout de `Rastreo`

#### Objetivo visual

Consola de seguimiento en vivo con fuerte progresión.

#### Distribución

- monitor principal:
  - mapa de rastreo
  - radio de búsqueda
- lateral derecho:
  - `Objetivo`
  - `Fase`
  - `Registro`
- banda inferior:
  - estado de operador / acciones

#### Fases visibles

- `Búsqueda amplia`
- `Reducción de área`
- `Triangulación`
- `Ubicación exacta`

## Lista de assets y modelos deseables

Estos assets no son todos obligatorios. La idea es separar:

- lo necesario para v1 funcional
- lo deseable para una mejora visual v2

### Prioridad alta

Estos sí pueden aportar valor real pronto.

#### 1. Decals o paneles técnicos modulares

Tipo:

- decals planos
- paneles sci-fi sobrios
- tiras de marcaje técnico
- etiquetas industriales

Uso:

- romper superficies grandes del nodo Quest
- añadir credibilidad Wayne/GCPD sin aumentar mucho polígonos

Requisitos:

- sobrios
- oscuros
- azul frío / blanco / cian
- nada muy militar futurista

#### 2. Conduits o módulos de cableado ligero

Tipo:

- canaletas
- tubos
- mazos de cable muy simples
- racores o conectores técnicos

Uso:

- reforzar que el nodo es infraestructura reutilizada
- enriquecer laterales y parte trasera del set

Requisitos:

- low-poly
- fáciles de duplicar
- sin excesivo detalle

#### 3. HDRI industrial muy tenue

Tipo:

- interior industrial
- nave técnica
- pasillo técnico oscuro

Uso:

- reflejos suaves en materiales
- nada de iluminación dominante

Requisitos:

- contrastado pero discreto
- que no imponga una escena distinta

### Prioridad media

Mejoran bastante la ambientación, pero no bloquean el diseño base.

#### 4. Consolas auxiliares o módulos de rack sencillos

Tipo:

- rack técnico
- consola lateral
- armario de servidores low-poly
- unidad de control compacta

Uso:

- vestir laterales de la escena
- dar profundidad sin saturar

Requisitos:

- estilo industrial / técnico
- no demasiado realista
- sin branding evidente

#### 5. Soportes o peanas de evidencia

Tipo:

- bases expositoras pequeñas
- peanas técnicas
- bandejas de laboratorio simples

Uso:

- módulo `Evidencias`
- staging de objetos físicos

#### 6. Texturas trim sheet o superficies técnicas limpias

Tipo:

- metal pintado
- composite oscuro
- superficies técnicas con líneas o panelado muy ligero

Uso:

- materiales del nodo
- evitar que todo sean colores planos sin detalle

Requisitos:

- ligeras
- tileables
- sin ruido excesivo

### Prioridad baja

Solo si la dirección ya está consolidada.

#### 7. Accesorios ambientales mínimos

Tipo:

- cajas de mantenimiento
- módulos de alimentación
- pequeñas luminarias técnicas

Uso:

- rellenar vacío en la escena

Riesgo:

- es fácil pasarse y recargar el set

#### 8. Elementos holográficos o VFX ligeros

Tipo:

- líneas de escaneo
- retículas
- pequeñas animaciones de estado

Uso:

- enriquecer `Rastreo`, `Mapa` o `Evidencias`

Riesgo:

- romper el tono si quedan demasiado “sci-fi genérico”

## Assets que no conviene buscar todavía

No priorizar por ahora:

- personajes 3D
- vehículos complejos
- salas completas hiperrealistas
- props decorativos abundantes
- interfaces sci-fi muy barrocas
- maquinaria muy detallada que obligue a rediseñar el set

## Guía de búsqueda para repositorios gratuitos

Cuando busques assets, intenta filtrar con esta intención:

- low-poly o mid-poly ligero
- industrial
- técnico
- modular
- sobrio
- sin look militar agresivo
- sin estética cyberpunk saturada
- sin neones excesivos

Palabras clave útiles:

- `industrial sci-fi panel`
- `modular console`
- `server rack low poly`
- `cable conduit`
- `hard surface greeble simple`
- `trim sheet metal panel`
- `technical decal`
- `control terminal low poly`

## Lista corta de búsqueda priorizada

Si solo buscas 5 cosas primero, que sean estas:

1. decals o paneles técnicos modulares
2. módulos de cableado / conduit
3. un HDRI industrial tenue
4. uno o dos racks o consolas laterales low-poly
5. una peana o base técnica para `Evidencias`

## Especificación detallada de `Operación actual`

Esta sección fija el diseño exacto del módulo `Operación actual` para la rama `quest`.

Objetivo:

- ser la pantalla de entrada real de la experiencia VR
- responder inmediatamente a “qué ocurre ahora” y “qué debo hacer a continuación”
- actuar como centro de gravedad del flujo operativo

No debe ser:

- una home abstracta
- un menú de iconos
- una traducción del `HELP`
- un dashboard corporativo

### Idea rectora

`Operación actual` debe sentirse como un **tablero de situación** ya cargado en el monitor principal del nodo.

Debe presentar:

- el foco de la investigación
- las pistas más útiles
- los accesos inmediatos a módulos y herramientas
- el estado mínimo del sistema

## Jerarquía visual

Orden de importancia visual:

1. `Caso activo`
2. `Resumen operativo`
3. `Pistas abiertas`
4. `Acciones recomendadas`
5. `Cambios recientes`
6. `Estado del nodo`

Regla:

- el usuario debe leer primero el caso
- después entender la situación
- después decidir una acción

## Distribución espacial

### Monitor principal

Debe ocupar la mayor parte del foco visual.

Se divide en 4 franjas:

1. cabecera de situación
2. bloque de caso activo
3. bloque de pistas y acciones
4. franja inferior de navegación operativa

### Panel lateral derecho

Uso:

- información secundaria
- cambios recientes
- estado del nodo

Nunca debe competir con el bloque central.

### HUD persistente

Siempre visible, pero muy discreto.

Contenido:

- `Caso`
- `Alerta`
- `Sincronía`
- `Volver a operación`

## Estructura exacta por bloques

### Bloque 1. Cabecera de situación

Posición:

- parte superior del monitor principal

Función:

- identificar el contexto actual de la sesión

Contenido:

- `Operación actual`
- identificador corto del nodo, si interesa
- timestamp o estado de sincronización corto, opcional

Etiquetas sugeridas:

- `Operación actual`
- `Nodo auxiliar`
- `Datos locales activos`
- `Sincronizado`

Tratamiento visual:

- altura contenida
- tipografía técnica pequeña
- línea de separación clara
- no usar titular grande aquí

### Bloque 2. Caso activo

Posición:

- inmediatamente debajo de la cabecera
- ocupa el área dominante del tercio superior/central

Función:

- dejar clarísimo cuál es el foco principal

Contenido exacto:

- título del caso
- id del caso
- estado
- nivel de alerta asociado, si conviene
- resumen corto de 2 a 4 líneas

Etiquetas sugeridas:

- `Caso activo`
- `Estado`
- `Nivel de alerta`
- `Resumen operativo`

Acción principal visible:

- `Abrir caso`

Tratamiento visual:

- mayor contraste de toda la pantalla
- título grande
- resumen claramente legible
- una única acción principal muy obvia

### Bloque 3. Pistas abiertas

Posición:

- mitad inferior izquierda del monitor principal

Función:

- sugerir por dónde continuar sin obligar a abrir menús

Contenido:

- 2 a 4 pistas como máximo
- cada pista debe representar una acción o una relación operativa

Tipos de pista recomendados:

- POI vinculado al caso
- perfil relacionado
- evidencia disponible
- trazado o línea de comunicación disponible

Etiquetas sugeridas:

- `Pistas abiertas`
- `Ubicación relacionada`
- `Perfil relacionado`
- `Evidencia disponible`
- `Canal disponible`

Cada pista debe incluir:

- título corto
- subtítulo de contexto
- acción directa

Acciones típicas:

- `Ir al mapa`
- `Ver perfil`
- `Abrir evidencia`
- `Abrir herramienta`

Tratamiento visual:

- formato de lista operativa, no tarjetas grandes
- 1 línea fuerte + 1 línea secundaria por pista
- evitar ruido visual

### Bloque 4. Acciones recomendadas

Posición:

- mitad inferior derecha del monitor principal

Función:

- ofrecer los 4 saltos operativos principales

Contenido:

- `Casos`
- `Mapa`
- `Perfiles`
- `Herramientas`

Opcional:

- una quinta acción contextual solo si el caso activo la justifica

Etiquetas sugeridas:

- `Abrir casos`
- `Abrir mapa`
- `Ver perfiles`
- `Abrir herramientas`

Regla:

- estas acciones no son navegación global genérica
- deben sentirse como verbos de trabajo

Tratamiento visual:

- botones o entradas grandes y muy limpias
- máximo 4 visibles a la vez
- sin descripciones largas

### Bloque 5. Cambios recientes

Posición:

- panel lateral derecho, zona superior

Función:

- awareness sin robar foco

Contenido:

- 3 a 5 cambios recientes máximo
- texto muy corto
- tipo de entidad + nombre + marca temporal breve

Etiquetas sugeridas:

- `Cambios recientes`
- `Caso`
- `Ubicación`
- `Perfil`

Tratamiento visual:

- tono secundario
- tamaño contenido
- no convertirlo en log largo

### Bloque 6. Estado del nodo

Posición:

- panel lateral derecho, zona inferior

Función:

- exponer estado técnico y de campaña sin saturar el centro

Contenido:

- sincronía
- flags activas críticas, si las hay
- fuente de datos (`api` / fallback local)
- quizá estado de operador si `Rastreo` depende de ello

Etiquetas sugeridas:

- `Estado del nodo`
- `Sincronía`
- `Fuente de datos`
- `Flags activas`
- `Operador`

Tratamiento visual:

- denso pero pequeño
- lectura rápida
- apariencia instrumental

## Estados y variaciones

### Estado normal

Debe mostrar:

- caso activo completo
- 2 a 4 pistas abiertas
- acciones recomendadas
- cambios recientes

### Sin caso activo

La pantalla debe degradarse bien.

Contenido:

- `Sin caso activo`
- mensaje corto:
  - `Selecciona un expediente para comenzar`
- acciones principales:
  - `Abrir casos`
  - `Abrir mapa`
  - `Ver perfiles`

No debe parecer rota ni vacía.

### API caída / fallback local

No bloquear la operación.

Mostrar:

- una marca discreta tipo `Datos locales activos`
- no ocupar el bloque central con error técnico

### Datos bloqueados o restringidos

Si el caso activo o alguna pista está restringida:

- indicarlo de forma clara
- nunca sustituir toda la pantalla por mensajes de error

Etiquetas sugeridas:

- `Acceso restringido`
- `Datos protegidos`

### Sin cambios recientes

Mostrar:

- `Sin cambios recientes`

Y dejar más respiración visual en el panel lateral.

## Comportamiento e interacción

### Al entrar en `Operación actual`

Debe ocurrir esto:

1. cargar caso activo
2. construir resumen operativo
3. resolver 2 a 4 pistas útiles
4. mostrar acciones recomendadas
5. refrescar cambios recientes y estado del nodo

### Al pulsar `Abrir caso`

- abrir `Casos`
- mantener foco en el expediente activo

### Al pulsar una pista

- ir directamente al módulo correspondiente
- preservar el contexto para volver

Ejemplos:

- pista de POI -> abrir `Mapa` con ese POI seleccionado
- pista de perfil -> abrir `Perfiles` con ese perfil
- pista de evidencia -> abrir `Herramientas > Evidencias`

### Al volver desde otro módulo

`Operación actual` debe recordar:

- caso activo
- pistas abiertas
- selección contextual si sigue siendo válida

No debe reconstruirse como una pantalla nueva ajena al trabajo en curso.

## Datos necesarios desde API/estado

Para construir `Operación actual` harán falta como mínimo:

- `campaignState.activeCaseId`
- `campaignState.alertLevel`
- `campaignState.flags`
- `cases`
- `pois`
- `villains`
- `last changes` derivados de `updatedAt`
- estado de sincronía/fallback

Derivados necesarios:

- expediente activo resuelto
- pistas abiertas derivadas del caso activo
- perfiles relacionados
- POIs relacionados
- evidencias o herramientas sugeridas, si se pueden inferir

## Reglas de contenido

### Resumen operativo

Debe ser:

- corto
- accionable
- legible de un vistazo

No debe ser:

- narración larga
- bloque de lore
- duplicado completo del expediente

### Pistas abiertas

Cada pista debe justificar su presencia.

No incluir pistas si no permiten una acción real.

Prioridad recomendada:

1. POI principal relacionado
2. perfil relevante
3. evidencia o herramienta utilizable
4. cambio reciente de alta relevancia

## Riesgos de diseño a evitar

- hacer una home demasiado parecida a una web dashboard
- usar demasiadas tarjetas iguales
- meter texto largo en el centro
- duplicar navegación que ya existe en el HUD y en el bloque de acciones
- convertir `Cambios recientes` en un log gigante
- perder el protagonismo del `Caso activo`

## Criterio de validación visual

La pantalla `Operación actual` estará bien encaminada si:

- el ojo cae primero en `Caso activo`
- el siguiente gesto natural es elegir una pista o una acción
- el panel derecho se percibe como apoyo, no como competencia
- el HUD persistente apenas molesta
- en Quest Browser sigue leyéndose sin esfuerzo

## Especificación detallada de `Casos`

Esta sección fija el diseño exacto del módulo `Casos` para la rama `quest`.

Objetivo:

- convertir la lógica actual de expedientes en una mesa operativa clara
- permitir explorar jerarquías sin perder el foco
- hacer que el expediente seleccionado gobierne las acciones siguientes

`Casos` no debe sentirse como:

- una lista infinita de tarjetas
- una tabla administrativa
- una pantalla textual importada de la TUI

Debe sentirse como:

- un archivo vivo
- una pila de expedientes operativos
- el núcleo de trabajo del agente

## Idea rectora

El módulo `Casos` es una **mesa de expedientes espacial** organizada en tres capas:

1. navegación jerárquica
2. lectura del expediente activo
3. acciones relacionales y operativas

La regla principal es esta:

- seleccionar no debe sacar al usuario del módulo
- abrir relaciones sí puede llevarle a otro módulo
- volver debe restaurar el expediente exacto y su contexto

## Jerarquía visual

Orden de importancia visual:

1. expediente seleccionado
2. estado y acceso del expediente
3. `Resumen`
4. `Inteligencia`
5. relaciones operativas
6. árbol/lista de expedientes

Parece contraintuitivo, pero en VR la lista no debe dominar.

El protagonista no es el listado.
El protagonista es el expediente activo.

## Distribución espacial

### Panel lateral izquierdo

Uso:

- navegación jerárquica
- árbol de expedientes
- selección rápida

Debe ser:

- estrecho pero legible
- estable
- scrollable
- siempre visible dentro del módulo

### Monitor principal

Uso:

- mostrar el expediente activo
- presentar `Resumen`, `Inteligencia` y estado

Debe ser:

- el área dominante
- el lugar donde se “lee” el caso

### Panel lateral derecho

Uso:

- relaciones
- acciones contextuales
- indicadores secundarios

Debe ser:

- más ligero que el monitor principal
- más funcional que decorativo

### HUD persistente

Dentro de `Casos`, el HUD general sigue visible pero discreto:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

## Estructura exacta por bloques

### Bloque 1. Cabecera del módulo

Posición:

- parte superior del monitor principal

Función:

- recordar que el usuario está en el módulo `Casos`
- dar contexto de volumen y foco

Contenido:

- `Casos`
- contador breve, si aporta valor
- foco actual, si el caso está fijado

Etiquetas sugeridas:

- `Casos`
- `Expedientes`
- `Caso en foco`

Tratamiento visual:

- cabecera contenida
- tono instrumental
- sin ocupar demasiado alto

### Bloque 2. Árbol de expedientes

Posición:

- panel lateral izquierdo completo

Función:

- navegación jerárquica
- selección de expediente

Contenido:

- casos raíz
- subcasos
- indicadores de:
  - activo
  - resuelto
  - bloqueado
  - actualizado
  - en foco

Etiquetas sugeridas:

- `Expedientes`
- `Subcasos`
- `Activo`
- `Resuelto`
- `Bloqueado`
- `Actualizado`

Comportamiento:

- un solo elemento seleccionado a la vez
- expandir/contraer nodos
- scroll vertical
- conservar estado de expansión al volver desde otros módulos

Reglas visuales:

- máximo contraste para el elemento seleccionado
- diferencia clara entre nivel padre e hijo
- no usar iconografía excesiva
- usar indentación, líneas o marcas estructurales simples

### Bloque 3. Ficha principal del expediente

Posición:

- zona central y dominante del monitor principal

Función:

- presentar el expediente seleccionado como foco operativo

Contenido exacto:

1. título del expediente
2. id
3. estado
4. acceso / restricción
5. resumen corto

Etiquetas sugeridas:

- `Expediente seleccionado`
- `Estado`
- `Acceso`
- `Resumen`

Tratamiento visual:

- título grande
- metadata en línea compacta
- resumen con máximo 4 o 5 líneas visibles antes de cortar o expandir

### Bloque 4. Resumen

Posición:

- inmediatamente debajo de la ficha principal

Función:

- lectura rápida del contexto del expediente

Contenido:

- resumen editorial
- texto narrativo operativo breve

Reglas:

- no volcar aquí todo el contenido del expediente
- si el resumen es largo, mostrar un recorte útil
- evitar que empuje el resto de bloques fuera del monitor

Etiquetas sugeridas:

- `Resumen`
- `Situación`

### Bloque 5. Inteligencia

Posición:

- debajo del `Resumen`

Función:

- mostrar información accionable adicional

Contenido:

- bullets de inteligencia
- observaciones operativas
- pistas derivadas del caso

Etiquetas sugeridas:

- `Inteligencia`
- `Observaciones`

Reglas:

- mostrar 3 a 6 entradas como máximo en primera lectura
- el resto puede quedar detrás de un estado expandido futuro

### Bloque 6. Puzle o condición especial

Posición:

- debajo de `Inteligencia`, solo si existe

Función:

- exponer que el caso tiene un componente especial

Contenido:

- tipo de puzle
- configuración breve
- requisito o nota operativa

Etiquetas sugeridas:

- `Puzle`
- `Condición`
- `Requisito`

Regla:

- no diseñarlo como minijuego aquí todavía
- en esta fase solo debe señalarse como parte del expediente

### Bloque 7. Relaciones operativas

Posición:

- panel lateral derecho, zona superior

Función:

- conectar el expediente con el resto del sistema

Contenido:

- ubicaciones vinculadas
- perfiles relacionados
- evidencias asociadas
- herramientas sugeridas

Etiquetas sugeridas:

- `Ubicaciones vinculadas`
- `Perfiles relacionados`
- `Evidencias`
- `Herramientas sugeridas`

Regla:

- cada entrada debe ser directamente accionable
- no más de 2 o 3 por categoría en la vista base

Acciones típicas:

- `Ver en mapa`
- `Ver perfil`
- `Abrir evidencia`
- `Abrir herramienta`

### Bloque 8. Acciones contextuales

Posición:

- panel lateral derecho, zona inferior

Función:

- permitir operar sobre el expediente sin abandonar el contexto

Acciones recomendadas:

- `Fijar como foco`
- `Abrir en mapa`
- `Ver perfiles`
- `Abrir evidencia`
- `Volver a operación`

Regla:

- pocas acciones
- muy claras
- verbos directos

## Estados y variaciones

### Expediente normal

Debe mostrar:

- ficha completa
- resumen
- inteligencia
- relaciones
- acciones contextuales

### Expediente bloqueado

Debe seguir siendo seleccionable si la lógica actual lo permite, pero la ficha debe degradarse.

Mostrar:

- título
- estado de acceso
- razón breve si es visible
- relaciones mínimas solo si proceden

Etiquetas sugeridas:

- `Acceso restringido`
- `Datos protegidos`

No hacer:

- ocultar completamente el expediente si el diseño quiere mostrar su existencia

### Sin expediente seleccionado

Solo debería ocurrir al entrar por primera vez o si la lista está vacía.

Mostrar en el monitor:

- `Selecciona un expediente`
- una ayuda corta

### Sin casos disponibles

Debe existir una degradación limpia.

Mostrar:

- `Sin expedientes disponibles`
- quizá una acción para volver a `Operación actual`

### Expediente resuelto

Debe seguir siendo navegable, pero con tono visual más archivado.

Etiquetas sugeridas:

- `Resuelto`
- `Archivado`

### Expediente con cambios no leídos

Debe notarse en:

- árbol lateral
- quizá cabecera de la ficha

Pero no debe convertir todo el módulo en una pantalla de alertas.

## Comportamiento e interacción

### Al entrar en `Casos`

Debe ocurrir esto:

1. cargar árbol de expedientes
2. recuperar expediente previamente seleccionado si existe
3. si no existe, usar:
   - caso activo
   - o primer expediente relevante
4. renderizar ficha y relaciones

### Al seleccionar un expediente

Debe actualizar:

- ficha principal
- relaciones operativas
- acciones contextuales

Sin:

- animaciones exageradas
- cambio de “pantalla”
- reinicialización total del módulo

### Al pulsar una relación

Casos típicos:

- POI -> abrir `Mapa` con ese POI seleccionado
- perfil -> abrir `Perfiles` con ese perfil seleccionado
- evidencia -> abrir `Herramientas > Evidencias`

Regla crítica:

Debe guardarse una ruta de vuelta coherente al expediente actual.

### Al pulsar `Fijar como foco`

Debe:

- actualizar el caso en foco de la sesión Quest
- idealmente alinear el `Caso activo` persistente con este expediente

### Al volver desde otro módulo

Debe restaurarse:

- el expediente seleccionado
- la posición del árbol
- los nodos expandidos

## Datos necesarios desde API/estado

Para construir `Casos` harán falta como mínimo:

- lista de casos
- jerarquía padre/hijo
- `campaignState.activeCaseId`
- `campaignState.flags`
- visibilidad y gating actuales
- `updatedAt`
- referencias a POIs relacionados
- referencias a perfiles relacionados
- referencias a evidencias o herramientas, si existen o pueden inferirse

Derivados necesarios:

- árbol estructurado
- marcadores de estado
- expediente en foco
- relaciones operativas resumidas

## Reglas de contenido

### Título y metadata

Siempre visibles:

- título
- id
- estado
- acceso

### Resumen

Debe contestar:

- qué es este expediente
- qué está en juego

### Inteligencia

Debe contestar:

- qué sabemos
- qué merece inspección

### Relaciones

Solo mostrar relaciones útiles.

No llenar el panel derecho con:

- etiquetas sin acción
- referencias débiles
- ruido enciclopédico

## Riesgos de diseño a evitar

- que el árbol de expedientes robe más atención que la ficha
- convertir la ficha en una pared de texto
- meter demasiadas relaciones a la vez
- que `Casos` se parezca a un panel administrativo de backoffice
- usar iconografía o color para todo
- romper el contexto al saltar a `Mapa`, `Perfiles` o `Herramientas`

## Criterio de validación visual

El módulo `Casos` estará bien encaminado si:

- el expediente seleccionado domina claramente la pantalla
- el árbol lateral se entiende de un vistazo
- las relaciones del panel derecho son pocas y útiles
- el usuario puede leer el caso y decidir un siguiente paso sin duda
- volver desde otro módulo restaura el contexto exacto

## Especificación detallada de `Mapa`

Esta sección fija el diseño exacto del módulo `Mapa` para la rama `quest`.

Objetivo:

- convertir el sistema cartográfico actual en una consola espacial clara
- mantener compatibilidad con el modelo actual de POIs y coordenadas
- aprovechar VR para lectura espacial, no para reinventar la geografía

## Decisión clave sobre coordenadas y POIs

Sí: el sistema actual de POIs trasladados a coordenadas del mapa debe mantenerse.

No conviene sustituirlo por:

- una ciudad 3D completa
- una navegación libre por Gotham
- una geografía rehecha solo para Quest

La rama `quest` debe reutilizar la misma lógica de posición que la TUI, porque eso permite:

- coherencia entre superficies
- misma API y misma DB
- mismas herramientas editoriales del DM
- misma semántica de POIs
- menor coste de mantenimiento

## Modelo espacial recomendado para coordenadas

### Regla base

Las coordenadas actuales de los POIs deben entenderse como coordenadas en un **plano cartográfico canónico compartido**.

Ese plano puede representarse en:

- TUI: overlay 2D
- Quest: panel cartográfico 3D frontal

La relación lógica debe ser la misma.

### Qué conservar

Conservar:

- `poi.id`
- `poi` como entidad de dominio
- `x`, `y` y `radius` actuales
- jerarquía y metadatos de POI
- hotspots derivados o auxiliares

### Qué cambia en Quest

No cambian las coordenadas semánticas.

Lo que cambia es la proyección visual:

- en vez de pintar el mapa plano en una capa CRT
- se proyecta sobre una superficie del monitor o una mesa cartográfica frontal

### Traducción recomendada

Usar este pipeline conceptual:

1. coordenadas fuente del POI en espacio cartográfico 2D
2. normalización a un sistema común
3. proyección sobre el panel cartográfico VR
4. render de marcadores, radios y etiquetas

## Sistema de coordenadas recomendado

### Opción preferida

Trabajar internamente con coordenadas normalizadas:

- `u` en rango `0..1`
- `v` en rango `0..1`

Y derivarlas desde el sistema actual.

Ventajas:

- desacopla el layout VR del tamaño exacto del asset de mapa
- permite cambiar resolución del panel o proporciones
- mantiene compatibilidad con TUI y editoriales futuras

### Conversión

Si hoy los POIs ya usan coordenadas sobre una imagen concreta:

- conservar el dato original
- derivar `u` y `v` al cargar

Si en el futuro el DM sigue editando con las coordenadas antiguas:

- Quest solo necesita una transformación estable

### Conclusión operativa

Sí: la relación POI/coordenadas debe mantenerse tal cual a nivel lógico.

Quest debe ser otra representación del mismo espacio cartográfico, no otro sistema de localización.

## Idea rectora del módulo `Mapa`

`Mapa` debe sentirse como una **mesa cartográfica operativa**.

No como:

- un minimapa
- una app de mapas convencional
- una sala inmersiva donde “entras” en Gotham

Debe ser:

- frontal
- legible
- estable
- conectada directamente con `Casos`, `Perfiles` y `Rastreo`

## Jerarquía visual

Orden de importancia visual:

1. mapa principal
2. POI seleccionado
3. relaciones del caso activo
4. filtros y modos de enfoque
5. logs o estado secundario

El mapa es protagonista.
El detalle acompaña.

## Distribución espacial

### Monitor principal

Uso:

- superficie cartográfica principal
- selección de POIs
- visualización de radios o áreas de foco

Debe ocupar:

- casi todo el foco visual del módulo

### Panel lateral derecho

Uso:

- ficha de la ubicación seleccionada
- contexto textual breve
- relaciones

### Banda superior o inferior

Uso:

- filtros
- controles de enfoque
- acciones globales del módulo

### HUD persistente

Sigue visible pero discreto:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

## Estructura exacta por bloques

### Bloque 1. Cabecera del módulo

Posición:

- parte superior del monitor principal

Función:

- identificar el módulo y su estado de enfoque

Contenido:

- `Mapa`
- filtro activo, si existe
- estado de enfoque

Etiquetas sugeridas:

- `Mapa`
- `Puntos de interés`
- `Caso en foco`
- `Mostrando todo`
- `Solo caso activo`

### Bloque 2. Superficie cartográfica principal

Posición:

- centro del monitor
- área dominante

Función:

- mostrar Gotham
- permitir seleccionar POIs
- visualizar relaciones espaciales

Contenido:

- base cartográfica
- POIs
- radios o áreas, si procede
- resaltado del caso activo
- resaltado de selección actual

Reglas visuales:

- pocos colores
- jerarquía clara entre:
  - POI normal
  - POI relacionado con caso activo
  - POI seleccionado
  - POI bloqueado

No hacer:

- docenas de etiquetas simultáneas
- demasiadas líneas de conexión
- animaciones permanentes

### Bloque 3. Ficha de ubicación seleccionada

Posición:

- panel lateral derecho, zona superior

Función:

- dar contexto a la selección actual

Contenido:

1. nombre del POI
2. distrito
3. estado/acceso
4. resumen breve
5. notas cortas o imagen, si existen

Etiquetas sugeridas:

- `Ubicación seleccionada`
- `Distrito`
- `Estado`
- `Acceso`
- `Resumen`
- `Notas`

Tratamiento visual:

- texto breve
- muy claro
- una imagen solo si no desplaza demasiado el resto

### Bloque 4. Relaciones operativas

Posición:

- panel lateral derecho, debajo de la ficha principal

Función:

- conectar el POI con el resto del sistema

Contenido:

- expedientes relacionados
- perfiles relacionados
- herramienta relevante, si aplica

Etiquetas sugeridas:

- `Expedientes relacionados`
- `Perfiles relacionados`
- `Herramienta sugerida`

Acciones:

- `Ver expediente`
- `Ver perfil`
- `Abrir rastreo`, si procede

### Bloque 5. Filtros y controles de enfoque

Posición:

- banda superior o inferior del monitor

Función:

- modular la lectura del mapa sin convertirlo en una app compleja

Controles recomendados:

- `Solo caso activo`
- `Mostrar todo`
- `Centrar`
- `Restablecer vista`

Opcionales a futuro:

- `Solo ubicaciones accesibles`
- `Solo cambios recientes`

Regla:

- pocos controles
- muy claros
- no meter un panel de filtros complejo en v1

### Bloque 6. Estado secundario del mapa

Posición:

- muy discreto, quizá en el panel derecho inferior o banda secundaria

Función:

- mostrar información técnica secundaria

Contenido:

- fuente de datos
- número de POIs visibles
- estado de sincronía

Etiquetas sugeridas:

- `Fuente de datos`
- `POIs visibles`
- `Sincronía`

## Estados y variaciones

### Vista normal

Debe mostrar:

- mapa
- varios POIs
- uno seleccionado
- detalle lateral

### Sin POI seleccionado

Mostrar:

- `Selecciona un punto de interés`
- mantener visible el mapa completo

### Modo `Solo caso activo`

Comportamiento:

- reducir el ruido
- resaltar POIs relacionados con el caso activo
- atenuar el resto

Esto será especialmente importante en Quest.

### POI bloqueado

Debe poder representarse sin romper la navegación general.

Mostrar:

- existencia del nodo, si la lógica actual lo permite
- `Acceso restringido` en la ficha

### Sin información geográfica útil

Si un POI no tiene coordenadas válidas:

- no romper el módulo
- seguir mostrándolo como entidad navegable en otras superficies

Quest puede:

- no mostrarlo sobre el plano
- pero sí permitir acceso a su detalle desde otras rutas

## Comportamiento e interacción

### Al entrar en `Mapa`

Debe ocurrir esto:

1. cargar mapa base
2. proyectar todos los POIs válidos
3. aplicar foco del caso activo, si existe
4. restaurar selección anterior si es válida
5. si no hay selección previa:
   - seleccionar POI relacionado principal
   - o ninguno

### Al seleccionar un POI

Debe actualizar:

- resaltado del mapa
- ficha lateral
- relaciones operativas

Sin:

- cambiar de pantalla
- abrir un overlay enorme

### Al pulsar una relación desde el POI

Casos:

- `Ver expediente` -> abrir `Casos` con expediente seleccionado
- `Ver perfil` -> abrir `Perfiles` con perfil seleccionado
- `Abrir rastreo` -> abrir `Herramientas > Rastreo`

### Al volver desde otro módulo

Debe restaurarse:

- el POI seleccionado
- el modo de enfoque
- la vista centrada o restablecida según estado previo

## Datos necesarios desde API/estado

Para construir `Mapa` harán falta:

- lista de POIs
- metadatos geográficos del POI (`x`, `y`, `radius`)
- mapa base
- `campaignState.activeCaseId`
- relaciones POI <-> caso
- relaciones POI <-> perfil
- estado de acceso
- `updatedAt`, si se quieren deltas

Derivados necesarios:

- POIs proyectables
- POIs del caso activo
- POI principal recomendado
- relaciones de la selección actual

## Reglas de contenido

### Ficha lateral

Debe contestar:

- qué lugar es
- por qué importa
- con qué está relacionado

### Mapa

Debe contestar:

- dónde se concentra la investigación
- qué nodo estoy mirando
- cuál es el siguiente salto lógico

## Riesgos de diseño a evitar

- rehacer Gotham como espacio 3D navegable solo para Quest
- romper la compatibilidad con el sistema actual de coordenadas
- meter demasiadas etiquetas simultáneas
- llenar el mapa de conexiones y radios permanentes
- usar el mapa como decorado y no como herramienta

## Criterio de validación visual

El módulo `Mapa` estará bien encaminado si:

- la geografía se entiende de un vistazo
- el POI seleccionado destaca claramente
- el filtro de caso activo reduce ruido de forma útil
- la ficha lateral da contexto sin competir con el mapa
- la relación con `Casos` y `Perfiles` se siente natural

## Especificación detallada de `Perfiles`

Esta sección fija el diseño exacto del módulo `Perfiles` para la rama `quest`.

Objetivo:

- convertir la galería actual de villanos/sospechosos en una consola táctica de perfiles
- permitir lectura rápida de amenaza, estado y relaciones
- enlazar de forma natural con `Casos`, `Mapa` y `Herramientas`

`Perfiles` no debe sentirse como:

- un álbum de personajes
- una pantalla enciclopédica
- una ficha ornamental

Debe sentirse como:

- un panel de inteligencia operativa
- una base de perfiles activos
- un sistema de consulta táctica

## Idea rectora

El módulo `Perfiles` es un **muro táctico de sujetos**.

Su función no es “contar quién es cada uno”, sino responder:

- qué amenaza representa
- qué patrones presenta
- dónde ha aparecido
- con qué expediente se relaciona
- qué siguiente acción conviene ejecutar

## Jerarquía visual

Orden de importancia visual:

1. perfil seleccionado
2. amenaza / estado / resumen
3. patrones y asociados
4. ubicaciones vinculadas
5. acciones contextuales
6. lista lateral de perfiles

La lista lateral sirve para navegación.
La ficha principal debe dominar.

## Distribución espacial

### Panel lateral izquierdo

Uso:

- lista de perfiles
- búsqueda y selección rápida

Debe ser:

- estable
- estrecho
- fácil de recorrer

### Monitor principal

Uso:

- ficha táctica del perfil seleccionado

Debe ser:

- el área dominante del módulo

### Panel lateral derecho

Uso:

- relaciones operativas
- acciones contextuales
- indicadores secundarios

### HUD persistente

Sigue visible pero discreto:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

## Estructura exacta por bloques

### Bloque 1. Cabecera del módulo

Posición:

- parte superior del monitor principal

Función:

- identificar el módulo
- recordar el contexto de consulta

Contenido:

- `Perfiles`
- estado de filtro, si existe
- quizá foco de caso si la navegación viene desde `Casos`

Etiquetas sugeridas:

- `Perfiles`
- `Sospechosos`
- `Caso en foco`
- `Mostrando todo`

Tratamiento visual:

- cabecera contenida
- tono técnico, no dramático

### Bloque 2. Lista de perfiles

Posición:

- panel lateral izquierdo completo

Función:

- navegación y cambio de selección

Contenido:

- alias
- amenaza
- estado
- marcadores de novedad o bloqueo

Etiquetas sugeridas:

- `Sospechosos`
- `Amenaza`
- `Estado`
- `Actualizado`
- `Restringido`

Reglas visuales:

- un solo perfil claramente seleccionado
- diferencia clara entre:
  - perfil normal
  - perfil seleccionado
  - perfil bloqueado
  - perfil muy relevante o en foco

No hacer:

- fichas completas en la lista
- miniaturas grandes
- demasiados chips por fila

### Bloque 3. Ficha principal del perfil

Posición:

- zona central dominante del monitor principal

Función:

- presentar el perfil como entidad táctica

Contenido exacto:

1. alias
2. amenaza
3. estado
4. resumen
5. datos básicos desbloqueados

Etiquetas sugeridas:

- `Perfil seleccionado`
- `Alias`
- `Amenaza`
- `Estado`
- `Resumen`

Tratamiento visual:

- alias grande
- `Amenaza` y `Estado` inmediatamente visibles
- resumen breve, no bloque de lore

### Bloque 4. Datos tácticos

Posición:

- debajo de la ficha principal

Función:

- mostrar atributos útiles sin convertir el monitor en una ficha interminable

Contenido posible:

- nombre real
- especie
- edad
- altura
- peso
- última aparición

Regla:

- solo mostrar lo que esté desbloqueado y aporte lectura táctica
- no intentar enseñar todos los campos a la vez si rompe la legibilidad

Etiquetas sugeridas:

- `Datos tácticos`
- `Última aparición`
- `Datos restringidos`

### Bloque 5. Patrones y asociados

Posición:

- debajo de `Datos tácticos`

Función:

- exponer comportamiento y red conocida

Contenido:

- lista breve de patrones
- lista breve de asociados

Etiquetas sugeridas:

- `Patrones`
- `Asociados`

Regla:

- mostrar de 2 a 5 entradas visibles por bloque
- no convertirlo en texto corrido

### Bloque 6. Ubicaciones vinculadas

Posición:

- parte baja del monitor o parte superior del panel lateral derecho, según densidad

Función:

- relacionar el perfil con el espacio

Contenido:

- POIs vinculados
- distrito
- rol de la vinculación, si existe

Etiquetas sugeridas:

- `Ubicaciones vinculadas`
- `Ver en mapa`

Regla:

- cada ubicación debe ser accionable
- no más de 2 o 3 visibles en la vista base

### Bloque 7. Relaciones operativas

Posición:

- panel lateral derecho, zona superior o media

Función:

- conectar el perfil con el resto del sistema

Contenido:

- expedientes relacionados
- ubicaciones relacionadas
- herramientas sugeridas, si tiene sentido

Etiquetas sugeridas:

- `Expedientes relacionados`
- `Ubicaciones relacionadas`
- `Herramienta sugerida`

Acciones:

- `Ver expediente`
- `Ver en mapa`
- `Abrir herramienta`

### Bloque 8. Acciones contextuales

Posición:

- panel lateral derecho, zona inferior

Función:

- operar sobre el perfil sin ambigüedad

Acciones recomendadas:

- `Ver expediente`
- `Ver en mapa`
- `Volver a operación`

Opcionales a futuro:

- `Marcar como prioridad`
- `Abrir evidencia`

## Estados y variaciones

### Perfil normal

Debe mostrar:

- ficha táctica
- datos tácticos
- patrones
- ubicaciones
- relaciones

### Perfil restringido

Si la lógica actual permite mostrar su existencia pero no todo su contenido:

mostrar:

- alias o identificador si procede
- estado de restricción
- bloques vaciados o velados

Etiquetas sugeridas:

- `Datos restringidos`
- `Acceso protegido`

No hacer:

- sustituir toda la ficha por un error técnico

### Sin perfil seleccionado

Mostrar:

- `Selecciona un perfil`
- ayuda breve

### Sin perfiles disponibles

Mostrar:

- `Sin perfiles disponibles`
- opción de volver a `Operación actual`

### Perfil con cambios no leídos

Debe notarse:

- en la lista lateral
- opcionalmente en la cabecera de la ficha

Sin saturar la vista.

## Comportamiento e interacción

### Al entrar en `Perfiles`

Debe ocurrir esto:

1. cargar lista de perfiles
2. restaurar perfil seleccionado si existe
3. si no existe:
   - usar perfil relacionado con el caso en foco si procede
   - o seleccionar uno por defecto
4. renderizar ficha y relaciones

### Al seleccionar un perfil

Debe actualizar:

- ficha principal
- datos tácticos
- patrones y asociados
- relaciones operativas
- acciones contextuales

Sin:

- cambiar de pantalla
- reiniciar todo el módulo

### Al pulsar `Ver en mapa`

Debe abrir `Mapa` con:

- el POI relacionado seleccionado
- o, si hay varios, el principal

### Al pulsar `Ver expediente`

Debe abrir `Casos` con:

- el expediente relacionado más relevante
- o el que originó el salto, si venimos desde `Casos`

### Al volver desde otros módulos

Debe restaurarse:

- el perfil seleccionado
- la posición de la lista
- el contexto del caso en foco si sigue siendo válido

## Datos necesarios desde API/estado

Para construir `Perfiles` harán falta:

- lista de perfiles
- alias
- amenaza
- estado
- resumen
- atributos desbloqueables por campo
- `updatedAt`
- relaciones perfil <-> POIs
- relaciones perfil <-> casos
- `campaignState.activeCaseId`
- estado de acceso

Derivados necesarios:

- perfil seleccionado
- perfiles relacionados con el caso en foco
- relaciones de POI resumidas
- marcadores de novedad o restricción

## Reglas de contenido

### Resumen

Debe contestar:

- por qué este sujeto importa ahora

### Datos tácticos

Deben contestar:

- qué información práctica tiene el nodo sobre este sujeto

### Patrones

Deben contestar:

- cómo actúa
- qué hábitos o rasgos operativos presenta

### Ubicaciones

Deben contestar:

- dónde aparece
- dónde conviene mirar a continuación

## Riesgos de diseño a evitar

- hacer una “rogues gallery” demasiado estética y poco operativa
- usar retratos o miniaturas como centro de la UX si no aportan función
- convertir la ficha en una enciclopedia
- llenar el panel derecho de relaciones irrelevantes
- hacer que `Perfiles` se sienta desconectado de `Casos` y `Mapa`

## Criterio de validación visual

El módulo `Perfiles` estará bien encaminado si:

- el alias, amenaza y estado se leen al instante
- la ficha principal domina sobre la lista lateral
- los vínculos a `Mapa` y `Casos` son obvios
- los bloques de `Patrones` y `Asociados` son legibles y no parecen texto corrido
- el usuario puede decidir una siguiente acción sin duda

## Especificación detallada de `Herramientas`

Esta sección fija el diseño exacto del módulo `Herramientas` para la rama `quest`.

Objetivo:

- traducir las herramientas ricas de la TUI a modos de trabajo VR
- evitar que cada herramienta se comporte como una mini-app desconectada
- hacer que las herramientas se activen desde contexto operativo y vuelvan a él

## Decisión clave sobre ASCII

En Quest no deben mantenerse modos ASCII.

Motivo:

- el ASCII era coherente con el paradigma CRT/TUI
- en VR introduce ruido visual y degrada legibilidad
- en Quest necesitamos lectura clara, directa y espacial
- la rama `quest` debe operar ya como sistema post-terminal

Implicación:

- `SHOW` no debe tener vista ASCII en Quest
- no hay que portar el “batescaner ASCII” como modo principal ni secundario
- si más adelante se quisiera un filtro forense, debe ser:
  - limpio
  - técnico
  - legible
  - no textualizado ni retro por defecto

## Idea rectora

`Herramientas` es un **hub de modos instrumentales**.

No es una parrilla de iconos ni una sección decorativa.

Debe servir para entrar en modos de operación concretos:

- `Evidencias`
- `Audio`
- `Balística`
- `Comunicaciones`
- `Rastreo`

Regla principal:

- se accede desde contexto
- se trabaja en la herramienta
- se vuelve al caso o lead que originó la acción

## Jerarquía visual

Orden de importancia visual dentro de `Herramientas`:

1. herramienta seleccionada
2. elemento activo dentro de la herramienta
3. operación principal disponible
4. relaciones de vuelta al contexto
5. selector de herramienta

El selector no debe dominar el módulo.
La herramienta activa sí.

## Distribución espacial general

### Panel lateral izquierdo

Uso:

- selector de herramienta
- cambio rápido entre modos

Debe ser:

- estrecho
- estable
- muy legible

### Monitor principal

Uso:

- superficie de trabajo de la herramienta activa

Debe ser:

- dominante
- específica para cada herramienta

### Panel lateral derecho

Uso:

- contexto
- metadata
- acciones de retorno
- controles secundarios

### HUD persistente

Sigue visible pero muy discreto:

- `Caso activo`
- `Alerta`
- `Sincronía`
- `Volver a operación`

## Estructura exacta del módulo `Herramientas`

### Bloque 1. Cabecera del módulo

Posición:

- parte superior del monitor principal

Función:

- identificar la herramienta activa
- recordar el contexto desde el que se abrió

Contenido:

- `Herramientas`
- herramienta activa
- contexto de origen, opcional

Etiquetas sugeridas:

- `Herramientas`
- `Herramienta activa`
- `Origen`

### Bloque 2. Selector de herramienta

Posición:

- panel lateral izquierdo completo

Contenido:

- `Evidencias`
- `Audio`
- `Balística`
- `Comunicaciones`
- `Rastreo`

Reglas visuales:

- una herramienta claramente seleccionada
- no usar iconos complejos como dependencia principal
- texto claro y estable

### Bloque 3. Área de trabajo principal

Posición:

- centro del monitor

Función:

- renderizar la herramienta activa

Cada subherramienta redefine este bloque.

### Bloque 4. Contexto y acciones de retorno

Posición:

- panel lateral derecho

Función:

- decir desde dónde se abrió la herramienta
- ofrecer salida clara
- mostrar metadata útil

Contenido típico:

- caso asociado
- entidad asociada
- evidencia o línea activa
- botón `Volver al caso`
- botón `Volver a operación`

## Subherramienta `Evidencias`

Equivale a `SHOW`.

### Objetivo

- inspeccionar objetos y evidencias 3D de forma limpia y útil

### Regla fundamental

No usar modo ASCII.

La evidencia debe verse:

- con shading limpio
- con materiales legibles
- con posibilidad de escaneo técnico si hace falta

### Distribución

- centro:
  - objeto/evidencia en una bahía de inspección
- lateral derecho:
  - metadata y acciones
- banda inferior:
  - controles primarios

### Contenido

- nombre o id de la evidencia
- descripción breve
- relación con expediente o caso

### Acciones primarias

- `Girar`
- `Acercar`
- `Alejar`
- `Restablecer vista`
- `Modo escaneo`
- `Volver al caso`

### Qué puede significar `Modo escaneo`

No ASCII.

Sí puede significar:

- realce de contornos
- cortes de iluminación
- realce de superficies o daños
- material forense limpio

### Riesgos a evitar

- sliders o controles heredados del visor TUI
- demasiados controles simultáneos
- overlay textual grande encima del objeto

## Subherramienta `Audio`

Equivale a `AUDIO`.

### Objetivo

- estación de escucha forense clara y directa

### Distribución

- monitor principal:
  - forma de onda
- panel lateral derecho:
  - pista actual y estado
- banda inferior:
  - transporte

### Contenido

- `Pista actual`
- duración
- estado de reproducción
- si está bloqueado, estado de acceso

### Acciones primarias

- `Reproducir`
- `Pausar`
- `Adelantar`
- `Retroceder`
- `Volumen`
- `Desbloquear`
- `Volver al caso`

### Reglas visuales

- nada de look retro-CRT como base
- sí aspecto instrumental y técnico
- waveform clara y contrastada

### Riesgos a evitar

- demasiada animación
- demasiada información textual
- controles pequeños difíciles de acertar en visor

## Subherramienta `Balística`

Equivale a `BALLISTICA`.

### Objetivo

- comparar dos muestras con claridad

### Distribución

- lado izquierdo:
  - `Muestra A`
- lado derecho:
  - `Muestra B`
- centro o parte inferior:
  - `Coincidencia`
  - lectura de resultado

### Contenido

- selector de muestra
- vista resumida de cada muestra
- resultado principal

### Acciones primarias

- `Seleccionar muestra A`
- `Seleccionar muestra B`
- `Comparar`
- `Volver al caso`

### Reglas visuales

- la comparación debe leerse de un vistazo
- no meter demasiados parámetros técnicos en v1

### Riesgos a evitar

- pantalla demasiado abstracta
- exceso de UI técnica sin prioridad visual

## Subherramienta `Comunicaciones`

Equivale a `DIAL`.

### Objetivo

- operar líneas telefónicas o registros asociados

### Distribución

- panel lateral izquierdo:
  - líneas disponibles
- monitor principal:
  - actividad de línea
- panel lateral derecho:
  - estado y controles

### Contenido

- línea seleccionada
- estado de llamada o reproducción
- actividad visual simple

### Acciones primarias

- `Seleccionar línea`
- `Reproducir`
- `Colgar`
- `Volver al caso`

### Reglas visuales

- consola sobria
- muy poco texto
- una única línea activa claramente visible

### Riesgos a evitar

- interfaz tipo teléfono decorativo
- estetización excesiva de comunicaciones

## Subherramienta `Rastreo`

Equivale a `TRACER`.

### Objetivo

- ofrecer una consola de seguimiento en vivo con progresión clara

### Distribución

- monitor principal:
  - mapa de rastreo
  - radio/fase actual
- panel lateral derecho:
  - objetivo, fase y registro
- banda inferior:
  - estado operativo

### Contenido

- número o objetivo
- fase actual
- registro corto
- resultado final cuando aparezca

### Fases user-facing sugeridas

- `Búsqueda amplia`
- `Reducción de área`
- `Triangulación`
- `Ubicación exacta`

### Acciones primarias

- `Iniciar rastreo`
- `Cancelar`
- `Volver al caso`

### Reglas visuales

- el drama está en la reducción del área
- no en recargar el mapa con VFX

### Riesgos a evitar

- exceso de líneas, anillos y parpadeos
- log demasiado largo
- ocupar toda la experiencia con el rastreo si el caso no lo justifica

## Estados y variaciones generales

### Entrada directa desde contexto

Si una herramienta se abre desde:

- `Casos`
- `Mapa`
- `Perfiles`
- `Operación actual`

debe traer precargado su objetivo.

Ejemplos:

- abrir evidencia desde un caso -> `Evidencias` ya carga esa pieza
- abrir rastreo desde un lead -> `Rastreo` ya carga ese objetivo

### Sin elemento activo

Cada herramienta debe degradar bien:

- `Selecciona una evidencia`
- `Selecciona una pista`
- `Selecciona una muestra`
- `Selecciona una línea`

### Elemento restringido

No romper la herramienta.

Mostrar:

- `Acceso restringido`
- `Datos protegidos`

### API caída / fallback

Permitir operación parcial si hay datos locales.

Mostrar una marca breve:

- `Datos locales activos`

## Comportamiento e interacción

### Al entrar en `Herramientas`

Debe ocurrir esto:

1. abrir la herramienta más relevante según contexto
2. si no hay contexto, abrir la última herramienta usada o `Evidencias`
3. cargar objetivo asociado si existe
4. mostrar siempre salida clara al caso o a `Operación actual`

### Al cambiar de herramienta

Debe mantenerse:

- contexto general de sesión
- caso activo
- ruta de retorno

No tiene por qué mantenerse:

- el objetivo específico de otra herramienta, salvo que tenga sentido

### Al salir de una herramienta

Prioridad de retorno:

1. volver al expediente o lead de origen
2. si no existe, volver a `Operación actual`

## Datos necesarios desde API/estado

### Evidencias

- lista de evidencias
- path o referencia del modelo
- metadata
- relación con expediente/caso

### Audio

- lista de pistas
- estado de bloqueo
- metadata
- relación con caso o evidencia

### Balística

- lista de muestras
- assets de comparación
- metadata

### Comunicaciones

- líneas telefónicas
- audio vinculado
- estado de llamada/uso

### Rastreo

- configuración tracer
- objetivo
- fase
- estado de operador DM si aplica

## Riesgos de diseño a evitar

- portar literalmente visores y overlays de la TUI
- mantener ASCII por nostalgia del paradigma anterior
- hacer herramientas visualmente inconexas entre sí
- olvidar la ruta de retorno al contexto operativo
- meter demasiados controles finos desde el primer prototipo

## Criterio de validación visual

El módulo `Herramientas` estará bien encaminado si:

- cambiar entre herramientas es claro y rápido
- cada herramienta se entiende por su layout y no por un texto explicativo largo
- ninguna depende de estéticas CRT o ASCII para funcionar
- siempre está claro cómo volver al caso o a `Operación actual`

## Referencias de código usadas

- [public/utils/screens.js](C:/Repos/gcpd/public/utils/screens.js)
- [public/utils/remoteOs.js](C:/Repos/gcpd/public/utils/remoteOs.js)
- [public/commands/help.js](C:/Repos/gcpd/public/commands/help.js)
- [public/commands/cases.js](C:/Repos/gcpd/public/commands/cases.js)
- [public/commands/case.js](C:/Repos/gcpd/public/commands/case.js)
- [public/commands/map.js](C:/Repos/gcpd/public/commands/map.js)
- [public/commands/villains.js](C:/Repos/gcpd/public/commands/villains.js)
- [public/commands/show.js](C:/Repos/gcpd/public/commands/show.js)
- [public/commands/audio.js](C:/Repos/gcpd/public/commands/audio.js)
- [public/commands/ballistica.js](C:/Repos/gcpd/public/commands/ballistica.js)
- [public/commands/dial.js](C:/Repos/gcpd/public/commands/dial.js)
- [public/commands/tracer.js](C:/Repos/gcpd/public/commands/tracer.js)
- [public/commands/status.js](C:/Repos/gcpd/public/commands/status.js)
- [public/commands/summary.js](C:/Repos/gcpd/public/commands/summary.js)
- [public/commands/flags.js](C:/Repos/gcpd/public/commands/flags.js)
- [public/commands/last.js](C:/Repos/gcpd/public/commands/last.js)
- [docs/current-functional-map.md](C:/Repos/gcpd/docs/current-functional-map.md)
