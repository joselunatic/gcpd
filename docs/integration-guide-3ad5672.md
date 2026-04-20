# Integration Guide For Commit `3ad5672`

This document explains the scope of commit `3ad5672` (`Add tracer workflow and DM tooling improvements`) so another Codex instance can merge or port the work onto an older checkout of the repository.

## What This Commit Actually Contains

This is not a single-feature commit. It bundles five workstreams that touched the same surfaces:

1. `TRACER` command end-to-end.
2. `/phone` operator bridge for DM.
3. DM panel refactor and UX improvements, especially POIs and Tracer.
4. New/updated cinematic TerminalOS commands and help text.
5. Boot/monitor/map polish plus supporting assets and docs.

If a remote Codex wants to integrate incrementally, it should treat this commit as a feature bundle and split it mentally by subsystem, not by file count.

## Recommended Integration Order

Integrate in this order to reduce breakage:

1. Backend/API and websocket support in [server/index.js](/home/jose/gcpdwopr/woprcrt-terminal/server/index.js)
2. Terminal runtime wiring in [public/utils/remoteOs.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/remoteOs.js), [public/utils/io.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/io.js), [public/utils/speak.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/speak.js), [public/utils/screens.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/screens.js)
3. New commands in [public/commands/tracer.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/tracer.js), [public/commands/dial.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/dial.js), [public/commands/audio.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/audio.js), and updates to [public/commands/help.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/help.js), [public/commands/map.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/map.js), [public/commands/show.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/show.js), [public/commands/ballistica.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/ballistica.js)
4. Router/app entry updates in [src/App.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/App.jsx)
5. New phone UI in [src/components/PhonePanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/PhonePanel.jsx) and [src/css/PhonePanel.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/PhonePanel.styles.css)
6. DM panel and extracted DM subcomponents in [src/components/DmPanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiEditor.jsx), [src/components/dm/PoiList.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiList.jsx), [src/components/dm/PoiMapPicker.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiMapPicker.jsx), [src/components/dm/PoiPreview.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiPreview.jsx), [src/components/dm/PoiImageCard.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiImageCard.jsx)
7. CSS/theme polish in [src/css/DmPanel.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/DmPanel.styles.css), [src/css/Terminal.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/BootAscii.styles.css), [src/index.css](/home/jose/gcpdwopr/woprcrt-terminal/src/index.css), [src/css/Monitor.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/Monitor.styles.css), [src/css/BootAscii.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/BootAscii.styles.css)
8. Assets and generated support files last.

## Subsystem Breakdown

### 1. TRACER backend

Primary file: [server/index.js](/home/jose/gcpdwopr/woprcrt-terminal/server/index.js)

This is the core of the feature. It adds:

- `TRACER_CONFIG_KEY`
- tracer timing constants:
  - `TRACER_RING_TIMEOUT_MS`
  - `TRACER_STEP_MS`
  - `TRACER_EXACT_MS`
- tracer config normalization:
  - hotspots
  - lines
- websocket coordination for DM and agent roles on `/ws/tracer`
- server-side call lifecycle:
  - incoming
  - answer
  - timed steps
  - hangup
  - auto hangup

Important integration detail:

- Tracer lines now use `number` as their effective unique identifier.
- The backend still tolerates old payloads because `normalizeTracerLine()` falls back from `entry.id` to `entry.number`.
- If the older repo already has local experiments around tracer lines, preserve the compatibility behavior in `normalizeTracerLine()` and the duplicate filtering in `getTracerConfig()` / `setTracerConfig()`.

### 2. TerminalOS command/runtime layer

Primary files:

- [public/utils/remoteOs.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/remoteOs.js)
- [public/utils/io.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/io.js)
- [public/commands/tracer.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/tracer.js)
- [public/commands/dial.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/dial.js)
- [public/commands/audio.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/audio.js)

This layer adds or changes:

- command registration and lazy-loading for new commands
- cinematic tracer flow in TerminalOS
- websocket agent role for tracer
- map-based trace stages and final reveal
- call-related audio usage
- help command updates so the command surface is discoverable

Important integration detail:

- `TRACER` is not only a command file. It also depends on the runtime plumbing in `remoteOs.js`, typing/output behavior in `io.js`, and some speech/audio helpers.
- If the remote repo already diverged in command loading, port the behavior, not necessarily the exact import style.

### 3. `/phone` mobile-first DM bridge

Primary files:

- [src/components/PhonePanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/PhonePanel.jsx)
- [src/css/PhonePanel.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/PhonePanel.styles.css)
- [src/App.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/App.jsx)

This provides a dedicated DM/operator view on `/phone` with:

- incoming call state
- answer/hangup actions
- synchronized tracer clock
- current tracer phase
- mobile-first layout

Important integration detail:

