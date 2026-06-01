# Quest Tracer Positional Audio

This folder is consumed by the Quest `/quest` tracer minigame.

Expected files:

- `tracer_idle_loop.ogg`
- `tracer_active_loop.ogg`
- `tracer_signal_ping_01.ogg`
- `tracer_signal_lock.ogg`
- `tracer-audio.json`

These files are loaded locally from:

- `/audio/quest/tracer/tracer_idle_loop.ogg`
- `/audio/quest/tracer/tracer_active_loop.ogg`
- `/audio/quest/tracer/tracer_signal_ping_01.ogg`
- `/audio/quest/tracer/tracer_signal_lock.ogg`

Important:

- Do not hotlink remote audio in runtime.
- Place files manually after confirming license suitability.
- If files are missing, Quest will keep running and log one warning per missing asset.

Current local mapping:

- `tracer_idle_loop.ogg`
  - Source file: `joelfazhari-chasing-the-killer-dark-detective-thriller-soundtrack-loopable-15383-converted.ogg`
- `tracer_active_loop.ogg`
  - Source file: `joelfazhari-algorithm-runner-dark-cyberpunk-cinematic-music-loopable-185038-converted.ogg`
- `tracer_signal_lock.ogg`
  - Source file: `joelfazhari-system-escape-epic-cyberpunk-and-scifi-music-198244-converted.ogg`
- `tracer_signal_ping_01.ogg`
  - User-provided local one-shot ping asset, renamed from `ping.ogg`

Attribution:

- Active loop:
  - Title: `Algorithm Runner - Dark Cyberpunk Cinematic Music Loopable`
  - Author: `JoelFazhari`
  - Source: `https://pixabay.com/music/pulses-algorithm-runner-dark-cyberpunk-cinematic-music-loopable-185038/`
  - License: `Pixabay Content License`

- Idle loop:
  - Title: `Chasing The Killer - Dark Detective Thriller Soundtrack Loopable`
  - Author: `JoelFazhari`
  - Source: `https://pixabay.com/music/mystery-chasing-the-killer-dark-detective-thriller-soundtrack-loopable-15383/`
  - License: `Pixabay Content License`

- Lock:
  - Title: `System Escape - Epic Cyberpunk and Scifi Music`
  - Author: `JoelFazhari`
  - Source: `https://pixabay.com/music/beats-system-escape-epic-cyberpunk-and-scifi-music-198244/`
  - License: `Pixabay Content License`

- Ping:
  - Local file: `ping.ogg`
  - Current runtime name: `tracer_signal_ping_01.ogg`
  - Attribution/license: record manually according to the source used for this asset
