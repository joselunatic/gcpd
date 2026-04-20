# Functional Smoke Check

Date: 2026-04-20

Environment used:

- Backend: current local `server/index.js` restarted from this checkout
- Frontend: Vite dev server on `http://127.0.0.1:5174`
- Browser automation: Playwright CLI

URLs used:

- App: `http://127.0.0.1:5174/`
- DM: `http://127.0.0.1:5174/dm`
- Phone bridge: `http://127.0.0.1:5174/phone`
- API: `http://127.0.0.1:4000`

## Scope

This was a guided smoke pass, not exhaustive QA.

The goal was to validate the critical surfaces that now define the product:

- player terminal
- DM panel
- `/phone` bridge for `TRACER`

## Important Note

The terminal intentionally starts powered off.

This is diegetic behavior, not a bug:

- the user must toggle the physical front-panel control to power the terminal on

That behavior was excluded from the findings list.

## Result Summary

### Confirmed working

- Frontend and backend both start correctly.
- `npm run lint` passes.
- `npm run build` passes.
- `/`, `/dm` and `/phone` all load in a real browser.
- After powering on, the terminal boots and reaches the dialer.
- Dialer keyboard navigation works.
- Opening a diegetic line and returning with `Enter` works.
- Selecting `NODO AUX BROTHER-MK0` reaches the login screen.
- `/dm` login works with the default password `brother`.
- `/dm` main workspaces load:
  - `Casos`
  - `Tracer`
- `/phone` eventually reaches `ws online` and `linea disponible` once no DM operator is occupying the slot.

### Partially validated

- `BROTHER-MK0` login screen renders correctly, but this pass did not fully validate post-login command flow due the custom terminal input model.
- `REMOTE OS` was not fully exercised in this pass.
- CRUD save/delete paths in `/dm` were not exercised in this pass.
- Live end-to-end `TRACER` call execution was not completed in this pass.

## Findings

### Finding 1. Dialer pointer interaction is fragile; keyboard path is reliable

Severity: medium

Observed behavior:

- Dialer lines are rendered as pointer-selectable elements.
- Browser automation could reliably navigate and activate them with keyboard.
- Direct pointer click on a line repeatedly failed because the element never stabilized enough to be clicked.

What this likely means:

- Keyboard-first flow is solid.
- Mouse/touch pointer interaction on the dialer is at least fragile and may fail depending on timing, overlays or motion.

Why it matters:

- The dialer visually reads as clickable.
- If users try to operate it with pointer input, the experience may feel inconsistent or unresponsive.

Likely area:

- terminal selectable line rendering
- overlay/interlace/scanline stacking
- animation/stability on terminal rows

### Finding 2. Visiting `Tracer` in `/dm` can monopolize the operator slot and block `/phone`

Severity: high

Observed behavior:

- With `/dm` opened on the `Tracer` workspace, `/phone` showed:
  - `ws offline`
  - `Ya existe un operador DM conectado.`
- This indicates the DM panel is occupying the operator connection.

Why it matters:

- The intended product direction is that `/phone` is the fast operator surface for live `TRACER`.
- If simply opening the `Tracer` tab in `/dm` reserves the live operator slot, the dedicated phone bridge loses most of its value.

Likely area:

- DM websocket lifecycle in [src/components/DmPanel.jsx](C:/Repos/gcpd/src/components/DmPanel.jsx)
- role coordination in [server/index.js](C:/Repos/gcpd/server/index.js)

### Finding 3. The DM operator lock for `TRACER` is released too slowly

Severity: medium

Observed behavior:

- After closing the DM tab, `/phone` still remained:
  - `ws offline`
  - `Ya existe un operador DM conectado.`
- Only after waiting several seconds and reloading did `/phone` recover to:
  - `ws online`
  - `linea disponible`

Why it matters:

- Live handoff from DM desktop to phone is too sticky.
- In actual play, this creates avoidable friction at the exact moment a call needs to be handled quickly.

Likely area:

- websocket cleanup timing
- stale socket ownership on the server
- close handling for the DM-side `TRACER` connection

## Evidence Notes

### Player terminal

Verified sequence:

1. Open `/`
2. Power on the terminal from the front panel
3. Wait for boot
4. Dialer renders
5. Press `Enter` on a diegetic line
6. Detail view renders
7. Press `Enter`
8. Dialer returns
9. Select `NODO AUX BROTHER-MK0`
10. Login screen renders

### DM panel

Verified sequence:

1. Open `/dm`
2. Login with `brother`
3. `Casos` renders correctly
4. `Tracer` renders correctly
5. Operator status in `Tracer` shows `ONLINE`

### Phone bridge

Verified sequence:

1. Open `/phone`
2. When DM `Tracer` operator is active, phone bridge is blocked
3. After operator release delay, `/phone` recovers and reaches `ws online`

## Priority Backlog From This Smoke Pass

### P1

1. Make `/phone` the canonical live operator surface for `TRACER`, without being blocked by merely opening `Tracer` in `/dm`.

### P1

2. Tighten websocket cleanup so operator ownership is released immediately when the DM surface disconnects or closes.

### P2

3. Harden pointer interaction on terminal selectable rows, especially in the dialer.

## Recommended Next Step

The highest-value next pass is:

1. fix the `TRACER` operator-slot conflict
2. re-run smoke for `/dm` plus `/phone`
3. then validate one real end-to-end `TRACER` call

After that, the next player-facing pass should focus on:

- `BROTHER-MK0` post-login flow
- `REMOTE OS`
- `AUDIO`
- `DIAL`
- `SHOW`
