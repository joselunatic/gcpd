# Brother Eye Mk0 — Design System

> **GCPD Brother Eye Mk0** — a *diegetic* Dungeon Master control terminal for a
> Gotham Central tabletop RPG campaign. It is not a SaaS product; it is a prop.
> A CRT-style operator console the DM drives **live during play sessions** to
> push cases, POIs, villains, live-map tokens and real-time atmospheric effects
> to the players' screens. Immersion over polish. Phosphorescent green on
> near-black. Wayne Industries auxiliary hardware that the GCPD took over after
> "Batman went dark."

---

## What this is

The fiction: a salvaged Wayne Industries auxiliary node — **BROTHER-MK0**, a
prototype "Brother Eye" surveillance brain — repurposed as a GCPD backdoor
relay. The DM is "the agent" who found the terminal. Everything is framed as a
live intrusion into Gotham's infrastructure.

The software: a React + Vite single-page app with a Node API, a Three.js boot
sequence (ASCII-shaded STL render), an IMSAI-8080-style hardware skin with
working toggle switches, and a large **DM Panel** — the authoring + live-ops
surface this design system is built around.

### Surfaces in the product
- **DM Panel** (`DmPanel.jsx`, ~8k LOC) — the operator console. Authoring for
  Cases / POIs / Villains / Evidence, plus live OPS: Tracer, Live Map, RT
  Effects. **This is the primary surface this system documents.**
- **Terminal** — the player-facing CRT shell (boot, login, command prompt,
  in-world games: sudoku, hangman, pacman, tic-tac-toe, GTW).
- **IMSAI hardware skin** (`Base.styles.css`) — the "WAYNE INDUSTRIES /
  BROTHER EYE MK.0" front panel with LED rows and physical toggle switches.
- **Phone Panel**, **Docs Page**, **Quest** (WebXR/Three.js scene) — secondary.

---

## Sources

All understanding below is derived from the attached **read-only codebase**,
mounted as `gcpd/`:

- `gcpd/src/css/DmPanel.styles.css` — 3,937 lines; the canonical style source.
- `gcpd/src/components/DmPanel.jsx` — 8,272 lines; structure, nav, tabs, copy.
- `gcpd/src/components/dm/*` — DmToast, GlobalSearch, PoiEditor, etc.
- `gcpd/src/css/Base.styles.css`, `Terminal.styles.css`, `BootAscii.styles.css`.
- `gcpd/public/utils/screens.js` — terminal login / command copy (tone source).
- `gcpd/public/assets/fonts/` — the offline font files (copied into `fonts/`).
- `gcpd/.playwright-cli/*.png` — reference screenshots of the running app.

> The reader is **not** assumed to have access to `gcpd/`. Everything needed to
> design on-brand lives in this folder.

---

## CONTENT FUNDAMENTALS

The copy is the brand. It is **in-world military/intelligence log style**, never
marketing voice.

- **Casing:** UPPERCASE dominates — headings, labels, buttons, status, system
  log lines. Sentence case appears only in long-form helper notes and DM-facing
  hints. Letter-spacing is wide on anything uppercase.
- **Voice:** second person, imperative, addressed to "AGENTE / AGENT." The
  machine talks *to the operator*. No "we." Example boot lines (verbatim from
  `screens.js`): `WAYNE INDUSTRIES AUXILIARY NODE // BUILD 79-A`,
  `PROTOCOL: KNIGHTFALL-C (CONTINGENCIA POST-BATMAN)`,
  `SUBSYSTEM: BROTHER-MK0 // PROTOTYPE BROTHER EYE`,
  `SYSLOG: BATSIGNAL OFFLINE | ORACLE RELAY: STANDBY`,
  `> SI HAS ENCONTRADO ESTE TERMINAL, BRUCE NO ESTA.`
