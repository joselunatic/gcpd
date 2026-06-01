# Live Map / Tactical Handoff

State snapshot for the next Codex session on `joselunatic/gcpd`.

Last checked against code: 2026-06-01.

Scope of work done
- Only the TUI / DM panel / shared backend for `Mapa Live` and `TACTICAL`.
- No Quest/XR changes in this branch of work.
- POI map work was touched earlier in the broader thread, but the current focus here is tactical live map state and token behavior.

Current feature set
- DM can upload multiple tactical backgrounds.
- DM can assign and save a visible map label per background.
- DM can switch between backgrounds and keep per-map persisted state.
- Fallback background exists and is never used as a token-bearing scene.
- DM can create, move, select, edit, and delete tokens.
- Tokens support:
  - `agentLabel` for agents
  - `dmLabel` for DM
  - `kind` normalized to `ally` / `enemy`
  - `visible`
  - `trail` with the latest movement segment only
- Agents see the tactical overlay read-only through `TACTICAL`.
- Both DM and agent views render the last movement segment with a short fade.

Important behavior
- Trail mode is v1 only:
  - only the last segment is stored and rendered
  - no full path history
  - trail TTL is around 10s with a fade-out
- `live-map:token-move` now persists movement plus a single `trail` object:
  - `fromX`, `fromY`, `toX`, `toY`, `updatedAt`
- The DM and agent map both draw the trail as an SVG line layer underneath tokens.
- Both SVG trail layers explicitly force `display: block`, `width: 100%`, `height: 100%`, and `overflow: visible` so the SVG viewport matches the token coordinate surface.
- The agent also receives a full `live-map:state` snapshot after token moves so it does not depend only on the incremental move event.
- The tactical agent view uses `agentLabel` for token text.
- The DM view uses `dmLabel` as primary text.
- The agent tactical overlay is mounted inside `#monitor pre`, not `document.body`, to avoid covering the IMSAI frame.
- The agent tactical map keeps the same coordinate ratio used by the DM surface (`1.428:1`) through `MAP_SURFACE_RATIO` and `fitMapSurface()`.

Files currently involved
- `server/index.js`
  - live map normalization
  - live map websocket handling
  - live map state persistence
  - trail normalization and persistence
- `src/components/DmPanel.jsx`
  - `Mapa Live` editor UI
  - background catalog and per-scene labels
  - token forms and list rendering
  - DM-side trail rendering
- `src/css/DmPanel.styles.css`
  - live map layout
  - token pill sizing
  - trail overlay styles / fade animation
  - DM SVG trail viewport sizing fix
- `public/commands/tactical.js`
  - agent-side tactical overlay
  - websocket sync
  - live rendering of tokens and trails
  - TUI SVG trail viewport sizing and monitor-frame containment

Live map data model
- Top-level live state:
  - `backgroundImagePath`
  - `backgroundLoaded`
  - `backgroundLabel`
  - `fallbackImagePath`
  - `tokens[]`
  - `backgroundStates`
- Per-background scene:
  - `backgroundLabel`
  - `tokens[]`
  - `updatedAt`
- Token shape now includes:
  - `id`
  - `label` legacy alias
  - `agentLabel`
  - `dmLabel`
  - `x`
  - `y`
  - `visible`
  - `kind`
  - `trail`
  - `updatedAt`

Implementation details worth knowing
- Background selection now prefers persisted `backgroundStates[path].backgroundLabel` over old upload names.
- The DM label input has an explicit save action and updates the selected background entry.
- Background pills show the persisted label, not just the file name.
- Token creation in the DM form requires at least one label. Empty labels are normalized away.
- The tactical overlay in `public/commands/tactical.js` now re-renders the whole state on each websocket update instead of trying to mutate only one token node. This is what keeps trails consistent.
- The tactical overlay creates its own style tag `#tactical-live-map-styles`; stale browser/service-worker cache can make debugging confusing, so verify the runtime DOM/CSS before assuming the source file is active.

Current verification status
- `npm run build` passes.
- `node --check public/commands/tactical.js` passes.
- Local Playwright checks have been used to inspect tactical DOM geometry.
- DM trail offset was user-confirmed fixed after adding explicit SVG sizing in `src/css/DmPanel.styles.css`.
- TUI tactical trail offset was still being investigated in the conversation; the current code mirrors the DM SVG sizing fix in `public/commands/tactical.js`, but user confirmation on VPS is still pending.

Known caveats / things to keep in mind
- The trail is intentionally minimal: one movement segment only.
- The DM side and agent side should stay visually aligned for token pills and map proportions.
- If TUI offset persists while DM is fixed, inspect the live DOM in the agent browser:
  - `.tactical-trails` should be an `svg`
  - computed `display` should be `block`
  - computed width/height should match the `.tactical-map` content box minus border
  - there should be no old `.tactical-trail-segment` nodes from the discarded HTML-trail experiment
- If you change token rendering, keep the DM and tactical label precedence aligned:
  - DM: `dmLabel || label || agentLabel`
  - Agent: `agentLabel || label || dmLabel`
- If you change persistence, preserve backward compatibility with older live-map scenes that only have `label` and no `agentLabel` / `dmLabel` / `trail`.

Good next steps if continuing
- Add a manual "Ping / Focus" action for the DM on the live map.
- Consider a separate subtle trail color or opacity for ally/enemy moves if you need extra readability.
- If you touch websocket payloads, keep the current `live-map:state` and `live-map:token-move` contract stable.

