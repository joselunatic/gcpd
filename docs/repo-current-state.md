# Estado Actual Del Repo

Fecha de revisión: 2026-04-20

## Resumen ejecutivo

El repositorio ya no es el proyecto WOPR original descrito en el `README.md`. El código actual implementa una experiencia GCPD/Batman con dos superficies principales:

- Terminal de agente con estética CRT y flujo secuencial (`dialer -> login -> main`).
- Panel de DM en `/dm` con autenticación, edición de casos, POIs, villanos y estado global de campaña.

La base funcional existe, pero hay deuda clara en tres frentes:

1. Documentación principal desalineada con el código.
2. Entorno local incompleto en este workspace (`node_modules` ausente).
3. Arquitectura híbrida React + DOM imperativo que complica cambios y depuración.

## Stack detectado

| Capa | Estado actual |
|---|---|
| Frontend shell | React 18 + React Router 6 + Vite 4 |
| UI real del terminal | JS imperativo cargado desde `public/utils` y `public/commands` |
| Backend | Express 5 |
| Persistencia | SQLite vía `better-sqlite3` |
| Auth DM | Sesiones en BD + contraseña hasheada con `bcryptjs` |
| PWA | `serviceWorker` registrado en producción + `manifest.webmanifest` |
| Tests | No configurados |
| CI/CD | No detectado |
| Contenedores | No detectados |

## Estructura útil

| Ruta | Propósito real |
|---|---|
| `src/main.jsx` | Entrada React y registro del service worker |
| `src/App.jsx` | Router principal (`/dm` y shell del terminal) |
| `src/components/IMSAI*` | Carcasa visual del terminal y rutas de minijuegos |
| `src/components/DmPanel.jsx` | Panel DM completo, grande y centralizado |
| `src/js/terminal.js` | Arranque del terminal, restauración de estado y bridge hacia `public/utils` |
| `public/utils/*.js` | Motor real del terminal, selección, touch, estado y pantallas |
| `public/commands/*.js` | Comandos cargados dinámicamente (`cases`, `map`, `villains`, etc.) |
| `public/data/**` | Datos semilla para casos, mapa y villanos |
| `server/index.js` | API Express, autenticación, seeding y persistencia |
| `scripts/*.mjs` | Importadores para cargar contenido vía API autenticada |
| `schema.sql` | Esquema base de SQLite |

## Flujo funcional detectado

### Jugador / agente

1. La app arranca en el shell React.
2. `src/js/terminal.js` delega en `public/utils/screens.js`.
3. El flujo persistido usa `screenStatus` y `terminalState`.
4. Los comandos del terminal leen datos desde API (`/api/cases-data`, `/api/pois-data`, `/api/villains-data`) con fallback parcial a JSON estático.

### DM

1. Ruta React dedicada: `/dm`.
2. Login contra `POST /api/auth/login`.
3. CRUD autenticado sobre casos, POIs y villanos.
4. Gestión del estado de campaña mediante `/api/campaign-state`.

## Backend real

`server/index.js` concentra casi toda la lógica de servidor:

- Inicializa tablas `settings`, `sessions`, `campaign_state`, `cases_data`, `pois_data`, `villains_data`.
- Migra columnas al vuelo con `ensureColumn(...)`.
- Si la BD está vacía, hace seed desde `public/data/...`.
- Mantiene alias legacy `/api/modules-data` para compatibilidad.
- Usa variables de entorno:
  - `PORT`
  - `DM_DEFAULT_PASSWORD`
  - `DM_BACKDOOR_PASSWORD`
  - `DM_SESSION_DURATION_MS`

## Estado del entorno local

Estado confirmado en este workspace:

- `npm install` ya se ejecutó correctamente en este workspace.
- `npm run lint` ya pasa.
- `npm run build` ya pasa.
- `server/index.js` responde correctamente en local sobre `GET /api/cases-data`.

Conclusión: el entorno ya está operativo para desarrollo y validación básica. El siguiente frente técnico ya no es el setup ni `eslint`, sino la estabilización funcional y la reducción de deuda estructural.

## Calidad y riesgos técnicos

### 1. Documentación principal obsoleta

