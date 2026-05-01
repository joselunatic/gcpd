# IWSDK AI Quest Spike

## Estado inicial

- App Vite + React con Quest cargado por `lazy(() => import('./quest/QuestRoute'))`.
- Versiones instaladas antes del spike: Vite `4.4.4`, React `18.2.0`, Three `0.182.0`, `@react-three/fiber` `8.18.0`, `@react-three/xr` `6.6.29`.
- `src/quest/QuestCanvas.jsx` mantiene `Canvas` + `XR store={xrStore}`.
- `src/quest/QuestStore.js` mantiene `createXRStore` con `originReferenceSpace: 'local-floor'` y ray pointers.
- No habia config IWSDK/MCP en el repo principal. Si habia documentacion previa de Codex/Playwright y un MCP Blender en la config global de Codex del usuario.

## Instalado

- `@iwsdk/cli@0.3.2`
- `@iwsdk/vite-plugin-dev@0.3.2`

Se anadio `.npmrc` con:

```ini
legacy-peer-deps=true
install-strategy=nested
```

Motivo: `@iwsdk/vite-plugin-dev@0.3.2` declara peer `vite@^7.0.0`, pero este repo usa Vite 4. La estrategia nested evita subir transitorios existentes del backend, como `express`, solo por instalar el tooling del spike.

## Scripts

- `dev:quest`: Vite normal con el host/puerto de `vite.config.js`.
- `dev:runtime`: script interno requerido por IWSDK; ejecuta Vite y activa el plugin por `npm_lifecycle_event`.
- `dev:iwsdk`: aplica el parche Windows local y ejecuta `iwsdk dev up --timeout 90000`.
- `dev:iwsdk:down`: `iwsdk dev down`.
- `dev:iwsdk:status`: `iwsdk dev status`.
- `mcp:iwsdk`: `iwsdk mcp stdio`.
- `iwsdk:sync`: `iwsdk adapter sync`.

## Vite

`vite.config.js` conserva `spaHistoryFallback()`, `react()`, aliases de `zustand`, dedupe, host, puerto `5174`, preview y proxies existentes. El plugin `iwsdkDev` solo se activa si:

- `npm_lifecycle_event === 'dev:runtime'`, o
- `IWSDK_DEV=1`.

Config IWSDK usada:

- `emulator.device: 'metaQuest3'`
- `emulator.activation: 'localhost'`
- `ai.mode: IWSDK_AI_MODE || 'agent'`
- `ai.screenshotSize: 800x800`

## Como arrancar

```powershell
npm install
node node_modules\@iwsdk\vite-plugin-dev\node_modules\playwright\cli.js install chromium
npm run server
npm run dev:iwsdk
```

En este entorno Windows se anadio `scripts/patch-iwsdk-windows.mjs` porque el CLI publicado falla al hacer `spawn("npm")`. El script parchea de forma idempotente `node_modules/@iwsdk/cli/dist/cli.js` para lanzar el proceso de Vite a traves de `cmd.exe`. `npm run dev:iwsdk` ya ejecuta ese parche antes de `iwsdk dev up`.

Abrir:

```text
http://localhost:5174/quest
```

## MCP config

`npm run iwsdk:sync` genero/configuro:

- `.mcp.json` para Claude
- `.cursor/mcp.json` para Cursor
- `.codex/config.toml` para Codex
- `.vscode/mcp.json` para Copilot, aunque `.vscode/*` ya esta ignorado por el repo

El servidor generado es `iwsdk-runtime` y ejecuta:

```text
node node_modules/@iwsdk/cli/dist/cli.js mcp stdio
```

No se modifico la config global de Codex donde ya existe Blender. En el hilo actual de Codex, `tool_search` no descubrio `iwsdk-runtime` despues de generar `.codex/config.toml`; solo mostro los MCP ya cargados como Blender y Playwright. Para que Codex lo cargue como herramienta propia parece necesario reiniciar/reabrir la sesion o mover/revisar el bloque en la config global.

## Runtime Quest + MCP de escena

La app no usa `@iwsdk/core`, asi que IWSDK no crea automaticamente `window.FRAMEWORK_MCP_RUNTIME`. Para que las tools de escena funcionen con React Three Fiber se anadio un adapter minimo:

