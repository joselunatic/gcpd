# Playwright Automation Logic (Future Iterations)

## 1. Scope

This document defines how to automate this codebase with Playwright in a repeatable way.
It is CLI-first (Playwright MCP `playwright-cli` wrapper), aligned with the current architecture:

- Frontend React/Vite routes:
  - `/*` -> terminal experience
  - `/dm` -> DM control panel
  - `/docs` -> markdown docs page
- Backend API (`server/index.js`) on port `4000`.

Primary objective for future runs:
- Keep flows deterministic.
- Prefer `/dm` for stable CRUD validation.
- Use terminal flows only where interaction behavior is the target.

---

## 2. Runtime Baseline

Start services in separate shells:

```bash
npm run server
npm run dev
```

Optional fast terminal boot:

```bash
npm run dev:fast
```

Playwright wrapper setup:

```bash
export CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"
export PWCLI="$CODEX_HOME/skills/playwright/scripts/playwright_cli.sh"
"$PWCLI" --help
```

Notes:
- Backend defaults include DM passwords from env fallback:
  - `DM_DEFAULT_PASSWORD=brother`
  - `DM_BACKDOOR_PASSWORD=1234`
- Session token is persisted in browser localStorage key `dmSessionToken`.

---

## 3. Determinism Controls

### 3.1 Storage keys that affect flows

- Terminal:
  - `screenStatus`
  - `terminalState`
  - `terminalSnapshot` (sessionStorage)
  - `ttyFastMode`
  - `touchModeEnabled`
- DM:
  - `dmSessionToken`
  - `dmPanelMode`
  - `dmPanelActiveView`
  - `dmPanelSelections`
  - `dmPanelPreview`
  - `dmPanelSelector`
  - `dmPanelHelp`
  - `dmPanelTree`

### 3.2 Recommended clean start per run

1. Open page.
2. Clear local/session storage from browser.
3. Reload page.
4. Login again on `/dm` when needed.

For terminal-specific runs:
- Force `ttyFastMode=true` where typewriter speed is not under test.
- Keep `touchModeEnabled=false` unless touch UX is the target.

---

## 4. Automation Surfaces

## 4.1 DM panel (`/dm`) - highest stability

Why this should be the default automation target:
- Explicit forms and structured sections.
- CRUD endpoints are clear (`/api/cases-data`, `/api/pois-data`, `/api/villains-data`, etc.).
- Less animation/temporal variance than terminal typing loops.

High-value regression lanes:
1. Auth
2. Cases CRUD
3. POI selector overlay/search/recents
4. Villains + attribute access matrix
5. Evidence/Ballistics/Audio/Phone-lines forms

Selector strategy:
- Prefer semantic text and stable class clusters:
  - `dm-panel__section-title`
  - `dm-panel__panel-title`
  - `dm-panel__poi-overlay`
  - `dm-panel__poi-row--overlay`
- Avoid brittle index-only targeting when there is visible unique text.

## 4.2 Terminal (`/*`) - behavior-driven checks

Key states are represented by `.terminal[data-screen-status="<state>"]`.
Main states:
- `dialer`
- `login`
- `main`
- `line`
- `os`
- `os-remote`

Critical behavior paths:
1. Dialer selection navigation (ArrowUp/ArrowDown/Enter)
2. Login accept path (`joshua|oracle|brothereye|wayne`)
3. Main command execution loop (`help`, `cases`, `map`, `villains`, `status`, etc.)
4. Remote shell (`show`, `balistica`, `audio`, `dial`, `exit`)

Prefer assertions on:
- Screen status (`data-screen-status`)
- Presence of key textual markers
- Overlay existence/removal (e.g. `#ballistica-overlay`, `#audio-overlay`)

---

## 5. Terminal Risk Areas (for test design)

1. Input parsing currently dereferences `matches[0]` without a null guard in `parse()`.
   - Malformed input can throw before command routing.
2. `__sentences` depends on an external endpoint.
   - Treat as non-deterministic unless mocked.
3. Audio garbling upload depends on `ffmpeg` availability on host.
4. Heavy visual modules (`three`) and overlays increase timing variance.
   - Use explicit waits for mounted overlays/state, not fixed sleeps.

---

## 6. Playwright CLI Protocol (per interaction cycle)

Use this loop:
1. `open`
2. `snapshot`
3. interaction (`click`, `type`, `press`)
4. `snapshot` again after navigation or major DOM change
5. `screenshot` when preserving evidence

Examples:

```bash
"$PWCLI" open http://localhost:5173/dm --headed
"$PWCLI" snapshot
"$PWCLI" click eX
"$PWCLI" type "1234"
"$PWCLI" press Enter
"$PWCLI" snapshot
"$PWCLI" screenshot --filename output/playwright/dm-login.png
```

```bash
"$PWCLI" open http://localhost:5173/ --headed
"$PWCLI" snapshot
"$PWCLI" press ArrowDown
"$PWCLI" press Enter
"$PWCLI" snapshot
"$PWCLI" screenshot --filename output/playwright/terminal-dialer.png
```

`eX` is intentional: always replace with ids from the latest snapshot.

---

## 7. Suggested Iteration Plan

Use this order for future Playwright work:

1. DM auth + smoke (`/dm`)
2. POI selector/search overlay regressions
3. Cases/Villains save/delete workflows
4. Evidence/Ballistics/Audio form integrity
5. Terminal state transitions (`dialer -> login -> main`)
6. Remote shell overlays (`show`, `balistica`, `audio`, `dial`)

This order gives fastest signal with lowest flake.

---

## 8. Artifacts and Hygiene

- Store captures only in:
  - `output/playwright/`
- Do not create new top-level artifact folders.
- If tests mutate DB-backed records, restore fixture state before ending the iteration.