- `README.md` todavía describe el proyecto WOPR/WarGames original.
- El repo actual ya es una variante GCPD con panel DM, API y datos narrativos.
- `docs/db-schema.md` sigue listando `modules_data` como tabla principal, cuando el backend usa `cases_data` y solo expone `modules-data` como alias legacy.

Impacto:
- Onboarding confuso.
- Riesgo de corregir o desplegar sobre supuestos antiguos.

### 2. Arquitectura híbrida con frontera difusa

La UI está partida entre:

- React (`src/**`) para routing, shell y panel DM.
- DOM imperativo en `public/utils/**` para el terminal.

Impacto:
- Estado repartido entre React, DOM, `localStorage`, `sessionStorage` y eventos globales.
- Difícil testear.
- Difícil introducir features transversales sin regresiones.

### 3. Ficheros muy grandes y de alta centralidad

- `server/index.js` concentra API, auth, migraciones, seeding y mapeo de datos.
- `src/components/DmPanel.jsx` concentra gran parte de la UI editorial y lógica de negocio del panel.
- `public/utils/screens.js` es el núcleo de navegación/estado del terminal.

Impacto:
- Alto coste de cambio.
- Mayor probabilidad de regresiones laterales.

### 4. Sin red de seguridad automática

- No hay tests detectados.
- No hay CI detectado.
- No hay validación reproducible mientras falten dependencias locales.

Impacto:
- Cada cambio relevante requerirá validación manual.

## Divergencias entre docs y código

### Alineadas parcialmente

- `docs/gcpd-functional-plan.md` sigue siendo útil como intención de producto.
- `docs/TOUCH-MOBILE-STATE.md` encaja con la implementación actual del flujo touch y persistencia.
- `schema.sql` coincide en lo esencial con la inicialización real del backend.

### Claramente desactualizadas

- `README.md`
- `docs/db-schema.md`

Estado tras esta revisión:

- ambas quedan actualizadas

## Convenciones observadas

### Código

- Frontend React en `.jsx`.
- Backend y utilidades del terminal en `.js`.
- Scripts de importación en `.mjs`.
- Estilo mixto ES modules.
- Comentarios mínimos; la intención se deduce más por estructura que por documentación interna.

### Git

Historial reciente:

- `c4e1e4d WIP: importers, cases/pois/villains updates, pagination`
- `e5e530d Publication I`
- `7d29e61 Prototype III`

Patrón observado:
- Commits cortos y poco normalizados.
- Hay mezcla de hitos y mensajes de prototipo/WIP.

## Prioridad recomendada para la siguiente fase

### Fase 0. Dejar el entorno operativo

1. Ejecutar `npm install`.
2. Confirmar que `npm run build` y `npm run lint` funcionan.
3. Levantar `npm run server` y `npm run dev`.

### Fase 1. Corregir la documentación base

1. Reescribir `README.md` para reflejar el producto GCPD real.
2. Actualizar `docs/db-schema.md` a `cases_data`.
3. Mantener este documento como referencia de estado inicial.

### Fase 2. Congelar el mapa técnico antes de nuevas funciones

1. Separar incidencias de entorno vs incidencias funcionales.
2. Revisar manualmente:
   - flujo terminal
   - login DM
   - CRUD de casos
   - CRUD de POIs
   - CRUD de villanos
   - persistencia de `campaign_state`
3. Registrar errores reproducibles.

### Fase 3. Reducir riesgo para cambios futuros

1. Extraer cliente API común para el panel DM.
2. Partir `server/index.js` por dominios.
3. Introducir al menos smoke tests de backend y una validación mínima de build/lint en CI.

## Hipótesis útiles para siguientes trabajos

- La fuente de verdad funcional ya no es el `README`, sino el código y los JSON de `public/data`.
- La compatibilidad legacy con `modules` sigue activa y puede esconder deuda histórica.
- El panel DM parece ser la superficie más adecuada para nuevas funciones operativas.
- El terminal agente necesita cambios más cuidadosos por su dependencia en eventos globales y renderizado imperativo.

## Resultado de esta revisión

El repo está en una fase intermedia: hay producto utilizable, el entorno local ya está operativo y la documentación principal queda alineada con la ficción y arquitectura reales del proyecto. El siguiente paso razonable es atacar la deuda técnica detectada por `eslint` y después entrar en corrección de errores funcionales y nuevas features.
