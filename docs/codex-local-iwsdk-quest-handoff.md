# Handoff Codex Local: GCPD Quest + IWSDK

## Estado de este checkout

- Repo: `C:\Users\JoseAntonioHernandez\Repos\gcpd\gcpd`
- Rama observada al crear este handoff: `main`
- Estado Git observado: `main...origin/main [ahead 1]`
- Cambios locales/versionados frente a `origin/main`: solo cambios en:
  - `src/quest/QuestHdriEnvironment.jsx`
  - `src/quest/QuestMapSurface.jsx`
  - `src/quest/QuestScene.jsx`
- Carpeta local untracked: `immersive-web-sdk/`
- No subir `immersive-web-sdk/` al repo principal. Es un clon upstream usado como referencia/documentacion local, no una dependencia de despliegue.

Nota: el spike IWSDK se preparo y valido en una rama/sesion anterior (`spike/iwsdk-ai-quest`), pero en este `main` actual no estan presentes los cambios de `package.json`, `vite.config.js`, `.mcp.json`, `.codex/config.toml`, etc. Si el Codex local debe continuar con IWSDK, debe recuperar/aplicar esos cambios o recrearlos con las instrucciones de abajo.

## Contexto de la app Quest

- App Vite + React.
- Quest vive bajo `/quest/*`.
- `src/App.jsx` carga Quest con `lazy(() => import('./quest/QuestRoute'))`.
- `src/quest/QuestRoute.jsx` monta:
  - `QuestCanvas`
  - `QuestHud`
  - `QuestPhoneOverlay`
  - `QuestPreflightOverlay`
  - `QuestSessionControls`
  - `useQuestData`
  - `useQuestSession`
- `src/quest/QuestCanvas.jsx` usa `Canvas` de `@react-three/fiber` y `XR store={xrStore}` de `@react-three/xr`.
- `src/quest/QuestStore.js` usa `createXRStore` con `originReferenceSpace: 'local-floor'`, ray pointers para controllers/hands, y teleport/gaze/grab desactivados.
- `vite.config.js` base ya contiene:
  - `spaHistoryFallback()`
  - `react()`
  - aliases de `zustand` a `src/quest/shims`
  - dedupe de `react`/`react-dom`
  - server `host: true`
  - port `5174`
  - proxies `/api`, `/uploads`, `/ws` a `localhost:4000`

No reescribir esta arquitectura ni migrar de `@react-three/xr`.

## Versiones base observadas

En la inspeccion inicial se confirmo:

- Vite instalado: `4.4.4`
- React: `18.2.0`
- Three: `0.182.0`
- `@react-three/fiber`: `8.18.0`
- `@react-three/xr`: `6.6.29`

## Que se valido en el spike IWSDK

Se instalaron y probaron:

- `@iwsdk/cli@0.3.2`
- `@iwsdk/vite-plugin-dev@0.3.2`

Motivo de usar `0.3.2`: `@iwsdk/vite-plugin-dev@0.3.1` generaba una config antigua con `iwsdk-dev-mcp --port`; `0.3.2` queda alineado con `iwsdk-runtime` y `iwsdk mcp stdio`.

Se comprobo:

- Codex detecta el MCP como namespace `mcp__iwsdk_runtime__` tras reiniciar Codex.
- Herramientas disponibles incluyen:
  - `xr_get_session_status`
  - `browser_screenshot`
  - `browser_get_console_logs`
  - `xr_*`
  - `scene_*`
  - `ecs_*`
- Con runtime levantado, `xr_get_session_status` responde con `Meta Quest 3`.
- `browser_get_console_logs` funciona y no mostro errores criticos.
- `browser_screenshot` funciona.
- `/quest` carga en `http://localhost:5174/quest` con Playwright:
  - HTTP 200
  - `.quest-route` presente
  - canvas presente
  - `window.IWER_DEVICE` presente
  - `navigator.xr` presente
  - sin errores de consola criticos

Limitacion validada: el browser gestionado por IWSDK arranca en `/`; el MCP IWSDK no expone navegacion/evaluate. Para inspeccionar `/quest`, usar Playwright normal o cambiar el arranque/config si se quiere que el managed browser abra directamente `/quest`.

## Cambios que debe recrear/aplicar el Codex local si continua el spike

### `.npmrc`

Crear:

```ini
legacy-peer-deps=true
install-strategy=nested
```

Motivo:

- `@iwsdk/vite-plugin-dev@0.3.2` declara peer `vite@^7.0.0`, pero este repo usa Vite 4.
- `install-strategy=nested` evita que `npm install` suba dependencias existentes del backend, como `express`, solo por dependencias transitivas del tooling MCP.

### `package.json`

Instalar:

```powershell
npm install --save-dev --save-exact @iwsdk/cli@0.3.2 @iwsdk/vite-plugin-dev@0.3.2 --ignore-scripts --no-audit --no-fund
```

Anadir scripts conservando los existentes:

