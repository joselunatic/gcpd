# RT Effects Handoff

State snapshot for the DM-driven realtime overlay effects used by agent TUI.

Last checked against code: 2026-06-03.

Scope
- DM panel `Efectos RT`
- Agent-side runtime overlays mounted over the IMSAI monitor
- Shared websocket backend for effects broadcasting

Files involved
- `src/components/DmPanel.jsx`
  - DM control surface for RT effects
  - media library upload/select/emit flow
  - direct media emit form
- `public/utils/effectsRuntime.js`
  - agent-side websocket client for `/ws/effects`
  - overlay creation and cleanup
  - media effect rendering
- `server/index.js`
  - `/ws/effects` websocket server
  - DM auth for effects channel
  - sanitization of relative media URLs
  - RT media library API endpoints

Current effect types
- `alarm`
- `hack`
- `fog`
- `flicker`
- `critical`
- `media`

Current websocket contract
- DM -> server:
  - `{ type: 'effects:trigger', effect, options }`
  - `{ type: 'effects:clear' }`
- Server -> agents:
  - `{ type: 'effects:trigger', effect, options }`
  - `{ type: 'effects:clear' }`
- Server -> DM:
  - `{ type: 'effects:status', agents }`

Media effect behavior
- `media` accepts:
  - `url`
  - `mediaType` = `image` or `video`
  - `caption`
  - `dismissable`
  - `loop`
- URL must remain relative to server and pass `sanitizeEffectsMediaUrl()`.

Agent runtime rendering
- The media overlay is mounted over the monitor host selected by `getScreenHost()`.
- Images:
  - use full overlay bounds
  - `object-fit: contain`
- Videos:
  - use full overlay bounds
  - `object-fit: cover`
  - no native controls
  - `playsInline`
  - can loop continuously
- Caption is rendered as HUD text over the video/image, not below it.

Loop mode
- DM panel now exposes a `Bucle` toggle for direct media emission.
- Loop mode only applies to `video`.
- When `loop === true`:
  - the video remains in foreground until DM sends `effects:clear`
  - agent-side dismissal via ESC/click is disabled
- When `loop === false`:
  - dismissal behavior follows `dismissable`

DM panel behavior
- The direct media form has:
  - URL
  - media type
  - caption
  - `El agente puede cerrar con ESC`
  - `Bucle`
- If media type is changed to `image`, `Bucle` is forced off.
- Emitting a selected library video uses:
  - `loop` from current DM toggle state
  - `dismissable = false` when loop is enabled

Known constraints
- The runtime currently keeps only one active `media` effect id (`registerEffect('media', ...)`), so a new media emission replaces the previous one.
- Loop persistence is intentionally DM-controlled, not duration-based.
- This overlay is TUI-only and should not be mixed with Quest/XR work.

Verification status
- `node --check public/utils/effectsRuntime.js` passes.
- `npm run lint` passes.
- `npm run build` passes.

Useful next steps
- Add a DM-side preview badge showing whether current selected media will emit as `loop`.
- If needed later, add a second boolean for `cover` vs `contain` video fit, but keep current default as full-frame `cover`.

