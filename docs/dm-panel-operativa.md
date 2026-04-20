# Manual del panel DM

Esta guía explica el panel del DM como herramienta de trabajo para dirigir la experiencia de los agentes.

Está escrita desde el punto de vista de uso: qué hace cada zona, cuándo conviene usarla y cómo afecta a lo que verá el agente durante la partida o la sesión.

Las capturas corresponden al estado real de la app. No se han creado datos nuevos para documentarla.

## Índice rápido

- [Qué es este panel](#que-es-este-panel)
- [Navegación principal](#navegacion-principal)
- [Seguridad y sesión](#seguridad-y-sesion)
- [Casos](#casos)
- [POIs](#pois)
- [Villanos](#villanos)
- [Evidencias](#evidencias)
- [Tracer](#tracer)
- [Accesos](#accesos)
- [Campaña](#campana)
- [Orden de trabajo recomendado](#orden-de-trabajo-recomendado)

## Qué es este panel

El panel del DM es el lugar desde el que preparas, ajustas y sincronizas la información que luego consumen los agentes.

Aquí decides:

- qué casos existen
- qué lugares y personas importan
- qué villanos están definidos
- qué pruebas o materiales se pueden consultar
- qué trazas o líneas telefónicas están operativas
- qué información está visible, bloqueada o todavía no debe aparecer
- qué estado general tiene la campaña

![Vista general del panel DM](/docs-screenshots/dm/00-overview.png)

### Idea clave

Este panel no está pensado para “hacer de agente”, sino para preparar y controlar lo que el agente puede descubrir.

> Recomendación: trabaja aquí para editar y sincronizar, y usa la interfaz de agente solo para comprobar cómo queda el resultado final.

## Navegación principal

La banda superior del panel te mueve entre las áreas principales de trabajo.

![Vista general del panel DM](/docs-screenshots/dm/00-overview.png)

### Qué hace cada acceso

- `Casos`: organiza la investigación principal.
- `POIs`: gestiona lugares y personas de interés.
- `Villanos`: mantiene los perfiles de antagonistas.
- `Evidencias`: reúne piezas consultables como modelos, balística, audio o líneas telefónicas.
- `Tracer`: controla hotspots y trazas.
- `Accesos`: regula qué partes de los villanos están visibles o bloqueadas.
- `Campaña`: ajusta flags, caso activo y desbloqueos globales.
- `Ayuda`: abre esta documentación.

### Cómo usar esta navegación

No hace falta seguir siempre el mismo orden, pero suele funcionar bien pensarla así:

- primero preparas contenido
- después controlas qué parte de ese contenido está disponible
- al final sincronizas el estado general de campaña

## Seguridad y sesión

La parte superior también te recuerda que el panel está desbloqueado y durante cuánto tiempo seguirá abierta la sesión.

![Cuenta y seguridad](/docs-screenshots/dm/08-security.png)

### Qué puedes hacer aquí

- abrir la ayuda
- desplegar el bloque de seguridad
- cerrar sesión
- cambiar la contraseña del panel

### Cuándo conviene tocar esta zona

- al iniciar una sesión importante
- si compartes equipo o espacio de trabajo
- si necesitas renovar contraseña antes de pasar el control a otra persona

> Esta parte es puramente administrativa. No afecta al contenido narrativo, pero sí al control de acceso al panel.

## Casos

`Casos` es el corazón editorial del panel. Aquí defines la estructura de la investigación y el texto principal que luego verá el agente.

![Sección de casos](/docs-screenshots/dm/01-cases.png)

### Qué ves

- una lista de casos a la izquierda
- la ficha de edición en el centro
- una vista previa del lado agente a la derecha

### Para qué sirve

Usa esta pantalla para:

- crear un caso nuevo
- convertirlo en caso raíz o subcaso
- asociarlo a un lugar principal
- relacionarlo con otros lugares
- redactar el resumen que verá el agente
- guardar un texto más amplio para uso interno del DM

### Qué significa cada parte

#### Listado de casos

Es tu índice de trabajo.

- te deja moverte entre casos existentes
- muestra también subcasos
- sirve para mantener una investigación con estructura y no solo una lista plana

#### Botones principales

- `Guardar`: guarda los cambios del caso actual
- `Avanzado`: abre opciones más delicadas, como disponibilidad o estado interno
- `Vista`: enseña u oculta la vista previa del lado agente
- `Nuevo caso`: crea una ficha nueva independiente
- `Nuevo subcaso`: crea una ficha hija del caso seleccionado
- `Limpiar`: vacía la selección actual y el formulario

#### Tipo de nodo

Te permite decidir si estás creando:

- un caso principal
- un subcaso dependiente de otro

#### POI principal

Es el lugar o punto de interés que ancla el caso.

Si un caso necesita ubicación clara, aquí es donde debe quedar fijada.

#### POIs relacionados

Sirven para ampliar el contexto del caso:

- escena relacionada
- análisis
- último avistamiento
- refugio
- otros puntos conectados

#### Título

Es el nombre operativo del caso.

Debe ser claro y reconocible, no críptico.

#### Resumen

Es la parte más importante de cara al agente.

Piensa este bloque como la versión breve y pública del caso.

#### Brief

Es el bloque amplio para trabajo interno o contexto más desarrollado.

No hace falta usarlo siempre, pero es útil cuando el caso necesita más cuerpo que el resumen corto.

### Vista previa del agente

La caja de la derecha te permite comprobar rápidamente cómo se presentará el caso sin salir del panel.

Úsala para validar:

- si el título se entiende
- si el resumen tiene la longitud adecuada
- si el tono del caso encaja con lo que quieres revelar

### Flujo recomendado en Casos

1. Crea el caso o subcaso.
2. Asigna el POI principal.
3. Añade POIs relacionados solo si aportan.
4. Escribe un resumen claro para el agente.
5. Añade brief solo si el caso necesita más desarrollo.
6. Revisa la vista previa.
7. Abre `Avanzado` únicamente al final.

> Regla práctica: si el agente no va a entender el caso con solo leer el resumen, el problema casi siempre está en la redacción del resumen, no en la interfaz.

### Cómo afecta a la experiencia del agente

Lo que decidas aquí define:

- el árbol de casos y subcasos
- la presentación de cada expediente
- la relación entre caso y mapa
- el contexto que el agente puede leer antes de profundizar

## POIs

`POIs` reúne los lugares y personas de interés que sostienen el mapa y el contexto espacial de la campaña.

![Sección de POIs](/docs-screenshots/dm/02-pois.png)

### Para qué sirve

Usa esta pantalla para crear y mantener puntos de interés que luego enlazarás desde:

- casos
- villanos
- tracer

### Qué ves

- un selector de POIs
- un área de edición
- una vista previa del lado agente
- bloques organizados por partes

### Qué significa cada parte

#### Identidad

Aquí defines lo esencial del POI:

- ID
- nombre
- distrito
- estado

#### Información pública

Aquí redactas lo que verá el agente sobre ese lugar o persona.

Si el POI tiene que ser rápido de leer, este resumen debe ser breve y claro.

#### Mapa / Hotspot

Aquí sitúas el POI en el mapa y le das contexto visual.

Es la parte que hace que el resto del sistema pueda “encontrarlo” como lugar real dentro de Gotham.

### Botones principales

- `Nuevo`: crea un POI vacío
- `Vista`: enseña u oculta la vista previa
- `Avanzado`: abre información adicional
- `Guardar`: guarda la ficha
- `Limpiar`: vacía la selección

### Flujo recomendado en POIs

1. Define nombre, distrito y estado.
2. Redacta el resumen visible para el agente.
3. Sitúa el POI en mapa.
4. Guarda.
5. Después vuelve a Casos, Villanos o Tracer para enlazarlo donde haga falta.

> Si algo “no sale en mapa” o un caso parece no tener localización, el problema suele empezar aquí.

### Cómo afecta a la experiencia del agente

Los POIs son la base de:

- la vista de mapa
- la ubicación de los casos
- la red de localizaciones de villanos
- los hotspots de tracer

## Villanos

`Villanos` sirve para mantener perfiles de antagonistas y personajes sensibles.

![Sección de villanos](/docs-screenshots/dm/03-villains.png)

### Para qué sirve

Usa esta pantalla para:

- crear o revisar una ficha de villano
- definir su alias y descripción básica
- preparar el contenido que el agente podría llegar a consultar

### Qué ves

- listado de villanos
- zona de edición
- vista previa del lado agente
- bloques por secciones

### Qué significa cada parte

#### Identidad

Aquí va la base de la ficha:

- identificador
- alias

#### Agent-facing Summary

Es la descripción breve pensada para el agente.

Debe decir lo justo para situar al personaje sin quemar información demasiado pronto.

#### Detalles de perfil

Aquí puedes ampliar la ficha con rasgos y datos adicionales.

### Botones principales

- `Guardar`
- `Avanzado`
- `Vista`
- `Nuevo`
- `Limpiar`

### Flujo recomendado en Villanos

1. Define alias e identidad básica.
2. Escribe el resumen visible.
3. Añade detalles solo si realmente se van a usar.
4. Revisa la vista previa.
5. Si necesitas ocultar campos concretos, resuélvelo después en `Accesos`.

> Esta pantalla define el contenido. `Accesos` define el ritmo al que ese contenido se revela.

### Cómo afecta a la experiencia del agente

Aquí decides cómo se presenta el villano cuando el agente lo consulte:

- qué nombre verá
- qué resumen tendrá
- qué nivel de exposición narrativa tendrá su ficha

## Evidencias

`Evidencias` agrupa cuatro tipos de material distintos. No es una sola pantalla, sino un bloque de trabajo para pruebas y soportes consultables.

![Evidencias · STL](/docs-screenshots/dm/04-evidence.png)

### Submenús de Evidencias

- `STL`
- `Balistica`
- `Audio`
- `Telefonos`

Cada submenú resuelve una clase de recurso distinta.

## Evidencias · STL

Esta subvista sirve para cargar modelos 3D o piezas que luego el agente puede abrir como objeto consultable.

![Evidencias · STL](/docs-screenshots/dm/04-evidence.png)

### Qué puedes hacer

- crear una entrada nueva
- subir un archivo STL
- dar una etiqueta legible
- decidir con qué nombre se invocará
- revisar una vista previa en ASCII

### Cuándo conviene usarla

Cuando quieres que el agente pueda abrir una pieza como artefacto visual o técnico.

## Evidencias · Balística

Esta subvista sirve para preparar pruebas balísticas con su imagen y contexto de caso.

![Evidencias · Balística](/docs-screenshots/dm/09-evidence-ballistics.png)

### Qué puedes hacer

- subir o seleccionar un PNG
- vincularlo a un caso
- relacionarlo con un POI
- anotar crimen, estado y responsable de cierre
- revisar la previsualización partida

### Cuándo conviene usarla

Cuando la prueba no es solo “una imagen”, sino una pieza forense que debe quedar asociada a un caso concreto.

## Evidencias · Audio

Esta subvista sirve para gestionar audios que el agente puede escuchar.

![Evidencias · Audio](/docs-screenshots/dm/10-evidence-audio.png)

### Qué puedes hacer

- subir un MP3
- darle título
- decidir si se mantiene libre o cifrado
- guardar la versión normal y, si hace falta, una versión alterada

### Cuándo conviene usarla

Cuando una pista tiene que entrar por escucha, no por lectura.

## Evidencias · Teléfonos

Esta subvista sirve para definir líneas telefónicas asociadas a audio.

![Evidencias · Teléfonos](/docs-screenshots/dm/11-evidence-phones.png)

### Qué puedes hacer

- crear una línea
- definir número y etiqueta interna
- asociarla a un audio
- marcar si se puede volver a llamar
- controlar su estado de uso

### Cuándo conviene usarla

Cuando quieres que el teléfono sea una interfaz viva y no solo una entrada estática.

### Flujo recomendado en Evidencias

1. Decide qué tipo de prueba necesitas.
2. Carga primero el material base.
3. Después añade contexto narrativo o de caso.
4. Revisa si debe estar disponible ya o quedar para más tarde.

> No mezcles finalidades. Un objeto 3D, una prueba balística, un audio y una línea telefónica son herramientas distintas aunque vivan bajo la misma pestaña.

### Cómo afecta a la experiencia del agente

Este bloque decide qué materiales especiales puede consultar el agente y en qué formato los percibe.

## Tracer

`Tracer` es la mesa táctica de trazas y hotspots.

![Sección Tracer](/docs-screenshots/dm/05-tracer.png)

### Para qué sirve

Usa esta pantalla cuando quieras convertir una pista en una traza operativa:

- un hotspot visible para agentes
- una línea interna con la que trabajar como DM

### Qué ves

- una cabecera con recuento de líneas y hotspots
- botones `Nueva linea` y `Nuevo hotspot`
- un área para el hotspot visible
- un área para la línea asociada

### Qué significa cada bloque

#### Hotspot

Es la parte que el agente puede llegar a resolver o localizar.

Aquí defines:

- identificador del hotspot
- nombre visible
- POI base
- posición sobre el mapa

#### Línea asociada

Es la parte operativa del DM.

Aquí defines:

- número o identificador de línea
- etiqueta interna
- hotspot al que apunta
- si la línea está activa o no

### Flujo recomendado en Tracer

1. Revisa o crea el POI base.
2. Crea el hotspot y guárdalo.
3. Después crea la línea asociada.
4. Actívala solo cuando deba estar disponible.

> Piensa el hotspot como la “cara visible” y la línea como la “capa de control”.

### Cómo afecta a la experiencia del agente

Tracer determina cómo se presentan las trazas, cómo se conectan con el mapa y cómo se coordina la operativa con el panel de teléfono.

## Accesos

`Accesos` te permite modular cuánto sabe el agente sobre un villano sin tener que ocultar toda la ficha.

![Sección Accesos](/docs-screenshots/dm/06-access.png)

### Para qué sirve

Usa esta pantalla cuando quieras decidir:

- qué campos existen pero no deben verse
- qué campos pueden verse pero siguen bloqueados
- qué partes ya están liberadas en el estado actual

### Qué ves

- un selector de villano
- una matriz de atributos
- controles para guardar o recargar

### Cómo leer la matriz

- `Locked`: ese dato sigue reservado
- `Visible`: ese dato puede aparecer como parte de la ficha
- `Runtime`: ese dato ya está liberado ahora mismo
- `Frase`: texto o clave de revelación
- `Token`: secreto asociado si quieres control más estricto

### Flujo recomendado en Accesos

1. Elige el villano.
2. Decide qué datos no deben existir todavía a ojos del agente.
3. Decide qué datos sí pueden existir pero seguir bloqueados.
4. Ajusta el estado actual solo cuando la campaña ya haya avanzado.

> Oculto y bloqueado no son lo mismo. Oculto significa “todavía no existe para el agente”. Bloqueado significa “existe, pero aún no puede leerlo”.

### Cómo afecta a la experiencia del agente

Aquí decides el ritmo de revelación de cada villano sin tener que reescribir su ficha.

## Campaña

`Campaña` es la sala de control del estado general.

![Sección Campaña](/docs-screenshots/dm/07-campaign.png)

### Para qué sirve

Usa esta pantalla para sincronizar el contexto vivo de la sesión:

- flags globales
- nivel de alerta
- caso activo
- desbloqueos persistentes
- respuestas o comandos generales

### Qué significa cada bloque

#### Flags globales

Son marcas de estado generales que afectan al comportamiento de la experiencia.

#### Contexto operativo

Sirve para fijar el tono actual de la campaña y señalar qué caso es el foco principal.

#### Desbloqueos

Te deja mantener qué casos, POIs o villanos ya están abiertos de forma persistente.

#### Comandos globales

Sirve para ajustar respuestas generales del terminal cuando necesitas comportamiento más transversal.

### Flujo recomendado en Campaña

1. Actualiza flags globales.
2. Marca el caso activo.
3. Revisa desbloqueos.
4. Toca comandos globales solo si realmente necesitas cambiar la respuesta general del sistema.

> Si algo parece incoherente en la experiencia del agente, esta suele ser la primera pantalla que conviene revisar.

### Cómo afecta a la experiencia del agente

Esta vista define el marco general de lectura del sistema:

- cuál es el caso vivo
- qué tono tiene la situación
- qué contenido ya debe estar abierto

## Orden de trabajo recomendado

Si tienes que preparar una sesión desde cero o revisar una ya empezada, este orden suele ser el más limpio:

1. `POIs`
2. `Casos`
3. `Villanos`
4. `Evidencias`
5. `Tracer`
6. `Accesos`
7. `Campaña`

### Por qué este orden

- primero fijas lugares y personas
- luego montas la investigación
- después completas antagonistas y pruebas
- al final regulas visibilidad y sincronizas el estado vivo

## Nota final

Este panel funciona mejor cuando se usa con una lógica clara:

- `Casos` organiza la investigación
- `POIs` ancla la geografía
- `Villanos` sostiene a los antagonistas
- `Evidencias` aporta materiales consultables
- `Tracer` da capa táctica
- `Accesos` regula el ritmo de revelación
- `Campaña` sincroniza el estado general
