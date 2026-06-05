# Iconography — Brother Eye Mk0

The console has **no icon library**. There is no SVG icon set, no icon font, no
PNG sprite sheet, no Lucide/Heroicons dependency. Identity and signaling are
carried entirely by **type, unicode terminal glyphs, and colored CSS shapes** —
which is exactly right for a 1980s-mainframe prop. Do not introduce a modern
icon library; it would break the fiction.

## The brand "logo" is typographic
There is no raster/vector logomark. The brand reads as text in the display
faces:
- **`BROTHER EYE MK.0`** — set in the IMSAI panel, the wordmark.
- **`WAYNE INDUSTRIES`** — the parent-org signature on the hardware skin.
- **ASCII figlet wordmark** — `assets/wordmark-ascii.txt` (the boot logo art).
Render wordmarks in `--bem-font-display` (WOPR) or `--bem-font-mono`, uppercase.

## Glyph system (the real "icons")
Plain unicode characters, used inline in the monospace flow. These ARE the
vocabulary — reuse them, don't substitute drawn icons:

| Glyph | Meaning / usage | Source |
|-------|-----------------|--------|
| `✓` | success | toast (success) |
| `✕` | error / failure | toast (error) |
| `ℹ` | information | toast (info) |
| `×` | close / dismiss | toast close, modal close |
| `⟳` | loading / working (spins) | button loading state |
| `▸` `▾` | disclosure collapsed / expanded | PoiEditor sections |
| `·` | inline separator between fields | lists, meta rows |
| `\|` | field / status divider | banners, syslog lines |
| `//` | inline annotation | log lines |
| `>` | console / log line prefix | terminal, empty states |
| `—` `::` | section breaks | banners |

## Status = colored dots, not icons
State is shown with small `border-radius:999px` CSS dots + a matching glow,
never an icon: online `--bem-ok` (green), warning `--bem-warn` (amber), error
`--bem-danger` (red), live `--bem-live` (cyan). Status *pills* pair a dot/label
with `border: 1px solid currentColor` and a faint tinted background.

## Emoji — the one narrow exception
Emoji appear in **exactly one place**: the Global Search (Ctrl/Cmd-K) result
rows, as entity-type markers —
`📋` Case · `📍` POI · `🎭` Villain · `🔍` Evidence.
That's the whole sanctioned emoji set. **Do not** add emoji anywhere else in the
UI; everywhere else, signaling is glyph + color. If you extend search to new
entity types, pick a single restrained emoji marker consistent with these.

## Assets in this folder
- `wordmark-ascii.txt` — the ASCII figlet wordmark (boot logo art), verbatim from
  `BootAscii.jsx`. Use as a `<pre>` block in `--bem-font-mono`, phosphor color.

> No icon files were present in the codebase to copy — by design. If a future
> need calls for a pictographic icon, prefer a unicode glyph first; only if none
> fits, add a hairline-stroke SVG that matches the monospace weight, and flag it.
