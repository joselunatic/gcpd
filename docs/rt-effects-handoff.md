# RT Effects System — Handoff

**Last updated**: 2026-06-01 (implementation complete)

## Overview

Real-time effects engine for the GCPD terminal. DM controls audio/visual immersion from a dedicated panel; effects broadcast instantly to all connected agent browsers via WebSocket.

**Key design**: No external audio libraries or large asset downloads. All effects use **Web Audio API synthesis** (alarm siren, glitch noise, flicker thumps) or **canvas rendering** (glitch streaks, scanlines) or **pure CSS animations**. Total runtime: ~700 lines agent-side, ~80 lines backend.

## Architecture

```
DM Panel (DmPanel.jsx)
  Tab: "Efectos RT"
  WebSocket: /ws/effects?role=dm&token=<session>
  └─> server/index.js: effectsWss
       └─> public/utils/effectsRuntime.js (agent browsers)
            └─> Overlays mounted in #monitor pre
```

**No new routes, no new endpoints**. Pure WebSocket extension of existing server pattern (same as live-map, tracer).

## Backend

### File: `server/index.js`

**New state:**
```javascript
const effectsWss = new WebSocketServer({ noServer: true });
const effectsDmSockets = new Set();    // DM connections
const effectsAgentSockets = new Set(); // Agent read-only connections
```

**WebSocket `/ws/effects`:**
- DM role requires `validateToken(token)` (session-based auth)
- Agent role is always read-only
- DM sends `{ type: 'effects:trigger', effect: '<name>', options: {...} }`
- DM sends `{ type: 'effects:clear' }`
- Server broadcasts to all agent sockets
- Server sends `{ type: 'effects:status', agents: <count> }` to DM (for UI display)

**Validation:**
- Only allowed effects: `['alarm', 'hack', 'fog', 'flicker', 'critical', 'media']`
- Media URLs must be relative (`/uploads/...`) — XSS mitigation
- URL sanitization: removes quotes, angle brackets

**Server handlers:**
- `broadcastEffectToAgents(payload)` — broadcasts to all agent sockets
- `broadcastEffectToDm(payload)` — broadcasts to all DM sockets (not used yet; future: for effect logs)
- `validateEffectPayload(payload)` — whitelist check
- `sendEffectsStatus()` — notifies DM of current agent count

## Agent Runtime

### File: `public/utils/effectsRuntime.js`

**Lifecycle:**
1. Terminal boots → `src/js/terminal.js` calls `initEffects()`
2. `startEffectsRuntime()` injects styles, connects WebSocket
3. WebSocket listens for `effects:trigger` and `effects:clear` messages
4. Auto-reconnects with 5s→8s exponential backoff on disconnect

**Audio synthesis** (Web Audio Context):

| Effect | Type | Implementation |
|--------|------|-----------------|
| Alarm | Synth | Sawtooth osc 880 Hz + LFO (1.8 Hz square) sweep to 1100 Hz. Fade over duration. |
| Hack | Synth | White noise buffer → gain ramp to 0 over 400ms. Repeats every 600ms at 40% chance. |
| Alert ping | Synth | Sine 1760→440 Hz decay over 400ms (heard on CRITICAL and alert state changes). |
| Flicker | Synth | 4× square-wave thumps (55-85 Hz) staggered 80ms apart, each 60ms decay. |

No file I/O — all synthesis runs on the audio graph.

**CSS/DOM effects**:

| Effect | Type | Rendering |
|--------|------|-----------|
| Alarm | CSS | Red pulsing border + ::before flash + ::after text "ALERTA DE SEGURIDAD" |
| Hack | Canvas | requestAnimationFrame loop: random horizontal strips, chromatic aberration (red/cyan offset), occasional full-frame glitch. `canvas.width/height = overlay.clientWidth/clientHeight` (resizes on window resize). |
| Fog | CSS | Overlay with `backdrop-filter: blur(3px)` + ::after text "SEÑAL DEGRADADA". Fades in over 2.2s. |
| Flicker | CSS | `animation: rtFlicker 0.6s steps(1) forwards` — opacity toggles 0/1 at 15%, 30%, 45%, 60%, 75%, 90%. |
| Critical | CSS | Combo of alarm + hack: red border + horizontal scanlines + ::after "NIVEL CRÍTICO". Higher z-index (85). |
| Media | DOM | `<img>` or `<video>` in centered flex overlay. Optional caption below, optional ESC-to-dismiss hint. |