- **Bilingual EN/ES — a flavor rule, not a free-for-all:** **all meaningful
  information is written in Castilian Spanish** — labels, body, instructions,
  toasts, errors, anything the operator must read to act (`Casos`, `POIs`,
  `Villanos`, `Evidencias`, `Mapa Live`, `Efectos RT`, `Accesos`, `Campaña`;
  toasts `Caso publicado en el canal`, `No se pudo subir la imagen`). English is
  reserved for **atmosphere only**: footers, status overlines, hard-to-translate
  technical tokens, and verbatim in-world system codes
  (`READ ONLY CHANNEL`, `SYNC: LIVE`, `BUILD 79-A`, `KNIGHTFALL-C`,
  `BROTHER-MK0`, `ORACLE RELAY: STANDBY`). The boot log is the canonical pattern:
  system signatures in English, the actual directive to the agent in Spanish
  (`> SI HAS ENCONTRADO ESTE TERMINAL, BRUCE NO ESTA.`). Rule of thumb: **if the
  player needs it to make a decision, it's Spanish; if it's set-dressing, English
  is fine.** Never put critical info in English only.
- **Punctuation & glyphs as voice:** `//` for inline annotations, `|` as field
  separators, `>` to prefix log/console lines, `::` and `—` for section breaks.
  Identifiers are coded: `BUILD 79-A`, `RELAY 03`, `KNIGHTFALL-C`.
- **Status verbs:** ONLINE / OFFLINE / STANDBY / CONNECTING / LIVE / LOCKED /
  UNLOCKED / READ ONLY CHANNEL.
- **No emoji.** Iconography is unicode terminal glyphs only (see ICONOGRAPHY).
- **Vibe:** tense, clipped, conspiratorial. Every string should read like it was
  printed by a 1980s mainframe that knows too much. When in doubt, write it as a
  log line the players would believe.

### Microcopy examples to imitate
- Buttons: `GUARDAR`, `PUBLICAR`, `ELIMINAR`, `RESET / EXT CLR`, `RUN / STOP`.
- Section banners: `GCPD / WAYNE AUX NODE — TACTICAL LIVE MAP`, `SYNC: LIVE`.
- Hints: `INPUT REQUIRED`, `ESC · VOLVER`, `READ ONLY CHANNEL`.
- Empty states: terse, e.g. `> SIN REGISTROS EN ESTE CANAL.`

---

## VISUAL FOUNDATIONS

A surveillance CRT console. The look is **phosphor-on-black**, hairline-bordered,
flat, and intentionally a little cold and clinical — broken only by the green
"bloom" glow on focused/active elements.

### Color
- **Background is near-black** (`#020709`), never a light surface. Depth is built
  with a tight dark ladder: page `#020709` → card `#0c1511` → input `#031016`,
  plus translucent elevated/sunken layers (`rgba(4,14,18,.84)` / `rgba(1,7,10,.72)`).
- **One phosphor ramp** does almost all the work, organised by luminance:
  cyan-mint `#7fffd0` (headings) → action green `#2ddc93` (primary, borders,
  ok-status) → body `#b4ffe4` → dimmed `rgba(180,255,228,.65)` → faint labels
  `rgba(180,255,228,.45)` → muted blue-grey `rgba(125,182,195,.5)` for inactive
  chrome. The original codebase had 17+ near-duplicate green/cyan values doing
  these same jobs; this system collapses them into the tokens above.
- **Semantic accents are sparing:** amber `#e8c96a` (warning/connecting), red
  `#ff6b6b` (error/critical), cool blue `#8cb4ff` (info), live-map cyan `#5cb5ff`.
  RT-effect button families add muted category tints (alarm red, hack green, fog
  blue, flicker amber, media periwinkle) — always desaturated, never candy.
- **Imagery vibe:** cool and monochrome-green. The tactical map is rendered as a
  green phosphor street-grid on black; uploaded images sit in dashed-border wells.

### Type
- **Monospace everywhere** — `Share Tech Mono` is the workhorse. `WOPR`
  (wopr-tweaked.ttf) is the display/signage face for big headlines. `VT323` is a
  heavy phosphor readout face; `Monofonto` is used for command/transcript output.
  **All fonts are bundled offline** — no Google Fonts, no network at session time.
- Headings are uppercase with wide tracking (0.12–0.18em). Body sits at ~0.95rem.
  An 8-rung scale (1.7 / 1.25 / 1 / 0.95 / 0.85 / 0.78 / 0.7 / 0.65rem) replaces
  the prior 25-value sprawl.

### Spacing
- A 4px-derived rhythm replaces ~45 ad-hoc rem/px values. Common gaps land on
  0.4 / 0.6 / 0.9 / 1.2 / 1.6rem. Cards pad ~20px; the page rail maxes ~1240px.