- `src/quest/hooks/useQuestSceneMcpRuntime.js`
- montado desde `src/quest/QuestScene.jsx`

El adapter solo se instala en desarrollo/IWSDK y solo maneja:

- `get_scene_hierarchy`
- `get_object_transform`

No implementa ECS. Si existiera otro `FRAMEWORK_MCP_RUNTIME`, delega los metodos no soportados al runtime previo.

El navegador gestionado por IWSDK arranca en `/`. Como el Canvas de Quest vive en `/quest`, se anadio en `src/App.jsx` una redireccion solo para `window.__IWER_MCP_MANAGED === true` desde `/` hacia `/quest`. No afecta a navegadores normales ni a la TUI principal.

## Validacion

- `npm run iwsdk:sync`: OK, adaptadores `configured`.
- `npx iwsdk mcp inspect`: OK, 32 tools runtime.
- `npm run dev:iwsdk`: OK con parche Windows local; Vite levanta en `http://localhost:5174/`.
- `npm run dev:iwsdk:status`: OK con runtime `running: true`, `browserConnected: true`, `browserCommandReady: true`.
- `/quest`: OK con Playwright aislado:
  - HTTP `200`
  - `.quest-route`: presente
  - canvas Quest: presente
  - `window.IWER_DEVICE`: presente
  - `navigator.xr`: presente
  - errores de consola: ninguno
  - warnings observados: mensajes WebGL de contexto/performance durante screenshot
- MCP stdio real:
  - `initialize`: servidor `iwsdk-runtime`
  - `tools/list`: 32 tools
  - `tools/call browser_get_console_logs`: OK
  - `tools/call browser_screenshot`: OK, `image/png`
  - `scene_get_hierarchy`: OK sobre la escena R3F de `/quest`; devuelve root `Scene` y grupo `GCPD_QuestScene`.
  - `scene_get_object_transform`: OK para UUIDs de la jerarquia.
  - `xr_get_session_status`: OK.
  - `xr_accept_session`: OK; deja `sessionActive: true` con `local-floor`, `hand-tracking`, `hit-test`, `viewer` y `local`.
- `npm run build`: OK. Quedan warnings ya esperables de chunk size/dynamic import.
- `npx eslint src/App.jsx src/quest --ext js,jsx --report-unused-disable-directives --max-warnings 0`: OK.
- `npm run smoke:quest-tools`: OK con evidence `2`, built-in STL `3`, ballistics `29`, ballistics assets `24`, audio `3`, phone lines `1`, tracer lines `2`, tracer hotspots `2`.

## Limitaciones encontradas

- Peer mismatch: IWSDK plugin pide Vite 7; el spike funciona con Vite 4 usando `legacy-peer-deps`, pero esto queda como riesgo.
- Windows: el CLI publicado necesita el parche local `scripts/patch-iwsdk-windows.mjs` para `iwsdk dev up`.
- Windows + install nested: el auto-install del browser mediante `npx playwright install chromium` no encuentra el binario `playwright`; el comando directo con `node node_modules\@iwsdk\vite-plugin-dev\node_modules\playwright\cli.js install chromium` si funciona.
- IWSDK managed browser arranca en `/` y no vi tool MCP de navegacion. Queda resuelto para este repo con redireccion limitada al managed browser hacia `/quest`.
- Scene tools requieren `FRAMEWORK_MCP_RUNTIME`; queda resuelto para R3F con un adapter minimo. ECS sigue sin aplicar porque este repo no usa `@iwsdk/core`.

## Siguientes pasos

- Reportar en IWSDK CLI el arranque Windows: usar `npm.cmd`/shell o resolver package manager portable, para retirar `scripts/patch-iwsdk-windows.mjs`.
- Pedir opcion IWSDK para URL inicial o tool MCP de navegacion; permitiria retirar la redireccion `__IWER_MCP_MANAGED` en `src/App.jsx`.
- Decidir si se acepta el spike con Vite 4 + peer workaround o si se abre otro spike para subir Vite a 7.
- Mantener el adapter R3F solo como tooling de desarrollo. No convertir Quest a ECS salvo que haya una razon de producto clara.
