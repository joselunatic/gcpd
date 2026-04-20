# Guía operativa del DM

Esta página resume **cómo usar el panel del DM** sin tener que leer el código ni deducir la intención de cada bloque.

## Qué es cada vista

### Casos

Centro editorial y operativo del contenido principal.

- Crear y editar casos.
- Organizar jerarquía con `parentId`.
- Definir `summary`, `brief`, `intel`, `puzzle` y metadatos.
- Asociar `locationRefs` para que el caso tenga contexto de POIs y mapa.
- Configurar reglas de visibilidad y desbloqueo.

Úsalo cuando quieras decidir **qué ve el agente**, **cuándo lo ve** y **desde dónde puede navegar**.

### POIs

Catálogo de lugares o personas de interés.

- Crear fichas de localización.
- Mantener distrito, estado y resumen.
- Ajustar coordenadas para el mapa.
- Enlazar después desde casos, tracer o villanos.

Si un caso necesita contexto espacial, primero asegúrate de que sus POIs estén bien definidos aquí.

### Villanos

Fichas de antagonistas y personajes sensibles.

- Editar perfil público y datos extendidos.
- Definir relaciones narrativas.
- Controlar accesos por entidad y por atributo.

Piensa esta vista como el sitio donde decides **qué identidad revelas** y **qué información se mantiene oculta**.

### Evidencias

Repositorio de piezas consultables por el agente.

- Mantener listados y descripciones.
- Preparar materiales que luego pueden aparecer vinculados a casos o flujos narrativos.

### Tracer

Editor del mapa táctico y sus líneas/hotspots.

- Crear hotspots ligados a POIs.
- Colocar líneas o recorridos.
- Ajustar la lectura visual del mapa para el agente.

Úsalo cuando el mapa necesite más que simples POIs: rutas, focos o trazas de investigación.

### Accesos

Matriz avanzada para controlar visibilidad y desbloqueo.

- Revisar entidades bloqueadas o visibles.
- Ajustar reglas de acceso sin tener que editar cada ficha una por una.
- Afinar accesos por atributo, sobre todo en villanos.

### Campaña

Estado global compartido con la experiencia del agente.

- Gestionar flags globales.
- Ajustar alerta, caso activo y otros metadatos operativos.
- Sincronizar la lógica de desbloqueos con el estado vivo de la campaña.

## Flujo recomendado

1. Crea o revisa los POIs necesarios.
2. Define el caso y enlaza sus `locationRefs`.
3. Ajusta accesos y visibilidad del caso.
4. Si el caso depende de un villano o de atributos sensibles, revísalo en `Villanos` o `Accesos`.
5. Si hay soporte espacial, completa `Tracer`.
6. Publica el estado global en `Campaña` para que la TUI del agente quede alineada.

## Cómo pensar el sistema de accesos

Hay dos capas:

- **Entidad completa**: el caso, POI o villano entero puede estar `hidden`, `listed` o accesible.
- **Atributo**: algunos campos concretos pueden revelarse después, sin abrir toda la ficha.

Las reglas actuales pueden depender de:

- contraseña
- prerequisitos encadenados
- flags de campaña
- modos especiales como `puzzle`

Regla práctica: si quieres ocultar la existencia de algo, usa visibilidad. Si quieres mostrar la ficha pero reservar parte del contenido, usa bloqueo por atributo.

## Qué conviene mantener consistente

- `summary`: una sola idea clara y reutilizable.
- `status`: vocabulario estable entre entidades.
- `locationRefs`: IDs reales de POIs existentes.
- `unlockConditions`: criterio de acceso explícito y mantenible.
- `dm`: notas internas breves; no metas aquí estructura que luego necesites renderizar.

## Problemas típicos

### Un caso no aparece al agente

Revisa:

- visibilidad
- prerequisitos
- flags requeridas
- si realmente quedó guardado en campaña o acceso

### Un caso abre mapa sin contexto

Revisa:

- `locationRefs`
- que los POIs existan
- que el POI tenga coordenadas válidas

### Un villano muestra demasiado

Revisa:

- acceso de entidad
- acceso por atributo
- campos sensibles que se estén rellenando en el bloque equivocado

## Atajo mental útil

Piensa el DM así:

- `Casos` decide la narrativa operativa.
- `POIs` decide el anclaje espacial.
- `Villanos` decide la exposición de personajes.
- `Accesos` y `Campaña` deciden el ritmo de revelación.
- `Tracer` decide la representación táctica.