### Borders, radii & cards
- **Hairline borders define everything** — translucent phosphor at 0.10–0.30
  alpha. There are no heavy strokes. Cards are `#0c1511` with a
  `rgba(124,255,178,.3)` edge, 12px radius, and a soft drop shadow.
- **4 radii only:** 4px (chips/badges), 8px (buttons/inputs/cards), 12px
  (modals/toolbars), 999px (nav tabs, status pills, toggles).

### Elevation — glow vs. shadow
Two distinct systems. **Glow** is phosphor bloom for focus/active states
(`0 0 14px rgba(45,220,147,.26)`); **shadow** is physical depth (cards
`0 18px 30px rgba(0,0,0,.4)`, modals `0 24px 64px rgba(0,0,0,.6)` + a faint
phosphor outline, toasts `0 8px 24px`). Active nav tabs and focused inputs glow;
floating surfaces cast shadow.

### Gradients
- **Reserved for the primary action button only**, and kept subtle: a vertical
  `rgba(45,220,147,.28) → .12` fill. No decorative or background gradients
  anywhere else, and never the purple/blue SaaS gradient cliché.

### Backgrounds & texture
- Flat near-black. No photographic hero backgrounds, no repeating patterns in
  the panel UI. CRT scanline / interlace overlays exist (`Scanline.styles.css`,
  `Interlace.styles.css`) for the player-facing terminal, applied as light
  overlays — used for immersion, never on dense data UI.

### Motion
- Quick and mechanical, never bouncy. Modal card entrance
  `scale(.96) translateY(-8px) → 1` over 180ms ease; backdrop fade 160ms; toast
  slides in from the right (`translateX(24px)`) over 200ms; search overlay
  `scaleY(.95)→1` fade over 120ms. Loading buttons pulse opacity + a spinning
  `⟳` glyph. **No heavy CSS filters on animated elements** (GPU budget during
  live sessions) — transform/opacity only.

### Hover, press & focus
- **Hover:** a faint phosphor wash (`rgba(45,220,147,.08–.12)`) plus a small glow
  on emphasis controls. No color inversion.
- **Active/selected:** the subtle primary gradient fill, a brighter border, and a
  glow. Text brightens toward `#defff3`.
- **Focus:** a single app-wide ring — `2px solid rgba(124,255,178,.95)` with a
  dark halo. Accessible and visible against black.
- **Disabled:** opacity ~0.35, `cursor: not-allowed`.

### Transparency & blur
- Used deliberately: backdrops are `rgba(0,0,0,.6)`; toasts use a light
  `backdrop-filter: blur(8px)`; nav/sticky bars use translucent fills with a
  gradient fade-out so content scrolls under them. Blur is a garnish on floating
  chrome, not a surface treatment for the whole app.

### Layout rules
- A sticky top **nav rail** (pill container) groups tabs as **DATA / OPS /
  CONFIG**. Editor toolbars and preview columns are sticky within their panels.
  Toasts are fixed top-right; Global Search (Ctrl/Cmd-K) is a full-page backdrop
  with a centered input + results list. Custom thin (6px) phosphor scrollbars.
- Fully responsive: panels collapse from sticky to static under ~1100px; modals
  and overlays go full-screen on small viewports.

### Custom scrollbars
- 6px track `rgba(3,12,16,.4)`, thumb `rgba(124,255,178,.25)` brightening on
  hover. Applied across the whole `.dm-panel` scope.

---

## CONTENT INDEX

| File | What it is |
|------|------------|
| `colors_and_type.css` | The token system — import first. All `--bem-*` custom properties: phosphor color ramp, surfaces, semantic status, 8-level type scale, 4px spacing rhythm, 4 radii, glow/shadow elevation, motion. |
| `fonts/` | Offline font files: Share Tech Mono, WOPR, VT323, Monofonto. |
| `assets/` | Logos / iconography reference (see ICONOGRAPHY.md). |
| `preview/` | Design-system spec cards (rendered in the Design System tab). |
| `ui_kits/dm-panel/` | High-fidelity recreation of the DM control terminal. |
| `ICONOGRAPHY.md` | The brand's approach to icons & glyphs. |
| `SKILL.md` | Agent Skill manifest for reuse in Claude Code. |

---

*Built from the `gcpd/` codebase. When extending: pull a token, don't invent a
color. Write copy like a paranoid mainframe. Keep it dark.*
