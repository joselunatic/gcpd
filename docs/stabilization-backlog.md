# Backlog De Estabilizacion Y Evolucion

Fecha de revision: 2026-04-20

Este backlog parte del estado real documentado en:

- [docs/current-functional-map.md](C:/Repos/gcpd/docs/current-functional-map.md)
- [docs/repo-current-state.md](C:/Repos/gcpd/docs/repo-current-state.md)

Su objetivo es separar con claridad:

1. Lo que ya funciona y conviene preservar.
2. Lo que es deuda o punto fragil.
3. Lo que conviene desarrollar a continuacion.

## 1. Ya Funciona

### Plataforma base

- `npm run lint` pasa.
- `npm run build` pasa.
- El routing principal ya es consistente para `/`, `/dm`, `/phone` y `/docs`.
- El backend Express responde con la API principal y soporte de WebSocket para `TRACER`.

### Flujo jugador

- Boot CRT y shell principal.
- Dialer inicial con lineas diegeticas.
- Acceso a `BROTHER-MK0`.
- Acceso a `REMOTE OS`.
- Navegacion base:
  - `HELP`
  - `CASES`
  - `MAP`
  - `VILLAINS`
- Herramientas especiales:
  - `SHOW`
  - `AUDIO`
  - `DIAL`
  - `BALLISTICA`
  - `TRACER`

### Flujo DM

- Login por password.
- Sesion persistida.
- Cambio de contraseña.
- CRUD de:
  - casos
  - POIs
  - villanos
- Gestion de:
  - campaña
  - accesos
  - evidencias STL
  - balística
  - audios
  - lineas telefonicas
  - hotspots y lineas de `TRACER`

### Operacion especial

- `/phone` como puente movil de operador para `TRACER`.
- `/docs` como superficie ligera de documentacion embebida.

## 2. Deuda Y Puntos Fragiles

### P0. Riesgo alto aunque hoy no bloquea

- [server/index.js](C:/Repos/gcpd/server/index.js) concentra demasiada logica:
  - auth
  - settings
  - uploads
  - seeding
  - campaign state
  - tracer websocket
  - CRUD narrativo

- [src/components/DmPanel.jsx](C:/Repos/gcpd/src/components/DmPanel.jsx) sigue siendo demasiado grande y mezcla:
  - datos
  - validacion
  - rendering
  - preview 3D
  - media management
  - tracer config

- [public/utils/screens.js](C:/Repos/gcpd/public/utils/screens.js) sigue siendo un nucleo critico con mucho estado imperativo y dependencias globales.

### P1. Deuda funcional / UX

- El dialer tiene mucho lore, pero el flujo funcional sigue poco explicitado para jugador nuevo.
- `BROTHER-MK0` y `REMOTE OS` conviven, pero su diferencia narrativa no esta explicada dentro de la experiencia.
- `/docs` hoy muestra solo esquema DM y no sirve todavia como centro real de documentacion del sistema.
- Hay comandos potentes (`SHOW`, `TRACER`, `BALLISTICA`, `AUDIO`) pero su descubribilidad sigue dependiendo de `HELP` o de memoria previa.

### P1. Deuda tecnica

- Import mixto estatico/dinamico de `AssetManager` genera warning de chunk en build.
- El bundle de `three` es pesado.
- Hay mucho estado repartido entre:
  - React
  - DOM imperativo
  - `localStorage`
  - `sessionStorage`
  - eventos globales
- No hay test suite automatica detectada.
- No hay CI detectado.

### P2. Deuda documental

- Parte de la documentacion ya esta alineada, pero sigue faltando una capa de producto:
  - flujo para jugador
  - flujo operativo para DM
  - criterios de uso de cada comando
  - convenciones de contenido para campaña

## 3. Siguiente Mejora Recomendada

### Fase A. Estabilizacion funcional

Objetivo: convertir el repo en una base fiable para iterar features.

1. Hacer smoke tests manuales guiados del flujo completo:
   - dialer
   - login `BROTHER-MK0`
   - `REMOTE OS`
   - `MAP`
   - `CASES`
   - `VILLAINS`
   - `SHOW`
   - `AUDIO`
   - `DIAL`
   - `TRACER`
   - `/dm`
   - `/phone`

2. Registrar bugs reproducibles con este formato:
   - superficie
   - pasos
   - resultado esperado
   - resultado actual
   - severidad

3. Corregir primero bugs de flujo, no refactors amplios.

### Fase B. Claridad de producto

Objetivo: que el sistema se entienda sin depender de memoria histórica.

1. Reforzar el onboarding diegetico:
   - explicar desde la propia UI que es `BROTHER-MK0`
   - explicar que es `REMOTE OS`
   - explicar que `TRACER` requiere operador

2. Mejorar la discoveribilidad:
   - `HELP` mas orientado a casos de uso
   - pantallas introductorias mas claras
   - feedback mas explicito cuando un comando depende de configuracion DM

3. Convertir `/docs` en un centro util:
   - overview del sistema
   - comandos
   - esquema de datos
   - guia rapida de DM

### Fase C. Hardening tecnico

Objetivo: bajar el coste de cambio.

1. Extraer modulos del backend:
   - auth
   - campaign
   - content
   - media
   - tracer

2. Seguir partiendo `DmPanel` por dominios:
   - auth/session
   - campaign/access
   - evidence/media
   - tracer

3. Introducir verificacion automatica minima:
   - smoke test de API
   - smoke test de build
   - smoke test de rutas principales

### Fase D. Nuevas features

Solo despues de A y B.

Las mejores candidatas son:

- ampliar `TRACER` con feedback narrativo por fases
- integrar `DIAL` y `TRACER` en una capa comun de telefonia diegetica
- enriquecer `SHOW` con mas evidencias y presets
- mejorar el panel DM para preparar escenas sin tocar JSON a mano

## 4. Priorizacion Recomendada

### Prioridad inmediata

1. Validacion funcional completa y lista de bugs reales.
2. Aclarar UX del flujo `dialer -> BROTHER-MK0 / REMOTE OS`.
3. Documentacion operativa minima en `/docs`.

### Prioridad siguiente

1. Refactor limitado del backend por dominios.
2. Partir mas `DmPanel`.
3. Añadir verificacion automatica minima.

### Prioridad posterior

1. Nuevas features narrativas.
2. Optimizacion de bundle y chunking.
3. Pulido visual no funcional.

## 5. Criterio Practico Para Trabajar A Partir De Aqui

Regla simple:

- si algo rompe flujo de jugador o de DM, va primero
- si algo solo es deuda interna pero no rompe experiencia, va despues
- si una nueva feature necesita tocar una zona fragil, primero estabilizar esa zona

## 6. Recomendacion De Proximo Paso

El siguiente paso mas rentable no es un gran refactor.

Es este:

1. ejecutar una pasada funcional guiada
2. abrir backlog de bugs reales
3. corregir los 3-5 problemas mas visibles de flujo

Despues de eso ya tiene sentido entrar a features nuevas con menos riesgo.
