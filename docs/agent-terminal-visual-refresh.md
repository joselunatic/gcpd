# Agent Terminal Visual Refresh

First pass of the Claude design-guide integration for the agent TUI.

Last checked against code: 2026-06-03.

Scope already integrated
- Base shell copy refresh
- Login copy refresh
- `HELP` panel rewrite in diegetic document style
- `STATUS` panel rewrite in denser CRT readout style
- Terminal spacing and selection refinements in CSS

Files touched
- `public/commands/help.js`
- `public/commands/status.js`
- `public/utils/screens.js`
- `src/css/Terminal.styles.css`

What changed

## `HELP`
- No command semantics changed.
- The old flat list was replaced by a more diegetic internal-document presentation.
- The command inventory now reflects the current repo more accurately:
  - `MAP`
  - `CASES`
  - `CASE <ID>`
  - `VILLAINS`
  - `TACTICAL`
  - `SHOW IMAGE <CODIGO>`
  - `AUDIO`
  - `BALLISTICA`
  - `DIAL`
  - `DIALER`
  - `TRACER`
  - `STATUS`
  - `TOUCH`
  - `EXIT` / `QUIT`

## `STATUS`
- The screen now reads more like an operational CRT panel.
- Real campaign-state values are still used for:
  - alert level
  - active case
  - flags
  - unlocked counts
- Additional subsystem bars are present as diegetic readouts only.
- `SYSLOG` was intentionally not touched in this pass.

## Shell copy
- `login()` in `public/utils/screens.js` now uses a more cinematic access-channel presentation.
- `main_with_info()` now opens with a stronger shell banner and directive-style lines.
- No navigation flow changed:
  - dialer
  - login
  - remote OS
  - main shell
  all keep their current contracts.

## CSS
- `src/css/Terminal.styles.css` was adjusted to get closer to the Claude mock direction without changing layout architecture:
  - slightly tighter terminal padding
  - refined line-height / letter-spacing
  - hidden scrollbars
  - consistent selection marker arrows across selectable rows
- These are presentation changes only, not state-machine changes.

What is intentionally still pending
- No `SYSLOG` adaptation.
- No `TRACER` redesign in this pass.
- No `MAP`, `TACTICAL`, `RT media`, `SHOW`, `AUDIO`, `BALLISTICA` overlay redesign in this pass.
- No replacement of the real runtime with Claude's prototype runtime.

Implementation rule kept
- Claude's handoff is being used as a visual guide only.
- The real contracts, state, commands, persistence, and websocket behavior remain the source of truth in this repo.

Verification
- `node --check public/commands/help.js`
- `node --check public/commands/status.js`
- `node --check public/utils/screens.js`
- `npm run lint`
- `npm run build`

