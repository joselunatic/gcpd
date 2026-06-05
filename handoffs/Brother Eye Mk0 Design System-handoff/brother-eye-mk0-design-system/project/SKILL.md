---
name: brother-eye-mk0-design
description: Use this skill to generate well-branded interfaces and assets for GCPD Brother Eye Mk0 — the diegetic Gotham RPG DM control terminal — for production or throwaway prototypes/mocks. Contains design guidelines, the phosphor color + type token system, offline fonts, brand assets, and a DM Panel UI kit.
user-invocable: true
---

Read the `README.md` in this skill first, then explore the other files.

Brother Eye Mk0 is a CRT-style surveillance/operator console: phosphor-green on
near-black, monospace everywhere, in-world all-caps log copy,
hairline borders, glow-vs-shadow elevation, gradients on primary buttons only.
Language: all meaningful info in **Castilian Spanish**; English only for
atmosphere (footers, status overlines, in-world system codes). Never put
critical info in English alone.
Always dark. Offline fonts only. Immersion over polish.

Key files:
- `colors_and_type.css` — import FIRST. All `--bem-*` tokens (phosphor ramp,
  surfaces, semantic status, 8-level type scale, 4px spacing, 4 radii, glow/
  shadow elevation, motion). Never invent a new green/cyan — use a token.
- `fonts/` — Share Tech Mono (body), WOPR (display), VT323 (readout), Monofonto
  (output). Bundled offline; no Google Fonts.
- `README.md` — product context, CONTENT FUNDAMENTALS (voice/casing/bilingual),
  VISUAL FOUNDATIONS (color, type, spacing, borders, elevation, motion, states).
- `ICONOGRAPHY.md` — glyph-and-color system; no icon library; emoji only in
  Global Search rows.
- `preview/` — token spec cards.
- `ui_kits/dm-panel/` — high-fidelity recreation of the operator console; copy
  components/styles from here.

If creating visual artifacts (slides, mocks, throwaway prototypes), copy assets
out and produce static HTML files for the user to view. If working on production
code, copy assets and read the rules here to design as an expert in this brand.

If invoked without guidance, ask what the user wants to build, ask a few focused
questions, then act as an expert designer who outputs HTML artifacts or
production code as needed. Write copy like a paranoid 1980s mainframe. Keep it
dark.