**Style injection:**
- Creates `<style id="rt-effects-styles">` once
- All classes prefixed `.rt-effect-` to avoid collisions
- Stashes in `#head` (not mounted to #monitor pre, so stylesheet is global)

**Effect registration:**
```javascript
registerEffect(id, dom_element, cleanup_fn)
_activeEffects.set(id, { cleanup: ... })
```
Only one effect of each type at a time (e.g., if alarm is running and DM sends another alarm, the first stops and the second plays).

**Auto-remove:**
```javascript
autoRemove('effect-id', durationMs) → setTimeout cleanup
```

**Overlay mounting:**
```javascript
getScreenHost() → #monitor pre || #screen-container || #monitor || document.body
ensureRelative(host) → forces position:relative if static
```
Same pattern as `tactical.js` — effects layer on top of terminal without breaking layout.

## DM Panel

### File: `src/components/DmPanel.jsx`

**New tab**: `{ id: 'rtEffects', label: 'Efectos RT' }`

**State:**
```javascript
const [rtEffectsWsState, setRtEffectsWsState] = useState('offline');       // connection status
const [rtEffectsAgents, setRtEffectsAgents] = useState(0);                // live agent count
const [rtEffectsLog, setRtEffectsLog] = useState([]);                      // last 20 effects
const [rtEffectsMediaUrl, setRtEffectsMediaUrl] = useState('');            // for media form
const [rtEffectsMediaType, setRtEffectsMediaType] = useState('image');     // image | video
const [rtEffectsMediaCaption, setRtEffectsMediaCaption] = useState('');    // optional title
const [rtEffectsMediaDismissable, setRtEffectsMediaDismissable] = useState(true);
```

**WebSocket connection** (useEffect):
- Triggered by `activeView === 'rtEffects'` + authorized + sessionToken
- Connects to `/ws/effects?role=dm&token=<encoded>`
- Listens for `effects:status` → updates agent count
- Cleanup on view switch or unmount

**Core functions:**

`sendEffect(effect, options)`:
```javascript
socket.send({ type: 'effects:trigger', effect, options })
// Adds to log with timestamp
```

`sendEffectClear()`:
```javascript
socket.send({ type: 'effects:clear' })
```

**UI sections** (in `renderRtEffectsView()`):

1. **Header**: Title, connection status indicator (●/◌), agent count
2. **Alertas**: ALARMA 5s/10s/∞, NIVEL CRÍTICO buttons
3. **Atmósfera**: GLITCH LEVE/MEDIO/SEVERO, NIEBLA (timed/∞), PARPADEO CRT buttons
4. **Media**: URL input, type radio (image/video), caption input, dismissable checkbox, EMITIR button
5. **Clear**: LIMPIAR TODOS LOS EFECTOS button (full width, red accent)
6. **Log**: Scrolling list of last 20 effects with timestamp, effect name, and params

**Buttons disabled when** `rtEffectsWsState !== 'online'` — grayed out if not connected.

**Status indicator colors**:
- `online` (●): green
- `connecting` (◌): amber
- `offline` (○) / `error`: red/muted

### File: `src/css/DmPanel.styles.css`

~240 lines added at EOF.

**Class hierarchy**:
```
.rt-effects-panel              # Main container
  .rt-effects-header           # Title + status + agent count
    .rt-effects-status         # ● ONLINE / ○ OFFLINE (with color states)
  .rt-effects-group            # Each section (ALERTAS, ATMÓSFERA, MEDIA)
    .rt-effects-group-label    # "ALERTAS" etc.
    .rt-effects-btn-row        # Flex row of buttons
      .rt-effects-btn          # Base button (green border, transparent bg)
        .rt-effects-btn--alarm    # Red variant
        .rt-effects-btn--critical # Dark red variant
        .rt-effects-btn--hack     # Cyan variant
        .rt-effects-btn--fog      # Blue variant
        .rt-effects-btn--flicker  # Amber variant
        .rt-effects-btn--media    # Lavender variant
        .rt-effects-btn--clear    # Red, full width
  .rt-effects-media-form       # Media input section
  .rt-effects-log              # Scrollable log
```

**Theming**: Inherits from DM panel (dark cyan/green theme). Effect buttons use colored accent borders and text matching their visual theme.

## Usage (DM Perspective)

1. **Open the "Efectos RT" tab** in the DM panel
2. **Check connection**: Status indicator should show **● ONLINE** and display agent count (e.g., "2 agentes conectados")
3. **Send an effect**:
   - **Quick**: Click any button (ALARMA, HACKEO, etc.)
   - **Media**: Paste a server-relative URL (e.g., `/uploads/images/poi-12345.png`), optionally add a caption, click EMITIR
4. **Clear all**: Click "LIMPIAR TODOS LOS EFECTOS"
5. **Monitor**: Watch the LOG section scroll with timestamps and effect params

**Connection states**:
- **ONLINE**: WebSocket connected, effects broadcast immediately
- **CONNECTING**: Initializing or reconnecting (grayed out buttons)
- **OFFLINE**: Disconnected. Agent browser has NOT received the last effect. Reconnect occurs automatically.
- **ERROR**: WebSocket error state

## Extending with New Effects

**To add a new effect:**

### 1. Backend validation (`server/index.js`)

Edit the `allowed` whitelist:
```javascript
const allowed = ['alarm', 'hack', 'fog', 'flicker', 'critical', 'media', 'YOUR_EFFECT'];
```

### 2. Agent-side handler (`public/utils/effectsRuntime.js`)

Add a handler function:
```javascript
function triggerYourEffect({ duration = 5000, ...options } = {}) {
  const host = getScreenHost();
  const restorePos = ensureRelative(host);
  const overlay = createOverlay('your-effect', host);
  
  // Apply your effect (CSS animation, canvas draw, audio, etc.)
  // ...
  
  registerEffect('your-effect', overlay, restorePos);
  if (duration > 0) autoRemove('your-effect', duration);
}
```

Register in `applyEffect()`:
```javascript
function applyEffect(payload) {
  const { effect, options = {} } = payload;
  switch (effect) {
    // ...existing cases...
    case 'your-effect': return triggerYourEffect(options);
  }
}
```

Add CSS in the style tag (inside `injectStyles()`):
```css
.rt-effect--your-effect {
  /* Your styles */
}
```

### 3. DM panel button (`src/components/DmPanel.jsx`)

In `renderRtEffectsView()`, add to the appropriate group:
```jsx
<button
  className="rt-effects-btn rt-effects-btn--your-effect"
  disabled={!wsOnline}
  onClick={() => sendEffect('your-effect', { duration: 5000 })}
>
  ICON YOUR EFFECT
</button>
```

### 4. CSS styling (`src/css/DmPanel.styles.css`)

Add at EOF:
```css
.rt-effects-btn--your-effect { 
  border-color: rgba(R, G, B, 0.5); 
  color: #yourcolor; 
}
.rt-effects-btn--your-effect:not(:disabled):hover { 
  background: rgba(R, G, B, 0.1); 
  box-shadow: 0 0 10px rgba(R, G, B, 0.2); 
}
```

## Immersion Notes

**Current effects tuning:**

- **Alarm siren**: Sweeping frequency keeps the ear engaged (not a static tone). LFO at 1.8 Hz = ~2 oscillations per second — noticeable but not jarring.
- **Glitch canvas**: Runs at monitor refresh (60 Hz typical), so strips shift ~10–15 pixels per frame. Chromatic aberration (red shift left, cyan shift right) adds depth.
- **Fog text**: "SEÑAL DEGRADADA" pulses at 3s cycle — slow enough to feel intentional, not frantic.
- **Critical combo**: Alarm + hack overlay with 300ms flicker (vs. 600ms for plain flicker) + rapid alert pings every 300ms. Intended to feel **invasive**.

**Future enhancements**:
- Add `intensity: 'light' | 'medium' | 'heavy'` control to HACK effect (adjust glitch frequency, color saturation)
- Add `volume: 0–100` control to audio effects (currently hardcoded: 0.28 for siren, 0.15 for noise)
- Add effect **queue** (currently only one effect per type active)
- Add **fade-in/fade-out** timing control for overlays
- Store effect favorites/macros in DM panel (e.g., "INTRUDER ALERT" = alarm + hack + fog + critical, timed sequence)

## Troubleshooting

**Effects not appearing on agent browser?**

1. **Check WS connection**: DM panel should show **● ONLINE**, not ◌ or ○
2. **Check browser console** (agent side, F12):
   - No errors from `effectsRuntime.js`?
   - WebSocket frame in Network tab shows `/ws/effects` messages?
3. **Check stale cache**: Terminal commands are dynamically imported. Hard-refresh browser (`Ctrl+Shift+R` / `Cmd+Shift+R`)
4. **Check URL for media**: Media URLs are whitelist-validated. Only `/uploads/...` or relative paths allowed. Test with a known POI image URL.

**Alarm sound not playing?**

- Web Audio API requires a user gesture first. Terminal interaction (login, command entry) establishes context → sound should auto-play from that point.
- Some browsers require explicit audio context resume on interaction. `effectsRuntime.js` calls `audioCtx.resume()` on every effect, but if it still fails, check browser autoplay policy (chrome://flags/#autoplay-policy on Chrome).

**Glitch overlay looks blocky / not smooth?**

- Canvas size must match overlay size. `effectsRuntime.js` resizes on window resize event. Check DevTools Elements: is `.rt-effect--hack canvas` showing `width/height` attributes matching overlay dimensions?

**DM panel buttons are grayed out but WS shows ONLINE?**

- Check: is `authorized` true? Is `sessionToken` set? These gate the entire WS connection. If either is false, buttons disable even if WS would theoretically connect.

## Files Modified

| File | Changes | Lines |
|------|---------|-------|
| `server/index.js` | Add `effectsWss`, `/ws/effects` upgrade, broadcast fns | +95 |
| `public/utils/effectsRuntime.js` | New file: agent runtime | +700 |
| `src/js/terminal.js` | Call `initEffects()` at boot | +15 |
| `src/components/DmPanel.jsx` | Tab, state, useEffect, `renderRtEffectsView()`, `sendEffect()`, `sendEffectClear()` | +390 |
| `src/css/DmPanel.styles.css` | Effect panel + button + log styles | +240 |

## Git Commit

```
Commit: 80a5b17
"Add RT Effects system: DM panel triggers immersive effects on agent terminals"
```

See commit message for full technical summary.

## Known Limitations

1. **One effect per type at a time**: If alarm is running and DM sends another alarm, first stops. Queue pending for v2.
2. **No effect sequencing**: DM can't schedule a timed sequence of effects. Workaround: send one effect, wait for duration, send next.
3. **Media doesn't have built-in lightbox controls**: Agents see media full-screen or not at all. Could add "next/prev" for galleries in v2.
4. **Audio synthesis quality**: Web Audio API is lossy for real-time synthesis. Siren sounds electronic (by design), but if more realistic audio is needed, consider pre-recorded samples + fallback if audio synth not supported.
5. **Z-index collision**: If TACTICAL is open when an effect fires, z-indices may overlap (tactical=75, effects=80–90). Both should work, but visual layering may be unexpected. Mitigation: CSS z-index stack is well-separated by intention.

## Related Documentation

- [docs/live-map-handoff.md](./live-map-handoff.md) — Similar pattern for live-map WS
- [docs/current-functional-map.md](./current-functional-map.md) — Terminal command flow
- [CLAUDE.md](../CLAUDE.md) — Project architecture overview