```json
{
  "dev:quest": "vite",
  "dev:runtime": "vite",
  "dev:iwsdk": "iwsdk dev up --timeout 90000",
  "dev:iwsdk:down": "iwsdk dev down",
  "dev:iwsdk:status": "iwsdk dev status",
  "mcp:iwsdk": "iwsdk mcp stdio",
  "iwsdk:sync": "iwsdk adapter sync"
}
```

### `vite.config.js`

Importar:

```js
import { iwsdkDev } from '@iwsdk/vite-plugin-dev'
```

Antes de `defineConfig`, anadir:

```js
const iwsdkAiModes = new Set(['agent', 'oversight', 'collaborate']);
const iwsdkAiMode = iwsdkAiModes.has(process.env.IWSDK_AI_MODE)
  ? process.env.IWSDK_AI_MODE
  : 'agent';
const isIwsdkRuntime =
  process.env.IWSDK_DEV === '1' || process.env.npm_lifecycle_event === 'dev:runtime';

const plugins = [spaHistoryFallback(), react()];

if (isIwsdkRuntime) {
  plugins.push(
    iwsdkDev({
      emulator: {
        device: 'metaQuest3',
        activation: 'localhost',
      },
      ai: {
        mode: iwsdkAiMode,
        screenshotSize: { width: 800, height: 800 },
      },
      verbose: process.env.IWSDK_VERBOSE === '1',
    })
  );
}
```

Y cambiar:

```js
plugins: [spaHistoryFallback(), react()],
```

por:

```js
plugins,
```

No tocar aliases, dedupe, puerto ni proxies.

### MCP config

Ejecutar:

```powershell
npm run iwsdk:sync
```

Debe generar/configurar:

- `.mcp.json`
- `.cursor/mcp.json`
- `.codex/config.toml`
- `.vscode/mcp.json` si no esta ignorado

El servidor esperado es `iwsdk-runtime` con:

```text
node node_modules/@iwsdk/cli/dist/cli.js mcp stdio
```

## Como arrancar localmente

Backend:

```powershell
npm run server
```

Runtime IWSDK:

```powershell
npm run dev:runtime
```

`npm run dev:iwsdk` se intento, pero en Windows fallo por un problema del CLI publicado al hacer `spawn("npm")`:

```json
{
  "ok": false,
  "error": {
    "code": "cli_error",
    "message": "Failed to start the dev process"
  }
}
```

Workaround validado: usar `npm run dev:runtime`.

Si Chromium de Playwright no esta instalado:

```powershell
node node_modules\@iwsdk\vite-plugin-dev\node_modules\playwright\cli.js install chromium
```

En Linux/VPS, si faltan dependencias del sistema:

```bash
sudo node node_modules/@iwsdk/vite-plugin-dev/node_modules/playwright/cli.js install-deps chromium
node node_modules/@iwsdk/vite-plugin-dev/node_modules/playwright/cli.js install chromium
```

Abrir Quest:

```text
http://localhost:5174/quest
```

## Validacion recomendada para el Codex local

1. Confirmar branch y cambios:

```powershell
git status --short --branch
```

2. Confirmar dependencias:

```powershell
npm ls @iwsdk/cli @iwsdk/vite-plugin-dev vite --depth=0
```

3. Sincronizar MCP:

```powershell
npm run iwsdk:sync
```

4. Arrancar backend y runtime:

```powershell
npm run server
npm run dev:runtime
```

5. Confirmar estado:

```powershell
npx iwsdk dev status
```

6. Usar MCP IWSDK:

- `mcp__iwsdk_runtime__xr_get_session_status`
- `mcp__iwsdk_runtime__browser_get_console_logs`
- `mcp__iwsdk_runtime__browser_screenshot`

7. Usar Playwright para `/quest`, porque IWSDK MCP no navega:

```text
http://localhost:5174/quest
```

8. Build:

```powershell
npm run build
```

`npm run lint` fallo por un problema no relacionado/preexistente:

```text
src/components/DmPanel.jsx:1949
'handleTracerMapPick' is assigned a value but never used
```

## Blender

Blender esta disponible via MCP Blender. Usarlo si hay que:

- inspeccionar o modificar GLB/escena 3D;
- generar/ajustar assets;
- validar geometria/materiales antes de llevarlos a `/quest`.

No usar Blender para cambios de producto que se puedan resolver directamente en React/Three si no hace falta modificar assets.

## Reglas para continuar

- Enfocarse solo en `/quest`.
- No reescribir Quest ni migrar fuera de `@react-three/xr`.
- No tocar la TUI principal salvo scripts/config estrictamente necesarios.
- No subir `immersive-web-sdk/` al repo.
- No subir artefactos runtime:
  - `.iwsdk/`
  - `.playwright-mcp/`
  - `tmp/iwsdk-runtime/`
  - `dist/`
  - `node_modules/`
- Si se prepara merge, revisar que el diff no incluya pids, screenshots temporales ni logs.
