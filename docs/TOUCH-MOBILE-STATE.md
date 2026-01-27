# Mobile Terminal State & Touch Flow

## Current Architecture

- **Terminal rendering** is still handled outside React by `public/utils/screens.js`, driven through the `type()`/`renderSelectableLines()` helpers in `public/utils/io.js`.  
- **Selection state** lives in `public/utils/selection.js`, with touch handlers (`public/utils/touch.js`) that clear selectables before invoking commands and dispatch a custom `line-return-double-tap` event.  
- **Dialer flow** now clears before every screen, shows the `CONTACTING LINE` alert, and persists `line` context (index, portrait flag) via `setScreenStatus()` that also saves `terminalState` (status + context) to storage.  
- **Persistence**: `loadingTerminal()` tries to restore the saved screen via new exports `getTerminalState()`/`restoreTerminalState()` from the screens module before falling back to `screenStatus`.  
- **Exit interaction**: On line detail screens, a portrait double-tap (or Enter on desktop) resolves `waitForReturnKey()` and immediately reruns the dialer; touch-mode overlay actions still rely on selection state for navigation.

## Known Work Remaining

1. **Map/Villains state** – these commands currently call `main()` when they finish, so they will re-render the main menu after their content plays. Future iterations should treat them like self-contained screens that wait for an explicit “return” action.  
2. **Visual feedback** – consider adding prompt hinting for touch users (e.g., `[RETURN]` chip) when a line detail shows.  
3. **Persistent resets** – think about introducing an explicit “fresh start” hook (e.g., logout) to clear `terminalState` so reloads can optionally start clean.

## Notes for Future Contributors

- Always call `clear()` before rendering a new screen and ensure `clearSelectables()` follows, as selection state assumes only one view is active.  
- Use `setScreenStatus(status, context)` whenever a new status is active; include any payload needed to reconstruct that view in `restoreTerminalState()`.  
- Touch-specific behaviors should check for `line-message-active` (set in `displayLineMessage`) before dispatching the double-tap return event.  
- The terminal’s React wrapper (`src/js/terminal.js` + `Terminal.jsx`) now respects state restoration, so avoid reloading the entire canvas unless explicitly resetting `screenStatus`.

## Validation Checklist

- [ ] Dialer stays empty for 5+ seconds when selecting a line.
- [ ] Line detail screens clear the terminal before rendering and return to the dialer via Enter/double tap.
- [ ] Closing/reopening the browser restores the last screen (dialer, main, map, or line).
- [ ] Touch overlay still moves selection and respects the double-tap return only when `line-message-active`.