- This route replaces the need to operate live calls from the DM Tracer tab.
- Later cleanups in [src/components/DmPanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/DmPanel.jsx) intentionally removed realtime operator controls from the Tracer tab because `/phone` is the canonical operator surface.

### 4. DM panel refactor and POI tooling

Primary files:

- [src/components/DmPanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/DmPanel.jsx)
- [src/components/dm/PoiEditor.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiEditor.jsx)
- [src/components/dm/PoiList.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiList.jsx)
- [src/components/dm/PoiMapPicker.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiMapPicker.jsx)
- [src/components/dm/PoiPreview.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiPreview.jsx)
- [src/components/dm/PoiImageCard.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/dm/PoiImageCard.jsx)
- [src/css/DmPanel.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/DmPanel.styles.css)

This is the largest frontend delta. It includes:

- POI editor decomposition into smaller components
- search/selection improvements
- image upload/crop support
- map picker and hotspot editing
- evidence, ballistics, audio and phone line management inside DM
- account/security and other panel layout iterations
- tooltip theme unification
- Tracer tab redesign

Important integration detail:

- The Tracer tab was reworked multiple times during the branch. The final state is:
  - no realtime operator controls in the tab
  - larger hotspot map preview
  - hotspot actions under the map preview
  - `Ajuste fino` removed in this Tracer flow
  - line number is the real line identifier
  - line label is DM-facing only
  - hotspot label is agent-facing only

If the remote Codex sees contradictory tracer UI code in older snapshots, the above is the target state.

### 5. Boot/monitor/visual polish

Primary files:

- [src/components/BootAscii.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/BootAscii.jsx)
- [src/components/IMSAI.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/IMSAI.jsx)
- [src/components/IMSAI/Base.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/IMSAI/Base.jsx)
- [src/components/IMSAI/Monitor.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/IMSAI/Monitor.jsx)
- [src/css/BootAscii.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/BootAscii.styles.css)
- [src/css/Monitor.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/Monitor.styles.css)
- [src/css/Terminal.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/Terminal.styles.css)
- [public/w.stl](/home/jose/gcpdwopr/woprcrt-terminal/public/w.stl)

This work improves the boot/visual sequence and supporting assets. If the older repo has unrelated monitor work, integrate this area last because it is mostly polish, not system behavior.

## New Asset Families

The commit introduces product assets, not just code:

- `public/assets/audio/`
- `public/assets/audio/garbled/`
- `public/assets/phonelines/`
- `public/assets/sounds/`
- `public/uploads/images/`
- extended `public/assets/ballistics/`
- `public/w.stl`

If the remote Codex is porting code without assets, expect runtime gaps:

- missing audio playback
- missing phone-line sources
- missing POI images
- missing boot model asset

## Dependency / Tooling Changes

Check:

- [package.json](/home/jose/gcpdwopr/woprcrt-terminal/package.json)
- [package-lock.json](/home/jose/gcpdwopr/woprcrt-terminal/package-lock.json)
- [vite.config.js](/home/jose/gcpdwopr/woprcrt-terminal/vite.config.js)
- [public/sw.js](/home/jose/gcpdwopr/woprcrt-terminal/public/sw.js)

The remote Codex should port these together, because route/proxy/service worker behavior and dev-server assumptions changed around the same time.

## If The Remote Codex Wants To Split The Commit

Suggested logical split:

1. `server/index.js` + tracer websocket/config changes
2. `public/commands/tracer.js`, `dial.js`, `audio.js`, runtime helpers, and `help.js`
3. `/phone` route and component
4. `DmPanel` + `src/components/dm/*` + `src/css/DmPanel.styles.css`
5. visual polish and boot/monitor assets
6. generated/static assets
7. docs

## Risk Areas During Porting

Highest merge-risk files:

- [server/index.js](/home/jose/gcpdwopr/woprcrt-terminal/server/index.js)
- [src/components/DmPanel.jsx](/home/jose/gcpdwopr/woprcrt-terminal/src/components/DmPanel.jsx)
- [src/css/DmPanel.styles.css](/home/jose/gcpdwopr/woprcrt-terminal/src/css/DmPanel.styles.css)
- [public/commands/map.js](/home/jose/gcpdwopr/woprcrt-terminal/public/commands/map.js)
- [public/utils/remoteOs.js](/home/jose/gcpdwopr/woprcrt-terminal/public/utils/remoteOs.js)

These files received many unrelated improvements in the same commit. Remote integration should be careful not to assume every diff hunk is required for TRACER specifically.

## Short Human Summary

If someone asks "what is `3ad5672`?", the short answer is:

`3ad5672` adds the TRACER feature end-to-end, introduces the `/phone` operator surface, refactors large parts of the DM panel and POI tooling, updates TerminalOS commands/help, and brings in the supporting assets and visual polish required for that workflow.
