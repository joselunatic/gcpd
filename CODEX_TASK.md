# Task: BALISTICA – procedural CRT bullet signatures (assets-only phase)

## Context
We have a BALISTICA feature that currently loads a “panel comparador”, but it doesn’t match our CRT aesthetic. We want to switch to a 2D image-based matcher.

For now, **do not change app logic/UI**. This task is **assets-only**: generate **6 procedural 2D images** that already *look CRT-native*, not “clean image + filter”. Later we will split each image in half (A/B) for matching.

## Goals
- Generate **6 base images** representing distinct “bullet signature” patterns.
- Each bullet can have different:
  - **caliber** (e.g., 9mm, .45 ACP, 5.56, etc.)
  - **material** (lead, copper-jacketed, steel-core, etc.)
- Images should be usable as a 2D comparison surface; later we will crop left/right halves.

## Output requirements
- Create a folder: `public/assets/ballistics/` (if it doesn’t exist).
- Generate these files:
  - `b01.png`
  - `b02.png`
  - `b03.png`
  - `b04.png`
  - `b05.png`
  - `b06.png`

### Image specs (recommended)
- Size: **1024×256** (or 1024×512 if needed, but keep consistent).
- Format: PNG.
- Look: CRT terminal aesthetic (scanlines, phosphor glow, slight bloom/ghosting, noise).
- Content: “rifling/striations” style patterns; each should be visually distinct.

## Implementation suggestion
- Use a reproducible script (Node preferred): `scripts/gen-ballistics-assets.mjs`
  - Use `node-canvas` or pure PNG generation.
  - Seeded randomness so assets are stable.
- Store bullet metadata in a small JSON used by the script (optional):
  - `scripts/ballistics-dataset.json`

## Notes
- We will **split left/right halves at runtime** later; no need to pre-split into A/B images.
- Keep palette consistent with our CRT theme (greens/ambers on near-black).

## Deliverable
- The 6 PNG files committed (or at least generated) in `public/assets/ballistics/`.
- The generation script committed so we can re-run and tweak.

