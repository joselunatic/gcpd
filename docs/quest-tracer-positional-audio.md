# Quest Tracer Positional Audio

## Summary

Quest tracer audio is implemented in:

- [QuestTracerPositionalAudio.jsx](C:/Users/JoseAntonioHernandez/Repos/gcpd/gcpd/src/quest/audio/QuestTracerPositionalAudio.jsx)

It is mounted from:

- [QuestCommsWorkbench.jsx](C:/Users/JoseAntonioHernandez/Repos/gcpd/gcpd/src/quest/QuestCommsWorkbench.jsx)

The component attaches a Three.js `AudioListener` to the active Quest camera and creates `THREE.PositionalAudio` sources anchored to the Quest `TRAZA` dialer/workbench.

## Mounting

The audio source is mounted near the diegetic communications dialer in the Quest workbench:

- `GCPD_Comms_TracerAudioAnchor`

It is attached from:

- [QuestCommsWorkbench.jsx](C:/Users/JoseAntonioHernandez/Repos/gcpd/gcpd/src/quest/QuestCommsWorkbench.jsx)

Scene names exposed for inspection:

- `GCPD_Quest_TracerAudioRoot`
- `GCPD_Quest_TracerIdleLoop`
- `GCPD_Quest_TracerActiveLoop`
- `GCPD_Quest_TracerPing`
- `GCPD_Quest_TracerLock`

## Expected Local Audio Files

Place audio files manually in:

- [public/audio/quest/tracer/README.md](C:/Users/JoseAntonioHernandez/Repos/gcpd/gcpd/public/audio/quest/tracer/README.md)

Expected runtime paths:

- `/audio/quest/tracer/tracer_idle_loop.ogg`
- `/audio/quest/tracer/tracer_active_loop.ogg`
- `/audio/quest/tracer/tracer_signal_ping_01.ogg`
- `/audio/quest/tracer/tracer_signal_lock.ogg`

Config file:

- [tracer-audio.json](C:/Users/JoseAntonioHernandez/Repos/gcpd/gcpd/public/audio/quest/tracer/tracer-audio.json)

If the JSON is missing, the component falls back to built-in default paths.

If any audio file is missing, the app does not crash. It logs a single warning for that asset and disables that sound.

## State Mapping

No new tracer state machine was introduced. Audio is derived from existing Quest phone state:

- idle loop:
  - enabled after user interaction
  - when tracer mode is selected or tracer tooling is in focus
  - while `phoneState.activeMode !== PHONE_MODE_TRACER`

- active loop:
  - when `phoneState.activeMode === PHONE_MODE_TRACER`
  - stays stronger during active trace
  - drops after final lock

- ping:
  - on tracer activation
  - on `phoneState.tracerStage` increments before final exact lock

- lock:
  - when final exact condition becomes true
  - current condition:
    - `phoneState.activeMode === PHONE_MODE_TRACER`
    - `phoneState.tracerStage >= 3`
    - hotspot label or hotspot object available

## Autoplay Policy

Audio does not start on page load.

The component waits for first user interaction:

- `pointerdown`
- `touchstart`
- `keydown`
- canvas click
- XR `selectstart`
- XR `squeezestart`

On first interaction it attempts to resume the Web Audio context. If resume fails, it logs a warning and keeps the app running.

## Suggested Manual Audio Sources

No audio was downloaded automatically.

Suggested active loop:

- Title: `Algorithm Runner - Dark Cyberpunk Cinematic Music Loopable`
- Author: `JoelFazhari`
- Source: `https://pixabay.com/music/pulses-algorithm-runner-dark-cyberpunk-cinematic-music-loopable-185038/`
- License: `Pixabay Content License`

Current idle loop:

- Title: `Chasing The Killer - Dark Detective Thriller Soundtrack Loopable`
- Author: `JoelFazhari`
- Source: `https://pixabay.com/music/mystery-chasing-the-killer-dark-detective-thriller-soundtrack-loopable-15383/`
- License: `Pixabay Content License`

Current lock cue:

- Title: `System Escape - Epic Cyberpunk and Scifi Music`
- Author: `JoelFazhari`
- Source: `https://pixabay.com/music/beats-system-escape-epic-cyberpunk-and-scifi-music-198244/`
- License: `Pixabay Content License`

Current local mapping in `public/audio/quest/tracer/`:

- `tracer_idle_loop.ogg` -> `Chasing The Killer`
- `tracer_active_loop.ogg` -> `Algorithm Runner`
- `tracer_signal_lock.ogg` -> `System Escape`
- `tracer_signal_ping_01.ogg` -> user-provided local `ping.ogg`

Alternative search:

- `https://pixabay.com/music/search/cyberpunk%20cinematic/`

## Desktop Test

1. Run the app and backend.
2. Open `/quest`.
3. Enter `TRAZA` or `RASTREO`.
4. Click once anywhere to unlock audio.
5. Confirm no fatal errors if files are still missing.
6. Start trace and verify:
   - idle stays silent before interaction
   - active loop only starts after trace starts
   - pings track stage changes
   - lock sound triggers on final localization

## IWSDK / Quest Test

Recommended commands:

```bash
npm run server
npm run dev:iwsdk
```

Recommended MCP checks:

- `browser_get_console_logs`
- `browser_screenshot`
- `scene_get_hierarchy`

Hierarchy should include:

- `GCPD_Quest_TracerAudioRoot`
- `GCPD_Quest_TracerIdleLoop`
- `GCPD_Quest_TracerActiveLoop`

If audible verification is not practical in IWSDK, it is enough to confirm:

- no fatal console errors
- audio root mounts near the dialer/workbench
- sources mount/unmount cleanly

## Limitations

- The current `ping` asset is local and working, but its attribution/license metadata should be recorded according to the source used to obtain `ping.ogg`.
- Browser autoplay restrictions still require one real user interaction.
- In headless automation we can validate mounting and warnings, not actual audible output quality.
- Final lock audio depends on the tracer hotspot reaching the client state; backend stage events should include hotspot data.

## Next Steps

1. Place approved OGG files in `public/audio/quest/tracer/`.
2. Tune loop loudness in-headset against existing phone tones and line playback.
3. If needed, add low-pass or dynamic filtering by tracer phase for stronger escalation.
