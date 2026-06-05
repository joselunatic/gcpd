# DM Panel — UI Kit

A high-fidelity, click-through recreation of **GCPD Brother Eye Mk0's operator
console** (`DmPanel`), rebuilt on the `--bem-*` token system. It demonstrates the
shared chrome and the core authoring + live-ops surfaces — cosmetic, not
production logic.

## Run
Open `index.html`. Any access key authorizes (it's a demo gate).

## Flow
1. **Auth gate** — in-world boot log + `CLAVE DE ACCESO` prompt (verbatim tone
   from `screens.js`). Submit to enter.
2. **Workspace** — sticky **DATA / OPS / CONFIG** nav rail + header with live
   `SYNC` indicator.
3. **Casos** — case register list ↔ editor card with status pills, tags,
   primary/secondary/danger actions (each fires a toast).
4. **Efectos RT** — the ops board: grouped effect buttons (Alarmas / Ambiente /
   Media) with the alarm/critical red families, ONLINE status, clear-all.
5. **Mapa Live** — tactical phosphor grid with live tokens.
6. **Global Search** — `Ctrl/Cmd-K` (or the header button) opens the full-page
   backdrop search with type-icon result rows; picking jumps to that tab.
7. **Toasts** — success / error / info, top-right, auto-dismiss.

## Files
| File | Role |
|------|------|
| `index.html` | Entry — loads React 18 + Babel, tokens, kit.css, scripts |
| `kit.css` | All component styles, mapped to `--bem-*` tokens |
| `data.js` | Mock Gotham campaign data (cases, POIs, villains) |
| `Shell.jsx` | Header, NavRail, Toasts, GlobalSearch |
| `Views.jsx` | CasesView, RtEffectsView, LiveMapView, StubView |
| `App.jsx` | Auth gate + Workspace wiring (tabs, toasts, Ctrl+K) |

## Coordinate system — invariant crítico

Los tokens del mapa se almacenan como **porcentajes (0–100)** relativos al canvas táctico. La portabilidad entre la vista DM y la vista agente depende de un único invariante:

> **El `aspect-ratio` del contenedor del mapa DEBE ser idéntico en todos los clientes** (DM panel, terminal de agente, panel de teléfono). El tamaño absoluto puede escalar libremente; la relación de aspecto no.

El valor canónico vive en `colors_and_type.css` como `--bem-map-aspect: 1.428 / 1` (~10:7, ratio del export de mapa de campaña). Ambas superficies de mapa en `kit.css` ya lo consumen vía `aspect-ratio: var(--bem-map-aspect)`. Para implementar la vista agente:

```css
.agent-map-surface {
  position: relative;
  width: 100%;              /* puede ser cualquier ancho */
  aspect-ratio: var(--bem-map-aspect);   /* ← este es el contrato */
  overflow: hidden;
}
.agent-token {
  position: absolute;
  left: calc(var(--tx) * 1%);    /* --tx y --ty se inyectan desde JS */
  top:  calc(var(--ty) * 1%);
  transform: translate(-50%, -50%);
}
```

Si se cambia el aspect ratio del mapa de campaña, actualizar **solo** `--bem-map-aspect` en `colors_and_type.css`; todas las superficies se adaptan automáticamente.


- Components export to `window` (separate Babel script scopes).
- Stubbed tabs (POIs, Villanos, Evidencias, Tracer, Accesos, Campaña) show the
  shared chrome with a disclaimer — they exist in the product but are not fully
  recreated here, by design (component coverage over completeness).
- Entrance animations are gated behind `prefers-reduced-motion: no-preference`
  with the visible state as the base, so print/PDF/reduced-motion never hide
  content.
