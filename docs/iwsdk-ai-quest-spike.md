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
- `dev:iwsdk`: `iwsdk dev up --timeout 90000`.
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

En este entorno Windows, `npm run dev:iwsdk` falla por un problema del CLI publicado al hacer `spawn("npm")`. Workaround validado para el spike:

```powershell
npm run server
npm run dev:runtime
```

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

## Validacion

- `npm run iwsdk:sync`: OK, adaptadores `configured`.
- `npx iwsdk mcp inspect`: OK, 32 tools runtime.
- `npm run dev:iwsdk`: fallo en Windows:

```json
{
  "ok": false,
  "error": {
    "code": "cli_error",
    "message": "Failed to start the dev process"
  }
}
```

Causa confirmada con repro Node: `spawn('npm')` devuelve `ENOENT` en este Windows.

- `npm run dev:runtime`: OK, Vite levanta en `http://localhost:5174/`.
- `npx iwsdk dev status`: OK con runtime `running: true`, `browserConnected: true`, `browserCommandReady: true` tras la primera llamada MCP.
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
- `npm run build`: OK. Quedan warnings ya esperables de chunk size/dynamic import.

## Limitaciones encontradas

- Peer mismatch: IWSDK plugin pide Vite 7; el spike funciona con Vite 4 usando `legacy-peer-deps`, pero esto queda como riesgo.
- Windows: `iwsdk dev up` no arranca porque el CLI intenta spawnear `npm` directamente.
- Windows + install nested: el auto-install del browser mediante `npx playwright install chromium` no encuentra el binario `playwright`; el comando directo con `node node_modules\@iwsdk\vite-plugin-dev\node_modules\playwright\cli.js install chromium` si funciona.
- IWSDK managed browser arranca en `/` y no vi tool MCP de navegacion. Por eso `/quest` se valido con Playwright aislado bajo el mismo dev server e inyeccion IWSDK, mientras que screenshot/logs MCP corresponden al managed browser en la TUI raiz.
- Scene/ECS tools requieren `FRAMEWORK_MCP_RUNTIME`; esta app usa `@react-three/xr` y no expone runtime IWSDK ECS. Para este repo, las capacidades utiles verificadas son browser screenshot, consola y runtime XR/device.

## Siguientes pasos

- Reportar o parchear en IWSDK CLI el arranque Windows: usar `npm.cmd`/shell o resolver package manager portable.
- Pedir/implementar opcion IWSDK para URL inicial o tool MCP de navegacion, para apuntar el managed browser directamente a `/quest`.
- Decidir si se acepta el spike con Vite 4 + peer workaround o si se abre otro spike para subir Vite a 7.
- Reiniciar Codex o revisar config global para confirmar descubrimiento real de `iwsdk-runtime` como herramienta de Codex junto a Blender.
