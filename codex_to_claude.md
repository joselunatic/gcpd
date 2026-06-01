# Codex To Claude Handoff

Last updated: 2026-06-01

## Current Repo State

- Working tree was clean before this documentation pass.
- This handoff adds/updates documentation only.
- Main stack: React 18, Vite 4, Express 5, SQLite via `better-sqlite3`, WebSocket via `ws`, Three / React Three Fiber for Quest.
- Useful commands:
  - `npm run dev` starts Vite on port `5174`.
  - `npm run server` starts the Express API on port `4000`.
  - `npm run build` builds the frontend.
  - `npm run lint` lints `src`.
  - `node --check public/commands/tactical.js` is a quick syntax check for the TUI tactical command.

## High-Level Surfaces

- Agent terminal / IMSAI shell:
  - React shell in `src/components/IMSAI*`.
  - Imperative terminal runtime in `src/js/terminal.js`, `public/utils/**`, and `public/commands/**`.
  - Main command modules include `map.js`, `cases.js`, `tracer.js`, `audio.js`, `ballistica.js`, `tactical.js`.

- DM panel:
  - Main component: `src/components/DmPanel.jsx`.
  - Styles: `src/css/DmPanel.styles.css`.
  - DM helpers/components: `src/components/dm/**`.
  - Manages cases, POIs, villains, evidence, campaign state, phone/tracer data, and live tactical map.

- Backend:
  - Single large Express server: `server/index.js`.
  - Handles auth/session, SQLite migrations/seeding, CRUD APIs, upload storage, and WebSocket live-map sync.
  - Important API areas: `/api/cases-data`, `/api/pois-data`, `/api/villains-data`, `/api/live-map`, `/api/live-map-backgrounds`, `/ws/live-map`.

- Quest/XR:
  - Route: `/quest/*`.
  - Entry: `src/quest/QuestRoute.jsx`.
  - Scene/runtime components: `src/quest/QuestScene.jsx`, `QuestCanvas.jsx`, `QuestShell.jsx`, `QuestModuleRouter.jsx`.
  - Quest docs/assets under `docs/blender/**`, `assets/quest/**`, `public/assets/quest/**`.

## Map / POI TUI

- Agent TUI map command: `public/commands/map.js`.
- Data sources:
  - API: `/api/pois-data`.
  - Fallback: `public/data/map/pois.json`.
  - Hotspots: `public/data/map/hotspots.json`.
- The current TUI map uses `public/mapa4x.png` for the high-resolution loupe/zoom behavior.
- POI normalization is shared through `public/utils/poiContract.js`.
- The map command groups/loads POIs, resources, access state, deltas, hierarchy, and media metadata.

## Live Map / Tactical

- DM live map render:
  - `src/components/DmPanel.jsx`.
  - `.live-map-control__surface` and trail/token styles in `src/css/DmPanel.styles.css`.

- Agent tactical command:
  - `public/commands/tactical.js`.
  - Runs when the agent types/launches `TACTICAL` in the TUI.
  - Connects to `/ws/live-map?role=agent`.
  - Mounts the tactical overlay inside `#monitor pre` to avoid covering the IMSAI frame.

- Shared backend sync:
  - `server/index.js`.
  - WebSocket path: `/ws/live-map`.
  - DM sends `live-map:state` and `live-map:token-move`.
  - Agent receives full state snapshots after token moves.

- Trail model:
  - One latest segment only, not full movement history.
  - Token shape includes `trail: { fromX, fromY, toX, toY, updatedAt }`.
  - TTL is currently 10 seconds with fade.

- Important recent fix:
  - DM trail offset was fixed by forcing the SVG trail layer to `display:block`, `width:100%`, `height:100%`, `overflow:visible`.
  - The same SVG sizing strategy is now mirrored in `public/commands/tactical.js`.
  - User has confirmed DM is fixed; TUI tactical confirmation is still pending.

## Current Tactical Trail Debug Context

- The user reported trail Y-offset in both DM and TUI.
- After updating `src/css/DmPanel.styles.css`, DM trail alignment is now confirmed fixed by the user.
- The issue is now isolated to TUI tactical.
- Current TUI code uses SVG again, not the discarded HTML segment experiment:
  - Runtime DOM should contain `svg.tactical-trails`.
  - Runtime DOM should not contain `.tactical-trail-segment`.
  - Computed CSS for `.tactical-trails` should show `display: block`, nonzero `width`, and nonzero `height`.
- If TUI still has offset, inspect runtime DOM/CSS first because the command injects styles dynamically and stale cached `public/commands/tactical.js` can mislead debugging.

## Reference Docs

- `docs/live-map-handoff.md`: current reference for Live Map / Tactical state and caveats. Updated in this pass.
- `docs/current-functional-map.md`: broader functional map of agent/DM features; older date but still useful for terminal flow.
- `docs/repo-current-state.md`: older repo-state audit; useful for architecture/debt, but predates Quest/live-map details.
- Quest-specific docs:
  - `docs/quest-ui-redesign-current-state.md`
  - `docs/quest-tracer-positional-audio.md`
  - `docs/codex-local-iwsdk-quest-handoff.md`
  - `docs/blender/quest-base-scene-v1.md`

## Risk Areas

- `src/components/DmPanel.jsx` and `server/index.js` are very large and high-risk for incidental regressions.
- Terminal commands in `public/commands/**` are dynamically imported and can be affected by browser/service-worker caching.
- DM and TUI tactical render similar live-map concepts through separate code paths; fixes may need to be mirrored explicitly.
- Quest/XR work is mostly separate and should not be touched when debugging TUI tactical unless the task explicitly asks for Quest.

## Suggested First Steps For Claude

1. Read `docs/live-map-handoff.md`.
2. Inspect `public/commands/tactical.js`, `src/css/DmPanel.styles.css`, and the live DOM of TUI tactical.
3. Verify whether the VPS/browser is actually running the current `tactical.js` by checking for `svg.tactical-trails` and absence of `.tactical-trail-segment`.
4. If the TUI trail still has Y-offset with current code loaded, compare computed rects for `.tactical-map`, `.tactical-trails`, `.tactical-token`, and the SVG line endpoint in the running browser.
